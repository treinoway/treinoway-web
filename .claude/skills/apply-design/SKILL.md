---
name: apply-design
description: Canonical Treinoway design system reference. Apply before finalising any component, page, or CSS change — covers tokens, component catalog, interaction states, mobile-first rules, accessibility, anti-patterns, and review checklist.
compatibility: Designed for Claude Code on the treinoway-web project
---

Review every UI change in the current task against all sections below. Fix violations before finishing.

---

## 1. Princípios

1. **Mobile-first** — base styles target 375px; add complexity upward via `min-width: 768px` and `min-width: 1024px`. Never write desktop-first overrides.
2. **Touch targets** — every interactive element must be ≥44×44px on mobile.
3. **Tokens always** — every color, spacing, radius, shadow, duration, z-index must come from a CSS variable defined in `src/index.css`. Zero raw hex, px literals, or magic numbers in components.
4. **Classes before new CSS** — check `src/index.css` for an existing class before writing a new one. Reuse first; extend via BEM modifiers second.
5. **Accessibility** — focus ring always visible (never `outline: none` without a visible substitute). `aria-label` required on every icon-only button. `role="alert"` on inline form errors.
6. **Lucide only** — `lucide-react` is the sole icon source. No other icon libraries.
7. **Never** `window.confirm`, `window.location.href` (internal nav), or `fetch` directly. Use the custom confirm dialog, `useNavigate()`, and `src/api/axios.js`.
8. **Inline styles** — acceptable only for computed/dynamic values (e.g. `style={{ width: \`${pct}%\` }}`). Never for fixed colors, spacing, or layout.
9. **UI text** in pt-BR. Code, variables, functions in English.
10. **No `console.log`** in production code.

---

## 2. Token Foundation

All tokens are defined in `src/index.css` `:root`. Use them as `var(--token-name)`.

### 2.1 Colors

| Token | Value | Semantic use |
|---|---|---|
| `--md-primary` | `#1565C0` | Main CTA, links, active states |
| `--md-on-primary` | `#FFFFFF` | Text/icon on primary bg |
| `--md-primary-container` | `#D4E3F7` | Chip/badge bg for primary context |
| `--md-on-primary-container` | `#0D3B6F` | Text on primary-container |
| `--md-secondary` | `#B55A02` | Accent (orange), secondary actions |
| `--md-on-secondary` | `#FFFFFF` | Text on secondary bg |
| `--md-secondary-container` | `#FDDCBA` | Chip/badge bg for secondary context |
| `--md-surface` | `#FFFFFF` | Card/modal backgrounds |
| `--md-on-surface` | `#1C1C1E` | Body text |
| `--md-surface-variant` | `#E8E8ED` | Dividers, input borders |
| `--md-on-surface-variant` | `#626267` | Placeholder, label, muted text |
| `--md-surface-container` | `#F0F1F4` | Page background sections |
| `--md-surface-container-high` | `#E6E7EB` | Hover bg, alt rows |
| `--md-surface-container-highest` | `#DCDDE2` | Pressed bg |
| `--md-background` | `#F8F9FB` | App background |
| `--md-error` | `#D32F2F` | Error text, danger buttons |
| `--md-error-container` | `#FDDEDE` | Error banner bg |
| `--md-success` | `#2E7D32` | Success text, badges |
| `--md-success-container` | `#D4EDDA` | Success banner bg |
| `--md-outline` | `#8E8E93` | Subtle borders |
| `--md-outline-variant` | `#C7C7CC` | Dividers, input borders default |

For raw color primitives use `--color-*` (e.g. `--color-primary`). Prefer `--md-*` aliases in components.

### 2.2 Spacing

| Token | Value | Use |
|---|---|---|
| `--spacing-xs` | 4px | Icon gap, tight inline padding |
| `--spacing-sm` | 8px | Internal element gaps, small padding |
| `--spacing-md` | 16px | Standard padding, form gap |
| `--spacing-lg` | 24px | Section padding, card padding |
| `--spacing-xl` | 32px | Between major sections |
| `--spacing-xxl` | 48px | Page top padding, hero spacing |

