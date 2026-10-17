/**
 * dsh-notification client plugin: the browser half of the completion
 * notification. Persists the notification preferences in a local snapshot
 * store, watches the session list for a running→idle edge (a live "a session
 * finished" signal), reads the host `notification` and `title` projections
 * for the turn's reason/text/tools, and — when permission and the
 * background-only gate pass — shows a desktop notification. Also registers the
 * settings section and the locale dictionaries. No harness allowlist is touched.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SnapshotStore } from './snapshot-store.ts'
// Type-only: the ctx.locale Context merge.
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the settings.section SlotMap entry.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { NotificationSettings, PendingKind } from '../contract.ts'
import { NotificationSettingsSection, type NotificationSectionInjected } from './SettingsSection.tsx'
import { NS, en, zh } from './locales.ts'
import { adoptStyles } from './styles.ts'
import { createNotificationSettingsStore } from './store.ts'
import { notificationFor, pendingAdvance, pendingNotificationFor, projectionAdvance } from './runner.ts'
import {
  bodyText,
  createBrowserNotification,
  notificationsApi,
  pendingTitleKey,
  shouldShow,
  titleKey,
  type NotificationCreationResult,
} from './notifier.ts'

/** Required services: the session list, slots, and locale. */
export const inject = ['sessions', 'slots', 'locale']

/** The slice of the sessions service this plugin reads. */
interface SessionsListFace {
  readonly list: { getSnapshot(): NotificationSessionListState; subscribe(listener: () => void): () => void }
}

type SessionId = string

/** Session list row fields shared by the 0.1.1 Runtime and 0.1.2 Controller. */
interface NotificationSessionSummary {
  readonly id: SessionId
  readonly origin?: string
  readonly title?: string
  readonly displayTitle?: string
  /** 0.1.1 carries pending status on the row itself. */
  readonly pendingInteraction?: PendingKind
  readonly projectionValues?: {
    readonly notification?: import('../contract.ts').NotificationProjectionValue
  }
}

/** Minimal list snapshot consumed by the notification runners. */
interface NotificationSessionListState {
  readonly ids: readonly SessionId[]
  readonly byId: Readonly<Record<SessionId, NotificationSessionSummary>>
  readonly current: SessionId | undefined
}

/** 0.1.2's separate pending-interaction observable, or 0.2.x's unified session-status source. */
interface UiSessionFace {
  readonly pendingInteractions?: {
    getSnapshot(): ReadonlyMap<SessionId, { readonly kind: string }>
    subscribe(listener: () => void): () => void
  }
  readonly sessionStatus?: {
    getSnapshot(): ReadonlyMap<SessionId, { readonly pendingInteraction?: { readonly kind: string } }>
    subscribe(listener: () => void): () => void
  }
}

/** Slot registry surface common to the pre- and post-0.1.2 client assemblies. */
interface SlotsFace {
  inject(name: string, factory: () => unknown): unknown
  register(entry: object, component: unknown): unknown
}

function asPendingKind(value: string | undefined): PendingKind | undefined {
  return value === 'approval' || value === 'question' || value === 'plan-review' ? value : undefined
}

