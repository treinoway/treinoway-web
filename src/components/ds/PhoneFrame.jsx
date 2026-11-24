import PropTypes from 'prop-types';

/** Device frame (`.phone-frame`) around a preview of what the student sees in the app; `label` names it for assistive technology. */
const PhoneFrame = ({ label, children }) => (
  <div className="phone-frame" role="group" aria-label={label}>
    <div className="phone-frame__screen">{children}</div>
  </div>
);

PhoneFrame.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default PhoneFrame;
