import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import RowMenu from '../RowMenu';
import { countLabel, formatDecimal, formatFlexible, formatInteger } from '../../utils/nutritionFormat';
import { itemsSummary, shortName } from '../../utils/nutritionSummary';
import FoodSearchPanel from './FoodSearchPanel';
import SwapEditor from './SwapEditor';

// Total number of substitutes of the items.
const countSwaps = (items) => items.reduce((sum, item) => sum + item.substitutes.length, 0);

// Pill of an item: "N TROCAS" (filled while open) or the dashed "+ TROCA".
const SwapPill = ({ item, open, onToggle }) => {
  const count = item.substitutes.length;
  const empty = count === 0;
  return (
    <button
      type="button"
      className={`nutri-pill${empty ? ' nutri-pill--empty' : ''}${open ? ' nutri-pill--open' : ''}`}
      aria-expanded={open}
      onClick={() => onToggle(item.id)}
    >
      {empty ? '+ Troca' : countLabel(count, 'troca', 'trocas')}
    </button>
  );
};

SwapPill.propTypes = {
  item: PropTypes.object.isRequired,
  open: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

// One row of the items table: food, quantity, kcal, protein, swap pill and the row menu.
const ItemRow = ({ item, open, onToggleSwaps, onEditInMenu, onRemoveItem }) => (
  <tr className={open ? 'nutri-items__row nutri-items__row--open' : 'nutri-items__row'}>
    <td className="nutri-items__food">
      <span className="nutri-items__name" title={item.name}>{item.name}</span>
      {item.householdMeasure && <span className="nutri-items__measure">{item.householdMeasure}</span>}
    </td>
    <td data-label="Qtd">{`${formatFlexible(item.quantity)} ${item.unit}`}</td>
    <td data-label="Kcal">{formatInteger(item.nutrients.kcal)}</td>
    <td data-label="PTN">{`${formatDecimal(item.nutrients.protein)} g`}</td>
    <td className="nutri-items__swaps"><SwapPill item={item} open={open} onToggle={onToggleSwaps} /></td>
    <td className="nutri-items__menu">
      <RowMenu
        ariaLabel={`Ações de ${shortName(item.name)}`}
        extraItems={[{ label: 'Editar no cardápio', onClick: onEditInMenu }]}
        onDelete={() => onRemoveItem(item)}
        deleteLabel="Remover alimento"
      />
    </td>
  </tr>
);

ItemRow.propTypes = {
  item: PropTypes.object.isRequired,
  open: PropTypes.bool.isRequired,
  onToggleSwaps: PropTypes.func.isRequired,
  onEditInMenu: PropTypes.func.isRequired,
  onRemoveItem: PropTypes.func.isRequired,
};

// Footer of an expanded meal: add a food (search) with its hint.
const AddFoodFooter = ({ option, onAddItem }) => {
  const [searching, setSearching] = useState(false);

  const handlePick = async (food) => {
    if (await onAddItem(option, food)) setSearching(false);
  };

  return (
    <div className="nutri-meal__footer">
      {searching ? (
        <FoodSearchPanel onPick={handlePick} onClose={() => setSearching(false)} />
      ) : (
        <>
          <button type="button" className="nutri-link-btn" onClick={() => setSearching(true)}>+ Adicionar alimento</button>
          <p className="nutri-meal__hint">Busca na tabela TACO ou nos teus alimentos salvos</p>
        </>
      )}
    </div>
  );
};

AddFoodFooter.propTypes = { option: PropTypes.object.isRequired, onAddItem: PropTypes.func.isRequired };

// Items table of an expanded meal, with the swap editor opened under its row.
const ItemsTable = ({ items, handlers, onEditInMenu }) => {
  const [openItemId, setOpenItemId] = useState(null);
  const toggleSwaps = (itemId) => setOpenItemId((current) => (current === itemId ? null : itemId));
  return (
    <table className="nutri-items">
      <thead>
        <tr>
          <th>Alimento</th><th>Qtd</th><th>Kcal</th><th>PTN</th><th>Trocas</th>
          <th><span className="visually-hidden">Ações</span></th>
        </tr>
      </thead>
      <tbody>
        {items.flatMap((item) => {
          const open = openItemId === item.id;
          const rows = [<ItemRow key={item.id} item={item} open={open} onToggleSwaps={toggleSwaps} onEditInMenu={onEditInMenu} onRemoveItem={handlers.onRemoveItem} />];
          if (open) {
            rows.push(
              <tr key={`${item.id}-swaps`} className="nutri-items__editor">
                <td colSpan={6}><SwapEditor item={item} onChangeBasis={handlers.onChangeBasis} onRemove={handlers.onRemove} onAdd={handlers.onAdd} /></td>
              </tr>,
            );
          }
          return rows;
        })}
      </tbody>
    </table>
  );
};

ItemsTable.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  handlers: PropTypes.object.isRequired,
  onEditInMenu: PropTypes.func.isRequired,
};

// Second line of the meal header: item names collapsed, item count and protein expanded.
const describeMeal = (option, expanded) => (expanded
  ? `${countLabel(option.items.length, 'item', 'itens')} · total de ${formatInteger(option.totals.protein)} g de proteína`
  : itemsSummary(option.items));

// One meal of the plan summary: accordion card with the items table, swaps and add food.
const SummaryMeal = ({ meal, patientId, handlers }) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const panelId = useId();
  const option = meal.options[0];

  return (
    <li className={`nutri-meal${expanded ? ' nutri-meal--open' : ''}`}>
      <button type="button" className="nutri-meal__toggle" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded((prev) => !prev)}>
        <span className="nutri-meal__time">{meal.time}</span>
        <span className="nutri-meal__text">
          <span className="nutri-meal__name">{meal.name}</span>
          <span className="nutri-meal__summary">{describeMeal(option, expanded)}</span>
        </span>
        {!expanded && (
          <span className="nutri-meal__counts">{`${countLabel(option.items.length, 'item', 'itens')} · ${countLabel(countSwaps(option.items), 'troca', 'trocas')}`}</span>
        )}
        <span className="nutri-meal__kcal">{`${formatInteger(option.totals.kcal)} kcal`}</span>
        <ChevronDown size={20} strokeWidth={2} aria-hidden="true" className="nutri-meal__chevron" />
      </button>
      {expanded && (
        <div id={panelId} className="nutri-meal__body">
          <ItemsTable items={option.items} handlers={handlers} onEditInMenu={() => navigate(`/nutritionist/patients/${patientId}/plan/menu`)} />
          <AddFoodFooter option={option} onAddItem={handlers.onAddItem} />
        </div>
      )}
    </li>
  );
};

SummaryMeal.propTypes = {
  meal: PropTypes.object.isRequired,
  patientId: PropTypes.string.isRequired,
  handlers: PropTypes.shape({
    onChangeBasis: PropTypes.func,
    onRemove: PropTypes.func,
    onAdd: PropTypes.func,
    onAddItem: PropTypes.func,
    onRemoveItem: PropTypes.func,
  }).isRequired,
};

export default SummaryMeal;
