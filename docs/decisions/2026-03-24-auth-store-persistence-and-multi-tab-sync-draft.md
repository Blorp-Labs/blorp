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

The merge always defers to the current tab's selected account. When rehydration
fires, the merge records which account the current tab has selected by UUID,
builds the merged accounts list, then finds that UUID in the result and uses it
as the new selection. If the account is no longer present (e.g. another tab
deleted it), the selection falls back to index 0.

This gives each tab independent account selection: Tab 1 can have account A
selected while Tab 2 has account B selected, and they stay independent across
rehydrations.

TODO: Replace the persisted accountIndex field with selectedUuid (schema
migration v5 to v6, converting accounts[accountIndex]?.uuid). Add a
getAccountIndex(state) helper that derives the numeric index from selectedUuid,
defaulting to 0 when not found. All existing call sites that read accountIndex
as a numeric index continue to work via getAccountIndex() without logic changes.
setAccountIndex(index) keeps its external API but internally stores the UUID.

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

TODO: Include uuid in the getCachePrefixer prefix.
