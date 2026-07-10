# `yarn check` (svelte-check) — remaining issues to review

This document categorises the type issues that were **not** auto-fixed, because
they are either substantial, risky, or require a product/architectural decision.
It is intentionally **left uncommitted** for review.

## Base branch

This work is now rebased on top of **`origin/chore/modernize-frontend-linting`**
(comprehensive ESLint flat-config + Prettier modernization). All commits below
sit on that branch, are Prettier-formatted to the new config, and pass
`yarn eslint` (0 errors) on the changed files.

## Progress so far

| Stage | Errors | Warnings |
|-------|-------:|---------:|
| Baseline (this task, before any fixes) | 185 | 21 |
| After simple batch fix | 150 | 19 |
| After `.js`→`.ts` refactors (dropzone, accept-language-parser) + browser-support checkJs fixes | 105 | 19 |
| After notification-store typing | 92 | 19 |
| After group G (test files) | 89 | 19 |
| After group C (mapbox/maplibre GL) | 50 | 19 |
| After group D (Dropzone.svelte) | 31 | 19 |
| After group F (svelte:element / component-prop gaps) | 29 | 19 |
| After group A (svelte-simple-modal component types) | **19** | **19** |

The remaining **19 errors** are exactly groups **B** (Firebase/Firestore
generics) and **E** (data-model / product decisions), which are intentionally
deferred — see below. The 19 warnings are still untouched.

### Committed on this branch (on top of the linting branch)
1. `fix(types): resolve simple svelte-check type errors` — ~35 low-risk fixes (casts, `$state` init types, click-outside `EventTarget`→`Node`, `window.wtmgAnchorNav` global, etc.)
2. `refactor(types): convert dropzone.js to typed TypeScript`
3. `refactor(types): properly type accept-language-parser`
4. `fix(types): resolve checkJs type errors in browser-support.js` (kept as `.js` — it is minified separately by `tools/minify-browser-support-script.sh`)
5. `refactor(types): type the notification store and Notifications component`
6. `chore(types): conform rebased refactors to modernized lint/format`
7. `fix(types): resolve svelte-check errors in e2e test files (group G)`
8. `fix(types): resolve mapbox-gl svelte-check errors in Map components (group C)`
9. `fix(types): resolve Dropzone.svelte internal typing errors (group D)`
10. `fix(types): resolve svelte:element and component-prop gaps (group F)`
11. `fix(types): reconcile svelte-simple-modal legacy component types (group A)`

Groups **A, C, D, F, G are done** (see the ✅ notes in each section below).
Groups **B and E remain** and are the only source of the 19 remaining errors.

### Reassessed / dropped after the rebase
- **`is-browser.js` refactor was dropped**: on the linting branch that file was
  already **deleted and is unreferenced** (its `util/index.js` export is gone), so
  there was nothing left to type.
- **`accept-language-parser.ts`**: the linting branch had added an
  `eslint-disable no-param-reassign` workaround; the typed rewrite removes the
  reassignment entirely, so that directive was dropped.

> Note: an unrelated pre-existing `firebase.json` working-tree change (from the
> old `feat/devcontainer` base) was **stashed** before the rebase and is not part
> of this branch — it does not apply to the new base.

---

## Remaining errors, by theme

### A. Svelte 5 `Component` type mismatch (systemic) — ~11 errors — ✅ RESOLVED

**Files:** `src/lib/util/push-registrations.ts:29`, `src/routes/[[lang]]/(stateful)/chat/archive-actions.svelte.ts:30`, `src/lib/components/DebuggingInfo.svelte:99`, `src/routes/+layout.svelte:418`, and closely related `src/lib/components/Garden/CoordinateForm.svelte:56,61` (component `bind:this` ref exposes `{ $on, $set }` instead of instance).

