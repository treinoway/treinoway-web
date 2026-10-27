import PropTypes from 'prop-types';
import AdvancedTechniquesField from '../advancedTechniques/AdvancedTechniquesField';

/** "Técnicas avançadas" section of the exercise form: ordered techniques inherited when the exercise is added to a routine. */
const ExerciseTechniquesSection = ({ className, value, onChange }) => (
  <section className={className} aria-labelledby="exercise-techniques-heading">
    <h2 id="exercise-techniques-heading" className="editor-page__section-title type-h3">Técnicas avançadas</h2>
    <p className="editor-page__section-hint type-caption">
      Opcional. A ordem da lista é a ordem de execução e vai junto quando o exercício entra em um treino.
    </p>
    <AdvancedTechniquesField value={value} onChange={onChange} />
  </section>
);

ExerciseTechniquesSection.propTypes = {
  className: PropTypes.string.isRequired,
  value: PropTypes.arrayOf(PropTypes.object).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ExerciseTechniquesSection;
