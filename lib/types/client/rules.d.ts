/**
 * Client-side rule-editing helpers: minting, a draft validator, and the
 * field-update fold. Pure and unit-tested; the settings section consumes them.
 */
import type { NotificationRule } from '../contract.ts';
import type { NotificationKey } from './locales.ts';
/** Mint a fresh rule id (browser crypto). */
export declare function mintRuleId(): string;
/** A new empty include rule ready for editing. */
export declare function emptyRule(): NotificationRule;
/**
 * Validate one draft rule and return the blocking reason, or undefined when
 * valid. Mirrors the Host's write-time validator so a rule that cannot persist
 * is caught before the save button is enabled.
 * @param rule - the draft rule.
 * @returns a reason string, or undefined when valid.
 */
export declare function ruleError(rule: NotificationRule): NotificationKey | undefined;
/** First invalid rule in a draft list, or undefined when every rule is valid. */
export declare function firstRuleError(rules: readonly NotificationRule[]): {
    index: number;
    key: NotificationKey;
} | undefined;
/**
 * Replace one rule by id, returning a new array (immutable update).
 * @param rules - the draft list.
 * @param id - the rule to replace.
 * @param patch - the fields to merge over the rule.
 * @returns the updated list.
 */
export declare function patchRule(rules: readonly NotificationRule[], id: string, patch: Partial<NotificationRule>): NotificationRule[];
/** Remove one rule by id, returning a new array. */
export declare function removeRule(rules: readonly NotificationRule[], id: string): NotificationRule[];
