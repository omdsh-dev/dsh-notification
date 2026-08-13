/**
 * dsh-notification host plugin: registers the `notification` session
 * projection, a bounded summary of each session's last completed turn. The
 * projection seam delivers it to the browser and can dispatch Host webhooks.
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
// Type-only: brings the `ctx.sessionProjections` Context merge into this program.
import type {} from '@deepseek-ai/dsh-session-projection'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { NotificationReason } from './contract.ts'
import { notificationProjection } from './projection.ts'
import type { ResolvedConfig } from './types.ts'
import {
  DEFAULT_WEBHOOK_REASONS,
  WebhookDispatcher,
  createTurnEndedWebhookMessage,
  resolveServerWebhookConfig,
  type ServerWebhookConfig,
} from './webhook.ts'

export type { ServerWebhookConfig } from './webhook.ts'

/** Cordis plugin name (the Loader entry and client bundle id). */
export const name = 'dsh-notification'

/** Services required before load: the projection registry. */
export const inject = ['sessionProjections']

const WEBHOOK_SECRET_REF = credentialRef('DSH_NOTIFICATION_WEBHOOK_SECRET')

export interface Config {
  maxBodyChars?: number
  webhook?: ServerWebhookConfig
}

export const Config = z.object({
  maxBodyChars: z.natural().min(1).default(400),
  webhook: z.object({
    enabled: z.boolean().default(false)
      .description('Send turn-end webhooks from the Host.'),
    reasons: z.array(z.union([
      'completed', 'error', 'aborted', 'blocked', 'max-tokens',
    ] as const)).min(1).default([...DEFAULT_WEBHOOK_REASONS]),
    includeSessionId: z.boolean().default(false)
      .description('Send the DSH session identifier off-device.'),
    includeBody: z.boolean().default(false)
      .description('Send assistant text off-device.'),
    includeTools: z.boolean().default(false)
      .description('Send tool names off-device.'),
  }).collapse(),
}) as z<Config, ResolvedConfig>

/**
 * Register the `notification` projection unit; the registration is an effect
 * on this plugin's fiber, so unloading removes the key.
 * @param ctx - host cordis context.
 * @param config - validated plugin configuration (schema defaults applied).
 */
export function apply(ctx: Context, config?: Config): void {
  const resolved = Config(config)
  ctx.sessionProjections.register(notificationProjection(resolved))
  if (resolved.webhook?.enabled !== true) return

  const webhook = resolveServerWebhookConfig(resolved.webhook)
  ctx.inject(['credentials'], (webhookCtx) => {
    const dispatcher = new WebhookDispatcher(
      webhook,
      webhookCtx.logger,
      async () => (await webhookCtx.credentials.resolve(WEBHOOK_SECRET_REF))?.value,
    )
    webhookCtx.effect(() => () => dispatcher.close(), 'dsh-notification: close webhook dispatcher')

    webhookCtx.on('session/event', (session, event) => {
      if (event.type !== 'turn/end') return
      const reason = event.data.reason.kind as NotificationReason
      if (!webhook.reasons.has(reason)) return
      if (session.header.origin === 'subagent') return
      try {
        const snapshot = webhookCtx.sessionProjections.snapshot(session)
        const value = snapshot.values.notification
        if (snapshot.asOfSeq !== event.seq || value?.turn !== event.data.turn) return
        dispatcher.enqueue(createTurnEndedWebhookMessage({
          sessionId: String(session.id),
          eventTime: event.time,
          turn: event.data.turn,
          reason: event.data.reason.kind,
          body: value.body,
          tools: value.tools,
        }, webhook))
      } catch {
        webhookCtx.logger.warn('dsh-notification webhook: could not enqueue a committed turn')
      }
    })
  })
}
