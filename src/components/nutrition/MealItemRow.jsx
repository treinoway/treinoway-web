import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import FoodSourceBadge from '../ds/FoodSourceBadge';
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

// Whether the typed quantity can be saved (greater than zero).
const isValidQuantity = (text) => Number(text) > 0;

// One item of a meal option: identity with source, editable quantity, recalculated nutrients and remove.
const MealItemRow = ({ item, quantityText, onQuantityChange, onRemove }) => {
  const label = item.name.toLowerCase();
  const quantityInvalid = !isValidQuantity(quantityText);
  const errorId = `quantity-error-${item.id}`;
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
        <div className="quantity-field">
          <input
            type="number"
            min="0"
            step="1"
            className="input"
            aria-label={`Quantidade de ${label}`}
            value={quantityText}
            onChange={(event) => onQuantityChange(item.id, event.target.value)}
            aria-invalid={quantityInvalid || undefined}
            aria-describedby={quantityInvalid ? errorId : undefined}
          />
          <span className="quantity-field__unit">{item.unit}</span>
        </div>
        {quantityInvalid && <span id={errorId} className="form-error">Informe uma quantidade maior que zero.</span>}
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
