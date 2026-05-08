The comment tree should preserve the reader's continuity through a partially
loaded thread, not eagerly render every newly fetched comment as soon as it
becomes available. The real UX risk is not incomplete data by itself, but
visible branch reshaping after the user has already begun reading.

Missing ancestors are therefore treated as placeholders. If the user has
already seen a branch like `A => (missing) B => C`, and a later fetch provides
the real `B`, the tree should prefer hydrating that placeholder in place
rather than clipping away `C`. Inserting the real ancestor may cause layout
shift, but removing already-visible descendants is a worse disruption because
it invalidates what the user was just reading. That led to the main invariant:
do not remove already-visible descendants just because a missing ancestor
later became available.

Pruning has a role, but only for branches the user has not yet seen. A node
whose pageCursor diverges from the branch it sits on is dropped unless it
hydrates a placeholder already on screen. Placeholders inherit the cursor of
whichever descendant first created them, so when a real ancestor arrives
later it adopts the existing cursor rather than its own and survives pruning
— the branch keeps its place through hydration. For example, if the user has
already loaded `A` and its reply `B` from one page, and a later page returns
a new reply `D` under `B`, `D` is dropped because, and we render a "show more"
in it's place. Pagination metadata is therefore treated only as a same-batch
signal.
