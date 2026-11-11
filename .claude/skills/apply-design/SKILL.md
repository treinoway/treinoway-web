---
name: apply-design
description: Canonical TeuFit design system reference (Figma "TeuFit" style guide). Apply before finalising any component, page, or CSS change — covers primitive + semantic tokens, typography, spacing/radius, component catalog, usage rules, interaction states, accessibility, anti-patterns, and review checklist.
compatibility: Designed for Claude Code on the treinoway-web project
---

Review every UI change in the current task against all sections below. Fix violations before finishing.

**Source of truth:** Figma file "TeuFit" (style guide frames: Tipografia, Colors, Status, Tokens & Variáveis, Regras de uso, Componentes). Screenshots of each frame live in `reference/` next to this file — open them when a visual detail is ambiguous:

| File | Frame |
|---|---|
| `reference/01-typography.png` | Tipografia |
| `reference/02-colors.png` | Colors (Brand-Primary, Brand-Secondary, Neutral) |
| `reference/03-status-colors.png` | Status (Green, Red, Yellow) |
| `reference/04-semantic-tokens.png` | Tokens & Variáveis — semantic color tokens |
| `reference/05-spacing-radius-effects.png` | Spacing, radius, effects, typeface, primitive ramps |
| `reference/06-usage-rules.png` | Regras de uso |
| `reference/07-components.png` | Componentes |

**Brand:** TeuFit — "menos é mais." Light, calm, acolhedor. Whitespace is the main separator; color is reserved for meaning (brand, action, status). Voice: proximidade, clareza, eficiência.

**Only the tokens in this document are allowed in new or touched code.** Any other custom property still present in `src/index.css` is legacy — do not reference it; replace it with the semantic equivalent when you touch that code.

---

## 1. Regras de uso (non-negotiable)

Verbatim from the Figma "Regras de uso" frame:

1. **Laranja (`action/secondary`) só no CTA de conversão** (WhatsApp). Nunca em badges, ícones, decoração ou gráficos.
2. **Sempre tokens SEMANTIC**; nunca hex solto nem PRIMITIVE direto.
3. **Espaço em branco é o separador principal**; borda ou fundo só quando o espaço não basta.
4. **Sombra só em overlays** (tooltip, dropdown, modal) via `Shadow/Overlay`; **nunca em cards**.
5. **Nunito Sans apenas Regular (400), SemiBold (600) e Bold (700)**; Medium (500) proibido. (Light/ExtraBold/Black também não fazem parte da escala.)
6. **Botões em caixa baixa com inicial maiúscula** ("Criar rotina"). Nunca UPPERCASE.
7. **Status sempre com par fundo + texto**: `feedback/*-bg` + `feedback/*-text`.
8. **Ícones**: instância do componente "ICON"; o magenta `#FF00FF` é placeholder e nunca vai para produção. No código: `lucide-react` (§5).
9. **Nunca usar faixas ou barras laterais coloridas para indicar status**; usar Badge.
10. **Gráficos usam apenas tokens `chart/*`.**
11. **`radius/full` só em avatares, pills, badges e toggles** — nunca cards ou containers.

Engineering rules that sit on top:

- **Mobile-first** — base styles target 375px; add complexity via `min-width: 768px` and `min-width: 1024px`. Never `max-width` breakpoints.
- **Touch targets** ≥ 44×44px on mobile; ≥ 40px acceptable on desktop.
- **Zero inline styles** (`style={{}}`) except computed dynamic values (e.g. a progress width). Every visual value comes from a class in `src/index.css` using `var(--*)`.
- **Classes before new CSS** — check `src/index.css` before creating a class; extend with BEM modifiers.
- **Never** `window.confirm`, `window.location.href` for internal nav, or `fetch`. Use the confirm dialog (§4.16), `useNavigate()`, `src/api/axios.js`.
- **UI text** in pt-BR (glossary §7). Code in English.

---

## 2. Tokens

Two layers, mirroring Figma variables:

- **PRIMITIVE** — raw values (hex, px). Full color ramps + spacing scale. **Never referenced from component CSS.** Only semantic tokens point at them.
- **SEMANTIC** — usage-named aliases to primitives (`background/default`, `text/primary`…). **The only layer components use.**

### 2.1 CSS naming

Figma variable path → CSS custom property: replace `/` with `-`, prefix `--`.

| Figma | CSS |
|---|---|
| `background/surface-elevated` | `--background-surface-elevated` |
| `action/primary/hover` | `--action-primary-hover` |
| `feedback/success-text` | `--feedback-success-text` |
| `spacing/2xl` | `--spacing-2xl` |
| `radius/full` | `--radius-full` |
| Primitive `Brand-Primary/500` | `--primitive-primary-500` |
| Primitive `Neutral/overlay` | `--primitive-neutral-overlay` |

Primitives use the `--primitive-*` prefix so a component referencing one is obvious in review.

### 2.2 Primitive color ramps

Lower number = lighter. Don't use directly — reference via semantic tokens.

**Brand-Primary** (azul institucional; 500 = cor da marca)

