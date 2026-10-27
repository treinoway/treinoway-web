import { useEffect, useId } from 'react';
import PropTypes from 'prop-types';
import { ArrowUp } from 'lucide-react';
import Badge from '../ds/Badge';
import { t, tf } from '../../i18n';
import { hasPlaceholders } from '../../utils/promptPlaceholders';

export const MAX_INPUT_LENGTH = 1000;
const CHAR_COUNT_THRESHOLD = 900;
const IME_PROCESSING_KEY_CODE = 229;

// True when the key event belongs to an IME composition, where Enter confirms the candidate.
const isImeEvent = (event) => event.nativeEvent.isComposing || event.keyCode === IME_PROCESSING_KEY_CODE;

// Grows the textarea with its content and shrinks it back when emptied.
const useAutoGrow = (textareaRef, value) => {
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    if (value) textarea.style.height = `${textarea.scrollHeight}px`;
  }, [textareaRef, value]);
};

// Context chip, data-access note and attribution under the composer.
const ComposerMeta = ({ activeStudents }) => (
  <div className="ai-chat__composer-meta type-caption">
    <Badge tone="brand" variant="tag">
      {activeStudents === undefined
        ? t('iArnold.chat.activeContext')
        : tf('iArnold.chat.activeContextStudents', { count: activeStudents })}
    </Badge>
    <span>{t('iArnold.chat.dataAccess')}</span>
    <span className="ai-chat__powered-by">{t('iArnold.chat.poweredBy')}</span>
  </div>
);

ComposerMeta.propTypes = { activeStudents: PropTypes.number };

// Message box with send button; truncates pastes to the limit and ignores Enter during IME composition.
const ChatComposer = ({ value, onValueChange, onSubmit, disabled, textareaRef, activeStudents, children }) => {
  useAutoGrow(textareaRef, value);
  const hintId = useId();
  const hasUnfilled = hasPlaceholders(value);

  const handleChange = (event) => onValueChange(event.target.value.slice(0, MAX_INPUT_LENGTH));

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || isImeEvent(event)) return;
    event.preventDefault();
    if (!hasUnfilled) onSubmit();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!hasUnfilled) onSubmit();
  };

  const showCharCount = value.length > CHAR_COUNT_THRESHOLD;
  const atLimit = value.length >= MAX_INPUT_LENGTH;

  return (
    <div className="ai-chat__composer-wrap">
      {children}
      <form className="ai-chat__composer" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t('iArnold.chat.composerPlaceholder')}
          className="input ai-chat__input"
          disabled={disabled}
          rows={1}
          aria-label={t('iArnold.chat.composerLabel')}
          aria-describedby={hasUnfilled ? hintId : undefined}
        />
        <div className="ai-chat__composer-actions type-caption">
          {hasUnfilled && <span id={hintId} className="ai-chat__placeholder-hint">{t('iArnold.chat.placeholderHint')}</span>}
          {showCharCount && (
            <span className={`ai-chat__char-count${atLimit ? ' ai-chat__char-count--limit' : ''}`}>
              {value.length}/{MAX_INPUT_LENGTH}
            </span>
          )}
          <span className="ai-chat__enter-hint">{t('iArnold.chat.enterHint')}</span>
          <button
            type="submit"
            className="btn btn--primary ai-chat__send"
            disabled={!value.trim() || disabled || hasUnfilled}
            aria-label={t('iArnold.chat.send')}
          >
            <ArrowUp size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </form>
      <ComposerMeta activeStudents={activeStudents} />
    </div>
  );
};

ChatComposer.propTypes = {
  value: PropTypes.string.isRequired,
  onValueChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  textareaRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  activeStudents: PropTypes.number,
  children: PropTypes.node,
};

export default ChatComposer;
