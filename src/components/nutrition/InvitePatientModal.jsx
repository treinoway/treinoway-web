import { useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ds/Modal';

const FORM_ID = 'invite-patient-form';

// Modal asking for the e-mail of the patient to invite.
const InvitePatientModal = ({ onClose, onSubmit, submitting }) => {
  const [email, setEmail] = useState('');
  const trimmedEmail = email.trim();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (trimmedEmail) onSubmit(trimmedEmail);
  };

  const footer = (
    <>
      <button type="button" className="btn btn--secondary" onClick={onClose} disabled={submitting}>Cancelar</button>
      <button type="submit" form={FORM_ID} className="btn btn--primary" disabled={submitting || !trimmedEmail}>
        {submitting ? 'Convidando…' : 'Convidar'}
      </button>
    </>
  );

  return (
    <Modal title="Convidar paciente" onClose={onClose} footer={footer} closeDisabled={submitting}>
      <form id={FORM_ID} onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor="invite-patient-email">E-mail do paciente</label>
          <input
            id="invite-patient-email"
            type="email"
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="paciente@email.com"
            autoFocus
            disabled={submitting}
          />
          <span className="field-hint type-caption">
            O paciente recebe o convite por e-mail e no app. O vínculo só acontece depois que ele aceitar, e só então você vê os dados dele.
          </span>
        </div>
      </form>
    </Modal>
  );
};

InvitePatientModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
};

export default InvitePatientModal;
