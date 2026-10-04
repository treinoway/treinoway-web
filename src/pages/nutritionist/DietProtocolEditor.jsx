import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';
import api from '../../api/axios';
import { translateError } from '../../i18n';
import { useToast } from '../../contexts/ToastContext';
import MacroBar from '../../components/MacroBar';
import FoodSearchDrawer from '../../components/FoodSearchDrawer';
import Select from '../../components/Select';
import {
  DIET_PROTOCOL_STATUS,
  DIET_PROTOCOL_STATUS_LABEL,
  DIET_PROTOCOL_STATUS_BADGE_CLASS,
  MEAL_TYPE_OPTIONS,
  MEAL_TYPE_LABEL,
} from '../../constants/diet';
import { aggregateMealsMacros, formatMacro, calculateGoalDelta, getDeltaSeverity } from '../../utils/dietMacros';

/* ─── GoalDeltaIndicator ─────────────────────────────────────────────────── */

const GoalDeltaIndicator = ({ actualKcal, targetKcal, onAwareChange, aware }) => {
  if (!targetKcal) {
    return (
      <span className="goal-delta goal-delta--neutral" aria-label="Meta calórica não definida">
        Modelo: {Math.round(actualKcal)} kcal
      </span>
    );
  }

  const delta = calculateGoalDelta(actualKcal, targetKcal);
  if (delta === null) return null;

  const severity = getDeltaSeverity(delta);
  const pct = Math.abs(Math.round(delta));
  const isAbove = delta > 0;

  const messages = {
    ok: 'Alinhado à meta',
    warn: isAbove ? `Acima da meta (+${pct}%)` : `Abaixo da meta (-${pct}%)`,
    danger: isAbove ? `Muito acima. Confirme.` : `Muito abaixo. Confirme.`,
  };

  return (
    <div className={`goal-delta goal-delta--${severity}`}>
      <span>{messages[severity]}</span>
      {severity === 'danger' && (
        <label className="goal-delta-aware">
          <input
            type="checkbox"
            checked={aware}
            onChange={(e) => onAwareChange(e.target.checked)}
          />
          <span>Tenho ciência</span>
        </label>
      )}
    </div>
  );
};

GoalDeltaIndicator.propTypes = {
  actualKcal: PropTypes.number.isRequired,
  targetKcal: PropTypes.number,
  onAwareChange: PropTypes.func.isRequired,
  aware: PropTypes.bool.isRequired,
};

GoalDeltaIndicator.defaultProps = {
  targetKcal: null,
};

/* ─── SummaryCard ────────────────────────────────────────────────────────── */

const SummaryCard = ({ meals, targetKcal, onAwareChange, aware }) => {
  const macros = aggregateMealsMacros(meals);

  return (
    <div className="diet-summary-card">
      <div className="diet-summary-kcal">
        <span className="diet-summary-kcal-value">{Math.round(macros.kcal)}</span>
        <span className="diet-summary-kcal-unit">kcal total</span>
      </div>
      <MacroBar
        proteinG={macros.proteinG}
        carbsG={macros.carbsG}
        fatG={macros.fatG}
      />
      <GoalDeltaIndicator
        actualKcal={macros.kcal}
        targetKcal={targetKcal}
        onAwareChange={onAwareChange}
        aware={aware}
      />
    </div>
  );
};

SummaryCard.propTypes = {
  meals: PropTypes.array.isRequired,
  targetKcal: PropTypes.number,
  onAwareChange: PropTypes.func.isRequired,
  aware: PropTypes.bool.isRequired,
};

SummaryCard.defaultProps = {
  targetKcal: null,
};

/* ─── FoodItemRow ────────────────────────────────────────────────────────── */

