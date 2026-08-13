/**
 * Invariant companion: registers the package with the real InvariantRegistry
 * and withdraws on disposal (the companion's "no runtime invariant" reason is
 * documented in its source; the registry relationship is what this proves).
 */
import { Context } from '@deepseek-ai/cordis'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { describe, expect, it } from 'vitest'
import * as companion from '../src/invariant.ts'

describe('dsh-notification invariant companion', () => {
  it('registers the package and withdraws the registration with its fiber', async () => {
    const ctx = new Context()
    const registryFiber = ctx.plugin(InvariantRegistry)
    await registryFiber
    const fiber = ctx.plugin({ inject: companion.inject, apply: companion.apply })
    await fiber
    const registry = ctx.get('invariants') as InvariantRegistry
    // A second registration of the same package proves the first is live.
    expect(() => registry.register('dsh-notification', () => {})).toThrow(/already registered/)
    await fiber.dispose()
    // After withdrawal the package name is free again.
    expect(() => registry.register('dsh-notification', () => {})).not.toThrow()
    await registryFiber.dispose()
  })
})
