# Student Activity Tab — Implementation Plan

Translate the design at `mockups/student-activity-revamp.html` into production code on `treinoway-web` (frontend) with backend extensions to `treinoway-service` where the current API is insufficient.

## Source of truth
- **Mockup:** `mockups/student-activity-revamp.html` (6540 lines, mobile + desktop frames + 5 states + design notes)
- **Design system:** `.claude/skills/apply-design/SKILL.md`
- **Tokens:** `src/index.css`
- **Current implementation:** `src/pages/trainer/StudentActivityTab.jsx`
- **Hook:** `src/hooks/useStudentDashboard.js`
- **Backend schema:** `treinoway-service/api/schemas/student-dashboard-route.schema.js`

Always cross-check this plan against the mockup. The mockup wins where text disagrees with file.

---

## Scope

Replace the Student Activity tab with the Pulse Band cockpit composition:
- Dark `theme-stadium` band on top fusing protocol sash + adherence number + 30-bar waveform + 4 stat-chips
- Below: instrument-panel session rows (left on desktop) + progressão de carga with conditional sparklines (right on desktop)
- 5 states: warning (default), success, empty (aluno novo), heatmap (≥60d), tooltip-on-bar interaction, skeleton (loading)
- Floating IArnold FAB (existing, lightly tweaked)

**Out of scope for this PR (defer):** próxima sessão surface, "enviar mensagem ao aluno" CTA, anamnesis status badge, full session detail drilldown via tooltip click.

---

## Backend gaps (Phase 0 — blocker)

The current `useStudentDashboard` hits 3 endpoints that don't carry enough data for the new viz. Backend must extend before frontend can ship.

### Gap 1 — Daily series for waveform + heatmap
**Current:** `recent-sessions` returns up to 20 most-recent rows. No per-day series.
**Need:** Per-day timeline for the full period window.

**New endpoint:** `GET /trainer/students/:studentId/dashboard/daily-activity`
```
querystring: { dateFrom, dateTo }
response.data: [
  {
    date: "2026-04-25",                // YYYY-MM-DD
    status: "completed" | "partial" | "abandoned" | "empty",
    volumeKg: number | null,           // Σ load × reps for the day
    sessionId: string | null,
    trainingId: string | null,
    trainingName: string | null,
    completedSets: int,
    totalSets: int,
  }
]
```
**V1 simplificado:** sem distinção `rest` vs `missed` (drops calendário-protocolo logic, ~70% do custo). Apenas `empty` quando dia não tem sessão completed/partial/abandoned. Trainer não enxerga "aluno faltou um treino planejado" em V1 — adicionar V2 quando justificar custo.

### Gap 2 — Load history for sparkline
**Current:** `exercise-progression` returns `latest` + `trend.maxLoadDeltaPct` only.
**Need:** Last 6 max-load values per exercise so the frontend can compute the conditional sparkline predicate and render bars.

**Schema extension** (additive, non-breaking):
```js
// In progression item schema:
loadHistory: {
  type: 'array',
  items: { type: 'number', nullable: true },
  maxItems: 6,                         // most-recent first
}
```

### Gap 3 — Session note + RPE on session row
**Current:** `recent-sessions` items have no observation/RPE data.
**Need:** Inline note on the most-recent row + chat icon trigger on others.

**Schema extension:**
```js
// In recent-sessions item schema:
avgRpe: { type: 'number', nullable: true },
noteText: { type: 'string', nullable: true },
```
Backend pulls from `WorkoutSession.notes` + `SetLog` aggregation.

**V1 sem `painLevel`:** schema atual não captura dor. Adicionar quando student app capturar — frontend não renderiza `--has-pain` tint em V1.

### Gap 4 — Derived stats for the 4 stat-chips
The mockup hero chips: **Vs anterior** (already computed via previous-period), **Maior streak** (consecutive completed days), **Treinos / sem** (total / weeks-in-period), **Sem treinar** (days since last completed session).

Cleanest path: add to the `summary` response.
```js
// In summary schema:
maxStreakDays: { type: 'integer', nullable: true },
sessionsPerWeek: { type: 'number', nullable: true },
daysSinceLastSession: { type: 'integer', nullable: true },
```

### Phase 0 deliverables
- New endpoint `daily-activity` (route, schema, service, tests) — status apenas `completed | partial | abandoned | empty`
- Schema extensions on existing 2 endpoints (additive): `loadHistory` em `exercise-progression`; `avgRpe` + `noteText` em `recent-sessions`; `maxStreakDays` + `sessionsPerWeek` + `daysSinceLastSession` em `summary`
- Service-layer updates to populate new fields
- E2E tests covering edge cases (no sessions, single session, streak across period boundary)

