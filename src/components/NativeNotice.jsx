import PropTypes from 'prop-types';

// Full-screen notice used by the native app gates (unsupported account, update required).
const NativeNotice = ({ title, body, children }) => (
  <div className="auth-page">
    <div className="auth-card native-notice">
      <img src="/img/teufit-lockup.png" alt="TeuFit" className="auth-logo" />
      <h1 className="type-h2">{title}</h1>
      <p className="type-body">{body}</p>
      {children}
    </div>
  </div>
);

NativeNotice.propTypes = {
  title: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
  children: PropTypes.node,
};

export default NativeNotice;
