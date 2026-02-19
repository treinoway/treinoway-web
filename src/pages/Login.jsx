import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img
            src="/img/treino_way_transparente.png"
            alt="Treinoway"
            className="auth-logo"
          />
          <h1>Bem-vindo de volta</h1>
          <p>Entre na sua conta Treinoway</p>
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

          <button
            type="submit"
            disabled={loading}
            className="btn-primary-full"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Ainda não tem uma conta?{' '}
            <Link to="/signup" className="link">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
