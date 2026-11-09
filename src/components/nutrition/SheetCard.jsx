import PropTypes from 'prop-types';
import { SEX_LABEL } from '../../constants/nutrition';
import { formatDateOnly, formatFlexible } from '../../utils/nutritionFormat';

// Pt-BR facts of the sheet, skipping the unknown ones.
const sheetFacts = (sheet) => [
  sheet.sex && SEX_LABEL[sheet.sex],
  sheet.age != null && `${sheet.age} anos`,
  sheet.weightKg != null && `${formatFlexible(sheet.weightKg)} kg`,
  sheet.heightCm != null && `${formatFlexible(sheet.heightCm)} cm`,
  sheet.bodyFatPct != null && `${formatFlexible(sheet.bodyFatPct)}% de gordura`,
].filter(Boolean);

// "dd/mm" of the assessment date.
const assessmentDay = (assessedAt) => formatDateOnly(assessedAt).slice(0, 5);

// "DADOS DA FICHA": chips with the patient sheet, the assessment date and the "Editar ficha" action.
const SheetCard = ({ sheet, complete, onEdit }) => (
  <section className="sheet-card" aria-label="Dados da ficha">
    <p className="prescription-eyebrow">Dados da ficha</p>
    <div className="sheet-card__facts">
      {sheetFacts(sheet).map((fact) => <span key={fact} className="sheet-card__fact">{fact}</span>)}
    </div>
    <p className="sheet-card__date">
      {sheet.assessedAt && `Da avaliação de ${assessmentDay(sheet.assessedAt)}. `}
      <button type="button" className="prescription-link-button" onClick={onEdit}>Editar ficha</button>
    </p>
    {!complete && (
      <p className="sheet-card__warning">Complete sexo, peso e altura na ficha para calcular o gasto energético.</p>
    )}
  </section>
);

SheetCard.propTypes = {
  sheet: PropTypes.object.isRequired,
  complete: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
};

export default SheetCard;
