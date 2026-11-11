import { useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { formatDecimal, formatFlexible, formatInteger } from '../../utils/nutritionFormat';
import FoodSearchPanel from './FoodSearchPanel';
import SegmentedChoice from './SegmentedChoice';

const BASIS_ITEMS = [
  { id: 'protein', label: 'Proteína' },
  { id: 'kcal', label: 'Calorias' },
];

// Primary (the equalized nutrient) and secondary values of a substitute for the item basis.
const describeValues = (substitute, basis) => {
  const protein = `${formatDecimal(substitute.nutrients.protein)} g PTN`;
  const kcal = `${formatInteger(substitute.nutrients.kcal)} kcal`;
  return basis === 'kcal' ? { primary: `≈ ${kcal}`, secondary: protein } : { primary: `≈ ${protein}`, secondary: kcal };
};

// Equalize-by toggle (PROTEÍNA / CALORIAS).
const BasisToggle = ({ value, onChange }) => (
  <div className="nutri-basis">
    <span className="nutri-eyebrow">Equivaler por</span>
    <SegmentedChoice ariaLabel="Equivaler por" items={BASIS_ITEMS} value={value} onChange={onChange} />
  </div>
);

BasisToggle.propTypes = { value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired };

// One allowed substitute: name, measure, grams, values and remove.
const SubstituteRow = ({ substitute, basis, onRemove }) => {
  const { primary, secondary } = describeValues(substitute, basis);
  return (
    <li className="nutri-swap__row">
      <div className="nutri-swap__name">
        <span className="nutri-swap__title">{substitute.name}</span>
        {substitute.householdMeasure && <span className="nutri-swap__measure">{substitute.householdMeasure}</span>}
      </div>
      <span className="nutri-swap__grams">{`${formatInteger(substitute.quantity)} g`}</span>
      <span className="nutri-swap__values">
        <span className="nutri-swap__primary">{primary}</span>
        {' '}
        <span className="nutri-swap__secondary">{`· ${secondary}`}</span>
      </span>
      <button type="button" className="nutri-icon-btn" aria-label={`Remover troca ${substitute.name}`} title={`Remover troca ${substitute.name}`} onClick={() => onRemove(substitute)}>
        <X size={18} strokeWidth={2} aria-hidden="true" />
      </button>
    </li>
  );
};

SubstituteRow.propTypes = {
  substitute: PropTypes.object.isRequired,
  basis: PropTypes.string.isRequired,
  onRemove: PropTypes.func.isRequired,
};

// Editor of the swaps allowed for one item: basis, substitutes and the food search to add more.
const SwapEditor = ({ item, onChangeBasis, onRemove, onAdd }) => {
  const [searching, setSearching] = useState(false);
  const { nutrients } = item;

  const handlePick = async (food) => {
    const added = await onAdd(item, food);
    if (added) setSearching(false);
  };

  return (
    <section className="nutri-swap" aria-label="Trocas liberadas">
      <div className="nutri-swap__head">
        <div>
          <p className="nutri-eyebrow nutri-eyebrow--brand">Trocas liberadas</p>
          <p className="nutri-swap__original">
            {`Original: ${item.name} · ${formatFlexible(item.quantity)} ${item.unit} · ${formatInteger(nutrients.protein)} g PTN · ${formatInteger(nutrients.kcal)} kcal`}
          </p>
        </div>
        <BasisToggle value={item.swapBasis} onChange={(basis) => onChangeBasis(item, basis)} />
      </div>
      {item.substitutes.length === 0 ? (
        <p className="nutri-swap__empty">Sem trocas liberadas. O paciente vê o item sem o botão de trocar.</p>
      ) : (
        <ul className="nutri-swap__list">
          {item.substitutes.map((substitute) => (
            <SubstituteRow key={substitute.id} substitute={substitute} basis={item.swapBasis} onRemove={onRemove} />
          ))}
        </ul>
      )}
      <div className="nutri-swap__footer">
        {searching ? (
          <FoodSearchPanel onPick={handlePick} onClose={() => setSearching(false)} />
        ) : (
          <button type="button" className="btn btn--secondary nutri-caps" onClick={() => setSearching(true)}>+ Adicionar troca</button>
        )}
        <p className="nutri-swap__helper">O paciente só vê as opções desta lista. A troca vale pro dia em que ele escolher.</p>
      </div>
    </section>
  );
};

SwapEditor.propTypes = {
  item: PropTypes.object.isRequired,
  onChangeBasis: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
};

export default SwapEditor;
