import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const RESEND_COOLDOWN_SECONDS = 60;
const CODE_PATTERN = /^[0-9]{6}$/;
const MIN_PASSWORD_LENGTH = 8;

const ForgotPassword = () => {
  const [step, setStep] = useState('email');
  const [arrivedViaSubmit, setArrivedViaSubmit] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { forgotPassword, resetPassword, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (resendCooldown === 0) return undefined;
    const timer = setTimeout(() => setResendCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const validateResetFields = () => {
    const errors = {};

    if (!CODE_PATTERN.test(code)) {
      errors.code = 'Informe o código de 6 dígitos recebido por e-mail.';
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = 'As senhas não conferem.';
    }

    return errors;
  };

  const handleCodeChange = (value) => {
    setCode(value.replace(/\D/g, '').slice(0, 6));
    setFieldErrors((prev) => ({ ...prev, code: undefined }));
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    setFieldErrors((prev) => ({ ...prev, password: undefined }));
  };

  const handleConfirmPasswordChange = (value) => {
    setConfirmPassword(value);
    setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await forgotPassword(email);

      if (result.success) {
        setArrivedViaSubmit(true);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setStep('reset');
      } else {
        setError(result.error);
      }
    } catch {
      setError('Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleHaveCodeClick = () => {
    setError('');
    setArrivedViaSubmit(false);
    setStep('reset');
  };

  const handleBackToEmailStep = () => {
    setError('');
    setFieldErrors({});
    setArrivedViaSubmit(false);
    setStep('email');
  };

  const handleResend = async () => {
    setError('');
    setResendLoading(true);

    try {
      const result = await forgotPassword(email);

      if (result.success) {
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Ocorreu um erro inesperado.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errors = validateResetFields();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setResetLoading(true);

    try {
      const result = await resetPassword(code, password, confirmPassword);

      if (result.success) {
        navigate('/', { replace: true });
      } else {
        setError(result.error);
        setResetLoading(false);
      }
    } catch {
      setError('Ocorreu um erro inesperado.');
      setResetLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/img/teufit-lockup.png" alt="TeuFit" className="auth-logo" />
        <h1 className="visually-hidden">Redefinir senha</h1>

        {step === 'email' && (
          <>
            <p className="auth-subtitle">Informe seu e-mail para receber um código de redefinição.</p>

            {error && <p className="auth-error" role="alert">{error}</p>}

            <form onSubmit={handleEmailSubmit} className="auth-form">
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
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary-full"
              >
                {loading ? 'Enviando...' : 'Enviar código'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleHaveCodeClick}
              className="auth-forgot-link"
            >
              Já recebeu um código?
            </button>

            <p className="auth-footer">
              Lembrou a senha?{' '}
              <Link to="/login" className="link">Entrar</Link>
            </p>
          </>
        )}

        {step === 'reset' && (
          <>
            {arrivedViaSubmit ? (
              <p className="auth-info">
                Se o e-mail estiver cadastrado, enviamos um código de 6 dígitos. Confira sua caixa de entrada.
              </p>
            ) : (
              <p className="auth-subtitle">Digite o código recebido por e-mail e escolha uma nova senha.</p>
            )}

            {error && <p className="auth-error" role="alert">{error}</p>}

            <form onSubmit={handleResetSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="code" className="form-label">Código</label>
                <input
                  type="text"
                  id="code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  required
                  className={`form-input${fieldErrors.code ? ' form-input--error' : ''}`}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  disabled={resetLoading}
                />
                {fieldErrors.code && (
                  <span className="form-error" role="alert">{fieldErrors.code}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="newPassword" className="form-label">Nova senha</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="newPassword"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    required
                    className={`form-input${fieldErrors.password ? ' form-input--error' : ''}`}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={resetLoading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <span className="form-error" role="alert">{fieldErrors.password}</span>
                )}
                <span className="auth-password-hint">Mínimo 8 caracteres</span>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">Confirmar nova senha</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                    required
                    className={`form-input${fieldErrors.confirmPassword ? ' form-input--error' : ''}`}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={resetLoading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                  >
                    {showConfirmPassword ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <span className="form-error" role="alert">{fieldErrors.confirmPassword}</span>
                )}
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="btn-primary-full"
              >
                {resetLoading ? 'Redefinindo...' : 'Redefinir senha'}
              </button>
            </form>

            {email ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || resendLoading}
                className="auth-forgot-link"
              >
                {resendCooldown > 0 ? `Reenviar código (${resendCooldown}s)` : 'Reenviar código'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBackToEmailStep}
                className="auth-forgot-link"
              >
                Solicitar novo código
              </button>
            )}

            <p className="auth-footer">
              <Link to="/login" className="link">Voltar para o login</Link>
            </p>
          </>
        )}
      </div>

      <footer className="auth-legal">
        <Link to="/privacy-policy" className="auth-legal-link">Política de Privacidade</Link>
      </footer>
    </div>
  );
};

export default ForgotPassword;