**Estimated effort:** ~1-1.5h (V1 simplificado — drops `painLevel` + drops `rest`/`missed` distinction).

---

## Frontend file plan

### New components (`src/components/`)
| Component | Test | Purpose |
|---|---|---|
| `PulseBand.jsx` | `PulseBand.test.jsx` | Composite hero: sash + diagnosis + waveform/heatmap + stats. Accepts `state` prop (`warning` / `success` / `empty` / `loading`) |
| `PulseWaveform.jsx` | `PulseWaveform.test.jsx` | 30 bars, height=volume, color=status, top-cap glyph, today marker, tooltip-on-hover |
| `PulseHeatmap.jsx` | `PulseHeatmap.test.jsx` | 13×7 grid, intensity-encoded, today ring + HOJE tag, first-row flip detection |
| `PulseTooltip.jsx` | `PulseTooltip.test.jsx` | Stadium-elevated surface, collision detection (`--left-anchored` / `--right-anchored`), pt-BR copy |
| `PulseStatChip.jsx` | `PulseStatChip.test.jsx` | Single chip with label + value + optional aria-label override |
| `SessionInstrumentRow.jsx` | `SessionInstrumentRow.test.jsx` | 5-col grid: status bar + date block + body + meta + trigger placeholder/icon. Inline note expansion |
| `ProgressionRow.jsx` | already exists (in `StudentActivityTab.jsx`) — extract + extend with sparkline | |
| `ProgressionSparkline.jsx` | `ProgressionSparkline.test.jsx` | 6-bar mini chart with `shouldShowSparkline()` predicate |

### New utils (`src/utils/`)
| File | Purpose |
|---|---|
| `shouldShowSparkline.js` (+ test) | Predicate from design notes: `direction_changed_in_last_3 OR abs(lastDeltaPct) > 5 OR cv(loads) > 0.08` |
| `computeDailyActivityViz.js` (+ test) | Map `daily-activity` payload → `{ bars: [...], heatmap: [...] }` per period preset |
| `formatRpe.js` (+ test) | `7.5` → `"RPE 7,5"` (pt-BR comma, no decimal when integer) |

### New constants (`src/constants/`)
| File | Purpose |
|---|---|
| `dashboardViz.js` (+ test) | `WAVEFORM_THRESHOLD_DAYS = 60`. Function `pickViz(periodDays)` → `'waveform' \| 'heatmap'`. Status palette map. |

### Hook updates (`src/hooks/`)
- **`useStudentDashboard.js`** — add a 5th block `dailyActivity` to the parallel fetch. Same caching/abort pattern. Update returned shape.
- New: **`usePulseTooltip.js`** (+ test) — manages open/close + collision direction (`left` / `center` / `right`) based on bar index and viewport width. Keyboard accessible.

### Page updates (`src/pages/trainer/`)
- **`StudentActivityTab.jsx`** — replace render tree with the new components. Keep:
  - `PeriodPickerSheet` integration
  - `usePeriodPersistence` hook
  - `useAiChat` + `IArnoldFAB` (no change to behavior; emphasized state already wired)
  - `dashboard.studentNotFound` handling
  - `handleSwitchToYear` empty-state escape hatch (now lives in `EmptyDataMessage` action)
- Delete: `groupProgressionByTraining`, `sliceVisibleGroups`, `expandAllGroups` helpers — moved into a `useProgressionGroups` hook for testability.

### CSS (`src/index.css`)
Single new section appended at bottom: `/* === Student Activity Tab — Pulse Band cockpit === */`. Copy CSS from the mockup verbatim, keeping all class names and modifiers. Specifically:
- `.pulse-band`, `.pulse-band--loading`, `.pulse-sash`, `.pulse-sash-actions`
- `.pulse-number`, `.pulse-status`, `.pulse-aside`
- `.pulse-wave`, `.pulse-bar`, `.pulse-bar-fill`, `.pulse-bar-fill::before` (cap glyph)
- `.pulse-bar--today`, `.pulse-wave-key`
- `.pulse-heatmap-grid`, `.pulse-heatmap-cell`, `.pulse-heatmap-cell--today`, `--today--first-row`
- `.pulse-stats`, `.pulse-stat-chip`, `.pulse-stat-value`, `.pulse-stat-label`
- `.pulse-tooltip`, `.pulse-tooltip--left-anchored`, `.pulse-tooltip--right-anchored`
- `.pulse-empty-welcome-overlay`
- `.session-row` (5-col grid), `.session-bar`, `.session-date-block`, `.session-meta`, `.session-note`, `.session-note-trigger`, `.session-trigger-placeholder` (V1 não inclui `--has-pain` modifier — sem dado de dor no backend)
- `.progression-spark`, `.progression-spark--hidden`
- `.scan-zone`, `.scan-zone-stack`, `.scan-zone-section-note`
- `.sr-only` utility (only if not already present — check first)
- `.theme-stadium` overrides where necessary (likely already exists)

