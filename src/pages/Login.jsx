import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isBetaGateEnabled } from '../hooks/useBetaGate';
import GoogleIcon from '../components/GoogleIcon';

const GOOGLE_CREDENTIAL_CONFLICT = 'auth/account-exists-with-different-credential';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const inviteCode = searchParams.get('code') || '';
  const signupLink = inviteCode ? `/signup?code=${encodeURIComponent(inviteCode)}` : '/signup';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);

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

  const handleGoogleLogin = async () => {
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
        <h1 className="visually-hidden">Entrar</h1>
        <p className="auth-subtitle">Bem-vindo de volta.</p>

        {error && <p className="auth-error">{error}</p>}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="btn-google"
        >
          <GoogleIcon />
          {googleLoading ? 'Conectando...' : 'Continuar com Google'}
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
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Senha</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
                placeholder="••••••••"
                autoComplete="current-password"
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
          </div>

          <Link to="/forgot-password" className="auth-forgot-link">Esqueceu a senha?</Link>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="btn-primary-full"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="auth-footer">
          Novo por aqui?{' '}
          <Link to={signupLink} className="link">Criar conta</Link>
        </p>
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

export default Login;
