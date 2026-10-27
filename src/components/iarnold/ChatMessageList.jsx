import PropTypes from 'prop-types';
import { Check, Sparkles } from 'lucide-react';
import Badge from '../ds/Badge';
import StreamingSkeleton from '../StreamingSkeleton';
import ChatMarkdown from './ChatMarkdown';
import { t, tf } from '../../i18n';

// Resolves the badge label for the successful actions of a reply.
const getActionLabel = (successActions) => {
  if (successActions.length > 1) return tf('iArnold.actions.many', { count: successActions.length });
  return t(`iArnold.actions.${successActions[0].tool}`) ?? t('iArnold.actions.generic');
};

// Badge listing the actions iArnold executed in a reply.
const ActionBadge = ({ actions }) => {
  const successActions = actions.filter((action) => action.success);
  if (successActions.length === 0) return null;
  return (
    <Badge tone="success" variant="tag">
      <Check size={12} strokeWidth={2} aria-hidden="true" />
      {getActionLabel(successActions)}
    </Badge>
  );
};

ActionBadge.propTypes = {
  actions: PropTypes.arrayOf(PropTypes.shape({ tool: PropTypes.string, success: PropTypes.bool })).isRequired,
};

// Round avatar for either side of the conversation.
const MessageAvatar = ({ role, initials }) => (
  <span className="avatar ai-chat__avatar" aria-hidden="true">
    {role === 'user' ? initials : <Sparkles size={16} strokeWidth={2} />}
  </span>
);

MessageAvatar.propTypes = {
  role: PropTypes.oneOf(['user', 'assistant']).isRequired,
  initials: PropTypes.string.isRequired,
};

// Body of one message: the streaming skeleton, markdown for iArnold or plain text for the trainer.
const MessageBody = ({ message, statusMessage }) => {
  if (message.isStreaming) return <StreamingSkeleton statusMessage={statusMessage} />;
  return (
    <>
      <div className="ai-chat__message-content type-body">
        {message.role === 'assistant' ? <ChatMarkdown content={message.content} /> : message.content}
      </div>
      {message.actionsExecuted?.length > 0 && <ActionBadge actions={message.actionsExecuted} />}
    </>
  );
};

MessageBody.propTypes = {
  message: PropTypes.shape({
    role: PropTypes.string,
    content: PropTypes.string,
    isStreaming: PropTypes.bool,
    actionsExecuted: PropTypes.array,
  }).isRequired,
  statusMessage: PropTypes.string,
};

// The conversation as a list; each message keeps its own stable key.
const ChatMessageList = ({ messages, userInitials, statusMessage }) => (
  <ul className="ai-chat__messages" aria-label={t('iArnold.chat.conversationLabel')}>
    {messages.map((message, index) => (
      <li
        key={message.id ?? `message-${index}`}
        className={`ai-chat__message ai-chat__message--${message.role}`}
        aria-busy={message.isStreaming ? 'true' : undefined}
      >
        <MessageAvatar role={message.role} initials={userInitials} />
        <div className="ai-chat__message-body">
          <span className="type-caption-strong ai-chat__message-label">
            {message.role === 'user' ? t('iArnold.chat.you') : t('iArnold.chat.assistantName')}
          </span>
          <MessageBody message={message} statusMessage={statusMessage} />
        </div>
      </li>
    ))}
  </ul>
);

ChatMessageList.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.object).isRequired,
  userInitials: PropTypes.string.isRequired,
  statusMessage: PropTypes.string,
};

export default ChatMessageList;
