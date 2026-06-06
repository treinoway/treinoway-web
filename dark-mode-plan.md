# Dark Mode em `treinoway-web` — Foundation + áreas críticas

## Context

Hoje o `treinoway-web` tem todo o sistema de cores em tokens (`--brand-*`, `--md-*`, `--color-*`) e já existe uma paleta dark **parcial** chamada `--stadium-*` aplicada via classe `.theme-stadium` (usada apenas em telas de execução de treino). Não existe dark mode global, mas o `Roadmap §11` da skill `apply-design` já lista isso como item #1.

O objetivo é ativar dark mode **global** com 3 estados (`Auto` / `Claro` / `Escuro`), persistido em localStorage **e** sincronizado com `UserPreferences.rawPreferences.theme` no backend (campo já existe em `treinoway-service/prisma/schema.prisma:55-68` — sem migration). Escopo: foundation + áreas críticas (sombras, overlay, avatar, macros, warnings). Fica fora desta entrega: `BrandingPreview` (cor dinâmica do trainer), `GoogleIcon` (cores oficiais), illustrations SVG com `#FF6B1A` hardcoded, variant dark do logo PNG. Estes ficam como TODO no roadmap.

**Toda escrita de código frontend deve ser delegada ao agent `frontend-engineer`** (Rule 0 do `treinoway-web/CLAUDE.md`). Antes de qualquer mudança visual, invocar a skill `apply-design`. Backend (etapa 1, abaixo) é trivial e direto.

## Arquitetura

- **Estado**: `ThemeContext` + hook `useTheme()` retornando `{ preference: 'auto'|'light'|'dark', resolved: 'light'|'dark', setPreference }`. Internamente reusa o padrão de `src/hooks/useActiveMode.js:1-54` para localStorage + `storage` event sync entre abas.
- **DOM**: `document.documentElement.setAttribute('data-theme', 'light'|'dark')`. Quando `preference === 'auto'`, **remove** o atributo e deixa o CSS resolver via `@media (prefers-color-scheme: dark)`.
- **CSS strategy**: tripla — `:root` (light default), `:root[data-theme="dark"]` (forçado), e `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` (auto). Cada bloco override duplica os mesmos tokens (~70 linhas duplicadas; aceitável sem PostCSS).
- **Anti-FOUC**: `<script>` síncrono inline no `index.html` `<head>`, antes de qualquer `<link rel="stylesheet">`, lendo `localStorage['treinoway.themePreference']` e aplicando `data-theme` antes do paint.
- **Hidratação pós-login**: `AuthContext` carrega `user` via `/me?include=...,preferences`. Um `useEffect` no `ThemeProvider` compara `user.preferences.rawPreferences?.theme` com localStorage. **Backend é fonte da verdade canônica** — se diferir, atualiza localStorage + DOM. Aceita "flicker" raro pós-login.
- **Logout**: limpa `treinoway.themePreference` do localStorage para evitar flash de tema do usuário anterior no próximo login.
- **Sync com backend**: `setPreference` despacha `PATCH /me/profile` com debounce de 500ms (fire-and-forget; falha mostra toast e mantém localStorage). Faz **merge no cliente** de `rawPreferences` para não sobrescrever outras chaves: `{ ...user.preferences.rawPreferences, theme }`.

## Backend (`treinoway-service`) — verificado

**Zero mudanças necessárias.** Confirmado via leitura direta do código:
- `api/schemas/user-route.schema.js:218-228` — schema do `PATCH /me/profile` já aceita `preferences.rawPreferences` (`type: 'object', additionalProperties: true`).
- `src/services/user-service.js:315-321` — `updateUserProfile` já faz upsert de `rawPreferences` (substitui o JSON inteiro; merge ficará no cliente).
- `src/constants/user-relations.js:36` — `'preferences'` já está em `ALLOWED_USER_RELATIONS`, então `GET /me?include=preferences` já retorna `rawPreferences`.

**Convenção**: `rawPreferences.theme: 'auto' | 'light' | 'dark'`.

