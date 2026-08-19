// @vitest-environment jsdom
/**
 * The settings section presentation: every card renders, the native toggles
 * route their writes through the injected `set` patch, and the rule editor
 * stays a local draft that only persists on save once valid.
 */
import type { ReactElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { NotificationSettingsSection, type NotificationSectionProps } from '../src/client/SettingsSection.tsx'
import { fmt, zh } from '../src/client/locales.ts'
import type { NotificationCreationResult } from '../src/client/notifier.ts'
import type { NotificationSettings } from '../src/contract.ts'

globalThis.IS_REACT_ACT_ENVIRONMENT = false

const t = (key: string, params?: Record<string, string>): string => fmt(zh[key] ?? key, params)

function fullSettings(overrides: Partial<NotificationSettings> = {}): NotificationSettings {
  return {
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
    ...overrides,
  }
}

function props(over: {
  settings?: NotificationSettings
  set?: (patch: Partial<NotificationSettings>) => void
  requestPermission?: () => Promise<NotificationPermission>
  sendTest?: () => NotificationCreationResult
} = {}): NotificationSectionProps {
  const stub = {
    useSettings: (selector: (snapshot: NotificationSettings) => unknown) =>
      selector(over.settings ?? fullSettings()),
    set: over.set ?? (() => {}),
    requestPermission: over.requestPermission ?? (async () => 'granted' as NotificationPermission),
    sendTest: over.sendTest ?? (() => ({ ok: true, notification: {} as Notification })),
    t,
  }
  return stub as unknown as NotificationSectionProps
}

function mount(element: ReactElement): { root: Root; container: HTMLDivElement } {
  const container = document.createElement('div')
  const root = createRoot(container)
  flushSync(() => { root.render(element) })
  return { root, container }
}

function buttonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll('button'))
  return buttons.find(button => button.textContent?.includes(text)) as HTMLButtonElement
}

function checkboxForLabel(container: HTMLElement, label: string): HTMLInputElement {
  const labels = Array.from(container.querySelectorAll('label'))
  const match = labels.find(candidate => candidate.textContent?.includes(label))
  return match?.querySelector('input[type="checkbox"]') as HTMLInputElement
}

function type(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('NotificationSettingsSection', () => {
  it('renders every card', () => {
    const { root, container } = mount(<NotificationSettingsSection {...props()} />)
    expect(container.textContent).toContain(zh['settings.enabled'])
    expect(container.textContent).toContain(zh['settings.permission.title'])
    expect(container.textContent).toContain(zh['settings.when.title'])
    expect(container.textContent).toContain(zh['settings.rules.title'])
    expect(container.textContent).toContain(zh['settings.advanced.title'])
    root.unmount()
  })

  it('routes the master switch through set', () => {
    const set = vi.fn()
    const { root, container } = mount(<NotificationSettingsSection {...props({ set })} />)
    const checkbox = checkboxForLabel(container, zh['settings.enabled'])
    checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(set).toHaveBeenCalledWith({ enabled: false })
    root.unmount()
  })

  it('renders one toggle per outcome and routes its write', () => {
    const set = vi.fn()
    const { root, container } = mount(<NotificationSettingsSection {...props({ set })} />)
    const aborted = checkboxForLabel(container, zh['settings.when.aborted'])
    expect(aborted.checked).toBe(false)
    aborted.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(set).toHaveBeenCalledWith({ notifyAborted: true })
    root.unmount()
  })

  it('renders pending toggles and routes their writes', () => {
    const set = vi.fn()
    const { root, container } = mount(<NotificationSettingsSection {...props({ set })} />)
    const question = checkboxForLabel(container, zh['settings.pending.question'])
    expect(question.checked).toBe(true)
    question.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(set).toHaveBeenCalledWith({ notifyQuestion: false })
    root.unmount()
  })

  it('confirms that a test notification request was created', async () => {
    const sendTest = vi.fn(() => ({ ok: true as const, notification: {} as Notification }))
    const { root, container } = mount(<NotificationSettingsSection {...props({ sendTest })} />)
    buttonByText(container, zh['settings.permission.test']).click()
    await Promise.resolve()
    flushSync(() => {})
    expect(sendTest).toHaveBeenCalledTimes(1)
    expect(container.textContent).toContain(zh['settings.permission.testSent'])
    root.unmount()
  })

  it('shows a browser notification constructor failure', async () => {
    const sendTest = vi.fn(() => ({ ok: false as const, message: 'system notifications unavailable' }))
    const { root, container } = mount(<NotificationSettingsSection {...props({ sendTest })} />)
    buttonByText(container, zh['settings.permission.test']).click()
    await Promise.resolve()
    flushSync(() => {})
    expect(container.textContent).toContain('浏览器无法创建测试通知：system notifications unavailable')
    root.unmount()
  })

  it('keeps rules as a draft that persists only on a valid save', () => {
    const set = vi.fn()
    const { root, container } = mount(<NotificationSettingsSection {...props({ set })} />)
    expect(buttonByText(container, zh['settings.rules.save']).disabled).toBe(true)
    flushSync(() => { buttonByText(container, zh['settings.rules.add']).click() })
    // The empty-pattern draft blocks save with an inline reason.
    expect(container.textContent).toContain(zh['settings.rules.invalid'])
    const input = container.querySelector('.dsh_notification_ruleInput') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(buttonByText(container, zh['settings.rules.save']).disabled).toBe(true)
    flushSync(() => { type(input, 'deploy') })
    // A valid unsaved draft lights the save button and shows the compact hint.
    expect(container.textContent).toContain(zh['settings.rules.unsaved'])
    const save = buttonByText(container, zh['settings.rules.save'])
    expect(save.disabled).toBe(false)
    flushSync(() => { save.click() })
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ rules: expect.arrayContaining([expect.objectContaining({ pattern: 'deploy' })]) }))
    root.unmount()
  })
})
