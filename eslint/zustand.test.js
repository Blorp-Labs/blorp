import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import { zustandPersistMigrate } from "./zustand.js";

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2020, sourceType: "module" },
});

tester.run("zustand-persist-migrate", zustandPersistMigrate, {
  valid: [
    // no version key but migrate present — compliant
    {
      code: `
        import { persist } from "zustand/middleware";
        persist(creator, { name: "store", migrate: (s) => s });
      `,
    },
    // version 0 with migrate — compliant
    {
      code: `
        import { persist } from "zustand/middleware";
        persist(creator, { name: "store", version: 0, migrate: (s) => s });
      `,
    },
    // version > 0 with a migrate function — compliant
    {
      code: `
        import { persist } from "zustand/middleware";
        persist(creator, { name: "store", version: 2, migrate: (s) => s });
      `,
    },
    // `persist` from a different library — should not be flagged
    {
      code: `
        import { persist } from "some-other-lib";
        persist(creator, { name: "store", version: 2 });
      `,
    },
    // `persist` renamed on import — rename is tracked, so if the renamed
    // call has migrate it's still valid
    {
      code: `
        import { persist as zustandPersist } from "zustand/middleware";
        zustandPersist(creator, { name: "store", version: 1, migrate: (s) => s });
      `,
    },
  ],

  invalid: [
    // no version key and no migrate
    {
      code: `
        import { persist } from "zustand/middleware";
        persist(creator, { name: "my-store" });
      `,
      errors: [{ messageId: "missingMigrate", data: { name: "my-store" } }],
    },
    // version: 0 with no migrate — rollback from a higher version still needs it
    {
      code: `
        import { persist } from "zustand/middleware";
        persist(creator, { name: "my-store", version: 0 });
      `,
      errors: [{ messageId: "missingMigrate", data: { name: "my-store" } }],
    },
    // version: 1 with no migrate
    {
      code: `
        import { persist } from "zustand/middleware";
        persist(creator, { name: "my-store", version: 1 });
      `,
      errors: [{ messageId: "missingMigrate", data: { name: "my-store" } }],
    },
    // version: 6 with no migrate (higher version)
    {
      code: `
        import { persist } from "zustand/middleware";
        persist(creator, { name: "posts", version: 6 });
      `,
      errors: [{ messageId: "missingMigrate", data: { name: "posts" } }],
    },
    // renamed import without migrate — rename is tracked and should still be caught
    {
      code: `
        import { persist as zustandPersist } from "zustand/middleware";
        zustandPersist(creator, { name: "store", version: 2 });
      `,
      errors: [{ messageId: "missingMigrate", data: { name: "store" } }],
    },
    // unknown store name falls back to <unknown> in the message
    {
      code: `
        import { persist } from "zustand/middleware";
        persist(creator, { version: 1 });
      `,
      errors: [{ messageId: "missingMigrate", data: { name: "<unknown>" } }],
    },
  ],
});
