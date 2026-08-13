/**
 * Client-side rule-editing helpers: minting, a draft validator, and the
 * field-update fold. Pure and unit-tested; the settings section consumes them.
 */
import type { NotificationRule } from '../contract.ts'
import type { NotificationKey } from './locales.ts'

/** Mint a fresh rule id (browser crypto). */
export function mintRuleId(): string {
  return crypto.randomUUID()
}

/** A new empty include rule ready for editing. */
export function emptyRule(): NotificationRule {
  return { id: mintRuleId(), enabled: true, mode: 'include', pattern: '', isRegex: false, caseSensitive: false }
}

/**
 * Validate one draft rule and return the blocking reason, or undefined when
 * valid. Mirrors the Host's write-time validator so a rule that cannot persist
 * is caught before the save button is enabled.
 * @param rule - the draft rule.
 * @returns a reason string, or undefined when valid.
 */
export function ruleError(rule: NotificationRule): NotificationKey | undefined {
  if (rule.pattern.trim() === '') return 'settings.rules.invalid'
  if (rule.isRegex) {
    try {
      new RegExp(rule.pattern)
    } catch {
      return 'settings.rules.invalidRegex'
    }
  }
  return undefined
}

/** First invalid rule in a draft list, or undefined when every rule is valid. */
export function firstRuleError(rules: readonly NotificationRule[]): { index: number; key: NotificationKey } | undefined {
  for (let index = 0; index < rules.length; index++) {
    const key = ruleError(rules[index] as NotificationRule)
    if (key !== undefined) return { index, key }
  }
  return undefined
}

/**
 * Replace one rule by id, returning a new array (immutable update).
 * @param rules - the draft list.
 * @param id - the rule to replace.
 * @param patch - the fields to merge over the rule.
 * @returns the updated list.
 */
export function patchRule(rules: readonly NotificationRule[], id: string, patch: Partial<NotificationRule>): NotificationRule[] {
  return rules.map(rule => (rule.id === id ? { ...rule, ...patch } : rule))
}

/** Remove one rule by id, returning a new array. */
export function removeRule(rules: readonly NotificationRule[], id: string): NotificationRule[] {
  return rules.filter(rule => rule.id !== id)
}
