/**
 * Host completion detection and the notification decision. A `NotificationRuntime`
 * subscribes to the session `turn/end` firehose and, when the settings gate and
 * the include/exclude rules pass, emits the forwarded `notification/requested`
 * event the browser half shows. The decision functions are pure and unit-tested;
 * the runtime is the thin scoped-lifecycle glue.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import type { SettingsScope } from '@deepseek-ai/dsh-settings';
import type { NotificationReason, NotificationRule, NotificationSettings } from './contract.ts';
import type { ResolvedConfig } from './types.ts';
/**
 * Extract the assistant reply text of one turn, joining every text block of
 * every assistant message the turn produced.
 * @param events - the session log.
 * @param turn - the turn number.
 * @returns the joined text (empty when the turn produced no assistant text).
 */
export declare function extractTurnText(events: readonly SessionEvent[], turn: number): string;
/**
 * Extract the tool names one turn called, deduplicated in first-seen order.
 * @param events - the session log.
 * @param turn - the turn number.
 * @returns the unique tool names.
 */
export declare function extractTurnTools(events: readonly SessionEvent[], turn: number): readonly string[];
/** The text rules match against: the assistant reply plus the tool names. */
export declare function ruleSubject(text: string, tools: readonly string[]): string;
/** Whether one rule matches its subject. */
export declare function ruleMatches(rule: NotificationRule, subject: string): boolean;
/** Whether the configured per-outcome switch is on for a reason. */
export declare function reasonEnabled(settings: NotificationSettings, reason: NotificationReason): boolean;
/**
 * Evaluate the include/exclude rules against one subject.
 *
 * Semantics: any matching `exclude` rule suppresses; if at least one
 * `include` rule exists, at least one must match; otherwise the subject is
 * allowed. A subject with no rules is always allowed.
 */
export declare function rulesAllow(settings: NotificationSettings, subject: string): boolean;
/**
 * The whole decision for one completed turn, free of any session/store reads.
 * @param settings - live settings section.
 * @param reason - why the turn ended (already narrowed to a notifiable kind).
 * @param subject - the rule subject (assistant text plus tool names).
 * @returns true when a notification should be emitted.
 */
export declare function decide(settings: NotificationSettings, reason: NotificationReason, subject: string): boolean;
/**
 * Bound one reply to the configured body budget, ellipsizing on overflow.
 * @param text - the full reply text.
 * @param maxChars - the character budget.
 * @returns the bounded body.
 */
export declare function truncateBody(text: string, maxChars: number): string;
/** Host runtime: turn/end firehose → decision → forwarded event. */
export declare class NotificationRuntime {
    private readonly ctx;
    private readonly config;
    private readonly scope;
    /**
     * @param ctx - the plugin context.
     * @param config - resolved plugin configuration.
     * @param scope - the live settings owner scope.
     */
    constructor(ctx: Context, config: ResolvedConfig, scope: SettingsScope<NotificationSettings>);
    private onSessionEvent;
}
