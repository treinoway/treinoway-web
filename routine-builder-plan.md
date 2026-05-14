# Routine Builder — Implementation Plan

Translate the design at `mockups/routine-builder-summary.html` into production code on `treinoway-web`. Frontend-only — backend contracts unchanged.

## Source of truth

- **Mockup:** `mockups/routine-builder-summary.html` (1213 lines · desktop + mobile drawer + AddExercise sheet · 8 spec sections)
- **Design system:** `.claude/skills/apply-design/SKILL.md` (invoke `/apply-design` before finalising CSS)
- **Tokens:** `src/index.css`
- **Current implementation:** `src/pages/trainer/RoutineBuilder.jsx` (2270 lines)
- **Test file:** `src/pages/trainer/RoutineBuilder.test.jsx`

Mockup wins where text disagrees.

---

## Scope

Rebuild RoutineBuilder workspace as 3-column cockpit:

- **Left rail (288px):** outline navegável · header-only por padrão · expand only current · search + filter chips · "Sem dia" pin · duplicate badges
- **Canvas (flex):** training cards + exercise rows · drag handles · dup tint warn · max-width removed (fills between rails)
- **Right rail (240px):** Balance score XL + muscle volume heatmap with target markers
- **AddExercise sheet:** cross-day mini-list when duplicate detected · 3 CTAs (Cancelar / Mover de X / Adicionar mesmo assim)
- **Mobile (<1024px):** outline → bottom drawer · volume rail → top card · long-press drag

Out of scope (defer):

- Cross-training drag (move exercise from A to B) → v1.1
- Volume targets configuration sheet → v1.1 (defaults inferred from frequency × experience)
- Backend dup detection / muscle aggregation (all client-side)
- Rotated routine letters preservation when reordering custom-named trainings

---

## Backend gaps

**None.** Everything client-side:

- Duplicate detection: `exerciseTemplateId` match (preferred) or normalized name (lowercase, accent-stripped)
- Muscle aggregation: read `muscleGroup` tag from existing `exerciseTemplate` payload
- Reorder: existing PATCH endpoints accept array order (verify in service layer)

If `muscleGroup` is missing from current `exerciseTemplate` schema, see Phase 1 — may need additive field.

---

## Phases

### Phase 0 — Verify existing data shapes (1h)

- Confirm `exerciseTemplate.muscleGroup` returned by current API. If absent, add as additive field on `treinoway-service` schemas (non-breaking).
- Confirm reorder endpoints exist for trainings + exercises. If missing, add `PATCH /trainer/trainings/:id/reorder` accepting `{ orderedIds: [...] }`.
- Confirm `lastSavedAt` timestamp is on routine response or derive from `updatedAt`.

### Phase 1 — Layout shell (3-column cockpit) (4h)

**File:** `src/pages/trainer/RoutineBuilder.jsx` lines 1959–2096 (`builder-shell` + `training-canvas`).

- Wrap workspace in `.builder-workspace` flex row: `.outline` (288px) + `.canvas` (flex:1) + `.volume-rail` (240px).
- Remove `max-width:760px` from canvas-inner.
- Breakpoints in `src/index.css`:
  - `≥1024px`: 3-column.
  - `768–1023px`: hide volume-rail (becomes top `.volume-card`); outline becomes drawer.
  - `<768px`: same as above + sticky outline trigger bar.

**Tests:** snapshot at 3 breakpoints · drawer open/close · volume-card visible at md.

### Phase 2 — Outline rail (6h)

**New components:**

- `src/components/RoutineOutline.jsx` — full rail (search, filter chips, sem-dia pin, training list)
- `src/components/RoutineOutlineTraining.jsx` — collapsible training row (header-only by default)
- `src/components/RoutineOutlineExercise.jsx` — 24px exercise row with mini-stat

**Behaviours:**

- **Default state:** only the training currently in view is expanded. "In view" tracked via IntersectionObserver — passive signal.
- **Selected state:** explicit click on chevron locks expand. IO never overrides.
- **Click on name:** `scrollIntoView({ block: 'start', behavior: 'smooth' })` + auto-expand.
- **Filter chips:** Tudo / Peito / Costas / Pernas / Ombro / Core. Filter both rail AND canvas (not rail-only).
- **Search:** debounced 200ms · matches exercise names · placeholder "Buscar exercício…".
- **Sem-dia pin:** when N trainings have no `weekday`, show warn chip after filters: `⚠ N treino(s) sem dia · <name>`. Click → scrolls to "Sem dia" section.
- **Pulse dot tooltip:** on `outline-section-label` hover → "verde = completo · laranja = incompleto · cinza = sem dia".

