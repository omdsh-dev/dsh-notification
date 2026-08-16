/**
 * Client-side notification decision: reason mapping, the include/exclude rule
 * semantics, and the rule subject. Pure and unit-tested; the runner consumes
 * these against the session list's title and the host `notification` projection.
 */
import type { NotificationReason, NotificationRule, NotificationSettings, PendingKind } from '../contract.ts'

/** Map a raw projection reason to a notifiable reason, or undefined for unknown kinds. */
export function asReason(reason: string | undefined): NotificationReason | undefined {
  switch (reason) {
    case 'completed':
    case 'error':
    case 'aborted':
    case 'blocked':
    case 'max-tokens':
      return reason
    default:
      return undefined
  }
}

/** Whether the configured per-outcome switch is on for a reason. */
export function reasonEnabled(settings: NotificationSettings, reason: NotificationReason): boolean {
  switch (reason) {
    case 'completed': return settings.notifyCompleted
    case 'error': return settings.notifyError
    case 'aborted': return settings.notifyAborted
    case 'blocked': return settings.notifyBlocked
    case 'max-tokens': return settings.notifyMaxTokens
  }
}

/** Whether the configured switch is on for a pending interaction. */
export function pendingReasonEnabled(settings: NotificationSettings, kind: PendingKind): boolean {
  switch (kind) {
    case 'approval': return settings.notifyApproval
    case 'question': return settings.notifyQuestion
    case 'plan-review': return settings.notifyPlanReview
  }
}

/** The text rules match against: the session title, the reply text, and the tool names. */
export function ruleSubject(title: string | undefined, body: string, tools: readonly string[]): string {
  const parts: string[] = []
  if (title !== undefined && title.trim() !== '') parts.push(title)
  if (body.trim() !== '') parts.push(body)
  if (tools.length > 0) parts.push(tools.join(' '))
  return parts.join('\n')
}

/** Whether one rule matches its subject. */
export function ruleMatches(rule: NotificationRule, subject: string): boolean {
  if (rule.isRegex) {
    const flags = rule.caseSensitive ? '' : 'i'
    return new RegExp(rule.pattern, flags).test(subject)
  }
  const haystack = rule.caseSensitive ? subject : subject.toLowerCase()
  const needle = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase()
  return haystack.includes(needle)
}

/**
 * Evaluate the include/exclude rules against one subject. Any matching exclude
 * rule suppresses; if at least one include rule exists, at least one must
 * match; otherwise the subject is allowed.
 */
export function rulesAllow(settings: NotificationSettings, subject: string): boolean {
  const active = settings.rules.filter(rule => rule.enabled)
  const includes = active.filter(rule => rule.mode === 'include')
  const excludes = active.filter(rule => rule.mode === 'exclude')
  if (excludes.some(rule => ruleMatches(rule, subject))) return false
  if (includes.length > 0 && !includes.some(rule => ruleMatches(rule, subject))) return false
  return true
}

/** The whole decision for one completed session, free of any browser reads. */
export function shouldNotify(
  settings: NotificationSettings,
  reason: NotificationReason,
  subject: string,
): boolean {
  if (!settings.enabled) return false
  if (!reasonEnabled(settings, reason)) return false
  return rulesAllow(settings, subject)
}
