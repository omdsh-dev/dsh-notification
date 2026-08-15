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
    expect(plan).toEqual({ reason: 'error', body: 'boom', tag: 'dsh-notification-s1' })
  })

  it('falls back to a generic completion when the projection has not landed', () => {
    const plan = notificationFor('s1', undefined, 'Deploy the app', undefined, settings())
    expect(plan).toEqual({ reason: 'completed', body: 'Deploy the app', tag: 'dsh-notification-s1' })
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

describe('pendingAdvance', () => {
  it('seeds on first observation without firing', () => {
    expect(pendingAdvance(undefined, 'approval')).toEqual({ kind: 'approval', fresh: false })
    expect(pendingAdvance(undefined, undefined)).toEqual({ kind: undefined, fresh: false })
  })

  it('fires only on the undefined → kind edge', () => {
    expect(pendingAdvance({ kind: undefined }, 'approval')).toEqual({ kind: 'approval', fresh: true })
    expect(pendingAdvance({ kind: 'approval' }, 'approval')).toEqual({ kind: 'approval', fresh: false })
    expect(pendingAdvance({ kind: 'approval' }, undefined)).toEqual({ kind: undefined, fresh: false })
  })

  it('fires when one kind is replaced by another', () => {
    expect(pendingAdvance({ kind: 'approval' }, 'question')).toEqual({ kind: 'question', fresh: true })
  })
})

describe('pendingNotificationFor', () => {
  it('skips subagent sessions', () => {
    expect(pendingNotificationFor('s1', 'subagent', 'Deploy', 'approval', settings())).toBeNull()
  })

  it('plans a notification with the display title as body', () => {
    expect(pendingNotificationFor('s1', undefined, 'Deploy the app', 'approval', settings()))
      .toEqual({ kind: 'approval', body: 'Deploy the app', tag: 'dsh-notification-pending-s1' })
  })

  it('honors the pending-kind toggle', () => {
    expect(pendingNotificationFor('s1', undefined, 'Deploy', 'plan-review', settings())).toBeNull()
    expect(pendingNotificationFor('s1', undefined, 'Deploy', 'plan-review', settings({ notifyPlanReview: true })))
      .toEqual({ kind: 'plan-review', body: 'Deploy', tag: 'dsh-notification-pending-s1' })
  })

  it('respects the master switch', () => {
    expect(pendingNotificationFor('s1', undefined, 'Deploy', 'approval', settings({ enabled: false }))).toBeNull()
  })
})
