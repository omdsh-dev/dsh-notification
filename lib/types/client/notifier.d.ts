/**
 * Client-side notification rendering: the pure parts (title/body/gating) split
 * out for unit tests, while the `Notification` construction stays in the thin
 * runner wired by the plugin body.
 */
import type { NotificationReason } from '../contract.ts';
/** The reason title key for one turn-end reason. */
export declare function titleKey(reason: NotificationReason): 'notify.titleCompleted' | 'notify.titleError' | 'notify.titleAborted' | 'notify.titleBlocked' | 'notify.titleMaxTokens';
/** The notification body: the reply snippet, or the empty-body fallback. */
export declare function bodyText(body: string, emptyBody: string): string;
/**
 * Whether a completion should surface a desktop notification, given the browser
 * permission, the background-only preference, page visibility, and whether
 * the completed session is the one currently in view.
 */
export declare function shouldShow(permission: NotificationPermission, backgroundOnly: boolean, documentHidden: boolean, completedSessionId?: string, currentSessionId?: string): boolean;
/** The grouping tag: one notification slot per session. */
export declare function notificationTag(sessionId: string): string;
/** The surface this code may show notifications on (absent in insecure contexts). */
export declare function notificationsApi(): typeof Notification | undefined;
