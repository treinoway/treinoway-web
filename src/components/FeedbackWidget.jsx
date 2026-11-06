import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import useIsBetaTester from '../hooks/useIsBetaTester';
import { sendTrainerFeedback } from '../api/feedback';
import { translateError, t, tf } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import Callout from './ds/Callout';
import Popover from './ds/Popover';
import Segmented from './ds/Segmented';

const MESSAGE_MAX_LENGTH = 2000;
const DEFAULT_CATEGORY = 'SUGGESTION';
const PAGE_PATH_MAX_LENGTH = 300;
const HIDDEN_PATHS = ['/trainer/ai-assistant'];
const CATEGORY_IDS = ['BUG', 'SUGGESTION', 'PRAISE'];

// Whether the first-visit callout was already dismissed for this user.
const readCalloutSeen = (storageKey) => {
  try {
    return localStorage.getItem(storageKey) === '1';
  } catch {
    return false;
  }
};

// Remembers the callout dismissal; storage failures are ignored.
const persistCalloutSeen = (storageKey) => {
  try {
    localStorage.setItem(storageKey, '1');
  } catch {
    // why: storage unavailable (private mode); callout may reappear next visit
  }
};

// Bubble + popover form; mounted only for beta trainers.
const FeedbackBubble = () => {
  const { showToast } = useToast();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const calloutKey = `treinoway:feedbackCallout:${user?.id}`;
  const [calloutSeen, setCalloutSeen] = useState(() => readCalloutSeen(calloutKey));
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [openedPath, setOpenedPath] = useState(pathname);

  const categoryItems = CATEGORY_IDS.map((id) => ({ id, label: t(`feedbackWidget.category.${id}`) }));
  const canSend = message.trim().length > 0 && !sending;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const dismissCallout = () => {
    persistCalloutSeen(calloutKey);
    setCalloutSeen(true);
  };

  const handleToggle = () => {
    if (!open) {
      setOpenedPath(pathname);
      dismissCallout();
    }
    setOpen((current) => !current);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSend) return;
    setSending(true);
    try {
      await sendTrainerFeedback({
        category,
        message: message.trim(),
        pagePath: openedPath.slice(0, PAGE_PATH_MAX_LENGTH),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      });
      showToast(t('feedbackWidget.success'), 'success');
      setMessage('');
      setCategory(DEFAULT_CATEGORY);
      setOpen(false);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSending(false);
    }
  };

  const footer = (
    <button type="submit" form="feedback-widget-form" className="btn btn--primary" disabled={!canSend}>
      {sending ? t('feedbackWidget.sending') : t('feedbackWidget.send')}
    </button>
  );

  return (
    <div className="feedback-widget feedback-widget--right">
      {open && (
        <Popover
          title={t('feedbackWidget.title')}
          closeLabel={t('feedbackWidget.close')}
          onClose={() => setOpen(false)}
          footer={footer}
          className="feedback-widget__popover"
        >
          <form id="feedback-widget-form" className="feedback-widget__form" onSubmit={handleSubmit}>
            <Segmented
              ariaLabel={t('feedbackWidget.categoryLabel')}
              items={categoryItems}
              value={category}
              onChange={setCategory}
              disabled={sending}
            />
            <div className="field">
              <label className="field-label type-caption-strong" htmlFor="feedback-widget-message">
                {t('feedbackWidget.messageLabel')}
              </label>
              <textarea
                id="feedback-widget-message"
                className="form-textarea"
                rows={5}
                maxLength={MESSAGE_MAX_LENGTH}
                placeholder={t('feedbackWidget.messagePlaceholder')}
                value={message}
                disabled={sending}
                onChange={(event) => setMessage(event.target.value)}
              />
              <span className="field-hint type-caption">
                {tf('feedbackWidget.counter', { count: message.length, max: MESSAGE_MAX_LENGTH })}
              </span>
            </div>
          </form>
        </Popover>
      )}
      {!calloutSeen && !open && (
        <Callout
          closeLabel={t('feedbackWidget.close')}
          onClose={dismissCallout}
          className="feedback-widget__callout"
        >
          {t('feedbackWidget.callout')}
        </Callout>
      )}
      <button
        type="button"
        className="btn btn--primary feedback-widget__trigger"
        aria-label={t('feedbackWidget.trigger')}
        title={t('feedbackWidget.trigger')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={handleToggle}
      >
        <MessageCircle size={20} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
};

// Floating round feedback bubble for beta trainers; renders nothing for everyone else.
const FeedbackWidget = () => {
  const isBetaTester = useIsBetaTester();
  const { pathname } = useLocation();
  if (!isBetaTester || HIDDEN_PATHS.includes(pathname)) return null;
  return <FeedbackBubble />;
};

export default FeedbackWidget;
