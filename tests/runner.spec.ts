/**
 * Completion runner decision: projection-turn advance detection and the
 * session-list-facts + settings → notification plan. Subagent skip, projection
 * use, projection-less fallback, unknown-reason skip, and rule gating.
 */
import { describe, expect, it } from 'vitest'
import type { NotificationSettings } from '../src/contract.ts'
import { notificationFor, pendingAdvance, pendingNotificationFor, projectionAdvance } from '../src/client/runner.ts'

function settings(overrides: Partial<NotificationSettings> = {}): NotificationSettings {
  return {
    enabled: true,
    notifyCompleted: true,
    notifyError: true,
    notifyAborted: false,
    notifyBlocked: false,
    notifyMaxTokens: false,
    notifyApproval: true,
    notifyQuestion: true,
    notifyPlanReview: false,
    rules: [],
    requireInteraction: false,
    backgroundOnly: true,
    ...overrides,
  }
}

describe('notificationFor', () => {
  it('skips subagent sessions', () => {
    const plan = notificationFor('s1', 'subagent', 'title', { turn: 1, reason: 'completed', body: 'done', tools: [] }, settings())
    expect(plan).toBeNull()
  })

  it('uses the projection reason and body when present', () => {
    const plan = notificationFor('s1', undefined, 'Deploy', { turn: 3, reason: 'error', body: 'boom', tools: ['bash'] }, settings())
    expect(plan).toEqual({ reason: 'error', body: 'boom', tag: 'dsh-notification-s1-3' })
  })

  it('falls back to a generic completion when the projection has not landed', () => {
    const plan = notificationFor('s1', undefined, 'Deploy the app', undefined, settings())
    expect(plan).toEqual({ reason: 'completed', body: 'Deploy the app', tag: 'dsh-notification-s1-0' })
  })

  it('skips unknown projection reasons', () => {
    const plan = notificationFor('s1', undefined, 'title', { turn: 1, reason: 'interrupted', body: '', tools: [] }, settings())
    expect(plan).toBeNull()
  })

  it('honors the outcome toggle for the projected reason', () => {
    const plan = notificationFor('s1', undefined, 'title', { turn: 1, reason: 'error', body: 'boom', tools: [] }, settings({ notifyError: false }))
    expect(plan).toBeNull()
  })

  it('applies rules over title, body, and tools', () => {
    const item = { title: 'Deploy', projection: { turn: 1, reason: 'completed' as const, body: 'preview build', tools: [] } }
    const exclude = settings({ rules: [{ id: 'r1', enabled: true, mode: 'exclude', pattern: 'preview', isRegex: false, caseSensitive: false }] })
    expect(notificationFor('s1', undefined, item.title, item.projection, exclude)).toBeNull()
    const include = settings({ rules: [{ id: 'r2', enabled: true, mode: 'include', pattern: 'Deploy', isRegex: false, caseSensitive: false }] })
    expect(notificationFor('s1', undefined, item.title, item.projection, include)).not.toBeNull()
  })

  it('respects the master switch', () => {
    const plan = notificationFor('s1', undefined, 'title', { turn: 1, reason: 'completed', body: 'done', tools: [] }, settings({ enabled: false }))
    expect(plan).toBeNull()
  })
})

describe('pendingAdvance', () => {
  it('seeds current state and detects a later wait', () => {
    expect(pendingAdvance(undefined, 'question')).toEqual({ kind: 'question', fresh: false })
    expect(pendingAdvance({ kind: undefined }, 'question')).toEqual({ kind: 'question', fresh: true })
    expect(pendingAdvance({ kind: 'question' }, undefined)).toEqual({ kind: undefined, fresh: false })
  })

  it('detects a different pending kind', () => {
    expect(pendingAdvance({ kind: 'approval' }, 'plan-review')).toEqual({ kind: 'plan-review', fresh: true })
  })
})

describe('pendingNotificationFor', () => {
  it('uses a unique sequence tag and the session title as body', () => {
    expect(pendingNotificationFor('s1', undefined, 'Deploy', 'approval', 2, settings()))
      .toEqual({ kind: 'approval', body: 'Deploy', tag: 'dsh-notification-pending-s1-2' })
  })

  it('skips subagents, disabled kinds, and non-matching rules', () => {
    expect(pendingNotificationFor('s1', 'subagent', 'Deploy', 'approval', 1, settings())).toBeNull()
    expect(pendingNotificationFor('s1', undefined, 'Deploy', 'plan-review', 1, settings())).toBeNull()
    expect(pendingNotificationFor('s1', undefined, 'Deploy', 'approval', 1, settings({
      rules: [{ id: 'r', enabled: true, mode: 'include', pattern: 'review', isRegex: false, caseSensitive: false }],
    }))).toBeNull()
  })
})

describe('projectionAdvance', () => {
  it('seeds on first observation without firing', () => {
    const seeded = projectionAdvance(undefined, { turn: 5, reason: 'completed', body: 'old', tools: [] })
    expect(seeded).toEqual({ nextTurn: 5, fresh: false })
  })

  it('fires only when the projection turn advances', () => {
    expect(projectionAdvance(5, { turn: 6, reason: 'completed', body: 'new', tools: [] })).toEqual({ nextTurn: 6, fresh: true })
    expect(projectionAdvance(6, { turn: 6, reason: 'completed', body: 'new', tools: [] })).toEqual({ nextTurn: 6, fresh: false })
  })

  it('treats an absent projection as turn 0', () => {
    expect(projectionAdvance(undefined, undefined)).toEqual({ nextTurn: 0, fresh: false })
    expect(projectionAdvance(0, { turn: 1, reason: 'completed', body: 'first', tools: [] })).toEqual({ nextTurn: 1, fresh: true })
  })
})