| 50 | 100 | 200 | 300 | 400 | **500** | 600 | 700 | 800 |
|---|---|---|---|---|---|---|---|---|
| `#EFF6FF` | `#DBEAFE` | `#BFDBFE` | `#93C5FD` | `#3B82F6` | **`#1054B2`** | `#0A4294` | `#0D47A1` | `#07285C` |

**Brand-Secondary** (laranja de destaque; 400 = CTA de conversão, 500 = cor do logo)

| 50 | 100 | 200 | 300 | **400** | 500 | 600 | 700 | 800 |
|---|---|---|---|---|---|---|---|---|
| `#FFF3E0` | `#FFE0B2` | `#FFCC80` | `#FFA726` | **`#FF9100`** | `#FF6F00` | `#E65100` | `#BF360C` | `#A72D0B` |

**Neutral** (base para texto, fundos, bordas, desabilitado)

| 0 | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | overlay |
|---|---|---|---|---|---|---|---|---|---|---|
| `#FFFFFF` | `#F7F7F7` | `#F0F2F5` | `#E1E5EA` | `#BCC1CB` | `#797E8A` | `#505663` | `#2E333D` | `#1B1E24` | `#121416` | `#121416` @ 50% |

**Status ramps** (100 fundos, 300 ícones/preenchimentos, 400 texto sobre fundos de feedback)

| | 100 | 200 | 300 | 400 | 500 |
|---|---|---|---|---|---|
| Green | `#DEF9CC` | `#8CE563` | `#24A148` | `#197B35` | `#105323` |
| Red | `#FFF5F5` | `#F48787` | `#E22828` | `#901111` | `#3B0505` |
| Yellow | `#FFF7E0` | `#FFE19A` | `#F9AF27` | `#7B5613` | `#3C2A09` |

### 2.3 Semantic color tokens

**`background/*`** — fundos e superfícies

| Token | → Primitive | Use |
|---|---|---|
| `--background-default` | Neutral/100 | Fundo geral da aplicação |
| `--background-surface` | Neutral/0 | Cards e containers |
| `--background-surface-elevated` | Neutral/50 | Áreas internas de cards (caixas de KPI, gráfico, busca) |
| `--background-brand` | Brand-Primary/500 | Fundos com identidade da marca |
| `--background-brand-subtle` | Brand-Primary/50 | Item de navegação ativo, avatar, badge de marca |
| `--background-inverse` | Neutral/800 | Tooltips |
| `--background-overlay` | Neutral/overlay | Scrim de modais |

**`text/*`**

| Token | → Primitive | Use |
|---|---|---|
| `--text-primary` | Neutral/800 | Texto principal, títulos e corpo |
| `--text-secondary` | Neutral/500 | Texto auxiliar, descrições |
| `--text-tertiary` | Neutral/400 | Menor importância, placeholders |
| `--text-disabled` | Neutral/300 | Estado desabilitado |
| `--text-inverse` | Neutral/50 | Texto sobre fundos escuros (inclui botão primary) |
| `--text-brand` | Brand-Primary/600 | Texto com identidade de marca |
| `--text-link` | Brand-Primary/500 | Links e textos clicáveis |
| `--text-on-secondary` | Neutral/800 | Texto sobre o laranja de conversão |

**`border/*`**

| Token | → Primitive | Use |
|---|---|---|
| `--border-default` | Neutral/200 | Bordas padrão de inputs e cards |
| `--border-subtle` | Neutral/100 | Divisores sutis entre seções |
| `--border-strong` | Neutral/400 | Bordas com maior destaque |
| `--border-focus` | Brand-Primary/400 | Anel de foco (teclado) |
| `--border-error` | Red/300 | Borda de campo com erro |

**`action/primary/*`** — botões e ações principais

| Token | → Primitive |
|---|---|
| `--action-primary-default` | Brand-Primary/500 |
| `--action-primary-hover` | Brand-Primary/600 |
| `--action-primary-pressed` | Brand-Primary/700 |
| `--action-primary-disabled` | Neutral/200 |

**`action/secondary/*`** — **exclusivo do CTA de conversão (WhatsApp)**

| Token | → Primitive |
|---|---|
| `--action-secondary-default` | Brand-Secondary/400 |
| `--action-secondary-hover` | Brand-Secondary/500 |
| `--action-secondary-pressed` | Brand-Secondary/600 |
| `--action-secondary-disabled` | Neutral/200 |

**`feedback/*`** — `success|warning|error|info` = ícones/preenchimentos (**nunca texto**); `*-bg` = fundo; `*-text` = texto sobre o `*-bg` (contraste AA)

| Tone | Base (ícone) | `-bg` | `-text` |
|---|---|---|---|
| success | Green/300 | Green/100 | Green/400 |
| warning | Yellow/300 | Yellow/100 | Yellow/400 |
| error | Red/300 | Red/100 | Red/400 |
| info | Brand-Primary/300 | Brand-Primary/50 | Brand-Primary/600 |

CSS: `--feedback-success`, `--feedback-success-bg`, `--feedback-success-text`, … (same for `warning`, `error`, `info`).

**`icon/*`**

