import PropTypes from 'prop-types';
import { Sparkles, ChevronRight, X } from 'lucide-react';

const BrandingDismissibleBanner = ({ onHowItWorks, onDismiss }) => {
  return (
    <div className="branding-onboarding-banner">
      <div className="branding-onboarding-banner-icon">
        <Sparkles size={20} />
      </div>
      <div className="branding-onboarding-banner-content">
        <p className="branding-onboarding-banner-title">Personalize o app dos seus alunos</p>
        <p className="branding-onboarding-banner-desc">
          Adicione sua logo, cores e mensagem de boas-vindas.
        </p>
        <button onClick={onHowItWorks} className="branding-onboarding-banner-link">
          Como funciona <ChevronRight size={14} />
        </button>
      </div>
      <button onClick={onDismiss} className="branding-onboarding-banner-close" aria-label="Fechar">
        <X size={16} />
      </button>
    </div>
  );
};

BrandingDismissibleBanner.propTypes = {
  onHowItWorks: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

export default BrandingDismissibleBanner;
