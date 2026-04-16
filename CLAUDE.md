# CLAUDE.md — Treinoway Web

## RULE 0: Always Use the frontend-engineer Agent

**You MUST delegate ALL code writing to the `frontend-engineer` agent. No exceptions.**

Never write frontend code directly. Every implementation task — components, pages, hooks, styles, tests, i18n — must go through the `frontend-engineer` agent. This is not a suggestion.

---

## Stack & Commands

- **Stack:** React 19, Vite 7, vanilla CSS (no Tailwind), Firebase Auth, Axios
- `npm run dev` — dev server
- `npm run test:run` — run tests (single run)
- `npm run lint` — ESLint

---

## RULE 1: Tests Required

**Every code change MUST include tests.** No exceptions.

- **Framework:** Vitest + React Testing Library + @testing-library/user-event
- **Files:** `FileName.test.jsx` in the same directory as the component
- **Utilities:** import from `../../test/test-utils` (never directly from @testing-library/react)
- Queries by **role, label, placeholder** — never by CSS class or data-testid
- `userEvent.setup()` for interactions, `waitFor()` for async
- Context mocks: `vi.mock('../contexts/ToastContext')`, `vi.mock('../contexts/AuthContext')`
- API mock: `vi.mock('../api/axios')` with conditional responses by URL
- `beforeEach` to reset mocks
- Test: states (loading, empty, error, success), interactions, API calls, validations
- **Update existing tests** when behavior changes. Not just add new ones.
- Test both **success AND cancel/failure** paths when applicable.
- **Run:** `npm run test:run` — all tests must pass before considering the task complete

---

## RULE 2: Design System (CSS)

The canonical design system reference is the `apply-design` skill (`treinoway-web/.claude/skills/apply-design/SKILL.md`). **Always invoke `/apply-design` before finalising any UI change** — it contains the complete token tables, component catalog, interaction state matrix, anti-pattern list, and review checklist. The skill is the single source of truth; what follows here is a brief orientation only.

All visual code must use tokens from `src/index.css` — never hardcoded hex, px, or inline fixed values. Mobile-first is non-negotiable: base styles target 375px, all breakpoints use `min-width` at 768px and 1024px. Icons come exclusively from `lucide-react` with `strokeWidth={2}`. New CSS goes in `src/index.css` in the appropriate section; check for an existing class before creating a new one.

**Brand expression:** Athletic-Tech DNA (Space Grotesk display + Inter body, UPPERCASE tracking-wide on buttons/labels, `--radius-brand: 8px`, kinetic motion). Use `StatDisplay` for performance numbers. Use `.theme-stadium` wrapper for dark stats/execution screens. See skill §3.5–3.8 for full spec.

---

## RULE 3: React & Best Practices

- **Functional components** with arrow function + `export default` at the end. Never class components.
- **Local state:** `useState`. **Global:** Context API (AuthContext, ToastContext). No excessive prop drilling.
- **API:** use `src/api/axios.js` (never `fetch` or a new instance). Interceptors handle token and errors automatically.
- **Auth:** use `useAuth()` from `AuthContext`. Never read `localStorage` directly.
- **API errors:** use `error.userMessage` (set by the interceptor) or `translateError(error)` from `src/i18n`. Never extract `error.response?.data?.message` directly. Never use `getErrorMessage(error, 'hardcoded fallback')`.
- **Forms:** controlled inputs with `useState`. Inline validation with `.form-error`.
- **Navigation:** `useNavigate()`. Never `window.location.href` or `<a href>` for internal routes.
- **Protected routes:** `<ProtectedRoute>` + `<Layout>`.
- **Effects:** `useEffect` with explicit dependencies and proper cleanup.
- **Memoization:** only when there is a measurable performance problem.
- **Imports:** React does not need to be imported (JSX transform).
- **No `console.log`** in final code. `console.error` is acceptable.
- **Event handlers:** `handle` prefix (e.g. `handleSubmit`, `handleDelete`).
- **Loading:** disable inputs/buttons during loading. Button must show "Carregando..." state.

**Component organization:** imports → hooks → handlers → return.

---

## RULE 4: Clean Architecture

**After implementing, review:**

1. **Single responsibility** — each component/function does ONE thing.
2. **Layer separation:** `pages/` orchestrates; `components/` is reusable UI (no direct API calls); `hooks/` reusable logic; `utils/` pure functions; `constants/` enums.
3. **DRY** — pattern repeated 3+ times → extract.
4. **Expressive names.** No obscure abbreviations.
5. **No dead code** — remove unused imports, variables, and comments.
6. **Functions ≤ 30 lines.** If exceeded, break it up.
7. **Early return** — guard clauses before nesting.
8. **No logic in JSX** — extract complex conditionals to variables before `return`.

