# Financeiro — design spec (migração stadium → TeuFit)

**Owner:** product-design · **Consumer:** `frontend-engineer` · **Date:** 2026-10-06
**Sources of truth:** backend brief `treinoway-service/.claude/frontend-brief.md` (data + states), plan Part 2 `~/.claude/plans/quero-reabrir-a-feature-majestic-pelican.md`, skill `treinoway-web/.claude/skills/apply-design/SKILL.md`.
**Scope:** `Financeiro.jsx` (Cobranças + Planos), `SubscriptionHistory.jsx`, the StudentDetail "Assinatura" block, every finance component and sheet, the sidebar entry.

> **Brand direction.** This spec follows **TeuFit** (CLAUDE.md Rule 2 + skill §3.3). The older Athletic-Tech doctrine is retired: no `.theme-stadium`, no Space Grotesk, no dark cockpit. Wherever an older agent prompt says otherwise, this spec follows the repo.

---

## 0. Must-read before coding (blocking findings)

Fix these as part of this work. They are not optional polish.

| # | Finding | Where | Action |
|---|---|---|---|
| B1 | **Replace = cancel + assign on the client.** `handleReplacePlan` calls `cancelSubscription` and then `assignPlanToStudent`. The cancel voids every not-yet-due charge and closes the subscription before the backend can create the old plan's remaining cycles. A future-dated replace therefore leaves a gap with **no billing** between today and the new start. | `StudentDetail.jsx:284` | Replace is **one** `POST /trainer/students/:id/subscriptions`. The backend detects the active subscription and does the replace atomically. Delete `handleReplacePlan`'s cancel call. |
| B2 | **Fake subscription data on the student cockpit.** `SubscriptionStrip` renders `STUB_SUBSCRIPTION` ("Trimestral · R$ 297/mês · Renova em 42 dias"), and its "Alterar"/"Renovar" buttons do nothing. Every trainer currently sees invented data on every student. | `StudentCockpitHero.jsx:181`, `constants/subscriptionStub.js` | Remove `<SubscriptionStrip />` from the hero. Delete the component, its test, the stub constant and the `.subscription-strip`/`.subscription-chip*` CSS. The real data lives in the "Assinatura" block (§4.6). |
| B3 | **A global `.btn-sm` override inside the finance CSS block** (`index.css:26304`, `min-height: 0; padding: 6px 10px`) is declared after the canonical `.btn-sm` (`:4104`). It breaks the 44px touch target for every `btn-sm` in the app. | `index.css:26302–26308` | Delete it together with the `fin-*` block, then spot-check other `btn-sm` users at 375px. They will get slightly taller, which is the correct behaviour. |
| B4 | **Sidebar badge hook is N+1** (`useFinanceiroBadge` makes one request per subscription) and counts pending as well as overdue. | `hooks/useFinanceiroBadge.js` | Delete it. The new badge reads `finance.overdueCount` (§4.8). |
| B5 | **`paidAt.slice(0, 10)`** shows the UTC date. A payment made after 21h in São Paulo displays as the next day. | `SubscriptionHistory.jsx`, `Financeiro.jsx` | Format `paidAt` (ISO timestamp) with `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })`. Date-only fields (`dueDate`, `cycleStartDate`, `cycleEndDate`, `customerSince`) stay string-sliced and never go through `new Date()`. |

---

## 1. Problem understanding

**What the trainer is trying to do.**
1. Know, in a few seconds, how much came in this month, what is still open and who is late.
2. Record a payment that came in by Pix, often days after the fact, in one tap.
3. Set prices once (Planos) and attach them to students without thinking about cycles.

**Context.** Usually on a phone, between sessions, after a student says "te mandei o Pix". Bigger decisions (pricing, reviewing a month) happen on desktop.

**Friction today.**
- A dark stadium hero with an MRR label that is wrong (an annual plan counts as received revenue every month) and a decorative waveform.
- Status is computed on the client from `cycleEndDate`. The page calls a charge "pendente" for about 30 days while the dashboard already calls it "atrasado".
- Debt from cancelled plans is invisible on this page but counted on the dashboard.
- One request per subscription.
- "Excluir" hard-deletes paid revenue.
- Payments can only be marked paid "today".
- "Adicionar cobrança" takes a free-form date and creates duplicates.

---

## 2. UX strategy

1. **One screen, one request, three questions.** `GET /trainer/finance/overview?month=` answers *quanto entrou / quanto falta / quem está atrasado*. The client never derives status or sums money (`effectiveStatus`, `daysOverdue` and `kpis.*` come from the API).
2. **The daily action is one tap.** On pending and overdue rows, "MARCAR PAGO" is visible inline, marks the charge paid today, and shows a toast with "Desfazer". The rare cases (a past payment date, editing, voiding) live in the row menu.
   - *Deliberate reading of CLAUDE.md Rule 5:* a row shows one primary action plus the ⋮ trigger, never two action buttons.
3. **Overdue first, always.** Sections run Em atraso, then Pendentes, then Pagas. Overdue rows get the same 3px left rail the Students list uses for "needs action", in `--md-error`.
4. **Money rules are explained once, where they bite, not everywhere:**
   - 3-day grace: an info popover on the "Em atraso" KPI.
   - Price change: a banner in the plan sheet, shown only once the price has actually changed.
   - Replace and backdated rules: one banner in the assign sheet, worded for the dates the trainer picked.
5. **Same row component everywhere.** `PaymentRow` renders in the overview (with student identity), in the history page and in the StudentDetail block (with cycle/plan identity). One visual language, one menu matrix.

**Trade-offs.**
- An inline button plus a menu is denser than a menu alone. This is accepted because mark-paid is the main job of the page.
- The month selector lives in the header and only exists on the Cobranças tab, so the header actions change with the tab. Each tab gets the action that fits its content.
- Future months are blocked (see §7, E1).

---

## 3. User flows

### 3.1 Record a payment received today (target: 1 tap)
1. Sidebar → Financeiro. The Cobranças tab opens on the current month.
2. Row "Maria Silva · EM ATRASO · 4 DIAS" → tap **MARCAR PAGO**.
3. The button shows "Carregando..." and is disabled.
4. Toast: "Pagamento registrado." with the action **Desfazer** (5 s).
5. Overview refetches silently: KPIs update and the row moves to "Pagas" when paid inside the viewed month.

### 3.2 Record a payment received on an earlier date
1. Row ⋮ → "Marcar pago em outra data…".
2. Sheet "Registrar pagamento" opens. The date defaults to today, and future dates are blocked.
3. **REGISTRAR PAGAMENTO** → toast "Pagamento registrado em 02/10." → refetch.

### 3.3 Fix a wrong amount or due date
1. ⋮ → "Editar cobrança". The sheet has Valor, Vencimento and Observação.
2. If the charge is **paid**, Valor and Vencimento are disabled and a banner explains why. Only Observação can be saved.

### 3.4 Void a charge
1. ⋮ → "Anular cobrança" → confirm dialog → toast "Cobrança anulada." → the row leaves the overview. It still appears in the history as "ANULADA".

### 3.5 Undo a payment
1. On a paid row, ⋮ → "Voltar para pendente" → confirm → toast "Pagamento revertido."

### 3.6 Create and edit plans
1. Planos tab → **NOVO PLANO** (header) → sheet → **CRIAR PLANO** → the card appears in the grid.
2. Editing the price shows the "afeta só novas assinaturas" banner.

### 3.7 Assign or replace a plan (StudentDetail)
1. Assinatura block → **ATRIBUIR PLANO** (or **TROCAR PLANO**) → sheet.
2. Pick the plan, the start date and (optionally) a discount. The summary shows the charged amount and, where it applies, the replace/backdated explanation.
3. **ATRIBUIR PLANO** / **TROCAR PLANO** → toast "Plano atribuído. Primeira cobrança: 15/10 – 14/11." → the block refetches.

### 3.8 View a student's history
1. From a Financeiro row (⋮ → "Ver histórico do aluno"), or from the StudentDetail block link "Ver histórico".
2. The history page works after the student is unlinked.
3. The header shows "GERAR PRÓXIMO CICLO" only when the student has an active subscription.

### 3.9 Cancel a subscription (StudentDetail)
1. Assinatura block ⋮ → "Cancelar assinatura" → confirm.
2. Charges that are not yet due are voided. Overdue debt stays and keeps showing in the block (§4.6, state C) and in the overview.

### 3.10 From the dashboard
1. The FinanceiroBand "Em atraso" tile → `/trainer/financeiro?status=overdue` opens with the "Em atraso" filter selected.

---

## 4. Layout structure

### 4.0 URL state (keeps back-navigation from History intact)
`/trainer/financeiro?tab=charges|plans&month=YYYY-MM&status=all|overdue|pending|paid`
- Read and write these with `useSearchParams` (Students already does).
- Default values are omitted from the URL.
- An invalid `month`, or a month after the current one, falls back to the current month.

### 4.1 Financeiro — shared header

```
MOBILE 375                                   DESKTOP ≥1024
┌─────────────────────────────────┐          ┌───────────────────────────────────────────────────────────────────┐
│ [Wallet] Financeiro             │          │ [Wallet] Financeiro                     [‹  outubro de 2026  ›]    │
│ [‹   outubro de 2026   ›] (full)│          │ ─ tabs ─ Cobranças | Planos                                       │
│ Cobranças | Planos              │          └───────────────────────────────────────────────────────────────────┘
```
- **Header:**
  - `.page-header` > `div` > `.page-header-title-row`, containing `<Wallet size={24} strokeWidth={2} className="page-header-title-icon" />` and `<h1>Financeiro</h1>`.
  - `.page-header-actions` holds:
    - Cobranças tab: `MonthSelector`. On mobile it takes the full row (add the `page-header-actions--equal-mobile` modifier so it wraps under the title).
    - Planos tab: `button.btn-primary` "NOVO PLANO" with `<Plus size={16} strokeWidth={2} />`. The label is "NOVO PLANO" on desktop and on mobile.
  - No subtitle and no counters in the header (§3.2).