**Hooks:**

- `useOutlineActive(canvasRef)` — IO returns currently-in-view training id
- `useRoutineFilter(trainings, query, muscleFilter)` — returns filtered tree

**Tests:** rail renders all trainings · expand/collapse via chevron · click name scrolls + expands · filter narrows tree · sem-dia pin appears only when needed · search debounces.

### Phase 3 — Duplicate detection (3h)

**Hook:** `src/hooks/useRoutineDuplicates.js`

```js
useRoutineDuplicates(routine) → Map<exerciseId, {count, locations: [{trainingId, trainingName, weekday, sets, reps, load, rest}]}>
```

- Match by `exerciseTemplateId` (preferred) or `normalize(name)` (lowercase, NFD-strip-accents).
- Recomputes on every mutation (add/edit/remove exercise).

**UI signal triple (rail):**

1. Row tinted: `background: rgba(181, 90, 2, 0.06)` (use `--warn-c` token).
2. Badge `×N` after exercise name (warn color, `font-stat`).
3. Icon `Copy` from lucide (11px) at row end · `title="Já existe em <Treino X · Dia>"`.

**UI signal (canvas):**

- `.exercise-row-wide--dup`: tint `rgba(181, 90, 2, 0.07)` + `inset 0 0 0 2px var(--warn)`.
- Meta line appends: `· repetido em B · Ter` (warn color, weight 600).

**Header-collapsed badge:** `×1 dup` chip in `training-item-meta` if any exercise inside has duplicates.

**Tests:** detection by templateId · detection by normalized name · counts increment correctly · rail and canvas both show signals · header badge appears.

### Phase 4 — Volume rail (5h)

**New components:**

- `src/components/RoutineVolumeRail.jsx` — full rail (Balance hero + muscle list)
- `src/components/RoutineBalanceScore.jsx` — StatDisplay XL 44px Space Grotesk
- `src/components/RoutineMuscleRow.jsx` — name + sets + bar with target marker

**Hook:** `src/hooks/useRoutineVolume.js`

```js
useRoutineVolume(routine) → {
  balanceScore: 0–100,
  primaryAlert: string | null,
  muscles: [{ id, name, sets, target, status: 'ok' | 'below' | 'above' }]
}
```

- Aggregate `sets` per `muscleGroup` across all trainings.
- Targets: defaults from `src/constants/training.js` (Peito 12, Costas 14, Pernas 16, Ombro 8, Tríceps 10, Bíceps 10, Core 8).
- Score: `100 × (musclesInRange / totalTracked)`.
- Status colors: `ok` → `--success`, `below`/`above` → `--warn`. **Never `--error`.**
- Untagged exercises → bucket "Outros", excluded from score.

**Mobile fallback:** `.volume-card` shows only Balance score + 1-line alert. Tap → `<VolumeRailSheet>` bottom-sheet.

**Tests:** score calculation · target marker placement · warn flags correctly · empty state shows `—/100` · untagged exercises bucketed.

### Phase 5 — Cross-day mini-list in AddExercise sheet (3h)

**File:** existing AddExercise sheet inside RoutineBuilder.

- When user picks an exercise that has duplicates (use `useRoutineDuplicates`), expand banner into mini-list:
  - Up to 3 occurrences: `[day-tag] [training-name] · 4×8 · 80kg · 90s`
  - Each row tappable → close sheet + scroll to that exercise.
  - "+N mais" if >3.
- 3 CTAs replace single CTA:
  - `Cancelar` (secondary)
  - `Mover de <Treino X>` — only if 1 occurrence; calls remove-from-X + add-to-current
  - `Adicionar mesmo assim` (primary)
- If no duplicate, sheet is unchanged.

**Tests:** sheet shows mini-list when dup exists · tap row scrolls + closes · "Mover" appears only with 1 occurrence · "Mover" performs both operations · "Adicionar mesmo assim" is primary.

### Phase 6 — Drag handles & reorder (4h)

**Library:** add `@dnd-kit/core` + `@dnd-kit/sortable` if not present (verify package.json).

- Wrap training list and exercise list in `<SortableContext>`.
- Add `<DragHandle>` (lucide `GripVertical`) at start of training-head and exercise-row.
  - Desktop: `opacity:0` default · `opacity:1` on row hover · `--outline` idle · `--steel` hover.
  - Mobile: hidden visually · long-press 500ms on row activates drag.
