Each persisted Zustand store now defines a `persistedSchema` using Zod that
covers only the fields written to storage, and a `migrate` function that runs
this schema against stored state whenever a version mismatch is detected on
load.

The primary motivation is defensive handling of rollbacks. If a user downgrades
the app, the older code will encounter state written by a newer version —
potentially with renamed fields, added fields, or changed shapes. The `migrate`
function uses `passthrough().parse()` so that unknown fields from the newer
schema are kept rather than stripped; since the older code only reads fields it
knows about, those extra fields are inert and harmless. If a required field is
missing or has the wrong type, `parse` throws, Zustand leaves the store in its
initial state, and the user starts fresh. This is acceptable as a last resort —
a clean store is better than crashing or operating on corrupt data.

The `migrate` function intentionally ignores the version number. There is no
step-by-step migration logic because the purpose is not to transform data
between known schema versions — it is to salvage as much of the newer state as
possible without knowing what the newer schema looks like. Alongside `migrate`,
each store also has a custom `merge` function that handles reconciling the
migrated persisted state with the in-memory initial state, including any
store-specific logic like deduplication of filter keywords or validation of
cached entries against their schemas.

An ESLint rule (`local/zustand-persist-migrate`) was added to enforce that
every versioned persist store defines a `migrate` function.
