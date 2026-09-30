import { useState } from 'react';
import PropTypes from 'prop-types';
import { ClipboardList } from 'lucide-react';
import { getStudentFirstName, getStudentFullName, getStudentInitials } from '../../utils/studentName';

const AVATAR_COLOR_COUNT = 6;

const getAvatarColorIndex = (name) =>
  [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_COLOR_COUNT;

const PresenceGate = ({ student, onStart, onCancel }) => {
  const [attested, setAttested] = useState(false);
  const fullName = getStudentFullName(student);
  const firstName = getStudentFirstName(student);

  return (
    <div className="anamnesis-fill-gate">
      <div className="page-header-title-row">
        <ClipboardList size={24} strokeWidth={2} className="page-header-title-icon" />
        <h1 className="page-title">Preencher com o aluno</h1>
      </div>
      <section className="card anamnesis-fill-gate-card">
        <div className="anamnesis-fill-gate-student">
          <span
            className={`avatar-initials avatar-color-${getAvatarColorIndex(fullName)} anamnesis-fill-avatar`}
            aria-hidden="true"
          >
            {getStudentInitials(student)}
          </span>
          <p className="card-title">{fullName}</p>
        </div>
        <p>
          Você vai registrar as respostas de {firstName} nesta anamnese. Depois de salvar,{' '}
          {firstName} precisa confirmar as respostas pelo app.
        </p>
        <label className="answer-option">
          <input
            type="checkbox"
            className="answer-option-input"
            checked={attested}
            onChange={(event) => setAttested(event.target.checked)}
          />
          <span>O aluno está presente e autorizou que eu registre estas respostas</span>
        </label>
        <div className="btn-group btn-group--equal">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={onStart} disabled={!attested}>
            Começar
          </button>
        </div>
      </section>
    </div>
  );
};

PresenceGate.propTypes = {
  student: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
  }).isRequired,
  onStart: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default PresenceGate;
