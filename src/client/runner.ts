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

/**
 * Fold one session's projection-turn observation: the first observation seeds
 * the baseline (never fires), and any later advance means the host projection
 * has landed for a NEW completed turn — the fresh value to notify with. Firing
 * on the projection advance (not on a running edge) removes the race between
 * the status frame and the projection frame, so the notification body is
 * always the turn that just completed.
 * @param prevTurn - the turn last observed for the session (undefined = seed).
 * @param projection - the current host projection value (absent = turn 0).
 * @returns the next observed turn and whether it advanced past the previous.
 */
export function projectionAdvance(
  prevTurn: number | undefined,
  projection: NotificationProjectionValue | undefined,
): { nextTurn: number; fresh: boolean } {
  const turn = projection?.turn ?? 0
  return { nextTurn: turn, fresh: prevTurn !== undefined && turn > prevTurn }
}

/** A decided notification ready to surface. */
export interface NotificationPlan {
  readonly reason: NotificationReason
  readonly body: string
  readonly tag: string
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
