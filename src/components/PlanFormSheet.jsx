import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import {
  RECURRENCE_LABEL,
  RECURRENCE_MONTHS,
  SUBSCRIPTION_RECURRENCE,
  computeDiscountedAmount,
  parseCurrencyForApi,
} from '../utils/subscriptionHelpers';
import { formatAmountBRL, formatCurrencyBRL } from '../utils/currencyFormat';

const RECURRENCE_OPTIONS = [
  SUBSCRIPTION_RECURRENCE.MONTHLY,
  SUBSCRIPTION_RECURRENCE.QUARTERLY,
  SUBSCRIPTION_RECURRENCE.SEMIANNUAL,
  SUBSCRIPTION_RECURRENCE.ANNUAL,
];

const DISCOUNT_MODES = Object.freeze({
  NONE: 'none',
  PERCENT: 'percent',
  AMOUNT: 'amount',
});

const buildInitialState = (plan) => {
  if (!plan) {
    return {
      name: '',
      recurrence: SUBSCRIPTION_RECURRENCE.MONTHLY,
      price: '',
      discountMode: DISCOUNT_MODES.NONE,
      discountValue: '',
    };
  }

  let discountMode = DISCOUNT_MODES.NONE;
  let discountValue = '';
  if (plan.discountPercent && Number(plan.discountPercent) > 0) {
    discountMode = DISCOUNT_MODES.PERCENT;
    discountValue = String(plan.discountPercent);
  } else if (plan.discountAmount && Number(plan.discountAmount) > 0) {
    discountMode = DISCOUNT_MODES.AMOUNT;
    discountValue = formatAmountBRL(plan.discountAmount);
  }

  return {
    name: plan.name || '',
    recurrence: plan.recurrence || SUBSCRIPTION_RECURRENCE.MONTHLY,
    price: formatAmountBRL(plan.price),
    discountMode,
    discountValue,
  };
};