Rule: gaps **within** a component use `sm`/`md`; gaps **between** page sections use `lg`/`xl`.

### 2.3 Radius

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | 4px | Tags, chips |
| `--radius-sm` | 8px | Buttons, inputs |
| `--radius-md` | 14px | Cards (current — target 12px in migration) |
| `--radius-lg` | 20px | Modals, bottom sheets |
| `--radius-xl` | 28px | Floating elements |
| `--radius-full` | 9999px | Avatars, pill badges |

Note: `--radius-md` is currently 14px. Target value is 12px — tracked under Roadmap.

### 2.4 Shadows

| Token | Value | Use |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,.1), 0 1px 2px rgba(0,0,0,.06)` | Cards at rest |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,.07), 0 2px 4px rgba(0,0,0,.05)` | Dropdowns, popovers |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,.1), 0 4px 6px rgba(0,0,0,.05)` | Modals, overlays |
| `--shadow-focus` | `0 0 0 2px var(--md-primary)` | Focus ring on interactive elements |
| `--shadow-hover` | `0 4px 12px rgba(0,0,0,.08)` | Card hover elevation |

### 2.5 Typography

Fonts: **Open Sans** (`--font-family-base`) for body/UI; **Fjalla One** (`--font-family-heading`) for headings. Poppins was abandoned.

| Token | Size | Weight | Use |
|---|---|---|---|
| `--font-h1-size/weight` | 24px / 700 | Page title |
| `--font-h2-size/weight` | 20px / 600 | Section heading |
| `--font-h3-size/weight` | 18px / 500 | Card title, subsection |
| `--font-body-size/weight` | 16px / 400 | Default text |
| `--font-body-large-size/weight` | 18px / 400 | Emphasized body |
| `--font-body-small-size/weight` | 14px / 400 | Secondary/meta text |
| `--font-caption-size/weight` | 12px / 400 | Labels, captions |
| `--font-button-label-size/weight/letter-spacing` | 14px / 600 / 1.25px | Button text |
| `--font-overline-size/weight/letter-spacing` | 10px / 700 / 1.5px | Overline labels |

Line-height tokens:

| Token | Value | Use |
|---|---|---|
| `--line-height-tight` | 1.2 | Headings |
| `--line-height-normal` | 1.5 | Body text |
| `--line-height-relaxed` | 1.7 | Long-form / help text |

### 2.6 Motion

| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 150ms | State transitions (hover, focus) |
| `--duration-base` | 200ms | Mount/unmount, fade-in |
| `--duration-slow` | 300ms | Overlays, slide-up sheets |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | Elements entering the screen |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Elements moving within the screen |

Example: `transition: box-shadow var(--duration-fast) var(--ease-out);`

### 2.7 Z-index Scale

| Token | Value | Layer |
|---|---|---|
| `--z-base` | 1 | Normal stacking |
| `--z-dropdown` | 100 | Dropdowns, popovers, row menus |
| `--z-sticky` | 200 | Sticky headers |
| `--z-sidebar` | 300 | App sidebar |
| `--z-overlay` | 1000 | Overlay backdrop |
| `--z-modal` | 1100 | Modals, bottom sheets |
| `--z-toast` | 2000 | Toast notifications |
| `--z-tooltip` | 3000 | Tooltips |

Never use a raw z-index number. Always use a `--z-*` token.

### 2.8 Breakpoints

| Name | Min-width | Target |
|---|---|---|
| Mobile (base) | — | 375px |
| Tablet | 768px | Tablet landscape |
| Desktop | 1024px | Desktop |

Always `min-width` only. Never `max-width` breakpoints.

---

## 3. Layout System

### App Shell

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

### Mandatory Page Header Pattern

Every list/management page must open with:

```jsx
<div className="page-header">
  <div className="page-header-title-row">
    <Users size={24} className="page-header-title-icon" />
    <h1>Alunos</h1>
  </div>
  <div className="page-header-actions">
    <button className="btn-primary btn-primary-sm">Novo aluno</button>
  </div>
