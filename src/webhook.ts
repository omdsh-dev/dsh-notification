/** Host webhook delivery for completed DSH turns. */
import { createHmac, randomUUID } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'
import type { NotificationReason } from './contract.ts'

const WEBHOOK_EVENT_TYPE = 'dsh.turn.ended'
const DEFAULT_WEBHOOK_URL_ENV = 'DSH_NOTIFICATION_WEBHOOK_URL'
export const DEFAULT_WEBHOOK_REASONS: readonly NotificationReason[] = ['completed', 'error']

const REQUEST_TIMEOUT_MS = 15_000
const RETRY_DELAY_MS = 1_000
const MAX_ATTEMPTS = 2
const MAX_PENDING = 100
const MAX_PAYLOAD_BYTES = 16_384
const MAX_TOOL_NAMES = 32
const MAX_TOOL_NAME_CHARS = 64

export interface ServerWebhookConfig {
  enabled?: boolean
  reasons?: NotificationReason[]
  includeSessionId?: boolean
  includeBody?: boolean
  includeTools?: boolean
}

interface ResolvedServerWebhookConfig {
  readonly endpoint: string
  readonly reasons: ReadonlySet<NotificationReason>
  readonly includeSessionId: boolean
  readonly includeBody: boolean
  readonly includeTools: boolean
}

function decodeSecret(value: string): Uint8Array {
  if (!value.startsWith('whsec_')) {
    throw new Error('dsh-notification webhook: signing secret must start with "whsec_"')
  }
  const encoded = value.slice(6)
  const decoded = Buffer.from(encoded, 'base64')
  if (decoded.toString('base64') !== encoded || decoded.length < 24 || decoded.length > 64) {
    throw new Error('dsh-notification webhook: signing secret must contain Base64 for 24 to 64 bytes')
  }
  return decoded
}

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

function resolveEndpoint(raw: string): string {
  let endpoint: URL
  try {
    endpoint = new URL(raw)
  } catch {
    throw new Error('dsh-notification webhook: endpoint is not a valid URL')
  }
  if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && isLoopback(endpoint.hostname))) {
    throw new Error('dsh-notification webhook: endpoint must use https: (http: is allowed only for loopback)')
  }
  if (endpoint.username !== '' || endpoint.password !== '') {
    throw new Error('dsh-notification webhook: endpoint must not contain URL credentials')
  }
  if (endpoint.hash !== '') {
    throw new Error('dsh-notification webhook: endpoint must not contain a fragment')
  }
  return endpoint.href
}

export function resolveServerWebhookConfig(
  input: ServerWebhookConfig,
  env: Readonly<Record<string, string | undefined>> = process.env,
): ResolvedServerWebhookConfig {
  const endpointValue = env[DEFAULT_WEBHOOK_URL_ENV]
  if (!endpointValue) {
    throw new Error(`dsh-notification webhook: ${DEFAULT_WEBHOOK_URL_ENV} is not set`)
  }
  const reasons = input.reasons ?? [...DEFAULT_WEBHOOK_REASONS]
  if (reasons.length === 0) throw new Error('dsh-notification webhook: reasons must not be empty')
  return {
    endpoint: resolveEndpoint(endpointValue),
    reasons: new Set(reasons),
    includeSessionId: input.includeSessionId ?? false,
    includeBody: input.includeBody ?? false,
    includeTools: input.includeTools ?? false,
  }
}

interface WebhookTurnInput {
  readonly sessionId: string
  readonly eventTime: number
  readonly turn: number
  readonly reason: string
  readonly body: string
  readonly tools: readonly string[]
}

interface TurnEndedWebhookData {
  sessionId?: string
  turn: number
  reason: string
  body?: string
  tools?: readonly string[]
}

interface TurnEndedWebhookMessage {
  readonly id: string
  readonly type: typeof WEBHOOK_EVENT_TYPE
  readonly timestamp: string
  readonly data: TurnEndedWebhookData
}

export function createTurnEndedWebhookMessage(
  input: WebhookTurnInput,
  config: Pick<ResolvedServerWebhookConfig, 'includeSessionId' | 'includeBody' | 'includeTools'>,
): TurnEndedWebhookMessage {
  const id = `msg_${randomUUID()}`
  const timestamp = new Date(input.eventTime)
  if (!Number.isFinite(timestamp.valueOf())) {
    throw new Error('dsh-notification webhook: turn/end time is invalid')
  }
  const data: TurnEndedWebhookData = { turn: input.turn, reason: input.reason }
  if (config.includeSessionId) data.sessionId = input.sessionId
  if (config.includeBody) data.body = input.body
  if (config.includeTools) {
    data.tools = input.tools.slice(0, MAX_TOOL_NAMES).map((name) => {
      if (name.length <= MAX_TOOL_NAME_CHARS) return name
      return name.slice(0, MAX_TOOL_NAME_CHARS - 1) + '…'
    })
  }
  return { id, type: WEBHOOK_EVENT_TYPE, timestamp: timestamp.toISOString(), data }
}

