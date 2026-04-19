---
name: apply-design
description: Canonical Treinoway design system reference. Apply before finalising any component, page, or CSS change — covers tokens, component catalog, interaction states, mobile-first rules, accessibility, anti-patterns, and review checklist.
compatibility: Designed for Claude Code on the treinoway-web project
---

Review every UI change in the current task against all sections below. Fix violations before finishing.

**Brand direction:** Athletic-Tech (Whoop + Strava 2024 DNA). When the token catalog offers a "legacy" alias (`--color-*`, `--md-*`, `--shadow-sm`, `--ease-out`, `--radius-sm`, `--font-h1-*`, etc.), always prefer the canonical `--brand-*` / `--radius-brand` / `--shadow-brand-*` / `--ease-brand` / `--font-family-display` equivalents in new code. Legacy aliases exist to keep older components compiling; they are not deprecation targets for mass-rewrite, but no new code should introduce them.

---

## 1. Princípios

1. **Mobile-first** — base styles target 375px; add complexity upward via `min-width: 768px` and `min-width: 1024px`. Never write desktop-first overrides.
2. **Touch targets** — every interactive element ≥44×44px on mobile. On `≥1024px` desktop, `min-height: 40px` is acceptable for buttons, `36px` for compact variants.
3. **Tokens always** — every color, spacing, radius, shadow, duration, z-index must come from a CSS variable defined in `src/index.css`. Zero raw hex, px literals, or magic numbers in components.
4. **Classes before new CSS** — check `src/index.css` for an existing class before writing a new one. Reuse first; extend via BEM modifiers second.
5. **Accessibility** — focus ring always visible (never `outline: none` without a visible substitute). `aria-label` required on every icon-only button. `role="alert"` on inline form errors.
6. **Lucide only** — `lucide-react` is the sole icon source, always with `strokeWidth={2}`.
7. **Never** `window.confirm`, `window.location.href` (internal nav), or `fetch` directly. Use the custom confirm dialog, `useNavigate()`, and `src/api/axios.js`.
8. **Inline styles** — acceptable only for computed/dynamic values (e.g. `style={{ width: \`${pct}%\` }}`). Never for fixed colors, spacing, or layout.
9. **UI text** in pt-BR following the controlled glossary (§7). Code, variables, functions in English.
10. **No `console.log`** in production code.

---

## 2. Token Foundation

All tokens live in `src/index.css` `:root`. Reference them as `var(--token-name)`.

### 2.1 Canonical tokens (use these in new code)

| Category | Token | Value | Semantic use |
|---|---|---|---|
| **Color — ink/surface** | `--brand-ink` | `#0A0F1C` | Titles, max-contrast text |
| | `--brand-slate` | `#1E293B` | Strong subtitles, body in dark context |
| | `--brand-steel` | `#64748B` | Metadata, timestamps, muted text |
| | `--brand-mist` | `#F1F5F9` | Section backgrounds, alt rows |
| | `--brand-divider` | `#E2E8F0` | 1px dividers between sections |
| | `--md-surface` | `#FFFFFF` | Card/modal backgrounds |
| | `--md-surface-container` | `#F0F1F4` | Page background sections |
| | `--md-surface-container-high` | `#E6E7EB` | Hover bg, alt rows |
| | `--md-outline-variant` | `#C7C7CC` | Input borders, outlined button borders |
| **Color — brand** | `--brand-primary` | `#0A5FCC` | Primary CTA, links, active states |
| | `--brand-primary-dark` | `#083E85` | Primary CTA hover/pressed |
| | `--brand-accent` | `#FF6B1A` | PRs, achievements, highlights. **Never in primary CTA** |
| | `--brand-accent-container` | `#FFF1EA` | Background for accent chips |
| **Color — status** | `--md-error` | `#D32F2F` | Error text, danger buttons |
| | `--md-error-container` | `#FDDEDE` | Error banner bg |
| | `--md-success` | `#2E7D32` | Success text, badges |
| | `--md-success-container` | `#D4EDDA` | Success banner bg |
| **Spacing** | `--spacing-xs` | `4px` | Icon gaps, tight inline padding |
| | `--spacing-sm` | `8px` | Internal element gaps |
| | `--spacing-md` | `16px` | Standard padding, form gap |
| | `--spacing-lg` | `24px` | Section padding, card padding |
| | `--spacing-xl` | `32px` | Between major sections |
| | `--spacing-xxl` | `48px` | Page top padding, hero spacing |
| **Radius** | `--radius-stat` | `4px` | Stat chips, compact badges |
| | `--radius-brand` | `8px` | Default for buttons, cards, modals, inputs |
| | `--radius-lg` | `20px` | Bottom-sheets, large modals |
| | `--radius-full` | `9999px` | Avatars, pill badges |
| **Shadow** | `--shadow-brand-sm` | subtle ink + 1px hairline | Cards at rest, buttons outlined |
| | `--shadow-brand-md` | deeper ink + hairline | Card hover, dropdown, row menu |
| | `--shadow-brand-lg` | max ink + hairline | Modals, bottom-sheets |
| | `--shadow-focus` | `0 0 0 2px var(--brand-primary)` | Focus ring on interactive elements |
| | `--shadow-stadium` | subtle light hairline | Cards inside `.theme-stadium` |
| **Motion** | `--duration-fast` | `150ms` | Hover, focus, press transitions |
| | `--duration-base` | `200ms` | Mount/unmount, fade-in |
| | `--duration-slow` | `300ms` | Overlays, slide-up sheets |
| | `--duration-achievement` | `280ms` | PR unlocks, confetti, celebration |
| | `--ease-brand` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default for hovers/transitions |
| | `--ease-kinetic` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Achievements (slight overshoot) |
| **Typography — family** | `--font-family-display` | `'Space Grotesk', ...` | H1, H2, section titles, stat numbers |
| | `--font-family-base` | `'Inter', ...` | Body, labels, inputs, buttons |
| | `--font-family-stat` | `'Space Grotesk', monospace` | Performance numbers (always with `tabular-nums`) |
| **Typography — tracking** | `--tracking-tight` | `-0.02em` | Display titles |
| | `--tracking-normal` | `0` | Body |
| | `--tracking-wide` | `0.08em` | Buttons, stat labels (UPPERCASE) |
| | `--tracking-wider` | `0.12em` | Eyebrows, overlines (UPPERCASE) |
| **Typography — line-height** | `--line-height-tight` | `1.2` | Headings |
| | `--line-height-normal` | `1.5` | Body |
| | `--line-height-relaxed` | `1.7` | Long-form/help |
| **Z-index** | `--z-base` | `1` | Default stacking |
| | `--z-dropdown` | `100` | Dropdowns, popovers, row menus |
| | `--z-sticky` | `200` | Sticky headers |
| | `--z-sidebar` | `300` | App sidebar |
| | `--z-overlay` | `1000` | Overlay backdrop |
| | `--z-modal` | `1100` | Modals, bottom-sheets |
| | `--z-toast` | `2000` | Toast notifications |
| | `--z-tooltip` | `3000` | Tooltips |

