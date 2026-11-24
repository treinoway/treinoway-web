import { useState } from 'react';
import PropTypes from 'prop-types';
import { EyeOff } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import Modal from '../ds/Modal';
import Avatar from '../ds/Avatar';
import FaixaBadge from './FaixaBadge';
import { ordinalOf } from '../../utils/challengeDisplay';
import { formatScore } from '../../utils/consistencyFormat';

const ANONYMOUS_NAME = 'Aluno do time';

const APPEAR_AS = Object.freeze({ NAME: 'name', ANONYMOUS: 'anonymous' });

const OPTIONS = Object.freeze([
  { value: APPEAR_AS.NAME, title: 'Aparecer com meu nome', description: 'Primeiro nome e inicial, sua foto, posição, % e faixa.' },
  { value: APPEAR_AS.ANONYMOUS, title: 'Aparecer como Aluno do time', description: 'Sem nome nem foto. Você continua pontuando e vendo sua posição.' },
]);

// "Este campeonato tem N participantes. É assim que eles vão ver você:"
const introOf = (participantCount) => {
  const people = participantCount ? `Este campeonato tem ${participantCount} participantes. ` : '';
  return `${people}É assim que eles vão ver você:`;
};

// How the others see the student: position, avatar, name (or "Aluno do time"), band and average
const Preview = ({ preview, name }) => (
  <div className="privacy-consent__preview" role="group" aria-label="Prévia">
    <span className="privacy-consent__position type-body-strong">{ordinalOf(preview?.position)}</span>
    <Avatar name={name} size="sm" />
    <span className="privacy-consent__identity">
      <span className="type-body-strong">{name}</span>
      <FaixaBadge faixa={preview?.faixa} variant="tag" />
    </span>
    <span className="privacy-consent__score type-body-lg-strong">{formatScore(preview?.average)}</span>
  </div>
);

Preview.propTypes = {
  preview: PropTypes.shape({ position: PropTypes.number, faixa: PropTypes.string, average: PropTypes.number }),
  name: PropTypes.string.isRequired,
};

// The two choices as radio cards, none checked until the student picks one
const Choices = ({ value, disabled, onChange }) => (
  <fieldset className="visibility-field">
    <legend className="visually-hidden">Como você aparece no ranking</legend>
    <div className="visibility-field__options">
      {OPTIONS.map((option) => (
        <label key={option.value} className={`visibility-option${value === option.value ? ' visibility-option--selected' : ''}`}>
          <input type="radio" className="visibility-option__input" name="privacy-appear-as" value={option.value} checked={value === option.value} disabled={disabled} onChange={() => onChange(option.value)} />
          <span className="visibility-option__radio" aria-hidden="true" />
          <span className="visibility-option__text">
            <span className="visibility-option__title type-body-strong">{option.title}</span>
            <span className="visibility-option__description type-caption">{option.description}</span>
          </span>
        </label>
      ))}
    </div>
  </fieldset>
);

Choices.propTypes = {
  value: PropTypes.string,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

// Stores the choice with the term version; toasts a failure and keeps the modal open
const useSavePrivacy = (termVersion, onSaved) => {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const save = async (appearAs) => {
    setSaving(true);
    try {
      const response = await api.put('/my/consistency-ranking/privacy', { appearAs, termVersion });
      onSaved(response.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
      setSaving(false);
    }
  };
  return { saving, save };
};

// Privacy consent of the app on the web (APP-67): preview, "com meu nome" or "Aluno do time", none checked, "Confirmar" after the choice
const PrivacyConsentModal = ({ termVersion, studentName, preview = null, participantCount = null, onSaved, onClose }) => {
  const [appearAs, setAppearAs] = useState(null);
  const { saving, save } = useSavePrivacy(termVersion, onSaved);
  const previewName = appearAs === APPEAR_AS.ANONYMOUS ? ANONYMOUS_NAME : studentName;
  const footer = (
    <div className="privacy-consent__footer">
      <button type="button" className="btn btn--primary btn--block" disabled={!appearAs || saving} onClick={() => save(appearAs)}>
        {saving ? 'Carregando...' : 'Confirmar'}
      </button>
      <p className="privacy-consent__hint type-caption">Você muda isso quando quiser no app, em Perfil › Privacidade.</p>
    </div>
  );
  return (
    <Modal title="Como você quer aparecer no ranking do campeonato?" onClose={onClose} closeDisabled={saving} footer={footer}>
      <div className="privacy-consent">
        <p className="privacy-consent__intro type-body">{introOf(participantCount)}</p>
        <Preview preview={preview} name={previewName} />
        <Choices value={appearAs} disabled={saving} onChange={setAppearAs} />
        <p className="privacy-consent__never type-caption">
          <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
          Nunca aparecem: e-mail, telefone, peso, medidas, fotos de evolução e sua % por pilar.
        </p>
      </div>
    </Modal>
  );
};

PrivacyConsentModal.propTypes = {
  termVersion: PropTypes.string.isRequired,
  studentName: PropTypes.string.isRequired,
  preview: PropTypes.shape({ position: PropTypes.number, faixa: PropTypes.string, average: PropTypes.number }),
  participantCount: PropTypes.number,
  onSaved: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default PrivacyConsentModal;