function serialize(message: TurnEndedWebhookMessage): string {
  const body = JSON.stringify(message)
  if (Buffer.byteLength(body, 'utf8') > MAX_PAYLOAD_BYTES) {
    throw new Error(`dsh-notification webhook: payload exceeds ${MAX_PAYLOAD_BYTES} bytes`)
  }
  return body
}

function signature(secret: Uint8Array, id: string, timestamp: string, body: string): string {
  return `v1,${createHmac('sha256', secret).update(`${id}.${timestamp}.${body}`, 'utf8').digest('base64')}`
}

interface PendingDelivery {
  readonly id: string
  readonly body: string
}

type AttemptResult =
  | { readonly kind: 'success' }
  | { readonly kind: 'stopped' }
  | { readonly kind: 'failure'; readonly retryable: boolean; readonly detail: string }

function retryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status >= 500
}

function untilAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const aborted = (): void => { reject(signal.reason) }
    void operation.then(
      (value) => {
        signal.removeEventListener('abort', aborted)
        resolve(value)
      },
      (error) => {
        signal.removeEventListener('abort', aborted)
        reject(error)
      },
    )
    if (signal.aborted) aborted()
    else signal.addEventListener('abort', aborted, { once: true })
  })
}

interface WebhookLogger {
  warn(message: string): void
}

type ResolveSecret = () => Promise<string | undefined>

/** Bounded, best-effort delivery queue. */
export class WebhookDispatcher {
  private readonly lifecycle = new AbortController()
  private accepting = true
  private pending = 0
  private tail = Promise.resolve()

  constructor(
    private readonly config: ResolvedServerWebhookConfig,
    private readonly logger: WebhookLogger,
    private readonly resolveSecret: ResolveSecret,
    private readonly fetch: typeof globalThis.fetch = globalThis.fetch.bind(globalThis),
  ) {}

  enqueue(message: TurnEndedWebhookMessage): boolean {
    if (!this.accepting) return false
    if (this.pending >= MAX_PENDING) {
      this.logger.warn(`dsh-notification webhook: queue full; dropped event ${message.id}`)
      return false
    }
    const delivery = { id: message.id, body: serialize(message) }
    this.pending++
    this.tail = this.tail
      .then(() => this.deliver(delivery))
      .catch(() => this.logger.warn(`dsh-notification webhook: event ${delivery.id} failed after an internal error`))
      .finally(() => { this.pending-- })
    return true
  }

  async close(): Promise<void> {
    if (this.accepting) {
      this.accepting = false
      this.lifecycle.abort(new Error('dsh-notification webhook disposed'))
    }
    await this.tail
  }

  private async deliver(delivery: PendingDelivery): Promise<void> {
    if (this.lifecycle.signal.aborted) return
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const result = await this.attempt(delivery)
      if (result.kind === 'success' || result.kind === 'stopped') return
      if (!result.retryable || attempt === MAX_ATTEMPTS) {
        this.logger.warn(
          `dsh-notification webhook: event ${delivery.id} failed after ${attempt} attempt(s) (${result.detail})`,
        )
        return
      }
      try {
        await sleep(RETRY_DELAY_MS, undefined, { signal: this.lifecycle.signal })
      } catch {
        if (this.lifecycle.signal.aborted) return
        throw new Error('webhook retry timer failed')
      }
    }
  }

  private async attempt(delivery: PendingDelivery): Promise<AttemptResult> {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    const signal = AbortSignal.any([this.lifecycle.signal, timeout])

    let rawSecret: string | undefined
    try {
      rawSecret = await untilAbort(this.resolveSecret(), signal)
    } catch {
      if (this.lifecycle.signal.aborted) return { kind: 'stopped' }
      return { kind: 'failure', retryable: true, detail: timeout.aborted ? 'timeout' : 'credential lookup failed' }
    }
    if (rawSecret === undefined) {
      return { kind: 'failure', retryable: false, detail: 'signing secret is not configured' }
    }
    let secret: Uint8Array
    try {
      secret = decodeSecret(rawSecret)
    } catch {
      return { kind: 'failure', retryable: false, detail: 'signing secret is invalid' }
    }

    const attemptTimestamp = Math.floor(Date.now() / 1_000).toString()
    try {
      const response = await untilAbort(this.fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'dsh-notification',
          'webhook-id': delivery.id,
          'webhook-timestamp': attemptTimestamp,
          'webhook-signature': signature(secret, delivery.id, attemptTimestamp, delivery.body),
        },
        body: delivery.body,
        redirect: 'manual',
        signal,
      }), signal)
      try {
        void response.body?.cancel().catch(() => {})
      } catch {
        // Response disposal is best effort.
      }
      if (response.status >= 200 && response.status < 300) return { kind: 'success' }
      return {
        kind: 'failure',
        retryable: retryableStatus(response.status),
        detail: `HTTP ${response.status}`,
      }
    } catch {
      if (this.lifecycle.signal.aborted) return { kind: 'stopped' }
      return { kind: 'failure', retryable: true, detail: timeout.aborted ? 'timeout' : 'network error' }
    }
  }
}
