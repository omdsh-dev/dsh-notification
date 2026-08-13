/**
 * Package-owned invariant companion for `dsh-notification`.
 * @module dsh-notification/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = 'dsh-notification'

/** Cordis companion plugin name. */
export const name = 'dsh-notification-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the plugin owns no mutable cross-plugin state. The
 * `notification` projection is a pure fold (registry-owned registration, and
 * the projection seam owns delivery); the client settings live in a private
 * snapshot store. All are proven by the composition and fold specs rather than
 * by an event-stream relationship.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