## Frontend — arquivos novos

| Caminho | Propósito |
|---|---|
| `src/hooks/useThemePreference.js` | Hook puro de persistência local. Template = `useActiveMode.js`. `STORAGE_KEY = 'treinoway.themePreference'`, `VALID = ['auto','light','dark']`, `DEFAULT = 'auto'`. |
| `src/hooks/useThemePreference.test.js` | Testes Vitest. |
| `src/contexts/ThemeContext.jsx` | `ThemeProvider` + `useTheme()`. Resolve `auto` via `matchMedia('(prefers-color-scheme: dark)')` + listener. Sincroniza com backend (debounced PATCH). |
| `src/contexts/ThemeContext.test.jsx` | Testes (mock Auth + axios). |
| `src/components/ThemeToggle.jsx` | Segmented control 3-state (`Sun` / `Monitor` / `Moon` lucide-react, `strokeWidth={2}`, `size={18}`). Prop `compact` esconde labels. **Zero inline styles**. |
| `src/components/ThemeToggle.test.jsx` | Testes RTL + userEvent. |
| `src/api/preferences.js` | Wrapper `updateThemePreference(theme, currentRaw)` → `axios.patch('/me/profile', { preferences: { rawPreferences: { ...currentRaw, theme } } })`. |

## Frontend — arquivos modificados

| Caminho | Mudança |
|---|---|
| `index.html:1-17` | Inserir `<script>` inline anti-FOUC no `<head>`, **antes** das `<link>` de fonte. ~12 linhas. |
| `src/App.jsx` | Inserir `<ThemeProvider>` entre `ToastProvider` e `ErrorBoundary`. |
| `src/contexts/AuthContext.jsx:109,146,188,226` | Trocar `?include=address,socials` por `?include=address,socials,preferences` em todos os pontos que chamam `/me`. Persistir `preferences` no `localStorage['user']`. |
| `src/index.css` | Tokens dark + áreas críticas. Detalhe abaixo. |
| `src/pages/Profile.jsx:~673` | Inserir nova `<section className="card">` "Aparência" com `<ThemeToggle />` **antes** do card "Conta" (L675-683). |
| `src/components/Layout.jsx:~317` | Inserir `<ThemeToggle compact />` no footer da sidebar acima do bloco do usuário. Esconder em mobile via CSS. |
| `src/i18n/locales/pt-BR.js` | Nova seção `appearance: { title, theme, auto, light, dark, autoHint }`. |

## CSS — `src/index.css` (detalhe)

### Tokens novos a criar (light + dark) no `:root` base

- `--color-overlay`: `rgba(10, 15, 28, 0.55)` light → `rgba(0, 0, 0, 0.7)` dark
- `--color-hover-overlay`: `rgba(0, 0, 0, 0.04)` light → `rgba(255, 255, 255, 0.06)` dark
- `--color-surface-inverse`: `#0A0F1C` light → `#1C2128` dark (substitui `#000` em `.ai-chat__message--user`)
- `--macro-protein`: `#3B82F6` light → `#60A5FA` dark
- `--macro-carbs`: `#F59E0B` light → `#FBBF24` dark
- `--macro-fat`: `#EF4444` light → `#F87171` dark
- `--md-warning`, `--md-warning-container`, `--md-on-warning-container`: já em L215; criar versões dark.
- `--avatar-{0..5}-bg` e `--avatar-{0..5}-fg`: extrair as 6 cores (L9797-9802) para tokens, criar overrides dark.

### Tokens existentes a duplicar em `:root[data-theme="dark"]` + `@media`

