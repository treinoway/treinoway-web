import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isBetaGateEnabled } from '../hooks/useBetaGate';
import useInviteAuthFlow from '../hooks/useInviteAuthFlow';
import GoogleIcon from '../components/GoogleIcon';
import AuthEmailField from '../components/AuthEmailField';
import InviteContext from '../components/InviteContext';
import InviteStatusCard from '../components/InviteStatusCard';
import InviteFormSkeleton from '../components/InviteFormSkeleton';
import SignupCodeStep from '../components/SignupCodeStep';
import { t } from '../i18n';

const GOOGLE_CREDENTIAL_CONFLICT = 'auth/account-exists-with-different-credential';
const MIN_PASSWORD_LENGTH = 8;
const INVITE_EMAIL_HINT = 'Use o e-mail em que você recebeu o convite.';
const PASSWORD_TOO_SHORT = 'A senha deve ter pelo menos 8 caracteres.';
const ACCOUNT_EXISTS_CODE = 'trainerInvite.accountExists';
const VALIDATION_FAILED_CODE = 'validation.failed';
// Invite errors from POST /auth/signup/invite that make the code unusable:
// rendered as the same terminal card as a dead preview.
const TERMINAL_INVITE_CODES = new Set([
  'invite.notFound',
  'invite.revoked',
  'invite.expired',
  'invite.alreadyAccepted',
]);

const getSubmitLabel = ({ loading, usesInviteSignup, isValidInvite }) => {
  if (loading) return usesInviteSignup ? t('inviteSignup.submitting') : 'Enviando código...';
  return isValidInvite ? t('inviteSignup.submit') : 'Criar conta';
};

