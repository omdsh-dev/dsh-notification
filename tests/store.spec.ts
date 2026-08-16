/**
 * The client-persisted settings: defaults (completed + error on, background-only
 * on by default so watching the page is not interrupted) and the v2→v3
 * migration that forces `backgroundOnly` to the current default.
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

describe('migrateV3Settings', () => {
  it('preserves old settings and adds pending defaults', () => {
    const storage = fakeStorage({ [V3_PERSIST_KEY]: JSON.stringify({ enabled: false, notifyError: false }) })
    expect(migrateV3Settings(storage)).toMatchObject({
      enabled: false,
      notifyError: false,
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