</div>
```

Icon rules: match the sidebar icon for that page, `size={24}`, `strokeWidth={1.6}`.

---

## 3.5 Brand Foundation — Athletic-Tech

DNA da marca: Whoop + Strava 2024. App de performance para treinadores sérios que trabalham com dados.

### Princípios

1. **Números são a voz** — dados grandes em Space Grotesk, tabular-nums. Dado > rótulo.
2. **CAPS tracking wide para ação** — botões, stat labels, eyebrows.
3. **Contraste alto, cor focada** — azul elétrico + laranja de alerta + preto profundo.
4. **Cantos 8px** — técnico, afiado, sem brutalismo.
5. **Motion kinetic** — 150ms hover, 280ms achievements com leve overshoot.
6. **Modo stadium (dark) para foco** — execução de treino, resumos, stats detalhados.
7. **Voz imperativa, orientada a ação, números sempre visíveis.**

### Tokens — Paleta Light (default)

| Token | Valor | Quando usar |
|---|---|---|
| `--brand-primary` | `#0A5FCC` | CTA primário, links, estados ativos |
| `--brand-primary-dark` | `#083E85` | Hover/pressed do CTA primário |
| `--brand-accent` | `#FF6B1A` | PRs, conquistas, destaques de alerta. **Nunca em CTA primário** |
| `--brand-ink` | `#0A0F1C` | Títulos display, texto de máximo contraste |
| `--brand-slate` | `#1E293B` | Texto de corpo em contexto dark, subtítulos fortes |
| `--brand-steel` | `#64748B` | Metadados, timestamps, textos auxiliares |
| `--brand-mist` | `#F1F5F9` | Fundo de seções, alternativa a surface |
| `--brand-divider` | `#E2E8F0` | Linhas de 1px entre seções; nunca para borders de input |

### Tokens — Paleta Stadium (dark)

| Token | Valor | Quando usar |
|---|---|---|
| `--stadium-bg` | `#0A0F1C` | Fundo da tela stadium |
| `--stadium-surface` | `#111827` | Cards e containers dentro do stadium |
| `--stadium-surface-elevated` | `#1E293B` | Cards elevados, hover surface |
| `--stadium-text` | `#F1F5F9` | Texto principal no contexto stadium |
| `--stadium-text-muted` | `#94A3B8` | Texto secundário/metadado no stadium |
| `--stadium-accent` | `#38BDF8` | Azul elétrico de destaque no stadium |
| `--stadium-divider` | `#1E293B` | Divisores dentro do stadium |

### Tokens — Shape, Motion, Elevation, Tipografia

| Token | Valor | Uso |
|---|---|---|
| `--radius-brand` | `8px` | Default para cards, modais, inputs (técnico, afiado) |
| `--radius-stat` | `4px` | Chips de stat, badges compactos |
| `--ease-brand` | `cubic-bezier(0.22, 1, 0.36, 1)` | Hovers e transições padrão |
| `--ease-kinetic` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Achievements e conquistas (leve overshoot) |
| `--duration-achievement` | `280ms` | Duração de animações de achievement |
| `--shadow-brand-sm` | `0 1px 2px rgba(10,15,28,.08), 0 0 0 1px rgba(10,15,28,.06)` | Card em repouso |
| `--shadow-brand-md` | `0 4px 12px rgba(10,15,28,.12), 0 0 0 1px rgba(10,15,28,.06)` | Card hover, dropdown |
| `--shadow-brand-lg` | `0 12px 32px -8px rgba(10,15,28,.16), 0 0 0 1px rgba(10,15,28,.06)` | Modal, bottom-sheet |
| `--shadow-stadium` | `0 4px 24px rgba(0,0,0,.4)` | Cards dentro do tema stadium |
| `--font-family-display` | `'Space Grotesk', 'Inter', sans-serif` | Títulos h1/h2, seções de destaque |
| `--font-family-base` | `'Inter', sans-serif` | Corpo de texto, labels, inputs |
| `--font-family-stat` | `'Space Grotesk', monospace` | Números de performance e stats |
| `--tracking-tight` | `-0.02em` | Títulos display |
| `--tracking-normal` | `0` | Corpo de texto padrão |
| `--tracking-wide` | `0.08em` | Botões, stat labels em CAPS |
| `--tracking-wider` | `0.12em` | Eyebrows, overlines em CAPS |

