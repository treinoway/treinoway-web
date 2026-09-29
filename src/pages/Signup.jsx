import { useState } from 'react';
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

const GOOGLE_CREDENTIAL_CONFLICT = 'auth/account-exists-with-different-credential';
const MIN_PASSWORD_LENGTH = 8;
const INVITE_EMAIL_HINT = 'Use o e-mail em que você recebeu o convite.';

const getSubmitLabel = (loading, isValidInvite) => {
  if (loading) return 'Criando conta...';
  return isValidInvite ? 'Criar conta e ativar convite' : 'Criar conta';
};

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signup, loginWithGoogle, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const inviteCode = searchParams.get('code') || '';
  // Skip the preview request when we're about to redirect an authenticated user.
  const invite = useInviteAuthFlow(isAuthenticated ? '' : inviteCode);
  const loginLink = inviteCode ? `/login?code=${encodeURIComponent(inviteCode)}` : '/login';

  // Route the freshly-authenticated user straight to their destination so a
  // gated user never bounces through `/` → beta-gate redirect (white flash).
  const resolveDestination = (user) => {
    if (inviteCode) {
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
      errors.password = 'A senha deve ter pelo menos 8 caracteres.';
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
        password: 'A senha deve ter pelo menos 8 caracteres.',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const errors = validateFields();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldErrors({ password: 'A senha deve ter pelo menos 8 caracteres.' });
      return;
    }

    setLoading(true);

    try {
      const result = await signup(invite.lockedEmail ?? email, password);

      if (result.success) {
        navigate(resolveDestination(result.user), { replace: true });
      } else {
        setError(result.error);
        setLoading(false);
      }
    } catch {
      setError('Ocorreu um erro inesperado.');
      setLoading(false);
    }
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
  const showFooter = !invite.isInvalid && !invite.accountExists;

  const header = invite.isInviteFlow ? (
    <InviteContext
      code={invite.code}
      firstStepLabel="Criar conta"
      showSteps={!invite.isInvalid}
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
          {getSubmitLabel(loading, invite.isValid)}
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

  let body = signupForm;
  if (invite.isLoading) {
    body = <InviteFormSkeleton />;
  } else if (invite.isInvalid) {
    body = <InviteStatusCard messageCode={invite.errorCode} />;
  } else if (invite.accountExists) {
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
