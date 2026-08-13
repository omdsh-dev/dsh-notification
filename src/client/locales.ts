/**
 * `notification` locale namespace: the settings-section copy and the desktop
 * notification titles/bodies. Chinese is the product copy; English mirrors it.
 */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'nav': '通知',
  'settings.title': '任务完成通知',
  'settings.subtitle': '当 DSH 完成一次操作时，通过浏览器系统通知提醒你；可以用关键词规则精确控制哪些消息需要提醒。',
  'settings.enabled': '启用通知',
  'settings.enabledDesc': '关闭后不会弹出任何通知，规则与偏好设置仍会保留。',
  'settings.permission.title': '浏览器权限',
  'settings.permission.desc': '通知需要浏览器授权。点击下方按钮授权，然后发送一条测试通知确认生效。',
  'settings.permission.granted': '已授权',
  'settings.permission.denied': '已拒绝（请在浏览器地址栏的站点设置中重新开启）',
  'settings.permission.default': '未授权',
  'settings.permission.request': '请求通知权限',
  'settings.permission.test': '发送测试通知',
  'settings.when.title': '通知时机',
  'settings.when.subtitle': '选择哪些结束状态触发通知。',
  'settings.when.completed': '正常完成',
  'settings.when.error': '出错',
  'settings.when.aborted': '被中止',
  'settings.when.blocked': '被阻塞',
  'settings.when.maxTokens': '达到 Token 上限',
  'settings.rules.title': '关键词规则',
  'settings.rules.subtitle': '规则匹配该轮回复文本与调用过的工具名。包含规则：命中任一才通知；排除规则：命中即不通知。',
  'settings.rules.empty': '暂无规则，所有已启用的完成状态都会通知。',
  'settings.rules.add': '添加规则',
  'settings.rules.save': '保存规则',
  'settings.rules.mode.include': '包含',
  'settings.rules.mode.exclude': '排除',
  'settings.rules.patternPlaceholder': '关键词或正则表达式',
  'settings.rules.regex': '正则',
  'settings.rules.case': '区分大小写',
  'settings.rules.remove': '删除规则',
  'settings.rules.invalid': '规则模式不能为空',
  'settings.rules.invalidRegex': '无效的正则表达式',
  'settings.rules.unsaved': '规则有未保存的修改',
  'settings.rules.saveHint': '先填写规则模式，再点保存',
  'settings.advanced.title': '高级',
  'settings.advanced.requireInteraction': '需要手动关闭',
  'settings.advanced.requireInteractionDesc': '通知保持显示，直到你手动关闭（适合重要任务）。',
  'settings.advanced.backgroundOnly': '仅在任务不在眼前时通知',
  'settings.advanced.backgroundOnlyDesc': '当前会话正在眼前时不提醒；页面在后台，或你正在查看其他会话、其他工作区时仍会提醒。',
  'notify.titleCompleted': 'DSH 已完成任务',
  'notify.titleError': 'DSH 出错了',
  'notify.titleAborted': 'DSH 已中止',
  'notify.titleBlocked': 'DSH 需要处理',
  'notify.titleMaxTokens': 'DSH 达到 Token 上限',
  'notify.emptyBody': '任务已完成',
  'notify.testTitle': 'DSH 通知测试',
  'notify.testBody': '如果你看到这条通知，说明通知已配置成功。',
} satisfies Record<string, string>

/** The `notification` namespace key union. */
export type NotificationKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'nav': 'Notifications',
  'settings.title': 'Task completion notifications',
  'settings.subtitle': 'Get a browser notification when DSH finishes an operation, with keyword rules to control exactly which messages notify.',
  'settings.enabled': 'Enable notifications',
  'settings.enabledDesc': 'Turning this off stops every notification; rules and preferences are kept.',
  'settings.permission.title': 'Browser permission',
  'settings.permission.desc': 'Notifications need browser permission. Grant it below, then send a test notification to confirm it works.',
  'settings.permission.granted': 'Granted',
  'settings.permission.denied': 'Denied (re-enable in the browser\'s site settings)',
  'settings.permission.default': 'Not granted',
  'settings.permission.request': 'Request permission',
  'settings.permission.test': 'Send test notification',
  'settings.when.title': 'When to notify',
  'settings.when.subtitle': 'Choose which end states trigger a notification.',
  'settings.when.completed': 'Completed',
  'settings.when.error': 'Failed',
  'settings.when.aborted': 'Aborted',
  'settings.when.blocked': 'Blocked',
  'settings.when.maxTokens': 'Hit token limit',
  'settings.rules.title': 'Keyword rules',
  'settings.rules.subtitle': 'Rules match the turn\'s reply text and called tool names. Include rules: notify only if one matches. Exclude rules: suppress on match.',
  'settings.rules.empty': 'No rules yet — every enabled end state notifies.',
  'settings.rules.add': 'Add rule',
  'settings.rules.save': 'Save rules',
  'settings.rules.mode.include': 'Include',
  'settings.rules.mode.exclude': 'Exclude',
  'settings.rules.patternPlaceholder': 'Keyword or regular expression',
  'settings.rules.regex': 'Regex',
  'settings.rules.case': 'Case sensitive',
  'settings.rules.remove': 'Remove rule',
  'settings.rules.invalid': 'Rule pattern must not be empty',
  'settings.rules.invalidRegex': 'Invalid regular expression',
  'settings.rules.unsaved': 'Rules have unsaved changes',
  'settings.rules.saveHint': 'Fill in the rule pattern first, then save',
  'settings.advanced.title': 'Advanced',
  'settings.advanced.requireInteraction': 'Require manual dismiss',
  'settings.advanced.requireInteractionDesc': 'The notification stays until you dismiss it (for important tasks).',
  'settings.advanced.backgroundOnly': 'Only notify when the task is out of view',
  'settings.advanced.backgroundOnlyDesc': 'Suppress notifications only for the session currently in view; still notify in the background or while viewing another session or workspace.',
  'notify.titleCompleted': 'DSH finished',
  'notify.titleError': 'DSH failed',
  'notify.titleAborted': 'DSH aborted',
  'notify.titleBlocked': 'DSH needs attention',
  'notify.titleMaxTokens': 'DSH hit the token limit',
  'notify.emptyBody': 'The task is done',
  'notify.testTitle': 'DSH notification test',
  'notify.testBody': 'If you can see this notification, notifications are configured correctly.',
} satisfies Record<NotificationKey, string>

/** Locale namespace id registered under ctx.locale. */
export const NS = 'notification'

/**
 * Fill one dictionary template's `{name}`-style placeholders.
 * @param template - dictionary text.
 * @param params - placeholder values; absent params replace nothing.
 * @returns the filled text.
 */
export function fmt(template: string, params?: Record<string, string>): string {
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => params[key] ?? whole)
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The notification settings copy and titles. */
    [NS]: NotificationKey
  }
}
