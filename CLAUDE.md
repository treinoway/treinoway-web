# CLAUDE.md — Treinoway Web

## Stack & Comandos

- **Stack:** React 19, Vite 7, vanilla CSS (sem Tailwind), Firebase Auth, Axios
- `npm run dev` — dev server
- `npm run test:run` — rodar testes (single run)
- `npm run lint` — ESLint

---

## REGRA 1: Testes Obrigatórios

**Toda alteração de código DEVE incluir testes.** Sem exceção.

- **Framework:** Vitest + React Testing Library + @testing-library/user-event
- **Arquivos:** `NomeDoArquivo.test.jsx` no mesmo diretório do componente
- **Utilitários:** importar de `../../test/test-utils` (nunca direto de @testing-library/react)
- Queries por **role, label, placeholder** — nunca por classe CSS ou data-testid
- `userEvent.setup()` para interações, `waitFor()` para async
- Mock de contextos: `vi.mock('../contexts/ToastContext')`, `vi.mock('../contexts/AuthContext')`
- Mock de API: `vi.mock('../api/axios')` com respostas condicionais por URL
- `beforeEach` para resetar mocks
- Testar: estados (loading, empty, error, success), interações, chamadas de API, validações
- **Rodar:** `npm run test:run` — todos os testes devem passar antes de considerar a tarefa concluída

---

## REGRA 2: Design System (CSS)

**Todo código visual DEVE usar tokens e classes existentes em `src/index.css`.** Nunca valores hardcoded.

**Mobile-first obrigatório:** estilos base = mobile. Breakpoints: `min-width: 768px` e `1024px`.

**Tokens CSS (usar sempre via variável):**
- Cores: `--md-primary`, `--md-on-primary`, `--md-primary-container`, `--md-secondary`, `--md-error`, `--md-success`, `--md-surface`, `--md-on-surface`
- Espaçamento: `--spacing-xs/sm/md/lg/xl/xxl` (4/8/16/24/32/48px)
- Raio: `--radius-xs/sm/md/lg/xl/full`
- Sombras: `--shadow-sm/md/lg`

**Classes reutilizáveis (verificar antes de criar novas):**
- Botões: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-delete`, `.btn-schedule-sm` + variantes `-sm`/`-full`
- Hierarquia de botões: `btn-primary` = ação principal; `btn-secondary` = cancelar/voltar; `btn-schedule-sm` = adicionar/agendar; `btn-danger`/`btn-delete` = destrutivo
- Forms: `.form`, `.form-group`, `.form-label`, `.form-input`, `.form-select`, `.form-textarea`, `.form-error`, `.form-input--error`
- Cards: `.card`, `.card-link`, `.card-header`, `.card-title`, `.card-description`
- Modais: `.bottom-sheet`, `.bottom-sheet-header`, `.bottom-sheet-body`, `.bottom-sheet-close`
- Confirmação: `.overlay` + `.confirm-dialog` + `.confirm-dialog-message`
- Badges: `.badge`, `.badge-blue`, `.badge-green`, `.badge-red`, `.badge-gray`
- Grid: `.grid-cards` (1→2→3 colunas), `.grid-2col`
- Tabelas responsivas: `.table-col-mobile-only`, `.table-col-desktop-only`
- Utilitários: `.text-muted`, `.text-sm`, `.mb-sm`, `.mb-md`, `.mt-md`, `.font-medium`

**Ícones:** Lucide React (`lucide-react`). Nunca usar outro pacote.

**CSS em BEM-like:** `.card`, `.card--highlighted`, `.card__title`.

---

## REGRA 3: React & Boas Práticas

- **Componentes funcionais** com arrow function + `export default` no final. Nunca class components.
- **Estado local:** `useState`. **Global:** Context API (AuthContext, ToastContext). Sem prop drilling excessivo.
- **API:** usar `src/api/axios.js` (nunca `fetch` ou nova instância). Interceptors tratam token e erros automaticamente.
- **Auth:** usar `useAuth()` de `AuthContext`. Nunca ler `localStorage` diretamente.
- **Erros de API:** usar `error.userMessage` (setado pelo interceptor) ou `translateError(error)` de `src/i18n`. Nunca extrair `error.response?.data?.message` diretamente.
- **Formulários:** inputs controlados com `useState`. Validação inline com `.form-error`.
- **Navigation:** `useNavigate()`. Nunca `window.location.href` nem `<a href>` para rotas internas.
- **Rotas protegidas:** `<ProtectedRoute>` + `<Layout>`.
- **Effects:** `useEffect` com dependências explícitas e cleanup adequado.
- **Memoização:** apenas quando houver problema de performance mensurável.
- **Imports:** React não precisa ser importado (JSX transform).
- **Sem `console.log`** em código final. `console.error` é aceitável.
- **Event handlers:** prefixo `handle` (ex: `handleSubmit`, `handleDelete`).
- **Loading:** desabilitar inputs/botões durante loading. Botão deve mostrar estado "Carregando...".

**Organização do componente:** imports → hooks → handlers → return.

---

## REGRA 4: Clean Architecture

**Após implementar, revisar:**

1. **Responsabilidade única** — cada componente/função faz UMA coisa.
2. **Separação de camadas:** `pages/` orquestra; `components/` é UI reutilizável (sem API direta); `hooks/` lógica reutilizável; `utils/` funções puras; `constants/` enums.
3. **DRY** — padrão repetido 3+ vezes → extrair.
4. **Nomes expressivos.** Sem abreviações obscuras.
5. **Sem código morto** — remover imports, variáveis e comentários não usados.
6. **Funções ≤ 30 linhas.** Se ultrapassar, quebrar.
7. **Early return** — guard clauses antes de aninhamento.
8. **Sem lógica no JSX** — extrair condicionais complexas para variáveis antes do `return`.

---

## REGRA 5: Ações em Linhas de Lista

**Linha com mais de uma ação → menu de 3 pontos.** Nunca múltiplos botões visíveis na linha.

- **Componente:** `TemplateRowMenu` de `src/pages/trainer/TrainingTemplates.jsx`
- Props: `ariaLabel` (obrigatório), `onDelete` (obrigatório), `onEdit` (opcional), `deleteLabel` (default "Excluir")
- Trigger: `MoreVertical` do lucide-react. Ação destrutiva: `row-menu-item--danger`.
- **Exceção:** linha com apenas UMA ação pode ter botão direto.

---

## REGRA 6: Confirmações Destrutivas

**Nunca usar `window.confirm()`.** Sempre usar dialog customizado:

```jsx
const [confirmDialog, setConfirmDialog] = useState(null);

