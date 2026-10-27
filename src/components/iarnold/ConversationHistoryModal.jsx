import PropTypes from 'prop-types';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import Modal from '../ds/Modal';
import EmptyBlock from '../ds/EmptyBlock';
import SkeletonRows from '../ds/SkeletonRows';
import { getLocale, t, tf } from '../../i18n';

// Formats a conversation date as dd/mm/yy, or a dash when missing.
const formatConversationDate = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(getLocale(), { day: '2-digit', month: '2-digit', year: '2-digit' });
};

// One conversation: an open button plus a delete icon button.
const ConversationItem = ({ conversation, isActive, isLoading, onSelect, onDelete }) => {
  const title = conversation.title || t('iArnold.history.untitled');
  const preview = conversation.preview || conversation.firstMessage || null;
  return (
    <li className={`ai-history__item${isActive ? ' ai-history__item--active' : ''}`}>
      <button
        type="button"
        className="ai-history__open"
        onClick={() => onSelect(conversation)}
        disabled={isLoading}
        aria-busy={isLoading || undefined}
        aria-current={isActive || undefined}
        aria-label={tf('iArnold.history.open', { title })}
      >
        <span className="ai-history__heading">
          <span className="type-body-strong ai-history__title">{title}</span>
          <span className="type-caption ai-history__date">
            {formatConversationDate(conversation.updatedAt || conversation.createdAt)}
          </span>
        </span>
        {preview && <span className="type-caption ai-history__preview">{preview}</span>}
      </button>
      <button
        type="button"
        className="icon-button"
        onClick={() => onDelete(conversation)}
        aria-label={tf('iArnold.history.remove', { title })}
        title={t('iArnold.history.removeTitle')}
      >
        <Trash2 size={20} strokeWidth={2} aria-hidden="true" />
      </button>
    </li>
  );
};

ConversationItem.propTypes = {
  conversation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string,
    preview: PropTypes.string,
    firstMessage: PropTypes.string,
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

// Date-grouped conversation list.
const ConversationGroups = ({ groups, activeId, loadingId, onSelect, onDelete }) => (
  <div className="ai-history__groups">
    {groups.map((group) => (
      <section key={group.label}>
        <h3 className="type-caption-strong ai-history__group-label">{group.label}</h3>
        <ul className="ai-history__list">
          {group.conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeId}
              isLoading={conversation.id === loadingId}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </section>
    ))}
  </div>
);

ConversationGroups.propTypes = {
  groups: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, conversations: PropTypes.array })).isRequired,
  activeId: PropTypes.string,
  loadingId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

// Modal listing past conversations: loading, empty or grouped by date.
const ConversationHistoryModal = ({ groups, loading, activeId, loadingId, onClose, onNew, onSelect, onDelete }) => (
  <Modal title={t('iArnold.history.title')} closeLabel={t('iArnold.history.close')} onClose={onClose}>
    <div className="ai-history">
      <button
        type="button"
        className="btn btn--secondary btn--block"
        onClick={onNew}
        aria-label={t('iArnold.chat.startNewConversation')}
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        {t('iArnold.chat.newConversation')}
      </button>
      {loading && <SkeletonRows label={t('iArnold.history.loading')} count={4} />}
      {!loading && groups.length === 0 && <EmptyBlock icon={MessageSquare} title={t('iArnold.history.empty')} />}
      {!loading && groups.length > 0 && (
        <ConversationGroups groups={groups} activeId={activeId} loadingId={loadingId} onSelect={onSelect} onDelete={onDelete} />
      )}
    </div>
  </Modal>
);

ConversationHistoryModal.propTypes = {
  groups: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  activeId: PropTypes.string,
  loadingId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onNew: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default ConversationHistoryModal;