- **Tabs:** `div.tabs-container` with `role="tablist"` and `aria-label="Visão financeira"`. Two `button.tab-button`s (`tab-button--active` when selected), with `id`/`aria-controls`/`aria-selected` exactly as in `StudentsTabs` (`Students.jsx:907`). Labels: "Cobranças", "Planos". No count badges.

### 4.2 Financeiro — Cobranças tab

```
MOBILE 375                                        DESKTOP ≥1024 (content max ~1120px)
┌───────────────────────────────────┐             ┌──────────────────────────────────────────────────────────────────────────┐
│ ┌ stats-hero ───────────────────┐ │             │ ┌ stats-hero ────────────────────────────────────────────────────────┐ │
│ │ R$ 1.200,00   │ R$ 300,00     │ │             │ │ R$ 1.200,00     │ R$ 300,00      │ R$ 199,80 (red) │ 13,3%          │ │
│ │ 12 pagamentos │ 3 cobranças   │ │             │ │ 12 pagamentos   │ 3 cobranças    │ 2 alunos        │ 2 de 15 alunos │ │
│ │ RECEBIDO NO MÊS│ A RECEBER    │ │             │ │ RECEBIDO NO MÊS │ A RECEBER      │ EM ATRASO (i)   │ INADIMPLÊNCIA  │ │
│ │ R$ 199,80     │ 13,3%         │ │             │ └────────────────────────────────────────────────────────────────────┘ │
│ │ 2 alunos      │ 2 de 15 alunos│ │             │ [🔍 Buscar aluno…          ] [Todas 17][Em atraso 2][Pendentes 3][Pagas 12] │
│ │ EM ATRASO (i) │ INADIMPLÊNCIA │ │             │                                                                          │
│ └───────────────────────────────┘ │             │ EM ATRASO · 2                                                            │
│ [🔍 Buscar aluno…              ]  │             │ ▌(MS) Maria Silva          Venceu 01/10  [EM ATRASO · 4 DIAS] R$ 99,90 [MARCAR PAGO] ⋮ │
│ [Todas 17][Em atraso 2][Pend… →]  │             │ ▌     Consultoria Mensal                                                  │
│                                   │             │                                                                          │
│ EM ATRASO · 2                     │             │ PENDENTES · 3                                                            │
│ ▌(MS) Maria Silva   R$ 99,90   ⋮ │             │  (JP) João Pereira          Vence 10/10   [PENDENTE]         R$ 150,00 [MARCAR PAGO] ⋮ │
│ ▌     Consultoria Mensal · venc. 01/10            │                                                                          │
│ ▌     [EM ATRASO · 4 DIAS] [MARCAR PAGO]          │ PAGAS · 12                                                               │
│ …                                 │             │  (AC) Ana Costa             Pago em 03/10 [PAGO]             R$ 99,90           ⋮ │
└───────────────────────────────────┘             └──────────────────────────────────────────────────────────────────────────┘
```

**Stats hero.** It reuses the Students hero visually; see §5 for the generic `.stats-hero` extraction.
- Container: `<section className="stats-hero" aria-label="Resumo de {mês}">` > `.stats-hero-grid`. The grid is 2×2 on mobile and 4×1 at ≥768px with vertical dividers, as Students does today.
- Each cell is a `StatDisplay` (`variant="inline"` below 768px, `"default"` from 768px). They have a transparent background inside the hero (new rule `.stats-hero .stat-display`, §5).

| # | `label` | `value` | `subValue` | Tint |
|---|---|---|---|---|
| 1 | Recebido no mês | `kpis.receivedAmount` | `{receivedCount} pagamento(s)` | none |
| 2 | A receber | `kpis.pendingAmount` | `{pendingCount} cobrança(s)` | none |
| 3 | Em atraso | `kpis.overdueAmount` | `{overdueStudents} aluno(s)` | `--md-error` on the value when `overdueCount > 0` |
| 4 | Inadimplência | `delinquencyRate` + unit `%` | `{overdueStudents} de {billedStudents} alunos` | `--md-error` when > 0 |

- Money values: `R$` is rendered as a small prefix (`.stat-display-unit.stat-display-unit--prefix`, new) and the number is formatted with `Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 })` applied to the API string. That is display formatting only. **Never add amounts on the client.**
- `delinquencyRate`: pt-BR with at most 1 decimal ("13,3"). When `billedStudents === 0`, show "—" with the sub "sem cobranças no mês".
- The "Em atraso" label carries `infoSlot={<InfoPopover>}` (existing component) with the text: "Uma cobrança entra em atraso 3 dias após o vencimento. Os dias de atraso contam a partir do vencimento. Este valor mostra a posição de hoje e inclui meses anteriores."
- Only `.stats-hero` carries the page's single geometric cut (its existing `::before`). Nothing else on the page gets one.

**Toolbar.** `LibraryFilterBar`, the existing component (it already renders the Students toolbar classes).
- `searchPlaceholder="Buscar aluno…"`, `searchAriaLabel="Buscar cobranças por aluno"`.
- Filters, in this order: `all` "Todas", `overdue` "Em atraso", `pending` "Pendentes", `paid` "Pagas", with counts taken from the row list (counting rows is fine; summing amounts is not).
- No sort select. Each section has a fixed sort.
- Search is client-side over `payment.student.name` with `normalizeForSearch` (keep this helper) and a 200ms debounce.
- Hide the toolbar when the month has 0 rows.

**Sections.** Shown when the filter is `all`. With any other filter, only the matching section renders.
- Wrapper: `.cockpit-section`.
- Header: `.cockpit-section-header` > `h2.cockpit-section-eyebrow` "Em atraso" + `span.cockpit-section-eyebrow-suffix` "· 2".
- List: `div.charge-list` (new, §5) of `PaymentRow variant="overview"`.

| Section | Rows | Sort |
|---|---|---|
| Em atraso | `effectiveStatus === 'overdue'` | `daysOverdue` desc, then name |
| Pendentes | `effectiveStatus === 'pending'` | `dueDate` asc |
| Pagas | `effectiveStatus === 'paid'` | `paidAt` desc |

- A section with 0 rows is not rendered under "Todas". Exception: when everything is paid, show the positive notice (§6).

### 4.3 PaymentRow (one component, two variants)

Props (indicative): `payment` (API shape), `variant: 'overview' | 'history'`, `onMarkPaid`, `onMarkPaidOnDate`, `onEdit`, `onRevert`, `onVoid`, `onViewHistory?`, `isMutating`.

**Content by variant.**

| Slot | `overview` | `history` (History page + StudentDetail block) |
|---|---|---|
| Leading | `Avatar` (36 mobile / 40 desktop, initials from `student.name`, **no status ring**) | none. The row starts with the title |
| Title (`.charge-row-title`) | `student.name` (ellipsis) | cycle period "01/10 – 31/10/2026" (`cycleStartDate`–`cycleEndDate`, `DD/MM – DD/MM/AAAA`) |
| Meta (`.charge-row-meta`) | `plan.name` + (" · plano cancelado" if `subscriptionStatus === 'cancelled'`) + mobile only: " · " + date text | `plan.name` + (" · plano cancelado") + mobile only: " · " + date text |
| Notes | — | when `notes`: third line `.charge-row-notes` "Obs.: {notes}", one line, ellipsis, full text in `title` |
| Date text (`.charge-row-date`, desktop column) | see the table below | same |
| Badge | see the table below | same |
| Amount (`.charge-row-amount`) | `R$ 99,90` in stat font, tabular-nums | same |
| Inline action | `button.btn-secondary.btn-sm` "MARCAR PAGO" when status is pending or overdue | same |
| Menu | `RowMenu` (§4.4) | same |

**Status presentation.** Labels come from `effectiveStatusLabel`, so do not hardcode them. Badges are uppercase via the badge CSS.

| `effectiveStatus` | Badge | Date text | Row modifier | Amount colour |
|---|---|---|---|---|
| `overdue` | `badge badge-red`: "{label} · {daysOverdue} dia(s)" → "EM ATRASO · 4 DIAS" | "Venceu 01/10" | `.charge-row--overdue` (3px `--md-error` left rail, decorative) | `--brand-ink` |
| `pending`, `dueDate >= hoje` | `badge badge-blue` "PENDENTE" | "Vence 10/10" | — | `--brand-ink` |
| `pending`, `dueDate < hoje` (grace window) | `badge badge-blue` "PENDENTE" | "Venceu 04/10" | — | `--brand-ink` |
| `paid` | `badge badge-green` "PAGO" | "Pago em 03/10" (from `paidAt`, SP timezone, §0 B5) | — | `--brand-ink` |
| `cancelled` (history only) | `badge badge-gray` "ANULADA" | "Venc. 01/09" | `.charge-row--void` | `--brand-steel`, **no strikethrough** (strikethrough reads as "desconto") |

- Comparing `dueDate` with today only picks the verb "Vence"/"Venceu". It never derives the status.
- "Today" means São Paulo today (`todayDateString()` reimplemented with `Intl` + `timeZone: 'America/Sao_Paulo'`).
- Use the full year in dates only when it differs from the current year (`01/10/2025`).

**Mobile 375 (grid, 3 lines).**
```
┌──────────────────────────────────────────────────┐
│▌ (MS)  Maria Silva                  R$ 99,90  ⋮ │  line 1: avatar · title(1fr, ellipsis) · amount · menu
│▌       Consultoria Mensal · venceu 01/10         │  line 2: meta (text-sm, --brand-steel, wraps)
│▌       [EM ATRASO · 4 DIAS]        [MARCAR PAGO] │  line 3: badge · inline action (right)
└──────────────────────────────────────────────────┘
```
- `grid-template-columns: auto minmax(0,1fr) auto auto`.
- Lines 2–3 start at the title column.
- The `history` variant drops the avatar column.
- The MARCAR PAGO button must keep a 44px height on mobile (canonical `.btn-sm` already does, after B3 is fixed).

