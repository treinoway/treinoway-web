import { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, LogOut, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { translateError } from '../i18n';
import api from '../api/axios';
import { normalizeInviteCode } from '../utils/inviteCode';

const SUPPORT_EMAIL = 'suporte@teufit.com.br';
const SUCCESS_REDIRECT_MS = 900;
const ACCOUNT_MISMATCH = 'invite.emailMismatch';
const ALREADY_ACCEPTED = 'invite.alreadyAccepted';
// Auto-redeem is effect-driven and can resolve in well under 200ms against a
// fast/local API. Without a floor, the loading card flashes and reads as a
// glitch rather than a state. This is a minimum *display* time, not an
// artificial request delay — it only pads the gap between a fast response
// and the next card, never adds to a genuinely slow one.
const MIN_AUTO_REDEEM_LOADING_MS = 600;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const InviteRedeem = () => {
  const { user, isAuthenticated, updateTokens, refreshUser, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const prefilledCode = normalizeInviteCode(searchParams.get('code') || '');
  // Arriving from an invite link (usually straight after signup/login) there
  // is nothing left to decide — redeem once, without a second click.
  const shouldAutoRedeem = isAuthenticated && user?.betaAccess !== true && prefilledCode.length > 0;
  const autoRedeemStartedRef = useRef(false);
  const [code, setCode] = useState(prefilledCode);
  const [fieldError, setFieldError] = useState('');
  const [serverError, setServerError] = useState('');
  const [errorCode, setErrorCode] = useState(null);
  const [loading, setLoading] = useState(shouldAutoRedeem);
  const [succeeded, setSucceeded] = useState(false);
  // Tracks specifically "the automatic, effect-driven redeem is in flight" —
  // distinct from `loading`, which also covers a manual submit. Only this
  // state hides the form in favor of the minimal loading card; a manual
  // retry after an auto-redeem failure must still show the form with its
  // normal inline button spinner, never the full-card swap.
  const [autoRedeeming, setAutoRedeeming] = useState(shouldAutoRedeem);

  // Setters only run in promise callbacks (never synchronously), so this is
  // safe to start from an effect. Callers reset form state beforehand; the
  // auto path starts already clean with loading=true.
  //
  // `minDurationMs` is only ever passed by the auto-redeem effect below — a
  // manual submit (handleSubmit) always resolves as fast as the API allows,
  // matching the pre-existing inline-spinner behavior on that path.
  const redeem = useCallback((codeToRedeem, { minDurationMs = 0 } = {}) => {
    const startedAt = Date.now();

    return api.post('/invite/redeem', { code: codeToRedeem })
      .then(async (response) => {
        const newAccessToken = response.data.token?.accessToken || response.data.accessToken;
        updateTokens(newAccessToken, response.data.refreshToken);

        // A 200 from /invite/redeem is itself authoritative proof that
        // betaAccess is now true — refreshUser() exists to sync the rest of
        // the profile (name, roles, etc.), not to re-decide whether the
        // redemption worked. If the backend's read path (this /me call) is
        // even briefly behind its own write (or refreshUser fails outright),
        // trusting its betaAccess verbatim would silently bounce the user
        // from the success screen back to a bare, empty /invite form once
        // the redirect below fires — exactly the bug this guards against.
        const refreshedUser = await refreshUser();
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
        setErrorCode(error.errorInfo?.messageCode || null);
        setServerError(error.userMessage || translateError(error));
        setLoading(false);
      });
  }, [updateTokens, refreshUser, updateUser, user]);

  // Ref guard: StrictMode double-invokes effects; the redeem must POST once.
  useEffect(() => {
    if (!shouldAutoRedeem || autoRedeemStartedRef.current) return;
    autoRedeemStartedRef.current = true;
    redeem(prefilledCode, { minDurationMs: MIN_AUTO_REDEEM_LOADING_MS });
  }, [shouldAutoRedeem, prefilledCode, redeem]);

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

  // A user who already has access never sits on /invite — but let the
  // auto-redeem loading card finish its minimum duration and the success
  // micro-state render, even after updateUser() flips betaAccess to true
  // partway through that sequence (see redeem() above: betaAccess is set
  // true before the minimum-duration wait so the rest of the app is never
  // stale, but that means this guard would otherwise fire mid-sequence and
  // skip straight to "/", defeating the whole point of the loading/success
  // cards).
  if (user?.betaAccess === true && !succeeded && !autoRedeeming) {
    return <Navigate to="/" replace />;
  }

  // Auto-redeem in flight: a minimal card, nothing resembling the
  // manual-entry UI. The form must never render here — there is nothing for
  // the user to do, and briefly showing it (pre-filled code, disabled
  // inputs, "Verificando…") is exactly the flash this guards against. Same
  // .auth-page/.auth-card wrapper shape as the success and form branches
  // below, so React reconciles it as the same element rather than
  // remounting (see the success branch for the full note on why that
  // matters for the entrance animation).
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

  // Success micro-state. Renders through the *same* .auth-page > .auth-card
  // wrapper (same element type, same tree position, no key) as the
  // auto-redeeming and form branches, so React reconciles this in place
  // instead of unmounting/remounting .auth-card — the auth-enter CSS
  // animation on .auth-card therefore plays once, on the initial /invite
  // mount, not again on this transition. Verified by reading React's
  // reconciliation rules (same type + position + no key ⇒ same fiber, DOM
  // node preserved); not visually confirmed in a browser.
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
    await redeem(code);
  };

  const avatarInitial = (user?.firstName || user?.email || '?').charAt(0).toUpperCase();
  const isFormMode = errorCode !== ALREADY_ACCEPTED && errorCode !== ACCOUNT_MISMATCH;
  const hasPrefill = prefilledCode.length > 0;
  const showPrefill = hasPrefill && code === prefilledCode && !serverError && !loading && isFormMode;

  let title = 'O TeuFit está em beta fechado';
  let subtitle = 'O acesso é só por convite no momento. Se você recebeu um código, insira abaixo para liberar sua conta de treinador.';
  if (loading) {
    title = 'Ativando seu convite…';
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
