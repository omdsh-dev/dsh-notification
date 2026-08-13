/**
 * `notification` locale namespace: the settings-section copy and the desktop
 * notification titles/bodies. Chinese is the product copy; English mirrors it.
 */
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: {
    nav: string;
    'settings.title': string;
    'settings.subtitle': string;
    'settings.enabled': string;
    'settings.enabledDesc': string;
    'settings.permission.title': string;
    'settings.permission.desc': string;
    'settings.permission.granted': string;
    'settings.permission.denied': string;
    'settings.permission.default': string;
    'settings.permission.request': string;
    'settings.permission.test': string;
    'settings.when.title': string;
    'settings.when.subtitle': string;
    'settings.when.completed': string;
    'settings.when.error': string;
    'settings.when.aborted': string;
    'settings.when.blocked': string;
    'settings.when.maxTokens': string;
    'settings.rules.title': string;
    'settings.rules.subtitle': string;
    'settings.rules.empty': string;
    'settings.rules.add': string;
    'settings.rules.save': string;
    'settings.rules.mode.include': string;
    'settings.rules.mode.exclude': string;
    'settings.rules.patternPlaceholder': string;
    'settings.rules.regex': string;
    'settings.rules.case': string;
    'settings.rules.remove': string;
    'settings.rules.invalid': string;
    'settings.rules.invalidRegex': string;
    'settings.rules.unsaved': string;
    'settings.rules.saveHint': string;
    'settings.advanced.title': string;
    'settings.advanced.requireInteraction': string;
    'settings.advanced.requireInteractionDesc': string;
    'settings.advanced.backgroundOnly': string;
    'settings.advanced.backgroundOnlyDesc': string;
    'notify.titleCompleted': string;
    'notify.titleError': string;
    'notify.titleAborted': string;
    'notify.titleBlocked': string;
    'notify.titleMaxTokens': string;
    'notify.emptyBody': string;
    'notify.testTitle': string;
    'notify.testBody': string;
};
/** The `notification` namespace key union. */
export type NotificationKey = keyof typeof zh;
/** English dictionary, checked complete against the zh key set. */
export declare const en: {
    nav: string;
    'settings.title': string;
    'settings.subtitle': string;
    'settings.enabled': string;
    'settings.enabledDesc': string;
    'settings.permission.title': string;
    'settings.permission.desc': string;
    'settings.permission.granted': string;
    'settings.permission.denied': string;
    'settings.permission.default': string;
    'settings.permission.request': string;
    'settings.permission.test': string;
    'settings.when.title': string;
    'settings.when.subtitle': string;
    'settings.when.completed': string;
    'settings.when.error': string;
    'settings.when.aborted': string;
    'settings.when.blocked': string;
    'settings.when.maxTokens': string;
    'settings.rules.title': string;
    'settings.rules.subtitle': string;
    'settings.rules.empty': string;
    'settings.rules.add': string;
    'settings.rules.save': string;
    'settings.rules.mode.include': string;
    'settings.rules.mode.exclude': string;
    'settings.rules.patternPlaceholder': string;
    'settings.rules.regex': string;
    'settings.rules.case': string;
    'settings.rules.remove': string;
    'settings.rules.invalid': string;
    'settings.rules.invalidRegex': string;
    'settings.rules.unsaved': string;
    'settings.rules.saveHint': string;
    'settings.advanced.title': string;
    'settings.advanced.requireInteraction': string;
    'settings.advanced.requireInteractionDesc': string;
    'settings.advanced.backgroundOnly': string;
    'settings.advanced.backgroundOnlyDesc': string;
    'notify.titleCompleted': string;
    'notify.titleError': string;
    'notify.titleAborted': string;
    'notify.titleBlocked': string;
    'notify.titleMaxTokens': string;
    'notify.emptyBody': string;
    'notify.testTitle': string;
    'notify.testBody': string;
};
/** Locale namespace id registered under ctx.locale. */
export declare const NS = "notification";
/**
 * Fill one dictionary template's `{name}`-style placeholders.
 * @param template - dictionary text.
 * @param params - placeholder values; absent params replace nothing.
 * @returns the filled text.
 */
export declare function fmt(template: string, params?: Record<string, string>): string;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The notification settings copy and titles. */
        [NS]: NotificationKey;
    }
}
