import PropTypes from 'prop-types';
import { formatInteger, previewTitle } from '../../utils/nutritionFormat';
import { shortName } from '../../utils/nutritionSummary';

const MACRO_CHIPS = [
  { key: 'protein', label: 'Proteína' },
  { key: 'carbs', label: 'Carbo' },
  { key: 'fat', label: 'Gordura' },
];

// "4 col. de sopa · 100 g" (just "100 g" without a household measure).
const describeQuantity = (item) => [item.householdMeasure, `${formatInteger(item.quantity)} ${item.unit}`].filter(Boolean).join(' · ');

// One item of the phone mock; items with swaps show the TROCAR chip.
const PhoneItem = ({ item }) => (
  <li className="nutri-phone__item">
    <div className="nutri-phone__item-text">
      <span className="nutri-phone__item-name">{shortName(item.name)}</span>
      <span className="nutri-phone__item-meta">{describeQuantity(item)}</span>
    </div>
    {item.substitutes.length > 0 && <span className="nutri-phone__chip">Trocar</span>}
  </li>
);

PhoneItem.propTypes = { item: PropTypes.object.isRequired };

// Phone mock with the next meal exactly as the app shows it.
const PhoneMock = ({ meal, option }) => (
  <div className="nutri-phone" aria-hidden="true">
    <div className="nutri-phone__hero">
      <div className="nutri-phone__row">
        <span className="nutri-phone__badge"><span className="nutri-phone__dot" />Próxima</span>
        <span className="nutri-phone__time">{meal.time}</span>
      </div>
      <p className="nutri-phone__meal">{meal.name}</p>
      <div className="nutri-phone__macros">
        {MACRO_CHIPS.map((chip) => (
          <div key={chip.key} className="nutri-phone__macro">
            <span className="nutri-phone__macro-value">{`${formatInteger(option.totals[chip.key])}g`}</span>
            <span className="nutri-phone__macro-label">{chip.label}</span>
          </div>
        ))}
      </div>
    </div>
    <p className="nutri-phone__section">No prato</p>
    <ul className="nutri-phone__items">
      {option.items.map((item) => <PhoneItem key={item.id} item={item} />)}
    </ul>
    <span className="nutri-phone__done">Marcar como feita</span>
  </div>
);

PhoneMock.propTypes = { meal: PropTypes.object.isRequired, option: PropTypes.object.isRequired };

// What the patient sees in the app for the next meal of the plan.
const AppPreview = ({ firstName, meal }) => {
  const option = meal?.options[0];
  const title = previewTitle(firstName);
  return (
    <section className="nutri-card app-preview" aria-label={title}>
      <h2 className="nutri-card__title">{title}</h2>
      {option ? (
        <>
          <p className="nutri-card__subtitle">{`Prévia do ${meal.name.toLowerCase()} no app`}</p>
          <PhoneMock meal={meal} option={option} />
          <p className="nutri-card__note">Atualiza no app quando o plano for publicado.</p>
        </>
      ) : (
        <p className="nutri-card__subtitle">Adicione uma refeição para ver a prévia.</p>
      )}
    </section>
  );
};

AppPreview.propTypes = {
  firstName: PropTypes.string,
  meal: PropTypes.object,
};

export default AppPreview;
