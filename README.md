# dsh-notification

Desktop notifications for the DeepSeek Harness web GUI. When a session finishes a turn, the browser shows a system notification (via the `Notification` API), so you can switch tabs and still know when DSH is done. Per-outcome toggles and include/exclude keyword rules control exactly which completions notify.

No harness change is needed: the host contributes a session projection (a bounded summary of each session's last completed turn), and the client watches the session list's completion reminder and applies its own persisted preferences.

```
host:  notification projection (last turn's reason/text/tools) --session/projection--> browser
client: session list completion reminder (live, dedup) + persisted settings
        -> permission + current-session visibility gate
        -> new Notification("DSH finished", { body: "deploy done" })
```

## Install

```sh
dsh plugin --profile web add https://github.com/omdsh-dev/dsh-notification/archive/refs/tags/v0.1.2.tar.gz
```

Restart the web server so the host half and the served client bundle pick up the plugin. The default `dsh web` profile has the required client composition (the session list, the settings shell, and locale).

The settings section lives under **Settings > Notifications**.

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| Enable notifications | on | Master switch; off stops every notification while keeping rules. |
| Notify on completed / error / aborted / blocked / token limit | completed + error on, rest off | Which turn-end reasons notify (the host projection reports the reason). |
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
- The client watches the session list's completion reminder (a live "finished while not selected" edge the runtime already computes) and shows a notification only when the user has granted Notification permission.
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
- The rule subject is the session title plus the last turn's reply text and tool names — earlier turns are not matched.
- Notification body is a flat text snippet; the click action only focuses the window (no deep link to the turn).

## License

MIT
