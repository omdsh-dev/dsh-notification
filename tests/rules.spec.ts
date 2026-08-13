/**
 * Client rule-editing helpers: id minting, draft validation, and immutable
 * list updates consumed by the settings section.
 */
import { describe, expect, it } from 'vitest'
import { emptyRule, firstRuleError, mintRuleId, patchRule, removeRule, ruleError } from '../src/client/rules.ts'

describe('mintRuleId', () => {
  it('mints unique ids', () => {
    expect(mintRuleId()).not.toBe(mintRuleId())
  })
})

describe('emptyRule', () => {
  it('starts as an enabled, empty include rule', () => {
    const rule = emptyRule()
    expect(rule.enabled).toBe(true)
    expect(rule.mode).toBe('include')
    expect(rule.pattern).toBe('')
    expect(rule.isRegex).toBe(false)
    expect(rule.caseSensitive).toBe(false)
  })
})

describe('ruleError', () => {
  it('flags an empty pattern', () => {
    expect(ruleError({ ...emptyRule(), pattern: '  ' })).toBe('settings.rules.invalid')
  })

  it('flags an invalid regex', () => {
    expect(ruleError({ ...emptyRule(), pattern: '(', isRegex: true })).toBe('settings.rules.invalidRegex')
  })

  it('accepts a valid rule', () => {
    expect(ruleError({ ...emptyRule(), pattern: 'deploy' })).toBeUndefined()
  })
})

describe('firstRuleError', () => {
  it('returns the first invalid rule index and reason', () => {
    const rules = [emptyRule(), { ...emptyRule(), id: 'r2', pattern: 'ok' }]
    expect(firstRuleError(rules)).toEqual({ index: 0, key: 'settings.rules.invalid' })
  })

  it('returns undefined when every rule is valid', () => {
    expect(firstRuleError([{ ...emptyRule(), pattern: 'ok' }])).toBeUndefined()
  })
})

describe('patchRule', () => {
  it('replaces the matched rule and leaves others intact', () => {
    const rules = [emptyRule(), { ...emptyRule(), id: 'r2' }]
    const next = patchRule(rules, rules[0]!.id, { pattern: 'deploy', mode: 'exclude' })
    expect(next[0]).toMatchObject({ pattern: 'deploy', mode: 'exclude' })
    expect(next[1]).toBe(rules[1])
  })
})

describe('removeRule', () => {
  it('removes the matched rule by id', () => {
    const rules = [emptyRule(), { ...emptyRule(), id: 'r2' }]
    expect(removeRule(rules, rules[0]!.id)).toEqual([rules[1]])
  })
})
