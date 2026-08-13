/**
 * The `notification` settings namespace: schema, write-time validation, and
 * registration. Every save path (the Web settings UI) passes the same
 * validator, so an invalid rule set is rejected before it persists. The
 * namespace name must match the harness's `WEB_SETTINGS_NAMESPACES` allowlist
 * or every save silently no-ops (see README).
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type SettingsScope } from '@deepseek-ai/dsh-settings';
import type { NotificationRule, NotificationSettings } from './contract.ts';
import type { ResolvedConfig } from './types.ts';
/** The branded namespace name (the Web allowlist must list the same string). */
export declare const NOTIFICATION_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/** Schemastery schema of the `notification` namespace section. */
export declare const NotificationSettingsSchema: z<NotificationSettings>;
/**
 * Reject one rule before it persists: a non-empty pattern, and a compilable
 * regular expression when `isRegex` is set.
 * @param rule - the candidate rule.
 */
export declare function validateRule(rule: NotificationRule): void;
/**
 * Reject a whole settings section: the rule-count cap plus per-rule and
 * duplicate-id constraints.
 * @param value - the resolved section.
 * @param config - resolved plugin configuration.
 */
export declare function validateNotificationSettings(value: NotificationSettings, config: ResolvedConfig): void;
/**
 * Register the namespace with the settings provider and return its owner scope.
 * @param ctx - the plugin context carrying the settings provider.
 * @param config - resolved plugin configuration.
 * @returns the owner scope driving the live notification decision.
 */
export declare function registerNotificationSettings(ctx: Context, config: ResolvedConfig): SettingsScope<NotificationSettings>;
