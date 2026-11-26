import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import Toggle from './ds/Toggle';
import { useToast } from '../contexts/ToastContext';
import useProfessionActivation from '../hooks/useProfessionActivation';
import { t, translateError } from '../i18n';

// One profession row: visible name and description next to its DS switch.
const ProfessionOption = ({ label, description, checked, onChange, disabled }) => {
  const descriptionId = useId();
  return (
    <label className="profession-choice__option">
      <span className="profession-choice__text">
        <span className="type-body-strong">{label}</span>
        <span id={descriptionId} className="profession-choice__description type-caption">{description}</span>
      </span>
      <Toggle checked={checked} onChange={onChange} label={label} describedBy={descriptionId} disabled={disabled} />
    </label>
  );
};

ProfessionOption.propTypes = {
  label: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

// First-access card for users with no professional role: pick training, nutrition or both.
const ProfessionChoiceCard = () => {
  const titleId = useId();
  const { showToast } = useToast();
  const { activate, activating } = useProfessionActivation();
  const [training, setTraining] = useState(false);
  const [nutrition, setNutrition] = useState(false);

  const handleContinue = async () => {
    try {
      await activate({ training, nutrition });
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  const hasChoice = training || nutrition;

  return (
    <section className="section-card profession-choice" aria-labelledby={titleId}>
      <div className="profession-choice__heading">
        <h2 id={titleId} className="profession-choice__title type-h3">{t('professionChoice.title')}</h2>
        <p className="profession-choice__helper type-body">{t('professionChoice.helper')}</p>
      </div>

      <div className="profession-choice__options">
        <ProfessionOption
          label={t('professionChoice.trainingLabel')}
          description={t('professionChoice.trainingDescription')}
          checked={training}
          onChange={setTraining}
          disabled={activating}
        />
        <ProfessionOption
          label={t('professionChoice.nutritionLabel')}
          description={t('professionChoice.nutritionDescription')}
          checked={nutrition}
          onChange={setNutrition}
          disabled={activating}
        />
      </div>

      <div className="profession-choice__actions">
        <button type="button" className="btn btn--primary" onClick={handleContinue} disabled={!hasChoice || activating}>
          {activating ? t('professionChoice.loading') : t('professionChoice.submit')}
        </button>
      </div>
    </section>
  );
};

export default ProfessionChoiceCard;
