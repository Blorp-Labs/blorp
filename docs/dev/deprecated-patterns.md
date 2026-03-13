# Deprecated Patterns

## Alert / Confirmation dialogs

**Deprecated:** manually constructing a `Deferred` and wiring up `useIonAlert` buttons to `deferred.resolve` / `deferred.reject`.

```ts
// ❌ Don't do this
const deferred = new Deferred();
alrt({
  message: "Are you sure?",
  buttons: [
    { text: "Cancel", role: "cancel", handler: () => deferred.reject() },
    { text: "OK", handler: () => deferred.resolve() },
  ],
});
await deferred.promise;
```

**Preferred:** use `useConfirmationAlert` from `@/src/lib/hooks`. It handles the deferred internally, supports a `danger` flag for destructive actions, and cancellation is handled cleanly by chaining `.then()` (cancel silently stops the chain).

```ts
// ✅ Do this
const getConfirmation = useConfirmationAlert();

getConfirmation({
  message: "Are you sure?",
  confirmText: "OK",
  danger: true, // for destructive actions
}).then(() => {
  // proceed
});
```
