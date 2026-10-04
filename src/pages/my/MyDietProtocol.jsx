import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Salad, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../api/axios';
import { translateError } from '../../i18n';
import { useToast } from '../../contexts/ToastContext';
import MacroBar from '../../components/MacroBar';
import { aggregateMealsMacros, formatMacro } from '../../utils/dietMacros';
import { MEAL_TYPE_LABEL, DIET_PROTOCOL_STATUS } from '../../constants/diet';

/* ─── FoodRow ────────────────────────────────────────────────────────────── */

const FoodRow = ({ item }) => (
  <div className="food-item-row food-item-row--readonly">
    <span className="food-item-row-name">{item.foodName || item.food?.name || '—'}</span>
    <span className="food-item-row-qty">{item.quantityG}g</span>
    <span className="food-item-row-kcal">{formatMacro(item.kcal)} kcal</span>
  </div>
);

FoodRow.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    foodName: PropTypes.string,
    food: PropTypes.shape({ name: PropTypes.string }),
    quantityG: PropTypes.number,
    kcal: PropTypes.number,
  }).isRequired,
};

/* ─── MealSection ────────────────────────────────────────────────────────── */

const MealSection = ({ meal }) => {
  const [expanded, setExpanded] = useState(true);
  const typeLabel = MEAL_TYPE_LABEL[meal.mealType] || meal.name || '—';
  const mealKcal = (meal.foodItems || []).reduce((s, i) => s + (i.kcal ?? 0), 0);

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
        <span className="meal-card-kcal">{Math.round(mealKcal)} kcal</span>
      </div>

      {expanded && (
        <div className="meal-card-body">
          {(meal.foodItems || []).map((item) => (
            <FoodRow key={item.id} item={item} />
          ))}
          {(meal.foodItems || []).length === 0 && (
            <p className="meal-card-empty">Sem alimentos cadastrados</p>
          )}
        </div>
      )}
    </div>
  );
};

MealSection.propTypes = {
  meal: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    mealType: PropTypes.string,
    name: PropTypes.string,
    scheduledTime: PropTypes.string,
    foodItems: PropTypes.array,
  }).isRequired,
};

/* ─── MyDietProtocol ─────────────────────────────────────────────────────── */

const MyDietProtocol = () => {
  const { showToast } = useToast();
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProtocols = async () => {
      setLoading(true);
      try {
        const res = await api.get('/my/diet-protocols');
        setProtocols(res.data || []);
      } catch (error) {
        showToast(error.userMessage || translateError(error), 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchProtocols();
  }, [showToast]);

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  const activeProtocol = protocols.find(
    (p) => p.status === DIET_PROTOCOL_STATUS.ACTIVE,
  );

  if (!activeProtocol) {
    return (
      <div>
        <div className="page-header-title-row">
          <Salad size={24} className="page-header-title-icon" />
          <h1>Minha Dieta</h1>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon empty-state-icon--accent">
            <Salad size={32} strokeWidth={1.2} />
          </div>
          <p className="empty-state-title">Nenhuma dieta prescrita</p>
          <p>Seu nutricionista ainda não prescreveu uma dieta.</p>
        </div>
      </div>
    );
  }

  const meals = activeProtocol.meals || [];
  const macros = aggregateMealsMacros(meals);

  return (
    <div>
      <div className="page-header-title-row">
        <Salad size={24} className="page-header-title-icon" />
        <h1>Minha Dieta</h1>
      </div>

      {/* Summary */}
      <div className="diet-summary-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="diet-summary-kcal">
          <span className="diet-summary-kcal-value">{Math.round(macros.kcal)}</span>
          <span className="diet-summary-kcal-unit">kcal total</span>
        </div>
        <MacroBar
          proteinG={macros.proteinG}
          carbsG={macros.carbsG}
          fatG={macros.fatG}
        />
      </div>

      {/* Meals */}
      <div className="diet-editor-meals">
        {meals.length === 0 ? (
          <div className="empty-state-inline">
            <p>Sua dieta ainda não tem refeições cadastradas.</p>
          </div>
        ) : (
          meals.map((meal) => (
            <MealSection key={meal.id} meal={meal} />
          ))
        )}
      </div>
    </div>
  );
};

export default MyDietProtocol;
