/**
 * The `notification` projection unit: a pure fold of the session log into a
 * bounded summary of the last completed turn (reason, reply text, tool names).
 * Registered on `ctx.sessionProjections`, the seam drives `apply` over every
 * committed session event and delivers the `view` to the client for every
 * session — no harness allowlist change. The fold is pure and unit-tested;
 * the registration is the only effect.
 */
import { z } from 'zod'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { NotificationProjectionValue } from './contract.ts'
import type { ResolvedConfig } from './types.ts'

/** Accumulated turn in progress plus the last finalized completion. */
export interface NotificationProjectionState {
  /** The open turn's text and tool names; null outside a turn. */
  readonly openTurn: { readonly turn: number; readonly text: string; readonly tools: string[] } | null
  /** The last completed turn's summary; null before the first completion. */
  readonly last: NotificationProjectionValue | null
}

/** The empty-log view (no completed turn yet). */
export const EMPTY_PROJECTION: NotificationProjectionValue = Object.freeze({
  turn: 0,
  reason: '',
  body: '',
  tools: Object.freeze([]) as readonly string[],
})

/**
 * Bound one reply to the body budget, ellipsizing on overflow. Kept in the
 * fold so the persisted state never grows past the budget.
 * @param text - the accumulated reply text.
 * @param maxChars - the character budget.
 * @returns the bounded text.
 */
export function boundText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars - 1) + '…'
}

/**
 * Apply one committed event to the fold state. Uninteresting events return the
 * same reference (Object.is gates the change feed).
 * @param state - the state covering all prior events.
 * @param event - the next committed event.
 * @param maxChars - the body budget.
 * @returns the next state.
 */
export function applyProjectionEvent(
  state: NotificationProjectionState,
  event: SessionEvent,
  maxChars: number,
): NotificationProjectionState {
  switch (event.type) {
    case 'turn/start':
      return { ...state, openTurn: { turn: event.data.turn, text: '', tools: [] } }
    case 'assistant/message': {
      const open = state.openTurn
      if (open === null || open.turn !== event.data.turn) return state
      let text = open.text
      for (const block of event.data.message.content) {
        if (block.type === 'text') text += block.text
      }
      if (text.length > maxChars) text = boundText(text, maxChars)
      if (text === open.text) return state
      return { ...state, openTurn: { ...open, text } }
    }
    case 'tool/call': {
      const open = state.openTurn
      if (open === null || open.turn !== event.data.turn) return state
      if (open.tools.includes(event.data.name)) return state
      return { ...state, openTurn: { ...open, tools: [...open.tools, event.data.name] } }
    }
    case 'turn/end': {
      const open = state.openTurn
      if (open === null || open.turn !== event.data.turn) return state
      return {
        openTurn: null,
        last: {
          turn: event.data.turn,
          reason: event.data.reason.kind,
          body: open.text.trim(),
          tools: open.tools,
        },
      }
    }
    default:
      return state
  }
}

/**
 * Build the `notification` projection unit.
 * @param config - resolved plugin configuration (body budget).
 * @returns the projection definition registered on the projection seam.
 */
export function notificationProjection(config: ResolvedConfig): ProjectionDefinition<'notification', NotificationProjectionState> {
  return {
    key: 'notification',
    schema: z.object({
      turn: z.number().int().nonnegative(),
      reason: z.string(),
      body: z.string(),
      tools: z.array(z.string()),
    }).strict(),
    init: () => ({ openTurn: null, last: null }),
    apply: (state, event) => applyProjectionEvent(state, event, config.maxBodyChars),
    view: state => state.last ?? EMPTY_PROJECTION,
    stateVersion: 1,
  }
}