All `@media (min-width: 768px)` and `@media (min-width: 1024px)` overrides come from the mockup.

---

## Phases

### Phase 1 — Foundations (no UI change)
1. Backend: ship Phase 0 endpoint + schema extensions behind a feature flag if available, or as additive responses.
2. Frontend: extend `useStudentDashboard` to fetch `daily-activity` + read new fields. Tab still renders the old layout; new fields are dormant.
3. Add new constants + utils + tests.

**Acceptance:** old tab still works. New endpoint returns valid data. `npm run lint` clean. New util/constant tests pass.

### Phase 2 — Pulse Band (replace hero + protocol context)
1. Build `PulseBand`, `PulseWaveform`, `PulseStatChip`, `PulseTooltip` components + tests.
2. Wire into `StudentActivityTab` replacing the existing `activity-hero` + `activity-protocol-context` + (placeholder for) streak.
3. Implement state variants (`warning` default, `success` when adherence ≥ 0.80, `empty` when no sessions, `loading` skeleton).
4. Heatmap variant when period days ≥ 60 (drives `pickViz`).

**Acceptance:** all 4 PulseBand states render correctly across mobile + desktop. Tooltip collision detection works on edge bars (test at index 0 and index 29). Visual diff against mockup. All component tests green.

### Phase 3 — Sessions instrument panel
1. Build `SessionInstrumentRow` + test.
2. Integrate session note inline on most-recent row when `noteText` present.
3. Replace existing `activity-session-list` block.

**Acceptance:** rows render uniformly (5-col grid with placeholder for missing trigger). Status bars vertically aligned. Inline note expands without grid jank. Tests cover: no note + with note + abandoned status + partial status. (V1 sem `painLevel` — `--has-pain` modifier deferido pra V2.)

### Phase 4 — Progressão with conditional sparkline
1. Extract existing `ProgressionRow` from `StudentActivityTab.jsx` into `src/components/ProgressionRow.jsx`.
2. Build `ProgressionSparkline` + `shouldShowSparkline` predicate util.
3. Wire `loadHistory` from extended API into row render. Sparkline hidden on mobile (`@media`); on desktop, modifier `.progression-spark--hidden` applied per-row based on predicate.
4. Promote `TrendChip` to right-anchor `--lg` size.

**Acceptance:** monotonic exercises hide spark, volatile/inflection show it. TrendChip readable from desktop scan distance. Mobile rows have no spark column. Predicate unit-tested with: pure ascending, pure descending, flat, single dip, plateau-then-jump, all-null.

### Phase 5 — Polish + states gallery validation
1. Tooltip keyboard nav (`Tab` to bar → `Enter`/`Space` opens → `Esc` closes).
2. `prefers-reduced-motion` audit on all animations (skeleton shimmer, dot pulse, hover scale).
3. State E (skeleton) integration: shows during initial load + period-change refetch.
4. Manual visual diff vs every mockup state (warning, success, empty, heatmap, tooltip, skeleton — both mobile and desktop).

**Acceptance:** Lighthouse a11y ≥ 95 on the tab. Keyboard-only test passes. All mockup states reproducible by toggling test data.

---

## Tests required

Per RULE 1 (`treinoway-web/CLAUDE.md`): every code change ships with tests.

### Per-component test coverage minimum
- `loading` / `empty` / `error` / `success` states
- Interaction events (click, hover, keyboard)
- API mock conditional responses
- Both render-success and render-cancel paths where applicable
- Accessibility: queries by role/label/placeholder only

