# CLAUDE.md — Treinoway Web

## Stack & Comandos

- **Stack:** React 19, Vite 7, vanilla CSS (sem Tailwind), Firebase Auth, Axios
- `npm run dev` — dev server
- `npm run test:run` — rodar testes (single run)
- `npm run lint` — ESLint

## Estrutura

```
src/
├── api/axios.js           # Axios instance + interceptors (token refresh, error handling)
├── components/            # Componentes reutilizáveis (Layout, modais, forms)
├── contexts/              # AuthContext, ToastContext
├── hooks/                 # Custom hooks (usePersistedViewMode)
├── constants/             # Enums e labels (exerciseTypes, weekDays)
├── utils/                 # Helpers puros (dateFormat, errorMessages, youtube)
├── pages/                 # Páginas organizadas por domínio (trainer/, my/)
├── i18n/                  # Internacionalização (pt-BR)
├── test/setup.js          # Setup do Vitest
├── test/test-utils.jsx    # renderWithRouter, renderWithRoute, re-exports RTL
└── index.css              # CSS monolítico com todo o design system
```

---

## REGRA 1: Testes Obrigatórios

**Toda alteração de código DEVE incluir testes.** Sem exceção.

- **Framework:** Vitest + React Testing Library + @testing-library/user-event
- **Arquivos:** `NomeDoArquivo.test.jsx` no mesmo diretório do componente
- **Utilitários:** importar de `../../test/test-utils` (nunca direto de @testing-library/react)
- **Padrões de teste:**
  - Queries por **role, label, placeholder** (user-centric, nunca por classe CSS ou data-testid)
  - `userEvent.setup()` para interações, `waitFor()` para async
  - Mock de contextos: `vi.mock('../contexts/ToastContext')`, `vi.mock('../contexts/AuthContext')`
  - Mock de API: `vi.mock('../api/axios')` com respostas condicionais por URL
  - `beforeEach` para resetar mocks
- **O que testar:**
  - Renderização condicional e estados (loading, empty, error, success)
  - Interações do usuário (clique, digitação, seleção, submit)
  - Chamadas de API (verificar payload, headers, tratamento de erro)
  - Validação de formulários
- **Rodar:** `npm run test:run` — todos os testes devem passar antes de considerar a tarefa concluída

---

## REGRA 2: Design System (CSS)

**Todo código visual DEVE usar os tokens e classes existentes em `src/index.css`.** Nunca inventar valores hardcoded.

### Mobile-First (obrigatório)
- Estilos base = mobile. Ajustes maiores via `@media (min-width: 768px)` e `(min-width: 1024px)`
- Mobile: bottom nav, padding `--spacing-md`. Tablet+: sidebar, padding `--spacing-xl`

### Tokens (usar SEMPRE via variável CSS)

| Categoria | Tokens principais |
|-----------|-------------------|
| **Cores** | `--md-primary`, `--md-on-primary`, `--md-primary-container`, `--md-secondary`, `--md-error`, `--md-success`, `--md-surface`, `--md-on-surface` |
| **Espaçamento** | `--spacing-xs` (4), `--spacing-sm` (8), `--spacing-md` (16), `--spacing-lg` (24), `--spacing-xl` (32), `--spacing-xxl` (48) |
| **Raio** | `--radius-xs` (4), `--radius-sm` (8), `--radius-md` (14), `--radius-lg` (20), `--radius-xl` (28), `--radius-full` (9999) |
| **Tipografia** | Font: Poppins. Classes: `h1`–`h3`, `.body-large`, `.body-small`, `.caption`, `.overline` |
| **Sombras** | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |

### Classes reutilizáveis (usar antes de criar novas)

- **Botões:** `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-edit`, `.btn-delete`, variantes `-sm` e `-full`
- **Forms:** `.form`, `.form-group`, `.form-label`, `.form-input`, `.form-select`, `.form-textarea`, `.form-error`, `.form-input--error`
- **Cards:** `.card`, `.card-link`, `.card-header`, `.card-title`, `.card-description`, `.card-gradient`
- **Modais:** `.bottom-sheet`, `.bottom-sheet-header`, `.bottom-sheet-body`, `.bottom-sheet-close`
- **Badges:** `.badge`, `.badge-blue`, `.badge-green`, `.badge-red`, `.badge-gray`
- **Alerts:** `.alert`, `.alert-success`, `.alert-error`, `.alert-info`
- **Grid:** `.grid-cards` (responsivo 1→2→3 colunas), `.grid-2col`
- **Info:** `.info-list`, `.info-item`, `.info-label`, `.info-value`
- **Utilitários:** `.text-muted`, `.text-sm`, `.mb-sm`, `.mb-md`, `.mt-md`, `.font-medium`

**Ícones:** Lucide React (`lucide-react`). Nunca usar outro pacote de ícones.

---

## REGRA 3: Boas Práticas React