### 2.2 Typography scale (size + weight)

Athletic-Tech applies **Space Grotesk (display) for hierarchy** and **Inter (base) for everything else**.

| Use | Size | Weight | Family | Tracking | Notes |
|---|---|---|---|---|---|
| H1 page title | `28px` | `700` | display | `tight` | Mobile may shrink to `24px` via `clamp()` |
| H2 section | `22px` | `600` | display | `tight` | — |
| H3 card title | `18px` | `600` | display | `normal` | — |
| Body large | `18px` | `400` | base | `normal` | Emphasized paragraphs |
| Body | `16px` | `400` | base | `normal` | Default text |
| Body small | `14px` | `400` | base | `normal` | Secondary/meta text |
| Caption | `12px` | `400` | base | `normal` | Labels, captions |
| Button label | `13px` | `600` | base | `wide` (UPPERCASE) | Buttons, segmented toggles |
| Overline | `10–11px` | `700` | base | `wider` (UPPERCASE) | Eyebrows, stat labels |
| Stat number — default | `32px` | `600` | stat | `tight` | `tabular-nums` always |
| Stat number — hero | `48–72px` | `600` | stat | `tight` | `tabular-nums` always |
| Stat number — inline | `20–24px` | `600` | stat | `tight` | `tabular-nums` always |

Rule: any number that represents a **performance metric** (kg, %, reps, volume, aderência) uses `--font-family-stat` + `font-variant-numeric: tabular-nums`. Dates, counters, and non-metric integers use the body family.

### 2.3 Breakpoints

| Name | Min-width | Target |
|---|---|---|
| Mobile (base) | — | 375px |
| Tablet | 768px | Tablet landscape |
| Desktop | 1024px | Desktop |

Always `min-width` only. Never `max-width` breakpoints.

### 2.4 Legacy token aliases

The following aliases remain defined for backward compatibility. **Do not introduce them in new code** — pick the canonical `--brand-*` / `--md-*` surface / `--radius-brand` / `--shadow-brand-*` / `--ease-brand` / `--font-family-*` equivalents from §2.1.

| Legacy token | Canonical replacement |
|---|---|
| `--color-primary`, `--md-primary` | `--brand-primary` |
| `--color-on-primary`, `--md-on-primary` | `#FFFFFF` (no variable needed — always white on `--brand-primary`) |
| `--color-primary-container`, `--md-primary-container` | `--brand-accent-container` when the intent is an accent chip; otherwise rethink (tonal fills are not part of the brand) |
| `--color-secondary`, `--md-secondary` | `--brand-accent` |
| `--radius-sm` | `--radius-brand` |
| `--radius-md` (14px) | `--radius-brand` (8px) — **visual change**; see Roadmap |
| `--shadow-sm` / `--shadow-md` / `--shadow-lg` / `--shadow-hover` | `--shadow-brand-sm` / `--shadow-brand-md` / `--shadow-brand-lg` |
| `--ease-out`, `--ease-in-out` | `--ease-brand` |
| `--font-family-heading`, `--font-family-base` (legacy Open Sans comment) | `--font-family-display` (headings) / `--font-family-base` Inter (body) |
| `--font-h1-size` etc. | Use the §2.2 scale directly or define a brand-* size token |
| `--color-on-surface` | `--brand-ink` |
| `--color-on-surface-variant` | `--brand-steel` |

---

## 3. Layout System

### 3.1 App Shell

```
.app-layout          — flex row, full viewport
  .sidebar           — 16rem (≥768px), 5rem collapsed, hidden <768px
  .main-content      — flex-grow, scroll
    .top-app-bar     — mobile-only header
    .page-header     — page title + actions
    [page content]
```

Padding by breakpoint:

| Breakpoint | Padding |
|---|---|
| Mobile (<768px) | `var(--spacing-md)` (16px) |
| Tablet (≥768px) | `var(--spacing-lg)` (24px) |
| Desktop (≥1024px) | `var(--spacing-xl)` (32px) |

Safe areas for notch/home indicator:

```css
padding-bottom: max(var(--spacing-md), env(safe-area-inset-bottom));
padding-left: max(var(--spacing-md), env(safe-area-inset-left));
```

### 3.2 Page Header (mandatory pattern)