/**
 * Compose the notification surface.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  adoptStyles()
  console.info('[dsh-notification] bundle loaded (completion and pending-interaction notifications, settings v4)')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-notification: dictionaries')

  const t = ctx.locale.bind(NS)
  // The client sessions face is read through the service store, not the
  // `ctx.sessions` property proxy: the host dsh-session package merges a
  // different `sessions` Context member, and the two collide in this
  // single-program build.
  const sessions = ctx.get('sessions') as unknown as SessionsListFace
  const uiSession = ctx.get('uiSession') as unknown as UiSessionFace | undefined
  const slots = (ctx as unknown as { slots: SlotsFace }).slots
  const settings: SnapshotStore<NotificationSettings> = createNotificationSettingsStore()
  const set = (patch: Partial<NotificationSettings>): void => {
    settings.update(draft => { Object.assign(draft, patch) })
  }
  const requestPermission = (): Promise<NotificationPermission> =>
    notificationsApi()?.requestPermission() ?? Promise.resolve<NotificationPermission>('denied')

  const show = (title: string, body: string, tag: string, requireInteraction: boolean): NotificationCreationResult => {
    const result = createBrowserNotification(notificationsApi(), title, { body, tag, requireInteraction })
    if (!result.ok) {
      console.error(`[dsh-notification] notification creation failed: ${result.message}`)
      return result
    }
    result.notification.onclick = () => { window.focus() }
    result.notification.onerror = () => {
      console.error('[dsh-notification] the browser reported a notification delivery error')
    }
    return result
  }
  const sendTest = (): NotificationCreationResult => {
    // A unique tag per click: the browser replaces same-tag notifications, and a
    // stale same-tag entry lingering in the Windows notification center silently
    // swallows every later notification with that tag. A fresh tag per test
    // guarantees the toast always shows.
    return show(t('notify.testTitle'), t('notify.testBody'), `dsh-notification-test-${Date.now()}`, false)
  }

  // Completion runner: the host projection's turn is monotonic per session,
  // so an advance past the last-observed turn IS a freshly completed turn with
  // its own correct body — no race with the session-status frame. The first
  // observation seeds the baseline (history is never re-notified), and a
  // reconnect re-seeds so a completion that happened while disconnected
  // never fires.
  ctx.effect(() => {
    const observedTurn = new Map<string, number>()
    const reseed = (): void => { observedTurn.clear() }
    const stopReset = ctx.on('connection/reset', reseed)
    const off = sessions.list.subscribe(() => {
      const state = sessions.list.getSnapshot()
      const current = settings.getSnapshot()
      for (const id of state.ids) {
        const summary = state.byId[id]
        if (summary === undefined) continue
        const projection = summary.projectionValues?.notification
        const { nextTurn, fresh } = projectionAdvance(observedTurn.get(id), projection)
        observedTurn.set(id, nextTurn)
        if (!fresh) continue
        const plan = notificationFor(summary.id, summary.origin, summary.title, projection, current)
        if (plan === null) {
          console.info(`[dsh-notification] turn ${nextTurn} ${id} suppressed by settings/rules`)
          continue
        }
        const permission = notificationsApi()?.permission ?? 'denied'
        const showIt = shouldShow(permission, current.backgroundOnly, document.hidden, id, state.current)
        console.info(
          `[dsh-notification] turn ${nextTurn} ${id}: reason=${plan.reason} show=${showIt}`
          + ` (permission=${permission} backgroundOnly=${current.backgroundOnly}`
          + ` hidden=${document.hidden} current=${String(state.current)})`,
        )
        if (showIt) {
          show(
            t(titleKey(plan.reason)),
            bodyText(plan.body, t('notify.emptyBody')),
            plan.tag,
            current.requireInteraction,
          )
        }
      }
      const live = new Set(state.ids)
      for (const id of [...observedTurn.keys()]) {
        if (!live.has(id)) observedTurn.delete(id)
      }
    })
    return () => { off(); stopReset() }
  }, 'dsh-notification: completion runner')

  // Pending-interaction runner: seed from the current snapshot before
  // subscribing so a newly observed question is not mistaken for startup
  // history. Re-seed on reconnect for the same reason: a wait that existed
  // while disconnected must not generate a stale notification.
  ctx.effect(() => {
    const observed = new Map<SessionId, { kind: PendingKind | undefined }>()
    const sequences = new Map<SessionId, number>()
    const pendingKind = (state: NotificationSessionListState, id: SessionId): PendingKind | undefined =>
      state.byId[id]?.pendingInteraction
      ?? asPendingKind(uiSession?.pendingInteractions?.getSnapshot().get(id)?.kind
        ?? uiSession?.sessionStatus?.getSnapshot().get(id)?.pendingInteraction?.kind)
    const seed = (state: NotificationSessionListState): void => {
      const live = new Set(state.ids)
      for (const id of state.ids) observed.set(id, { kind: pendingKind(state, id) })
      for (const id of [...observed.keys()]) {
        if (!live.has(id)) {
          observed.delete(id)
          sequences.delete(id)
        }
      }
    }
    seed(sessions.list.getSnapshot())
    const reseed = (): void => {
      observed.clear()
      seed(sessions.list.getSnapshot())
    }
    const stopReset = ctx.on('connection/reset', reseed)
    const run = (): void => {
      const state = sessions.list.getSnapshot()
      const current = settings.getSnapshot()
      for (const id of state.ids) {
        const summary = state.byId[id]
        if (summary === undefined) continue
        const kind = pendingKind(state, id)
        const previous = observed.get(id)
        const next = pendingAdvance(previous, kind)
        observed.set(id, { kind: next.kind })
        if (!next.fresh || next.kind === undefined) continue
        const sequence = (sequences.get(id) ?? 0) + 1
        sequences.set(id, sequence)
        const plan = pendingNotificationFor(
          summary.id,
          summary.origin,
          summary.displayTitle,
          next.kind,
          sequence,
          current,
        )
        if (plan === null) continue
        const permission = notificationsApi()?.permission ?? 'denied'
        const showIt = shouldShow(permission, current.backgroundOnly, document.hidden, id, state.current)
        if (showIt) {
          show(
            t(pendingTitleKey(plan.kind)),
            bodyText(plan.body, t('notify.pendingBody')),
            plan.tag,
            current.requireInteraction,
          )
        }
      }
      seed(state)
    }
    const off = sessions.list.subscribe(run)
    const offPending = (uiSession?.pendingInteractions ?? uiSession?.sessionStatus)?.subscribe(run)
    return () => { off(); offPending?.(); stopReset() }
  }, 'dsh-notification: pending runner')

  // The settings section: master switch, permission card, outcome toggles, rules, advanced.
  slots.inject('settings.section', () => slots.register({
    name: 'settings.section',
    id: 'notification',
    order: 60,
    label: () => t('nav'),
    locale: NS,
    inject: (): NotificationSectionInjected => ({
      hooks: { settings },
      set,
      requestPermission,
      sendTest,
    }),
  }, NotificationSettingsSection))
}
