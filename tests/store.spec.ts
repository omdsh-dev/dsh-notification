/**
 * The client-persisted settings: defaults (completed + error on, approval +
 * question on, background-only on so watching the page is not interrupted),
 * the v2→v3 migration that forces `backgroundOnly` to the current default, and
 * the v3→v4 migration that layers the pending-interaction toggles' defaults.
 */
import { describe, expect, it } from 'vitest'
import { V2_PERSIST_KEY, V3_PERSIST_KEY, defaultNotificationSettings, migrateV2Settings, migrateV3Settings, type SettingsStorage } from '../src/client/store.ts'

function fakeStorage(entries: Record<string, string>): SettingsStorage {
  const store = new Map(Object.entries(entries))
  return {
    getItem: (key) => store.get(key) ?? null,
    removeItem: (key) => { store.delete(key) },
  }
}

describe('defaultNotificationSettings', () => {
  it('notifies on completed + error, background-only on', () => {
    expect(defaultNotificationSettings()).toEqual({
      enabled: true,
      notifyCompleted: true,
      notifyError: true,
      notifyAborted: false,
      notifyBlocked: false,
      notifyMaxTokens: false,
      notifyApproval: true,
      notifyQuestion: true,
      notifyPlanReview: false,
      rules: [],
      requireInteraction: false,
      backgroundOnly: true,
    })
  })
})

describe('migrateV2Settings', () => {
  it('preserves v2 fields and forces backgroundOnly on', () => {
    const storage = fakeStorage({ [V2_PERSIST_KEY]: JSON.stringify({ enabled: false, rules: [], backgroundOnly: false }) })
    const migrated = migrateV2Settings(storage)
    expect(migrated).toMatchObject({ enabled: false, backgroundOnly: true })
    expect(storage.getItem(V2_PERSIST_KEY)).toBeNull()
  })

  it('returns undefined without v2 state', () => {
    expect(migrateV2Settings(fakeStorage({}))).toBeUndefined()
  })
})

describe('migrateV3Settings', () => {
  it('preserves v3 fields and layers the pending-toggle defaults', () => {
    const storage = fakeStorage({ [V3_PERSIST_KEY]: JSON.stringify({ enabled: false, rules: [], notifyCompleted: false }) })
    const migrated = migrateV3Settings(storage)
    expect(migrated).toMatchObject({
      enabled: false,
      notifyCompleted: false,
      notifyApproval: true,
      notifyQuestion: true,
      notifyPlanReview: false,
    })
    expect(storage.getItem(V3_PERSIST_KEY)).toBeNull()
  })

  it('returns undefined without v3 state', () => {
    expect(migrateV3Settings(fakeStorage({}))).toBeUndefined()
  })
})
