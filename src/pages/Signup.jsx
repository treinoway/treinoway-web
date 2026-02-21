import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.001 24.001 0 0 0 0 21.56l7.98-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signup, loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const result = await signup(email, password);

      if (result.success) {
        navigate('/', { replace: true });
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
        navigate('/', { replace: true });
      } else if (result.error) {
        setError(result.error);
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
        <div className="auth-header">
          <img
            src="/img/treino_way_transparente.png"
            alt="Treinoway"
            className="auth-logo"
          />
          <h1>Criar Conta</h1>
          <p>Junte-se ao Treinoway hoje</p>
        </div>

        {error && (
          <div className="alert alert-error alert-compact alert-dismissible mb-md">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="alert-close"
              aria-label="Fechar alerta"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div>
            <label htmlFor="email" className="form-label">
              E-mail
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
              placeholder="voce@exemplo.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="form-label">
              Senha
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="form-label">
              Confirmar Senha
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="form-input"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary-full"
          >
            {loading ? 'Criando conta...' : 'Cadastrar'}
          </button>
        </form>

        <div className="auth-divider">
          <span>ou</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={googleLoading || loading}
          className="btn-google"
        >
          <GoogleIcon />
          {googleLoading ? 'Entrando...' : 'Cadastrar com Google'}
        </button>

        <div className="auth-footer">
          <p>
            Já tem uma conta?{' '}
            <Link to="/login" className="link">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
