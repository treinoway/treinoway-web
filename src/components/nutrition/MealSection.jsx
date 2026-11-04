import { useState } from 'react';
import PropTypes from 'prop-types';
import { Trash2 } from 'lucide-react';
import Segmented from '../ds/Segmented';
import RowMenu from '../RowMenu';
import { MAX_OPTIONS_PER_MEAL } from '../../constants/nutrition';
import { countLabel } from '../../utils/nutritionFormat';
import { describeComparison } from '../../utils/planView';
import FoodSearchPanel from './FoodSearchPanel';
import MealItemRow, { NutrientCells } from './MealItemRow';

const MENU_COLUMNS = 8;

// Header of a meal: time, name, "N itens · X% das kcal do dia" and the option/food/menu actions.
const MealHeader = ({ meal, option, dayKcal, position, searching, handlers, onOpenSearch }) => {
  const share = dayKcal > 0 ? Math.round((option.totals.kcal / dayKcal) * 100) : 0;
  const tabs = meal.options.map((candidate) => ({ id: candidate.id, label: `Opção ${candidate.position}` }));
  const menuItems = [
    { label: 'Editar refeição', onClick: () => handlers.onEditMeal(meal) },
    { label: 'Mover para cima', onClick: () => handlers.onMoveMeal(meal, -1), disabled: position.isFirst },
    { label: 'Mover para baixo', onClick: () => handlers.onMoveMeal(meal, 1), disabled: position.isLast },
  ];
  return (
    <tr className="menu-meal__head">
      <td colSpan={MENU_COLUMNS}>
        <div className="menu-meal__head-inner">
          <div className="menu-meal__identity">
            <span className="menu-meal__time">{meal.time}</span>
            <h3 className="menu-meal__name">{meal.name}</h3>
            <span className="menu-meal__count">{`${countLabel(option.items.length, 'item', 'itens')} · ${share}% das kcal do dia`}</span>
          </div>
          <div className="menu-meal__actions">
            {meal.options.length > 1 && (
              <Segmented ariaLabel={`Opções de ${meal.name}`} items={tabs} value={option.id} onChange={(optionId) => handlers.onSelectOption(meal.id, optionId)} />
            )}
            {meal.options.length < MAX_OPTIONS_PER_MEAL && (
              <button type="button" className="menu-action menu-action--dashed" title={`Adicionar uma opção a ${meal.name}`} onClick={() => handlers.onAddOption(meal)}>
                + Substituta
              </button>
            )}
            <button type="button" className="menu-action" onClick={onOpenSearch} disabled={searching}>+ Alimento</button>
            <RowMenu ariaLabel={`Ações de ${meal.name}`} extraItems={menuItems} onDelete={() => handlers.onDeleteMeal(meal)} deleteLabel="Excluir refeição" />
          </div>
        </div>
      </td>
    </tr>
  );
};

MealHeader.propTypes = {
  meal: PropTypes.object.isRequired,
  option: PropTypes.object.isRequired,
  dayKcal: PropTypes.number.isRequired,
  position: PropTypes.shape({ isFirst: PropTypes.bool, isLast: PropTypes.bool }).isRequired,
  searching: PropTypes.bool.isRequired,
  handlers: PropTypes.object.isRequired,
  onOpenSearch: PropTypes.func.isRequired,
};

// Band of an extra option: who chooses, the comparison with option 1 and the removal.
const OptionBand = ({ meal, option, onRemove }) => (
  <tr className="menu-meal__band">
    <td colSpan={MENU_COLUMNS}>
      <div className="menu-meal__band-inner">
        <strong>{`Opção ${option.position} · o paciente escolhe no dia`}</strong>
        <span className="menu-meal__compare">{describeComparison(option, meal.options[0])}</span>
        <button type="button" className="menu-action menu-action--danger" onClick={() => onRemove(option)}>
          <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
          {`Remover opção ${option.position}`}
        </button>
      </div>
    </td>
  </tr>
);

OptionBand.propTypes = {
  meal: PropTypes.object.isRequired,
  option: PropTypes.object.isRequired,
  onRemove: PropTypes.func.isRequired,
};

// Label of the search: where the picked food goes.
const searchHeading = (meal, option) =>
  `Adicionar ao ${meal.name}${meal.options.length > 1 ? ` · opção ${option.position}` : ''}`;

/** One meal of the menu as a table group: header, option band, item rows, inline food search and subtotal. */
const MealSection = ({ meal, option, dayKcal, position = { isFirst: false, isLast: false }, quantityTexts, handlers }) => {
  const [searching, setSearching] = useState(false);
  const subtotalLabel = `Subtotal · ${meal.name}${meal.options.length > 1 ? ` · opção ${option.position}` : ''}`;

  const handlePick = async (food) => {
    if (await handlers.onAddFood(option, food)) setSearching(false);
  };

  return (
    <tbody className="menu-meal" aria-label={meal.name}>
      <MealHeader meal={meal} option={option} dayKcal={dayKcal} position={position} searching={searching} handlers={handlers} onOpenSearch={() => setSearching(true)} />
      {option.position > 1 && <OptionBand meal={meal} option={option} onRemove={handlers.onRemoveOption} />}
      {option.items.length === 0 && (
        <tr className="menu-meal__empty"><td colSpan={MENU_COLUMNS}>Sem alimentos nesta opção.</td></tr>
      )}
      {option.items.map((item) => (
        <MealItemRow key={item.id} item={item} quantityText={quantityTexts[item.id] ?? String(item.quantity)} onQuantityChange={handlers.onQuantityChange} onRemove={handlers.onRemoveItem} />
      ))}
      {searching && (
        <tr className="menu-meal__search">
          <td colSpan={MENU_COLUMNS}>
            <FoodSearchPanel heading={searchHeading(meal, option)} onPick={handlePick} onClose={() => setSearching(false)} />
          </td>
        </tr>
      )}
      <tr className="menu-table__subtotal">
        <th scope="row" colSpan={2}>{subtotalLabel}</th>
        <NutrientCells nutrients={option.totals} />
        <td className="menu-table__remove" />
      </tr>
    </tbody>
  );
};

MealSection.propTypes = {
  meal: PropTypes.object.isRequired,
  option: PropTypes.object.isRequired,
  dayKcal: PropTypes.number.isRequired,
  position: PropTypes.shape({ isFirst: PropTypes.bool, isLast: PropTypes.bool }),
  quantityTexts: PropTypes.object.isRequired,
  handlers: PropTypes.shape({
    onAddFood: PropTypes.func,
    onSelectOption: PropTypes.func,
    onQuantityChange: PropTypes.func,
    onRemoveItem: PropTypes.func,
    onAddOption: PropTypes.func,
    onRemoveOption: PropTypes.func,
    onEditMeal: PropTypes.func,
    onDeleteMeal: PropTypes.func,
    onMoveMeal: PropTypes.func,
  }).isRequired,
};

export default MealSection;
