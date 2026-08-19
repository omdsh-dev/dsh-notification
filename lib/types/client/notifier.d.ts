/**
 * Client-side notification rendering: the pure parts (title/body/gating) split
 * out for unit tests, while the `Notification` construction stays in the thin
 * runner wired by the plugin body.
 */
import type { NotificationReason, PendingKind } from '../contract.ts';
/** The reason title key for one turn-end reason. */
export declare function titleKey(reason: NotificationReason): 'notify.titleCompleted' | 'notify.titleError' | 'notify.titleAborted' | 'notify.titleBlocked' | 'notify.titleMaxTokens';
/** The title key for one pending interaction. */
export declare function pendingTitleKey(kind: PendingKind): 'notify.titleApproval' | 'notify.titleQuestion' | 'notify.titlePlanReview';
/** The notification body: the reply snippet, or the empty-body fallback. */
export declare function bodyText(body: string, emptyBody: string): string;
/**
 * Whether a completion should surface a desktop notification, given the browser
 * permission, the background-only preference, page visibility, and whether
 * the completed session is the one currently in view.
 */
export declare function shouldShow(permission: NotificationPermission, backgroundOnly: boolean, documentHidden: boolean, completedSessionId?: string, currentSessionId?: string): boolean;
/**
 * The grouping tag: one notification slot per session per turn. Turn-scoped
 * (not session-scoped): the browser replaces same-tag notifications, and a
 * stale same-tag entry lingering in the Windows notification center silently
 * swallows every later notification with that tag — a per-turn tag guarantees
 * each completed turn's toast always shows.
 */
export declare function notificationTag(sessionId: string, turn: number): string;
/** A unique tag for each pending interaction notification in one session. */
export declare function pendingNotificationTag(sessionId: string, sequence: number): string;
/** The surface this code may show notifications on (absent in insecure contexts). */
export declare function notificationsApi(): typeof Notification | undefined;
/** The result of asking the browser to construct one system notification. */
export type NotificationCreationResult = {
    readonly ok: true;
    readonly notification: Notification;
} | {
    readonly ok: false;
    readonly message: string;
};
/** Construct one notification without allowing browser failures to disappear silently. */
export declare function createBrowserNotification(api: typeof Notification | undefined, title: string, options: NotificationOptions): NotificationCreationResult;
