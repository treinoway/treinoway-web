import PropTypes from 'prop-types';
import ExerciseTemplateForm from './ExerciseTemplateForm';

const CreateExerciseTemplateModal = ({ open, onClose, onSuccess, exerciseTemplate }) => {
  if (!open) return null;

  const modalTitle = exerciseTemplate?.id ? 'Editar exercício' : 'Criar exercício';

  return (
    <div className="overlay" onClick={onClose}>
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
          <ExerciseTemplateForm
            exerciseTemplate={exerciseTemplate}
            onSuccess={(result) => {
              onClose();
              onSuccess?.(result);
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
};

CreateExerciseTemplateModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  exerciseTemplate: PropTypes.object,
};

export default CreateExerciseTemplateModal;
