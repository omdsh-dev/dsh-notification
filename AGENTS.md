# AGENTS.md

Standing orders for this repository. The product contract lives in [README.md](README.md); these rules govern how the repo is changed.

## Layout

- `src/` — TypeScript source. `src/index.ts` is the host plugin (the `notification` session projection); `src/client/` is the browser half (completion runner + settings section); `src/contract.ts` is the shared wire/settings shape both halves use.
- `lib/` — committed build artifacts. The harness profile resolves `main`, `./client`, and `./invariant` from here; **every source change that should be installable must rebuild and commit `lib/` in the same commit**.
- `tests/` — vitest suites at the repo root, importing internals by relative path.

## Build and checks

- `pnpm run typecheck`, `pnpm run test`, `pnpm run build` — all three must be green before a commit claims completion; `pnpm run check` runs them in order.
- The host projection fold (`src/projection.ts`) is pure and unit-tested; the composition spec proves registration + fold + disposal over the real `SessionStore` and `SessionProjectionRegistry`.

## Commit discipline

- Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `build:`, `chore:`) with a body explaining what and why for non-trivial changes.
- One concern per commit: host behavior, client UI, build tooling, docs, and test fixes land separately.
- Never commit credentials, `node_modules/`, or logs.

## Integration

- The plugin mounts into a dsh profile via `dsh plugin --profile <name> add file:/path/to/dsh-notification` (bundle route). Its `dsh.bundle.patch` inserts one row; the profile's healed `node_modules` resolves the bare name.
- No harness change is required: the host registers a session projection (a pure fold the projection seam delivers to every session), and the client persists its preferences in a local snapshot store and reads the session list's completion reminder.
- Host plugin-set changes take effect on server restart; client bundle changes are served from `lib/client.js` after a rebuild (page refresh).
- The harness checkout that feeds type checking is the sibling `../dsh` (linked devDependencies). When that checkout moves to a new snapshot, re-run `pnpm install`, `pnpm run check`, and fix API drift before integrating.

