import PropTypes from 'prop-types';
import Select from '../components/Select';

const TrainerContextSelect = ({ trainers, trainerId, onChange, disabled = false }) => {
  if (trainers.length === 0) return null;
  return (
    <div className="form-group">
      <label className="form-label" htmlFor="trainer-context-select">Treinador</label>
      <Select
        id="trainer-context-select"
        value={trainerId}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {trainers.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </Select>
    </div>
  );
};

TrainerContextSelect.propTypes = {
  trainers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  })).isRequired,
  trainerId: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default TrainerContextSelect;
