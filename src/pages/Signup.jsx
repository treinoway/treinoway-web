import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useGoogleAuth from '../hooks/useGoogleAuth';
import GoogleIcon from '../components/GoogleIcon';
import AuthEmailField from '../components/AuthEmailField';
import AuthLegalFooter from '../components/AuthLegalFooter';
import PasswordField from '../components/PasswordField';
import { getTranslations, t } from '../i18n';
import { splitFullName } from '../utils/splitFullName';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_IN_USE = 'EMAIL_IN_USE';
const HOME_PATH = '/';
const LOGIN_PATH = '/login';
const NAME_ERROR_ID = 'signup-name-error';

// Returns the inline error of each invalid field, keyed by field name.
const validateSignup = ({ name, email, password }) => {
  const { validation } = getTranslations();
  const errors = {};
  if (!name.trim()) errors.name = t('profile.firstName.required');
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = validation['validation.email.format'];
  if (password.length < MIN_PASSWORD_LENGTH) errors.password = validation['validation.password.minLength'];
  return errors;
};

// Open signup: Google or name + e-mail + password, straight into the app with no code step.
const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [failure, setFailure] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const { signupDirect, loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const goHome = () => navigate(HOME_PATH, { replace: true });
  const showFailure = (message, errorCode = null) => setFailure({ message, errorCode });

  const { startGoogleAuth, isExchanging } = useGoogleAuth({
    loginWithGoogle,
    onSuccess: goHome,
    onError: showFailure,
  });

  if (isAuthenticated) {
    return <Navigate to={HOME_PATH} replace />;
  }

  const clearFieldError = (field) => setFieldErrors((current) => ({ ...current, [field]: undefined }));

  const handleNameChange = (value) => {
    setName(value);
    clearFieldError('name');
  };

  const handleEmailChange = (value) => {
    setEmail(value);
    clearFieldError('email');
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    clearFieldError('password');
  };

  const handlePasswordBlur = () => {
    if (password.length === 0 || password.length >= MIN_PASSWORD_LENGTH) return;
    setFieldErrors((current) => ({ ...current, password: getTranslations().validation['validation.password.minLength'] }));
  };

  const submitSignup = async () => {
    try {
      const result = await signupDirect({ email: email.trim(), password, ...splitFullName(name) });
      if (result.success) {
        goHome();
        return;
      }
      showFailure(result.error, result.errorCode);
    } catch {
      showFailure(t('signupDirect.unexpectedError'));
    }
    submittingRef.current = false;
    setLoading(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setFailure(null);

    const errors = validateSignup({ name, email, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    submittingRef.current = true;
    setLoading(true);
    await submitSignup();
  };

  const handleGoogleSignup = () => {
    setFailure(null);
    startGoogleAuth();
  };

  const isBusy = loading || isExchanging;
  const showLoginShortcut = failure?.errorCode === EMAIL_IN_USE;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/img/teufit-lockup.png" alt="TeuFit" className="auth-logo" />
        <div className="auth-intro">
          <h1 className="auth-intro__title type-h3">{t('signupDirect.title')}</h1>
          <p className="auth-intro__text type-body">{t('signupDirect.subtitle')}</p>
        </div>

        {failure?.message && (
          <p className="auth-error" role="alert">
            {failure.message}
            {showLoginShortcut && (
              <>
                {' '}
                <Link to={LOGIN_PATH} className="text-link">{t('signupDirect.login')}</Link>
              </>
            )}
          </p>
        )}

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={isBusy}
          className="btn btn--secondary btn--block"
        >
          <GoogleIcon />
          {isExchanging ? t('signupDirect.googleBusy') : t('signupDirect.google')}
        </button>

        <div className="auth-divider"><span>{t('signupDirect.divider')}</span></div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="field">
            <label htmlFor="name" className="field-label type-caption-strong">{t('signupDirect.nameLabel')}</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              required
              aria-invalid={fieldErrors.name ? 'true' : undefined}
              aria-describedby={fieldErrors.name ? NAME_ERROR_ID : undefined}
              className={`input${fieldErrors.name ? ' input--error' : ''}`}
              placeholder={t('signupDirect.namePlaceholder')}
              autoComplete="name"
              disabled={isBusy}
            />
            {fieldErrors.name && <span id={NAME_ERROR_ID} className="field-error type-caption" role="alert">{fieldErrors.name}</span>}
          </div>

          <AuthEmailField value={email} onChange={handleEmailChange} disabled={isBusy} error={fieldErrors.email} />

          <PasswordField
            id="password"
            label={t('signupDirect.passwordLabel')}
            value={password}
            onChange={handlePasswordChange}
            onBlur={handlePasswordBlur}
            autoComplete="new-password"
            disabled={isBusy}
            required
            error={fieldErrors.password}
            hint={t('signupDirect.passwordHint')}
          />

          <button type="submit" disabled={isBusy} className="btn btn--primary btn--lg btn--block">
            {loading ? t('signupDirect.loading') : t('signupDirect.submit')}
          </button>
        </form>

        <p className="auth-footer">
          {t('signupDirect.footerPrompt')}{' '}
          <Link to={LOGIN_PATH} className="link">{t('signupDirect.login')}</Link>
        </p>
      </div>

      <AuthLegalFooter />
    </div>
  );
};

export default Signup;
