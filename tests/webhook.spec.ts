import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  WebhookDispatcher,
  createTurnEndedWebhookMessage,
  resolveServerWebhookConfig,
  type ServerWebhookConfig,
} from '../src/webhook.ts'

const SECRET_BYTES = Buffer.from('0123456789abcdef0123456789abcdef')
const SECRET = `whsec_${SECRET_BYTES.toString('base64')}`
const SECOND_SECRET = `whsec_${Buffer.from('fedcba9876543210fedcba9876543210').toString('base64')}`

const secret = (value: string | undefined) => (): Promise<string | undefined> => Promise.resolve(value)

function resolved(overrides: ServerWebhookConfig = {}) {
  return resolveServerWebhookConfig(overrides, {
    DSH_NOTIFICATION_WEBHOOK_URL: 'https://hooks.example.test/dsh',
  })
}

function message() {
  return createTurnEndedWebhookMessage({
    sessionId: 'session-1',
    eventTime: Date.parse('2026-08-13T12:34:56.789Z'),
    turn: 3,
    reason: 'completed',
    body: 'deploy done',
    tools: ['bash'],
  }, resolved())
}

function waitForAbort(_input: URL | RequestInfo, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    const signal = init?.signal
    if (signal?.aborted) reject(signal.reason)
    else signal?.addEventListener('abort', () => { reject(signal.reason) }, { once: true })
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('webhook configuration', () => {
  it('resolves an endpoint with private defaults', () => {
    const config = resolveServerWebhookConfig({}, {
      DSH_NOTIFICATION_WEBHOOK_URL: 'https://hooks.example.test/dsh?channel=ops',
    })

    expect(config.endpoint).toBe('https://hooks.example.test/dsh?channel=ops')
    expect([...config.reasons]).toEqual(['completed', 'error'])
    expect(config).toMatchObject({
      includeSessionId: false,
      includeBody: false,
      includeTools: false,
    })
  })

  it('allows loopback HTTP but fails closed elsewhere', () => {
    expect(resolveServerWebhookConfig({}, {
      DSH_NOTIFICATION_WEBHOOK_URL: 'http://127.0.0.1:3000/hook',
    }).endpoint).toBe('http://127.0.0.1:3000/hook')

    expect(() => resolveServerWebhookConfig({}, {
      DSH_NOTIFICATION_WEBHOOK_URL: 'http://hooks.example.test/hook',
    })).toThrow(/https/)
    expect(() => resolveServerWebhookConfig({}, {
      DSH_NOTIFICATION_WEBHOOK_URL: 'https://token@hooks.example.test/hook',
    })).toThrow(/URL credentials/)
  })
})

describe('turn-ended payload', () => {
  it('omits sensitive fields by default and includes only explicit opt-ins', () => {
    const input = {
      sessionId: 'session-private',
      eventTime: Date.parse('2026-08-13T12:34:56.789Z'),
      turn: 2,
      reason: 'error',
      body: 'private reply',
      tools: ['bash', 'view_image'],
    }
    const privateMessage = createTurnEndedWebhookMessage(input, resolved())
    expect(privateMessage.data).toEqual({ turn: 2, reason: 'error' })
    expect(JSON.stringify(privateMessage)).not.toMatch(/session-private|private reply|bash|view_image/)

    const detailed = createTurnEndedWebhookMessage(input, resolved({
      includeSessionId: true,
      includeBody: true,
      includeTools: true,
    }))
    expect(detailed.data).toEqual({
      sessionId: 'session-private',
      turn: 2,
      reason: 'error',
      body: 'private reply',
      tools: ['bash', 'view_image'],
    })

    const bounded = createTurnEndedWebhookMessage({
      ...input,
      tools: ['x'.repeat(200), ...Array.from({ length: 40 }, (_, index) => `tool-${index}`)],
    }, resolved({ includeTools: true }))
    expect(bounded.data.tools).toHaveLength(32)
    expect(bounded.data.tools?.[0]).toBe('x'.repeat(63) + '…')
  })
})

describe('WebhookDispatcher', () => {
  it('signs a fixed Standard Webhooks fixture', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_786_624_496_000)
    const request: { body?: string; headers?: Headers } = {}
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
      request.body = String(init?.body)
      request.headers = new Headers(init?.headers)
      return new Response(null, { status: 204 })
    }) as typeof globalThis.fetch
    const dispatcher = new WebhookDispatcher(resolved(), { warn: vi.fn() }, secret(SECRET), fetchMock)
    const fixed = {
      id: 'msg_00000000-0000-4000-8000-000000000000',
      type: 'dsh.turn.ended',
      timestamp: '2026-08-13T12:34:56.789Z',
      data: { turn: 3, reason: 'completed' },
    } as ReturnType<typeof createTurnEndedWebhookMessage>

    dispatcher.enqueue(fixed)
    await vi.waitFor(() => { expect(fetchMock).toHaveBeenCalledOnce() })
    await dispatcher.close()

    expect(request.body).toBe('{"id":"msg_00000000-0000-4000-8000-000000000000","type":"dsh.turn.ended","timestamp":"2026-08-13T12:34:56.789Z","data":{"turn":3,"reason":"completed"}}')
    expect(request.headers?.get('webhook-id')).toBe(fixed.id)
    expect(request.headers?.get('webhook-timestamp')).toBe('1786624496')
    expect(request.headers?.get('webhook-signature')).toBe('v1,O2/InmwY6xNNFQOj1wUtoYE9NlCzakUlaVRN1REgvdU=')
  })

  it('retries once with stable bytes and a freshly resolved secret', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_786_624_496_000)
    const requests: Array<{ body: string; headers: Headers; redirect?: RequestRedirect }> = []
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
      requests.push({
        body: String(init?.body),
        headers: new Headers(init?.headers),
        ...init?.redirect === undefined ? {} : { redirect: init.redirect },
      })
      return new Response(null, { status: 500 })
    }) as typeof globalThis.fetch
    const logger = { warn: vi.fn() }
    const resolveSecret = vi.fn()
      .mockResolvedValueOnce(SECRET)
      .mockResolvedValueOnce(SECOND_SECRET)
    const dispatcher = new WebhookDispatcher(resolved(), logger, resolveSecret, fetchMock)

    const sent = message()
    expect(dispatcher.enqueue(sent)).toBe(true)
    await vi.waitFor(() => { expect(requests).toHaveLength(2) }, { timeout: 2_000 })
    await vi.waitFor(() => {
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('failed after 2 attempt'))
    })
    await dispatcher.close()

    expect(requests[0]?.body).toBe(requests[1]?.body)
    expect(requests[0]?.redirect).toBe('manual')
    expect(requests.map(request => request.headers.get('webhook-id'))).toEqual([sent.id, sent.id])
    expect(requests[0]?.headers.get('webhook-signature'))
      .not.toBe(requests[1]?.headers.get('webhook-signature'))
    expect(resolveSecret).toHaveBeenCalledTimes(2)
  })

  it.each([302, 429])('does not retry HTTP %i', async (status) => {
    const fetchMock = vi.fn((_input: URL | RequestInfo, init?: RequestInit) => {
      expect(init?.redirect).toBe('manual')
      return Promise.resolve(new Response(null, {
        status,
        ...status === 302 ? { headers: { location: 'https://other.example.test' } } : {},
      }))
    }) as typeof globalThis.fetch
    const logger = { warn: vi.fn() }
    const dispatcher = new WebhookDispatcher(resolved(), logger, secret(SECRET), fetchMock)

    dispatcher.enqueue(message())
    await vi.waitFor(() => { expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`HTTP ${status}`)) })
    await dispatcher.close()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each([
    ['missing', undefined],
    ['invalid', 'whsec_YQ=='],
  ] as const)('does not send with a %s signing secret', async (_label, value) => {
    const fetchMock = vi.fn() as unknown as typeof globalThis.fetch
    const logger = { warn: vi.fn() }
    const dispatcher = new WebhookDispatcher(resolved(), logger, secret(value), fetchMock)

    dispatcher.enqueue(message())
    await vi.waitFor(() => { expect(logger.warn).toHaveBeenCalledOnce() })
    await dispatcher.close()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('finishes disposal when credential lookup ignores abort', async () => {
    const resolveSecret = vi.fn(() => new Promise<string>(() => {}))
    const fetchMock = vi.fn() as unknown as typeof globalThis.fetch
    const dispatcher = new WebhookDispatcher(resolved(), { warn: vi.fn() }, resolveSecret, fetchMock)

    dispatcher.enqueue(message())
    await vi.waitFor(() => { expect(resolveSecret).toHaveBeenCalledOnce() })
    const closed = await Promise.race([
      dispatcher.close().then(() => true),
      new Promise<false>(resolve => setTimeout(() => { resolve(false) }, 100)),
    ])
    expect(closed).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(dispatcher.enqueue(message())).toBe(false)
  })

  it('bounds pending work and drops the newest event', async () => {
    const fetchMock = vi.fn(waitForAbort) as typeof globalThis.fetch
    const logger = { warn: vi.fn() }
    const dispatcher = new WebhookDispatcher(resolved(), logger, secret(SECRET), fetchMock)

    const oversized = createTurnEndedWebhookMessage({
      sessionId: 'session-large', eventTime: Date.now(), turn: 1,
      reason: 'completed', body: 'x'.repeat(20_000), tools: [],
    }, resolved({ includeBody: true }))
    expect(() => dispatcher.enqueue(oversized)).toThrow(/payload exceeds/)

    expect(dispatcher.enqueue(message())).toBe(true)
    for (let index = 0; index < 99; index++) {
      expect(dispatcher.enqueue(message())).toBe(true)
    }
    const dropped = message()
    expect(dispatcher.enqueue(dropped)).toBe(false)
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`queue full; dropped event ${dropped.id}`))
    await dispatcher.close()
  })
})
