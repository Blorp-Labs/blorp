# Blorp

Blorp is a multi-platform client for [Lemmy](https://join-lemmy.org/) and [PieFed](https://piefed.org/), Reddit-style federated social media platforms. Users browse moderated communities, read/create posts, and participate in threaded comment trees.

## Tech Stack

- **Framework**: React 19 + TypeScript (strict mode)
- **Bundler**: Vite 7
- **Styling**: Tailwind CSS 4 + ShadCN/Radix UI + Ionic 8
- **State**: Zustand (local/persisted state) + React Query (server data)
- **Routing**: React Router 5 with Ionic router, Zod-validated route params
- **Editor**: TipTap (rich text)
- **Package manager**: Yarn 4 (Berry)

## Platforms

| Platform | Technology  | Build                                            |
| -------- | ----------- | ------------------------------------------------ |
| Web      | Vite        | `yarn build`                                     |
| macOS    | Tauri 2     | `yarn build:tauri` or `scripts/build-release.sh` |
| iOS      | Capacitor 7 | `yarn build` then Xcode                          |
| Android  | Capacitor 7 | `yarn build` then Android Studio                 |

Tauri is only used for macOS. Capacitor handles iOS and Android. Web runs as a standalone Vite app.

## Commands

| Command          | Purpose                                            |
| ---------------- | -------------------------------------------------- |
| `yarn dev`       | Start Vite dev server                              |
| `yarn build`     | Production build (Vite + Capacitor sync)           |
| `yarn test`      | Run Vitest unit tests                              |
| `yarn test:ts`   | TypeScript type check (`tsc --noEmit`)             |
| `yarn lint`      | Lint via oxlint                                    |
| `yarn test:e2e`  | Playwright E2E tests (requires `yarn build` first) |
| `yarn storybook` | Component Storybook                                |

Run `yarn test:ts` periodically during development. Run `yarn lint` to check for lint issues.

## Project Structure

```
src/
├── main.tsx                 # Entry point
├── App.tsx                  # Root component, provider hierarchy
├── routing/                 # Router, route definitions (Zod schemas), sidebars
├── features/                # Page-level screens and feature-specific components
├── components/              # Shared/reusable components
│   ├── ui/                  # ShadCN components
│   ├── posts/               # Post display components
│   ├── comments/            # Comment components
│   ├── communities/         # Community components
│   ├── markdown/            # Markdown rendering
│   └── ...
├── stores/                  # Zustand stores (auth, posts, comments, etc.)
├── lib/
│   ├── api/                 # React Query hooks + API adapters (Lemmy v3/v4)
│   └── hooks/               # Shared React hooks
├── tanstack-query/          # React Query client config + persistence
└── styles/                  # Global CSS
```

```
scripts/                     # Build and deploy scripts
├── bump-version.sh          # Cross-platform version sync + git tag
├── build-release.sh         # macOS notarization + Android AAB build
├── validate-tauri.sh        # Tauri plugin version consistency check
└── update-licenses.js       # Third-party license generation
```

### Feature folder migration

New features go in `src/features/`, not `src/components/`. A feature folder contains the screen component (Ionic page) and any components used only by that feature. Shared/reusable components stay in `src/components/`.

## Architecture

### Dual Backend: Lemmy + PieFed

Blorp supports both Lemmy and PieFed through an **adapter** pattern (`src/lib/api/adapters/`). The querying layer only interacts with `ApiBlueprint`, an abstract class defined in `api-blueprint.ts`. Each backend has its own concrete implementation of this class, and there can be multiple adapters for different versions of the same API:

- `lemmy-v3.ts` — Lemmy v3 adapter (Lemmy 0.x, `/api/v3` endpoints)
- `lemmy-v4.ts` — Lemmy v4 adapter (Lemmy 1.x, `/api/v4` endpoints, partially implemented)
- `piefed.ts` — PieFed adapter
- `lemmy-common.ts` — Shared logic between Lemmy v3 and v4

**Versioning note:** Lemmy upstream calls these versions 0.x and 1.x, but within our codebase we refer to them as **v3** and **v4** (matching the API endpoint paths) to avoid confusion.

### Data Deduplication Pattern

When the same data can be returned from multiple API calls (different endpoints or different sorts), we deduplicate it:

1. **React Query** fetches data from the API and returns **only IDs** (not full objects)
2. **Zustand stores** hold the full objects, keyed by `CacheKey` (instance + entity ID)
3. **Components** look up the latest version from Zustand by ID (near O(1))

This means the same post appearing in multiple feeds always reflects the latest data. Not every API call uses this pattern — only the ones where we know the same entity can appear in multiple places.

**Stores using this cache/dedup pattern:** `posts`, `comments`, `communities`, `profiles`, `flairs`, `multi-community-feeds`

See `src/stores/posts.ts` for the canonical example.

### Cache Lifecycle

- Cached objects track a `lastUsed` timestamp
- Entries older than 2 days (`MAX_CACHE_MS` in `src/stores/config.ts`) are evicted
- Cleanup runs on app launch (store rehydration)

### Multi-Account Support

Multiple accounts can be logged in simultaneously, including the same account twice. Each login generates a local UUID associated with the persisted JWT. Data is keyed using `cachePrefixer` (`src/stores/auth.ts`), which prefixes cache keys with instance + auth status. Guest accounts work the same way but have no JWT and restricted actions.

### UI Layer

Ionic provides the app shell (pages, tabs, menus, gestures, safe areas). ShadCN/Radix provides styled form controls and UI components (dialogs, buttons, inputs). They coexist: Ionic for layout/navigation, ShadCN for inner component UI.

## Code Conventions

### General

- Keep code concise. Don't be overly verbose.
- **Always use `===` and `!==` for comparisons.** Never use `==` or `!=` — no type coercion.
- **Always clean up dead code.** If unsure what's new, diff against master.
- Follow existing patterns — look at nearby components for reference.
- Keep PRs focused. Clean up code you touch, but don't expand the diff into unrelated files.
- Fix lint warnings only in code you're already modifying.

### TypeScript

- **Prefer `satisfies` over `as` for type assertions.** Use `as` only when you need to override the inferred type (e.g., narrowing `unknown`), not just to annotate it.
- **Never use the non-null assertion operator (`!`).** Instead, extract the value to a `const` so TypeScript can narrow it via a type guard (e.g., `_.isNumber()`), or restructure the code to avoid the assertion.
- **Avoid nested ternary operators.** When branching over multiple cases, prefer a `switch` statement or a lookup object. A single ternary is fine; nesting them is a last resort.

### React hooks

- **Never call hooks after a conditional return.** All hook calls (`useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`, custom hooks, etc.) must come before any early `return` statement in a component or hook. When adding a new hook to existing code, scan upward for early returns. When adding a new early return, scan downward for hook calls that would become conditional.

### Libraries

- Always check if an already-installed library handles the need before adding a new one.
- Only add new libraries when the maintenance burden justifies it (e.g., markdown stripping, throttled queues).
- Ask when unsure.

### Testing

- `yarn test` — Vitest unit tests
- `yarn test:ts` — type check (run periodically)
- `yarn lint` — oxlint (many existing warnings; only fix in code you touch)
- `yarn test:e2e` — Playwright E2E (run `yarn build` first)
