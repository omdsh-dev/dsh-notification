/**
 * The completion runner's pure decision: one session's list facts + the current
 * settings → an optional notification plan. The host `notification` projection
 * supplies the turn reason, reply text, and tool names; the `title` projection
 * is the fallback when the notification projection has not landed yet. Browser
 * reads (permission, visibility) and the Notification construction stay in the
 * plugin body.
 */
import type { NotificationProjectionValue, NotificationReason, NotificationSettings, PendingKind } from '../contract.ts'
import { asReason, pendingReasonEnabled, ruleSubject, rulesAllow, shouldNotify } from './decision.ts'
import { notificationTag, pendingNotificationTag } from './notifier.ts'

/** One session's pending interaction, as the runner needs it. */
export interface PendingSourceEntry {
  readonly kind: string | undefined
}

/** A live per-session pending-interaction source (`getSnapshot` + `subscribe`). */
export interface PendingSource {
  getSnapshot(): ReadonlyMap<string, PendingSourceEntry>
  subscribe(listener: () => void): () => void
}

/** 0.2.x unified status entry: one highest-precedence pending interaction. */
export interface SessionStatusEntry {
  readonly pendingInteraction?: { readonly kind?: string | undefined } | undefined
}

/** 0.2.x unified status source (`ctx.uiSession.sessionStatus`). */
export interface SessionStatusFace {
  getSnapshot(): ReadonlyMap<string, SessionStatusEntry | undefined>
  subscribe(listener: () => void): () => void
}

/** The optional `uiSession` service across the 0.1.x and 0.2.x client layouts. */
export interface PendingInteractionFace {
  /** 0.1.x: a dedicated pending-interactions observable. */
  readonly pendingInteractions?: PendingSource
  /** 0.2.x: pending state folded into the unified session status map. */
  readonly sessionStatus?: SessionStatusFace
}

/**
 * Resolve the pending-interaction source across client layouts. 0.1.x exposes a
 * dedicated observable; 0.2.x folds one highest-precedence interaction into the
 * unified session status. Reading the wrong member is not survivable (the
 * service exists, so optional chaining does not gate the call), hence the
 * explicit shape check. Returns undefined while neither layout is available.
 * @param face - the `uiSession` service, or undefined before it is active.
 * @returns a normalized pending-interaction source, or undefined.
 */
export function pendingSourceOf(face: PendingInteractionFace | undefined): PendingSource | undefined {
  const legacy = face?.pendingInteractions
  if (legacy !== undefined) return legacy
  const status = face?.sessionStatus
  if (status === undefined) return undefined
  return {
    getSnapshot: () => {
      const pending = new Map<string, PendingSourceEntry>()
      for (const [id, entry] of status.getSnapshot()) {
        const kind = entry?.pendingInteraction?.kind
        if (kind !== undefined) pending.set(id, { kind })
      }
      return pending
    },
    subscribe: listener => status.subscribe(listener),
  }
}

/** One session-list row's local ownership counts. */
export interface CurrentSessionCandidate {
  readonly id: string
  /** Positive reference counts by display source; `mainView` marks the session on screen. */
  readonly retainedBy?: Readonly<Record<string, number | undefined>> | undefined
}

/**
 * The session currently shown in the main view. 0.1.x carried the selection on
 * the session list (`current`); 0.2.x dropped that field and keeps the selection
 * as local retain counts instead, where the renderer marks the displayed session
 * with `retainedBy.mainView > 0`. Reading those counts restores the in-view gate
 * on 0.2.x without a harness change: a completion for the session you are
 * looking at is suppressed again, while completions for other sessions still
 * notify.
 * @param current - the list's own selection when the layout provides one.
 * @param rows - the session list rows by id.
 * @returns the id of the displayed session, or undefined when none is shown.
 */
export function currentSessionId(
  current: string | undefined,
  rows: Readonly<Record<string, CurrentSessionCandidate | undefined>>,
): string | undefined {
  if (current !== undefined) return current
  for (const row of Object.values(rows)) {
    if (row !== undefined && (row.retainedBy?.mainView ?? 0) > 0) return row.id
  }
  return undefined
}

