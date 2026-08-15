/**
 * dsh-notification client plugin: the browser half of the completion and
 * pending-interaction notification. Persists the notification preferences in a
 * local snapshot store, watches the session list for a running→idle edge (a
 * live "a session finished" signal) and for a session entering a blocking wait
 * (approval / question / plan-review), reads the host `notification` and
 * `title` projections for the turn's reason/text/tools, and — when permission
 * and the background-only gate pass — shows a desktop notification. Also
 * registers the settings section and the locale dictionaries. No harness
 * allowlist is touched.
 */
import type { ClientContext, SessionListState, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
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
import { bodyText, notificationsApi, pendingTitleKey, shouldShow, titleKey } from './notifier.ts'

/** Required services: the session list, slots, and locale. */
export const inject = ['sessions', 'slots', 'locale']

/** The slice of the sessions service this plugin reads. */
interface SessionsListFace {
  readonly list: { getSnapshot(): SessionListState; subscribe(listener: () => void): () => void }
}

/** A session id, derived from the list's key type (keeps the branded id without importing it). */
type SessionId = SessionListState['ids'][number]

/**
 * Compose the notification surface.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  adoptStyles()
  console.info('[dsh-notification] bundle loaded (edge trigger, settings v2)')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-notification: dictionaries')

  const t = ctx.locale.bind(NS)
  // The client sessions face is read through the service store, not the
  // `ctx.sessions` property proxy: the host dsh-session package merges a
  // different `sessions` Context member, and the two collide in this
  // single-program build.
  const sessions = ctx.get('sessions') as unknown as SessionsListFace
  const settings: SnapshotStore<NotificationSettings> = createNotificationSettingsStore()
  const set = (patch: Partial<NotificationSettings>): void => {
    settings.update(draft => { Object.assign(draft, patch) })
  }
  const requestPermission = (): Promise<NotificationPermission> =>
    notificationsApi()?.requestPermission() ?? Promise.resolve<NotificationPermission>('denied')

  const show = (title: string, body: string, tag: string, requireInteraction: boolean): void => {
    const api = notificationsApi()
    if (api === undefined || api.permission !== 'granted') return
    const notification = new api(title, { body, tag, requireInteraction })
    notification.onclick = () => { window.focus() }
  }
  const sendTest = (): void => {
    show(t('notify.testTitle'), t('notify.testBody'), 'dsh-notification-test', false)
  }

  // Completion runner: the host projection's turn is monotonic per session,
  // so an advance past the last-observed turn IS a freshly completed turn with
  // its own correct body — no race with the session-status frame. The first
  // observation seeds the baseline (history is never re-notified), and a
  // reconnect re-seeds so a completion that happened while disconnected
  // never fires.
  ctx.effect(() => {
    const observedTurn = new Map<SessionId, number>()
    const reseed = (): void => { observedTurn.clear() }
    const stopReset = ctx.on('connection/reset', reseed)
    const off = sessions.list.subscribe(() => {
      const state = sessions.list.getSnapshot()
      const current = settings.getSnapshot()
      for (const id of state.ids) {
        const summary = state.byId[id]
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

  // Pending-interaction runner: a session entering a blocking wait is a "needs
  // you" signal that deserves a desktop notification even while on another
  // tab. It reads each session's `pendingInteraction` status (the same fact
  // that drives the sidebar's amber dot) and notifies on the undefined → kind
  // edge, reusing the completion runner's permission and background gating.
  ctx.effect(() => {
    const observedPending = new Map<SessionId, { kind: PendingKind | undefined }>()
    const reseed = (): void => { observedPending.clear() }
    const stopReset = ctx.on('connection/reset', reseed)
    const off = sessions.list.subscribe(() => {
      const state = sessions.list.getSnapshot()
      const current = settings.getSnapshot()
      for (const id of state.ids) {
        const summary = state.byId[id]
        const kind: PendingKind | undefined = summary.pendingInteraction
        const { kind: nextKind, fresh } = pendingAdvance(observedPending.get(id), kind)
        observedPending.set(id, { kind: nextKind })
        if (!fresh || nextKind === undefined) continue
        const plan = pendingNotificationFor(summary.id, summary.origin, summary.displayTitle, nextKind, current)
        if (plan === null) {
          console.info(`[dsh-notification] pending ${nextKind} ${id} suppressed by settings`)
          continue
        }
        const permission = notificationsApi()?.permission ?? 'denied'
        const showIt = shouldShow(permission, current.backgroundOnly, document.hidden, id, state.current)
        console.info(
          `[dsh-notification] pending ${nextKind} ${id}: show=${showIt}`
          + ` (permission=${permission} backgroundOnly=${current.backgroundOnly}`
          + ` hidden=${document.hidden} current=${String(state.current)})`,
        )
        if (showIt) {
          show(
            t(pendingTitleKey(nextKind)),
            bodyText(plan.body, t('notify.pendingBodyFallback')),
            plan.tag,
            current.requireInteraction,
          )
        }
      }
      const live = new Set(state.ids)
      for (const id of [...observedPending.keys()]) {
        if (!live.has(id)) observedPending.delete(id)
      }
    })
    return () => { off(); stopReset() }
  }, 'dsh-notification: pending runner')

  // The settings section: master switch, permission card, outcome toggles, rules, advanced.
  ctx.slots.inject('settings.section', () => ctx.slots.register({
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