| Token | → Primitive | Use |
|---|---|---|
| `--icon-default` | Neutral/600 | Ícones padrão de interface |
| `--icon-brand` | Brand-Primary/500 | Ícones com identidade de marca |
| `--icon-inverse` | Neutral/50 | Ícones sobre fundos escuros |
| `--icon-disabled` | Neutral/300 | Ícones desabilitados |

**`chart/*`** — únicos tokens permitidos em gráficos

| Token | → Primitive | Use |
|---|---|---|
| `--chart-sv-full` | Brand-Primary/500 | Sessão completa no gráfico de volume (barra sólida; também a borda da parcial) |
| `--chart-sv-cut` | Brand-Primary/200 | Sessão parcial (preenchimento claro + borda 1px `--chart-sv-full`) |
| `--chart-abandoned` | Neutral/400 | Sessão abandonada (contorno tracejado, sem preenchimento, + ícone `X`) |
| `--chart-track` | Neutral/200 | Marca de linha de base em dias sem treino |

Status no gráfico de volume é codificado por **forma** (sólida / clara + borda / tracejada + ×) sobre um único matiz — nunca vermelho × verde.

### 2.4 Spacing

| Token | Value | Use |
|---|---|---|
| `--spacing-2xs` | 2px | Micro-espaçamento (ícones inline, badges) |
| `--spacing-xs` | 4px | Mínimo entre elementos compactos |
| `--spacing-sm` | 8px | Interno de componentes pequenos |
| `--spacing-md` | 12px | Padrão de componentes |
| `--spacing-lg` | 16px | Entre grupos de elementos |
| `--spacing-xl` | 24px | Entre seções menores |
| `--spacing-2xl` | 32px | Entre blocos de conteúdo |
| `--spacing-3xl` | 40px | Margens de seção |
| `--spacing-4xl` | 48px | Separação ampla entre seções |
| `--spacing-5xl` | 64px | Máximo espaçamento de layout |

Page padding: mobile `--spacing-lg` (16) → tablet `--spacing-xl` (24) → desktop `--spacing-2xl` (32).

### 2.5 Radius

| Token | Value | Use |
|---|---|---|
| `--radius-none` | 0 | Tabelas, divisores |
| `--radius-sm` | 4px | Badges internos, tags, segmentos |
| `--radius-md` | 8px | Botões, inputs, itens de navegação |
| `--radius-lg` | 12px | Cards internos e itens de lista |
| `--radius-xl` | 16px | Cards de seção |
| `--radius-full` | 999px | **Somente** avatares, pills, badges, toggles |

### 2.6 Effects

| Token | Value | Use |
|---|---|---|
| `--shadow-overlay` | `0 8px 24px` `#121416` @ 12% | **Só** tooltip, dropdown, modal/bottom-sheet. Nunca cards. |
| `--focus-ring` | `0 0 0 2px var(--background-surface), 0 0 0 4px var(--border-focus)` | `:focus-visible` em todo elemento interativo |

### 2.7 Typography

Typeface: `--font-family-brand: 'Nunito Sans', system-ui, sans-serif` (Figma `Typeface/Brand`). One family, three weights only: **400 / 600 / 700**.

| Style (Figma) | Weight | Size / line-height | CSS class | Use |
|---|---|---|---|---|
| Display | Bold 700 | 48 / 120% | `.type-display` | Hero numbers, landing moments (rare in app) |
| Heading/H1 | Bold 700 | 32 / 120% | `.type-h1` | Page title |
| Heading/H2 | Bold 700 | 24 / 120% | `.type-h2` | Section title; KPI/metric values |
| Heading/H3 | SemiBold 600 | 20 / 120% | `.type-h3` | Card/sub-section title |
| Heading/H4 | Bold 700 | 16 / 120% | `.type-h4` | Small group title, list item name |
| Body/Large | Regular 400 | 16 / 150% | `.type-body-lg` | Emphasized paragraphs |
| Body/Large Strong | SemiBold 600 | 16 / 150% | `.type-body-lg-strong` | |
| Body/Default | Regular 400 | 14 / 150% | `.type-body` | **Default body text** |
| Body/Default Strong | SemiBold 600 | 14 / 150% | `.type-body-strong` | Labels, emphasized inline |
| Button/LG | Bold 700 | 16 / 150% | (inside `.btn--lg`) | Large buttons |
| Button/MD | Bold 700 | 14 / 150% | (inside `.btn`) | Default buttons |
| Caption | Regular 400 | 12 / 140% | `.type-caption` | Meta, helper text, support text |
| Caption/Strong | Bold 700 | 12 / 140% | `.type-caption-strong` | Field labels, tags |
| OVERLINE | Bold 700 | 12 / 140%, UPPERCASE | `.type-overline` | KPI labels, status badges, date-block weekday/month |

Size tokens: `--font-size-48|32|24|20|16|14|12`, line-heights `--line-height-tight` (1.2), `--line-height-caption` (1.4), `--line-height-body` (1.5). Numbers that compare across rows (adherence %, kg, counts in tables) also get `font-variant-numeric: tabular-nums`.

Default text color: `--text-primary`; secondary info `--text-secondary`; never lighter than `--text-tertiary` for anything users must read.

### 2.8 Breakpoints & z-index

| Name | Min-width |
|---|---|
| Mobile (base) | — (375px target) |
| Tablet | 768px |
| Desktop | 1024px |

