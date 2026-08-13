/**
 * dsh-notification host plugin: registers the `notification` session
 * projection, a bounded summary of each session's last completed turn. The
 * projection seam delivers it to the browser for every session without any
 * harness change. Completion detection, the settings decision, and the browser
 * Notification call all live in the client half (`./client`).
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
// Type-only: brings the `ctx.sessionProjections` Context merge into this program.
import type {} from '@deepseek-ai/dsh-session-projection'
import { notificationProjection } from './projection.ts'
import type { ResolvedConfig } from './types.ts'

/** Cordis plugin name (the Loader entry and client bundle id). */
export const name = 'dsh-notification'

/** Services required before load: the projection registry. */
export const inject = ['sessionProjections']

/** Host plugin configuration, validated at load by the Loader. */
export interface Config {
  /** Character budget for the projection body; longer replies are truncated host-side. */
  maxBodyChars: number
}

/**
 * Configuration schema: deployment-varying bounds stay tunable from cordis.yml.
 * The inferred schema type keeps the callable form accepting partial input, so
 * `Config({})` yields the defaults (what the Loader does for compositions).
 */
export const Config = z.object({
  maxBodyChars: z.natural().min(1).default(400),
})

/**
 * Register the `notification` projection unit; the registration is an effect
 * on this plugin's fiber, so unloading removes the key.
 * @param ctx - host cordis context.
 * @param config - validated plugin configuration (schema defaults applied).
 */
export function apply(ctx: Context, config?: Config): void {
  const resolved: ResolvedConfig = Config(config ?? {})
  ctx.sessionProjections.register(notificationProjection(resolved))
}