- **Componentes funcionais** com hooks. Nunca class components.
- **Estado:** `useState` para estado local, Context API para estado global (AuthContext, ToastContext). Nunca prop drilling excessivo.
- **Custom hooks:** extrair lógica reutilizável para `src/hooks/`. Hooks devem começar com `use`.
- **API:** usar a instância de `src/api/axios.js` (nunca criar nova instância ou usar fetch). Interceptors já tratam token e erros.
- **Rotas protegidas:** usar `<ProtectedRoute>` + `<Layout>` wrapper.
- **Formulários:** inputs controlados com `useState`. Validação inline com `.form-error`.
- **Efeitos:** `useEffect` com cleanup adequado. Dependências explícitas no array.
- **Memoização:** usar `useMemo`/`useCallback` apenas quando houver problema de performance mensurável, não preventivamente.
- **Composição sobre herança.** Preferir props e children a HOCs complexos.
- **Imports:** React não precisa ser importado (JSX transform). Importar apenas o necessário.

---

## REGRA 4: Revisão de Código (Clean Architecture)

**Após implementar qualquer alteração, SEMPRE revisar o próprio código aplicando estes princípios:**

### Checklist de auto-revisão

1. **Responsabilidade única:** cada componente/função faz UMA coisa. Se faz mais de uma, extrair.
2. **Separação de camadas:**
   - `pages/` → orquestração (state, effects, API calls, renderização)
   - `components/` → UI reutilizável (recebe props, sem chamadas API diretas)
   - `hooks/` → lógica de estado reutilizável
   - `utils/` → funções puras sem side effects
   - `constants/` → valores estáticos e enums
   - `contexts/` → estado global compartilhado
3. **DRY:** se um padrão se repete 3+ vezes, extrair para componente/hook/util.
4. **Nomes expressivos:** variáveis, funções e componentes devem descrever o que fazem. Sem abreviações obscuras.
5. **Sem código morto:** remover imports não usados, variáveis órfãs, comentários obsoletos.
6. **Funções pequenas:** máximo ~30 linhas. Se ultrapassar, quebrar em funções menores.
7. **Early return:** preferir guard clauses a aninhamento profundo de if/else.
8. **Tratamento de erros:** tratar erros de API com try/catch e feedback visual ao usuário via toast ou inline error.
9. **Sem lógica no JSX:** extrair condicionais complexas e maps com lógica para variáveis/funções antes do return.

---

## REGRA 5: Ações em Linhas de Lista

**Quando uma linha de lista tiver mais de uma ação, as ações DEVEM ser agrupadas em um menu de 3 pontos (`TemplateRowMenu` ou equivalente).** Nunca colocar múltiplos botões de ação visíveis diretamente na linha.

- **Componente:** `TemplateRowMenu` em `src/pages/trainer/TrainingTemplates.jsx` (reutilizável via props `onEdit`, `onDelete`, `deleteLabel`, `ariaLabel`)
- **Padrão:** botão ⋮ (`MoreVertical` do lucide-react) abre dropdown com as ações
- **Quando uma ação for destrutiva/remoção:** usar `row-menu-item--danger`
- **aria-label do trigger:** descrever o item da lista, ex: `Ações do exercício ${name}`
- **Exceção:** linha com apenas UMA ação pode ter botão direto

---

## Convenções Gerais

- **Idioma do código:** inglês (variáveis, funções, componentes). UI em pt-BR via i18n.
- **Arquivo CSS:** adicionar novos estilos em `src/index.css`, agrupados na seção correta. Verificar se já existe classe similar antes de criar nova.
- **Novos componentes:** criar em `src/components/`. Criar teste junto.
- **Novas páginas:** criar em `src/pages/` no subdiretório correto. Criar teste junto.

---

## REGRA 6: Modelos vs Entidades Reais

**O app diferencia modelos (templates reutilizáveis) de entidades reais (instâncias vinculadas a um aluno).** Os fluxos de criação devem respeitar o contexto:

### Contexto de Aluno (rotina real — ex: ProtocolDetail)
- Ao adicionar exercício/treino, **SEMPRE** oferecer duas opções:
  1. **Criar novo** — cria a entidade real diretamente (ex: `POST /trainer/trainings/:id/exercises`)
  2. **Importar de modelo** — instancia a partir de um template existente (ex: `POST /trainer/exercises/from-template`)
- **Nunca** forçar criação de modelo no contexto de entidade real
- Entidades reais são **sempre vinculadas a um usuário/aluno** via protocol

### Contexto de Modelo (páginas de templates)
- Permitir criação de sub-modelos inline:
  - Criando modelo de treino → pode criar modelo de exercício inline
  - Criando modelo de rotina → pode criar modelo de treino inline
- Usar `CreateExerciseTemplateModal` para modelos, `CreateExerciseModal` para entidades reais

### Componentes
- `CreateExerciseModal` — cria/edita exercício real (`POST /trainer/trainings/:id/exercises`, `PATCH /trainer/exercises/:id`)
- `CreateExerciseTemplateModal` — cria/edita modelo de exercício (`POST /trainer/exercise-templates`, `PATCH /trainer/exercise-templates/:id`)
- UI de escolha: `segmented-toggle` com "Criar novo" e "Importar de modelo"
