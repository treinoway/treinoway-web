import PropTypes from 'prop-types';
import { CalendarClock, MessagesSquare } from 'lucide-react';
import EmptyBlock from '../ds/EmptyBlock';
import { formatDayMonthForDisplay } from '../../utils/dateFormat';
import { milestoneLabelOf } from '../../utils/studentFeedback';
import { tf } from '../../i18n';

// Text of the empty history with its placeholders filled
const te = (key, params) => tf(`studentFeedback.history.${key}`, params);

// Empty history: when the first automatic feedback goes out, that the sending is on with nothing scheduled, or the invite to send one or turn it on
const HistoryEmptyState = ({ next = null, autoSendEnabled = false, studentName, studentNameInSentence }) => {
  const descriptionKey = autoSendEnabled ? 'emptyNothingScheduledDescription' : 'emptyDescription';
  if (!next) return <EmptyBlock icon={MessagesSquare} title={te('empty')} description={te(descriptionKey, { name: studentNameInSentence })} />;
  return (
    <EmptyBlock
      icon={CalendarClock}
      title={te('emptyScheduled', { date: formatDayMonthForDisplay(next.dueAt) })}
      description={te('emptyScheduledDescription', { name: studentName, milestone: milestoneLabelOf(next) })}
    />
  );
};

HistoryEmptyState.propTypes = {
  next: PropTypes.object,
  autoSendEnabled: PropTypes.bool,
  studentName: PropTypes.string.isRequired,
  studentNameInSentence: PropTypes.string.isRequired,
};

export default HistoryEmptyState;