Every list/management page must open with:

```jsx
<div className="page-header">
  <div className="page-header-title-row">
    <Users size={24} strokeWidth={2} className="page-header-title-icon" />
    <h1>Meus Alunos</h1>
  </div>
  <div className="page-header-actions">
    <button className="btn-secondary"><Upload size={16} strokeWidth={2} /> Importar</button>
    <button className="btn-primary"><Plus size={16} strokeWidth={2} /> Vincular aluno</button>
  </div>
</div>
```

Rules:
- Icon matches the sidebar icon for that page, `size={24}`, `strokeWidth={2}`.
- `h1` at `28px` display/700/tight (see §2.2).
- The header never carries a subtitle-with-counters strip. Counters belong to the stats row (§4.18) or to filter tabs (§4.17); the header stays clean.
- Actions align to the right with `gap: var(--spacing-sm)`. Primary is always the rightmost button.

### 3.3 Brand Foundation — Athletic-Tech

DNA: Whoop + Strava 2024. Performance app for serious trainers who work with data.

Principles:
1. **Numbers are the voice** — large stat numbers in Space Grotesk + `tabular-nums`. Data > label.
2. **UPPERCASE tracking-wide for action** — buttons, stat labels, eyebrows.
3. **High contrast, focused color** — electric blue + alert orange + deep black.
4. **8px corners** — technical, sharp, not brutalist.
5. **Kinetic motion** — 150ms hover (`ease-brand`), 280ms achievements (`ease-kinetic` overshoot).
6. **Stadium mode (dark) for focus** — workout execution, summaries, detailed stats.
7. **Imperative voice, action-oriented, numbers always visible.**

### 3.4 Stadium palette (dark theme)

Activated by wrapping content in `<div className="theme-stadium">`. Children inherit via CSS cascade.

| Token | Value | Use |
|---|---|---|
| `--stadium-bg` | `#0A0F1C` | Stadium screen background |
| `--stadium-surface` | `#111827` | Cards/containers inside stadium |
| `--stadium-surface-elevated` | `#1E293B` | Elevated cards, hover surface |
| `--stadium-text` | `#F1F5F9` | Primary text in stadium |
| `--stadium-text-muted` | `#94A3B8` | Secondary/metadata text |
| `--stadium-accent` | `#38BDF8` | Electric blue highlight |
| `--stadium-accent-hover` | `#60CDFF` | Hover state for accent |
| `--stadium-divider` | `#1E293B` | Dividers inside stadium |

When to apply: workout execution, post-workout summary, detailed performance stat pages.
When **not** to apply: CRUD/admin screens (student list, forms, settings).

---

## 4. Componentes

### 4.1 Buttons

Canonical catalog:

| Class | Purpose | Visual |
|---|---|---|
| `btn-primary` | Main CTA | `--brand-primary` bg, white text, no border |
| `btn-secondary` | Secondary / outlined action | White bg (`--md-surface`), `--brand-ink` text, 1px `--md-outline-variant` inset border |
| `btn-danger` | Destructive confirm (inside confirm dialog) | `--md-error` bg, white text |
| `btn-delete` / `btn-delete-sm` | Single destructive row action | Error tint + subtle border |
| `btn-schedule-sm` | Tertiary add/schedule within a section | Transparent bg + accent outline |

Modifiers (composable with the above via `className="btn-primary btn-sm"`):

| Modifier | Effect |
|---|---|
| `btn-sm` | Compact: smaller padding, font `12px`, min-height 36px |
| `btn-primary-full` / `btn-secondary-full` | `width: 100%`, min-height 44px. Use in mobile forms or when the button is the only CTA of a section |

Default button shape (all variants):
- `font-family: var(--font-family-base)`, size `13px`, weight `600`
- `letter-spacing: var(--tracking-wide)`, `text-transform: uppercase`
- `border-radius: var(--radius-brand)` (8px)
- Padding `var(--spacing-sm) var(--spacing-md)` + `gap: var(--spacing-xs)` for icon
- `min-height: 40px` desktop / 44px mobile (`btn-sm` → 36px desktop only, still 44px mobile via touch-target media query)

Loading state (mandatory when async):

```jsx
<button className="btn-primary" disabled={loading}>
  {loading ? 'Carregando...' : 'Salvar'}
</button>
```

Anti-patterns:
- Gray inline style for Cancel. Use `btn-secondary`.
- Multiple filled buttons side-by-side. Primary + secondary only; if you need three actions, the third goes into a row menu or dropdown.
- `btn-outlined`, `btn-ghost`, or any new variant not in this table — extend `btn-secondary` instead.
- A standalone `btn-primary-sm` or `btn-secondary-sm` class — always compose: `btn-primary btn-sm`.

Group related buttons with `<div className="btn-group">`.

### 4.2 Forms

```jsx
<form className="form" onSubmit={handleSubmit}>
  <div className="form-group">
    <label className="form-label" htmlFor="name">
      Nome <span aria-hidden="true">*</span>
    </label>
    <input
      id="name"
      className={`form-input${error ? ' form-input--error' : ''}`}
      value={name}
      onChange={(e) => setName(e.target.value)}
      required
    />
    {error && <span className="form-error" role="alert">{error}</span>}
  </div>
</form>
```

Classes: `.form`, `.form-group`, `.form-label`, `.form-input`, `.form-select`, `.form-textarea`, `.form-error`, `.form-input--error`, `.form-hint`, `.checkbox-row`.

Disabled/readonly: set the `disabled` attribute — CSS handles opacity. Never override with inline style.

### 4.3 Cards

