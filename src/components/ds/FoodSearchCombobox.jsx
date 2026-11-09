import { useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Search } from 'lucide-react';
import FoodSourceBadge from './FoodSourceBadge';
import Segmented from './Segmented';
import { formatDecimal, formatInteger } from '../../utils/nutritionFormat';

const ALL_GROUPS = 'all';
const VIEW_PORTION = 'portion';
const VIEW_100G = '100g';
const PER_100G_GRAMS = 100;
const VIEW_ITEMS = [
  { id: VIEW_PORTION, label: 'Por porção' },
  { id: VIEW_100G, label: 'Por 100 g' },
];

// Basis of the displayed values: the standard portion when asked and available, else 100 g.
const resolveBasis = (food, view) => {
  if (view === VIEW_PORTION && food.portion) {
    return { label: `Por ${food.portion.label} (${food.portion.grams} g)`, grams: food.portion.grams };
  }
  return { label: 'Por 100 g', grams: PER_100G_GRAMS };
};

// One-line macros for the basis: "113 kcal · PTN 2,2 g · CHO 25,3 g · LIP 0,7 g".
const describeNutrients = (per100g, grams) => {
  const factor = grams / PER_100G_GRAMS;
  return [
    `${formatInteger(per100g.kcal * factor)} kcal`,
    `PTN ${formatDecimal(per100g.protein * factor)} g`,
    `CHO ${formatDecimal(per100g.carbs * factor)} g`,
    `LIP ${formatDecimal(per100g.fat * factor)} g`,
  ].join(' · ');
};

// Next active index for an arrow key, wrapping around the list.
const stepIndex = (current, step, length) => {
  if (current < 0) return step > 0 ? 0 : length - 1;
  return (current + step + length) % length;
};

// "1 alimento encontrado" / "N alimentos encontrados" ('' while there is nothing to count).
const resultCountText = (count) => {
  if (count === 0) return '';
  return count === 1 ? '1 alimento encontrado' : `${count} alimentos encontrados`;
};

// Group filter chips ("Todos" plus one per food group).
const GroupChips = ({ groups, value, onChange }) => {
  const rowRef = useRef(null);

  useEffect(() => {
    rowRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [value]);

  return (
  <div ref={rowRef} className="food-combobox__chips" role="group" aria-label="Grupo de alimentos">
    {[{ id: ALL_GROUPS, name: 'Todos' }, ...groups].map((group) => (
      <button
        key={group.id}
        type="button"
        className={`food-combobox__chip${value === group.id ? ' food-combobox__chip--active' : ''}`}
        aria-pressed={value === group.id}
        onClick={() => onChange(group.id === ALL_GROUPS ? null : group.id)}
      >
        {group.name}
      </button>
    ))}
  </div>
  );
};

GroupChips.propTypes = {
  groups: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, name: PropTypes.string })).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

// One food option: name, source and the values for the chosen basis.
const FoodOption = ({ id, food, view, active, onPick }) => {
  const basis = resolveBasis(food, view);
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      className={`food-combobox__option${active ? ' food-combobox__option--active' : ''}`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onPick(food)}
    >
      <span className="food-combobox__title">
        <span className="food-combobox__name type-body-strong" title={food.name}>{food.name}</span>
        <FoodSourceBadge source={food.source} />
      </span>
      <span className="food-combobox__basis type-caption">{basis.label}</span>
      <span className="food-combobox__values type-caption">{describeNutrients(food.per100g, basis.grams)}</span>
    </li>
  );
};

FoodOption.propTypes = {
  id: PropTypes.string.isRequired,
  food: PropTypes.object.isRequired,
  view: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  onPick: PropTypes.func.isRequired,
};

// Results area: loading, empty or the option list.
const FoodResults = ({ listId, baseId, foods, loading, view, activeIndex, onPick, emptyAction }) => {
  if (loading && foods.length === 0) return <p className="food-combobox__state type-body" role="status">Buscando…</p>;
  if (foods.length === 0) {
    return (
      <div className="food-combobox__state">
        <p className="type-body" role="status">
          Nada com esse nome nesse grupo. Tenta outro termo ou cadastra em Meus alimentos.
        </p>
        {emptyAction}
      </div>
    );
  }
  return (
    <ul id={listId} role="listbox" aria-label="Alimentos" className="food-combobox__list">
      {foods.map((food, index) => (
        <FoodOption
          key={food.id}
          id={`${baseId}-opt-${index}`}
          food={food}
          view={view}
          active={index === activeIndex}
          onPick={onPick}
        />
      ))}
    </ul>
  );
};

FoodResults.propTypes = {
  listId: PropTypes.string.isRequired,
  baseId: PropTypes.string.isRequired,
  foods: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  view: PropTypes.string.isRequired,
  activeIndex: PropTypes.number.isRequired,
  onPick: PropTypes.func.isRequired,
  emptyAction: PropTypes.node,
};

/** Inline food search (WAI-ARIA combobox): text, group filter, per-portion/100 g view and keyboard. */
const FoodSearchCombobox = ({
  foods, groups, loading = false, query, onQueryChange, groupId = null, onGroupChange, onPick, onClose, emptyAction, heading,
}) => {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const inputRef = useRef(null);
  const [view, setView] = useState(VIEW_PORTION);
  const [activeIndex, setActiveIndex] = useState(-1);
  const hasList = foods.length > 0;
  const activeId = hasList && activeIndex >= 0 ? `${baseId}-opt-${activeIndex}` : undefined;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeId]);

  const handleChange = (event) => {
    setActiveIndex(-1);
    onQueryChange(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (hasList && activeIndex >= 0) onPick(foods[activeIndex]);
      return;
    }
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (!step || !hasList) return;
    event.preventDefault();
    setActiveIndex((current) => stepIndex(current, step, foods.length));
  };

  return (
    <div className="food-combobox">
      {heading && <p className="food-combobox__heading type-overline">{heading}</p>}
      <div className="food-combobox__bar">
        <div className="input--search-wrap">
          <Search size={16} strokeWidth={2} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            className="input input--search"
            aria-label="Buscar alimento"
            aria-autocomplete="list"
            aria-expanded={hasList}
            aria-controls={listId}
            aria-activedescendant={activeId}
            placeholder="Buscar na TACO, na TBCA ou nos teus alimentos"
            autoComplete="off"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
      </div>
      <GroupChips groups={groups} value={groupId ?? ALL_GROUPS} onChange={onGroupChange} />
      <div className="food-combobox__panel">
        <div className="food-combobox__panel-head">
          <span className="food-combobox__count type-caption-strong">{resultCountText(foods.length)}</span>
          <Segmented ariaLabel="Valores por" items={VIEW_ITEMS} value={view} onChange={setView} />
        </div>
        <FoodResults
          listId={listId}
          baseId={baseId}
          foods={foods}
          loading={loading}
          view={view}
          activeIndex={activeIndex}
          onPick={onPick}
          emptyAction={emptyAction}
        />
        <p className="food-combobox__hint type-caption">↑↓ navega · Enter adiciona com a porção · Esc fecha</p>
      </div>
    </div>
  );
};

FoodSearchCombobox.propTypes = {
  foods: PropTypes.arrayOf(PropTypes.object).isRequired,
  groups: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, name: PropTypes.string })).isRequired,
  loading: PropTypes.bool,
  query: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  groupId: PropTypes.string,
  onGroupChange: PropTypes.func.isRequired,
  onPick: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  emptyAction: PropTypes.node,
  heading: PropTypes.string,
};

export default FoodSearchCombobox;
