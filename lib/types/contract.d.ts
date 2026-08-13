/** The turn-end reasons the client notifies on; anything else is ignored. */
export type NotificationReason = 'completed' | 'error' | 'aborted' | 'blocked' | 'max-tokens';
/**
 * The host projection's wire payload: a bounded summary of the session's last
 * completed turn. The client reads this key off the session list's
 * `projectionValues` when a session's completion reminder arms.
 */
export interface NotificationProjectionValue {
    /** The turn number that last ended (0 before the first completed turn). */
    readonly turn: number;
    /** Why it ended — the raw `TurnEndReason` kind; the client maps the five known kinds. */
    readonly reason: string;
    /** The turn's final assistant reply text, bounded host-side. */
    readonly body: string;
    /** Tool names the turn called, deduplicated in first-seen order. */
    readonly tools: readonly string[];
}
/** One include/exclude keyword rule over a turn's title, reply text, and tool names. */
export interface NotificationRule {
    /** Stable opaque id minted at creation and unchanged across edits. */
    readonly id: string;
    /** Whether the rule participates; disabled rules are kept but ignored. */
    readonly enabled: boolean;
    /** `include` = only notify when a rule matches; `exclude` = suppress on match. */
    readonly mode: 'include' | 'exclude';
    /** The literal substring or regular expression to match. */
    readonly pattern: string;
    /** When true, `pattern` is a regular expression instead of a literal substring. */
    readonly isRegex: boolean;
    /** When true, matching is case-sensitive. */
    readonly caseSensitive: boolean;
}
/** The client-persisted notification preferences. */
export interface NotificationSettings {
    /** Master switch; false disables every notification. */
    readonly enabled: boolean;
    readonly notifyCompleted: boolean;
    readonly notifyError: boolean;
    readonly notifyAborted: boolean;
    readonly notifyBlocked: boolean;
    readonly notifyMaxTokens: boolean;
    /** Ordered include/exclude filters over the session title, reply text, and tool names. */
    readonly rules: NotificationRule[];
    /** When true, the browser keeps the notification until the user dismisses it. */
    readonly requireInteraction: boolean;
    /** When true, only notify while the page is hidden (the tab is not focused). */
    readonly backgroundOnly: boolean;
}
/** The projection key this plugin owns. */
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionMap {
        notification: NotificationProjectionValue;
    }
}
