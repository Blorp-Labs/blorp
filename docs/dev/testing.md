# Testing conventions

## Mock data / factory helpers

All API schema factory functions belong in `test-utils/api.ts`. When writing tests that need a mock `Community`, `Post`, `Feed`, etc., import from there rather than defining inline fixtures.

```ts
// ✅ Do this
import * as api from "@/test-utils/api";

const feed = api.getFeed({ subscribed: true });
const community = api.getCommunity({ id: 2 });
```

If a schema type doesn't have a factory yet, add one to `test-utils/api.ts` so it's available for future tests.