Z-index tokens: `--z-base` 1, `--z-dropdown` 100, `--z-sticky` 200, `--z-sidebar` 300, `--z-overlay` 1000, `--z-modal` 1100, `--z-toast` 2000, `--z-tooltip` 3000.

Motion: `--duration-fast` 150ms (hover/focus/press), `--duration-base` 200ms (mount), `--duration-slow` 300ms (sheets/overlays), easing `--ease-standard: cubic-bezier(0.22, 1, 0.36, 1)`. Motion confirms, never decorates.

---

## 3. Layout

### 3.1 App shell

```
.app-layout              — flex row, background: --background-default
  .sidebar               — 16rem (≥768px), hidden <768px; Nav Items (§4.9)
  .main-content
    .top-app-bar         — mobile-only
    .page-header
    [page content]
```

Safe areas: `padding-bottom: max(var(--spacing-lg), env(safe-area-inset-bottom));`

### 3.2 Page header

```jsx
<header className="ds-page-header">
  <div className="ds-page-header__heading">
    <Users size={24} strokeWidth={2} aria-hidden="true" />
    <h1 className="ds-page-header__title type-h1">Meus alunos</h1>
  </div>
  <div className="ds-page-header__actions">
    <button className="btn btn--secondary">Importar</button>
    <button className="btn btn--primary"><Plus size={16} strokeWidth={2} aria-hidden="true" />Convidar aluno</button>
  </div>
</header>
```

Biblioteca pages use `LibraryPageHeader` (`src/components/LibraryPageHeader.jsx`: `icon`, `title`, `actions`), which renders exactly this markup. The heading icon is 24px, the same as the sidebar icon.

- Title `type-h1`, `--text-primary`, sentence case.
- Actions right-aligned, `gap: var(--spacing-sm)`, primary rightmost. One primary per screen.
- No counters/subtitles strip in the header — counts go in Metric Cards (§4.10) or Segmented counts (§4.12).
- Mobile: actions wrap under the title; primary may go full-width.

### 3.3 Surfaces & separation

- Page bg `--background-default`. Section cards `--background-surface` + `--radius-xl`, padding `--spacing-xl` (mobile `--spacing-lg`). **No shadow. No border by default** — the surface/background contrast + whitespace separates them. Add `1px solid var(--border-default)` only when two surfaces of the same color touch.
- Inside a section card, internal boxes (KPI box, search, chart area) use `--background-surface-elevated` + `--radius-lg`.
- List items inside a section separate by whitespace (`gap: var(--spacing-sm)`) or a `--border-subtle` divider — pick one per list, not both.
- Gap between sections: `--spacing-xl` (mobile) / `--spacing-2xl` (desktop).

---

## 4. Componentes

Names match the Figma components. Each lists anatomy, tokens, and the CSS class to use/create in `src/index.css`.

### 4.1 ICON

Figma uses an `ICON` placeholder instance (magenta `#FF00FF`) to be swapped. **In code, icons are `lucide-react` only, `strokeWidth={2}`** (§5). Color via `--icon-*` tokens (`currentColor` inheriting from a class that sets `color: var(--icon-default)` etc.). Magenta never ships.

### 4.2 Button

Types × states (size MD):

| Type | Default | Hover | Pressed | Focus | Disabled |
|---|---|---|---|---|---|
| **Primary** `.btn--primary` | bg `--action-primary-default`, text `--text-inverse` | bg `--action-primary-hover` | bg `--action-primary-pressed` | default + `--focus-ring` | bg `--action-primary-disabled`, text `--text-disabled` |
| **Secondary** `.btn--secondary` (contorno) | bg `--background-surface`, 1px `--border-default`, text `--text-brand` | bg `--background-brand-subtle` | bg `--background-brand-subtle`, border `--action-primary-default` | + `--focus-ring` | bg `--action-primary-disabled`, text `--text-disabled`, no border |
| **Ghost** `.btn--ghost` | transparent, text `--text-brand` | bg `--background-brand-subtle` | bg `--background-brand-subtle` | + `--focus-ring` | text `--text-disabled` |
| **Conversion** `.btn--conversion` | bg `--action-secondary-default`, text `--text-on-secondary` | `--action-secondary-hover` | `--action-secondary-pressed` | + `--focus-ring` | bg `--action-secondary-disabled`, text `--text-disabled` |
| **Danger** `.btn--danger` (destructive confirm only) | bg `--feedback-error`, text `--text-inverse` | bg Red/400 via `--feedback-error-text` | same as hover | + `--focus-ring` | as primary disabled |

Usage: Primary = ação principal da tela (one per view). Secondary/Ghost = ações de apoio. **Conversion (laranja) = só CTA de WhatsApp.** Danger = only inside the confirm dialog.

Shape: `.btn` base → `border-radius: var(--radius-md)`, padding `var(--spacing-sm) var(--spacing-lg)`, `gap: var(--spacing-sm)`, Button/MD type (14/700), **sentence case, no letter-spacing, no uppercase**, min-height 40px desktop / 44px mobile. `.btn--lg` → Button/LG (16/700), min-height 48px, padding `var(--spacing-md) var(--spacing-xl)`. `.btn--block` → `width: 100%`. Icon 16px (MD) / 20px (LG).