```jsx
<div className="card">
  <div className="card-header-row">
    <div>
      <div className="card-title">Treino A</div>
      <div className="card-subtitle text-sm text-muted">Segunda e Quarta</div>
    </div>
    <span className="badge badge-green">Ativo</span>
  </div>
  <p className="card-description">Foco em membros superiores.</p>
  <div className="card-stats">
    <span className="stat-chip">8 exercícios</span>
  </div>
  <div className="btn-group">
    <button className="btn-secondary btn-sm">Ver</button>
  </div>
</div>
```

Card hierarchy (Rule 8):
1. Title on its own line (`.card-title`)
2. Subtitle/meta subdued (`.card-subtitle .text-sm .text-muted`)
3. Status badge opposite title in header row
4. Dates/info below header
5. Actions in footer (`btn-group`)

Card shape: `background: var(--md-surface)`, `border-radius: var(--radius-brand)`, `box-shadow: var(--shadow-brand-sm)`. Hover: `var(--shadow-brand-md)`.

Use `.card-link` when the entire card is a navigation target.
Never render `Invalid Date` — use `"-"` as fallback for any missing or unparseable date.
Person names: `firstName + " " + lastName`, fallback to `email`.

### 4.4 Modals / Bottom Sheets

```jsx
<div className="bottom-sheet">
  <div className="bottom-sheet-header">
    <h2>Editar Exercício</h2>
    <button className="bottom-sheet-close" onClick={onClose} aria-label="Fechar modal">
      <X size={20} strokeWidth={2} />
    </button>
  </div>
  <div className="bottom-sheet-body">{/* content */}</div>
</div>
```

`.bottom-sheet` slides up from the bottom on mobile (`--duration-slow` + `--ease-brand`). On desktop it becomes a centered dialog. `z-index: var(--z-modal)`. Shadow: `var(--shadow-brand-lg)`.

### 4.5 Confirm Dialog

Never `window.confirm()`. Full pattern:

```jsx
const [confirmDialog, setConfirmDialog] = useState(null);

const handleDelete = (item) => {
  setConfirmDialog({
    message: `Excluir "${item.name}"? Esta ação não pode ser desfeita.`,
    onConfirm: async () => {
      setConfirmDialog(null);
      await api.delete(`/endpoint/${item.id}`);
    },
  });
};

{confirmDialog && (
  <div className="overlay" onClick={() => setConfirmDialog(null)}>
    <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
      <p className="confirm-dialog-message">{confirmDialog.message}</p>
      <div className="btn-group">
        <button onClick={confirmDialog.onConfirm} className="btn-danger" style={{ flex: 1 }}>
          Confirmar
        </button>
        <button onClick={() => setConfirmDialog(null)} className="btn-secondary" style={{ flex: 1 }}>
          Cancelar
        </button>
      </div>
    </div>
  </div>
)}
```

Z-index: `.overlay` → `var(--z-overlay)`, `.confirm-dialog` → `var(--z-modal)`.

### 4.6 Badges

Single badge system. **Do not create per-page variants** (no `student-badge`, `training-badge`, etc. — extend or reuse).

| Class | Color | Use |
|---|---|---|
| `badge` | neutral gray | Default |
| `badge-blue` | primary blue tint | Informational, new, pending |
| `badge-green` | success | Active, completed |
| `badge-red` | error | Inactive, overdue |
| `badge-gray` | muted | Draft, disabled |
| `badge-accent` | `--brand-accent` tint | PRs, achievements |

Shape: `font-size: 10px`, `font-weight: 700`, `letter-spacing: var(--tracking-wider)`, UPPERCASE, `border-radius: var(--radius-stat)` (4px), padding `4px 8px`.

Add a colored leading dot with `<span className="badge-dot" />` when the badge needs a live-status feel (e.g. "● Ativo").

```jsx
<span className="badge badge-green"><span className="badge-dot" />Ativo</span>
```

### 4.7 Tabs

```jsx
<div className="tabs-container">
  <button
    className={`tab-button${activeTab === 'info' ? ' active' : ''}`}
    onClick={() => setActiveTab('info')}
  >
    Informações
    {count > 0 && <span className="tab-badge">{count}</span>}
  </button>
  <button
    className={`tab-button${activeTab === 'treinos' ? ' active' : ''}`}
    onClick={() => setActiveTab('treinos')}
  >
    Treinos
  </button>
</div>
```

### 4.8 Segmented Toggle

Use when the user chooses between 2–3 mutually exclusive options (not navigation):

```jsx
<div className="segmented-toggle">
  <button
    className={`segmented-toggle-btn${mode === 'new' ? ' active' : ''}`}
    onClick={() => setMode('new')}
  >
    Criar novo
  </button>
  <button
    className={`segmented-toggle-btn${mode === 'import' ? ' active' : ''}`}
    onClick={() => setMode('import')}
  >
    Importar template
  </button>
</div>
```

### 4.9 Empty States

```jsx
<div className="empty-state">
  <div className="empty-state-icon empty-state-icon--accent">
    <Dumbbell size={32} strokeWidth={2} />
  </div>
  <p className="empty-state-title">Sem treinos ainda</p>
  <p className="text-muted text-sm">Crie o primeiro treino para este aluno.</p>
  <button className="btn-primary">Novo treino</button>
</div>
```

Icon always `size={32}` inside `.empty-state-icon--accent` (creates the accent circle). For illustration-led empty states use `<BrandIllustration name="..." />` (see §6).

### 4.10 Loading

```jsx
// Full-page
{loading && (
  <div className="loading-screen">
    <span className="loading-text">Carregando...</span>
  </div>
)}

// Inline skeleton
<div className="skeleton skeleton-text" />
<div className="skeleton skeleton-card" />
```

