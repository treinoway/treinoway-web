import PropTypes from 'prop-types';
import ExerciseForm from './ExerciseForm';

const CreateExerciseModal = ({ open, onClose, title, exercise, ...formProps }) => {
  if (!open) return null;

  const modalTitle = title || (exercise?.id ? 'Editar Exercício' : 'Criar Exercício');

  return (
    <div className="overlay">
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-header">
          <h2 className="bottom-sheet-title">{modalTitle}</h2>
          <button
            className="bottom-sheet-close"
            onClick={onClose}
            aria-label="Fechar"
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="bottom-sheet-body">
          <ExerciseForm {...formProps} exercise={exercise} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
};

CreateExerciseModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  trainingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  exercise: PropTypes.object,
  title: PropTypes.string,
  headerContent: PropTypes.node,
};

export default CreateExerciseModal;