Loading: disable + label "Carregando..." (keep width stable).

```jsx
<button className="btn btn--primary" disabled={saving}>{saving ? 'Carregando...' : 'Criar rotina'}</button>
```

Anti-patterns: two primaries side by side; orange for anything but WhatsApp; inventing new variants; uppercase labels.

### 4.3 IconButton

Compact action without text label. `.icon-button`: 40×40 (44×44 mobile), `--radius-md`, transparent bg, icon `--icon-default` 20px; hover bg `--background-surface-elevated`; focus `--focus-ring`. **Always `aria-label` + tooltip (`title` or Tooltip component).** Row menu trigger (`MoreVertical`) is an IconButton.

### 4.4 Badge

Indicador de status ou contagem. Two axes — **Tone × Style**:

| Tone | bg | text |
|---|---|---|
| Success | `--feedback-success-bg` | `--feedback-success-text` |
| Warning | `--feedback-warning-bg` | `--feedback-warning-text` |
| Error | `--feedback-error-bg` | `--feedback-error-text` |
| Brand | `--background-brand-subtle` | `--text-brand` |
| Neutral | `--badge-neutral-bg` (alias → Neutral/100) | `--text-secondary` |

| Style | Type | Use |
|---|---|---|
| **Status** `.badge--status` | OVERLINE (12/700 UPPERCASE) | State of an entity: ATIVO, INATIVO, PENDENTE, VENCIDO |
| **Tag** `.badge--tag` | Caption/Strong (12/700, sentence case) | Attributes/flags: "Sem plano", "Sem rotina ativa", "Hipertrofia" |

Shape: `--radius-full`, padding `var(--spacing-2xs) var(--spacing-sm)`, no border, no dot, no icon by default.

Classes: `.badge .badge--status .badge--success` / `.badge .badge--tag .badge--warning`. **Always the bg+text pair — never colored text alone, never a colored stripe/bar.** No per-page badge variants.

### 4.5 Avatar

Iniciais (first + last name initial, UPPERCASE) ou foto. `.avatar`: circle `--radius-full`, bg `--background-brand-subtle`, text `--text-brand`, Caption/Strong. Sizes: 32 (inline), 40 (row/list — default), 56 (profile header). Photo: `object-fit: cover`. No status ring — status is shown with a Badge next to the name.

### 4.6 Input

```jsx
<div className="field">
  <label className="field-label type-caption-strong" htmlFor="name">Nome</label>
  <input id="name" className={`input${error ? ' input--error' : ''}`} placeholder="Placeholder" />
  {error && <span className="field-error type-caption" role="alert">{error}</span>}
</div>
```

- Label above, Caption/Strong, `--text-primary`, gap `--spacing-xs`.
- Field: bg `--background-surface`, 1px `--border-default`, `--radius-md`, height 40px (44 mobile), padding `0 var(--spacing-md)`, Body/Default, text `--text-primary`, placeholder `--text-tertiary`.
- Hover border `--border-strong`; focus border `--border-focus` + `--focus-ring`; error border `--border-error` + message in `--feedback-error-text`; disabled bg `--background-surface-elevated`, text `--text-disabled`.
- Search variant `.input--search`: leading `Search` icon 16px `--icon-default`; may sit on `--background-surface-elevated` with no border inside a section card.
- Select and textarea share the same tokens (`.input` applied to `<select>`/`<textarea>`).

### 4.7 Toggle

Switch on/off for preferences, filters, settings. `.toggle`: track 36×20 `--radius-full`; off track `--toggle-track-off` (alias → Neutral/300); on track `--action-primary-default`; thumb `--background-surface`. Disabled: track `--action-primary-disabled`. Render as `<button role="switch" aria-checked>` with a visible label. Focus `--focus-ring`. Use `ds/Toggle` (`src/components/ds/Toggle.jsx`: `checked`, `onChange(next)`, `label` required, `describedBy`, `disabled`); don't hand-roll switches.

### 4.8 Segmented / Segmented Item

Grupo de controle segmentado para filtros ou modos de visualização. Segmented Item is internal — never used alone.

```jsx
<div className="segmented" role="tablist" aria-label="Filtrar alunos">
  {filters.map((f) => (
    <button key={f.id} role="tab" aria-selected={active === f.id}
      className={`segmented-item${active === f.id ? ' segmented-item--active' : ''}`}
      onClick={() => setActive(f.id)}>
      {f.label} <span className="segmented-item-count">({counts[f.id]})</span>
    </button>
  ))}
</div>
```

- Container: bg `--background-surface-elevated`, `--radius-md`, padding `--spacing-2xs`, inline-flex.
- Item: Body/Default, `--text-secondary`, `--radius-sm`, padding `var(--spacing-xs) var(--spacing-md)`; count in `--text-tertiary`.
- Active: bg `--background-surface`, text `--text-primary` Body/Default Strong. No shadow.
- Mobile: horizontal scroll if overflowing (no wrap).

### 4.9 Nav Item

Sidebar navigation. Two levels: **Main** (sections, icon 20px + Body/Default Strong) and **Sub** (sub-pages, indented, Body/Default, no icon).