| Token | Valor dark proposto |
|---|---|
| `--color-background` / `--md-background` | `#0F1419` |
| `--color-on-background` | `#E8EAED` |
| `--color-surface` / `--md-surface` | `#161B22` |
| `--color-on-surface` | `#E8EAED` |
| `--color-surface-variant` | `#1C2128` |
| `--color-on-surface-variant` | `#9DA5B0` |
| `--color-surface-container` | `#1C2128` |
| `--color-surface-container-high` | `#22282F` |
| `--color-surface-container-highest` | `#2A3038` |
| `--color-outline` | `#5E6873` |
| `--color-outline-variant` / `--md-outline-variant` | `#30363D` |
| `--color-error-container` | `#4D1414` |
| `--color-success-container` | `#0F2E1A` |
| `--brand-ink` | `#E8EAED` |
| `--brand-slate` | `#C9D1D9` |
| `--brand-steel` | `#8B949E` |
| `--brand-mist` | `#1C2128` |
| `--brand-divider` | `#30363D` |
| `--brand-accent-container` | `#3D2410` |

### Sombras dark (substitui rgba preto por hairline + glow leve)

```css
--shadow-brand-sm: 0 0 0 1px rgba(255, 255, 255, 0.06);
--shadow-brand-md: 0 4px 12px -2px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.06);
--shadow-brand-lg: 0 16px 40px -8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08);
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.35);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.4);
```

### Substituições de cores hardcoded (linhas exatas)

- L675 `.sidebar-link:hover` → `var(--color-hover-overlay)`
- L4390-4470 `.overlay` background → `var(--color-overlay)`
- L5024 `.ai-chat__message--user .ai-chat__message-content` → `var(--color-surface-inverse)`
- L9043-9081 `.exercise-row-card--warning` família → tokens warning
- L9797-9802 `.avatar-color-0..5` → tokens avatar
- L10950-10978 `.macro-bar-segment--*` → tokens macro

**Não tocar**: L181-189 (`--stadium-*` definições) nem L8932-8986 (`.theme-stadium` overrides). `.theme-stadium` continua isolado em telas de execução de treino — em dark global, a especificidade de classe vence o atributo, então não há conflito.

## i18n — `src/i18n/locales/pt-BR.js`

```js
appearance: {
  title: 'Aparência',
  theme: 'Tema',
  auto: 'Automático',
  light: 'Claro',
  dark: 'Escuro',
  autoHint: 'Acompanha o sistema',
}
```

## Testes (Rule 1 — obrigatório)

- `useThemePreference.test.js`: default `'auto'`, rejeita inválidos, sync via `storage` event.
- `ThemeContext.test.jsx`: Provider expõe `preference` + `resolved`, `setPreference` atualiza `data-theme` no `documentElement`, `auto` remove atributo, debounce do PATCH, merge com `rawPreferences` existente, fallback a localStorage se PATCH falha.
- `ThemeToggle.test.jsx`: 3 botões, click muda preference, `aria-pressed` correto, variante `compact` esconde labels, ícones lucide com `strokeWidth={2}`.
- `Layout.test.jsx` (existente): adicionar caso "ThemeToggle aparece no footer desktop / oculto em mobile".

## Ordem de execução

1. **CSS tokens** — Adicionar tokens novos no `:root` base + blocos `:root[data-theme="dark"]` e `@media (prefers-color-scheme: dark)`. Substituir cores hardcoded (linhas listadas acima). Criar tokens `--macro-*`, `--avatar-*-bg/fg`, `--color-overlay`, `--color-hover-overlay`, `--color-surface-inverse`, sombras dark. → `frontend-engineer` + `apply-design` skill. Commit: `style(theme): introduce dark-mode tokens and tokenize hardcoded colors`.
2. **Hook `useThemePreference` + testes** → `frontend-engineer`. Commit: `feat(theme): add useThemePreference hook`.
3. **`ThemeContext` + Provider + `src/api/preferences.js` + testes** → `frontend-engineer`. Commit: `feat(theme): theme context with backend sync`.
4. **Anti-FOUC inline script em `index.html`** → `frontend-engineer`. Commit: `feat(theme): anti-FOUC inline script`.
5. **Mount Provider em `App.jsx` + atualizar `?include=...,preferences` em `AuthContext.jsx` (4 pontos) + clear localStorage no logout** → `frontend-engineer`. Commit: `feat(theme): mount provider, hydrate from /me`.
6. **i18n strings** → `frontend-engineer`. Commit: `feat(i18n): appearance section`.
7. **`<ThemeToggle />` componente + testes** → `frontend-engineer`. Commit: `feat(theme): add ThemeToggle component`.
8. **Inserir toggle em `Profile.jsx` + `Layout.jsx` + testes atualizados** → `frontend-engineer`. Commit: `feat(theme): wire toggle in profile and sidebar`.
9. **Validação**: `npm run lint` (zero novos warnings — em particular `react/forbid-dom-props` para inline `style`), `npm run test:run`, `npm run build`.

