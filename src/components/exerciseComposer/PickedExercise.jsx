import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { getExerciseTypeLabel } from '../../constants/exerciseTypes';

// Summary of the library exercise chosen in the single add, with a "Trocar" action.
const PickedExercise = ({ template, onChange }) => {
  const changeButtonRef = useRef(null);

  useEffect(() => {
    changeButtonRef.current?.focus();
  }, []);

  return (
    <div className="picked-exercise">
      <div className="picked-exercise__info">
        <span className="type-body-strong">{template.name}</span>
        {template.type && <span className="picked-exercise__type type-caption">{getExerciseTypeLabel(template.type)}</span>}
      </div>
      <button ref={changeButtonRef} type="button" className="btn btn--secondary" onClick={onChange}>Trocar</button>
    </div>
  );
};

PickedExercise.propTypes = {
  template: PropTypes.shape({ name: PropTypes.string, type: PropTypes.string }).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default PickedExercise;
