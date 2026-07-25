import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, LogOut, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { translateError } from '../i18n';
import api from '../api/axios';

const SUPPORT_EMAIL = 'suporte@teufit.com.br';
const SUCCESS_REDIRECT_MS = 900;
const MAX_CODE_ALNUM = 12;
const CROCKFORD_MAP = { O: '0', I: '1', L: '1' };
const ACCOUNT_MISMATCH = 'invite.emailMismatch';
const ALREADY_ACCEPTED = 'invite.alreadyAccepted';

// Normalizes toward TF-XXXX-XXXX-XX: uppercase, Crockford (O→0, I/L→1),
// strip anything outside [0-9A-Z], then insert hyphens at fixed group boundaries.
const normalizeInviteCode = (raw) => {
  const cleaned = raw
    .toUpperCase()
    .replace(/[OIL]/g, (char) => CROCKFORD_MAP[char])
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, MAX_CODE_ALNUM);

  return [
    cleaned.slice(0, 2),
    cleaned.slice(2, 6),
    cleaned.slice(6, 10),
    cleaned.slice(10, 12),
  ].filter(Boolean).join('-');
};

const InviteRedeem = () => {
  const { user, isAuthenticated, updateTokens, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const prefilledCode = normalizeInviteCode(searchParams.get('code') || '');
  const [code, setCode] = useState(prefilledCode);
  const [fieldError, setFieldError] = useState('');
  const [serverError, setServerError] = useState('');
  const [errorCode, setErrorCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  // Brief success confirmation before routing into the app.
  useEffect(() => {
    if (!succeeded) return undefined;
    const timer = setTimeout(() => navigate('/', { replace: true }), SUCCESS_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [succeeded, navigate]);

  if (!isAuthenticated) {
    const rawCodeFromQuery = searchParams.get('code');
    if (rawCodeFromQuery) {
      return <Navigate to={`/signup?code=${encodeURIComponent(rawCodeFromQuery)}`} replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // A user who already has access never sits on /invite — but let the success
  // micro-state render even after refreshUser() flips betaAccess to true.
  if (user?.betaAccess === true && !succeeded) {
    return <Navigate to="/" replace />;
  }

  const handleCodeChange = (value) => {
    setCode(normalizeInviteCode(value));
    setFieldError('');
    setServerError('');
    setErrorCode(null);
  };

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleGoHome = async () => {
    await refreshUser();
    navigate('/', { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!code.trim()) {
      setFieldError('Informe o código do convite.');
      return;
    }

    setFieldError('');
    setServerError('');
    setErrorCode(null);
    setLoading(true);

    try {
      const response = await api.post('/invite/redeem', { code });
      const newAccessToken = response.data.token?.accessToken || response.data.accessToken;
      const newRefreshToken = response.data.refreshToken;

      updateTokens(newAccessToken, newRefreshToken);
      await refreshUser();
      setSucceeded(true);
    } catch (error) {
      setErrorCode(error.errorInfo?.messageCode || null);
      setServerError(error.userMessage || translateError(error));
      setLoading(false);
    }
  };

  const avatarInitial = (user?.firstName || user?.email || '?').charAt(0).toUpperCase();
  const isFormMode = errorCode !== ALREADY_ACCEPTED && errorCode !== ACCOUNT_MISMATCH;
  const hasPrefill = prefilledCode.length > 0;
  const showPrefill = hasPrefill && code === prefilledCode && !serverError && !loading && isFormMode;

  let title = 'O TeuFit está em beta fechado';
  let subtitle = 'O acesso é só por convite no momento. Se você recebeu um código, insira abaixo para liberar sua conta de treinador.';
  if (loading) {
    title = 'Verificando seu convite…';
    subtitle = 'Só um instante enquanto liberamos seu acesso.';
  } else if (errorCode === ALREADY_ACCEPTED) {
    title = 'Este convite já foi utilizado';
    subtitle = '';
  } else if (errorCode === ACCOUNT_MISMATCH) {
    title = 'Este convite é de outro e-mail';
    subtitle = '';
  } else if (showPrefill) {
    title = 'Seu convite está pronto';
    subtitle = 'Confirmamos o código do seu link. Confira a conta abaixo e desbloqueie para começar.';
  }

  let submitLabel = 'Desbloquear acesso';
  if (loading) {
    submitLabel = 'Verificando…';
  } else if (serverError) {
    submitLabel = 'Tentar novamente';
  }

  const accountChip = (withSwitch) => (
    <div className="invite-account">
      <span className="invite-account__avatar" aria-hidden="true">{avatarInitial}</span>
      <div className="invite-account__meta">
        <div className="invite-account__label">Conectado como</div>
        <div className="invite-account__email">{user?.email}</div>
      </div>
      {withSwitch && (
        <button
          type="button"
          className="invite-account__switch"
          onClick={handleSignOut}
          disabled={loading}
        >
          <LogOut size={15} strokeWidth={2} aria-hidden="true" />
          Sair
        </button>
      )}
    </div>
  );

  if (succeeded) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <img src="/img/teufit-lockup.png" alt="TeuFit" className="auth-logo" />
          <div className="invite-success__check" aria-hidden="true">
            <Check size={32} strokeWidth={2} />
          </div>
          <h1 className="invite-title">Acesso liberado!</h1>
          <p className="auth-subtitle" role="status">Estamos entrando na sua conta…</p>
          <button type="button" className="btn-primary-full" disabled>
            <Loader2 size={16} strokeWidth={2} className="invite-spin" aria-hidden="true" />
            Abrindo seu painel…
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/img/teufit-lockup.png" alt="TeuFit" className="auth-logo" />

        <span className="invite-beta">
          <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
          Beta fechado
        </span>

        <h1 className="invite-title">{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}

        {serverError && <p className="auth-error is-shake" role="alert">{serverError}</p>}

        {errorCode === ALREADY_ACCEPTED && (
          <>
            {accountChip(false)}
            <button type="button" className="btn-primary-full" onClick={handleGoHome}>
              Ir para o início
            </button>
            <p className="invite-help">
              Ainda não deveria estar bloqueado?{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`}>Falar com o suporte</a>
            </p>
          </>
        )}

        {errorCode === ACCOUNT_MISMATCH && (
          <>
            {accountChip(true)}
            <button type="button" className="btn-primary-full" onClick={handleSignOut}>
              Entrar com outra conta
            </button>
            <p className="invite-help">O convite é vinculado ao e-mail para onde foi enviado.</p>
          </>
        )}

        {isFormMode && (
          <>
            {accountChip(true)}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="inviteCode" className="form-label">Código do convite</label>
                <input
                  id="inviteCode"
                  type="text"
                  value={code}
                  onChange={(event) => handleCodeChange(event.target.value)}
                  className={`form-input invite-code${fieldError || serverError ? ' form-input--error' : ''}${showPrefill ? ' invite-code--valid' : ''}`}
                  placeholder="TF-XXXX-XXXX-XX"
                  maxLength={15}
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  disabled={loading}
                />
                {fieldError && <span className="form-error" role="alert">{fieldError}</span>}
                {!fieldError && showPrefill && (
                  <span className="invite-prefill">
                    <Check size={14} strokeWidth={2} aria-hidden="true" />
                    Código preenchido pelo seu convite
                  </span>
                )}
                {!fieldError && !showPrefill && (
                  <span className="invite-hint">
                    Formato: TF-XXXX-XXXX-XX · não diferencia maiúsculas de minúsculas
                  </span>
                )}
              </div>

              <button type="submit" className="btn-primary-full" disabled={loading}>
                {loading && <Loader2 size={16} strokeWidth={2} className="invite-spin" aria-hidden="true" />}
                {submitLabel}
              </button>
            </form>

            {showPrefill ? (
              <p className="invite-help">
                Não é a sua conta? Use <strong>Sair</strong> acima — o convite é vinculado a um e-mail específico.
              </p>
            ) : (
              <p className="invite-help">
                Não tem um convite? Fale com quem te indicou ou escreva para{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InviteRedeem;