const FoodItemRow = ({ item, onDelete }) => (
  <div className="food-item-row">
    <div className="food-item-row-name">{item.foodName || item.food?.name || '—'}</div>
    <div className="food-item-row-meta">
      <span>{item.quantityG}g</span>
      <span className="food-item-row-sep">·</span>
      <span>{formatMacro(item.kcal)} kcal</span>
      <span className="food-item-row-sep">·</span>
      <span>P: {formatMacro(item.proteinG)}g</span>
      <span className="food-item-row-sep">·</span>
      <span>C: {formatMacro(item.carbsG)}g</span>
      <span className="food-item-row-sep">·</span>
      <span>G: {formatMacro(item.fatG)}g</span>
    </div>
    <button
      type="button"
      className="food-item-row-delete"
      aria-label={`Remover ${item.foodName || item.food?.name}`}
      onClick={() => onDelete(item)}
    >
      <Trash2 size={14} strokeWidth={2} />
    </button>
  </div>
);

FoodItemRow.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    foodName: PropTypes.string,
    food: PropTypes.shape({ name: PropTypes.string }),
    quantityG: PropTypes.number,
    kcal: PropTypes.number,
    proteinG: PropTypes.number,
    carbsG: PropTypes.number,
    fatG: PropTypes.number,
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
};

/* ─── MealCard ───────────────────────────────────────────────────────────── */

const MealCard = ({ meal, onDeleteMeal, onFoodAdded, onDeleteFood }) => {
  const [expanded, setExpanded] = useState(true);
  const [showFoodSearch, setShowFoodSearch] = useState(false);

  const mealKcal = (meal.foodItems || []).reduce((s, i) => s + (i.kcal ?? 0), 0);
  const typeLabel = MEAL_TYPE_LABEL[meal.mealType] || meal.mealType || meal.name;

  return (
    <div className="meal-card">
      <div className="meal-card-header">
        <div className="meal-card-header-left">
          <button
            type="button"
            className="meal-card-toggle"
            aria-expanded={expanded}
            aria-label={expanded ? 'Recolher refeição' : 'Expandir refeição'}
            onClick={() => setExpanded((o) => !o)}
          >
            {expanded ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
          </button>
          <span className="meal-card-type">{typeLabel}</span>
          {meal.scheduledTime && (
            <span className="meal-card-time">{meal.scheduledTime}</span>
          )}
        </div>
        <div className="meal-card-header-right">
          <span className="meal-card-kcal">{Math.round(mealKcal)} kcal</span>
          <button
            type="button"
            className="meal-card-delete"
            aria-label={`Excluir refeição ${typeLabel}`}
            onClick={() => onDeleteMeal(meal)}
          >
            <Trash2 size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="meal-card-body">
          {(meal.foodItems || []).map((item) => (
            <FoodItemRow
              key={item.id}
              item={item}
              onDelete={onDeleteFood}
            />
          ))}
          {(meal.foodItems || []).length === 0 && (
            <p className="meal-card-empty">Nenhum alimento adicionado</p>
          )}
          <button
            type="button"
            className="btn-add-food"
            onClick={() => setShowFoodSearch(true)}
          >
            + Adicionar alimento
          </button>
        </div>
      )}

      {showFoodSearch && (
        <FoodSearchDrawer
          mealId={meal.id}
          onFoodAdded={(item) => {
            onFoodAdded(meal.id, item);
            setShowFoodSearch(false);
          }}
          onClose={() => setShowFoodSearch(false)}
        />
      )}
    </div>
  );
};

MealCard.propTypes = {
  meal: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    mealType: PropTypes.string,
    name: PropTypes.string,
    scheduledTime: PropTypes.string,
    foodItems: PropTypes.array,
  }).isRequired,
  onDeleteMeal: PropTypes.func.isRequired,
  onFoodAdded: PropTypes.func.isRequired,
  onDeleteFood: PropTypes.func.isRequired,
};

/* ─── AddMealSheet ───────────────────────────────────────────────────────── */

