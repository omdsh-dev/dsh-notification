# dsh-notification

Completion notifications for DeepSeek Harness. The browser client shows system notifications while the page is open; an optional server webhook runs in the DSH Host and continues after every tab is closed.

No harness change is needed: the host contributes a session projection (a bounded summary of each session's last completed turn), and the client watches the session list's completion reminder and applies its own persisted preferences.

```
host:  notification projection -> browser client
       committed turn/end -> server webhook (optional)
client: live completion reminder + persisted settings
        -> permission + current-session visibility gate -> Notification API
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
| Keyword rules | none | Include/exclude filters matched against the session title, the turn's reply text, and its tool names. Include rules: at least one must match. Exclude rules: a match suppresses. Rules support literal or regex matching with an optional case-sensitive flag. |
| Require manual dismiss | off | The notification stays until dismissed. |
| Only notify when the task is out of view | on | Suppress a notification only when its session is currently in view. A completion still notifies while the page is hidden or while another session/workspace is open. Turn it off to notify even for the session being watched. Notifications for the same session replace each other. |

Preferences persist in the browser (localStorage). The section also grants browser permission and sends a test notification.

## Server webhook

The webhook is disabled by default. Enable it on the plugin row in `cordis.yml`:

```yaml
- id: dsh-notification
  name: dsh-notification
  config:
    maxBodyChars: 400
    webhook:
      enabled: true
      reasons: [completed, error]
```

Export the endpoint before starting DSH:

```sh
export DSH_NOTIFICATION_WEBHOOK_URL='https://notifications.example.com/dsh'
```

Generate a secret, then store it in `$DSH_HOME/.credentials.yaml` with mode `0600`:

```sh
node -e "console.log('whsec_'+require('node:crypto').randomBytes(32).toString('base64'))"
```

```yaml
DSH_NOTIFICATION_WEBHOOK_SECRET: whsec_...
```

Browser settings do not affect webhooks. The Host sends matching top-level `turn/end` events and ignores subagents. Verify the [Standard Webhooks](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md) signature and deduplicate by `webhook-id`; provider-specific endpoints may need a relay.

```json
{"id":"msg_…","type":"dsh.turn.ended","timestamp":"2026-08-13T12:34:56.789Z","data":{"turn":3,"reason":"completed"}}
```

| Data sent | Default | Enable with |
| --- | --- | --- |
| Event id, time, turn, outcome | sent | always present |
| DSH session id | omitted | `includeSessionId: true` |
| Assistant text collected during the turn | omitted | `includeBody: true` (bounded by `maxBodyChars`) |
| Tool names (up to 32) | omitted | `includeTools: true` |

HTTPS is required except for loopback development. `2xx` acknowledges delivery; redirects are not followed, and payloads over 16 KiB are not sent. Prompts and tool arguments/results are never fields, but `includeBody` may expose sensitive model text.

## Model experience

| Aspect | Effect |
| --- | --- |
| Token cost | None — notifications never enter a model request. |
| Tool calls | None — the model gets no new tool. |
| Session log | Unchanged — the projection reads the existing log and adds no events. |
| Prompt | Unchanged — no system-prompt section is registered. |

## Permission boundary

- The host folds a pure projection over the session log (turn reason, bounded reply text, tool names); the plugin writes nothing to the log and registers no model-facing tools.
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

- Browser notifications need an open page and permission; webhooks need a running DSH Host.
- Webhook delivery uses a bounded in-memory queue and finite retries. It can deliver duplicates, and stopping the Host can lose pending events. It does not backfill turns completed before the plugin loaded.
- Browser notifications fire once per finished turn (a running→idle edge on any session); a completion that happened while the page was disconnected is not re-notified on reconnect.
- The rule subject is the session title plus the last turn's reply text and tool names — earlier turns are not matched.
- Notification body is a flat text snippet; the click action only focuses the window (no deep link to the turn).

## License

MIT
