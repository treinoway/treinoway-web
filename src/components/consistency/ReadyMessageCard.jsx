import { useState } from 'react';
import PropTypes from 'prop-types';
import { MessageCircle } from 'lucide-react';
import Badge from '../ds/Badge';
import { translateError } from '../../i18n';
import { buildWhatsappUrl } from '../../utils/whatsappLink';
import { PILLAR_LABELS, READY_MESSAGES } from '../../constants/consistencyRanking';

// Message of the weakest pillar with the student's first name in place of {nome}
const messageFor = (pillar, firstName) => READY_MESSAGES[pillar].replaceAll('{nome}', firstName);

// Ready message of the weakest pillar: editable text and the WhatsApp button that logs the contact
const ReadyMessageCard = ({ firstName, pillar, whatsapp, onContact }) => {
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);

  if (!pillar || !READY_MESSAGES[pillar]) return null;
  const text = draft ?? messageFor(pillar, firstName);

  const handleOpenWhatsapp = async () => {
    setError(null);
    window.open(buildWhatsappUrl(whatsapp, text), '_blank', 'noopener,noreferrer');
    try {
      await onContact(pillar);
    } catch (err) {
      setError(err.userMessage || translateError(err));
    }
  };

  return (
    <section className="student-panel__section ready-message" aria-label="Mensagem pronta">
      <div className="ready-message__head">
        <h3 className="type-overline student-panel__section-title">{`Mensagem pronta · pilar mais fraco: ${PILLAR_LABELS[pillar]}`}</h3>
        <Badge tone="success">
          <MessageCircle size={12} strokeWidth={2} aria-hidden="true" />
          WhatsApp
        </Badge>
      </div>
      {editing ? (
        <textarea className="input ready-message__field" aria-label="Mensagem" rows={4} value={text} onChange={(event) => setDraft(event.target.value)} />
      ) : (
        <p className="type-body ready-message__text">{text}</p>
      )}
      {error && <span className="field-error type-caption" role="alert">{error}</span>}
      <div className="ds-actions ready-message__actions">
        <button type="button" className="btn btn--conversion ready-message__send" onClick={handleOpenWhatsapp}>
          <MessageCircle size={16} strokeWidth={2} aria-hidden="true" />
          Abrir no WhatsApp
        </button>
        <button type="button" className="btn btn--neutral" onClick={() => setEditing((current) => !current)}>
          {editing ? 'Concluir edição' : 'Editar'}
        </button>
      </div>
    </section>
  );
};

ReadyMessageCard.propTypes = {
  firstName: PropTypes.string,
  pillar: PropTypes.string,
  whatsapp: PropTypes.string,
  onContact: PropTypes.func.isRequired,
};

export default ReadyMessageCard;
