import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { X, Search, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { translateError } from '../i18n';
import { useToast } from '../contexts/ToastContext';
import { recalcMacrosForQuantity, formatMacro } from '../utils/dietMacros';

const DEBOUNCE_MS = 400;

/** Step 1: search for a food */
const SearchStep = ({ onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const search = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/foods', { params: { q, limit: 20 } });
      setResults(res.data.items || []);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timer = setTimeout(() => search(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, search]);

  return (
    <div className="food-search-step">
      <div className="food-search-input-wrap">
        <Search size={16} strokeWidth={2} aria-hidden="true" />
        <input
          type="search"
          className="food-search-input"
          placeholder="Buscar alimento…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar alimento"
          autoFocus
        />
      </div>

      {loading && (
        <div className="food-search-loading">
          <span className="loading-text">Buscando…</span>
        </div>
      )}

      {!loading && query.trim() && results.length === 0 && (
        <div className="food-search-empty">Nenhum alimento encontrado</div>
      )}

      {!loading && results.length > 0 && (
        <ul className="food-search-results" role="listbox" aria-label="Resultados da busca">
          {results.map((food) => (
            <li key={food.id} role="option">
              <button
                type="button"
                className="food-search-result-item"
                onClick={() => onSelect(food)}
                aria-label={`Selecionar ${food.name}`}
              >
                <span className="food-search-result-name">{food.name}</span>
                <span className="food-search-result-meta">
                  {food.kcalPer100g != null ? `${Math.round(food.kcalPer100g)} kcal/100g` : '—'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!query.trim() && (
        <p className="food-search-hint">Digite para buscar alimentos na base de dados.</p>
      )}

      <div className="bottom-sheet-footer">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
};

SearchStep.propTypes = {
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

/** Step 2: choose quantity and confirm */
const QuantityStep = ({ food, onConfirm, onBack, loading: submitting }) => {
  const [quantityG, setQuantityG] = useState('100');

  const parsedQty = parseFloat(quantityG) || 0;
  const macros = recalcMacrosForQuantity(food, parsedQty);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!parsedQty || parsedQty <= 0) return;
    onConfirm({ food, quantityG: parsedQty });
  };

  return (
    <form onSubmit={handleSubmit} className="food-quantity-step">
      <div className="food-quantity-food-name">{food.name}</div>

      <div className="form-group">
        <label className="form-label" htmlFor="food-quantity">
          Quantidade (g)
        </label>
        <input
          id="food-quantity"
          type="number"
          min="0.1"
          step="0.1"
          className="form-input"
          value={quantityG}
          onChange={(e) => setQuantityG(e.target.value)}
          required
          autoFocus
        />
      </div>

      {/* Live macro preview */}
      <div className="food-quantity-macros" aria-live="polite" aria-label="Valores nutricionais calculados">
        <div className="food-macro-chip">
          <span className="food-macro-chip-label">kcal</span>
          <span className="food-macro-chip-value">{formatMacro(macros.kcal)}</span>
        </div>
        <div className="food-macro-chip">
          <span className="food-macro-chip-label">Prot</span>
          <span className="food-macro-chip-value">{formatMacro(macros.proteinG)}g</span>
        </div>
        <div className="food-macro-chip">
          <span className="food-macro-chip-label">Carb</span>
          <span className="food-macro-chip-value">{formatMacro(macros.carbsG)}g</span>
        </div>
        <div className="food-macro-chip">
          <span className="food-macro-chip-label">Gord</span>
          <span className="food-macro-chip-value">{formatMacro(macros.fatG)}g</span>
        </div>
      </div>

      <div className="btn-group" style={{ marginTop: 'var(--spacing-xl)' }}>
        <button
          type="submit"
          className="btn-primary"
          style={{ flex: 1 }}
          disabled={submitting || !parsedQty || parsedQty <= 0}
        >
          {submitting ? 'Adicionando…' : 'Adicionar'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={onBack}
          disabled={submitting}
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Voltar
        </button>
      </div>
    </form>
  );
};

QuantityStep.propTypes = {
  food: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    kcalPer100g: PropTypes.number,
    proteinGPer100g: PropTypes.number,
    carbsGPer100g: PropTypes.number,
    fatGPer100g: PropTypes.number,
  }).isRequired,
  onConfirm: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

/**
 * Two-step food search: search → quantity.
 * Renders as bottom-sheet on mobile, side drawer on desktop.
 */
const FoodSearchDrawer = ({ mealId, onFoodAdded, onClose }) => {
  const [step, setStep] = useState('search'); // 'search' | 'quantity'
  const [selectedFood, setSelectedFood] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSelectFood = (food) => {
    setSelectedFood(food);
    setStep('quantity');
  };

  const handleConfirm = async ({ food, quantityG }) => {
    setSubmitting(true);
    try {
      const res = await api.post(`/nutritionist/meals/${mealId}/food-items`, {
        foodId: food.id,
        quantityG,
      });
      showToast('Alimento adicionado', 'success');
      onFoodAdded(res.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Buscar alimento">
      <div
        className="bottom-sheet food-search-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bottom-sheet-header">
          <h2 className="bottom-sheet-title">
            {step === 'search' ? 'Buscar alimento' : 'Quantidade'}
          </h2>
          <button
            type="button"
            className="bottom-sheet-close"
            aria-label="Fechar busca de alimentos"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="bottom-sheet-body">
          {step === 'search' && (
            <SearchStep
              onSelect={handleSelectFood}
              onClose={onClose}
            />
          )}
          {step === 'quantity' && selectedFood && (
            <QuantityStep
              food={selectedFood}
              onConfirm={handleConfirm}
              onBack={() => setStep('search')}
              loading={submitting}
            />
          )}
        </div>
      </div>
    </div>
  );
};

FoodSearchDrawer.propTypes = {
  mealId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onFoodAdded: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default FoodSearchDrawer;
