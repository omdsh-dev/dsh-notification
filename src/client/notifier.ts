/**
 * Client-side notification rendering: the pure parts (title/body/gating) split
 * out for unit tests, while the `Notification` construction stays in the thin
 * runner wired by the plugin body.
 */
import type { NotificationReason } from '../contract.ts'

/** The reason title key for one turn-end reason. */
export function titleKey(reason: NotificationReason): 'notify.titleCompleted' | 'notify.titleError' | 'notify.titleAborted' | 'notify.titleBlocked' | 'notify.titleMaxTokens' {
  switch (reason) {
    case 'completed': return 'notify.titleCompleted'
    case 'error': return 'notify.titleError'
    case 'aborted': return 'notify.titleAborted'
    case 'blocked': return 'notify.titleBlocked'
    case 'max-tokens': return 'notify.titleMaxTokens'
  }
}

/** The notification body: the reply snippet, or the empty-body fallback. */
export function bodyText(body: string, emptyBody: string): string {
  const trimmed = body.trim()
  return trimmed === '' ? emptyBody : trimmed
}

/**
 * Whether a completion should surface a desktop notification, given the browser
 * permission, the background-only preference, page visibility, and whether
 * the completed session is the one currently in view.
 */
export function shouldShow(
  permission: NotificationPermission,
  backgroundOnly: boolean,
  documentHidden: boolean,
  completedSessionId?: string,
  currentSessionId?: string,
): boolean {
  if (permission !== 'granted') return false
  if (backgroundOnly && !documentHidden && completedSessionId === currentSessionId) return false
  return true
}

/** The grouping tag: one notification slot per session. */
export function notificationTag(sessionId: string): string {
  return `dsh-notification-${sessionId}`
}

/** The surface this code may show notifications on (absent in insecure contexts). */
export function notificationsApi(): typeof Notification | undefined {
  return typeof Notification === 'undefined' ? undefined : Notification
}