**Root cause (confirmed):** The shared helper is **svelte-simple-modal**. Its v2
package — and even its current upstream `master` — still ships legacy
`typeof SvelteComponent` JSDoc types for `bind` / `show` / `open`, even though the
runtime supports Svelte 5. Our components are Svelte 5 `Component<Props>` functions
stored in `rootModal` (`Component | null`), so every `bind(...)` / `Modal show=`
site failed both directions. (This also explains why VSCode may not flag it — the
Svelte extension can resolve the component type differently than `svelte-check`
does in CI; the error is real for `yarn check`.)

**Fix applied:**
- Added `src/lib/util/modal.ts` — a thin wrapper that re-types `bind` with
  Svelte 5's `import type { Component } from 'svelte'`. `push-registrations`,
  `archive-actions`, and `DebuggingInfo` now import `bind` from there.
- `+layout.svelte` casts `$rootModal` to the legacy type at the single
  `<Modal show={...}>` binding (`Component` isn't re-exported from the package
  index, so the cast goes through `typeof SvelteComponent`).
- `CoordinateForm` was a **different, latent bug**, not a modal issue: the blur
  handler cast `event.target` to the `TextInput` *component* type (hence the
  `{ $on, $set }` shim). The DOM event target is the underlying `<input>`, so it
  now casts to `HTMLInputElement` and `.name`/`.value` resolve.

**Note for review:** the modal runtime is unchanged (only types); the map/marker
`bind:this` paths were untouched. Worth a quick manual open/close of an error
modal and the archive-confirm modal to confirm.

### B. Firebase / Firestore generics — ~11 errors

- `src/lib/api/garden.ts:122–135` (8) — parsing the **Firestore REST** value
  union (`doubleValue`/`integerValue`/`booleanValue` on `DoubleValue | IntegerValue
  | StringValue | BooleanValue`) plus `GardenFacilities.capacity` missing on a
  dynamically-built `{ [k: string]: any }`. Needs discriminated-union narrowing
  (check which value key is present) and a typed facilities builder.
- `src/lib/api/push-registrations/native.ts:378` — `CollectionReference`
  converter generic mismatch (`FirebasePushRegistration` vs
  `FirebaseNativePushRegistration`; `FirebaseWebPushRegistration` lacks `deviceId`).
- `src/lib/api/push-registrations/index.ts:77` — `setDoc` rejects `subscription: … | null`
  against the `FieldValue`-based `WithFieldValue` write type.
- `src/lib/api/push-registrations/webpush.ts:148` — `.withClientHints` accessed on
  `IDevice | PromiseLike<IDevice>` (an un-awaited promise, or a wrong lib type).

**Risk:** Medium–high. These are real invariants around the web/native push
registration discriminated union and Firestore converters; fixing the types risks
masking or exposing genuine runtime shape bugs. Should be done by someone familiar
with the push-registration data model.

### C. mapbox/maplibre GL typing — ~39 errors — ✅ RESOLVED

**Fix applied (committed):**
- **Common sub-fix:** used mapbox-gl's built-in `getSource<GeoJSONSource>(id)`
  generic together with optional chaining across GardenLayer/MeetupLayer/FileTrails,
  so `setData`/`getClusterExpansionZoom` type-check without a bespoke helper.
- `FullscreenControl.ts`: definite-assignment (`!`) on lifecycle-assigned fields;
  made `DOM.create` generic so it returns the concrete element type; fire fullscreen
  events via the string overload (dropped the bespoke `Event` class); passed the
  required boolean to `setCooperativeGestures`; made `_prevCooperativeGestures`
  optional so `delete` is valid; `in`-check for `exitFullscreen` feature detection.
- `GardenLayer`: annotated the built `GeoJSON.Feature`, narrowed
  `queryRenderedFeatures` geometry to `Point`, guarded possibly-undefined props.
- `MeetupLayer`: guarded null feature props; dropped an ignored arg to
  `meetupFeatureCollection()`.
- `DraggableMarker`: typed the `marker`/`markerElement` `$state` and guarded use.
- `FileTrails`: removed now-unused `prefix` import, `SourceData` type, `GeoJSON` import.

> **Please verify the map** (garden clusters, meetup layer, file trails, draggable
> marker) still behave — these are casts to the correct GL types, low behavioural
> risk but worth exercising.