- `.nav-item`: `--radius-md`, padding `var(--spacing-sm) var(--spacing-md)`, gap `--spacing-md`, text `--text-secondary`, icon `--icon-default`.
- Hover: bg `--background-surface-elevated`.
- Active: bg `--background-brand-subtle`, text `--text-brand`, icon `--icon-brand`. **No side bar/stripe.**

### 4.10 Metric Card

Card de métrica com rótulo, valor e apoio. Tones: **Neutral, Error, Warning, Brand**.

```jsx
<div className="metric-card metric-card--warning">
  <span className="metric-card-label type-body-strong">Sem rotina ativa</span>
  <span className="metric-card-value type-h2">3</span>
  <span className="metric-card-support type-caption">alunos precisam de rotina</span>
</div>
```

- bg `--background-surface-elevated`, `--radius-lg`, padding `--spacing-lg`, no border, no shadow. Inside a section card or on a page-level row.
- Label Body/Default Strong `--text-primary`; value H2 `--text-primary` + `tabular-nums`; support Caption `--text-secondary`.
- Tone recolors **only the value**: Error `--feedback-error-text`, Warning `--feedback-warning-text`, Brand `--text-brand`. Background never tinted.
- Row of metric cards: 2 columns mobile, up to 4 columns ≥768px. Max 4.

### 4.11 KPI

Isolated performance number used **inside** cards/sections (no own container).

- Label OVERLINE `--text-secondary`, value H2 (or H4 in dense rows) `--text-primary` + `tabular-nums`, support Caption `--text-secondary`.
- Stacked, gap `--spacing-2xs`. Align left (or right in table-like rows).

### 4.12 Linha de aluno (Student Row)

Card de aluno da lista Meus Alunos. Anatomy (left → right):

1. **Avatar** 40px (§4.5).
2. **Identity block**: name H4 `--text-primary` + Status Badge (ATIVO/INATIVO/…) inline; email Caption `--text-secondary`; tag badges (Warning/Neutral Tag: "Sem plano", "Sem rotina ativa") on the next line, gap `--spacing-xs`.
3. **KPI Aderência**: value `75%` (H4) + support `3/4 treinos` (Caption) + label `ADERÊNCIA` (OVERLINE).
4. **KPI Último treino**: value `Há 2 dias` (Body/Default Strong) + label `ÚLTIMO TREINO` (OVERLINE).
5. **Trailing action**: IconButton — `ChevronRight` if the row only navigates, or `MoreVertical` row menu if 2+ actions (§4.15).

- Row: bg `--background-surface`, `--radius-lg`, padding `--spacing-lg`, gap `--spacing-lg`, whole row clickable (navigates to student) with hover bg `--background-surface-elevated` and `--focus-ring`.
- Mobile (375): avatar + identity block on top; KPIs on a second line side by side; trailing action stays top-right. KPIs never get hidden — they're the reason the list exists.
- Missing values: adherence `–`, último treino `Nunca treinou` (`--text-tertiary`). Never `Invalid Date`.
- Person name: `firstName + " " + lastName`, fallback email.

### 4.13 Accordion Header

Cabeçalho colapsável de seção de conteúdo; agrupa informações (e.g. treinos dentro de uma rotina).

- Left: index chip (`1`) — 24×24, `--radius-sm`, bg `--background-brand-subtle`, text `--text-brand` Caption/Strong; then Title Body/Large Strong `--text-primary` + Meta Caption `--text-secondary` below.
- Right: optional KPI pair (OVERLINE label + Body/Default Strong value), then chevron IconButton (`ChevronDown`, rotates 180° when open, `--duration-fast`).
- Whole header is the toggle `<button aria-expanded aria-controls>`. Padding `--spacing-lg`. Body content padding `0 var(--spacing-lg) var(--spacing-lg)`.

### 4.14 Date Block

Compact date for session/billing lists: OVERLINE weekday (`SEG`) / H3 day (`21`) / OVERLINE month (`SET`), centered, `--text-secondary` for overlines, `--text-primary` for day. Width 40px. Missing date → `-`.

### 4.15 Row menu (3-dot)

Row with **2+ actions** → `RowMenu` (`src/components/RowMenu.jsx`): props `ariaLabel` (required), `onEdit`, `onDelete`, `deleteLabel` (default "Excluir"), `deleteDisabled`/`deleteDisabledTitle`, `extraItems`, `triggerDisabled`. Trigger = IconButton `MoreVertical`. Menu = dropdown: bg `--background-surface`, `--radius-lg`, `--shadow-overlay`, items Body/Default, destructive item `--feedback-error-text` (`row-menu-item--danger`). One action only → direct button/IconButton. Don't reinvent per-page menus.

### 4.16 Confirm dialog

Never `window.confirm()`. Use `ds/ConfirmDialog` (`src/components/ds/ConfirmDialog.jsx`) driven by `useConfirmDialog` (`src/hooks/useConfirmDialog.js`):

```jsx
const { dialogProps, requestConfirm } = useConfirmDialog();

const handleDelete = (item) => requestConfirm({
  message: `Excluir "${item.name}"? Esta ação não pode ser desfeita.`,
  onConfirm: () => api.delete(`/endpoint/${item.id}`),
});

{dialogProps && <ConfirmDialog {...dialogProps} />}
```