Never show "not found" content before the GET request completes. Set loading to `true` before the request fires, clear in `finally`.

### 4.11 Toast

Triggered via `useToast()` from `ToastContext`. Z-index: `var(--z-toast)`. Slides in from the bottom. Never render a custom toast element.

```jsx
const { showToast } = useToast();
showToast('Treino salvo.', 'success');
showToast(error.userMessage, 'error');
```

### 4.12 Row Menu (3-dot)

Rows with **more than one action** must use the canonical row menu pattern — currently `TemplateRowMenu` (source: `src/pages/trainer/TrainingTemplates.jsx`).

```jsx
<TemplateRowMenu
  ariaLabel="Opções do treino"
  onEdit={() => handleEdit(item)}
  onDelete={() => handleDelete(item)}
  deleteLabel="Excluir treino"
/>
```

Props: `ariaLabel` (required), `onDelete` (required), `onEdit` (optional), `deleteLabel` (default `"Excluir"`). Trigger: `MoreVertical` from lucide-react. Destructive item class: `row-menu-item--danger`. Z-index: `var(--z-dropdown)`.

A row with only **one action** may use a direct button. **Do not reinvent** a per-page row menu (`StudentRowMenu`, `ProtocolRowMenu`, …) — if the props are insufficient, extend `TemplateRowMenu` with new optional props.

### 4.13 Responsive Tables

Never let a table overflow at 375px. Use progressive disclosure:

```jsx
<table>
  <thead>
    <tr>
      <th>Nome</th>
      <th className="table-col-desktop-only">E-mail</th>
      <th>Ações</th>
    </tr>
  </thead>
  <tbody>
    {items.map((item) => (
      <tr key={item.id}>
        <td>
          <span>{item.name}</span>
          <span className="table-col-mobile-only text-sm text-muted">{item.email}</span>
        </td>
        <td className="table-col-desktop-only">{item.email}</td>
        <td><TemplateRowMenu ... /></td>
      </tr>
    ))}
  </tbody>
</table>
```

### 4.14 Grids

```jsx
// 1 col → 2 col (768px) → 3 col (1024px)
<div className="grid-cards">
  {items.map((item) => <div className="card" key={item.id}>...</div>)}
</div>

// Always 2-column
<div className="grid-2col">...</div>
```

Content inside `.grid-cards`, `.table-container`, `.empty-state`, and `.card.card--mb` auto-animates with `fadeIn`. Do not add manual fade logic for these containers.

### 4.15 Stat Display

Use whenever a numeric data point is the protagonist: dashboards, workout summaries, student progress, any context with a prominent performance number.

| Variant | Class | Number size | Label |
|---|---|---|---|
| Default | `.stat-display` | 32px | UPPERCASE 11px |
| Hero | `.stat-display--hero` | 48–72px | UPPERCASE 11px |
| Inline | `.stat-display--inline` | 24px | UPPERCASE 11px |

```jsx
<div className="stat-display">
  <span className="stat-display-value">
    127<span className="stat-display-unit">kg</span>
  </span>
  <span className="stat-display-label">VOLUME TOTAL</span>
  <span className="stat-display-trend stat-display-trend--up">+12%</span>
</div>
```

Trend classes: `.stat-display-trend--up` (green, up arrow), `.stat-display-trend--down` (red, down arrow), `.stat-display-trend--neutral` (steel, no arrow).

Anti-pattern: using `<h1>` or body typography to display performance numbers. Always `.stat-display` + `--font-family-stat` + `tabular-nums`.

### 4.16 Stadium Theme

When to apply: workout execution, post-workout summary, detailed performance dashboards — focus contexts where dark reduces distraction.

How: wrap the section with `<section className="theme-stadium">`. Children inherit the `--stadium-*` palette via CSS cascade.

```jsx
<section className="theme-stadium">
  <div className="stat-display stat-display--hero">
    <span className="stat-display-value">
      85<span className="stat-display-unit">%</span>
    </span>
    <span className="stat-display-label">ADERÊNCIA SEMANAL</span>
  </div>
</section>
```

Anti-pattern: applying `.theme-stadium` to entire CRUD/admin pages (student list, forms, settings). Stadium is for performance focus, not admin.

### 4.17 Toolbar (search + filter + sort)

Standard pattern for list pages (students, templates, protocols, library). A single row that groups:

```jsx
<div className="toolbar" role="search">
  <div className="toolbar-search">
    <Search size={16} strokeWidth={2} aria-hidden="true" />
    <input
      type="text"
      className="toolbar-search-input"
      placeholder="Buscar…"
      value={search}
      onChange={(e) => onSearch(e.target.value)}
      aria-label="Buscar"
    />
  </div>

  <div className="toolbar-filter-group" role="tablist" aria-label="Filtrar">
    {filters.map((f) => (
      <button
        key={f.id}
        type="button"
        className={`toolbar-filter-btn${active === f.id ? ' active' : ''}`}
        role="tab"
        aria-selected={active === f.id}
        onClick={() => onFilter(f.id)}
      >
        {f.label}
        <span className="toolbar-filter-count">{counts[f.id]}</span>
      </button>
    ))}
  </div>

  <select
    className="toolbar-sort-select"
    value={sortBy}
    onChange={(e) => onSort(e.target.value)}
    aria-label="Ordenar"
  >
    <option value="name">Nome A–Z</option>
    <option value="recent">Mais recentes</option>
  </select>
</div>
```

Rules:
- Search always leftmost, expands on desktop, full-width on mobile (toolbar wraps).
- Filter chips carry an optional count. The "all" chip comes first.
- Sort is always the rightmost control.
- On mobile (<768px) the toolbar stacks vertically; search on row 1, filters on row 2 with horizontal scroll, sort on row 3.

