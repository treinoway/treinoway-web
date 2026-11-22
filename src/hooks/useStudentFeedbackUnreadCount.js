import { useEffect, useState } from 'react';
import { getStudentFeedbackUnreadCount } from '../api/studentFeedback';
import { STUDENT_FEEDBACK_UNREAD_EVENT } from '../constants/studentFeedback';

// Tells every listener (the sidebar) the unread count the inbox has just learned
export const announceStudentFeedbackUnreadCount = (count) => {
  window.dispatchEvent(new CustomEvent(STUDENT_FEEDBACK_UNREAD_EVENT, { detail: { count } }));
};

// Unread count of the service, or null when the request fails or answers something that is not a number
const loadUnreadCount = async () => {
  try {
    const count = await getStudentFeedbackUnreadCount();
    return typeof count === 'number' ? count : null;
  } catch {
    // why: the sidebar count is a hint; a failure keeps the link without a badge instead of bothering the trainer
    return null;
  }
};

// Unread student feedbacks for the sidebar: asked once while `enabled`, then follows the counts the inbox announces
const useStudentFeedbackUnreadCount = (enabled) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    loadUnreadCount().then((loaded) => {
      if (!cancelled && loaded !== null) setCount(loaded);
    });
    const handleChange = (event) => {
      const announced = event.detail?.count;
      if (typeof announced === 'number') setCount(announced);
    };
    window.addEventListener(STUDENT_FEEDBACK_UNREAD_EVENT, handleChange);
    return () => {
      cancelled = true;
      window.removeEventListener(STUDENT_FEEDBACK_UNREAD_EVENT, handleChange);
    };
  }, [enabled]);

  return enabled ? count : 0;
};

export default useStudentFeedbackUnreadCount;
