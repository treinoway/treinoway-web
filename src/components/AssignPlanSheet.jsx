import { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { X, AlertTriangle } from 'lucide-react';
import {
  SUBSCRIPTION_RECURRENCE,
  RECURRENCE_LABEL,
  computeDiscountedAmount,
  parseCurrencyForApi,
  todayDateString,
  firstDayOfNextMonth,
  currentYearMonth,
} from '../utils/subscriptionHelpers';
import { formatAmountBRL, formatCurrencyBRL } from '../utils/currencyFormat';

const DISCOUNT_MODES = Object.freeze({
  DEFAULT: 'default',
  CUSTOM: 'custom',
});

const RECURRENCE_OPTIONS = [
  SUBSCRIPTION_RECURRENCE.MONTHLY,
  SUBSCRIPTION_RECURRENCE.QUARTERLY,
  SUBSCRIPTION_RECURRENCE.SEMIANNUAL,
  SUBSCRIPTION_RECURRENCE.ANNUAL,
];

const initialQuickCreate = () => ({
  name: '',
  recurrence: SUBSCRIPTION_RECURRENCE.MONTHLY,
  price: '',
});

const AssignPlanSheet = ({
  open,
  mode,
  plans,
  onClose,
  onAssign,
  onCreatePlanAndAssign,
}) => {
  const isReplace = mode === 'replace';
  const hasPlans = plans.length > 0;

  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? '');
  const [startDate, setStartDate] = useState(todayDateString());
  const [startMode, setStartMode] = useState('today');
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountMode, setDiscountMode] = useState(DISCOUNT_MODES.DEFAULT);
  const [discountValueText, setDiscountValueText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [quickCreate, setQuickCreate] = useState(() => initialQuickCreate());

  useEffect(() => {
    if (!open) return;
    setSelectedPlanId(plans[0]?.id ?? '');
    setStartDate(todayDateString());
    setStartMode('today');
    setShowDiscount(false);
    setDiscountMode(DISCOUNT_MODES.DEFAULT);
    setDiscountValueText('');
    setSubmitting(false);
    setError(null);
    setQuickCreate(initialQuickCreate());
  }, [open, plans]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || null,
    [plans, selectedPlanId],
  );

  const planBasePrice = selectedPlan ? Number(selectedPlan.price) : 0;
  const planDefaultPercent = selectedPlan && selectedPlan.discountPercent
    ? Number(selectedPlan.discountPercent)
    : null;
  const planDefaultAmount = selectedPlan && selectedPlan.discountAmount
    ? Number(selectedPlan.discountAmount)
    : null;

  const planDefaultPreview = computeDiscountedAmount(planBasePrice, {
    discountPercent: planDefaultPercent,
    discountAmount: planDefaultAmount,
  });

  const customDiscountParsed = discountMode === DISCOUNT_MODES.CUSTOM
    ? parseCurrencyForApi(discountValueText) ?? Number(discountValueText)
    : null;

  const finalPreview = discountMode === DISCOUNT_MODES.CUSTOM
    ? computeDiscountedAmount(planBasePrice, planDefaultPercent !== null
      ? { discountPercent: customDiscountParsed }
      : { discountAmount: customDiscountParsed })
    : planDefaultPreview;

  const handleStartChip = (option) => {
    setStartMode(option);
    if (option === 'today') {
      setStartDate(todayDateString());
    } else if (option === 'nextMonth') {
      setStartDate(firstDayOfNextMonth(currentYearMonth()));
    }
  };

  const handleAssign = async () => {
    setError(null);
    if (!selectedPlan) {
      setError('Selecione um plano.');
      return;
    }
    if (!startDate) {
      setError('Informe a data de início.');
      return;
    }

    const payload = { planId: selectedPlan.id, startDate };

    if (discountMode === DISCOUNT_MODES.CUSTOM) {
      if (customDiscountParsed === null || customDiscountParsed < 0) {
        setError('Informe um valor de desconto válido.');
        return;
      }
      if (planDefaultPercent !== null) {
        if (customDiscountParsed > 100) {
          setError('O desconto percentual deve ser de 0 a 100.');
          return;
        }
        payload.discountPercent = customDiscountParsed;
      } else {
        payload.discountAmount = customDiscountParsed;
      }
    }

    try {
      setSubmitting(true);
      await onAssign(payload);
    } catch (err) {
      setError(err.userMessage || 'Não foi possível atribuir o plano. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickCreateSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const parsedPrice = parseCurrencyForApi(quickCreate.price);
    if (!quickCreate.name.trim()) {
      setError('Informe o nome do plano.');
      return;
    }
    if (parsedPrice === null || parsedPrice <= 0) {
      setError('Informe um valor por cobrança válido.');
      return;
    }

    try {
      setSubmitting(true);
      await onCreatePlanAndAssign({
        planPayload: {
          name: quickCreate.name.trim(),
          recurrence: quickCreate.recurrence,
          price: parsedPrice,
        },
        assignPayload: { startDate },
      });
    } catch (err) {
      setError(err.userMessage || 'Não foi possível criar o plano. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-header">
          <h2 className="bottom-sheet-title">
            {isReplace ? 'Trocar plano' : 'Atribuir plano'}
          </h2>
          <button
            type="button"
            className="bottom-sheet-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="bottom-sheet-body">
          {isReplace && (
            <div className="warning-banner" role="alert">
              <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
              <span>A assinatura atual será cancelada hoje. Histórico preservado.</span>
            </div>
          )}

          {hasPlans ? (
            <div className="assign-plan-content">
              <div className="form-group">
                <span className="form-label">Plano</span>
                <div className="assign-plan-options" role="radiogroup" aria-label="Selecionar plano">
                  {plans.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    return (
                      <button
                        type="button"
                        key={plan.id}
                        role="radio"
                        aria-checked={isSelected}
                        className={`assign-plan-option${isSelected ? ' assign-plan-option--active' : ''}`}
                        onClick={() => setSelectedPlanId(plan.id)}
                        disabled={submitting}
                      >
                        <span className="assign-plan-option-name">{plan.name}</span>
                        <span className="assign-plan-option-meta">
                          {formatCurrencyBRL(plan.price)} · {plan.recurrenceLabel || RECURRENCE_LABEL[plan.recurrence]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <span className="form-label">Data de início</span>
                <div className="chip-row">
                  <button
                    type="button"
                    className={`chip${startMode === 'today' ? ' chip--active' : ''}`}
                    onClick={() => handleStartChip('today')}
                    disabled={submitting}
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    className={`chip${startMode === 'nextMonth' ? ' chip--active' : ''}`}
                    onClick={() => handleStartChip('nextMonth')}
                    disabled={submitting}
                  >
                    Início do mês que vem
                  </button>
                </div>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setStartMode('custom'); }}
                  disabled={submitting}
                />
              </div>

              {(planDefaultPercent !== null || planDefaultAmount !== null) && (
                <div className="form-group">
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => setShowDiscount((prev) => !prev)}
                  >
                    {showDiscount ? 'Ocultar desconto' : 'Ajustar desconto deste aluno'}
                  </button>
                  {showDiscount && (
                    <div className="assign-plan-discount">
                      <p className="text-sm text-muted">
                        Desconto padrão do plano: {planDefaultPercent !== null
                          ? `-${planDefaultPercent}%`
                          : `- ${formatCurrencyBRL(planDefaultAmount)}`}
                        {' '}({formatCurrencyBRL(planDefaultPreview)})
                      </p>
                      <div className="segmented-toggle" role="group" aria-label="Tipo de desconto">
                        <button
                          type="button"
                          className={`segmented-toggle-btn${discountMode === DISCOUNT_MODES.DEFAULT ? ' segmented-toggle-btn--active' : ''}`}
                          onClick={() => setDiscountMode(DISCOUNT_MODES.DEFAULT)}
                          disabled={submitting}
                        >
                          Usar padrão
                        </button>
                        <button
                          type="button"
                          className={`segmented-toggle-btn${discountMode === DISCOUNT_MODES.CUSTOM ? ' segmented-toggle-btn--active' : ''}`}
                          onClick={() => setDiscountMode(DISCOUNT_MODES.CUSTOM)}
                          disabled={submitting}
                        >
                          Personalizar
                        </button>
                      </div>
                      {discountMode === DISCOUNT_MODES.CUSTOM && (
                        <div className="form-group">
                          <label className="form-label" htmlFor="assign-discount">
                            {planDefaultPercent !== null ? 'Desconto (%)' : 'Desconto (R$)'}
                          </label>
                          <input
                            id="assign-discount"
                            type="text"
                            inputMode="decimal"
                            className="form-input"
                            value={discountValueText}
                            onChange={(e) => setDiscountValueText(e.target.value)}
                            disabled={submitting}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="plan-preview-card">
                <div className="plan-preview-card-title">Valor cobrado</div>
                <div className="plan-preview-card-line">
                  <strong>{formatCurrencyBRL(finalPreview)}</strong>
                </div>
              </div>

              {error && <p className="form-error" role="alert">{error}</p>}

              <div className="btn-group btn-group--equal">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAssign}
                  disabled={submitting}
                >
                  {submitting
                    ? 'Salvando…'
                    : (isReplace ? 'Confirmar troca' : 'Atribuir')}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <form className="form" onSubmit={handleQuickCreateSubmit}>
              <p className="text-sm text-muted">
                Você ainda não criou um plano. Crie um agora e atribua de uma só vez.
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="quick-name">Nome do plano</label>
                <input
                  id="quick-name"
                  type="text"
                  className="form-input"
                  value={quickCreate.name}
                  onChange={(e) => setQuickCreate({ ...quickCreate, name: e.target.value })}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="form-group">
                <span className="form-label">Recorrência</span>
                <div className="segmented-toggle" role="group" aria-label="Recorrência">
                  {RECURRENCE_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option}
                      className={`segmented-toggle-btn${quickCreate.recurrence === option ? ' segmented-toggle-btn--active' : ''}`}
                      onClick={() => setQuickCreate({ ...quickCreate, recurrence: option })}
                      disabled={submitting}
                    >
                      {RECURRENCE_LABEL[option]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="quick-price">Valor por cobrança (R$)</label>
                <input
                  id="quick-price"
                  type="text"
                  inputMode="decimal"
                  className="form-input"
                  value={quickCreate.price}
                  placeholder={formatAmountBRL(0)}
                  onChange={(e) => setQuickCreate({ ...quickCreate, price: e.target.value })}
                  disabled={submitting}
                  required
                />
              </div>

              {error && <p className="form-error" role="alert">{error}</p>}

              <div className="btn-group btn-group--equal">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Salvando…' : 'Criar e atribuir'}
                </button>
                <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

AssignPlanSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  mode: PropTypes.oneOf(['assign', 'replace']),
  plans: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onAssign: PropTypes.func.isRequired,
  onCreatePlanAndAssign: PropTypes.func.isRequired,
};

export default AssignPlanSheet;
