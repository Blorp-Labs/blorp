# Blorp

The role of this file is to describe common mistakes and confusion points that agents might encounter as they work in this project. If you ever encounter something in the project that surprises you, please alert the developer working with you and indicate that this is the case in the CLAUDE.md file to help prevent future agents from having the same issue.

## Plans

When creating plans, prepend the date and use a short descriptive name based on the task content (e.g., "2026-03-09-refactor-auth-flow", "2026-03-09-fix-notification-badge").

## Verification

After making changes, always run these checks before considering work complete:

```
pnpm test:ts
pnpm test
pnpm lint
```

## TypeScript

* Prefer satisfies over as when writing TypeScript