The dialog stays open and busy (buttons disabled, `busyLabel`) while `onConfirm` runs, closes afterwards, and a rejection becomes an error toast. Optional `confirmLabel` (default "Excluir") and `busyLabel`; `confirmTone="primary"` for non-destructive confirms. Markup is `ds-overlay`/`ds-dialog` with `role="alertdialog"`; Escape/scrim cancel unless busy.

### 4.16b Biblioteca patterns

- `LibraryListView` (`src/components/LibraryListView.jsx`): body of a Biblioteca list. Resolves loading → error → empty library (CTA) → toolbar + batch bar + list + footer, in that order; props `status`, `isEmptyLibrary`/`empty`, `toolbar`, `batch`, `footer`, `isNoResults`.
- `LibraryListRow` (`src/components/LibraryList.jsx`): `title`, `subtitle`, `badges` (`{ label, tone, variant: 'status' | 'tag' }`), `stats`, `rowMenuProps` (→ `RowMenu`), `onOpen` (makes the title a stretched link covering the row, so the menu/checkbox stay clickable), `selectable`/`selected`/`onToggleSelect`/`selectAriaLabel` for batch selection.
- `LibraryFooter`: "Mostrando X de Y" (`role="status"`) + ghost "Ver mais" while `shown < total`.
- `LibraryEditorLayout`: edit-page shell: ghost "Voltar" + `type-h1` title, then skeleton (`loading`), `EmptyBlock` for `notFound`/`error`, or the children (`ready`). "Not found" only after the request ends (CLAUDE.md RULE 9).

### 4.17 Modal / Bottom sheet

Mobile: sheet slides up from bottom (`--duration-slow`, `--ease-standard`), top corners `--radius-xl`. ≥768px: centered dialog `--radius-xl`, max-width 560px. bg `--background-surface`, `--shadow-overlay`, scrim `--background-overlay`. Header: title H3 + close IconButton (`X`, `aria-label="Fechar"`). Footer: actions right-aligned (mobile: full-width stacked, primary on top). Trap focus, close on Escape.

### 4.18 Tooltip & Dropdown

Tooltip: bg `--background-inverse`, text `--text-inverse` Caption, `--radius-md`, padding `var(--spacing-xs) var(--spacing-sm)`, `--shadow-overlay`, z `--z-tooltip`. Dropdown: see row menu (§4.15).

### 4.19 Tables

`--radius-none` cells; header Caption/Strong `--text-secondary`; rows Body/Default; dividers `--border-subtle`. Never overflow at 375px — `.table-col-desktop-only` / `.table-col-mobile-only` for progressive disclosure. For people lists prefer Linha de aluno over a table.

### 4.20 Empty, loading, toast

- **Empty state**: icon 32px `--icon-default` in a 64px `--radius-full` `--background-surface-elevated` circle; title H4; description Body/Default `--text-secondary`; one Primary button. Copy: "Sem [entidade] ainda" / "[Verbo] o primeiro [entidade]…".
- **Loading**: `.loading-screen` with "Carregando..." for whole-resource fetches; skeletons (`--background-surface-elevated` pulse, matching radius) for lists. Never show "não encontrado" before the GET completes.
- **Toast**: `useToast()` → `showToast(msg, 'success' | 'error')`. Visual uses the `feedback/*-bg` + `-text` pair. Never a custom toast element.

### 4.21 Charts

Only `--chart-*` tokens (sv-full / sv-cut / abandoned / track). Never brand orange, never other hues. Labels Caption `--text-secondary`.

---

## 5. Iconografia

- `lucide-react` only, `strokeWidth={2}`.
- Sizes: 16 (inline, buttons MD), 20 (nav, IconButton, buttons LG), 24 (page-level emphasis), 32 (empty state).
- Color via `--icon-default` / `--icon-brand` / `--icon-inverse` / `--icon-disabled` and `feedback/*` base tokens for status icons. **Never orange.**
- Decorative icons `aria-hidden="true"`; icon-only buttons need `aria-label`.
- No fitness clichés (dumbbells, flames, apples) as decoration.

---

## 6. Estados de interação

| Element | Hover | Focus-visible | Pressed | Disabled |
|---|---|---|---|---|
| `.btn--primary` | `--action-primary-hover` | `--focus-ring` | `--action-primary-pressed` | `--action-primary-disabled` + `--text-disabled` |
| `.btn--secondary` / `.btn--ghost` | `--background-brand-subtle` | `--focus-ring` | brand-subtle + primary border | `--text-disabled` |
| `.btn--conversion` | `--action-secondary-hover` | `--focus-ring` | `--action-secondary-pressed` | `--action-secondary-disabled` |
| `.input` | `--border-strong` | `--border-focus` + `--focus-ring` | — | surface-elevated bg + `--text-disabled` |
| clickable row/card | `--background-surface-elevated` | `--focus-ring` | — | — |
| `.icon-button`, `.nav-item` | `--background-surface-elevated` | `--focus-ring` | — | `--icon-disabled` |