**Desktop ≥1024 (single line).**
```
avatar | title + meta(plan) | date text | badge | amount | inline action | menu
40px   | minmax(0,1fr)      | 120px     | 168px | 112px  | 132px         | 44px
```
- Date text, badge and amount get their own columns. The mobile copies of date and badge are hidden.
- Prefer one DOM with grid areas over duplicated nodes. Where a duplicate cannot be avoided, the hidden copy is `aria-hidden` so screen readers hear the status once.
- The inline-action column keeps its width when empty (paid/anulada), so amounts stay aligned.
- 768–1023px uses the mobile layout. The row is too dense for one line there.

**Row surface** (copies `.student-stat-row`):
- `--md-surface`, 1px `--brand-divider` border, `--radius-brand`, `--shadow-brand-sm`, padding `var(--spacing-md)`, gap `var(--spacing-sm) var(--spacing-md)`, `margin-bottom: var(--spacing-sm)`.
- **Not clickable.** No hover lift and no `cursor: pointer`.
- No horizontal dividers inside the row.

**Mutating state.** While a request for this row is in flight:
- The inline button shows "Carregando..." and is disabled.
- The menu trigger is disabled.
- The row gets `aria-busy="true"`.

### 4.4 Row menu matrix (`RowMenu`, `src/components/RowMenu.jsx`)

- Use `extraItems` for everything, so the item order is fully controlled. Do not pass `onEdit` (its label is a hardcoded "Editar").
- The destructive item goes last with `danger: true`.
- `ariaLabel`:
  - overview: "Ações da cobrança de {nome}, vencimento {DD/MM}"
  - history: "Ações da cobrança de {DD/MM}"
- **Lucide fix while here:** the trigger icon uses `strokeWidth={1.6}`. Change it to `2` (skill §6.1). The change is global but small.

| Status | Inline | Menu items (in order) |
|---|---|---|
| overdue | MARCAR PAGO | Marcar pago em outra data… · Editar cobrança · Ver histórico do aluno *(overview only)* · **Anular cobrança** (danger) |
| pending | MARCAR PAGO | same as overdue |
| paid | — | Editar cobrança *(opens with amount/due date locked; only Observação is editable)* · Voltar para pendente · Ver histórico do aluno *(overview only)* |
| cancelled (anulada) | — | Registrar pagamento… *(opens the mark-paid sheet: late settlement of a voided charge is allowed)* |

- Paid rows never offer "Anular". The backend refuses it (409 `SUBSCRIPTION_PAYMENT_ALREADY_PAID`), and the revert confirm explains the path.
- The cancelled row keeps the ⋮ even though it has a single item. The exception in Rule 5 is optional, and keeping the menu keeps every row's trailing edge aligned.

### 4.5 Financeiro — Planos tab

```
MOBILE 375                              DESKTOP ≥1024 (.grid-cards → 3 cols)
┌──────────────────────────────┐        ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Consultoria Mensal        ⋮ │        │ Consultoria Men… ⋮│ │ Trimestral     ⋮ │ │ Anual          ⋮ │
│ Mensal · 4 alunos            │        │ Mensal · 4 alunos │ │ Trimestral · 2 … │ │ Anual · 0 alunos │
│ R$ 66,60 por mês             │        │ R$ 66,60 por mês  │ │ R$ 270,00 a cada │ │ R$ 990,00 por ano│
│ R$ 99,90 − 33,33%            │        │ R$ 99,90 − 33,33% │ │ 3 meses          │ │                  │
└──────────────────────────────┘        └──────────────────┘ └──────────────────┘ └──────────────────┘
                                        Ver arquivados (2)   ← button.btn-link
```
- Grid: `div.grid-cards` of `PlanCard`.
- **PlanCard:** `article.card` following the skill's 5-point hierarchy.
  - Header: `div.card-header-row` containing `h3.card-title` (the plan name, 2-line clamp) and a `RowMenu` (`ariaLabel="Ações do plano {nome}"`, items "Editar plano" and "Arquivar plano"/"Desarquivar plano"). No confirm: archiving is reversible and the toast says so.
  - `p.card-subtitle.text-sm.text-muted`: "{recorrência} · {n} aluno(s)". When archived it is "{recorrência} · Arquivado" plus `badge badge-gray` "ARQUIVADO" opposite the title in the header row, and the card gets the `.plan-card--archived` modifier (opacity of content 0.72; the menu stays fully opaque).
  - Price: `p.plan-card-price` (new). The net amount in the stat font, 24px/700, tabular-nums, `--brand-ink`, followed by the period in base font, 14px, `--brand-steel`: "por mês" / "a cada 3 meses" / "a cada 6 meses" / "por ano".
  - Discount line, only when the plan has a default discount: `p.text-sm.text-muted` "R$ 99,90 − 33,33%" or "R$ 99,90 − R$ 10,00".
  - Net amount = the integer-cents half-up computation in §6.4. **Never `Number * Number`.**
  - Drop "Plano destaque", "Receita gerada" and the recurrence tag.
- **Subscriber count:** one call, `GET /trainer/subscriptions?status=active` (`listAllSubscriptions`), fired the first time the Planos tab opens, then counted by `planId`. If it fails, hide the count ("Mensal") instead of showing 0. See §8 for the backend ask that removes this call.
- **Archived plans:** they are hidden by default. Below the grid, `button.btn-link` "Ver arquivados (n)" / "Ocultar arquivados" toggles a second section titled with `.cockpit-section-eyebrow` "Arquivados", using the same grid. This replaces the `switch` toggle.
- Plan list: `GET /trainer/subscription-plans?includeArchived=true`, fetched on first visit to the Planos tab (or earlier, if the empty Cobranças state needs it, §6).

### 4.6 StudentDetail — "Assinatura" block (replaces `SubscriptionCard`)

**Data:** two requests, in parallel:
1. `GET /trainer/students/:id/subscriptions/active` for the plan, price, discount, `startDate` and `id`.
2. `GET /trainer/students/:id/payments` for every charge, including cancelled-subscription debt.

`listPaymentsForSubscription` and `deriveEffectivePaymentStatus` go away. The plan name comes from `payments[].plan.name` (matching `subscriptionId`), falling back to the plans list. This fixes archived plans that currently show "Plano ativo".

"Open charges" = `payments` with `effectiveStatus` in (`overdue`, `pending`), sorted overdue first by `daysOverdue` desc, then by `dueDate` asc. Show at most 3, then the link "Ver todas ({n})" goes to the history page.

**Section frame (existing):** `.cockpit-section` > `header.cockpit-section-header` > `h2.cockpit-section-eyebrow` "Assinatura", with a `button.btn-link` "Ver histórico" on the right (whenever there are payments).

**State A: active subscription.**
```
MOBILE 375                                         DESKTOP ≥1024 (card max-width follows cockpit column)
┌ card ──────────────────────────────────────┐     ┌ card ─────────────────────────────────────────────────────────┐
│ Consultoria Mensal              [EM DIA]   │     │ Consultoria Mensal                              [EM ATRASO]   │
│ Mensal · desde 31/01/2026                  │     │ Mensal · desde 31/01/2026                                      │
│ R$ 66,60 por mês                           │     │ R$ 66,60 por mês   R$ 99,90 − 33,33%                           │
│ R$ 99,90 − 33,33%                          │     │                                                                │
│ COBRANÇAS EM ABERTO                        │     │ COBRANÇAS EM ABERTO                                            │
│ ┌ PaymentRow(history) ───────────────────┐ │     │ PaymentRow(history) … single-line desktop layout               │
│ └────────────────────────────────────────┘ │     │                                                                │
│ [ TROCAR PLANO ]                        ⋮  │     │ [TROCAR PLANO]                                              ⋮  │
└────────────────────────────────────────────┘     └────────────────────────────────────────────────────────────────┘
```
- `article.card`. Header (`card-header-row`): `h3.card-title` with the plan name, and a badge:
  - `badge badge-red` "EM ATRASO" if any open charge is overdue;
  - otherwise `badge badge-blue` "COMEÇA EM 01/11" if `startDate` > today;
  - otherwise `badge badge-green` "EM DIA".
- `p.card-subtitle.text-sm.text-muted`: "{recorrência} · desde {startDate DD/MM/AAAA}".
- Price: `p.plan-card-price` (same class as PlanCard) with the net per cycle (`computeNetAmountCents(price, discount)` from the **subscription snapshot**, not the plan). Followed by the discount line when there is one.
- "Cobranças em aberto": `h4.page-header-eyebrow` (an existing 11px uppercase steel style; it sits in the card, not in the header) followed by `div.charge-list`. When there are none, show `p.text-sm.text-muted` "Nenhuma cobrança em aberto." instead.
- Footer: `div.btn-group`:
  - `button.btn-secondary` "TROCAR PLANO";
  - a `RowMenu` (`ariaLabel="Mais ações da assinatura"`) with **Cancelar assinatura** (danger).
  - Primary + secondary is the most the footer may hold, and "Cancelar" is destructive, so it goes in the menu.
- No cycle-progress bar. It was decorative and computed on the client.

**State B: no active subscription and no open charges.**
- `article.card` > `div.empty-state`:
  - `div.empty-state-icon.empty-state-icon--accent` with `<CreditCard size={32} strokeWidth={2} />`;
  - `p.empty-state-title` "Sem plano ativo";
  - `p.text-muted.text-sm` "Atribua um plano para registrar as cobranças deste aluno.";
  - `button.btn-primary` "ATRIBUIR PLANO".

