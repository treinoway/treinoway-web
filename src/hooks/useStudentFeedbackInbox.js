import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import { listStudentFeedbacks, markStudentFeedbackRead } from '../api/studentFeedback';
import useLoadResource from './useLoadResource';
import { announceStudentFeedbackUnreadCount } from './useStudentFeedbackUnreadCount';
import { applyFeedbackRead } from '../utils/studentFeedback';
import { FEEDBACK_STATUS_FILTER } from '../constants/studentFeedback';

// Inbox of the trainer: status and milestone filters, the payload they return and mark-as-read
const useStudentFeedbackInbox = () => {
  const { showToast } = useToast();
  const [status, setStatus] = useState(FEEDBACK_STATUS_FILTER.ALL);
  const [milestone, setMilestone] = useState(null);
  const [markingId, setMarkingId] = useState(null);
  const { data, loading, error, setData, reload } = useLoadResource(
    () => listStudentFeedbacks({ status, milestone }),
    `${status}:${milestone ?? ''}`,
  );
  const unreadCount = data?.summary?.unreadCount;

  useEffect(() => {
    if (typeof unreadCount === 'number') announceStudentFeedbackUnreadCount(unreadCount);
  }, [unreadCount]);

  const markRead = useCallback(async (id) => {
    setMarkingId(id);
    try {
      const { readAt } = await markStudentFeedbackRead(id);
      setData((current) => applyFeedbackRead(current, id, readAt, status));
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    } finally {
      setMarkingId(null);
    }
  }, [setData, showToast, status]);

  return { data, loading, error: loading ? null : error, status, setStatus, milestone, setMilestone, markingId, markRead, reload };
};

export default useStudentFeedbackInbox;
