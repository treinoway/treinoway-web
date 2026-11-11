import PropTypes from 'prop-types';

// Whether the typed quantity can be saved (greater than zero).
const isValidQuantity = (text) => Number(text) > 0;

// Number input of an item quantity with its unit and the error shown when it is empty or zero.
const QuantityField = ({ item, quantityText, onQuantityChange }) => {
  const invalid = !isValidQuantity(quantityText);
  const errorId = `quantity-error-${item.id}`;
  return (
    <>
      <div className="quantity-field">
        <input
          type="number"
          min="0"
          step="1"
          className="input"
          aria-label={`Quantidade de ${item.name.toLowerCase()}`}
          value={quantityText}
          onChange={(event) => onQuantityChange(item.id, event.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
        />
        <span className="quantity-field__unit">{item.unit}</span>
      </div>
      {invalid && <span id={errorId} className="form-error">Informe uma quantidade maior que zero.</span>}
    </>
  );
};

QuantityField.propTypes = {
  item: PropTypes.object.isRequired,
  quantityText: PropTypes.string.isRequired,
  onQuantityChange: PropTypes.func.isRequired,
};

export default QuantityField;
