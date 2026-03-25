The auth store is persisted to IndexedDB and rehydrated on load. When multiple
tabs are open, each tab may have a slightly different in-memory state — for
example, one tab may have fetched fresh site data while another tab's storage
write is still in flight. The custom merge function reconciles persisted and
in-memory state when rehydration occurs.

For logged-in accounts (those with a jwt), the merge matches accounts by uuid
and picks whichever version has the newer siteUpdatedAt timestamp. This handles
two cases cleanly: if the current tab updated site data more recently than what
reached storage, the in-memory version wins; if another tab updated site data
more recently and wrote it to storage, the persisted version wins.

Logged-in accounts that exist only in the current tab (not yet in storage) are
appended to the result. This covers the race where a login completes then
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

The merge always defers to the current tab's selected account. When rehydration
fires and after merge, we keep the selectedUuid if it still exists in the accounts
array. If it doesn't we fall back to the persisted uuid, which could be undefined.

This gives each tab independent account selection: Tab 1 can have account A
selected while Tab 2 has account B selected, and they stay independent across
rehydrations.

## uuid is required on Account

Every Account has a required uuid. The v5 migration stamps any legacy account
missing a uuid before validating against the schema. The migration uses
{ ...a, uuid: a.uuid ?? uuid() } rather than { uuid: uuid(), ...a } — the
latter silently overrides an existing uuid with undefined when the spread
includes a uuid key set to undefined, whereas ?? only falls back when the value
is absent.

## getCachePrefixer collision for multiple accounts on the same instance

getCachePrefixer builds its prefix from instance and a boolean jwt flag
("authed\_"). Two logged-in accounts on the same instance (e.g. two lemmy.world
accounts) produce identical prefixes and silently share cached data, meaning
one account can read the other's cached posts, inbox, etc.

Appending uuid to the prefix gives each account a unique cache namespace.
Changing the prefix format invalidates existing caches on upgrade, but that is
a safe outcome — a cold cache is always preferable to a colliding one.
