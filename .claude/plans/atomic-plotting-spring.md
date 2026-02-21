# Plan: Poll Duration Unit Picker + Permanent Option

## Context
The poll editor currently locks duration to days. The user wants to pick the unit (minutes, hours, days, weeks, months) and also have a "Permanent" option. Making "Permanent" one of the unit choices keeps the UI compact — when it's selected the number input is hidden.

## Files to Modify

### 1. `src/lib/api/adapters/api-blueprint.ts`
Replace `endDays: number` in `PollInput` with two fields:

```typescript
export interface PollInput {
  endAmount: number;
  endUnit: "minutes" | "hours" | "days" | "weeks" | "months" | "permanent";
  mode: "single" | "multiple";
  localOnly: boolean;
  choices: PollChoiceInput[];
}
```

### 2. `src/lib/api/adapters/piefed.ts`
Convert `endAmount` + `endUnit` to an ISO date in both `createPost` and `editPost`. For `"permanent"`, send a date 100 years in the future (the field appears required by the API):

```typescript
const MS: Record<string, number> = {
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
  months: 30 * 24 * 60 * 60 * 1000,
};

const end_poll =
  form.poll.endUnit === "permanent"
    ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() + form.poll.endAmount * MS[form.poll.endUnit]).toISOString();
```

### 3. `src/stores/create-post.ts`
- **`postToDraft`**: replace `endDays` with `endAmount`/`endUnit` (default to days when loading an existing poll):
  ```typescript
  endAmount: Math.max(1, dayjs(post.poll.endDate).diff(dayjs(), "day")),
  endUnit: "days",
  ```
- **`draftToEditPostData`** poll case: `endAmount`/`endUnit` already pass through via `...draft` spread — no extra changes needed there.
- **`draftToCreatePostData`** poll case: same, no extra changes needed.

### 4. `src/features/create-post.tsx`
- Update `DEFAULT_POLL`:
  ```typescript
  endAmount: 7,
  endUnit: "days",
  ```
- Replace the single duration `Input` with a row: `[number Input] [SimpleSelect for unit]`.
- Hide the number `Input` when `endUnit === "permanent"`.
- Import `SimpleSelect` from `@/src/components/ui/simple-select`.

Unit options array (defined at module level):
```typescript
const POLL_UNIT_OPTIONS = [
  { value: "minutes", label: "Minutes" },
  { value: "hours",   label: "Hours"   },
  { value: "days",    label: "Days"    },
  { value: "weeks",   label: "Weeks"   },
  { value: "months",  label: "Months"  },
  { value: "permanent", label: "Permanent" },
] as const;
```

Duration UI:
```tsx
<div className="flex flex-col gap-2">
  <Label>Poll Duration</Label>
  <div className="flex gap-2">
    {draft.poll?.endUnit !== "permanent" && (
      <Input
        type="number"
        min="1"
        step="any"
        value={draft.poll?.endAmount ?? 7}
        onChange={(e) =>
          draft.poll &&
          patchDraft(draftId, {
            poll: { ...draft.poll, endAmount: parseFloat(e.target.value) },
          })
        }
        className="w-24"
      />
    )}
    <SimpleSelect
      options={POLL_UNIT_OPTIONS}
      value={POLL_UNIT_OPTIONS.find((o) => o.value === (draft.poll?.endUnit ?? "days"))}
      onChange={(o) =>
        draft.poll &&
        patchDraft(draftId, { poll: { ...draft.poll, endUnit: o.value } })
      }
      valueGetter={(o) => o.value}
      labelGetter={(o) => o.label}
    />
  </div>
</div>
```

## Verification
1. `yarn test:ts` — no errors
2. Create a poll post with each unit and verify the end date sent to PieFed is correct
3. Select "Permanent" — number input disappears, post submits with end date ~100 years out
4. Edit an existing poll — duration defaults to days with the remaining day count
