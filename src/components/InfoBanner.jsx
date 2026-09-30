import PropTypes from 'prop-types';
import { Info, X } from 'lucide-react';

const InfoBanner = ({ text, onDismiss }) => (
  <div className="info-banner" role="note">
    <Info size={16} strokeWidth={2} className="info-banner-icon" />
    <span className="info-banner-text">{text}</span>
    {onDismiss && (
      <button type="button" className="info-banner-dismiss" onClick={onDismiss} aria-label="Dispensar aviso">
        <X size={16} strokeWidth={2} />
      </button>
    )}
  </div>
);

InfoBanner.propTypes = {
  text: PropTypes.string.isRequired,
  onDismiss: PropTypes.func,
};

export default InfoBanner;
