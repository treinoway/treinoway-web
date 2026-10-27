import PropTypes from 'prop-types';
import AdvancedTechniquesField from '../advancedTechniques/AdvancedTechniquesField';

// Composer band with the ordered advanced-techniques field of the exercise.
const TechniquesBand = ({ value, onChange }) => (
  <div className="composer-band">
    <span className="composer-band-label type-h4">Técnicas avançadas</span>
    <AdvancedTechniquesField value={value} onChange={onChange} />
  </div>
);

TechniquesBand.propTypes = {
  value: PropTypes.arrayOf(PropTypes.object).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default TechniquesBand;
