---
name: apply-design
description: Apply Treinoway design system rules to UI code. Use when creating or modifying any component, page, or CSS — ensures correct CSS tokens, button hierarchy, mobile-first layout, card structure, row menus, and destructive confirmation dialogs.
compatibility: Designed for Claude Code on the treinoway-web project
---

Review every UI change in the current task against the rules below. Fix any violations before finishing.

## 1. Design Tokens — never hardcode values

All values must come from CSS variables defined in `src/index.css`. Never use raw hex, px literals, or inline fixed values.

- **Colors:** `--md-primary`, `--md-on-primary`, `--md-primary-container`, `--md-secondary`, `--md-error`, `--md-success`, `--md-surface`, `--md-on-surface`
- **Spacing:** `--spacing-xs` (4px) / `--spacing-sm` (8px) / `--spacing-md` (16px) / `--spacing-lg` (24px) / `--spacing-xl` (32px) / `--spacing-xxl` (48px)
- **Radius:** `--radius-xs` / `--radius-sm` / `--radius-md` / `--radius-lg` / `--radius-xl` / `--radius-full`
- **Shadows:** `--shadow-sm` / `--shadow-md` / `--shadow-lg`
- **Typography:** `--font-h1-size/weight`, `--font-h2-size/weight`, `--font-h3-size/weight`, `--font-body-size/weight`, `--font-body-small-size`, `--font-caption-size`, `--font-button-label-size/weight/letter-spacing`, `--font-family-base`

## 2. Button Hierarchy

| Class | When to use |
|---|---|
| `btn-primary` | Main action: save, create, confirm |
| `btn-secondary` | Cancel / back / close |
| `btn-schedule-sm` | Add / schedule (tertiary accent) |
| `btn-danger` / `btn-delete` / `btn-delete-sm` | Destructive actions only |

- Add `-sm` or `-full` suffix variants when needed.
- Never create one-off button colors.
- Never use gray inline styles for cancel buttons — always `btn-secondary`.

## 3. Reusable CSS Classes

Before writing new CSS, check `src/index.css` for an existing class:

- **Forms:** `.form`, `.form-group`, `.form-label`, `.form-input`, `.form-select`, `.form-textarea`, `.form-error`, `.form-input--error`
- **Cards:** `.card`, `.card-link`, `.card-header`, `.card-title`, `.card-description`
- **Modals:** `.bottom-sheet`, `.bottom-sheet-header`, `.bottom-sheet-body`, `.bottom-sheet-close`
- **Confirmation:** `.overlay` + `.confirm-dialog` + `.confirm-dialog-message`
- **Badges:** `.badge`, `.badge-blue`, `.badge-green`, `.badge-red`, `.badge-gray`
- **Grid:** `.grid-cards` (1→2→3 columns), `.grid-2col`
- **Utilities:** `.text-muted`, `.text-sm`, `.mb-sm`, `.mb-md`, `.mt-md`, `.font-medium`

New CSS goes in `src/index.css` in the appropriate section. Use BEM-like naming: `.card`, `.card--highlighted`, `.card__title`.

## 4. Responsive / Mobile-First

- Base styles = mobile (375px). Use only `min-width` media queries.
- Breakpoints: `768px` (tablet), `1024px` (desktop).
- Tables must never overflow at 375px. Use progressive column disclosure:

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

## 5. Card Visual Hierarchy

1. Primary title on its own line (`card-subtitle`)
2. Secondary metadata subdued: `text-sm text-light`
3. Status badge aligned opposite title in the card header
4. Dates/info below the header
5. Actions in a dedicated footer (`btn-group`)

- Never display `Invalid Date` — use `"-"` as fallback.
- Person name: `firstName + lastName`; fallback to email.

## 6. List Row Actions — Three-Dot Menu

Rows with **more than one action** must use `TemplateRowMenu` (source: `src/pages/trainer/TrainingTemplates.jsx`):

- Props: `ariaLabel` (required), `onDelete` (required), `onEdit` (optional), `deleteLabel` (default `"Excluir"`)
- Trigger icon: `MoreVertical` from `lucide-react`
- Destructive item: class `row-menu-item--danger`

A row with only **one action** may use a direct button.

## 7. Destructive Confirmations

Never use `window.confirm()`. Always use the custom dialog pattern:

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

## 8. Icons

Only `lucide-react`. Never import icons from any other package.

## 9. Inline Styles

- **OK:** dynamic values only — e.g. `style={{ width: \`${progress}%\` }}`
- **Never:** fixed colors, spacing, or layout values as inline styles

## Checklist

- [ ] No hardcoded colors, px, or font sizes — all via CSS variables
- [ ] Correct button class for each action (primary / secondary / danger)
- [ ] No new CSS class duplicating an existing one in `src/index.css`
- [ ] Mobile-first: base = 375px, breakpoints with `min-width`
- [ ] Tables don't overflow on mobile
- [ ] Cards follow visual hierarchy
- [ ] Rows with 2+ actions use `TemplateRowMenu`
- [ ] No `window.confirm()` — custom confirm dialog used
- [ ] Icons from `lucide-react` only
- [ ] No inline styles for fixed values