<details><summary>Original analysis (kept for reference)</summary>

- `src/lib/components/Map/FullscreenControl.ts` (15) — a hand-ported map control
  class: uninitialised class properties (`_map`, `_container`, …; needs
  `!`/definite assignment or constructor init), `HTMLElement` vs
  `HTMLButtonElement`, `fire(new Event(...))` overloads, `delete` on a
  non-optional property, and cooperativeGestures typing. Best done as a focused
  rewrite of this one class.
- `src/lib/components/Map/GardenLayer.svelte` (12) — GeoJSON `Feature` typing:
  `type: string` vs the `'Feature'` literal, `Source` vs `GeoJSONSource`
  (`setData`/`getClusterExpansionZoom` don't exist on the base `Source`),
  `geometry.coordinates` on `Geometry | GeometryCollection`, and two implicit-any
  callback params.
- `src/lib/components/Map/MeetupLayer.svelte` (4) — same `Source.setData` issue +
  `meetup` possibly null + an argument-count mismatch.
- `src/lib/components/Map/FileTrails.svelte` (2) — `Source.setData` again.
- `src/lib/components/Map/DraggableMarker.svelte` (6) — `getContext(...)` returns
  `unknown`, so `marker`/`markerElement` are untyped and `.setLngLat` is missing.
  Fix by typing the map context (`getContext<ContextType>(key)`).

**Common sub-fix:** introduce a helper to fetch a `GeoJSONSource`
(`map.getSource(id) as GeoJSONSource`) so `setData`/`getClusterExpansionZoom`
type-check across GardenLayer/MeetupLayer/FileTrails, and type the map context so
DraggableMarker resolves.

**Risk:** Medium. Mostly casts to the correct GL types; low behavioural risk but
high volume and needs the map to be exercised to confirm.

</details>

### D. `Dropzone.svelte` internal typing — 19 errors — ✅ RESOLVED

**Fix applied (committed):**
- Gave the `$state` store explicit element types (`DropzoneFile` /
  `FileRejection`) so `draggedFiles`/`acceptedFiles`/`fileRejections` no longer
  infer as `never[]`.
- Replaced the ad-hoc synthetic-event parameter shapes on the drag/keyboard
  callbacks with real DOM event types (`KeyboardEvent`/`DragEvent`/`Event`), so
  they satisfy the `stopPropagation`/`isEvtWithFiles`/`isPropagationStopped`
  helpers and the Svelte element handler bindings.
- Replaced the garbage inferred overload-union parameter types on the
  `compose*Handler` helpers with a generic that preserves the handler type.
- Narrowed the rejection errors with a type predicate; reset `inputRef.value`
  to `''` instead of `null`.

> High-risk area (drag-and-drop plumbing): please test dropping/selecting a
> GPX file still works end-to-end.

<details><summary>Original analysis (kept for reference)</summary>

**File:** `src/lib/components/UI/Dropzone.svelte` (lines 84, 132, 136, 139, 151,
166, 185, 187, 189, 214, 215, 219, 240, 249, 313, 316–320).

**Root cause:** The util (`dropzone.ts`) is now typed, but the component has its
own problems that remain:
- `state.draggedFiles/acceptedFiles/fileRejections` initialise to `[]` and get
  inferred as `never[]` (needs explicit element types on the `$state` object).
- A bespoke synthetic-event abstraction passes ad-hoc `{ preventDefault?, target? }`
  objects where real DOM `Event`s are expected.
- A local `composeEventHandlers`-style path produces incompatible handler-union
  signatures (lines 240–320).
- `inputRef.value = null` (line 84) — `value` is a `string`.

**Risk:** High. This is drag-and-drop event plumbing; getting the event types
right without breaking the interaction needs careful manual work and real testing.

</details>

### E. Data-model / product decisions needed — ~8 errors

- `src/lib/models/User.ts:216` — an object built as `{ [x: string]: boolean }` is
  assigned to `EmailPreferences` (requires `newChat`, `news`). Type the builder so
  the required keys are guaranteed. (Related: the account page now casts the
  checkbox `name` to `'newChat' | 'news'`.)
- `src/lib/components/Garden/Form.svelte:27,97` + `GardenDraft.location` — the draft
  form legitimately holds `location: null` while editing, but
  `GardenDraft.location` is `LongLat` (non-null). Making it `LongLat | null` is the
  correct model but changes the `onsubmit` contract used by `garden/add` and
  `garden/edit` — **needs a decision** on where the non-null guarantee is enforced.
- `src/lib/components/Garden/GardenDrawer.svelte:439` — `userInfo.languages` does
  not exist on `UserPublic`. The block hardcodes "Dutch & English" and is guarded
  by an always-undefined field — looks like **dead / WIP code**. Decide whether to
  remove it or add a real `languages` field.
- `src/lib/components/Map/FileTrailModal.svelte:40,41` — comparisons between state
  literals `'SELECTING'` and `'DONE'` that "have no overlap": the state-machine
  union type doesn't include the compared value. Needs the state type widened or
  the comparison corrected (possible real logic bug).
- `src/routes/[[lang]]/(stateful)/chat/[name]/[chatId]/ChatGuidelines.svelte:20,21`
  — `Object.keys(...)` / spread over an `unknown` i18n value; needs the i18n lookup
  result typed/asserted as an object.

**Risk:** Mixed — several of these may be latent bugs, not just typing gaps.

### F. Known upstream limitation / small component-prop gaps — 2 errors — ✅ RESOLVED

- `src/lib/components/Membership/MembershipLevel.svelte:78` — `for={…}` on a
  `<svelte:element this={is}>`. **Looked up `sveltejs/language-tools#1576`:** it is
  marked "fixed in master / pending release" and is actually about
  `sveltekit:prefetch`, not `for`; the underlying limitation is that a dynamic
  `<svelte:element this={is}>` can't narrow the tag, so the checker widens to a
  generic `HTMLAttributes` that lacks label-only attributes like `for`. Rather than
  wait on upstream (we're already on Svelte 5), the fix **spreads a loose attribute
  record** (`{...dynamicAttributes}`) that carries `for` only when rendering a
  `<label>` — runtime behaviour is identical and the stale TODO/link is removed.
- `src/routes/[[lang]]/(static)/terms/privacy-policy/+page.svelte:83` — `<Ol>` now
  declares `class?: string` and **forwards it to the `<ol>`** (previously the class
  was silently dropped). Only one call site passes `class`, so no fallout.

### G. Test files — 3 errors — ✅ RESOLVED

- `tests/e2e/MainFlow.ts:225` — cast the Stripe e2e no-key `Proxy` fallback to
  `Stripe` so the default export is consistently typed. This surfaced two
  previously-masked real issues, also fixed: narrowing the retrieved customer
  against `DeletedCustomer` and guarding the possibly-undefined `customerId`.
- `tests/e2e/tests.spec.ts:51,57` — supplied `testInfo` in the `StraightToMember`
  and `GardenEdit` test contexts (matching the existing main-flow test) so they
  satisfy `TestContext`.

**Risk:** Low (test-only).

---

## Warnings (19) — not addressed

All remaining items are **warnings**, not errors, and are mostly non-typing:
- **a11y** (`a11y_no_noninteractive_element_interactions`,
  `a11y_no_static_element_interactions`, `a11y_incorrect_aria_attribute_type_boolean`):
  Tag, Notifications, LabeledCheckbox, LabeledRadioButton, LearnMoreArrowSection.
- **Svelte 5 `state_referenced_locally`** (reading a `$state`/prop outside a
  `$derived`/closure): Banner, CoordinateForm, GardensTools, MembershipPricing,
  auth/action, explore/+layout. These are runtime-reactivity smells worth a
  separate review pass.
- **Unused CSS selectors**: Garden/Form (`p.notice`), ResponseRateTimeLines,
  Membership/SliderRadio (`.superfan-levels`).
