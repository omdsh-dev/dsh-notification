/**
 * The client-persisted settings: defaults (completed + error on, background-only
 * on by default so watching the page is not interrupted) and the v2→v3
 * migration that forces `backgroundOnly` to the current default.
 */
import { describe, expect, it } from 'vitest'
import { V2_PERSIST_KEY, defaultNotificationSettings, migrateV2Settings, type SettingsStorage } from '../src/client/store.ts'

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
