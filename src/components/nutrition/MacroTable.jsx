import PropTypes from 'prop-types';
import { formatDecimal, formatFlexible, formatInteger, parseNumberInput } from '../../utils/nutritionFormat';

// Share and calories of a macro, "-" while the target is unknown.
const macroCell = (macro, format) => (macro ? format(macro) : '-');

// Macro row: coloured dot, label, g/kg (field or "Restante"), grams, kcal and %VET.
const MacroRow = ({ tone, label, macro, perKg, onPerKgChange, remainder = false }) => (
  <tr>
    <th scope="row">
      <span className={`macro-dot macro-dot--${tone}`} aria-hidden="true" />
      <span>{label}</span>
      <span className="macro-table__compact">{macroCell(macro, (value) => `${formatInteger(value.kcal)} kcal · ${formatDecimal(value.pct)}%`)}</span>
    </th>
    <td>
      {remainder ? (
        <span className="macro-table__remainder">
          <span>{perKg == null ? '-' : formatFlexible(perKg)}</span>
          <span className="macro-table__remainder-tag">Restante</span>
        </span>
      ) : (
        <input
          type="number"
          step="0.1"
          min="0"
          className="input macro-table__input"
          aria-label={`${label} (g/kg)`}
          value={perKg ?? ''}
          onChange={(event) => onPerKgChange(parseNumberInput(event.target.value))}
        />
      )}
    </td>
    <td className="macro-table__grams">{macroCell(macro, (value) => formatDecimal(value.grams))}</td>
    <td className="table-col-desktop-only macro-table__wide">{macroCell(macro, (value) => formatInteger(value.kcal))}</td>
    <td className="table-col-desktop-only macro-table__wide">{macroCell(macro, (value) => `${formatDecimal(value.pct)}%`)}</td>
  </tr>
);

MacroRow.propTypes = {
  tone: PropTypes.oneOf(['protein', 'carbs', 'fat']).isRequired,
  label: PropTypes.string.isRequired,
  macro: PropTypes.object,
  perKg: PropTypes.number,
  onPerKgChange: PropTypes.func.isRequired,
  remainder: PropTypes.bool,
};

// Nutrient table: protein, carbs, fat (g/kg editable) and the minimum fiber.
const MacroTable = ({ goals, macros, carbPerKg, onChange }) => (
  <table className="macro-table">
    <thead>
      <tr>
        <th scope="col" className="macro-table__caps">Nutriente</th>
        <th scope="col">g/kg</th>
        <th scope="col">g/dia</th>
        <th scope="col" className="table-col-desktop-only macro-table__wide">kcal</th>
        <th scope="col" className="table-col-desktop-only macro-table__wide macro-table__caps">% VET</th>
      </tr>
    </thead>
    <tbody>
      <MacroRow tone="protein" label="Proteína" macro={macros?.protein} perKg={goals.proteinPerKg} onPerKgChange={(value) => onChange({ proteinPerKg: value })} />
      <MacroRow tone="carbs" label="Carboidrato" macro={macros?.carbs} perKg={carbPerKg} remainder={goals.carbIsRemainder} onPerKgChange={(value) => onChange({ carbPerKg: value })} />
      <MacroRow tone="fat" label="Lipídio" macro={macros?.fat} perKg={goals.fatPerKg} onPerKgChange={(value) => onChange({ fatPerKg: value })} />
      <tr>
        <th scope="row">Fibras <span className="macro-table__hint">mínimo</span></th>
        <td>
          <span className="macro-table__fiber">
            <input
              type="number"
              min="0"
              className="input macro-table__input"
              aria-label="Fibras mínimo (g)"
              value={goals.fiberMinG ?? ''}
              onChange={(event) => onChange({ fiberMinG: parseNumberInput(event.target.value) })}
            />
            <span className="macro-table__unit">g</span>
          </span>
        </td>
        <td />
        <td className="table-col-desktop-only macro-table__wide" />
        <td className="table-col-desktop-only macro-table__wide" />
      </tr>
    </tbody>
  </table>
);

MacroTable.propTypes = {
  goals: PropTypes.object.isRequired,
  macros: PropTypes.object,
  carbPerKg: PropTypes.number,
  onChange: PropTypes.func.isRequired,
};

export default MacroTable;
