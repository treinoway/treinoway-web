import PropTypes from 'prop-types';
import { Info } from 'lucide-react';

const InfoBanner = ({ text }) => (
  <div className="info-banner" role="note">
    <Info size={16} className="info-banner-icon" />
    <span>{text}</span>
  </div>
);

InfoBanner.propTypes = {
  text: PropTypes.string.isRequired,
};

export default InfoBanner;