const AddMealSheet = ({ protocolId, onClose, onCreated }) => {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    mealType: '',
    scheduledTime: '',
    notes: '',
  });

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        mealType: form.mealType,
        name: MEAL_TYPE_LABEL[form.mealType] || form.mealType,
        ...(form.scheduledTime && { scheduledTime: form.scheduledTime }),
        ...(form.notes && { notes: form.notes }),
      };
      const res = await api.post(
        `/nutritionist/diet-protocols/${protocolId}/meals`,
        payload,
      );
      onCreated({ ...res.data, foodItems: [] });
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-meal-title"
      >
        <div className="bottom-sheet-header">
          <h2 id="add-meal-title" className="bottom-sheet-title">Criar refeição</h2>
          <button type="button" className="bottom-sheet-close" aria-label="Fechar" onClick={onClose}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="bottom-sheet-body">
          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label className="form-label" htmlFor="meal-type">Tipo de refeição</label>
              <Select
                id="meal-type"
                value={form.mealType}
                onChange={(e) => setForm((p) => ({ ...p, mealType: e.target.value }))}
                required
                disabled={saving}
              >
                <option value="">Selecione…</option>
                {MEAL_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="meal-time">Horário</label>
              <input
                id="meal-time"
                type="time"
                className="form-input"
                value={form.scheduledTime}
                onChange={(e) => setForm((p) => ({ ...p, scheduledTime: e.target.value }))}
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="meal-notes">Observações</label>
              <textarea
                id="meal-notes"
                className="form-textarea"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                disabled={saving}
              />
            </div>

            <div className="btn-group" style={{ marginTop: 'var(--spacing-xl)' }}>
              <button
                type="submit"
                className="btn-primary"
                style={{ flex: 1 }}
                disabled={saving || !form.mealType}
              >
                {saving ? 'Criando…' : 'Criar refeição'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={onClose}
                disabled={saving}
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

AddMealSheet.propTypes = {
  protocolId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onClose: PropTypes.func.isRequired,
  onCreated: PropTypes.func.isRequired,
};

/* ─── DietProtocolEditor ─────────────────────────────────────────────────── */

const DietProtocolEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [protocol, setProtocol] = useState(null);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [awarenessChecked, setAwarenessChecked] = useState(false);

  const fetchProtocol = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/nutritionist/diet-protocols/${id}`);
      setProtocol(res.data);
      setMeals(res.data.meals || []);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
      navigate('/nutritionist/diet-protocols');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showToast]);

  useEffect(() => {
    fetchProtocol();
  }, [fetchProtocol]);

  const hasMinimumContent = meals.some((m) => (m.foodItems || []).length > 0);

  const canPublish = () => {
    if (!hasMinimumContent) return false;
    const macros = aggregateMealsMacros(meals);
    const delta = calculateGoalDelta(macros.kcal, protocol?.dailyCaloricTarget);
    if (delta !== null && getDeltaSeverity(delta) === 'danger') {
      return awarenessChecked;
    }
    return true;
  };

  const handlePublish = async () => {
    if (!canPublish()) {
      if (!hasMinimumContent) {
        showToast('Adicione ao menos uma refeição com um alimento antes de publicar.', 'error');
        return;
      }
    }

    const doPublish = async () => {
      setPublishing(true);
      try {
        const res = await api.patch(`/nutritionist/diet-protocols/${id}`, {
          status: DIET_PROTOCOL_STATUS.ACTIVE,
        });
        setProtocol(res.data);
        showToast('Protocolo publicado', 'success');
      } catch (error) {
        showToast(error.userMessage || translateError(error), 'error');
      } finally {
        setPublishing(false);
      }
    };

    setConfirmDialog({
      message: 'Publicar protocolo? O paciente poderá visualizar a dieta imediatamente.',
      onConfirm: async () => {
        setConfirmDialog(null);
        await doPublish();
      },
    });
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    try {
      const res = await api.patch(`/nutritionist/diet-protocols/${id}`, {
        status: DIET_PROTOCOL_STATUS.DRAFT,
      });
      setProtocol(res.data);
      showToast('Protocolo movido para rascunho', 'success');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleMealCreated = (meal) => {
    setMeals((prev) => [...prev, meal]);
    setShowAddMeal(false);
    showToast('Refeição criada', 'success');
  };

  const handleDeleteMeal = (meal) => {
    setConfirmDialog({
      message: `Excluir a refeição "${MEAL_TYPE_LABEL[meal.mealType] || meal.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/nutritionist/meals/${meal.id}`);
          setMeals((prev) => prev.filter((m) => m.id !== meal.id));
          showToast('Refeição excluída', 'success');
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const handleFoodAdded = (mealId, item) => {
    setMeals((prev) =>
      prev.map((m) =>
        m.id === mealId
          ? { ...m, foodItems: [...(m.foodItems || []), item] }
          : m,
      ),
    );
  };

  const handleDeleteFood = async (item) => {
    try {
      await api.delete(`/nutritionist/food-items/${item.id}`);
      setMeals((prev) =>
        prev.map((m) => ({
          ...m,
          foodItems: (m.foodItems || []).filter((fi) => fi.id !== item.id),
        })),
      );
      showToast('Alimento removido', 'success');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  if (!protocol) return null;

  const isDraft = protocol.status === DIET_PROTOCOL_STATUS.DRAFT;
  const isActive = protocol.status === DIET_PROTOCOL_STATUS.ACTIVE;
  const patientName = [protocol.assignee?.firstName, protocol.assignee?.lastName]
    .filter(Boolean)
    .join(' ') || protocol.assignee?.email || 'Paciente';

  const statusBadgeClass = DIET_PROTOCOL_STATUS_BADGE_CLASS[protocol.status] || 'badge badge-gray';
  const statusLabel = DIET_PROTOCOL_STATUS_LABEL[protocol.status] || protocol.status;

  return (
    <div className="diet-editor">
      {/* Editor App Bar */}
      <div className="diet-editor-bar">
        <div className="diet-editor-bar-left">
          <button
            type="button"
            className="btn-icon"
            onClick={() => navigate('/nutritionist/diet-protocols')}
            aria-label="Voltar para protocolos"
          >
            ←
          </button>
          <span className="diet-editor-patient">{patientName}</span>
          <span className={statusBadgeClass} style={{ fontWeight: 700, letterSpacing: '0.05em' }}>
            {statusLabel.toUpperCase()}
          </span>
        </div>
        <div className="diet-editor-bar-right">
          {isDraft && (
            <button
              type="button"
              className="btn-primary"
              onClick={handlePublish}
              disabled={publishing || !canPublish()}
              aria-label="Publicar protocolo"
            >
              {publishing ? 'Publicando…' : 'Publicar'}
            </button>
          )}
          {isActive && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleUnpublish}
              disabled={publishing}
              aria-label="Despublicar protocolo"
            >
              {publishing ? 'Atualizando…' : 'Despublicar'}
            </button>
          )}
        </div>
      </div>

      {/* Sticky Summary */}
      <div className="diet-editor-summary">
        <SummaryCard
          meals={meals}
          targetKcal={protocol.dailyCaloricTarget || protocol.getKcal}
          onAwareChange={setAwarenessChecked}
          aware={awarenessChecked}
        />
      </div>

      {/* Meals List */}
      <div className="diet-editor-meals">
        {meals.length === 0 && (
          <div className="empty-state-inline">
            <p>Nenhuma refeição adicionada</p>
          </div>
        )}

        {meals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            onDeleteMeal={handleDeleteMeal}
            onFoodAdded={handleFoodAdded}
            onDeleteFood={handleDeleteFood}
          />
        ))}

        {/* Floating add meal CTA */}
        <button
          type="button"
          className="btn-add-meal"
          onClick={() => setShowAddMeal(true)}
          aria-label="Adicionar refeição"
        >
          <Plus size={16} strokeWidth={2} />
          Adicionar refeição
        </button>
      </div>

      {showAddMeal && (
        <AddMealSheet
          protocolId={id}
          onClose={() => setShowAddMeal(false)}
          onCreated={handleMealCreated}
        />
      )}

      {confirmDialog && (
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DietProtocolEditor;
