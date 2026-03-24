The auth store is persisted to IndexedDB and rehydrated on load. When multiple
tabs are open, each tab may have a slightly different in-memory state — for
example, one tab may have fetched fresh site data while another tab's storage
write is still in flight. The custom merge function reconciles persisted and
in-memory state when rehydration occurs.

For logged-in accounts (those with a jwt), the merge matches accounts by uuid
and picks whichever version has the newer siteUpdatedAt timestamp. This handles
two cases cleanly: if the current tab updated site data more recently than what
reached storage, the in-memory version wins; if another tab updated site data
and wrote it to storage first, the persisted version wins.

Logged-in accounts that exist only in the current tab (not yet in storage) are
appended to the result. This covers the race where a login completes and
rehydration fires before the new account reaches IndexedDB.

Guest accounts (uuid but no jwt) are handled differently. The store always
initialises with at least one guest account, so every new tab starts with a
default guest in memory. Without special handling, each new tab's guest would
be appended to the persisted accounts list, causing it to grow by one guest
every time a tab is opened. To prevent this, in-memory guest accounts are
excluded from the uuid-based merge and persisted guests pass through unchanged.
On first launch, when there is nothing in storage yet, the merge returns the
current in-memory state as-is, preserving the default guest so the app never
ends up with an empty accounts list.

## Account selection across merges

The store currently tracks the selected account via accountIndex (a numeric
position into the accounts array). This causes a correctness problem during
merge: the accountIndex from persisted state is applied to a merged accounts
array whose order may differ from either source, so the selected account can
silently change. Known cases:

- Another tab reorders accounts before writing to storage.
- Another tab prepends a new account, bumping every existing index up by one.
- The current tab just logged in and rehydration fires before the write
  reaches IndexedDB; the new account is appended at the end of the merged
  list, but accountIndex from persisted points elsewhere.

The fix is to resolve the selected account by UUID rather than by index: before
building the merged list, record the UUID of current.accounts[current.accountIndex],
then after the merge find that UUID's position in the merged array and use that
as accountIndex (defaulting to 0 if not found, e.g. if another tab deleted the
account).

A side effect of making the current tab's selected account win in the merge
is that each tab maintains its own independent selection. Previously, switching
accounts in one tab would hijack the selection in every other tab on the next
rehydration (visibilitychange/focus), because the persisted accountIndex always
won. With current winning, Tab 1 can have account A selected while Tab 2 has
account B selected, and they stay independent.

TODO: Replace the persisted accountIndex field with selectedUuid (a schema
migration from v5 to v6, converting accounts[accountIndex]?.uuid). Add a
getAccountIndex(state) helper that returns accounts.findIndex(a => a.uuid ===
selectedUuid), defaulting to 0 when the UUID is not found. All existing call
sites that read accountIndex as a numeric index continue to use
getAccountIndex() without logic changes. setAccountIndex(index) keeps its
external API but internally converts index to UUID before writing. The merge
function simplifies to always taking selectedUuid from current (the current
tab's selection wins).

## getCachePrefixer collision for multiple accounts on the same instance

getCachePrefixer builds its prefix from instance and a boolean jwt flag
("authed\_"). Two logged-in accounts on the same instance (e.g. two
lemmy.world accounts) produce identical prefixes and silently share cached
data, meaning one account can read the other's cached posts, inbox, etc.

Now that uuid is required on every account, appending it to the prefix gives
each account a unique cache namespace. Changing the prefix format will
invalidate existing caches on upgrade, but that is a safe outcome — a cold
cache is always preferable to a colliding one.

TODO: Include uuid in the getCachePrefixer prefix.

## uuid is required on Account

uuid was previously optional in the Account type to accommodate data written
before uuid was introduced. As of v5, uuid is required in the schema. The v5
migration parses raw stored data permissively (using z.record to accept any
object shape), stamps a generated uuid onto any account missing one, then
validates the result against the strict schema. Existing uuids are preserved
via the spread — the pattern is { ...a, uuid: a.uuid ?? uuid() } rather than
{ uuid: uuid(), ...a } to avoid the spread silently overriding the generated
value with undefined.
