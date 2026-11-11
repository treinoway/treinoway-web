import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import FoodSourceBadge from '../ds/FoodSourceBadge';
import QuantityField from './QuantityField';
import { formatDecimal, formatInteger } from '../../utils/nutritionFormat';

// Cells with the nutrients of one item or total (kcal as integer, the rest with one decimal); data-label feeds the stacked mobile layout.
export const NutrientCells = ({ nutrients }) => (
  <>
    <td className="menu-table__num menu-table__num--kcal" data-label="kcal">{formatInteger(nutrients.kcal)}</td>
    <td className="menu-table__num" data-label="PTN">{formatDecimal(nutrients.protein)}</td>
    <td className="menu-table__num" data-label="CHO">{formatDecimal(nutrients.carbs)}</td>
    <td className="menu-table__num" data-label="LIP">{formatDecimal(nutrients.fat)}</td>
    <td className="menu-table__num" data-label="Fibras">{formatDecimal(nutrients.fiber)}</td>
  </>
);

NutrientCells.propTypes = { nutrients: PropTypes.object.isRequired };

// One item of a meal option: identity with source, editable quantity, recalculated nutrients and remove.
const MealItemRow = ({ item, quantityText, onQuantityChange, onRemove }) => {
  const label = item.name.toLowerCase();
  return (
    <tr className="menu-table__item">
      <td className="menu-table__food">
        <span className="menu-table__food-name">{item.name}</span>
        <span className="menu-table__food-meta">
          {item.householdMeasure && <span>{item.householdMeasure}</span>}
          <FoodSourceBadge source={item.source} />
        </span>
      </td>
      <td className="menu-table__qty">
        <QuantityField item={item} quantityText={quantityText} onQuantityChange={onQuantityChange} />
      </td>
      <NutrientCells nutrients={item.nutrients} />
      <td className="menu-table__remove">
        <button type="button" className="icon-button" aria-label={`Remover ${label}`} title={`Remover ${label}`} onClick={() => onRemove(item)}>
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
};

MealItemRow.propTypes = {
  item: PropTypes.object.isRequired,
  quantityText: PropTypes.string.isRequired,
  onQuantityChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default MealItemRow;