**State C: no active subscription but open debt (cancelled plan).**
- `article.card`. Header: `h3.card-title` "Sem plano ativo" with `badge badge-red` "EM ATRASO" (or `badge-blue` "EM ABERTO" when only pending).
- `p.text-sm.text-muted`: "O plano anterior foi cancelado, mas ainda há cobranças em aberto."
- The open-charges list (the rows' meta shows "· plano cancelado").
- Footer: `button.btn-primary` "ATRIBUIR PLANO".

**Loading:** `div.skeleton.skeleton-card` inside the section frame (header visible).
**Error:** `article.card` > `p.text-sm.text-muted` "Não foi possível carregar a assinatura." + `button.btn-secondary.btn-sm` "TENTAR NOVAMENTE".

### 4.7 SubscriptionHistory page

```
MOBILE 375                                      DESKTOP ≥1024
[← Voltar]                                      [← Voltar]
HISTÓRICO FINANCEIRO                            HISTÓRICO FINANCEIRO
[Wallet] Maria Silva                            [Wallet] Maria Silva                          [GERAR PRÓXIMO CICLO]
[ GERAR PRÓXIMO CICLO ] (full width)            ┌ stats-hero (3 cells) ───────────────────────────────────────┐
┌ stats-hero (2×2, 3 cells) ─┐                  │ R$ 598,80      │ 2              │ jan/2026               │
│ R$ 598,80   │ 2            │                  │ 6 pagamentos   │ 1 em atraso    │                        │
│ TOTAL RECEB.│ EM ABERTO    │                  │ TOTAL RECEBIDO │ EM ABERTO      │ ALUNO DESDE            │
│ jan/2026    │              │                  └──────────────────────────────────────────────────────────────┘
│ ALUNO DESDE │              │                  [Todas 9] [Em aberto 2] [Pagas 6] [Anuladas 1]
└────────────────────────────┘                  2026
[Todas][Em aberto][Pagas][Anu…→]                PaymentRow(history) …
2026                                            2025
PaymentRow(history) …                           PaymentRow(history) …
```
- **Back:** `button.btn-back` with `ArrowLeft size={16}` and "Voltar". It calls `navigate(-1)` when `location.key !== 'default'`, otherwise `/trainer/students/:studentId`.
- **Header:**
  - `.page-header` > `div` containing `span.page-header-eyebrow` "Histórico financeiro" and a `.page-header-title-row` with `Wallet size={24}` and `h1` {student name}.
  - The student name comes from `location.state.studentName`. Pass it from both entry points. When it is missing (deep link), the h1 is "Histórico financeiro" and the eyebrow is hidden. **See backend ask §8-1.**
  - `.page-header-actions`: `button.btn-secondary` "GERAR PRÓXIMO CICLO" (`RefreshCw size={16}`), only when some payment has `subscriptionStatus === 'active'`; use that `subscriptionId`. The button posts directly, with no form and no date. Messaging is in §6.3.
- **Stats hero:** `.stats-hero` with 3 cells.
  1. `StatDisplay` "Total recebido": `summary.totalReceived`, sub "{receivedCount} pagamento(s)".
  2. `StatDisplay` "Em aberto": the count of rows with status overdue or pending, sub "{n} em atraso" when > 0, and the `--md-error` tint when any are overdue. The client only counts here; it never sums.
  3. `StatDisplay` "Aluno desde": `summary.customerSince` → "jan/2026". It gets the `.stat-display--text` modifier (new), which switches the value to the base family at 20px/700, because this is a date, not a metric. When it is null, show "—". **Not "Cliente desde"**: the glossary forbids "cliente".
- **Filter:** reuse the Students filter markup without search: `div.students-filter-group.students-filter-group--scrollable` with `role="tablist"` and `aria-label="Filtrar cobranças"`, containing `button.students-filter-btn` items with `.students-filter-count`. Filters: Todas · Em aberto (overdue + pending) · Pagas · Anuladas. Hide "Anuladas" when its count is 0.
- **List:** grouped by the year of `cycleStartDate`, newest first.
  - Group title: `h2.cockpit-section-eyebrow` "2026".
  - Rows: `PaymentRow variant="history"` (the API already orders them newest cycle first).
- Notes appear on the row (line 3).

### 4.8 Sidebar entry (`Layout.jsx`)

- **Position:** trainer section, between iArnold (`:171`) and the Biblioteca dropdown (`:173`), as in the plan. Order: Meus Alunos → iArnold → **Financeiro** → Biblioteca.
- **Markup:**
  - The same as the other `sidebar-link`s: `Link to="/trainer/financeiro"`, `.sidebar-link` + `--active` (prefix match, so `/trainer/students/:id/subscription-history` does **not** activate it; that page belongs to the student).
  - Icon: `<Wallet size={20} … />`. The same icon is used on the page header and on the dashboard FinanceiroBand, which is why `DollarSign` goes.
  - Label "Financeiro".
- **Badge:**
  - Shown when `overdueCount > 0`: `span.sidebar-link-badge.sidebar-link-badge--count` with the value `overdueCount > 99 ? '99+' : overdueCount`.
  - The `Link`'s `aria-label` becomes "Financeiro, {n} cobrança(s) em atraso" when the badge shows. It stays "Financeiro" otherwise. The visible badge is `aria-hidden`, because the link label already carries the count.
  - When the sidebar is collapsed, the label and badge are hidden by the existing rule. Add `span.sidebar-link-dot` (new) on the icon wrapper, an 8px `--md-error` dot shown only under `.sidebar--collapsed`, so the signal survives collapse.
- **Data, no network from Layout:** a new hook, `useFinanceOverdueCount`.
  1. Initial value: `finance.overdueCount` from the `useTrainerDashboard` cache (`localStorage['treinoway.trainerDashboardData']`), read synchronously. Calling `useTrainerDashboard(false)` gives exactly "read cache, don't fetch".
  2. Live updates: listen to a `window` event `treinoway:finance-overdue-changed` with `{ overdueCount, overdueAmount }`.
  3. Financeiro dispatches that event and **patches the dashboard cache's `finance.overdueCount/overdueAmount`** after every overview load or refetch. Export a small `patchTrainerDashboardFinanceCache()` from `useTrainerDashboard.js`. Overview overdue is "as of today" for any month, so the patch is valid from any month view. The AC guarantees dashboard and overview agree.
  - Trade-off: the badge can be stale until the trainer visits Dashboard or Financeiro. That is acceptable, because Dashboard is the post-login home. Fetching `/trainer/dashboard` from Layout is not acceptable: Layout remounts on every route and the dashboard is a multi-query endpoint.
- **Mobile bottom nav:** no new item (5 slots already). The mobile entry point is the Dashboard. **Change in `ControlTower.jsx` FinanceiroBand:** give the "Recebido no mês" tile `to="/trainer/financeiro"` always (today only the overdue tile links, and only when there is debt), and point the overdue tile to `/trainer/financeiro?status=overdue`. See §8-10.
- **Tests:** `Layout.test.jsx:656` must be updated. Financeiro now renders; Campeonatos and Sua Marca stay hidden. Add cases for the badge (count, 99+, hidden at 0, aria-label).

### 4.9 Sheets

All sheets:
- Use the canonical `.overlay` > `.bottom-sheet` > `.bottom-sheet-header` (`h2.bottom-sheet-title` + `button.bottom-sheet-close` with `aria-label="Fechar"` and `X size={20}`) > `.bottom-sheet-body` > `form.form`.
- Footer: `div.btn-group.btn-group--equal` with the primary (submit) first, then `btn-secondary` "CANCELAR".
- Mobile: they slide up. Desktop: a centred dialog (the existing `.bottom-sheet` behaviour).
- Inputs and buttons are disabled while submitting, and the submit label is "Carregando...".
- Server field errors render inline as `span.form-error` with `role="alert"` under the matching field, and the input gets `form-input--error`.
- Non-field errors render as `p.form-error` with `role="alert"` above the footer.

**4.9.1 PlanFormSheet: "Novo plano" / "Editar plano"**
1. **Nome**: `input.form-input`, maxLength 100, required.
2. **Recorrência**: `segmented-toggle` with 4 options (Mensal · Trimestral · Semestral · Anual). On 375px the four labels wrap to 2×2. Add the `segmented-toggle--wrap` modifier (new) if the existing toggle overflows. Check the existing toggle first.
3. **Valor por cobrança (R$)**: `input.form-input`, `inputMode="decimal"`, placeholder "0,00". Validation: > 0, at most 2 decimals, ≤ 99.999.999,99.
4. **Desconto padrão**: `segmented-toggle` Nenhum · Percentual · Valor fixo. When it is not Nenhum, an input "Desconto (%)" (0–100, **at most 2 decimals**; §8-6) or "Desconto (R$)" (at most 2 decimals, ≤ price).
5. **Resumo**: `div.plan-preview-card` (rewritten with brand tokens, §5).
   - Overline `.plan-preview-card-title` "Valor cobrado".
   - The value `.plan-preview-card-amount` (new): "R$ 66,60" in stat font 24px, then "por mês" in steel.
   - When there is a discount, a line `.plan-preview-card-line`: "R$ 99,90 − 33,33%".
   - Computed with §6.4. When the price is invalid, show "—".
   - The summary sits **after** the fields, not above them: it confirms, it does not lead. A dark stadium "preview card" at the top is exactly what is being removed.
6. **Price-change banner** (edit mode only; shown once price or discount differs from the saved plan): `InfoBanner` with the text "O novo valor vale só para novas assinaturas. {n} aluno(s) com este plano continuam pagando {valor atual}." When n is unknown or 0: "O novo valor vale só para novas assinaturas. Quem já tem este plano continua pagando o valor atual."
- Submit: "CRIAR PLANO" / "SALVAR".
- Toasts: "Plano criado." / "Plano salvo."
- Send `discountPercent` and `discountAmount` explicitly: the chosen one with its value, the other `null`. "Nenhum" sends both `null`.

**4.9.2 AssignPlanSheet: "Atribuir plano" / "Trocar plano"**
1. **Plano**: `div.assign-plan-options` with `role="radiogroup"` and `aria-label="Selecionar plano"`, containing `button.assign-plan-option` items with `role="radio"` and `aria-checked` (rewritten with brand tokens).
   - Each option: `.assign-plan-option-name` with the name, and `.assign-plan-option-meta` "{recorrência} · R$ 66,60".
   - Replace mode: the current plan option is `disabled` with the meta "Plano atual".
   - Archived plans are excluded.
   - Pre-select the first plan (the first eligible one in replace mode).
2. **Início**: `segmented-toggle` Hoje · 1º do próximo mês · Outra data. "Outra data" reveals `input type="date"` (no min and no max: the backend accepts past and future dates). This replaces `.chip`.
3. **Desconto**: collapsed by default behind `button.btn-link` "Ajustar desconto". When open:
   - a `segmented-toggle` Do plano (−33,33%) · Nenhum · Personalizado. "Do plano" is disabled with the label "Do plano (sem desconto)" when the plan has none.
   - Personalizado reveals a second `segmented-toggle` % · R$ plus an input, with the same validation as 4.9.1.
   - Payload: "Do plano" omits both discount fields (the backend falls back to the plan). "Nenhum" sends both `null`. "Personalizado" sends the chosen field plus the other as `null`. **Sending only one field while the plan has the other type of default discount triggers `SUBSCRIPTION_BOTH_DISCOUNTS_SET`.**
4. **Resumo**: `div.plan-preview-card` with the overline "Valor por ciclo", the amount computed with §6.4 from the **plan price** and the chosen discount, and the period.
5. **Rules banner**: one `InfoBanner`. Its text is the concatenation of the sentences that apply, max 2:

| Condition (client-side, by date strings) | Sentence |
|---|---|
| replace and start ≤ today | "{plano atual} é encerrado agora. Cobranças dele a partir do novo início são anuladas; as anteriores continuam valendo, com valor cheio." |
| replace and start > today | "{plano atual} continua cobrando até {DD/MM}, quando o novo plano começa. Não há valor proporcional: um ciclo antigo que passe dessa data é cobrado inteiro, e você pode editar o valor depois." |
| start < today (assign or replace) | "Data no passado: só o ciclo atual é cobrado, sem cobranças retroativas." |

- No banner for a plain assign starting today or in the future.
- Submit label: "ATRIBUIR PLANO" / "TROCAR PLANO". **One request** (§0 B1).
- On success:
  - toast "Plano atribuído. Primeira cobrança: {firstPayment.cycleStartDate DD/MM} – {cycleEndDate DD/MM}." (in replace mode: "Plano trocado. Primeira cobrança: …"). This is where the trainer learns which cycle a backdated start actually billed, because `firstPayment.cycleStartDate` can be later than the chosen start;
  - close the sheet;
  - refetch the block.
- **No plans yet:** the existing quick-create stays (Nome, Recorrência, Valor), restyled. The intro is `p.text-sm.text-muted` "Você ainda não tem planos. Crie um agora e já atribua a este aluno." and the submit is "CRIAR E ATRIBUIR".

**4.9.3 MarkPaidSheet: "Registrar pagamento"** (new; used for "Marcar pago em outra data…" and for "Registrar pagamento…" on anulada rows)
- Context: `p.text-sm.text-muted` "{nome ou período} · {R$ valor} · venc. {DD/MM}".
- **Data do pagamento**: `input type="date"`, default today (SP), `max` = today.
  - `span.form-hint`: "O pagamento conta na receita do mês desta data."
- For an anulada charge, add an `InfoBanner`: "Esta cobrança foi anulada. Ao registrar o pagamento, o valor volta a contar como receita."
- Submit: "REGISTRAR PAGAMENTO". Body `{ paidAt }`. Toast: "Pagamento registrado em {DD/MM}."

**4.9.4 EditPaymentSheet: "Editar cobrança"** (new)
- Context line as in 4.9.3.
- **Valor (R$)**: decimal input with the same validation as the plan price.
- **Vencimento**: `input type="date"`, with `span.form-hint` "A cobrança entra em atraso 3 dias após o vencimento."
- **Observação**: `textarea.form-textarea`, maxLength 500, with the counter "{n}/500" in `.form-hint`.
- **Paid charge:**
  - Valor and Vencimento are `disabled`.
  - `InfoBanner` at the top: "Cobrança paga: valor e vencimento ficam bloqueados. Para alterá-los, volte a cobrança para pendente."
  - Only Observação is submitted.
- PATCH sends only changed fields. Submit: "SALVAR". Toast: "Cobrança salva."

### 4.10 Confirm dialogs (CLAUDE.md Rule 6 pattern)

- Markup: `.overlay` > `div.confirm-dialog` with `role="alertdialog"`, `aria-modal="true"` and `aria-describedby` → `p.confirm-dialog-message`.
- Buttons: `div.btn-group.confirm-dialog-actions`.
- The confirm button shows "Carregando..." while in flight, and focus starts on **Voltar**.

| Action | Message | Confirm button | Cancel |
|---|---|---|---|
| Anular cobrança | "Anular a cobrança de {R$ 99,90} de {Maria Silva} (venc. {01/10})? Ela deixa de contar como valor a receber e fica no histórico como anulada." (history variant: "Anular a cobrança de {01/10 – 31/10}?…") | `btn-danger` "ANULAR COBRANÇA" | `btn-secondary` "VOLTAR" |
| Voltar para pendente | "Voltar esta cobrança para pendente? O valor sai da receita de {mês do pagamento}. Se ela tinha sido anulada antes, volta a ficar anulada." | `btn-primary` "VOLTAR PARA PENDENTE" (reversible, so not danger) | `btn-secondary` "CANCELAR" |
| Cancelar assinatura | "Cancelar a assinatura de {Maria Silva}? Cobranças com vencimento futuro são anuladas. As que já venceram continuam em aberto. O histórico é mantido." | `btn-danger` "CANCELAR ASSINATURA" | `btn-secondary` "VOLTAR" |

- The second sentence of the revert message is needed because a voided-then-paid charge reverts to `cancelled`, and the client cannot tell beforehand (§8-5).

---

## 5. Components and CSS

### 5.1 Components

| Component | Fate | Notes |
|---|---|---|
| `pages/trainer/Financeiro.jsx` | **Rewrite** | Orchestrates overview fetch, URL state, sheets, dialogs, cache patch + event. |
| `pages/trainer/SubscriptionHistory.jsx` | **Rewrite** | Uses `GET /trainer/students/:id/payments`. No `GET /trainer/students`. |
| `PaymentRow.jsx` | **Rewrite** | Two variants (§4.3). Status from the API. |
| `PlanCard.jsx` | **Rewrite** | `.card` based (§4.5). |
| `PlanFormSheet.jsx` | **Rewrite** | No stadium preview; price-change banner. |
| `AssignPlanSheet.jsx` | **Rewrite** | Segmented start, explicit discount payload, rules banner. |
| `MarkPaidSheet.jsx` | **New** | §4.9.3 |
| `EditPaymentSheet.jsx` | **New** | §4.9.4 |
| `SubscriptionCard.jsx` | **Rewrite → rename `SubscriptionBlock.jsx`** | §4.6, states A/B/C. The old name implied a single card with a cycle bar. |
| `StatusPill.jsx` | **Rewrite → rename `PaymentStatusBadge.jsx`** | Renders `badge badge-*` + API label + days. One badge system (skill §4.6). |
| `MonthSelector.jsx` | **Keep, restyle** | Add a `max` prop (current month) that disables "Próximo mês". Label in an `aria-live="polite"` span. 44px arrows on mobile. |
| `Avatar` (local in `Students.jsx:43`) | **Extract** to `src/components/Avatar.jsx` | Now needed by two pages; skill §4.19 already documents it as a component. Students keeps its status ring. Financeiro passes no `status`. |
| `RowMenu.jsx` | **Keep** | Trigger `strokeWidth` 1.6 → 2. |
| `LibraryFilterBar.jsx`, `InfoBanner.jsx`, `InfoPopover.jsx`, `StatDisplay.jsx` | **Reuse as is** | |
| `FinanceiroHero.jsx` (+test) | **Delete** | |
| `RevenueWaveform.jsx` (+test if any) | **Delete** | |
| `SubscriptionStrip.jsx` (+test), `constants/subscriptionStub.js` | **Delete**; remove from `StudentCockpitHero` | §0 B2 |
| `RecurrenceTag.jsx` (+test) | **Delete** | The recurrence is plain meta text now. |
| `hooks/useFinanceiroBadge.js` (+test if any) | **Delete** | Replaced by `useFinanceOverdueCount`. |
| `hooks/useFinanceOverdueCount.js` | **New** | §4.8 |
| `utils/subscriptionHelpers.js` | **Trim** | **Delete:** `deriveEffectivePaymentStatus`, `buildCycleLabel`, `computeCyclePct`, `isDateInYearMonth`, and `computeDiscountedAmount` (float). **Add:** `computeNetAmountCents` (§6.4), `parseMoneyToCents`, `formatCentsBRL`, `formatPaidAtDate` (SP timezone). **Reimplement** `todayDateString` in SP time. **Keep:** the recurrence constants, `formatMonthLabel`, `currentYearMonth`, `firstDayOfNextMonth`, `normalizeForSearch`, `addMonthsToDateString` only if still used. |
| `api/subscriptions.js` | **Extend** | `getFinanceOverview(month)`, `listStudentPayments(studentId)`, `markPaymentAsPaid(id, { paidAt })`, `voidPayment(id)` (`POST …/void`), `updatePayment(id, patch)`, `generateNextCycle(subscriptionId)` (no `cycleStartDate`; sending it is a 400). Remove `deletePaymentCycle`. |
| `constants/finance.js` | **New** | `FINANCE_OVERDUE_GRACE_DAYS = 3` (**copy only, never for status**, §8-3), and the filter ids. |

### 5.2 Existing classes to reuse (verified in `src/index.css`)

- **Page:** `.page-header`, `.page-header-title-row`, `.page-header-title-icon`, `.page-header-eyebrow`, `.page-header-actions`, `.page-header-actions--equal-mobile`, `.btn-back`.
- **Tabs and filters:** `.tabs-container`, `.tab-button`, `.tab-button--active`; `.students-toolbar`/`.students-search-wrap`/`.students-search-input`/`.students-filter-group`/`--scrollable`/`.students-filter-btn`/`.students-filter-count` (via `LibraryFilterBar`); `.library-empty-notice`.
- **Sections:** `.cockpit-section`, `.cockpit-section-header`, `.cockpit-section-eyebrow`, `.cockpit-section-eyebrow-suffix`.
- **Stats:** `.stat-display`, `.stat-display-value`, `.stat-display-unit`, `.stat-display-label`, `.stat-display-subvalue`, `.stat-display--inline`.
- **Cards:** `.card`, `.card-header-row`, `.card-title`, `.card-subtitle`, `.grid-cards`.
- **Badges:** `.badge`, `.badge-red`, `.badge-blue`, `.badge-green`, `.badge-gray`.
- **Buttons:** `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-sm`, `.btn-link`, `.btn-group`, `.btn-group--equal`.
- **Menus and toggles:** `.row-menu*`, `.segmented-toggle`, `.segmented-toggle-btn`, `.segmented-toggle-btn--active` (this is the class the CSS actually defines; the skill sample says `.active`).
- **Overlays:** `.overlay`, `.bottom-sheet*`, `.confirm-dialog`, `.confirm-dialog-message`, `.confirm-dialog-actions`.
- **Forms:** `.form`, `.form-group`, `.form-label`, `.form-input`, `.form-input--error`, `.form-textarea`, `.form-hint`, `.form-error`.
- **Feedback and states:** `.info-banner*` (via `InfoBanner`), `.empty-state`, `.empty-state-icon`, `.empty-state-icon--accent`, `.empty-state-title`, `.skeleton`, `.skeleton-text`, `.skeleton-card`.
- **Utilities and misc:** `.text-sm`, `.text-muted`, `.avatar-initials`, `.avatar-color-0..5`, `.sidebar-link*`, `.sidebar-link-badge`.

### 5.3 New and rewritten CSS

All new CSS uses canonical tokens only: `--brand-*`, `--md-surface`, `--md-error`, `--radius-brand`, `--shadow-brand-*`, `--duration-*`, `--ease-brand`, `--spacing-*`, `--font-family-stat`. Mobile-first with `min-width` breakpoints.

| Class | Purpose |
|---|---|
| `.stats-hero`, `.stats-hero-grid` | **Extract** from `.students-stats-hero*`: rename the selectors (keep the declarations, including the single `::before` cut) and update `Students.jsx`. This is the shared "stats row" of skill §4.18. Ask the skill owner to align §4.18, which documents `.stats-row/.stat-card`, classes that don't exist in the CSS. |
| `.stats-hero .stat-display` | `background: transparent; padding: 0; border-radius: 0;` plus the ≥768px left divider/padding that `.students-stats-hero-stat` has today. |
| `.stats-hero .stat-display--danger .stat-display-value` (or `.stat-display-value--danger`) | `color: var(--md-error)`. |
| `.stat-display-unit--prefix` | `margin-left: 0; margin-right: var(--spacing-xs);` for the "R$" prefix. |
| `.stat-display--text .stat-display-value` | `font-family: var(--font-family-base); font-size: 20px;` (dates in the stats hero). |
| `.charge-list` | `display: grid; gap: var(--spacing-sm);` |
| `.charge-row`, `.charge-row--overdue`, `.charge-row--void`, `.charge-row-title`, `.charge-row-meta`, `.charge-row-notes`, `.charge-row-date`, `.charge-row-amount`, `.charge-row-badge`, `.charge-row-action` | §4.3. The rail copies `.student-stat-row--needs-action::before` with `--md-error`. The amount is `--font-family-stat`, tabular-nums, 16px/700. A new name avoids collision with the dead legacy `.payment-row*`. |
| `.plan-card-price`, `.plan-card--archived` | §4.5, also reused in §4.6. |
| `.plan-preview-card`, `-title`, `-line`, `-amount` | **Rewrite** the existing block: `--brand-mist` background, `--radius-brand`, padding `--spacing-md`, title in overline style, amount in stat font 24px. |
| `.assign-plan-options`, `.assign-plan-option`, `--active`, `-name`, `-meta` | **Rewrite** with brand tokens: `--md-surface`, 1px `--brand-divider`, `--radius-brand`, active = `border-color: var(--brand-primary)` + `box-shadow: var(--shadow-focus)`, disabled = 50% opacity, min-height 44px. |
| `.month-selector`, `-arrow`, `-label` | **Rewrite** with brand tokens: `--md-surface`, 1px `--brand-divider`, `--radius-full`, 44px arrows below 768px and 36px at ≥1024px, label `font-variant-numeric: tabular-nums`, 600, min-width 132px. |
| `.sidebar-link-badge--count` | **Rewrite in place** and move it next to `.sidebar-link-badge` (`:1334`): `--md-error` background, white text, `--radius-full`, min-width 18px, padding `0 var(--spacing-xs)`, tabular-nums, 11px/700. |
| `.sidebar-link-dot` | An 8px `--md-error` dot, absolutely positioned top-right of `.sidebar-link-icon`. Only visible under `.sidebar--collapsed`. |
| `.segmented-toggle--wrap` | Only if the 4-option recurrence toggle overflows at 375px: `flex-wrap: wrap` with 2 columns. |

### 5.4 Dead CSS to delete (`src/index.css`)

Line numbers are as of today; re-grep before deleting.

| Range / selector | Notes |
|---|---|
| `2898–2900` `.fin-search-input` | Inside a media query. Delete just that rule. |
| `24409–24512` `.subscription-strip`, `.subscription-chip*` | With B2. |
| `25484–25657` `.financeiro-*` | **Except `.month-selector*` (25497–25531), which is rewritten in place.** |
| `25658–25735` legacy `.payment-row*` | |
| `25736–25768` `.status-pill*` | |
| `25769–25781` `.recurrence-tag` | |
| `25782–25872` legacy `.plan-card*` | |
| `25897–25910` `.warning-banner` | Only consumer is `AssignPlanSheet`. |
| `25950–25979` `.chip-row`, `.chip`, `.chip--active` | Only consumer is `AssignPlanSheet`. `.assign-plan-discount` (25975) is dead too. |
| `25980–26198` `.subscription-card*` | |
| `26199–26277` `.history-*` | Unrelated to `.point-history-row`, which stays. |
| `26291–26300` duplicate `.switch` ("Generic switch (used in plans toolbar)") | The canonical `.switch` at `20304` stays. Verify `ExerciseComposer`, `ExerciseTemplateForm` and `ExerciseProgressionDetail` toggles visually after the removal. |
| `26302–26308` duplicate `.btn-sm` | §0 B3. |
| `26310–27546` the whole "Financeiro Athletic-Tech" block (every `.fin-*`) | |
| `27817–27826` `.fin-plans-toggle-toolbar` | |

After deleting, `grep -n "fin-\|financeiro-\|subscription-card\|status-pill\|history-row\|history-stat\|history-year" src/index.css src/**/*.jsx` must return nothing outside the new classes.

---

## 6. Interaction details

### 6.1 States: Financeiro

| State | Rendering |
|---|---|
| **Initial loading / month change** | Header and tabs render immediately, with `MonthSelector` disabled during the fetch. `.stats-hero` holds 4 cells of `skeleton skeleton-text` (value + label width). Then 3× `skeleton skeleton-card`. The panel is `aria-busy="true"`. Toolbar hidden. |
| **Silent refetch** (after any mutation) | Keep content and skeleton nothing. Only the acting row is `aria-busy`. Replace data on arrival. |
| **Error (overview)** | `.empty-state`: icon `AlertTriangle` in `empty-state-icon--accent`, title "Não foi possível carregar o financeiro.", `p.text-muted.text-sm` `error.userMessage`, `button.btn-secondary` "TENTAR NOVAMENTE". Stats and toolbar hidden. |
| **Empty, never set up** (0 rows **and** 0 plans; the plans list is fetched only when the overview returns 0 rows) | Stats hidden. `.empty-state`: `Wallet` icon (accent), title "Sem cobranças ainda", text "Crie um plano e atribua a um aluno para começar a cobrar.", `btn-primary` "CRIAR PLANO" (switches to Planos and opens `PlanFormSheet`). |
| **Empty month** (0 rows, has plans) | Stats render with zeros. Toolbar hidden. `.empty-state` (no CTA): title "Sem cobranças em {outubro}", text "As cobranças aparecem aqui conforme os ciclos dos seus alunos vencem." |
| **No overdue** (filter "Em atraso", 0 rows) | `.library-empty-notice` "Ninguém em atraso." |
| **No pending / no paid** (filter) | `.library-empty-notice` "Nenhuma cobrança pendente neste mês." / "Nenhum pagamento recebido neste mês." |
| **Everything paid** ("Todas"; the Em atraso and Pendentes sections are empty) | Above "Pagas": `.library-empty-notice` "Tudo em dia neste mês." |
| **Search with no results** | `.library-empty-notice` "Nenhum aluno encontrado para "{termo}"." |
| **Planos loading / error / empty** | Loading: 3× `skeleton skeleton-card` in `.grid-cards`. Error: same pattern as the overview error, with "Não foi possível carregar os planos.". Empty: `.empty-state`, `Wallet` icon, "Sem planos ainda", "Crie o primeiro plano para atribuir aos alunos.", `btn-primary` "CRIAR PLANO". |
| **Viewing a past month** | Nothing extra. The "Em atraso" popover already says "posição de hoje". Rows of later months that are overdue today still appear (backend scope (b)). This is correct and intended. |

### 6.2 States: History and StudentDetail

- **History loading:** header (eyebrow + name when known) + stats skeleton (3 cells) + 3 skeleton cards. **Never** show "not found" before the GET resolves.
- **History error:** the same pattern as the overview error, with "Não foi possível carregar o histórico." Also covers 403/404.
- **History empty:** `.empty-state`, `ReceiptText` icon (accent), "Sem cobranças ainda", "As cobranças aparecem aqui quando um plano é atribuído a este aluno." No CTA. The student may be unlinked, so a CTA could dead-end.
- **StudentDetail:** §4.6 (loading, error, A/B/C).

### 6.3 Mutations: feedback and error mapping

Read the error with `extractErrorInfo(err)` and show `err.userMessage || translateError(err)`. **Never** read `response.data.message`. After every finance mutation, success or 409, refetch the owning data (overview / history / block). A 409 means the UI is stale.

| Endpoint | Code | Where | Copy (pt-BR; add to web `messageCodes` when missing) | Extra |
|---|---|---|---|---|
| any | network / 5xx | toast `error` | `userMessage` | Keep the sheet open. |
| `mark-paid` | 400 `SUBSCRIPTION_INVALID_PAID_AT` | inline under the date | "Data de pagamento inválida: não pode ser futura nem anterior a um ano antes do início da assinatura." | — |
| `mark-paid` | 409 `SUBSCRIPTION_PAYMENT_ALREADY_PAID` | toast `error` | "Esta cobrança já foi paga. Para alterá-la ou anulá-la, volte-a para pendente primeiro." | Close the sheet and refetch. |
| `mark-paid`, `mark-pending`, `void`, `PATCH` | 409 `SUBSCRIPTION_PAYMENT_CONFLICT` | toast `info` | "Esta cobrança foi alterada em outro lugar. Atualizamos a lista." (UI copy, friendlier than the API's "Atualize e tente novamente": the refetch is automatic) | Refetch. |
| `mark-pending`, `PATCH` | 409 `SUBSCRIPTION_PAYMENT_CANCELLED` | toast `error` | "Esta cobrança foi anulada e não pode ser alterada." | Refetch. |
| `void`, `PATCH` | 409 `SUBSCRIPTION_PAYMENT_ALREADY_PAID` | toast `error` | API message (above) | Refetch. The UI already hides these actions, so this only happens when data is stale. |
| `PATCH` | 400 `SUBSCRIPTION_INVALID_AMOUNT` | inline under Valor | "Valor inválido. Use até duas casas decimais e no máximo 99.999.999,99." | — |
| `POST …/payments` (gerar ciclo) | 409 `SUBSCRIPTION_CYCLE_NOT_DUE` | toast `info` (not an error: nothing is wrong) | "O próximo ciclo ainda não está disponível. Ele é gerado automaticamente 7 dias antes de começar." | No refetch. |
| `POST …/payments` | 409 `SUBSCRIPTION_CYCLE_ALREADY_EXISTS` | toast `info` | "Este ciclo já foi gerado." | Refetch, so the existing cycle shows. The trainer's goal is met. |
| `POST …/payments` | 409 `SUBSCRIPTION_CANCELLED` | toast `error` | "Esta assinatura está cancelada." | Refetch; the button disappears. |
| `POST …/payments` | 201 | toast `success` | "Ciclo gerado: {DD/MM} – {DD/MM}." | Refetch. |
| `POST /students/:id/subscriptions` | 409 `SUBSCRIPTION_ALREADY_ACTIVE` | inline, sheet stays open | "Este aluno já possui uma assinatura ativa. Atualizamos os dados — confira e tente de novo." | Refetch the block **and** switch the sheet to replace mode. |
| same | 409 `SUBSCRIPTION_PLAN_ARCHIVED` | inline under Plano | "Este plano foi arquivado. Escolha outro." | Refetch plans. |
| same | 400 `SUBSCRIPTION_BOTH_DISCOUNTS_SET` / `SUBSCRIPTION_DISCOUNT_EXCEEDS_PRICE` / `SUBSCRIPTION_INVALID_AMOUNT` | inline under Desconto | API messages | — |
| same | `SUBSCRIPTION_STUDENT_NOT_LINKED` | inline | "Este aluno não está mais vinculado a você." | — |
| `POST /subscriptions/:id/cancel` | 409 `SUBSCRIPTION_CANNOT_EDIT_CANCELLED` | toast `info` | "Esta assinatura já foi cancelada." | Refetch the block. |
| plan create/update | 400 `SUBSCRIPTION_INVALID_AMOUNT` / validation | inline under the field | API message | — |

**Web i18n.** Add these `messageCodes` to `src/i18n/locales/pt-BR.js` (and `en-US.js`), using the backend text:
- `subscription.paymentAlreadyPaid`
- `subscription.paymentCancelled`
- `subscription.cancelled`
- `subscription.alreadyActive`
- `subscription.cycleNotDue`
- `subscription.cycleAlreadyExists`
- `subscription.invalidAmount`
- `subscription.invalidPaidAt`
- `subscription.paymentConflict`

Put all UI copy in this spec under a `finance.*` namespace. Do not hardcode it in JSX.

**Success toasts** (`showToast(msg, 'success')`):

| Action | Toast |
|---|---|
| Mark paid (inline) | "Pagamento registrado." with `actionLabel: 'Desfazer'` (5 s) → `mark-pending` + refetch |
| Mark paid on a date | "Pagamento registrado em {DD/MM}." |
| Revert | "Pagamento revertido." |
| Void | "Cobrança anulada." |
| Edit | "Cobrança salva." |
| Plan create / edit | "Plano criado." / "Plano salvo." |
| Archive / unarchive | "Plano arquivado." / "Plano desarquivado." |
| Assign / replace | "Plano atribuído. Primeira cobrança: …" / "Plano trocado. Primeira cobrança: …" |
| Cancel subscription | "Assinatura cancelada." |

### 6.4 Money: exact parity with the backend (half-up, 2 decimals)

All client money math runs in **integer cents**. A float multiplication is never displayed.
1. `parseMoneyToCents(text)` accepts "1.234,56", "1234,56" and "1234.56".
   - It rejects more than 2 decimals ("Use até duas casas decimais.") and anything above 9.999.999.999 cents.
   - It splits on the decimal separator and parses the integer and fraction parts as integers, without `parseFloat`.
   - The same parser turns API strings like `"99.90"` into cents.
2. Percent → integer hundredths `B` (33,33 → 3333). It rejects more than 2 decimals and values outside 0–10000.
3. Net cents:
   - percent: `floor((P × (10000 − B) + 5000) / 10000)`. `P × 10000 ≤ 1e14 < 2^53`, so this is exact in JS numbers.
   - amount `A`: `max(P − A, 0)`.
   - none: `P`.
4. Check: `99,90` with `33,33%`: 9990 × 6667 = 66 603 330, plus 5000, divided by 10 000 → **6660 → R$ 66,60**. The backend gives 99.90 − 33.29667 = 66.60333 → 66.60. ✓
   - Add this exact case plus `0,01 × 50%` → R$ 0,01 (half-up) to the unit tests.
5. Display with `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` on `cents / 100`. Formatting a single value is fine. Summing is not.
6. API payloads send `cents / 100` as a number. The cents are already exact, so there is no rounding drift.

### 6.5 Micro-interactions

- Hover and focus use `var(--duration-fast) var(--ease-brand)`. Sheets use `--duration-slow`.
- No kinetic or celebration motion anywhere: paying a bill is not a PR.
- After a refetch, a row that changes section simply re-renders in place. There is no cross-section animation (it is expensive and adds nothing).
- The inline MARCAR PAGO button is not optimistic. It waits for the 200, because the KPIs must come from the server.
- `MonthSelector`: the next arrow is disabled at the current month (`aria-disabled`, with `title="Meses futuros não estão disponíveis"`). Month changes are debounced by request cancellation (abort the previous overview request with an `AbortController` through axios `signal`).

---

## 7. Edge cases

| # | Case | Handling |
|---|---|---|
| E1 | **Future months** | Blocked. Upcoming charges are generated only 7 days ahead, so a future month would look empty or misleading. This answers the brief's open question. |
| E2 | **Past month, overdue rows from later months appear** | Correct per the backend scope. "Em atraso" and "Inadimplência" are "hoje" metrics, explained in the popover. |
| E3 | Charge inside the 3-day grace | Shown as PENDENTE with "Venceu 04/10" (not red). It turns red only when the API says `overdue`. |
| E4 | Debt from a cancelled subscription (student without an active plan) | Overview row meta "· plano cancelado"; full menu available. StudentDetail state C. History works even after unlink. |
| E5 | Unlinked student | History reachable from the Financeiro row. StudentDetail may 403/404, which is that page's existing handling. |
| E6 | Long names / plan names | Title is one line with ellipsis (`min-width: 0`). Meta wraps. Plan card title clamps to 2 lines. Full text is in `title`. |
| E7 | Large amounts (R$ 99.999.999,99) | The row amount column allows wrapping to a second line on mobile rather than overflowing. Stats use `variant="inline"` (24px) below 768px. Test at 375px with "R$ 12.345,67". |
| E8 | Double tap on MARCAR PAGO | The button is disabled at the first tap. The backend is idempotent for the same date anyway. |
| E9 | Double submit on assign | The submit is disabled while in flight. 409 `SUBSCRIPTION_ALREADY_ACTIVE` is mapped (§6.3). |
| E10 | Slow network | Skeletons only on the first load and on month changes. Mutations keep content and disable only the acting row. Abort stale month requests. |
| E11 | Overview generation error | The backend still returns data (logs only), so there is no UI state for it. |
| E12 | Annual plan paid this month | Counts once in "Recebido no mês". The label is correct now that MRR is gone. |
| E13 | Paid charge with a different date requested | 409 → revert first. The sheet is only offered on unpaid or anulada rows, so it should not happen. |
| E14 | Revert of a voided-then-paid charge | Becomes `cancelled`. The copy already warns. After the refetch the row disappears from the overview, which is expected. |
| E15 | `customerSince` null, `paidAt` null on a paid row (legacy data) | Show "—", never "Invalid Date". |
| E16 | Trainer in another timezone | "Hoje", `max` paid date and verb choice all use `America/Sao_Paulo`, which is the backend business timezone. |
| E17 | Plan list fails but overview works | Cobranças is unaffected. Planos shows its own error. The subscriber-count failure hides only the counts. |

---

## 8. Conflicts with backend rules and suggested follow-ups (flagged, not silently changed)

| # | Topic | Impact on this design | Suggestion |
|---|---|---|---|
| 8-1 | `GET /trainer/students/:id/payments` has **no student name** | On a deep link to History (or after unlink, when the name isn't in router state) the h1 falls back to "Histórico financeiro". | Add `student: { id, name }` to the response. It is a single extra select. |
| 8-2 | **Overview mixes time frames.** "Recebido" is month-scoped, but "Em atraso" (and so `delinquencyRate` and `billedStudents`) is as of today across all months. For a past month, the rate divides today's overdue students by that month's billed students plus today's overdue. | Copy in the popover discloses "posição de hoje". The number is still semantically odd for past months. | Product decision: (a) accept it with the disclosure (current spec), (b) compute delinquency only for the current month and show "—" for past months, or (c) have the backend return month-scoped overdue for past months. I recommend (b) if the backend can expose a flag; otherwise (a). |
| 8-3 | **Grace days not in the API** | The FE hardcodes `3` for copy only (popover and edit-sheet hint). | Return `overdueGraceDays` in the overview (and `cycleGenerationLeadDays` for the NOT_DUE copy). |
| 8-4 | **409 `SUBSCRIPTION_CYCLE_NOT_DUE` has no `details`** | Copy can't say when the next cycle opens. | Add `details: { nextCycleStartDate }` → "Disponível a partir de 25/10." |
| 8-5 | **`voidedAt` is not exposed** | The revert dialog can't predict pending vs anulada, so it uses generic copy. | Expose `voidedAt` (or `wasVoided`) on the payment shape. |
| 8-6 | **`discountPercent` accepts more than 2 decimals** (only amounts are checked) | The FE caps percent at 2 decimals so the preview is exact. A third-party client could still create 33.333%, which the preview can't mirror. | Validate `discountPercent` decimals server-side (`SUBSCRIPTION_INVALID_AMOUNT` or a new code). |
| 8-7 | **Label gender:** `effectiveStatusLabel` "Pago" (masculine) vs "Anulada" (feminine). The subject is "cobrança". | The badges read "PAGO" next to "ANULADA". | Change the categorical label to "Paga" for consistency. Low priority; the FE shows the API labels as is. |
| 8-8 | **Plans have no active-subscriber count** | One extra `GET /trainer/subscriptions?status=active` on the Planos tab. | Add `activeSubscriptionsCount` to the plan list (a single `_count`). Then the FE drops the extra call. |
| 8-9 | **"Gerar próximo ciclo" is likely redundant.** The overview runs generation on load, and the cron (if enabled) runs too, so the manual action will almost always return `CYCLE_NOT_DUE`. | Kept as decided, but demoted to a secondary header action on History only (never on Financeiro rows or StudentDetail). | Measure usage. Remove it if the 409 rate is near 100%. Note: if generation runs only on overview load, a trainer who lives in StudentDetail never triggers it; the History endpoint should probably run the generator for that student too. |
| 8-10 | **No mobile nav entry for Financeiro** | Mobile reaches Financeiro only through the Dashboard band (now always linked) and the StudentDetail/History links. | Product decision: accept it, or swap a bottom-nav slot. I would not add a 6th item. |
| 8-11 | Editing `dueDate` on an overdue charge effectively grants an extension | The UI allows it (the backend does). The hint explains the grace rule. | Consider an audit field later. Out of scope. |
| 8-12 | Skill drift | The skill §4.18 documents `.stats-row/.stat-card` (no matching CSS), and the §4.8/§4.7 samples use `.active` while the CSS uses `--active`. §10's checklist still says "Athletic-Tech / Space Grotesk / theme-stadium when appropriate". | Ask whoever owns the skill to update it after this lands. This spec uses the classes that actually exist. |

---

## 9. Accessibility

- **Landmarks and headings:**
  - One `h1` per page.
  - Section titles are `h2` (Em atraso / Pendentes / Pagas / year groups).
  - Plan names and block titles are `h3`.
  - The StudentDetail "Cobranças em aberto" overline is an `h4`.
- **Tabs:** `role="tablist"`/`tab`/`tabpanel` with `aria-controls`/`aria-labelledby`, as in `StudentsTabs`. Arrow-key navigation between the two tabs is nice-to-have.
- **Filters:** `LibraryFilterBar` uses `role="tablist"` inside the page tabpanel (existing pattern). Keep `aria-label="Filtrar cobranças"` distinct from the page tabs' label.
- **Status is never colour-only:**
  - badges carry text ("EM ATRASO · 4 DIAS");
  - the red rail is decorative (`aria-hidden` pseudo-element);
  - KPI tint is redundant with the label.
- **Row actions:**
  - MARCAR PAGO: `aria-label="Marcar pago: {nome}, {R$ valor}"` (history variant: "Marcar pago: cobrança de {DD/MM}").
  - Menu trigger labels: §4.4.
  - When a row is mutating, its region gets `aria-busy`.
- **Live regions:**
  - `MonthSelector` label is `aria-live="polite"`.
  - KPI hero: wrap the values in a region announced once after a refetch (`aria-live="polite"` on a visually hidden summary: "Recebido no mês R$ 1.200,00; a receber R$ 300,00; em atraso R$ 199,80, 2 alunos").
  - Toasts already announce.
- **Sheets and dialogs:**
  - focus trap;
  - Escape closes;
  - focus returns to the trigger (the row ⋮ or the button);
  - the first focusable element is the first field (sheets) or **Voltar** (destructive dialogs);
  - dialogs use `role="alertdialog"`.
- **Forms:**
  - every input has a `label`;
  - hints are tied with `aria-describedby`;
  - errors are `role="alert"` + `aria-invalid`;
  - date inputs carry `max`;
  - decimal inputs use `inputMode="decimal"`;
  - disabled paid fields keep their label, and the banner explains why.
- **Touch targets:** at least 44×44px below 1024px for MARCAR PAGO, ⋮, month arrows, segmented buttons and plan options. On desktop, `btn-sm` can be 36px.
- **Contrast:**
  - no `--brand-accent` as text;
  - the error tint is `--md-error` on white (AA at the sizes used);
  - anulada amounts in `--brand-steel` (AA at 16px/700).
- **Sidebar badge:** the count lives in the link's accessible name (§4.8). The visual badge and the collapsed dot are `aria-hidden`.
- **Reduced motion:** respect `prefers-reduced-motion` for the sheet slide (existing global rule; verify).

---

## 10. Brand application notes (TeuFit)

- **Theme:** light everywhere. **No `.theme-stadium`** on any finance surface (§4.16 deprecated). The stadium hero, waveform, dark preview card and dark history strip are all removed.
- **The single geometric cut:** only the `.stats-hero::before` on Financeiro and History. There is none on cards, rows or sheets.
- **Typeface:** Nunito Sans only (through `--font-family-display`/`--font-family-base`). h1 is 28px/600–700 with tight tracking.
- **`StatDisplay`:** the 4 Financeiro KPIs and the 3 History stats.
  - Row amounts, plan prices and preview amounts use `--font-family-stat` + `tabular-nums` through the classes in §5.3. They are not `StatDisplay` (no tile chrome inside rows).
  - Dates ("Aluno desde") use the base family through `.stat-display--text`.
- **UPPERCASE with subtle tracking** (`--tracking-wide` 0.03em):
  - all buttons: MARCAR PAGO, NOVO PLANO, CRIAR PLANO, SALVAR, CANCELAR, ATRIBUIR PLANO, TROCAR PLANO, REGISTRAR PAGAMENTO, ANULAR COBRANÇA, VOLTAR PARA PENDENTE, CANCELAR ASSINATURA, GERAR PRÓXIMO CICLO, TENTAR NOVAMENTE;
  - badges;
  - stat labels;
  - section eyebrows and `page-header-eyebrow`.
  - Tabs and filter chips stay sentence case (existing components).
- **Colour:**
  - `--brand-primary` on primary CTAs, active tab and focus.
  - `--md-error` on the overdue rail, overdue badge, Em atraso/Inadimplência tint and sidebar badge.
  - `--md-success` through `badge-green` (Pago / Em dia).
  - **`--brand-accent` appears only in the existing `.stats-hero::before` cut (6% opacity) and in `empty-state-icon--accent`. It is never on a CTA and never used as text.**
- **Radius and shadow:**
  - `--radius-brand` (16px) on rows, cards, inputs and buttons;
  - `--radius-lg` on the stats hero and sheets;
  - `--radius-stat` on badges;
  - `--shadow-brand-sm` at rest, `--shadow-brand-lg` on sheets.
  - No tonal fills.
- **Motion:** `--ease-brand` with `--duration-fast` and `--duration-slow` only. **No `--ease-kinetic` moment:** registering a payment is routine, not an achievement.
- **Icons:** Lucide with `strokeWidth={2}`: `Wallet` (sidebar 20, header 24, empty 32), `Plus`, `RefreshCw`, `ArrowLeft`, `CreditCard`, `ReceiptText`, `AlertTriangle`, `ChevronLeft/Right`, `X`, `MoreVertical`.
- **Voice:** direct and warm.
  - "Ninguém em atraso."
  - "Tudo em dia neste mês."
  - No exclamation marks and no emoji.
  - Glossary: "Aluno" (never "cliente": "Aluno desde"), "Criar", "Salvar", "Ciclo". "Anular" is used deliberately instead of "Excluir", because nothing is deleted.