const handleDelete = (item) => {
  setConfirmDialog({
    message: `Excluir "${item.name}"? Esta ação não pode ser desfeita.`,
    onConfirm: async () => { setConfirmDialog(null); await api.delete(`/endpoint/${item.id}`); },
  });
};

// No JSX:
{confirmDialog && (
  <div className="overlay" onClick={() => setConfirmDialog(null)}>
    <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
      <p className="confirm-dialog-message">{confirmDialog.message}</p>
      <div className="btn-group">
        <button onClick={confirmDialog.onConfirm} className="btn-danger" style={{ flex: 1 }}>Confirmar</button>
        <button onClick={() => setConfirmDialog(null)} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
      </div>
    </div>
  </div>
)}
```

---

## REGRA 7: Tabelas Responsivas

**Nunca renderizar tabela larga que transborde em 375px.** Usar classes para mostrar colunas progressivamente:

```jsx
<thead><tr>
  <th>Nome</th>
  <th className="table-col-desktop-only">E-mail</th>
</tr></thead>
<tbody>{items.map((item) => (
  <tr key={item.id}>
    <td>
      <span>{item.name}</span>
      <span className="table-col-mobile-only text-sm">{item.email}</span>
    </td>
    <td className="table-col-desktop-only">{item.email}</td>
    <td><RowMenu /></td>
  </tr>
))}</tbody>
```

---

## REGRA 8: Cards — Hierarquia Visual

1. Título primário em linha própria (`card-subtitle`)
2. Metadado secundário em linha separada com estilo subdued (`text-sm text-light`)
3. Badge de status alinhado no header oposto ao título
4. Datas/info abaixo do header
5. Ações em footer dedicado (`btn-group`)
- Nunca mostrar `Invalid Date` — usar `"-"` como fallback para datas ausentes
- Nome de pessoa: `firstName + lastName`, fallback para email

---

## REGRA 9: Carregamento de Recursos

Ao buscar recurso por id/query:

1. Setar estado de loading antes da request
2. Renderizar `.loading-screen` com "Carregando..."
3. Só após concluir: mostrar recurso ou feedback de "não encontrado"

Nunca mostrar "não encontrado" antes do `GET` completar.

---

## REGRA 10: Formulário + Lista — Exclusão Mútua

Quando a página tem formulário inline e lista de cards, **ocultar a lista enquanto o formulário estiver aberto:**

```jsx
{!showForm && <div className="grid-cards">{items.map(...)}</div>}
```

---

## REGRA 11: Modelos vs Entidades Reais

O app diferencia **modelos (templates)** de **entidades reais (vinculadas a aluno)**.

**Contexto de aluno (ex: ProtocolDetail):** ao adicionar exercício/treino, oferecer duas opções via `segmented-toggle`:
1. **Criar novo** → `POST /trainer/trainings/:id/exercises`
2. **Importar de modelo** → `POST /trainer/exercises/from-template`

**Contexto de modelo (páginas de templates):** permitir criação de sub-modelos inline.

- `CreateExerciseModal` — exercício real
- `CreateExerciseTemplateModal` — modelo de exercício

---

## Convenções Gerais

- **Idioma:** código em inglês, UI em pt-BR via i18n (`src/i18n/locales/pt-BR.js`)
- **CSS:** novos estilos em `src/index.css`, na seção correta. Verificar se existe classe similar antes de criar nova.
- **Novos componentes/páginas:** sempre criar teste junto.
- **Sem bibliotecas de componentes externas** (MUI, Ant Design, etc.)
