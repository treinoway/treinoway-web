import { useState } from 'react';
import PropTypes from 'prop-types';
import { Users } from 'lucide-react';

const STORAGE_KEY = 'treinoway.skipNoStudentsWarning';

const saveSkipPreference = (shouldSkip) => {
  try {
    if (shouldSkip) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  } catch {
    // Storage quota exceeded; preference not saved
  }
};

const NoStudentsModal = ({ open, onClose, onConfirm }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!open) return null;

  const handleConfirm = () => {
    saveSkipPreference(dontShowAgain);
    onConfirm();
  };

  const handleClose = () => {
    saveSkipPreference(dontShowAgain);
    onClose();
  };

  return (
    <div className="overlay">
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-header">
          <h2 className="bottom-sheet-title">Nenhum aluno cadastrado</h2>
          <button
            className="bottom-sheet-close"
            onClick={handleClose}
            aria-label="Fechar"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="bottom-sheet-body">
          <div className="no-students-modal-content">
            <div className="no-students-modal-icon">
              <Users size={32} strokeWidth={1.4} />
            </div>
            <p className="body-large">
              Você ainda não tem alunos cadastrados. Deseja adicionar um aluno agora?
            </p>
          </div>

          <label className="no-students-modal-checkbox">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            <span>Não mostrar novamente</span>
          </label>

          <div className="no-students-modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
            >
              Agora não
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
            >
              Adicionar Aluno
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

NoStudentsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default NoStudentsModal;
