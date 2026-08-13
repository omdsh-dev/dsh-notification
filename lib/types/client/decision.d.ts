/**
 * Client-side notification decision: reason mapping, the include/exclude rule
 * semantics, and the rule subject. Pure and unit-tested; the runner consumes
 * these against the session list's title and the host `notification` projection.
 */
import type { NotificationReason, NotificationRule, NotificationSettings } from '../contract.ts';
/** Map a raw projection reason to a notifiable reason, or undefined for unknown kinds. */
export declare function asReason(reason: string | undefined): NotificationReason | undefined;
/** Whether the configured per-outcome switch is on for a reason. */
export declare function reasonEnabled(settings: NotificationSettings, reason: NotificationReason): boolean;
/** The text rules match against: the session title, the reply text, and the tool names. */
export declare function ruleSubject(title: string | undefined, body: string, tools: readonly string[]): string;
/** Whether one rule matches its subject. */
export declare function ruleMatches(rule: NotificationRule, subject: string): boolean;
/**
 * Evaluate the include/exclude rules against one subject. Any matching exclude
 * rule suppresses; if at least one include rule exists, at least one must
 * match; otherwise the subject is allowed.
 */
export declare function rulesAllow(settings: NotificationSettings, subject: string): boolean;
/** The whole decision for one completed session, free of any browser reads. */
export declare function shouldNotify(settings: NotificationSettings, reason: NotificationReason, subject: string): boolean;
