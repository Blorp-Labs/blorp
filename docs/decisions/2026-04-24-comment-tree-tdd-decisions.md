The comment tree should optimize for preserving the reader's continuity through
a partially loaded thread, not for eagerly rendering every newly fetched
comment as soon as it becomes available. The real UX risk is not incomplete
data by itself, but visible branch reshaping after the user has already begun
reading. Because of that, later fetches should be judged by whether they
clarify structure the user has already seen or expand the visible branch in a
new direction.

Missing ancestors are therefore treated as placeholders. If the user has
already seen a branch like `A => (missing) B => C`, and a later fetch provides
the real `B`, the tree should prefer hydrating that placeholder in place rather
than clipping away `C`. Inserting the real ancestor may shift content somewhat,
but removing already-visible descendants is a worse disruption because it
invalidates what the user was just reading. That led to the main invariant for
this work: do not remove already-visible descendants just because a missing
ancestor later became available.

Pruning still has a role, but only for a narrower case. It should hide newly
available branches that were not previously part of the visible structure,
rather than undoing structure the user already saw through placeholders. This
is also why pagination metadata is only used to decide whether neighboring
nodes belong to the same visible batch, not to infer any broader ordering
between pages. The same reasoning also drove the decision to expose "show more"
and child-order semantics from the tree layer itself: those rules are part of
the thread model, and scattering them across UI call sites would make the
behavior drift away from the continuity guarantees above.
