/**
 * dsh-notification host types: the resolved plugin configuration and the
 * shared wire/settings faces re-exported for the host entry.
 */

export type { NotificationProjectionValue, NotificationReason, NotificationRule, NotificationSettings } from './contract.ts'

/** Resolved plugin configuration (schema defaults applied). */
export interface ResolvedConfig {
  /** Character budget for the projection body; longer replies are truncated host-side. */
  readonly maxBodyChars: number
}