Transitions: `background-color, border-color, color` over `var(--duration-fast) var(--ease-standard)`. No transform/scale/translate on hover. No shadow changes (cards never have shadow). Never `outline: none` without `--focus-ring`.

---

## 7. Voz & microcopy

TeuFit: amigável & companheiro (constância sem neura), técnico & preciso, direto. No emoji, no hype, never a shouting coach.

- Sentence case everywhere (titles, buttons, tabs). UPPERCASE only via OVERLINE style (KPI labels, status badges, date block).
- "Você", never "tu"/"vocês".
- Numbers lead: "3/4 treinos" > "Você fez 3 de 4 treinos".

| Correct | Never |
|---|---|
| Aluno | Cliente, paciente, usuário, atleta |
| Treino | Workout, training |
| Rotina | Protocolo (in UI copy) |
| Consultoria | Mentoria, coaching, pacote |
| Anamnese | Formulário de saúde, intake |
| Excluir | Deletar, remover, apagar |
| Salvar | Submeter, enviar (persistência) |
| Criar | Adicionar (como verbo de criação) |
| Carga | Peso (em treino) |
| Série / Rep / RPE / PR | Set / Repetição / Esforço percebido / Recorde pessoal |

**Exceção — área da nutricionista (`/nutritionist/*`)**: ali o termo é **"paciente"** (nunca "aluno" nem "cliente"): Meus pacientes, Convidar paciente, "Recado para o paciente". "Aluno" continua valendo em todo o resto do app (treinador). "Plano alimentar" e "refeição" substituem "rotina" e "treino" nessa área; "Prescrição" nomeia as etapas Metas → Cardápio → Orientações.

Templates: Confirm `Excluir [X]? Esta ação não pode ser desfeita.` · Empty `Sem [entidade] ainda` · Toast `[X] salvo.` · Loading `Carregando...`

---

## 8. Acessibilidade

- Contrast: text only with `text/*` or `feedback/*-text` tokens (AA). `feedback/*` base and orange are never text.
- `--focus-ring` visible on every interactive element.
- Icon-only buttons: `aria-label`. Toggle: `role="switch"` + `aria-checked`. Segmented: `role="tablist"`/`tab` + `aria-selected`. Accordion: `aria-expanded` + `aria-controls`.
- Form errors: `role="alert"`.
- Modals trap focus, close on Escape, return focus to trigger.
- Tab order = visual order; no positive `tabIndex`.
- Touch targets ≥ 44×44 on mobile.

---

## 9. Anti-padrões — NUNCA

- Hex, rgb, px literals or PRIMITIVE tokens (`--primitive-*`) in component CSS — semantic tokens only.
- Orange (`action/secondary`, Brand-Secondary) outside the WhatsApp conversion CTA.
- `box-shadow` on cards/containers. Shadow only `--shadow-overlay` on tooltip/dropdown/modal.
- Font-weight 300, 500, 800, 900.
- UPPERCASE buttons, tabs or titles; letter-spacing on buttons.
- Colored left/side bars, stripes, or rings to signal status — use Badge.
- Status shown as colored text without its `-bg` pair.
- `--radius-full` on cards, containers, buttons, inputs.
- Border + background + shadow stacked to separate things whitespace could separate.
- Transform/scale animations on hover.
- Inline `style={{}}` for fixed values; `!important`; magic z-index.
- `window.confirm`, `window.location.href` (internal), `fetch`, `error.response?.data?.message`.
- Multiple visible action buttons in a list row (use row menu).
- `Invalid Date` (use `-`), "não encontrado" before loading finishes.
- Per-page variants of shared components (`student-badge`, custom row menus, new button types).
- Magenta `#FF00FF` icon placeholder in code.

---

## 10. Checklist de review

**Tokens**
- [ ] Only semantic tokens (§2.3–2.7) in touched CSS; zero hex/px literals; zero `--primitive-*` outside `:root` alias definitions
- [ ] Spacing from `--spacing-*`, radius from `--radius-*` per usage table
- [ ] No legacy custom properties introduced

**Rules**
- [ ] Orange only on WhatsApp CTA
- [ ] No shadow on cards; overlays use `--shadow-overlay`
- [ ] Weights 400/600/700 only; type via `.type-*` scale
- [ ] Buttons sentence case
- [ ] Status = Badge with bg+text pair; no stripes
- [ ] `--radius-full` only on avatar/pill/badge/toggle
- [ ] Whitespace first; border/bg only when needed

**Components**
- [ ] Buttons use `.btn` + type modifier; one primary per view
- [ ] Badges: Tone × Style correct (Status uppercase / Tag sentence case)
- [ ] Lists of students use Linha de aluno anatomy
- [ ] Row with 2+ actions → `RowMenu`
- [ ] Charts only `--chart-*`

**Layout & a11y**
- [ ] Works at 375px with no horizontal overflow; `min-width` breakpoints only
- [ ] Touch targets ≥ 44px mobile
- [ ] `--focus-ring` on all interactive elements; aria labels/roles per §8
- [ ] Loading → content/empty order respected; no `Invalid Date`

**Code**
- [ ] No inline fixed styles; `npm run lint` clean; tests updated (`npm run test:run`)
