import PropTypes from 'prop-types';
import { Sparkles } from 'lucide-react';

// Always impersonal by design — the invite title never names the inviter,
// even when the preview payload includes one.
const TITLE = 'Você foi convidado(a) para o teste fechado';
const FINAL_STEP_LABEL = 'Acesso liberado';

// Closed-beta framing shared by Signup and Login when arriving from an invite link.
const InviteContext = ({ code = '', firstStepLabel, showSteps = true }) => (
  <div className="invite-context">
    <span className="invite-beta">
      <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
      Beta fechado
    </span>

    <h2 className="invite-title">{TITLE}</h2>

    {showSteps && (
      <ol className="invite-steps" aria-label="Etapas do convite">
        <li className="invite-steps__item invite-steps__item--active" aria-current="step">
          <span className="invite-steps__index" aria-hidden="true">1</span>
          {firstStepLabel}
        </li>
        <li className="invite-steps__item">
          <span className="invite-steps__index" aria-hidden="true">2</span>
          {FINAL_STEP_LABEL}
        </li>
      </ol>
    )}

    {code && (
      <p className="invite-code-chip">
        <span className="invite-code-chip__label">Código</span>
        <span className="invite-code-chip__value">{code}</span>
      </p>
    )}
  </div>
);

InviteContext.propTypes = {
  code: PropTypes.string,
  firstStepLabel: PropTypes.string.isRequired,
  showSteps: PropTypes.bool,
};

export default InviteContext;