const PlanFormSheet = ({ open, plan, onClose, onSubmit }) => {
  const [form, setForm] = useState(() => buildInitialState(plan));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(buildInitialState(plan));
      setError(null);
      setSubmitting(false);
    }
  }, [open, plan]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const parsedPrice = parseCurrencyForApi(form.price);
  const parsedDiscount = form.discountMode === DISCOUNT_MODES.NONE
    ? null
    : parseCurrencyForApi(form.discountValue) ?? Number(form.discountValue);

  const previewAmount = computeDiscountedAmount(parsedPrice, {
    discountPercent: form.discountMode === DISCOUNT_MODES.PERCENT ? parsedDiscount : null,
    discountAmount: form.discountMode === DISCOUNT_MODES.AMOUNT ? parsedDiscount : null,
  });

  const months = RECURRENCE_MONTHS[form.recurrence] || 1;
  const everyMonthsText = months === 1 ? 'a cada mês' : `a cada ${months} meses`;
  const hasDiscount = form.discountMode !== DISCOUNT_MODES.NONE && previewAmount !== null && parsedPrice !== null && previewAmount < parsedPrice;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError('Informe o nome do plano.');
      return;
    }
    if (parsedPrice === null || parsedPrice <= 0) {
      setError('Informe um valor por cobrança válido.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      recurrence: form.recurrence,
      price: parsedPrice,
    };

    if (form.discountMode === DISCOUNT_MODES.PERCENT) {
      if (parsedDiscount === null || parsedDiscount <= 0 || parsedDiscount > 100) {
        setError('O desconto percentual deve estar entre 1 e 100.');
        return;
      }
      payload.discountPercent = parsedDiscount;
    } else if (form.discountMode === DISCOUNT_MODES.AMOUNT) {
      if (parsedDiscount === null || parsedDiscount <= 0) {
        setError('Informe um valor de desconto válido.');
        return;
      }
      payload.discountAmount = parsedDiscount;
    }

    try {
      setSubmitting(true);
      await onSubmit(payload);
    } catch (err) {
      setError(err.userMessage || 'Não foi possível salvar o plano. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  // Preview amount display — strip "R$ " for the hero number
  const previewStr = previewAmount !== null ? formatCurrencyBRL(previewAmount).replace(/^R\$\s*/, '').trim() : '—';
  const baseStr = parsedPrice !== null ? formatCurrencyBRL(parsedPrice).replace(/^R\$\s*/, '').trim() : '—';

  return (
    <div className="overlay" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-header">
          <h2 className="bottom-sheet-title">
            {plan ? 'Editar plano' : 'Novo plano'}
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
          {/* Stadium preview card */}
          <div className="fin-preview-card">
            <div className="fin-preview-eyebrow">Pré-visualização</div>
            <div className="fin-preview-amount">
              <small>R$</small>
              {hasDiscount ? previewStr : baseStr}
            </div>
            <div className="fin-preview-meta">
              {form.name.trim() || 'Nome do plano'} · {everyMonthsText}
            </div>
            {hasDiscount && (
              <div className="fin-preview-discount-line">
                <span>Valor sem desconto: {formatCurrencyBRL(parsedPrice)}</span>
                <strong>
                  -{form.discountMode === DISCOUNT_MODES.PERCENT
                    ? `${parsedDiscount}%`
                    : formatCurrencyBRL(parsedDiscount)}
                </strong>
              </div>
            )}
          </div>

          <form className="form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="plan-name">Nome</label>
              <input
                id="plan-name"
                type="text"
                className="form-input"
                value={form.name}
                maxLength={100}
                onChange={(e) => setField('name', e.target.value)}
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
                    className={`segmented-toggle-btn${form.recurrence === option ? ' segmented-toggle-btn--active' : ''}`}
                    onClick={() => setField('recurrence', option)}
                    disabled={submitting}
                  >
                    {RECURRENCE_LABEL[option]}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="plan-price">Valor por cobrança (R$)</label>
              <input
                id="plan-price"
                type="text"
                inputMode="decimal"
                className="form-input"
                value={form.price}
                placeholder="0,00"
                onChange={(e) => setField('price', e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <span className="form-label">Desconto padrão</span>
              <div className="segmented-toggle" role="group" aria-label="Tipo de desconto">
                <button
                  type="button"
                  className={`segmented-toggle-btn${form.discountMode === DISCOUNT_MODES.NONE ? ' segmented-toggle-btn--active' : ''}`}
                  onClick={() => { setField('discountMode', DISCOUNT_MODES.NONE); setField('discountValue', ''); }}
                  disabled={submitting}
                >
                  Nenhum
                </button>
                <button
                  type="button"
                  className={`segmented-toggle-btn${form.discountMode === DISCOUNT_MODES.PERCENT ? ' segmented-toggle-btn--active' : ''}`}
                  onClick={() => setField('discountMode', DISCOUNT_MODES.PERCENT)}
                  disabled={submitting}
                >
                  Percentual
                </button>
                <button
                  type="button"
                  className={`segmented-toggle-btn${form.discountMode === DISCOUNT_MODES.AMOUNT ? ' segmented-toggle-btn--active' : ''}`}
                  onClick={() => setField('discountMode', DISCOUNT_MODES.AMOUNT)}
                  disabled={submitting}
                >
                  Valor fixo
                </button>
              </div>
            </div>

            {form.discountMode !== DISCOUNT_MODES.NONE && (
              <div className="form-group">
                <label className="form-label" htmlFor="plan-discount">
                  {form.discountMode === DISCOUNT_MODES.PERCENT ? 'Desconto (%)' : 'Desconto (R$)'}
                </label>
                <input
                  id="plan-discount"
                  type="text"
                  inputMode="decimal"
                  className="form-input"
                  value={form.discountValue}
                  placeholder={form.discountMode === DISCOUNT_MODES.PERCENT ? '0' : '0,00'}
                  onChange={(e) => setField('discountValue', e.target.value)}
                  disabled={submitting}
                />
              </div>
            )}

            {error && <p className="form-error" role="alert">{error}</p>}

            <div className="btn-group btn-group--equal">
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Salvando…' : (plan ? 'Salvar' : 'Criar plano')}
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
          </form>
        </div>
      </div>
    </div>
  );
};

PlanFormSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  plan: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default PlanFormSheet;
