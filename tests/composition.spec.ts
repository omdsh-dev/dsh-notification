/**
 * Host composition behavior: the plugin module boots over a real cordis Context
 * with the REAL SessionStore and the REAL SessionProjectionRegistry, registers
 * the `notification` projection, and a completed turn folds to the right
 * summary — proving the registration and the fold end-to-end. The seam is real;
 * nothing is faked.
 */
import { Context } from '@deepseek-ai/cordis'
import { once } from 'node:events'
import { createServer, type IncomingMessage } from 'node:http'
import TypertRegistry from '@deepseek-ai/dsh-typert-registry'
import SessionStore from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import { createAssistantMessage } from '@deepseek-ai/dsh-llm'
import { describe, expect, it, vi } from 'vitest'
import * as plugin from '../src/index.ts'

function reply(text: string) {
  return createAssistantMessage({ content: [{ type: 'text', text }], source: { provider: 'test', model: 'test' } })
}

async function requestBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
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
    expect(plugin.Config({})).toMatchObject({ maxBodyChars: 400, webhook: { enabled: false } })
    expect(plugin.Config({ maxBodyChars: 400, webhook: { enabled: true } }).webhook).toMatchObject({
      enabled: true,
      includeBody: false,
      includeTools: false,
      reasons: ['completed', 'error'],
    })
    expect(() => plugin.Config({ maxBodyChars: 0 })).toThrow()
  })

  it('delivers completed turns from the Host while no browser client is mounted', async () => {
    const received: string[] = []
    const server = createServer((request, response) => {
      void requestBody(request).then((body) => {
        received.push(body)
        response.writeHead(204).end()
      })
    })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('test server has no TCP address')
    const envName = 'DSH_NOTIFICATION_WEBHOOK_URL'
    const secret = `whsec_${Buffer.from('0123456789abcdef0123456789abcdef').toString('base64')}`
    const previousUrl = process.env[envName]
    process.env[envName] = `http://127.0.0.1:${address.port}/turn-ended`

    const ctx = new Context()
    let fiber: ReturnType<Context['plugin']> | undefined
    try {
      await ctx.plugin(TypertRegistry)
      await ctx.plugin(SessionStore)
      await ctx.plugin(SessionProjectionRegistry)
      ctx.provide('credentials', {
        resolve: () => Promise.resolve({ value: secret, source: 'test' }),
      } as never)
      fiber = ctx.plugin({ inject: plugin.inject, apply: plugin.apply }, {
        maxBodyChars: 100,
        webhook: { enabled: true },
      })
      await fiber
      const store = ctx.get('sessions') as SessionStore
      const session = store.create(undefined, { meta: { cwd: '/tmp/dsh-notification-webhook' } })

      session.append('turn/start', { turn: 1 })
      expect(received).toHaveLength(0)
      const ended = session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })

      await vi.waitFor(() => { expect(received).toHaveLength(1) })
      const payload = JSON.parse(received[0]!) as { data: Record<string, unknown>; type: string }
      expect(payload.type).toBe('dsh.turn.ended')
      expect(payload).toMatchObject({ timestamp: new Date(ended.time).toISOString() })
      expect(payload.data).toEqual({ turn: 1, reason: 'completed' })
    } finally {
      await fiber?.dispose()
      if (previousUrl === undefined) delete process.env[envName]
      else process.env[envName] = previousUrl
      const closed = once(server, 'close')
      server.close()
      await closed
    }
  })
})
