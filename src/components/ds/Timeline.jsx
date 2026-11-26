import PropTypes from 'prop-types';
import { Check, Clock, X } from 'lucide-react';

const TIMELINE_STATES = ['answered', 'pending', 'expired', 'upcoming'];
const MARKER_ICON = { answered: Check, pending: Clock, expired: X };

// Marker of one step: a circle drawn by the state, with its icon when the state has one
const TimelineMarker = ({ state }) => {
  const Icon = MARKER_ICON[state];
  return (
    <span className="timeline__marker" aria-hidden="true">
      {Icon && <Icon size={16} strokeWidth={2} />}
    </span>
  );
};

TimelineMarker.propTypes = { state: PropTypes.oneOf(TIMELINE_STATES).isRequired };

// One step of the timeline: marker, line to the next step, title, caption and free content
const TimelineItem = ({ item, isLast }) => (
  <li className={`timeline__item timeline__item--${item.state}`}>
    <div className="timeline__track">
      <TimelineMarker state={item.state} />
      {!isLast && <span className="timeline__connector" aria-hidden="true" />}
    </div>
    <div className="timeline__body">
      <span className="timeline__title type-body-strong">{item.title}</span>
      {item.caption && <span className="timeline__caption type-caption">{item.caption}</span>}
      {item.content && <div className="timeline__content">{item.content}</div>}
    </div>
  </li>
);

TimelineItem.propTypes = {
  item: PropTypes.shape({
    state: PropTypes.oneOf(TIMELINE_STATES).isRequired,
    title: PropTypes.string.isRequired,
    caption: PropTypes.string,
    content: PropTypes.node,
  }).isRequired,
  isLast: PropTypes.bool.isRequired,
};

/** Read-only horizontal timeline (`.timeline`): ordered steps, each drawn by its state; scrolls sideways when the steps do not fit, and takes focus so the keyboard can scroll it. */
const Timeline = ({ ariaLabel, items }) => (
  <ol className="timeline" aria-label={ariaLabel} tabIndex={0}>
    {items.map((item, index) => (
      <TimelineItem key={item.id} item={item} isLast={index === items.length - 1} />
    ))}
  </ol>
);

Timeline.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string.isRequired })).isRequired,
};

export default Timeline;
