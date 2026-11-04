/**
 * Completion runner decision: projection-turn advance detection and the
 * session-list-facts + settings → notification plan. Subagent skip, projection
 * use, projection-less fallback, unknown-reason skip, and rule gating.
 */
import { describe, expect, it } from 'vitest'
import type { NotificationSettings } from '../src/contract.ts'
import {
  currentSessionId,
  notificationFor,
  pendingAdvance,
  pendingNotificationFor,
  pendingSourceOf,
  projectionAdvance,
} from '../src/client/runner.ts'

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
    expect(plan).toEqual({ reason: 'error', body: 'boom', tag: 'dsh-notification-s1-3', sessionTitle: 'Deploy' })
  })

  it('falls back to a generic completion when the projection has not landed', () => {
    const plan = notificationFor('s1', undefined, 'Deploy the app', undefined, settings())
    expect(plan).toEqual({ reason: 'completed', body: 'Deploy the app', tag: 'dsh-notification-s1-0', sessionTitle: 'Deploy the app' })
  })

  it('drops a blank session title from the plan', () => {
    const plan = notificationFor('s1', undefined, '   ', { turn: 1, reason: 'completed', body: 'done', tools: [] }, settings())
    expect(plan?.sessionTitle).toBeUndefined()
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

describe('pendingSourceOf', () => {
  /** A pending source over a fixed map, enough for the adapter's reads. */
  function source(entries: Array<[string, { kind: string }]>) {
    return {
      getSnapshot: () => new Map(entries),
      subscribe: () => () => {},
    }
  }

  it('uses the 0.1.x pending-interactions observable as-is', () => {
    const legacy = source([['s1', { kind: 'question' }]])
    expect(pendingSourceOf({ pendingInteractions: legacy })).toBe(legacy)
  })

  it('folds the 0.2.x session status into one pending kind per session', () => {
    const statuses = new Map<string, {
      running: boolean
      pendingInteraction?: { kind: string }
      completionUnread: boolean
    }>([
      ['s1', { running: false, pendingInteraction: { kind: 'approval' }, completionUnread: false }],
      ['s2', { running: false, completionUnread: false }],
    ])
    const adapted = pendingSourceOf({
      sessionStatus: { getSnapshot: () => statuses, subscribe: () => () => {} },
    })
    expect(adapted?.getSnapshot().get('s1')).toEqual({ kind: 'approval' })
    expect(adapted?.getSnapshot().has('s2')).toBe(false)
  })

  it('returns undefined while neither layout is available', () => {
    expect(pendingSourceOf(undefined)).toBeUndefined()
    expect(pendingSourceOf({})).toBeUndefined()
  })
})

describe('currentSessionId', () => {
  it('prefers the list selection when the layout provides one', () => {
    expect(currentSessionId('s1', { s1: { id: 's1', retainedBy: { mainView: 1 } }, s2: { id: 's2' } })).toBe('s1')
  })

  it('derives the displayed session from retain counts on 0.2.x', () => {
    expect(currentSessionId(undefined, {
      a: { id: 'a', retainedBy: { sidebar: 1 } },
      b: { id: 'b', retainedBy: { mainView: 1, sidebar: 2 } },
    })).toBe('b')
  })

  it('returns undefined when no session is on screen', () => {
    expect(currentSessionId(undefined, { a: { id: 'a' } })).toBeUndefined()
    expect(currentSessionId(undefined, {})).toBeUndefined()
  })
})

describe('projectionAdvance', () => {
  it('seeds on first observation without firing', () => {
    const seeded = projectionAdvance(undefined, { turn: 5, reason: 'completed', body: 'old', tools: [] })
    expect(seeded).toEqual({ kind: 'turn', turn: 5, fresh: false })
  })

  it('fires only when the projection turn advances', () => {
    expect(projectionAdvance(5, { turn: 6, reason: 'completed', body: 'new', tools: [] }))
      .toEqual({ kind: 'turn', turn: 6, fresh: true })
    expect(projectionAdvance(6, { turn: 6, reason: 'completed', body: 'new', tools: [] }))
      .toEqual({ kind: 'turn', turn: 6, fresh: false })
  })

  it('makes no decision when the host served no projection (issue #20)', () => {
    expect(projectionAdvance(undefined, undefined)).toEqual({ kind: 'absent' })
    expect(projectionAdvance(3, undefined)).toEqual({ kind: 'absent' })
  })

  it('seeds silently when a value first appears after an absent frame (issue #20)', () => {
    // The reload regression: an absent frame must not baseline turn 0, so the
    // projection for a historical turn is a silent seed instead of a fresh one.
    expect(projectionAdvance(undefined, { turn: 7, reason: 'completed', body: 'days ago', tools: [] }))
      .toEqual({ kind: 'turn', turn: 7, fresh: false })
  })
})
