/**
 * dsh-notification host plugin: registers the `notification` session
 * projection, a bounded summary of each session's last completed turn. The
 * projection seam delivers it to the browser and can dispatch Host webhooks.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { ResolvedConfig } from './types.ts';
import { type ServerWebhookConfig } from './webhook.ts';
export type { ServerWebhookConfig } from './webhook.ts';
/** Cordis plugin name (the Loader entry and client bundle id). */
export declare const name = "dsh-notification";
/** Services required before load: the projection registry. */
export declare const inject: string[];
export interface Config {
    maxBodyChars?: number;
    webhook?: ServerWebhookConfig;
}
export declare const Config: z<Config, ResolvedConfig>;
/**
 * Register the `notification` projection unit; the registration is an effect
 * on this plugin's fiber, so unloading removes the key.
 * @param ctx - host cordis context.
 * @param config - validated plugin configuration (schema defaults applied).
 */
export declare function apply(ctx: Context, config?: Config): void;