### 4.18 Stats Row (contextual 4-card summary)

Used at the top of list pages that benefit from aggregate counters (alunos, challenges, protocolos). Appears **between** page-header and toolbar. Do not duplicate these counts in the page-header subtitle.

```jsx
<div className="stats-row" aria-label="Resumo">
  <div className="stat-card">
    <span className="stat-card-label">Total</span>
    <span className="stat-card-value">{total}</span>
    <span className="stat-card-sub">{activeCount} ativos</span>
  </div>
  <div className="stat-card stat-card--accent">
    <span className="stat-card-label">Ativos</span>
    <span className="stat-card-value">{activeCount}</span>
    <span className="stat-card-sub">+2 vs semana passada</span>
  </div>
  <div className="stat-card stat-card--warn">
    <span className="stat-card-label">Pendentes</span>
    <span className="stat-card-value">{pendingCount}</span>
    <span className="stat-card-sub">aguardando</span>
  </div>
  <div className="stat-card stat-card--danger">
    <span className="stat-card-label">Atenção</span>
    <span className="stat-card-value">{overdueCount}</span>
    <span className="stat-card-sub">7+ dias inativo</span>
  </div>
</div>
```

Rules:
- 4 cards max. If you have 5+ metrics, the page needs a dashboard, not a stats row.
- Values use `--font-family-stat` + tabular-nums.
- Variants `--accent` / `--warn` / `--danger` tint the value text, not the card background.
- Responsive: 2×2 grid on mobile, 4×1 on ≥768px.

### 4.19 Avatar (with status ring)

```jsx
<Avatar name={fullName} status="ativo" size={40} />
```

Shape: circular, `border-radius: var(--radius-full)`. Initials (first + last letter) in UPPERCASE, Inter weight 600.

Color of initials circle: deterministic from name hash over 6 preset tints (defined as `.avatar-color-0` through `.avatar-color-5` in `index.css`).

Status ring (outer border):
- `ativo` → `.avatar-ring` (green `--md-success`)
- `pendente` → `.avatar-ring avatar-ring--warn` (`--brand-accent`)
- `vencido` → `.avatar-ring avatar-ring--danger` (`--md-error`)
- no status → no ring

Sizes: 28 (inline meta), 36 (row), 40 (stat row), 44 (card), 56 (profile header).

### 4.20 Step Indicator (multi-step flows)

For import wizards, onboarding, anamnesis — any linear flow with 2–5 steps.

```jsx
<div className="step-indicator" aria-label="Progresso">
  <span className="step-dot step-dot--done" />
  <span>01 Plataforma</span>
  <span className="step-divider" />
  <span className="step-dot step-dot--active" />
  <span>02 Arquivo</span>
  <span className="step-divider" />
  <span className="step-dot" />
  <span>03 Revisar</span>
</div>
```

Dot states: default (steel outline), `--active` (filled `--brand-primary`), `--done` (filled `--md-success` with check).

Max 5 steps. Beyond that, collapse to "Step X of Y" text.

---

## 5. Estados de Interação

| Element | Default | Hover | Focus-visible | Active | Disabled | Loading |
|---|---|---|---|---|---|---|
| `btn-primary` | brand-primary bg | brand-primary-dark + `--shadow-brand-sm` | `--shadow-focus` | `scale(0.98)` | 50% opacity, not-allowed | "Carregando...", disabled |
| `btn-secondary` | surface bg + 1px outline-variant border | surface-container-high bg | `--shadow-focus` | `scale(0.98)` | 50% opacity | "Carregando...", disabled |
| `btn-danger` | `--md-error` bg | darker error + `--shadow-brand-sm` | `--shadow-focus` error color | `scale(0.98)` | 50% opacity | "Carregando...", disabled |
| `form-input` | 1px `--md-outline-variant` | 1px `--md-outline` | `--shadow-focus` | — | 50% opacity, not-allowed | — |
| `.card` | `--shadow-brand-sm` | `--shadow-brand-md` | — | — | — | skeleton pulse |
| `.card-link` | `--shadow-brand-sm` | `--shadow-brand-md` + `translateY(-1px)` | `--shadow-focus` | `scale(0.99)` | — | — |
| row menu trigger | transparent | `--md-surface-container-high` bg | `--shadow-focus` | — | — | — |

Transition rule: use `var(--duration-fast) var(--ease-brand)` for hover/focus/press. Use `var(--duration-slow) var(--ease-brand)` for overlays/sheets. Use `var(--duration-achievement) var(--ease-kinetic)` for PR unlocks and achievement celebrations.

Focus must always be visible. Never `outline: none` without replacing with `box-shadow: var(--shadow-focus)`.

---

## 6. Iconografia & Ilustração

### 6.1 Ícones — Lucide, strokeWidth 2

Source: **`lucide-react` exclusively**. No other icon package.

| Size | Prop | Use |
|---|---|---|
| 16 | `size={16}` | Inline within text, compact chips, tight row metadata |
| 18 | `size={18}` | Row menu trigger, small action buttons |
| 20 | `size={20}` | Sidebar nav items, menu items, modal close button |
| 24 | `size={24}` | Page header title icon, buttons with leading icon in the header |
| 32 | `size={32}` | Empty state accent circle |

**Default `strokeWidth={2}`** — the Athletic-Tech voice. Do not use Lucide's default 1.5/1.6.

When an icon is the **sole content** of a button, `aria-label` is required:

```jsx
<button onClick={onClose} aria-label="Fechar modal">
  <X size={20} strokeWidth={2} />
</button>
```

### 6.2 Ilustrações

