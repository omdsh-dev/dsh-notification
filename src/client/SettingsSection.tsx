/**
 * The settings page section for the notification preferences: master switch,
 * browser-permission card (grant + test), per-outcome toggles, the include/
 * exclude keyword-rule editor, and the advanced options. Preferences live in
 * the client-persisted snapshot store; boolean switches are native checkboxes
 * (uncontrolled — they flip instantly and persist on change); the rule list is
 * a local draft persisted as one array on save, so an in-progress
 * (empty-pattern) rule never reaches the store.
 */
import { useState } from 'react'
import type { PropsLocale, PropsRuntime, InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { NotificationRule, NotificationSettings } from '../contract.ts'
import type { NotificationKey } from './locales.ts'
import { notificationsApi } from './notifier.ts'
import { emptyRule, firstRuleError, patchRule, removeRule } from './rules.ts'

/** The per-outcome toggle fields. */
type NotifyField = 'notifyCompleted' | 'notifyError' | 'notifyAborted' | 'notifyBlocked' | 'notifyMaxTokens'

/** Injected business face: the live settings store (bound to `useSettings`), the write verb, and the permission/test verbs. */
export interface NotificationSectionInjected {
  hooks: { settings: SnapshotStore<NotificationSettings> }
  set: (patch: Partial<NotificationSettings>) => void
  requestPermission: () => Promise<NotificationPermission>
  sendTest: () => void
}

/** Full section props: runtime share + injected face + the locale seat. */
export type NotificationSectionProps = PropsRuntime<'settings.section'> & InjectFace<NotificationSectionInjected> & PropsLocale<'notification'>

/** One per-outcome toggle's durable field, copy key, and store default. */
const OUTCOMES: ReadonlyArray<{ field: NotifyField; key: NotificationKey; defaultValue: boolean }> = [
  { field: 'notifyCompleted', key: 'settings.when.completed', defaultValue: true },
  { field: 'notifyError', key: 'settings.when.error', defaultValue: true },
  { field: 'notifyAborted', key: 'settings.when.aborted', defaultValue: false },
  { field: 'notifyBlocked', key: 'settings.when.blocked', defaultValue: false },
  { field: 'notifyMaxTokens', key: 'settings.when.maxTokens', defaultValue: false },
]

/** A single-outcome-toggle patch. */
function notifyPatch(field: NotifyField, checked: boolean): Partial<NotificationSettings> {
  return { [field]: checked } as Partial<NotificationSettings>
}

/** One native-checkbox preference row. */
function Toggle(props: {
  defaultChecked: boolean
  label: string
  desc?: string
  onChange: (checked: boolean) => void
}): JSX.Element {
  return (
    <label className="dsh_notification_toggleRow">
      <input
        type="checkbox"
        className="dsh_notification_checkbox"
        defaultChecked={props.defaultChecked}
        onChange={(event) => { props.onChange(event.target.checked) }}
      />
      <span className="dsh_notification_toggleText">
        <span className="dsh_notification_toggleLabel">{props.label}</span>
        {props.desc === undefined ? null : <span className="dsh_notification_toggleDesc">{props.desc}</span>}
      </span>
    </label>
  )
}

/** One editable include/exclude rule row. */
function RuleRow(props: {
  rule: NotificationRule
  errorKey?: NotificationKey
  autoFocus: boolean
  t: (key: NotificationKey) => string
  onPatch: (patch: Partial<NotificationRule>) => void
  onRemove: () => void
}): JSX.Element {
  const { rule, t } = props
  return (
    <div className="dsh_notification_ruleRow">
      <select
        className="dsh_notification_ruleSelect"
        value={rule.mode}
        aria-label={t('settings.rules.mode.include')}
        onChange={(event) => { props.onPatch({ mode: event.target.value === 'exclude' ? 'exclude' : 'include' }) }}
      >
        <option value="include">{t('settings.rules.mode.include')}</option>
        <option value="exclude">{t('settings.rules.mode.exclude')}</option>
      </select>
      <input
        type="text"
        className="dsh_notification_ruleInput"
        placeholder={t('settings.rules.patternPlaceholder')}
        value={rule.pattern}
        autoFocus={props.autoFocus}
        onChange={(event) => { props.onPatch({ pattern: event.target.value }) }}
      />
      <label className="dsh_notification_ruleCheck">
        <input
          type="checkbox"
          checked={rule.isRegex}
          onChange={(event) => { props.onPatch({ isRegex: event.target.checked }) }}
        />
        {t('settings.rules.regex')}
      </label>
      <label className="dsh_notification_ruleCheck">
        <input
          type="checkbox"
          checked={rule.caseSensitive}
          onChange={(event) => { props.onPatch({ caseSensitive: event.target.checked }) }}
        />
        {t('settings.rules.case')}
      </label>
      <button
        type="button"
        className="dsh_notification_ruleDelete"
        aria-label={t('settings.rules.remove')}
        onClick={props.onRemove}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4.2 3.5h7.6l-.7 9.2a1 1 0 0 1-1 .8H5.9a1 1 0 0 1-1-.8l-.7-9.2Zm.9 1 .6 8h4.6l.6-8H5.1ZM6 1h4v1H6V1Zm-3 2h10v1H3V3Z" fillRule="evenodd" /></svg>
      </button>
      {props.errorKey === undefined ? null : <span className="dsh_notification_error">{t(props.errorKey)}</span>}
    </div>
  )
}

/**
 * Render the section.
 * @param props - runtime share, the bound settings hook, the injected verbs, and `t`.
 * @returns the section element tree.
 */
export function NotificationSettingsSection({ useSettings, set, requestPermission, sendTest, t }: NotificationSectionProps) {
  const settings = useSettings(snapshot => snapshot)
  const [permission, setPermission] = useState<NotificationPermission>(() => notificationsApi()?.permission ?? 'denied')
  const [draft, setDraft] = useState<NotificationRule[] | null>(null)
  const [focusedRuleId, setFocusedRuleId] = useState<string | null>(null)

  const durable = settings?.rules ?? []
  const rules = draft ?? durable
  const dirty = draft !== null
  const error = firstRuleError(rules)

  const edit = (updater: (current: NotificationRule[]) => NotificationRule[]): void => {
    setDraft(updater(draft ?? durable))
  }
  const addRule = (): void => {
    const rule = emptyRule()
    edit(list => [...list, rule])
    setFocusedRuleId(rule.id)
  }
  const saveRules = (): void => {
    if (draft === null) return
    set({ rules: draft })
    setDraft(null)
    setFocusedRuleId(null)
  }
  const onRequestPermission = async (): Promise<void> => {
    setPermission(await requestPermission())
  }

  const permissionText = t(`settings.permission.${permission}`)
  const badgeClass = permission === 'granted'
    ? 'dsh_notification_badgeGranted'
    : permission === 'denied' ? 'dsh_notification_badgeDenied' : 'dsh_notification_badgeDefault'

  return (
    <section className="dsh_notification_section" aria-labelledby="dsh-notification-settings-title">
      <div className="dsh_notification_heading">
        <h2 id="dsh-notification-settings-title" className="dsh_notification_title">{t('settings.title')}</h2>
        <p className="dsh_notification_subtitle">{t('settings.subtitle')}</p>
      </div>

      <div className="dsh_notification_card">
        <Toggle
          defaultChecked={settings?.enabled ?? true}
          label={t('settings.enabled')}
          desc={t('settings.enabledDesc')}
          onChange={(checked) => { set({ enabled: checked }) }}
        />
      </div>

      <div className="dsh_notification_card">
        <div>
          <div className="dsh_notification_cardTitle">{t('settings.permission.title')}</div>
          <div className="dsh_notification_cardDesc">{t('settings.permission.desc')}</div>
        </div>
        <div className="dsh_notification_permissionRow">
          <span className={`dsh_notification_badge ${badgeClass}`}>{permissionText}</span>
          <button type="button" className="dsh_notification_button dsh_notification_buttonGhost" onClick={() => { void onRequestPermission() }}>
            {t('settings.permission.request')}
          </button>
          <button
            type="button"
            className="dsh_notification_button dsh_notification_buttonPrimary"
            disabled={permission !== 'granted'}
            onClick={sendTest}
          >
            {t('settings.permission.test')}
          </button>
        </div>
      </div>

      <div className="dsh_notification_card">
        <div>
          <div className="dsh_notification_cardTitle">{t('settings.when.title')}</div>
          <div className="dsh_notification_cardDesc">{t('settings.when.subtitle')}</div>
        </div>
        <div className="dsh_notification_grid">
          {OUTCOMES.map(({ field, key, defaultValue }) => (
            <Toggle
              key={field}
              defaultChecked={(settings?.[field] as boolean | undefined) ?? defaultValue}
              label={t(key)}
              onChange={(checked) => { set(notifyPatch(field, checked)) }}
            />
          ))}
        </div>
      </div>

      <div className="dsh_notification_card">
        <div>
          <div className="dsh_notification_cardTitle">{t('settings.rules.title')}</div>
          <div className="dsh_notification_cardDesc">{t('settings.rules.subtitle')}</div>
        </div>
        {rules.length === 0
          ? <div className="dsh_notification_empty">{t('settings.rules.empty')}</div>
          : (
            <div className="dsh_notification_rules">
              {rules.map((rule, index) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  t={t}
                  autoFocus={rule.id === focusedRuleId}
                  errorKey={error !== undefined && error.index === index ? error.key : undefined}
                  onPatch={(patch) => { edit(list => patchRule(list, rule.id, patch)) }}
                  onRemove={() => { edit(list => removeRule(list, rule.id)) }}
                />
              ))}
            </div>
          )}
        <div className="dsh_notification_rulesFooter">
          <button type="button" className="dsh_notification_button dsh_notification_buttonGhost" onClick={addRule}>
            {t('settings.rules.add')}
          </button>
          <button
            type="button"
            className="dsh_notification_button dsh_notification_buttonPrimary"
            disabled={!dirty || error !== undefined}
            title={!dirty || error !== undefined ? (error !== undefined ? t(error.key) : t('settings.rules.saveHint')) : undefined}
            onClick={saveRules}
          >
            {t('settings.rules.save')}
          </button>
          {error !== undefined
            ? <span className="dsh_notification_error">{t(error.key)}</span>
            : dirty ? <span className="dsh_notification_unsavedHint">{t('settings.rules.unsaved')}</span> : null}
        </div>
      </div>

      <div className="dsh_notification_card">
        <div className="dsh_notification_cardTitle">{t('settings.advanced.title')}</div>
        <Toggle
          defaultChecked={settings?.requireInteraction ?? false}
          label={t('settings.advanced.requireInteraction')}
          desc={t('settings.advanced.requireInteractionDesc')}
          onChange={(checked) => { set({ requireInteraction: checked }) }}
        />
        <Toggle
          defaultChecked={settings?.backgroundOnly ?? true}
          label={t('settings.advanced.backgroundOnly')}
          desc={t('settings.advanced.backgroundOnlyDesc')}
          onChange={(checked) => { set({ backgroundOnly: checked }) }}
        />
      </div>
    </section>
  )
}
