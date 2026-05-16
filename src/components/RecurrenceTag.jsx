import PropTypes from 'prop-types';
import { RECURRENCE_LABEL } from '../utils/subscriptionHelpers';

const RecurrenceTag = ({ recurrence, label }) => {
  const text = label || RECURRENCE_LABEL[recurrence] || recurrence;
  return <span className="recurrence-tag">{text}</span>;
};

RecurrenceTag.propTypes = {
  recurrence: PropTypes.string.isRequired,
  label: PropTypes.string,
};

export default RecurrenceTag;
