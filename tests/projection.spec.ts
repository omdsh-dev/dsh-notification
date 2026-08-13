/**
 * The `notification` projection fold: turning a session log into the bounded
 * last-completion summary. Synthetic events avoid the session-store machinery
 * the composition spec covers.
 */
import { createAssistantMessage } from '@deepseek-ai/dsh-llm'
import type { SessionEvent, SessionEventMap, SessionEventType } from '@deepseek-ai/dsh-session'
import { describe, expect, it } from 'vitest'
import type { NotificationProjectionValue } from '../src/contract.ts'
import { EMPTY_PROJECTION, applyProjectionEvent, boundText, notificationProjection, type NotificationProjectionState } from '../src/projection.ts'
import type { ResolvedConfig } from '../src/types.ts'

function evt<K extends SessionEventType>(type: K, data: SessionEventMap[K]): SessionEvent<K> {
  return { type, seq: 0, time: 0, data } as SessionEvent<K>
}

function assistant(turn: number, text: string): SessionEvent<'assistant/message'> {
  return evt('assistant/message', {
    turn,
    step: 1,
    message: createAssistantMessage({ content: [{ type: 'text', text }], source: { provider: 'test', model: 'test' } }),
  })
}

function toolCall(turn: number, name: string): SessionEvent<'tool/call'> {
  return evt('tool/call', { turn, step: 1, callId: ('call-' + name) as never, name, arguments: '{}' })
}

function config(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return { maxBodyChars: 400, ...overrides }
}

function fold(events: readonly SessionEvent[], cfg: ResolvedConfig): NotificationProjectionValue {
  let state: NotificationProjectionState = { openTurn: null, last: null }
  for (const event of events) state = applyProjectionEvent(state, event, cfg.maxBodyChars)
  return notificationProjection(cfg).view(state)
}

describe('boundText', () => {
  it('returns short text unchanged', () => {
    expect(boundText('done', 10)).toBe('done')
  })

  it('ellipsizes text over the budget', () => {
    expect(boundText('1234567890', 5)).toBe('1234…')
  })
})

describe('applyProjectionEvent', () => {
  it('folds a completed turn into the last-completion summary', () => {
    const value = fold([
      evt('turn/start', { turn: 1 }),
      assistant(1, 'deploy '),
      assistant(1, 'done'),
      toolCall(1, 'bash'),
      toolCall(1, 'bash'),
      toolCall(1, 'edit'),
      evt('turn/end', { turn: 1, reason: { kind: 'completed' } }),
    ], config())
    expect(value).toEqual({ turn: 1, reason: 'completed', body: 'deploy done', tools: ['bash', 'edit'] })
  })

  it('reports the empty view before any completion', () => {
    expect(fold([], config())).toEqual(EMPTY_PROJECTION)
    expect(fold([evt('turn/start', { turn: 1 }), assistant(1, 'hi')], config())).toEqual(EMPTY_PROJECTION)
  })

  it('bounds the reply text to the configured budget', () => {
    const value = fold([
      evt('turn/start', { turn: 1 }),
      assistant(1, '1234567890'),
      evt('turn/end', { turn: 1, reason: { kind: 'completed' } }),
    ], config({ maxBodyChars: 5 }))
    expect(value.body).toBe('1234…')
  })

  it('ignores events from a different turn', () => {
    const value = fold([
      evt('turn/start', { turn: 1 }),
      assistant(2, 'ignored'),
      evt('turn/end', { turn: 1, reason: { kind: 'error', error: { message: 'boom', code: 'UNKNOWN' } } }),
    ], config())
    expect(value).toMatchObject({ turn: 1, reason: 'error', body: '' })
  })

  it('records a non-completed reason verbatim', () => {
    const value = fold([
      evt('turn/start', { turn: 1 }),
      evt('turn/end', { turn: 1, reason: { kind: 'blocked' } }),
    ], config())
    expect(value.reason).toBe('blocked')
  })

  it('carries a stateVersion and key on the definition', () => {
    const def = notificationProjection(config())
    expect(def.key).toBe('notification')
    expect(def.stateVersion).toBe(1)
  })
})
