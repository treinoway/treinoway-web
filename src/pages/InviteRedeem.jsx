import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LogOut, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { t, translateError } from '../i18n';
import api from '../api/axios';
import { normalizeInviteCode } from '../utils/inviteCode';
import useInvitePreview from '../hooks/useInvitePreview';

const SUCCESS_REDIRECT_MS = 900;
const ACCOUNT_MISMATCH = 'invite.emailMismatch';
const ALREADY_ACCEPTED = 'invite.alreadyAccepted';
// why: a fast auto-redeem would flash the loading card; this pads only the gap between a fast response and the next card
const MIN_AUTO_REDEEM_LOADING_MS = 600;

// Resolves after the given milliseconds.
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Title and text telling the visitor that TeuFit no longer needs an invite.
const OpenAccessIntro = () => (
  <div className="auth-intro">
    <h1 className="auth-intro__title type-h3">{t('inviteRedeem.openTitle')}</h1>
    <p className="auth-intro__text type-body">{t('inviteRedeem.openText')}</p>
  </div>
);

// Card for a logged-out visitor who opened /invite without a usable code.
const OpenAccessVisitorCard = () => (
  <div className="auth-page">
    <div className="auth-card">
      <img src="/img/teufit-lockup.png" alt="TeuFit" className="auth-logo" />
      <OpenAccessIntro />
      <Link to="/login" className="btn btn--primary btn--lg btn--block">{t('inviteRedeem.login')}</Link>
      <Link to="/signup" className="btn btn--secondary btn--lg btn--block">{t('inviteRedeem.signup')}</Link>
    </div>
  </div>
);

