import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useGoogleAuth from '../hooks/useGoogleAuth';
import GoogleIcon from '../components/GoogleIcon';
import AuthEmailField from '../components/AuthEmailField';
import AuthLegalFooter from '../components/AuthLegalFooter';
import PasswordField from '../components/PasswordField';

// Login screen; a `?code=` from an old invite link is carried to /invite after sign-in.
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const inviteCode = searchParams.get('code') || '';
  const signupLink = inviteCode ? `/signup?code=${encodeURIComponent(inviteCode)}` : '/signup';

  const resolveDestination = () => (inviteCode ? `/invite?code=${encodeURIComponent(inviteCode)}` : '/');

  const { startGoogleAuth, isExchanging } = useGoogleAuth({
    loginWithGoogle,
    onSuccess: () => navigate(resolveDestination(), { replace: true }),
    onError: setError,
  });

  // why: this guard races the explicit navigate() after login; both must resolve the same destination or the invite code is dropped
  if (isAuthenticated) {
    return <Navigate to={resolveDestination()} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        navigate(resolveDestination(), { replace: true });
      } else {
        setError(result.error);
        setLoading(false);
      }
    } catch {
      setError('Ocorreu um erro inesperado.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setError('');
    startGoogleAuth();
  };

  const isBusy = loading || isExchanging;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/img/teufit-lockup.png" alt="TeuFit" className="auth-logo" />
        <h1 className="visually-hidden">Entrar</h1>
        <p className="auth-subtitle">Bem-vindo de volta.</p>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isBusy}
          className="btn btn--secondary btn--block"
        >
          <GoogleIcon />
          {isExchanging ? 'Conectando...' : 'Continuar com Google'}
        </button>

        <div className="auth-divider"><span>ou</span></div>

        <form onSubmit={handleSubmit} className="auth-form">
          <AuthEmailField value={email} onChange={setEmail} disabled={isBusy} />

          <PasswordField
            id="password"
            label="Senha"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            disabled={isBusy}
            required
          />

          <Link to="/forgot-password" className="auth-forgot-link">Esqueceu a senha?</Link>

          <button
            type="submit"
            disabled={isBusy}
            className="btn btn--primary btn--lg btn--block"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="auth-footer">
          Novo por aqui?{' '}
          <Link to={signupLink} className="link">Criar conta</Link>
        </p>
      </div>

      <AuthLegalFooter />
    </div>
  );
};

export default Login;