## Critical files

- `src/index.css` (tokens + áreas críticas)
- `index.html` (anti-FOUC script)
- `src/contexts/ThemeContext.jsx` (novo)
- `src/hooks/useThemePreference.js` (novo, espelha `useActiveMode.js:1-54`)
- `src/components/ThemeToggle.jsx` (novo)
- `src/api/preferences.js` (novo)
- `src/contexts/AuthContext.jsx` (4 pontos de `/me`)
- `src/App.jsx` (montar Provider)
- `src/pages/Profile.jsx` (seção Aparência)
- `src/components/Layout.jsx` (toggle compact no footer)
- `src/i18n/locales/pt-BR.js` (seção appearance)

## Verificação end-to-end (manual no browser)

Com `npm run dev`:

1. **Auto seguindo OS**: preference = auto; alternar tema do macOS (System Settings → Appearance) → app reflete em <1s sem reload.
2. **Switch sem reload**: alternar Light → Dark → Auto no Profile e na Sidebar; ambos refletem mutuamente em tempo real.
3. **Anti-FOUC**: F5 com preference = dark → background nasce escuro (sem flash branco).
4. **Persistência cross-login**: trocar para dark, logout, login → ainda dark (vem do backend; localStorage também).
5. **Sync entre 2 abas**: abrir 2 abas, mudar em uma → outra atualiza via `storage` event.
6. **Cross-device (simular)**: limpar `localStorage['treinoway.themePreference']`, logar com user que tem `dark` no backend → deve resolver para dark após `/me`.
7. **`.theme-stadium` intacta**: navegar até execução de treino em dark global → deve permanecer com a paleta stadium própria, sem regressão.
8. **Áreas críticas legíveis em dark**: modal overlay, toast (success + error), avatares (6 cores), macro bar (3 segmentos), warning rows (`.exercise-row-card--warning`), sombras de cards visíveis.
9. **TODO conhecido (esperado quebrado)**: `BrandingPreview`, `GoogleIcon`, illustrations `.svg` com `#FF6B1A`, logo PNG. Documentar em PR e abrir issues separadas.

## Riscos e trade-offs

1. **FOUC residual**: script inline antes das `<link>` de fonte; pode bloquear paint por ~1ms. Aceitável.
2. **Race localStorage vs backend pós-login**: mitigado limpando `treinoway.themePreference` no logout; usuário deslogado perde preferência (volta para Auto). Aceitável.
3. **`updateUserProfile` substitui `rawPreferences` inteiro** (`user-service.js:321`): mitigado com merge no cliente em `src/api/preferences.js`. Se outra feature começar a escrever em `rawPreferences` em paralelo, há risco de conflito — futuro endpoint `PATCH /me/preferences/raw` com merge server-side resolve.
4. **Carga adicional no backend**: debounce de 500ms no Provider; última escrita ganha.
5. **Telas fora de escopo visualmente "estranhas" em dark**: documentado nos itens de TODO.
6. **`.theme-stadium` x dark global**: classe vence atributo; verificado manualmente em §verificação item 7.
7. **Lint zero new warnings**: `<ThemeToggle />` deve usar apenas classes CSS (memória do usuário sobre zero inline styles).
8. **Acessibilidade WCAG AA**: `--color-on-surface` (#E8EAED) sobre `--color-surface` (#161B22) → ratio ~14:1 ✓.
