import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isBetaGateEnabled } from '../hooks/useBetaGate';
import GoogleIcon from '../components/GoogleIcon';

const GOOGLE_CREDENTIAL_CONFLICT = 'auth/account-exists-with-different-credential';
const MIN_PASSWORD_LENGTH = 8;

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signup, loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const inviteCode = searchParams.get('code') || '';
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

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
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
      const result = await signup(email, password);

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
      const result = await loginWithGoogle();

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

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/img/teufit-lockup.png" alt="TeuFit" className="auth-logo" />
        <h1 className="visually-hidden">Criar conta</h1>
        <p className="auth-subtitle">Alunos, treinos e resultados.</p>

        {error && <p className="auth-error">{error}</p>}

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={googleLoading || loading}
          className="btn-google"
        >
          <GoogleIcon />
          {googleLoading ? 'Cadastrando...' : 'Cadastrar com Google'}
        </button>

        <div className="auth-divider"><span>ou</span></div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">E-mail</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
              placeholder="voce@exemplo.com"
              autoComplete="email"
              disabled={loading || googleLoading}
            />
            {inviteCode && (
              <span className="auth-password-hint">
                Use o e-mail em que você recebeu o convite.
              </span>
            )}
          </div>

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
                disabled={loading || googleLoading}
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
            disabled={loading || googleLoading}
            className="btn-primary-full"
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="auth-footer">
          Já tem uma conta?{' '}
          <Link to={loginLink} className="link">Entrar</Link>
        </p>
      </div>

      <footer className="auth-legal">
        <Link to="/privacy-policy" className="auth-legal-link">Política de Privacidade</Link>
      </footer>
    </div>
  );
};

export default Signup;