Regras de uso:
- `--font-family-display` + weight 600 + `var(--tracking-tight)` → H1/H2.
- `--font-family-stat` + `font-variant-numeric: tabular-nums` → qualquer número de performance.
- Botões → UPPERCASE + `var(--tracking-wide)` + `var(--radius-brand)` (8px).
- Hovers → `var(--duration-fast)` + `var(--ease-brand)`. Achievements → `var(--duration-achievement)` + `var(--ease-kinetic)`.

---

## 3.6 Iconografia & Ilustração

Fonte exclusiva: `lucide-react`. Nenhum outro pacote de ícones.

| Tamanho | Prop | Contexto |
|---|---|---|
| 16 | `size={16}` | Inline dentro de texto, chips compactos |
| 20 | `size={20}` | Itens de sidebar, itens de menu |
| 24 | `size={24}` | Header de página, botões com ícone |
| 32 | `size={32}` | Ícone de empty-state (dentro de `.empty-state-icon--accent`) |

**`strokeWidth` padrão de marca: `2`** (traço atlético, mais presente que o padrão Lucide).

```jsx
/* correto — traço atlético */
<Dumbbell size={24} strokeWidth={2} />

/* ícone como único conteúdo de botão — aria-label obrigatório */
<button onClick={onClose} aria-label="Fechar modal">
  <X size={20} strokeWidth={2} />
</button>
```

### Ilustrações

- Pack geométrico-técnico em `src/assets/illustrations/`. Line-art + blocos sólidos.
- Paleta: `--brand-primary` + `--brand-accent`. Sem gradientes fotorrealistas.
- Componente: `<BrandIllustration name="..." />` — recebe slug e renderiza inline SVG ou `<img>`.
- Dimensões padrão: **200×160px**. Responsivo com `max-width: 100%`.
- Uso: empty-states, onboarding, telas de feedback (erro 404, sessão expirada).

```jsx
/* uso típico em empty-state */
<div className="empty-state">
  <BrandIllustration name="no-trainings" />
  <p className="empty-state-title">SEM TREINOS AINDA</p>
</div>
```

### Logo

- Arquivo: `public/img/treino_way_transparente.png`
- Clear-space mínimo: igual à altura da letra "T" do logotipo em todos os lados.
- Tamanho mínimo: **80px de largura**.
- Proibido: usar sobre fundos fotográficos, distorcer proporções, colorir ou adicionar efeito.

```jsx
/* correto */
<img
  src="/img/treino_way_transparente.png"
  alt="Treinoway"
  style={{ minWidth: 80 }}
  className="logo-img"
/>

/* errado — logo esticado */
<img src="/img/treino_way_transparente.png" style={{ width: '100%', height: 40 }} />
```

---

## 3.7 Voz & Microcopy

### Princípios

1. **Números no lead** — "+12% de volume" > "Seu volume aumentou em 12%".
2. **Ação no imperativo** — "Conclua o treino", "Registre o peso".
3. **Termos técnicos aceitos** — volume, carga, RPE, PR, série, rep, ciclo.
4. **Sem emoji, sem suavização** — "Treino concluído." (não "Parabéns! Você terminou o treino!")
5. **"Você"** — nunca "tu" ou "vocês".

### Glossário controlado

| Termo correto | Nunca usar |
|---|---|
| Aluno | Cliente, paciente, usuário, atleta, trainee |
| Treino | Workout, sessão, training |
| Consultoria | Mentoria, coaching, contrato, pacote |
| Anamnese | Formulário, questionário de saúde, intake |
| Excluir | Deletar, remover, apagar |
| Salvar | Confirmar, submeter, enviar (para persistência) |
| Criar | Adicionar, incluir (como verbo) |
| PR | Record pessoal, marca pessoal (sempre abreviado) |
| Carga | Peso (para referências de treino) |
| Série | Set |
| Rep | Repetição (sempre abreviado) |
| Ciclo | Período, fase |
| RPE | Esforço percebido |

### Templates de copy

**Confirm:**
```
Excluir [X]? Esta ação não pode ser desfeita.
```

