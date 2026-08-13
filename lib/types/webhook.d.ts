import type { NotificationReason } from './contract.ts';
declare const WEBHOOK_EVENT_TYPE = "dsh.turn.ended";
export declare const DEFAULT_WEBHOOK_REASONS: readonly NotificationReason[];
export interface ServerWebhookConfig {
    enabled?: boolean;
    reasons?: NotificationReason[];
    includeSessionId?: boolean;
    includeBody?: boolean;
    includeTools?: boolean;
}
interface ResolvedServerWebhookConfig {
    readonly endpoint: string;
    readonly reasons: ReadonlySet<NotificationReason>;
    readonly includeSessionId: boolean;
    readonly includeBody: boolean;
    readonly includeTools: boolean;
}
export declare function resolveServerWebhookConfig(input: ServerWebhookConfig, env?: Readonly<Record<string, string | undefined>>): ResolvedServerWebhookConfig;
interface WebhookTurnInput {
    readonly sessionId: string;
    readonly eventTime: number;
    readonly turn: number;
    readonly reason: string;
    readonly body: string;
    readonly tools: readonly string[];
}
interface TurnEndedWebhookData {
    sessionId?: string;
    turn: number;
    reason: string;
    body?: string;
    tools?: readonly string[];
}
interface TurnEndedWebhookMessage {
    readonly id: string;
    readonly type: typeof WEBHOOK_EVENT_TYPE;
    readonly timestamp: string;
    readonly data: TurnEndedWebhookData;
}
export declare function createTurnEndedWebhookMessage(input: WebhookTurnInput, config: Pick<ResolvedServerWebhookConfig, 'includeSessionId' | 'includeBody' | 'includeTools'>): TurnEndedWebhookMessage;
interface WebhookLogger {
    warn(message: string): void;
}
type ResolveSecret = () => Promise<string | undefined>;
/** Bounded, best-effort delivery queue. */
export declare class WebhookDispatcher {
    private readonly config;
    private readonly logger;
    private readonly resolveSecret;
    private readonly fetch;
    private readonly lifecycle;
    private accepting;
    private pending;
    private tail;
    constructor(config: ResolvedServerWebhookConfig, logger: WebhookLogger, resolveSecret: ResolveSecret, fetch?: typeof globalThis.fetch);
    enqueue(message: TurnEndedWebhookMessage): boolean;
    close(): Promise<void>;
    private deliver;
    private attempt;
}
export {};
