/**
 * The client-persisted notification settings: one bare snapshot store (localStorage
 * persistence) shared between the settings section and the completion runner.
 * The host knows nothing of these preferences — the client owns them.
 */
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { NotificationSettings } from '../contract.ts'

/** The out-of-the-box preferences. */
export function defaultNotificationSettings(): NotificationSettings {
  return {
    enabled: true,
    notifyCompleted: true,
    notifyError: true,
    notifyAborted: false,
    notifyBlocked: false,
    notifyMaxTokens: false,
    rules: [],
    requireInteraction: false,
    backgroundOnly: true,
  }
}

/** The v2 persist key, whose `backgroundOnly` default (false) predates the current default (true). */
export const V2_PERSIST_KEY = 'dsh-notification.v2'

/** The storage face the migration needs. */
export interface SettingsStorage {
  getItem(key: string): string | null
  removeItem(key: string): void
}

/**
 * One-time migration from the v2 settings shape: keep everything the user
 * saved, but force `backgroundOnly` to the current product default (true).
 * The v2 key is consumed on success, so the migration runs at most once.
 * @param storage - the storage to read/consume (defaults to the global localStorage).
 * @returns the migrated settings, or undefined when there is no v2 state.
 */
export function migrateV2Settings(storage?: SettingsStorage): NotificationSettings | undefined {
  const target = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage)
  if (target === undefined) return undefined
  try {
    const raw = target.getItem(V2_PERSIST_KEY)
    if (raw === null) return undefined
    target.removeItem(V2_PERSIST_KEY)
    const saved = JSON.parse(raw) as Partial<NotificationSettings>
    return { ...defaultNotificationSettings(), ...saved, backgroundOnly: true }
  } catch {
    return undefined
  }
}

/**
 * Create the persisted settings store. The persist key carries a shape
 * version: each bump discards nothing — v2 state migrates into the v3 initial
 * state (see {@link migrateV2Settings}).
 * @returns the bare observable backing both the section and the runner.
 */
export function createNotificationSettingsStore(): SnapshotStore<NotificationSettings> {
  return createSnapshotStore<NotificationSettings>(migrateV2Settings() ?? defaultNotificationSettings(), {
    persist: { name: 'dsh-notification.v3' },
  })
}
