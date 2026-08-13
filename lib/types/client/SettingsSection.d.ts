import type { PropsLocale, PropsRuntime, InjectFace } from '@deepseek-ai/dsh-client-ui-slots';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
import type { NotificationSettings } from '../contract.ts';
/** Injected business face: the live settings store (bound to `useSettings`), the write verb, and the permission/test verbs. */
export interface NotificationSectionInjected {
    hooks: {
        settings: SnapshotStore<NotificationSettings>;
    };
    set: (patch: Partial<NotificationSettings>) => void;
    requestPermission: () => Promise<NotificationPermission>;
    sendTest: () => void;
}
/** Full section props: runtime share + injected face + the locale seat. */
export type NotificationSectionProps = PropsRuntime<'settings.section'> & InjectFace<NotificationSectionInjected> & PropsLocale<'notification'>;
/**
 * Render the section.
 * @param props - runtime share, the bound settings hook, the injected verbs, and `t`.
 * @returns the section element tree.
 */
export declare function NotificationSettingsSection({ useSettings, set, requestPermission, sendTest, t }: NotificationSectionProps): import("react").JSX.Element;
