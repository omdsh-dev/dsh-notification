/**
 * dsh-notification host plugin: registers the `notification` session
 * projection, a bounded summary of each session's last completed turn. The
 * projection seam delivers it to the browser for every session without any
 * harness change. Completion detection, the settings decision, and the browser
 * Notification call all live in the client half (`./client`).
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/** Cordis plugin name (the Loader entry and client bundle id). */
export declare const name = "dsh-notification";
/** Services required before load: the projection registry. */
export declare const inject: string[];
/** Host plugin configuration, validated at load by the Loader. */
export interface Config {
    /** Character budget for the projection body; longer replies are truncated host-side. */
    maxBodyChars: number;
}
/**
 * Configuration schema: deployment-varying bounds stay tunable from cordis.yml.
 * The inferred schema type keeps the callable form accepting partial input, so
 * `Config({})` yields the defaults (what the Loader does for compositions).
 */
export declare const Config: z<Schemastery.ObjectS<{
    maxBodyChars: z<number, number>;
}>, Schemastery.ObjectT<{
    maxBodyChars: z<number, number>;
}>>;
/**
 * Register the `notification` projection unit; the registration is an effect
 * on this plugin's fiber, so unloading removes the key.
 * @param ctx - host cordis context.
 * @param config - validated plugin configuration (schema defaults applied).
 */
export declare function apply(ctx: Context, config?: Config): void;
