import PropTypes from 'prop-types';
import { ClipboardList } from 'lucide-react';

const AnamnesisMessage = ({ title, text, actionLabel, onAction }) => (
  <div className="empty-state">
    <div className="empty-state-icon empty-state-icon--accent">
      <ClipboardList size={32} strokeWidth={2} />
    </div>
    <p className="empty-state-title">{title}</p>
    <p>{text}</p>
    <button type="button" className="btn-primary" onClick={onAction}>
      {actionLabel}
    </button>
  </div>
);

AnamnesisMessage.propTypes = {
  title: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  actionLabel: PropTypes.string.isRequired,
  onAction: PropTypes.func.isRequired,
};

export default AnamnesisMessage;
