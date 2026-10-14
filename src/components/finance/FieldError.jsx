import PropTypes from 'prop-types';

/** Inline field error (`.field-error`, announced with role="alert"); renders nothing without a message. */
const FieldError = ({ message }) => (message ? <span className="field-error type-caption" role="alert">{message}</span> : null);

FieldError.propTypes = { message: PropTypes.string };

export default FieldError;
