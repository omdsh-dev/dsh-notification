/**
 * Host composition behavior: the plugin module boots over a real cordis Context
 * with the REAL SessionStore and the REAL SessionProjectionRegistry, registers
 * the `notification` projection, and a completed turn folds to the right
 * summary — proving the registration and the fold end-to-end. The seam is real;
 * nothing is faked.
 */
import { Context } from '@deepseek-ai/cordis'
import TypertRegistry from '@deepseek-ai/dsh-typert-registry'
import SessionStore from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import { createAssistantMessage } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'
import * as plugin from '../src/index.ts'

function reply(text: string) {
  return createAssistantMessage({ content: [{ type: 'text', text }], source: { provider: 'test', model: 'test' } })
}

describe('dsh-notification host composition', () => {
  it('registers the projection and folds a completed turn', async () => {
    const ctx = new Context()
    await ctx.plugin(TypertRegistry)
    await ctx.plugin(SessionStore)
    await ctx.plugin(SessionProjectionRegistry)
    const fiber = ctx.plugin({ inject: plugin.inject, apply: plugin.apply }, { maxBodyChars: 100 })
    await fiber
    const store = ctx.get('sessions') as SessionStore
    const session = store.create(undefined, { meta: { cwd: '/tmp/dsh-notification' } })
    session.append('turn/start', { turn: 1 })
    session.append('step/start', { turn: 1, step: 1 })
    session.append('assistant/message', { turn: 1, step: 1, message: reply('deploy done') }, { surfaceOp: 'append' })
    session.append('tool/call', { turn: 1, step: 1, callId: 'c1' as never, name: 'bash', arguments: '{}' })
    session.append('step/end', { turn: 1, step: 1 })
    session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })

    const registry = ctx.get('sessionProjections') as SessionProjectionRegistry
    expect(registry.snapshot(session).values.notification).toEqual({ turn: 1, reason: 'completed', body: 'deploy done', tools: ['bash'] })

    await fiber.dispose()
    expect(registry.snapshot(session).values.notification).toBeUndefined()
  })

  it('validates configuration through the exported schema', () => {
    expect(plugin.Config({})).toEqual({ maxBodyChars: 400 })
    expect(() => plugin.Config({ maxBodyChars: 0 })).toThrow()
  })
})