- Geometric-technical pack in `src/assets/illustrations/`. Line-art + solid blocks.
- Palette: `--brand-primary` + `--brand-accent`. No photoreal gradients.
- Component: `<BrandIllustration name="..." />` — accepts a slug and renders inline SVG or `<img>`.
- Default dimensions: **200×160px**. Responsive via `max-width: 100%`.
- Use in: empty states, onboarding, feedback screens (404, expired session).

```jsx
<div className="empty-state">
  <BrandIllustration name="no-trainings" />
  <p className="empty-state-title">Sem treinos ainda</p>
</div>
```

### 6.3 Logo

- File: `public/img/treino_way_transparente.png`
- Minimum clear-space: the height of the "T" letter on all sides.
- Minimum size: **80px width**.
- Forbidden: use over photos, distort proportions, recolor, or add effects.

```jsx
<img src="/img/treino_way_transparente.png" alt="Treinoway" style={{ minWidth: 80 }} className="logo-img" />
```

---

## 7. Voz & Microcopy

### 7.1 Princípios

1. **Numbers lead** — "+12% de volume" > "Seu volume aumentou em 12%".
2. **Imperative action** — "Conclua o treino", "Registre o peso".
3. **Technical terms accepted** — volume, carga, RPE, PR, série, rep, ciclo.
4. **No emoji, no softening** — "Treino concluído." (not "Parabéns! Você terminou o treino!")
5. **"Você"** — never "tu" or "vocês".

### 7.2 Glossário controlado

| Correct | Never |
|---|---|
| Aluno | Cliente, paciente, usuário, atleta, trainee |
| Treino | Workout, sessão, training |
| Consultoria | Mentoria, coaching, contrato, pacote |
| Anamnese | Formulário, questionário de saúde, intake |
| Excluir | Deletar, remover, apagar |
| Salvar | Confirmar, submeter, enviar (for persistence) |
| Criar | Adicionar, incluir (as verb) |
| PR | Record pessoal, marca pessoal (always abbreviated) |
| Carga | Peso (for workout references) |
| Série | Set |
| Rep | Repetição (always abbreviated) |
| Ciclo | Período, fase |
| RPE | Esforço percebido |

### 7.3 Copy templates

**Confirm:** `Excluir [X]? Esta ação não pode ser desfeita.`

**Empty state:** `Sem [entidade] ainda` / `[Verbo imperativo] o primeiro [entidade] para [contexto].`

**Success toast:** `[X] salvo.` / `PR registrado.`

**Achievement (only context where "!" is allowed):** `Novo PR! 127kg no supino.`

**Loading:** `Carregando…`

### 7.4 Before/after

| Wrong | Right |
|---|---|
| "Tem certeza que deseja deletar este aluno?" | "Excluir aluno? Esta ação não pode ser desfeita." |
| "Nenhum treino encontrado" | "Sem treinos ainda — crie o primeiro treino." |
| "Parabéns! Você alcançou uma nova marca! 🎉" | "Novo PR! 127kg no supino." |
| "Adicionar novo workout" | "Criar treino" |
| "Carregando dados, aguarde..." | "Carregando…" |

---

## 8. Acessibilidade

- **Touch targets** ≥ 44×44px on mobile (§1 rule 2). Desktop may go to 40px for `btn`, 36px for `btn-sm`.
- **Contrast** — the brand palette meets WCAG AA. Never override primary/error colors with custom values.
- **Focus ring** — `box-shadow: var(--shadow-focus)` on `:focus-visible`. Never `outline: none` without it.
- **Icon buttons** — always `aria-label`.
- **Form errors** — always `role="alert"` on `.form-error` span.
- **Tab order** — matches visual reading order. Never use positive `tabIndex` values.
- **Modals** — trap focus while open. Close on Escape key.
- **Loading state** — announce with `aria-live="polite"` region when the content change is significant.

---

## 9. Anti-padrões — NUNCA faça