const isPasswordValidationError = (result) => result.messageCode === VALIDATION_FAILED_CODE
  && Array.isArray(result.details)
  && result.details.some((detail) => detail?.field === 'password');

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // The password stays only in memory until the code is verified: the backend
  // does not keep it on the pending signup, so verify must resend it.
  const [pendingEmail, setPendingEmail] = useState(null);
  // messageCode of an invite signup failure that replaces the form
  // (terminal invite error or an account created after the preview).
  const [inviteOutcome, setInviteOutcome] = useState(null);
  // Synchronous guard: the disabled button covers clicks, this covers a
  // second submit dispatched before React re-renders.
  const submittingRef = useRef(false);
  const {
    signup, verifySignup, signupWithInvite, resendSignupCode, loginWithGoogle, isAuthenticated, user,
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const inviteCode = searchParams.get('code') || '';
  // Skip the preview request when we're about to redirect an authenticated user.
  const invite = useInviteAuthFlow(isAuthenticated ? '' : inviteCode);
  const loginLink = inviteCode ? `/login?code=${encodeURIComponent(inviteCode)}` : '/login';
  // A previewed invite for a new email signs up in one step via the invite
  // endpoint; without a usable preview the regular code-verified signup runs.
  const usesInviteSignup = Boolean(invite.lockedEmail) && !invite.accountExists;

  // Route the freshly-authenticated user straight to their destination so a
  // gated user never bounces through `/` → beta-gate redirect (white flash).
  // An invite signup already grants access, so only a still-gated user
  // detours through /invite to redeem.
  const resolveDestination = (user) => {
    if (inviteCode && user?.betaAccess !== true) {
      return `/invite?code=${encodeURIComponent(inviteCode)}`;
    }
    if (isBetaGateEnabled() && user?.betaAccess === false) {
      return '/invite';
    }
    return '/';
  };

  // Route through resolveDestination (not a hardcoded "/") so this guard
  // agrees with the explicit navigate(resolveDestination(...)) call in
  // handleSubmit below. Both can independently be triggered by the same
  // establishSession() state update (isAuthenticated flips as soon as
  // setAccessToken commits, before handleSubmit's own navigate() runs) —
  // whichever one "wins" the render race must land on the same place, or
  // the invite code gets silently dropped and the user is bounced to a
  // bare /invite with no code to auto-redeem.
  if (isAuthenticated) {
    return <Navigate to={resolveDestination(user)} replace />;
  }

  const validateFields = () => {
    const errors = {};

    if (password.length > 0 && password.length < MIN_PASSWORD_LENGTH) {
      errors.password = PASSWORD_TOO_SHORT;
    }

    return errors;
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.password;
      return next;
    });
  };

  const handlePasswordBlur = () => {
    if (password.length > 0 && password.length < MIN_PASSWORD_LENGTH) {
      setFieldErrors((prev) => ({
        ...prev,
        password: PASSWORD_TOO_SHORT,
      }));
    }
  };

  const applyInviteSignupError = (result) => {
    if (result.messageCode === ACCOUNT_EXISTS_CODE || TERMINAL_INVITE_CODES.has(result.messageCode)) {
      setInviteOutcome(result.messageCode);
      return;
    }
    if (isPasswordValidationError(result)) {
      setFieldErrors({ password: result.error });
      return;
    }
    setError(result.error);
  };

  // One step: the invite carries the (verified) email, so no code screen.
  // Loading stays on after success — the page is about to unmount.
  const submitInviteSignup = async () => {
    const result = await signupWithInvite(invite.code, password);
    if (result.success) {
      navigate(resolveDestination(result.user), { replace: true });
      return;
    }
    submittingRef.current = false;
    setLoading(false);
    applyInviteSignupError(result);
  };

  const submitPendingSignup = async () => {
    const signupEmail = invite.lockedEmail ?? email;

    try {
      const result = await signup(signupEmail, password);

      if (result.success) {
        setPendingEmail(signupEmail);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Ocorreu um erro inesperado.');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setError('');
    setFieldErrors({});

    const errors = validateFields();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldErrors({ password: PASSWORD_TOO_SHORT });
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    if (usesInviteSignup) {
      await submitInviteSignup();
      return;
    }
    await submitPendingSignup();
  };

  const handleVerifyCode = async (code) => {
    const result = await verifySignup(pendingEmail, code, password);
    if (result.success) {
      navigate(resolveDestination(result.user), { replace: true });
    }
    return result;
  };

  const handleResendCode = () => resendSignupCode(pendingEmail);

  const handleChangeEmail = () => {
    setError('');
    setPendingEmail(null);
  };

  const handleGoogleSignup = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const result = invite.lockedEmail
        ? await loginWithGoogle({ loginHint: invite.lockedEmail })
        : await loginWithGoogle();

      if (result.success) {
        navigate(resolveDestination(result.user), { replace: true });
      } else if (result.error) {
        const message = String(result.error).includes(GOOGLE_CREDENTIAL_CONFLICT)
          ? 'Esse e-mail já está cadastrado com senha. Entre com e-mail e senha.'
          : result.error;
        setError(message);
        setGoogleLoading(false);
      } else {
        setGoogleLoading(false);
      }
    } catch {
      setError('Ocorreu um erro inesperado.');
      setGoogleLoading(false);
    }
  };

  const isBusy = loading || googleLoading;
  const emailHint = invite.isInviteFlow ? INVITE_EMAIL_HINT : '';
  const accountExists = invite.accountExists || inviteOutcome === ACCOUNT_EXISTS_CODE;
  const terminalInviteCode = TERMINAL_INVITE_CODES.has(inviteOutcome) ? inviteOutcome : null;
  const isInviteDead = invite.isInvalid || Boolean(terminalInviteCode);
  const showFooter = !isInviteDead && !accountExists;

  const header = invite.isInviteFlow ? (
    <InviteContext
      code={invite.code}
      firstStepLabel="Criar conta"
      showSteps={!isInviteDead}
    />
  ) : (
    <p className="auth-subtitle">Alunos, treinos e resultados.</p>
  );

  const signupForm = (
    <>
      {error && <p className="auth-error">{error}</p>}

      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={isBusy}
        className="btn-google"
      >
        <GoogleIcon />
        {googleLoading ? 'Cadastrando...' : 'Cadastrar com Google'}
      </button>

      <div className="auth-divider"><span>ou</span></div>

      <form onSubmit={handleSubmit} className="auth-form">
        <AuthEmailField
          value={email}
          onChange={setEmail}
          disabled={isBusy}
          lockedEmail={invite.lockedEmail}
          hint={emailHint}
        />

        <div className="form-group">
          <label htmlFor="password" className="form-label">Senha</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              onBlur={handlePasswordBlur}
              required
              className={`form-input${fieldErrors.password ? ' form-input--error' : ''}`}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isBusy}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {fieldErrors.password && (
            <span className="form-error">{fieldErrors.password}</span>
          )}
          <span className="auth-password-hint">Mínimo 8 caracteres</span>
        </div>

        <button
          type="submit"
          disabled={isBusy}
          className="btn-primary-full"
        >
          {getSubmitLabel({ loading, usesInviteSignup, isValidInvite: invite.isValid })}
        </button>
      </form>
    </>
  );

  const accountExistsNotice = (
    <>
      <p className="auth-info">
        Você já tem uma conta com <strong>{invite.lockedEmail}</strong>. Entre para ativar seu convite.
      </p>
      <Link to={loginLink} className="btn-primary-full invite-cta">Entrar e ativar convite</Link>
    </>
  );

  const codeStep = pendingEmail && (
    <SignupCodeStep
      email={pendingEmail}
      onVerify={handleVerifyCode}
      onResend={handleResendCode}
      onChangeEmail={handleChangeEmail}
      changeEmailLabel={invite.lockedEmail ? t('signupVerification.backToForm') : t('signupVerification.changeEmail')}
    />
  );

  let body = codeStep || signupForm;
  if (invite.isLoading) {
    body = <InviteFormSkeleton />;
  } else if (isInviteDead) {
    body = <InviteStatusCard messageCode={terminalInviteCode ?? invite.errorCode} />;
  } else if (accountExists) {
    body = accountExistsNotice;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/img/teufit-lockup.png" alt="TeuFit" className="auth-logo" />
        <h1 className="visually-hidden">Criar conta</h1>
        {header}

        {body}

        {showFooter && (
          <p className="auth-footer">
            Já tem uma conta?{' '}
            <Link to={loginLink} className="link">Entrar</Link>
          </p>
        )}
      </div>

      <footer className="auth-legal">
        <Link to="/terms" className="auth-legal-link">Termos e Condições</Link>
        <span className="auth-legal-group">
          <span className="auth-legal-sep" aria-hidden="true">·</span>
          <Link to="/privacy-policy" className="auth-legal-link">Política de Privacidade</Link>
        </span>
      </footer>
    </div>
  );
};

export default Signup;