### Specific test cases to call out
- `PulseWaveform`: today marker visible at index 0 / mid / 29 — all three positions; tooltip flip on edges
- `PulseHeatmap`: today on first row triggers `--today--first-row` modifier; legend swatches don't scale on hover
- `PulseTooltip`: keyboard open/close; collision flip when `barIndex < 4` and `barIndex > 25`
- `SessionInstrumentRow`: missing trigger renders placeholder span (not omitted); inline note doesn't break grid alignment
- `ProgressionSparkline`: hidden when `shouldShowSparkline` returns false
- `shouldShowSparkline`: monotonic ascending → false; flat → false; one dip → true; null-heavy series → false (graceful)
- `pickViz(periodDays)`: 30→waveform, 60→heatmap, 90→heatmap, 7→waveform
- `useStudentDashboard`: adds `dailyActivity` block; period change cancels in-flight; cached results re-render

### E2E (Playwright)
- Full Activity tab loads for a student with mid-adherence + 90 days period (heatmap path)
- Switch period → skeleton flashes → new data renders
- Click TrendChip on a row → navigates to ExerciseProgressionDetail with correct query params
- IArnold FAB click → AI assistant route + prefilled message

---

## Edge cases to verify (from mockup)

- **Aluno novo (no sessions ever):** adherence shows `—` em-dash, sash flips to "Atribuir rotina" CTA, sessions section shows welcome card, progressão hidden entirely, FAB calm (no halo).
- **Adherence ≥ 80% (success):** green palette but warning/error rows in progressão keep their colors. Watch callout on desktop right column highlights any one exercise needing attention. FAB calm.
- **Period 90 days:** waveform → heatmap automatically. Today marker = ring + HOJE tag. If today on first row, tag flips to bottom of cell.
- **Tooltip on edge bar (mobile):** anchor flips left/right based on bar index. Caret follows. No overflow at 375px.
- **All sessions abandoned:** waveform predominantly red. Status pill "Atenção". FAB emphasized with halo.
- **Single-session exercise:** TrendChip shows `—`, sparkline hidden (predicate false: no history), trail shows `1 sessão`.
- **20-exercise cap from API:** footnote "Mostrando os 20 mais frequentes neste período" shown.
- **Long student/exercise names:** truncate with ellipsis (already in mockup CSS).
- **Missing protocol:** sash becomes `Atribuir rotina` button inline. Same height as filled sash.
- **Reduced motion preference:** all shimmer/pulse animations stop.

---

## Risks

1. **Backend daily-activity computation cost.** A 90-day window with `planned` vs `done` per day requires joining the protocol calendar. Profile before merging. Cache aggressively (period cache key).
2. **Sparkline predicate may be too noisy.** Variance threshold (`cv > 0.08`) was picked to filter 0.5kg quantization. May trigger too often on lower body lifts. Iterate after collecting trainer feedback in beta.
3. **Heatmap 90-day rendering on small phones (<360px).** 13 weeks × 7 days at 2px gap. May overflow. Add horizontal scroll inside the band as fallback if testing reveals overflow.
4. **`pulse-empty-welcome-overlay` z-index conflicts** with FAB at low viewports. Verify FAB sits above (z-index: 50, overlay should be below).
5. **Memory feedback rule "zero inline styles":** the only inline style allowed in the new code is `style={{ height: \`${pct}%\` }}` on bars/sparks (data-driven). Lint rule (if exists) may flag it — add to allowlist or document exception.

---

## Cross-package coordination

| Step | Package | Owner |
|---|---|---|
| 1 | Backend: design + ship Phase 0 endpoint + schema extensions | `treinoway-service` (delegate to `ai-flow-engineer` if AI logic involved; otherwise plain backend work) |
| 2 | Frontend: Phases 1–5 | `frontend-engineer` (per RULE 0 in `treinoway-web/CLAUDE.md`) |
| 3 | i18n keys for new copy ("Atribuir rotina", "Pronto para começar", stat labels, status pills) | `frontend-engineer` adds to `src/i18n/locales/pt-BR.js` |
| 4 | E2E tests | `frontend-engineer` extends Playwright suite |

Backend ships first (Phase 0). Frontend can mock responses locally to start Phases 2–5 in parallel after schemas are agreed.

---

## Definition of done

- Phase 0–5 acceptance criteria all met
- All new tests pass (`npm run test:run` on web + service)
- `npm run lint` clean (memory rule: 0 problems)
- Manual visual diff against mockup at 375px and 1280px for each of the 5 states
- Lighthouse a11y ≥ 95 on the Student Activity tab
- No inline styles except data-driven `height:NN%`
- pt-BR copy reviewed (no slang, professional tone per memory rule)
- Backend Swagger updated, frontend i18n updated
- Plan and mockup linked from the PR description