/**
 * One fold of a session's projection observation. `absent` is deliberately a
 * distinct state from "turn 0": the host omits the `notification` key for a
 * session it has no value for, and a session-list row can arrive before its
 * projection frame. Collapsing the two would baseline that session at turn 0,
 * so the later frame for a turn that ended days ago reads as an advance and
 * notifies on every reload (upstream issue #20). Preferring a missed
 * notification over a false one is the deliberate tradeoff.
 */
export type ProjectionObservation =
  | { readonly kind: 'absent' }
  | { readonly kind: 'turn'; readonly turn: number; readonly fresh: boolean }

/**
 * Fold one session's projection-turn observation: the first observation of a
 * served value seeds the baseline (never fires), and any later advance means
 * the host projection has landed for a NEW completed turn — the fresh value to
 * notify with. Firing on the projection advance (not on a running edge) removes
 * the race between the status frame and the projection frame, so the
 * notification body is always the turn that just completed.
 * @param prevTurn - the turn last observed for the session (undefined = seed).
 * @param projection - the current host projection value (undefined = not served).
 * @returns either "absent" (no decision) or the observed turn and freshness.
 */
export function projectionAdvance(
  prevTurn: number | undefined,
  projection: NotificationProjectionValue | undefined,
): ProjectionObservation {
  if (projection === undefined) return { kind: 'absent' }
  return { kind: 'turn', turn: projection.turn, fresh: prevTurn !== undefined && projection.turn > prevTurn }
}

/** A decided notification ready to surface. */
export interface NotificationPlan {
  readonly reason: NotificationReason
  readonly body: string
  readonly tag: string
  /** The session's durable title, shown in the notification title line. */
  readonly sessionTitle: string | undefined
}

/**
 * Decide one completed session's notification, free of any browser read.
 * @param sessionId - the completed session.
 * @param origin - the session's durable origin (subagents are skipped).
 * @param title - the session's durable title (absent until the host projects one).
 * @param projection - the host `notification` projection value.
 * @param settings - the live client settings.
 * @returns the plan, or null when this completion must not notify.
 */
export function notificationFor(
  sessionId: string,
  origin: string | undefined,
  title: string | undefined,
  projection: NotificationProjectionValue | undefined,
  settings: NotificationSettings,
): NotificationPlan | null {
  if (origin === 'subagent') return null
  // The completion edge can arm a tick before the projection frame lands;
  // fall back to a generic completion until the projection arrives.
  const reason: NotificationReason | undefined = projection === undefined || projection.turn === 0
    ? 'completed'
    : asReason(projection.reason)
  if (reason === undefined) return null
  const subject = ruleSubject(title, projection?.body ?? '', projection?.tools ?? [])
  if (!shouldNotify(settings, reason, subject)) return null
  return {
    reason,
    body: projection?.body ?? title ?? '',
    tag: notificationTag(sessionId, projection?.turn ?? 0),
    sessionTitle: title?.trim() === '' ? undefined : title?.trim(),
  }
}

/** Fold one session's pending-interaction state and detect a fresh wait. */
export function pendingAdvance(
  prev: { kind: PendingKind | undefined } | undefined,
  kind: PendingKind | undefined,
): { kind: PendingKind | undefined; fresh: boolean } {
  if (prev === undefined) return { kind, fresh: false }
  return { kind, fresh: kind !== undefined && kind !== prev.kind }
}

/** A decided pending-interaction notification. */
export interface PendingNotificationPlan {
  readonly kind: PendingKind
  readonly body: string
  readonly tag: string
}

/** Decide one pending interaction without reading browser state. */
export function pendingNotificationFor(
  sessionId: string,
  origin: string | undefined,
  title: string | undefined,
  kind: PendingKind,
  sequence: number,
  settings: NotificationSettings,
): PendingNotificationPlan | null {
  if (origin === 'subagent') return null
  if (!settings.enabled || !pendingReasonEnabled(settings, kind)) return null
  if (!rulesAllow(settings, ruleSubject(title, '', []))) return null
  return { kind, body: title?.trim() ?? '', tag: pendingNotificationTag(sessionId, sequence) }
}