**Empty state:**
```
SEM [ENTIDADE] AINDA
[Verbo imperativo] o primeiro [entidade] para [contexto].
```

**Toast sucesso:**
```
[X] salvo.  /  PR registrado.
```

**Achievement (única exceção para "!"):**
```
Novo PR! 127kg no supino.
```

**Loading:**
```
Carregando…
```

### Exemplos before/after

| Antes (errado) | Depois (correto) |
|---|---|
| "Tem certeza que deseja deletar este aluno?" | "Excluir aluno? Esta ação não pode ser desfeita." |
| "Nenhum treino encontrado" | "SEM TREINOS AINDA — Crie o primeiro treino." |
| "Parabéns! Você alcançou uma nova marca! 🎉" | "Novo PR! 127kg no supino." |
| "Adicionar novo workout" | "Criar treino" |
| "Carregando dados, aguarde..." | "Carregando…" |

---

## 3.8 Checklist de marca

Execute este checklist em toda mudança de UI que envolva títulos, cards, modais, ícones ou copy.

- [ ] Títulos h1/h2 em `var(--font-family-display)` (Space Grotesk) + weight 600 + tracking `var(--tracking-tight)`?
- [ ] Corpo em `var(--font-family-base)` (Inter)?
- [ ] Botões em UPPERCASE + `var(--tracking-wide)` + radius `var(--radius-brand)` (8px)?
- [ ] Cards usam `var(--radius-brand)` (8px) + `var(--shadow-brand-sm)`?
- [ ] Hovers usam `var(--duration-fast)` + `var(--ease-brand)`?
- [ ] Ícones Lucide com `strokeWidth={2}` (default atlético)?
- [ ] Números/stats em `var(--font-family-stat)` + `font-variant-numeric: tabular-nums`?
- [ ] Copy obedece glossário (Aluno, Treino, Excluir, PR…)?
- [ ] Telas de stats/execução de treino usam `.theme-stadium` quando apropriado?
- [ ] `--brand-accent` (#FF6B1A) usado só em destaques/PRs, nunca em CTA primário?

---

## 4. Componentes

### 4.1 Buttons

| Class | Purpose | When |
|---|---|---|
| `btn-primary` | Main CTA | Save, create, confirm |
| `btn-primary-sm` | Compact CTA | Header actions, inline add |
| `btn-secondary` | Neutral / cancel | Back, close, cancel |
| `btn-danger` | Destructive confirm | Inside confirm dialog |
| `btn-delete` | Destructive row action | Single destructive row action |
| `btn-delete-sm` | Compact destructive | Tight rows |
| `btn-schedule-sm` | Tertiary add/schedule | Add item within a section |
| `-full` suffix | Full-width | Forms on mobile |

Loading state (mandatory when async):

```jsx
<button className="btn-primary" disabled={loading}>
  {loading ? 'Carregando...' : 'Salvar'}
</button>
```

Never: gray inline style for cancel; one-off button colors; multiple filled buttons side-by-side.

Group buttons with `<div className="btn-group">`.

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

Disabled/readonly: set `disabled` attribute — CSS handles opacity. Never override with inline style.

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
    <button className="btn-secondary btn-secondary-sm">Ver</button>
  </div>
</div>
```

Card hierarchy (RULE 8):
1. Title on its own line (`.card-title`)
2. Subtitle/meta subdued (`.card-subtitle .text-sm .text-muted`)
3. Status badge opposite title in header row
4. Dates/info below header
5. Actions in footer (`btn-group`)

Use `.card-link` when the entire card is a navigation target.
Never render `Invalid Date` — use `"-"` as fallback for any missing or unparseable date.
Person names: `firstName + " " + lastName`, fallback to `email`.

### 4.4 Modals / Bottom Sheets

```jsx
<div className="bottom-sheet">
  <div className="bottom-sheet-header">
    <h2>Editar Exercício</h2>
    <button
      className="bottom-sheet-close"
      onClick={onClose}
      aria-label="Fechar modal"
    >
      <X size={20} />
    </button>
  </div>
  <div className="bottom-sheet-body">
    {/* content */}
  </div>
</div>
```

The `.bottom-sheet` slides up from the bottom on mobile (animation uses `--duration-slow`). On desktop it behaves as a centered dialog. Z-index: `var(--z-modal)`.

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

// JSX:
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

Z-index: `.overlay` uses `var(--z-overlay)`, `.confirm-dialog` uses `var(--z-modal)`.

### 4.6 Badges

| Class | Color | Use |
|---|---|---|
| `badge` | neutral gray | Default |
| `badge-blue` | primary blue | Informational, new |
| `badge-green` | success green | Active, completed |
| `badge-red` | error red | Inactive, error, overdue |
| `badge-gray` | muted gray | Draft, disabled |

```jsx
<span className="badge badge-green">Ativo</span>
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
    <Dumbbell size={32} />
  </div>
  <p className="empty-state-title">Nenhum treino encontrado</p>
  <p className="text-muted text-sm">Crie o primeiro treino para este aluno.</p>
  <button className="btn-primary btn-primary-sm">Novo treino</button>
</div>
```

Icon always `size={32}` inside `.empty-state-icon--accent` (creates the accent circle).

### 4.10 Loading

```jsx
// Full-page loading
{loading && <div className="loading-screen">Carregando...</div>}

// Skeleton (for content placeholders)
<div className="skeleton skeleton-text" />
<div className="skeleton skeleton-card" />
```

Never show "not found" content before the GET request completes. Loading state must be set to `true` before the request fires, cleared in `finally`.

### 4.11 Toast

Toasts are triggered via `useToast()` from `ToastContext`. Z-index: `var(--z-toast)`. They slide in from the bottom. Never render a custom toast element — always use the context.

```jsx
const { showToast } = useToast();
showToast('Treino salvo com sucesso!', 'success');
showToast(error.userMessage, 'error');
```

### 4.12 Row Menu (3-dot)

Rows with **more than one action** must use `TemplateRowMenu` (source: `src/pages/trainer/TrainingTemplates.jsx`):

```jsx
<TemplateRowMenu
  ariaLabel="Opções do treino"
  onEdit={() => handleEdit(item)}
  onDelete={() => handleDelete(item)}
  deleteLabel="Excluir treino"
/>
```

Props: `ariaLabel` (required), `onDelete` (required), `onEdit` (optional), `deleteLabel` (default `"Excluir"`). Trigger: `MoreVertical` from lucide-react. Destructive item class: `row-menu-item--danger`. Z-index: `var(--z-dropdown)`.

A row with only **one action** may use a direct button.

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

Content inside `.grid-cards`, `.table-container`, `.empty-state`, and `.card.card--mb` automatically gets a `fadeIn` animation. Do not add manual fade logic for these containers.

### 4.15 Stat Display

Quando usar: dashboard, resumo de treino, progress do aluno, qualquer lugar com dado numérico protagonista.

| Variante | Classe | Número | Label |
|---|---|---|---|
| Default | `.stat-display` | 32px | CAPS 11px |
| Hero | `.stat-display--hero` | 48–72px | CAPS 11px |
| Inline | `.stat-display--inline` | 24px | CAPS 11px |

```jsx
<div className="stat-display">
  <span className="stat-display-value">
    127<span className="stat-display-unit">kg</span>
  </span>
  <span className="stat-display-label">VOLUME TOTAL</span>
  <span className="stat-display-trend stat-display-trend--up">+12%</span>
</div>
```

Trend classes: `.stat-display-trend--up` (verde, seta cima), `.stat-display-trend--down` (vermelho, seta baixo), `.stat-display-trend--neutral` (steel, sem seta).

Anti-padrão: usar `<h1>` ou tipografia normal para exibir números de performance. Sempre use `.stat-display` e `--font-family-stat` + `tabular-nums`.

### 4.16 Stadium Theme

Quando usar: execução de treino, resumo pós-treino, dashboards de stats detalhados — contextos de foco em dados onde o modo escuro reduz distração.

Como aplicar: envolver a seção com `<div className="theme-stadium">` ou `<section className="theme-stadium">`. Todos os componentes filhos herdam a paleta `--stadium-*` automaticamente via CSS cascade.

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

Anti-padrão: usar `.theme-stadium` em páginas inteiras de CRUD/gestão (listagem de alunos, formulários, configurações). Stadium é para foco em dados de performance, não para admin.

---

## 5. Estados de Interação

| Element | Default | Hover | Focus-visible | Active | Disabled | Loading |
|---|---|---|---|---|---|---|
| `btn-primary` | primary bg | `--shadow-hover` + slight darken | `--shadow-focus` 2px offset | scale(0.98) | 50% opacity, cursor not-allowed | "Carregando...", disabled |
| `btn-secondary` | surface bg, border | surface-container-high bg | `--shadow-focus` | scale(0.98) | 50% opacity | "Carregando...", disabled |
| `btn-danger` | error bg | darker error | `--shadow-focus` error color | scale(0.98) | 50% opacity | "Carregando...", disabled |
| `form-input` | outline-variant border | outline border | `--shadow-focus` | — | 50% opacity, cursor not-allowed | — |
| `.card` | `--shadow-sm` | `--shadow-hover` | — | — | — | skeleton pulse |
| `.card-link` | `--shadow-sm` | `--shadow-hover`, translateY(-1px) | `--shadow-focus` | scale(0.99) | — | — |
| row menu trigger | transparent | surface-container bg | `--shadow-focus` | — | — | — |

Transition rule: use `var(--duration-fast) var(--ease-out)` for hover/focus transitions. Use `var(--duration-slow) var(--ease-out)` for overlays/sheets.

Focus must always be visible. Never `outline: none` without replacing it with `box-shadow: var(--shadow-focus)`.

---

## 6. Iconografia

Source: **`lucide-react` exclusively**. No other icon package.

| Size | `size` prop | Use |
|---|---|---|
| 16 | `size={16}` | Inline within text, tight chips |
| 20 | `size={20}` | Sidebar nav items, menu items |
| 24 | `size={24}` | Page header, buttons with icon |
| 32 | `size={32}` | Empty state accent circle |

Default `strokeWidth`: **1.6** (matches Material Design 3 style). Only deviate if there is a strong visual reason.

When an icon is the **sole content** of a button, `aria-label` is required:

```jsx
<button onClick={onClose} aria-label="Fechar modal">
  <X size={20} />
</button>
```

---

## 7. Acessibilidade

- **Touch targets** ≥ 44×44px on mobile. Add `min-height: 44px; min-width: 44px` if the visual size is smaller.
- **Contrast** — the Material 3 palette already meets WCAG AA. Never override primary/error colors with custom values.
- **Focus ring** — `box-shadow: var(--shadow-focus)` on `:focus-visible`. Never `outline: none` without it.
- **Icon buttons** — always `aria-label`.
- **Form errors** — always `role="alert"` on `.form-error` span so screen readers announce them.
- **Tab order** — matches visual reading order. Never use positive `tabIndex` values.
- **Modals** — trap focus while open. Close on Escape key.
- **Loading state** — announce with `aria-live="polite"` region if the content change is significant.

---

## 8. Anti-padrões — NUNCA faça

- `window.confirm()` — use the custom confirm dialog (section 4.5).
- `window.location.href` for internal navigation — use `useNavigate()`.
- `fetch()` directly — use `src/api/axios.js`.
- Raw hex colors, px values, or margin/padding as inline styles — use CSS tokens.
- `outline: none` without a focus substitute — always provide `box-shadow: var(--shadow-focus)`.
- `!important` — never. Increase specificity instead.
- Icons from any package other than `lucide-react`.
- Creating a new CSS class without checking `src/index.css` first.
- Showing a list/content before the loading state resolves.
- Showing "não encontrado" before the GET request completes.
- Displaying `Invalid Date` — always fall back to `"-"`.
- Multiple visible action buttons in a table/list row — use `TemplateRowMenu`.
- Magic z-index numbers (e.g. `z-index: 9999`) — use `var(--z-*)` tokens.
- Hard-coded transition durations (e.g. `transition: 0.2s`) — use `var(--duration-*)`.
- Hard-coded line-heights — use `var(--line-height-*)`.
- Importing React explicitly — JSX transform handles it.
- `error.response?.data?.message` directly — use `error.userMessage`.
- `getErrorMessage(error, 'hardcoded fallback')` — always use `error.userMessage || translateError(error)`.

---

## 9. Checklist de Review

Run through every item before marking a UI task complete.

### Tokens & CSS
- [ ] Zero raw hex, px literals, or inline fixed colors/spacing — all via `var(--*)`
- [ ] No new CSS class that duplicates one already in `src/index.css`
- [ ] New styles added to `src/index.css` in the correct section with BEM naming
- [ ] Z-index uses `var(--z-*)` — no magic numbers
- [ ] Transitions use `var(--duration-*)` and `var(--ease-*)` — no hardcoded `0.2s ease`
- [ ] Line-heights use `var(--line-height-*)` where specified

### Mobile-first
- [ ] Base styles work at 375px without horizontal overflow
- [ ] All breakpoints use `min-width` only
- [ ] Touch targets ≥ 44×44px on interactive elements
- [ ] Page padding follows the responsive scale (16 → 24 → 32px)

### Components & Hierarchy
- [ ] Correct button class for each action (primary / secondary / danger / schedule-sm)
- [ ] `btn-group` wraps sibling buttons
- [ ] Cards follow the 5-point visual hierarchy (title → subtitle → badge → meta → footer)
- [ ] `Invalid Date` never rendered — fallback to `"-"`
- [ ] Person names use `firstName + lastName`, fallback to email

### Interactivity
- [ ] Rows with 2+ actions use `TemplateRowMenu`, not multiple visible buttons
- [ ] `window.confirm()` never used — custom confirm dialog pattern in place
- [ ] Loading state set before request; inputs/buttons disabled during loading; button shows "Carregando..."
- [ ] "not found" / empty state only shown after the request completes

### Accessibility
- [ ] Focus ring visible on all interactive elements (never `outline: none` without substitute)
- [ ] Icon-only buttons have `aria-label`
- [ ] Inline form errors have `role="alert"`
- [ ] Tab order follows visual reading order

### Icons
- [ ] All icons from `lucide-react` only
- [ ] Icon sizes: 16 (inline) / 20 (sidebar) / 24 (header/button) / 32 (empty state)
- [ ] Default `strokeWidth={1.6}`

### API & Errors
- [ ] All API calls use `src/api/axios.js`
- [ ] Errors use `error.userMessage` or `translateError(error)` — never `error.response?.data?.message`
- [ ] New `messageCode` values added to `src/i18n/locales/pt-BR.js`

### Marca
- [ ] Rodar o **Checklist de marca (§3.8)** — 10 itens Athletic-Tech: tipografia Space Grotesk, botões CAPS, radius 8px, strokeWidth 2, stats com tabular-nums, glossário, stadium theme quando aplicável, `--brand-accent` só em PRs/destaques.

---

## 10. Roadmap

Items documented here are known inconsistencies in the current codebase. They are prescribed corrections for future incremental refactors — do not fix them as a side effect of unrelated tasks.

1. **Dark theme** — add `@media (prefers-color-scheme: dark)` overrides for all `--color-*` and `--md-*` tokens. Component code should require no changes if tokens are used correctly.
2. **Normalize `--radius-md`** — currently 14px; target is 12px for alignment with the 4/8/12/16 scale. Requires a visual pass across all card and input components.
3. **Migrate magic z-index** — the codebase has raw `z-index` values (10, 50, 100, 9999, etc.). Migrate all to `var(--z-*)` tokens.
4. **Migrate hardcoded transitions** — many components use `transition: 0.2s ease`. Replace with `var(--duration-fast) var(--ease-out)`.
5. **Add line-heights to components** — `--line-height-tight/normal/relaxed` tokens are defined but not yet applied to typography classes in `index.css`. Apply systematically to `.card-title`, `.card-description`, `h1`–`h3`, body text.
6. **Eliminate remaining inline styles** — audit for `style={{ color: '...', padding: '...', fontSize: '...' }}` fixed values and move to CSS classes.
7. **Shadow-sm / shadow-md adoption** — `--shadow-sm` and `--shadow-md` are now defined as tokens. Audit the ~3 current usages that existed before tokenisation to confirm they resolve correctly.
