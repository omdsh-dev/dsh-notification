/**
 * The completion runner's pure decision: one session's list facts + the current
 * settings → an optional notification plan. The host `notification` projection
 * supplies the turn reason, reply text, and tool names; the `title` projection
 * is the fallback when the notification projection has not landed yet. Browser
 * reads (permission, visibility) and the Notification construction stay in the
 * plugin body.
 */
import type { NotificationProjectionValue, NotificationReason, NotificationSettings, PendingKind } from '../contract.ts';
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
export declare function projectionAdvance(prevTurn: number | undefined, projection: NotificationProjectionValue | undefined): {
    nextTurn: number;
    fresh: boolean;
};
/** A decided notification ready to surface. */
export interface NotificationPlan {
    readonly reason: NotificationReason;
    readonly body: string;
    readonly tag: string;
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
export declare function notificationFor(sessionId: string, origin: string | undefined, title: string | undefined, projection: NotificationProjectionValue | undefined, settings: NotificationSettings): NotificationPlan | null;
/**
 * Fold one session's pending-interaction observation. The first observation
 * (no prior record) seeds the baseline without firing — history is never
 * re-notified, and a reconnect re-seeds so a wait that appeared while
 * disconnected never fires. A later change to a different non-`undefined` kind
 * means a NEW wait just appeared (undefined→kind, or one kind→another) and is
 * the fresh signal. The `{ kind }` box distinguishes "observed with no
 * pending" (a record with `kind: undefined`) from "never observed" (no record).
 * @param prev - the last observed record for the session (undefined = seed).
 * @param kind - the session's current pendingInteraction status (undefined = none).
 * @returns the next observed record and whether a new wait just appeared.
 */
export declare function pendingAdvance(prev: {
    kind: PendingKind | undefined;
} | undefined, kind: PendingKind | undefined): {
    kind: PendingKind | undefined;
    fresh: boolean;
};
/** A decided pending-interaction notification ready to surface. */
export interface PendingNotificationPlan {
    readonly kind: PendingKind;
    readonly body: string;
    readonly tag: string;
}
/**
 * Decide one pending-interaction notification, free of any browser read.
 * @param sessionId - the waiting session.
 * @param origin - the session's durable origin (subagents are skipped).
 * @param title - the session's human-facing label (displayTitle).
 * @param kind - the blocking interaction kind.
 * @param settings - the live client settings.
 * @returns the plan, or null when this wait must not notify.
 */
export declare function pendingNotificationFor(sessionId: string, origin: string | undefined, title: string | undefined, kind: PendingKind, settings: NotificationSettings): PendingNotificationPlan | null;
