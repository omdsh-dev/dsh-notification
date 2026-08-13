/**
 * Client decision unit tests: reason mapping, rule matching, the include/
 * exclude semantics, and the whole shouldNotify gate.
 */
import { describe, expect, it } from 'vitest'
import type { NotificationRule, NotificationSettings } from '../src/contract.ts'
import { asReason, reasonEnabled, ruleMatches, ruleSubject, rulesAllow, shouldNotify } from '../src/client/decision.ts'

function rule(overrides: Partial<NotificationRule> = {}): NotificationRule {
  return { id: 'r1', enabled: true, mode: 'include', pattern: 'deploy', isRegex: false, caseSensitive: false, ...overrides }
}

function settings(overrides: Partial<NotificationSettings> = {}): NotificationSettings {
  return {
    enabled: true,
    notifyCompleted: true,
    notifyError: true,
    notifyAborted: false,
    notifyBlocked: false,
    notifyMaxTokens: false,
    rules: [],
    requireInteraction: false,
    backgroundOnly: true,
    ...overrides,
  }
}

describe('asReason', () => {
  it('maps the five known kinds and rejects unknown', () => {
    expect(asReason('completed')).toBe('completed')
    expect(asReason('max-tokens')).toBe('max-tokens')
    expect(asReason('interrupted')).toBeUndefined()
    expect(asReason(undefined)).toBeUndefined()
  })
})

describe('reasonEnabled', () => {
  it('maps each reason to its configured flag', () => {
    const s = settings({ notifyAborted: true, notifyMaxTokens: true, notifyError: false })
    expect(reasonEnabled(s, 'completed')).toBe(true)
    expect(reasonEnabled(s, 'aborted')).toBe(true)
    expect(reasonEnabled(s, 'max-tokens')).toBe(true)
    expect(reasonEnabled(s, 'error')).toBe(false)
    expect(reasonEnabled(s, 'blocked')).toBe(false)
  })
})

describe('ruleSubject', () => {
  it('joins the title, reply text, and tool names', () => {
    expect(ruleSubject('Deploy the app', 'deploy done', ['bash', 'edit'])).toBe(['Deploy the app', 'deploy done', 'bash edit'].join('\n'))
  })

  it('omits absent title and empty body', () => {
    expect(ruleSubject(undefined, '', [])).toBe('')
    expect(ruleSubject('Only title', '', [])).toBe('Only title')
  })
})

describe('ruleMatches', () => {
  it('matches a literal substring case-insensitively by default', () => {
    expect(ruleMatches(rule({ pattern: 'Deploy' }), 'the deploy succeeded')).toBe(true)
  })

  it('matches case-sensitively when requested', () => {
    expect(ruleMatches(rule({ pattern: 'Deploy', caseSensitive: true }), 'the deploy succeeded')).toBe(false)
    expect(ruleMatches(rule({ pattern: 'Deploy', caseSensitive: true }), 'Deploy succeeded')).toBe(true)
  })

  it('matches a regular expression, honoring case sensitivity', () => {
    expect(ruleMatches(rule({ pattern: 'deploy(ed|ing)', isRegex: true }), 'it is deploying')).toBe(true)
    expect(ruleMatches(rule({ pattern: '^ERROR', isRegex: true, caseSensitive: true }), 'error happened')).toBe(false)
  })
})

describe('rulesAllow', () => {
  it('allows with no rules', () => {
    expect(rulesAllow(settings(), 'anything')).toBe(true)
  })

  it('suppresses when any exclude rule matches', () => {
    const s = settings({ rules: [rule({ mode: 'exclude', pattern: 'preview' })] })
    expect(rulesAllow(s, 'running a preview build')).toBe(false)
    expect(rulesAllow(s, 'running a real build')).toBe(true)
  })

  it('requires a match when include rules exist', () => {
    const s = settings({ rules: [rule({ mode: 'include', pattern: 'deploy' })] })
    expect(rulesAllow(s, 'deploy finished')).toBe(true)
    expect(rulesAllow(s, 'tests finished')).toBe(false)
  })
})

describe('shouldNotify', () => {
  it('gates on the master switch, the outcome kind, and the rules', () => {
    expect(shouldNotify(settings({ enabled: false }), 'completed', 'done')).toBe(false)
    expect(shouldNotify(settings(), 'blocked', 'waiting')).toBe(false)
    expect(shouldNotify(settings({ rules: [rule({ mode: 'exclude', pattern: 'preview' })] }), 'completed', 'preview done')).toBe(false)
    expect(shouldNotify(settings(), 'completed', 'done')).toBe(true)
  })
})