---

## RULE 5: List Row Actions

**Row with more than one action → three-dot menu.** Never multiple visible buttons in a row.

- **Component:** `TemplateRowMenu` from `src/pages/trainer/TrainingTemplates.jsx`
- Props: `ariaLabel` (required), `onDelete` (required), `onEdit` (optional), `deleteLabel` (default "Excluir")
- Trigger: `MoreVertical` from lucide-react. Destructive action: `row-menu-item--danger`.
- **Exception:** row with only ONE action may have a direct button.

---

## RULE 6: Destructive Confirmations

**Never use `window.confirm()`.** Always use a custom dialog:

```jsx
const [confirmDialog, setConfirmDialog] = useState(null);

const handleDelete = (item) => {
  setConfirmDialog({
    message: `Excluir "${item.name}"? Esta ação não pode ser desfeita.`,
    onConfirm: async () => { setConfirmDialog(null); await api.delete(`/endpoint/${item.id}`); },
  });
};

// In JSX:
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

## RULE 7: Responsive Tables

**Never render a wide table that overflows on 375px.** Use classes to show columns progressively:

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

## RULE 8: Cards — Visual Hierarchy

1. Primary title on its own line (`card-subtitle`)
2. Secondary metadata on a separate line with subdued style (`text-sm text-light`)
3. Status badge aligned in the header opposite the title
4. Dates/info below the header
5. Actions in a dedicated footer (`btn-group`)
- Never show `Invalid Date` — use `"-"` as fallback for missing dates
- Person name: `firstName + lastName`, fallback to email

---

## RULE 9: Resource Loading

When fetching a resource by id/query:

1. Set loading state before the request
2. Render `.loading-screen` with "Carregando..."
3. Only after completion: show the resource or "not found" feedback

Never show "not found" before the `GET` completes.

---

## RULE 10: Form + List — Mutual Exclusion

When the page has an inline form and a card list, **hide the list while the form is open:**

```jsx
{!showForm && <div className="grid-cards">{items.map(...)}</div>}
```

---

## RULE 11: Templates vs Real Entities

The app differentiates **templates** from **real entities (linked to a student)**.

**Student context (e.g. ProtocolDetail):** when adding an exercise/training, offer two options via `segmented-toggle`:
1. **Create new** → `POST /trainer/trainings/:id/exercises`
2. **Import from template** → `POST /trainer/exercises/from-template`

**Template context (template pages):** allow inline creation of sub-templates.

- `CreateExerciseModal` — real exercise
- `CreateExerciseTemplateModal` — exercise template

---

## RULE 12: API Error Format

The backend returns errors with an i18n-ready structure:

```json
{ "error": "INVALID_CREDENTIALS", "messageCode": "auth.unauthorized", "message": "..." }
// Validation (400):
{ "error": "VALIDATION_ERROR", "messageCode": "validation.failed", "details": [{ "field": "email", "messageCode": "validation.email.format" }] }
```

**Known `messageCode` values:** `auth.unauthorized`, `auth.forbidden`, `resource.notFound`, `resource.conflict`, `request.badRequest`, `validation.failed`

**Known error codes:** `INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN`, `EMAIL_IN_USE`, `PASSWORD_MISMATCH`, `VALIDATION_ERROR`, `FILE_REQUIRED`, `INVALID_FILE_TYPE`, `FILE_TOO_LARGE`

New translations go in `src/i18n/locales/pt-BR.js` under the `errors`, `messageCodes`, `validation`, `fields` sections.

---

## RULE 13: Be Critical, Not Sycophantic

- **Be critical and skeptical** when reviewing proposals, ideas, or code. Do not agree by default.
- **Never be sycophantic** — give honest, direct feedback. Skip empty praise.
- **Point out problems, trade-offs, and alternatives** before agreeing with a plan.
- If an approach has downsides, say so clearly — even if the user seems enthusiastic about it.

---

## General Conventions

- **Language:** code in English, UI in pt-BR via i18n (`src/i18n/locales/pt-BR.js`)
- **CSS:** new styles in `src/index.css`, in the correct section. Check if a similar class exists before creating a new one.
- **New components/pages:** always create a test alongside.
- **No external component libraries** (MUI, Ant Design, etc.)