// Redeems old invite links for a logged-in user; a logged-out visitor without a code is told that no invite is needed.
const InviteRedeem = () => {
  const { user, isAuthenticated, updateTokens, refreshUser, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const prefilledCode = normalizeInviteCode(searchParams.get('code') || '');
  // why: betaAccess is true for every trainer, so existing trainers must still redeem to receive the Beta plan
  const shouldAutoRedeem = isAuthenticated && prefilledCode.length > 0;
  const preview = useInvitePreview(isAuthenticated ? '' : prefilledCode);
  const autoRedeemStartedRef = useRef(false);
  const [code, setCode] = useState(prefilledCode);
  const [fieldError, setFieldError] = useState('');
  const [serverError, setServerError] = useState('');
  const [errorCode, setErrorCode] = useState(null);
  const [redeemFailed, setRedeemFailed] = useState(false);
  const [loading, setLoading] = useState(shouldAutoRedeem);
  const [succeeded, setSucceeded] = useState(false);
  const [autoRedeeming, setAutoRedeeming] = useState(shouldAutoRedeem);

  const redeem = useCallback((codeToRedeem, { minDurationMs = 0 } = {}) => {
    const startedAt = Date.now();

    return api.post('/invite/redeem', { code: codeToRedeem })
      .then(async (response) => {
        const newAccessToken = response.data.token?.accessToken || response.data.accessToken;
        updateTokens(newAccessToken, response.data.refreshToken);

        const refreshedUser = await refreshUser();
        // why: /me can lag behind the redeem, so betaAccess is forced or the success card would bounce back
        updateUser({ ...(refreshedUser || user), betaAccess: true });

        const elapsed = Date.now() - startedAt;
        if (elapsed < minDurationMs) {
          await wait(minDurationMs - elapsed);
        }

        setAutoRedeeming(false);
        setSucceeded(true);
      })
      .catch((error) => {
        setAutoRedeeming(false);
        setRedeemFailed(true);
        setErrorCode(error.errorInfo?.messageCode || null);
        setServerError(error.userMessage || translateError(error));
        setLoading(false);
      });
  }, [updateTokens, refreshUser, updateUser, user]);

  useEffect(() => {
    // why: StrictMode double-invokes effects and the redeem must POST once
    if (!shouldAutoRedeem || autoRedeemStartedRef.current) return;
    autoRedeemStartedRef.current = true;
    redeem(prefilledCode, { minDurationMs: MIN_AUTO_REDEEM_LOADING_MS });
  }, [shouldAutoRedeem, prefilledCode, redeem]);

  useEffect(() => {
    if (!succeeded) return undefined;
    const timer = setTimeout(() => navigate('/', { replace: true }), SUCCESS_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [succeeded, navigate]);

  if (!isAuthenticated) {
    if (!prefilledCode) return <OpenAccessVisitorCard />;
    const encodedCode = encodeURIComponent(searchParams.get('code'));
    if (preview.status === 'idle' || preview.status === 'loading') {
      return (
        <div className="auth-page">
          <div className="auth-card">
            <Loader2 size={24} strokeWidth={2} className="invite-spin invite-spin--standalone" aria-hidden="true" />
            <p className="auth-subtitle" role="status">Verificando seu convite…</p>
          </div>
        </div>
      );
    }
    const accountExists = preview.status === 'valid' && preview.data?.accountExists === true;
    return <Navigate to={`/${accountExists ? 'login' : 'signup'}?code=${encodedCode}`} replace />;
  }

  // why: with no failed redeem there is nothing to show here; an already-accepted invite of a user with access is also sent home silently
  const nothingToShow = !redeemFailed || (user?.betaAccess === true && errorCode === ALREADY_ACCEPTED);
  if (!succeeded && !autoRedeeming && nothingToShow) {
    return <Navigate to="/" replace />;
  }

  if (autoRedeeming) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <img src="/img/teufit-lockup.png" alt="TeuFit" className="auth-logo" />
          <Loader2 size={24} strokeWidth={2} className="invite-spin invite-spin--standalone" aria-hidden="true" />
          <h1 className="invite-title">Ativando seu convite…</h1>
          <p className="auth-subtitle" role="status">Só um instante enquanto liberamos seu acesso.</p>
        </div>
      </div>
    );
  }

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
          <button type="button" className="btn btn--primary btn--lg btn--block" disabled>
            <Loader2 size={16} strokeWidth={2} className="invite-spin" aria-hidden="true" />
            Abrindo seu painel…
          </button>
        </div>
      </div>
    );
  }

  const handleCodeChange = (value) => {
    setCode(normalizeInviteCode(value));
    setFieldError('');
    setServerError('');
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
    await redeem(code);
  };

  const avatarInitial = (user?.firstName || user?.email || '?').charAt(0).toUpperCase();
  const isFormMode = errorCode !== ALREADY_ACCEPTED && errorCode !== ACCOUNT_MISMATCH;

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

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/img/teufit-lockup.png" alt="TeuFit" className="auth-logo" />

        {errorCode === ALREADY_ACCEPTED && <h1 className="invite-title">Este convite já foi utilizado</h1>}
        {errorCode === ACCOUNT_MISMATCH && <h1 className="invite-title">Este convite é de outro e-mail</h1>}
        {isFormMode && <OpenAccessIntro />}

        {serverError && <p className="auth-error is-shake" role="alert">{serverError}</p>}

        {errorCode === ALREADY_ACCEPTED && (
          <>
            {accountChip(false)}
            <button type="button" className="btn btn--primary btn--lg btn--block" onClick={handleGoHome}>
              Ir para o início
            </button>
          </>
        )}

        {errorCode === ACCOUNT_MISMATCH && (
          <>
            {accountChip(true)}
            <button type="button" className="btn btn--primary btn--lg btn--block" onClick={handleSignOut}>
              Entrar com outra conta
            </button>
            <p className="invite-help">O convite é vinculado ao e-mail para onde foi enviado.</p>
          </>
        )}

        {isFormMode && (
          <>
            {accountChip(true)}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="field">
                <label htmlFor="inviteCode" className="field-label type-caption-strong">Código do convite</label>
                <input
                  id="inviteCode"
                  type="text"
                  value={code}
                  onChange={(event) => handleCodeChange(event.target.value)}
                  className={`input invite-code${fieldError || serverError ? ' input--error' : ''}`}
                  placeholder="TF-XXXX-XXXX-XX"
                  maxLength={15}
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  disabled={loading}
                />
                {fieldError && <span className="field-error type-caption" role="alert">{fieldError}</span>}
              </div>

              <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={loading}>
                {loading && <Loader2 size={16} strokeWidth={2} className="invite-spin" aria-hidden="true" />}
                {loading ? 'Verificando…' : 'Tentar novamente'}
              </button>
            </form>

            <button type="button" className="btn btn--secondary btn--lg btn--block" onClick={handleGoHome} disabled={loading}>
              {t('inviteRedeem.goToDashboard')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default InviteRedeem;