- On drop: PATCH `/trainer/trainings/:id/reorder` (or whatever endpoint Phase 0 confirmed).
- Optimistic update + rollback on error.
- **Cross-training drag deferred** to v1.1 — handlers only allow within same parent.

**Tests:** drag handle visible on hover · drop reorders array · API called with correct order · rollback on error · long-press activates mobile (skip if jsdom can't simulate).

### Phase 7 — Polish (3h)

- **Save status:** `"Salvo · há Ns"` via `useRelativeTime(lastSavedAt)` hook updating every 10s. After 5min → "Salvo · há alguns min".
- **Topbar CTA rename:** "Concluir" → "Salvar e fechar" (i18n key).
- **More-vertical menus:** desktop hover-only via `data-more` attribute + opacity transition. Mobile always visible.
- **Mobile outline rows:** `min-height: 36px` variant.
- **Edge case states:**
  - Rotina vazia: outline + volume show empty messages.
  - Read-only: hide drag handles, more-vertical, "+ Adicionar".
  - Long names: ellipsis + native `title` tooltip.

**Tests:** save status updates · CTA renamed · hover reveals more · empty states render · read-only hides actions.

### Phase 8 — i18n + lint + final (1h)

- Add new keys to `src/i18n/locales/pt-BR.js` and `en.js`:
  - `routineBuilder.outline.*` (search placeholder, sem-dia pin, filter chips, tooltip)
  - `routineBuilder.volume.*` (Balance label, alert text)
  - `routineBuilder.duplicate.*` (badge tooltip, mini-list, CTAs)
  - `routineBuilder.save.*` (relative time, CTA)
- Run `npm run lint` — must exit clean (0 issues).
- Run `npm run test:run` — all tests pass.
- `npm run dev` — manual smoke at 375px / 768px / 1280px.

---

## CSS — new sections in `src/index.css`

Add to existing routine builder section:

- `.builder-workspace` — flex row, 3-col grid behaviour
- `.outline`, `.outline-head`, `.outline-search`, `.outline-filters`, `.outline-pin-warn`
- `.outline-training`, `.outline-training-toggle`, `.outline-children`, `.outline-exercise`
- `.outline-exercise--dup`, `.outline-exercise-stat`, `.outline-exercise-dup-badge`
- `.volume-rail`, `.volume-balance`, `.volume-muscle-row`, `.volume-bar`, `.volume-target-marker`
- `.volume-card` (mobile fallback)
- `.exercise-row-wide--dup` (canvas dup tint)
- `.training-item-dup-badge` (header-collapsed dup count)
- `.drag-handle`, `.drag-handle--training`, `.drag-handle--exercise`
- `.dup-banner-minilist`, `.dup-minilist-row`, `.dup-minilist-cta-group`

Zero new hex. Reuse `--warn`, `--warn-c`, `--success`, `--steel`, `--outline`, `--mist`.

---

## Test strategy

Per CLAUDE.md Rule 1 — every component gets a `.test.jsx` sibling. New tests:

- `RoutineOutline.test.jsx`
- `RoutineOutlineTraining.test.jsx`
- `RoutineOutlineExercise.test.jsx`
- `RoutineVolumeRail.test.jsx`
- `RoutineBalanceScore.test.jsx`
- `RoutineMuscleRow.test.jsx`
- `useRoutineDuplicates.test.js`
- `useRoutineVolume.test.js`
- `useOutlineActive.test.js`
- `useRoutineFilter.test.js`

Update `RoutineBuilder.test.jsx` for layout shell + reorder + sheet integration.

Mock `IntersectionObserver` in `src/test/setup.js` if not already.

---

## Estimated effort

| Phase | Hours |
|---|---|
| 0 · Backend verify | 1 |
| 1 · Layout shell | 4 |
| 2 · Outline rail | 6 |
| 3 · Duplicate detection | 3 |
| 4 · Volume rail | 5 |
| 5 · AddExercise mini-list | 3 |
| 6 · Drag & reorder | 4 |
| 7 · Polish | 3 |
| 8 · i18n + lint | 1 |
| **Total** | **30h** |

Single PR (one commit per phase). Frontend-engineer agent owns implementation per Rule 0.

---

## Out of scope (defer to v1.1)

- Cross-training drag (move exercise A → B)
- Volume targets configuration sheet
- Routine letter (A/B/C) preservation logic when reordering custom-named trainings
- Theme-stadium partial on header (cockpit upgrade — separate iteration)
- Keyboard shortcuts (J/K, /, T, D)
- Rail collapse to 44px icon-only mode
