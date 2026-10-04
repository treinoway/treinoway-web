import { useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ds/Modal';
import { t } from '../../i18n';

const FORM_ID = 'link-student-form';

const LinkStudentModal = ({ onClose, onSubmit, linking }) => {
  const [email, setEmail] = useState('');
  const trimmedEmail = email.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!trimmedEmail) return;
    onSubmit(trimmedEmail);
  };

  const footer = (
    <>
      <button type="button" className="btn btn--secondary" onClick={onClose} disabled={linking}>
        Cancelar
      </button>
      <button type="submit" form={FORM_ID} className="btn btn--primary" disabled={linking || !trimmedEmail}>
        {linking ? 'Vinculando…' : 'Vincular'}
      </button>
    </>
  );

  return (
    <Modal title="Vincular aluno" onClose={onClose} footer={footer}>
      <form id={FORM_ID} onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor="link-student-email">
            E-mail do aluno
          </label>
          <input
            id="link-student-email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="aluno@email.com"
            required
            autoFocus
            disabled={linking}
          />
          <span className="field-hint type-caption">{t('studentInvites.linkHint')}</span>
        </div>
      </form>
    </Modal>
  );
};

LinkStudentModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  linking: PropTypes.bool.isRequired,
};

export default LinkStudentModal;