- `window.confirm()` — use the custom confirm dialog (§4.5).
- `window.location.href` for internal navigation — use `useNavigate()`.
- `fetch()` directly — use `src/api/axios.js`.
- Raw hex colors, px values, or inline margin/padding — use tokens.
- `outline: none` without a focus substitute.
- `!important` — never. Increase specificity instead.
- Icons from any package other than `lucide-react`, or Lucide icons without `strokeWidth={2}`.
- Creating a new CSS class without checking `src/index.css` first.
- Inventing a per-page variant of an existing component (`student-badge`, `studentRowMenu`, `btn-outlined`). Extend the shared one.
- Showing a list/content before the loading state resolves.
- Showing "não encontrado" before the GET completes.
- Displaying `Invalid Date` — always fall back to `"-"`.
- Multiple visible action buttons in a table/list row — use row menu.
- Magic z-index numbers (e.g. `9999`) — use `var(--z-*)` tokens.
- Hard-coded transition durations (`0.2s ease`) — use `var(--duration-*)` + `var(--ease-brand)`.
- Hard-coded line-heights — use `var(--line-height-*)`.
- Importing React explicitly — JSX transform handles it.
- `error.response?.data?.message` — use `error.userMessage`.
- `getErrorMessage(error, 'hardcoded fallback')` — always `error.userMessage || translateError(error)`.
- Introducing a new legacy-prefixed token (`--color-*`, `--md-secondary`, `--radius-md`, `--shadow-sm`, `--ease-out`) in new code. Use the canonical brand equivalents (§2.1).
- Using `--brand-accent` (#FF6B1A) in a primary CTA. Accent is for PRs, achievements, and alert highlights only.
- Using tonal/filled-container backgrounds (`--color-primary-container`) for secondary buttons. `btn-secondary` is outlined by spec.

---

## 10. Checklist de Review

Run through every item before marking a UI task complete.

### Tokens & CSS
- [ ] Zero raw hex, px literals, or inline fixed colors/spacing — all via `var(--*)`
- [ ] Every new color/shape/motion reference uses a canonical `--brand-*` / `--md-*` surface / `--radius-brand` / `--shadow-brand-*` / `--ease-brand` token (no legacy aliases in new code)
- [ ] No new CSS class that duplicates one already in `src/index.css`
- [ ] New styles added to `src/index.css` in the correct section with BEM naming
- [ ] Z-index uses `var(--z-*)` — no magic numbers
- [ ] Transitions use `var(--duration-*) var(--ease-brand)` — no hardcoded `0.2s ease`
- [ ] Line-heights use `var(--line-height-*)` where specified

### Mobile-first
- [ ] Base styles work at 375px without horizontal overflow
- [ ] All breakpoints use `min-width` only
- [ ] Touch targets ≥ 44×44px on mobile (40px acceptable on desktop)
- [ ] Page padding follows the responsive scale (16 → 24 → 32px)

### Brand (Athletic-Tech)
- [ ] H1/H2 use `var(--font-family-display)` (Space Grotesk) weight 600/700 + `var(--tracking-tight)`
- [ ] Body uses `var(--font-family-base)` (Inter)
- [ ] Buttons UPPERCASE + `var(--tracking-wide)` + `var(--radius-brand)` (8px), weight 600, size 13px
- [ ] Cards use `var(--radius-brand)` + `var(--shadow-brand-sm)`
- [ ] Hovers use `var(--duration-fast) var(--ease-brand)`
- [ ] Icons Lucide with `strokeWidth={2}` (no exceptions)
- [ ] Performance numbers in `var(--font-family-stat)` + `font-variant-numeric: tabular-nums`
- [ ] Copy follows §7 glossary (Aluno, Treino, Excluir, PR…)
- [ ] Stats/execution screens use `.theme-stadium` when appropriate
- [ ] `--brand-accent` used only in PRs/highlights, never in primary CTA

### Components & Hierarchy
- [ ] Correct button class for each action (primary / secondary / danger / delete / schedule-sm)
- [ ] `btn-group` wraps sibling buttons
- [ ] Cards follow the 5-point visual hierarchy (title → subtitle → badge → meta → footer)
- [ ] `Invalid Date` never rendered — fallback to `"-"`
- [ ] Person names use `firstName + lastName`, fallback to email
- [ ] Single badge system (`badge badge-*`), no per-page badge variants
- [ ] Row menu uses the canonical `TemplateRowMenu`, not a per-page reinvention
- [ ] Stats row has ≤4 cards; counters are not duplicated in the page-header subtitle

### Interactivity
- [ ] Rows with 2+ actions use row menu, not multiple visible buttons
- [ ] `window.confirm()` never used — custom confirm dialog pattern in place
- [ ] Loading state set before request; inputs/buttons disabled during loading; button shows "Carregando..."
- [ ] "not found" / empty state only shown after the request completes

### Accessibility
- [ ] Focus ring visible on all interactive elements (never `outline: none` without substitute)
- [ ] Icon-only buttons have `aria-label`
- [ ] Inline form errors have `role="alert"`
- [ ] Tab order follows visual reading order

### API & Errors
- [ ] All API calls use `src/api/axios.js`
- [ ] Errors use `error.userMessage` or `translateError(error)` — never `error.response?.data?.message`
- [ ] New `messageCode` values added to `src/i18n/locales/pt-BR.js`

---

## 11. Roadmap

Known inconsistencies in the current codebase. Prescribed corrections for future incremental refactors — do **not** fix them as a side effect of unrelated tasks.

1. **Dark theme** — add `@media (prefers-color-scheme: dark)` overrides for all tokens. Component code should need no changes if tokens are used correctly.
2. **Normalize `--radius-md`** — currently `14px`, target `12px`. Better: migrate all non-stat uses to `--radius-brand` (8px) and retire `--radius-md` / `--radius-sm`.
3. **Migrate magic z-index** — raw `z-index` values (10, 50, 100, 9999) still exist in some components. Migrate all to `var(--z-*)`.
4. **Migrate hardcoded transitions** — replace `transition: 0.2s ease` with `var(--duration-fast) var(--ease-brand)`.
5. **Apply line-heights systematically** — tokens are defined but not applied to `.card-title`, `.card-description`, `h1`–`h3`, body text classes.
6. **Eliminate inline styles for fixed values** — audit `style={{ color, padding, fontSize }}` with literal values and move to classes.
7. **Retire legacy token aliases** — `--color-*`, `--md-primary`, `--shadow-sm/md/lg`, `--ease-out`, `--radius-sm/md`, `--font-h1-size` etc. Once usages reach zero, remove the declarations from `:root`.
8. **Extract `RowMenu` from `TemplateRowMenu`** — rename and move to `src/components/` so every page can import without owning the implementation.
9. **Consolidate `student-badge` into `badge`** — `Students.jsx` defines a parallel badge system. Migrate to the canonical `badge badge-*` and delete `.student-badge*` CSS.
10. **Add `--spacing-2xs: 2px`** — current spacing scale starts at 4px; 2px is occasionally needed for borders, dots, ring-offsets and is currently hardcoded.
11. **Reevaluate typography sizes for Space Grotesk** — the `--font-h1-size: 24px` default was set for Open Sans/Fjalla. §2.2 specifies `28px` for Athletic-Tech H1; introduce size tokens (`--font-display-h1-size: 28px`, etc.) and migrate components off the legacy `--font-h1-*` tokens.
