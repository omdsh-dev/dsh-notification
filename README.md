# dsh-notification

Desktop notifications for the DeepSeek Harness web GUI. When a session finishes a turn, the browser shows a system notification (via the `Notification` API), so you can switch tabs and still know when DSH is done; it also notifies when a session waits for your **approval, an answer, or a plan review**, so a pending confirmation is never missed on another tab. Per-outcome toggles, pending-kind toggles, and include/exclude keyword rules control exactly which messages notify.

No harness change is needed: the host contributes a session projection (a bounded summary of each session's last completed turn), and the client watches the session list's completion reminder and `pendingInteraction` (blocking-wait) signal, applying its own persisted preferences.

```
host:  notification projection (last turn's reason/text/tools) --session/projection--> browser
client: session list completion reminder (live, dedup) + pendingInteraction (approval/question/plan-review)
        + persisted settings
        -> permission + current-session visibility gate
        -> new Notification("DSH finished", { body: "deploy done" })
        -> new Notification("DSH needs your approval", { body: "<session title>" })
```

## Install

```sh
dsh plugin --profile web add https://github.com/omdsh-dev/dsh-notification/archive/refs/heads/main.tar.gz
```

Restart the web server so the host half and the served client bundle pick up the plugin. The default `dsh web` profile has the required client composition (the session list, the settings shell, and locale).

The settings section lives under **Settings > Notifications**.

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| Enable notifications | on | Master switch; off stops every notification while keeping rules. |
| Notify on completed / error / aborted / blocked / token limit | completed + error on, rest off | Which turn-end reasons notify (the host projection reports the reason). |
| Awaiting approval / awaiting your answer / awaiting plan review | approval + question on, plan review off | Which blocking-wait states notify, from the session list's `pendingInteraction` signal (the same fact behind the sidebar's amber dot). |
| Keyword rules | none | Include/exclude filters matched against the session title, the turn's reply text, and its tool names. Include rules: at least one must match. Exclude rules: a match suppresses. Rules support literal or regex matching with an optional case-sensitive flag. |
| Require manual dismiss | off | The notification stays until dismissed. |
| Only notify when the task is out of view | on | Suppress a notification only when its session is currently in view. A completion still notifies while the page is hidden or while another session/workspace is open. Turn it off to notify even for the session being watched. Notifications for the same session replace each other. |

Preferences persist in the browser (localStorage). The section also grants browser permission and sends a test notification.

## Configuration

Host-side tunables live on the plugin row in `cordis.yml`:

```yaml
- id: dsh-notification
  name: dsh-notification
  config:
    maxBodyChars: 400      # projection body budget; longer replies are ellipsized host-side
```

## Model experience

| Aspect | Effect |
| --- | --- |
| Token cost | None — notifications are UI-only and never enter a request. |
| Tool calls | None — the model gets no new tool. |
| Session log | Unchanged — the projection reads the existing log and adds no events. |
| Prompt | Unchanged — no system-prompt section is registered. |

## Permission boundary

- The host folds a pure projection over the session log (turn reason, bounded reply text, tool names) and the projection seam delivers it to the browser; the plugin writes nothing to the log and registers no model-facing tools.
- The client watches the session list's completion reminder (a live "finished while not selected" edge the runtime already computes) and blocking-wait signal (a session's `pendingInteraction` status edge), showing a notification only when the user has granted Notification permission.
- Rule matching runs client-side against the projected content; the reply body never exceeds `maxBodyChars`.

## Development

```sh
pnpm install            # links the sibling dsh checkout for build and tests
pnpm run check          # typecheck + tests + build
pnpm run test           # vitest (host projection + composition, client decision/runner/helpers/section)
pnpm run build          # esbuild host/client/invariant bundles + tsc declarations
```

The repo expects the harness checkout at `../dsh` for the dev-time `link:` resolutions. The composition spec boots the real `SessionStore` and `SessionProjectionRegistry` and proves the fold.

## Known limitations

- Notifications require the page to be open (the browser shows them while it is hidden, but not after the tab is closed) and Notification permission granted; a denied site permission cannot be overridden from inside the page.
- Notifications fire once per finished turn (a running→idle edge on any session); a completion that happened while the page was disconnected is not re-notified on reconnect.
- Pending-wait notifications fire once when a session's `pendingInteraction` transitions from none to approval/question/plan-review (deduplicated per session); a wait that appeared while disconnected is not re-notified.
- A pending-wait notification body is the session title — not the specific tool name or reason, because the session list exposes only the status enum, not `toolName`/`reason`.
- The rule subject is the session title plus the last turn's reply text and tool names — earlier turns are not matched.
- Notification body is a flat text snippet; the click action only focuses the window (no deep link to the turn).

## License

MIT
