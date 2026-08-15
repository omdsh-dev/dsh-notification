/**
 * Client notification helpers: localized titles, body selection, the
 * permission/background gate, and the per-session grouping tag.
 */
import { describe, expect, it } from 'vitest'
import { bodyText, notificationTag, pendingNotificationTag, pendingTitleKey, shouldShow, titleKey } from '../src/client/notifier.ts'

describe('titleKey', () => {
  it('maps every reason to its title key', () => {
    expect(titleKey('completed')).toBe('notify.titleCompleted')
    expect(titleKey('error')).toBe('notify.titleError')
    expect(titleKey('aborted')).toBe('notify.titleAborted')
    expect(titleKey('blocked')).toBe('notify.titleBlocked')
    expect(titleKey('max-tokens')).toBe('notify.titleMaxTokens')
  })
})

describe('pendingTitleKey', () => {
  it('maps every pending kind to its title key', () => {
    expect(pendingTitleKey('approval')).toBe('notify.titleApproval')
    expect(pendingTitleKey('question')).toBe('notify.titleQuestion')
    expect(pendingTitleKey('plan-review')).toBe('notify.titlePlanReview')
  })
})

describe('bodyText', () => {
  it('trims the reply snippet', () => {
    expect(bodyText('  done  ', 'fallback')).toBe('done')
  })

  it('falls back when the reply is empty', () => {
    expect(bodyText('   ', 'fallback')).toBe('fallback')
  })
})

describe('shouldShow', () => {
  it('requires granted permission', () => {
    expect(shouldShow('default', false, true)).toBe(false)
    expect(shouldShow('denied', false, true)).toBe(false)
    expect(shouldShow('granted', false, true)).toBe(true)
  })

  it('honors the background-only gate', () => {
    expect(shouldShow('granted', true, false, 'session-a', 'session-a')).toBe(false)
    expect(shouldShow('granted', true, true, 'session-a', 'session-a')).toBe(true)
    expect(shouldShow('granted', false, false, 'session-a', 'session-a')).toBe(true)
  })

  it('notifies for another session while DSH is visible', () => {
    expect(shouldShow('granted', true, false, 'session-a', 'session-b')).toBe(true)
    expect(shouldShow('granted', true, false, 'session-a', undefined)).toBe(true)
  })
})

describe('notificationTag', () => {
  it('namespaces the tag per session', () => {
    expect(notificationTag('session-1')).toBe('dsh-notification-session-1')
  })
})

describe('pendingNotificationTag', () => {
  it('keeps pending tags separate from completion tags', () => {
    expect(pendingNotificationTag('session-1')).toBe('dsh-notification-pending-session-1')
  })
})
