import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Ban, CalendarX, CircleAlert, CircleCheck, SearchX } from 'lucide-react';

const SUPPORT_EMAIL = 'suporte@teufit.com.br';
const LOGIN_PATH = '/login';

const STATUS_COPY = {
  'invite.expired': {
    Icon: CalendarX,
    title: 'Este convite expirou',
    body: 'Peça um novo convite a quem te convidou ou fale com o suporte.',
  },
  'invite.revoked': {
    Icon: Ban,
    title: 'Este convite não é mais válido',
    body: 'Ele pode ter sido substituído por um convite mais recente. Confira o último e-mail que você recebeu.',
  },
  'invite.alreadyAccepted': {
    Icon: CircleCheck,
    title: 'Este convite já foi utilizado',
    body: 'Se foi você quem ativou, é só entrar na sua conta.',
    showLogin: true,
  },
  'invite.notFound': {
    Icon: SearchX,
    title: 'Convite não encontrado',
    body: 'Confira se o link está completo ou se o código foi copiado corretamente.',
  },
};

const DEFAULT_COPY = {
  Icon: CircleAlert,
  title: 'Não foi possível usar este convite',
  body: 'Fale com quem te convidou ou com o suporte.',
};

// Terminal state for a dead invite: replaces the auth form so no account
// can be created (or signed into) against a code that cannot be redeemed.
const InviteStatusCard = ({ messageCode = null }) => {
  const { Icon, title, body, showLogin } = STATUS_COPY[messageCode] || DEFAULT_COPY;

  return (
    <section className="invite-status" aria-labelledby="invite-status-title" role="status">
      <span className="invite-status__icon" aria-hidden="true">
        <Icon size={24} strokeWidth={2} />
      </span>
      <h2 id="invite-status-title" className="invite-status__title">{title}</h2>
      <p className="invite-status__body">{body}</p>

      {showLogin && (
        <Link to={LOGIN_PATH} className="btn-primary-full invite-cta">Entrar</Link>
      )}

      <Link to={LOGIN_PATH} className="invite-status__link">Tenho outro código</Link>

      <p className="invite-help">
        Precisa de ajuda?{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </section>
  );
};

InviteStatusCard.propTypes = {
  messageCode: PropTypes.string,
};

export default InviteStatusCard;
