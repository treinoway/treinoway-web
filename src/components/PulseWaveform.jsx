import { useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import PulseTooltip from './PulseTooltip';
import { statusLabel, statusToChartModifier } from '../constants/dashboardViz';
import {
  buildSessionAriaLabel,
  buildTickIndices,
  computeTooltipAnchor,
  computeValueLabelAlign,
  findKeyboardTarget,
  formatKg,
  formatLongDate,
  formatSessionVolume,
  formatSets,
  formatShortDate,
  listSessionIndices,
  pickValueLabelIndices,
} from '../utils/volumeChart';
import { td } from '../utils/studentCockpit';

const LEGEND = [
  { modifier: 'full', status: 'completed' },
  { modifier: 'cut', status: 'partial' },
  { modifier: 'abandoned', status: 'abandoned' },
];

const AbandonedMark = () => (
  <X className="volume-chart__abandoned-icon" size={12} strokeWidth={2} aria-hidden="true" />
);

/** The bar itself: height is the only inline (computed) style. */
const SessionBar = ({ session }) => {
  const heightStyle = session.hasLoad ? { height: `${session.pct}%` } : undefined;
  return (
    <span className="volume-chart__bar" style={heightStyle}>
      {session.status === 'abandoned' && <AbandonedMark />}
    </span>
  );
};

SessionBar.propTypes = { session: PropTypes.object.isRequired };

const buildSlotClassName = (session, active) => [
  'volume-chart__slot',
  `volume-chart__slot--${statusToChartModifier(session.status)}`,
  session.hasLoad ? '' : 'volume-chart__slot--no-load',
  active ? 'volume-chart__slot--active' : '',
].filter(Boolean).join(' ');

const SessionDay = ({ day, index, total, tooltipId, showValue, tabbable, open, slotRef, handlers }) => {
  const { session } = day;
  const valueAlign = computeValueLabelAlign(index, total);
  return (
    <div className="volume-chart__day" onMouseEnter={() => handlers.onOpen(index)} onMouseLeave={handlers.onClose}>
      <button
        ref={slotRef}
        type="button"
        className={buildSlotClassName(session, open)}
        tabIndex={tabbable ? 0 : -1}
        aria-label={buildSessionAriaLabel(day.date, session)}
        aria-describedby={open ? tooltipId : undefined}
        onFocus={() => handlers.onFocus(index)}
        onBlur={handlers.onClose}
        onKeyDown={(event) => handlers.onKeyDown(event, index)}
      >
        {showValue && (
          <span className={`volume-chart__value volume-chart__value--${valueAlign} type-caption`}>
            {formatKg(session.volumeKg)}
          </span>
        )}
        <SessionBar session={session} />
      </button>
      {open && <PulseTooltip id={tooltipId} date={day.date} session={session} anchorDir={computeTooltipAnchor(index, total)} />}
    </div>
  );
};

SessionDay.propTypes = {
  day: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  tooltipId: PropTypes.string.isRequired,
  showValue: PropTypes.bool.isRequired,
  tabbable: PropTypes.bool.isRequired,
  open: PropTypes.bool.isRequired,
  slotRef: PropTypes.func.isRequired,
  handlers: PropTypes.object.isRequired,
};

const VolumeAxis = ({ days }) => {
  const ticks = buildTickIndices(days.length);
  return (
    <div className="volume-chart__axis type-caption" aria-hidden="true">
      {days.map((day, index) => (
        <span key={day.date} className={`volume-chart__tick volume-chart__tick--${computeValueLabelAlign(index, days.length)}`}>
          {ticks.has(index) ? formatShortDate(day.date) : ''}
        </span>
      ))}
    </div>
  );
};

VolumeAxis.propTypes = { days: PropTypes.array.isRequired };

const VolumeLegend = () => (
  <div className="volume-chart__legend">
    <ul className="volume-chart__legend-list" aria-label={td('volume.legendAria')}>
      {LEGEND.map((item) => (
        <li key={item.modifier} className="volume-chart__legend-item type-caption">
          <span className={`volume-chart__swatch volume-chart__swatch--${item.modifier}`} aria-hidden="true">
            {item.status === 'abandoned' && <AbandonedMark />}
          </span>
          {statusLabel(item.status)}
        </li>
      ))}
    </ul>
    <span className="volume-chart__unit type-caption">{td('volume.unit')}</span>
  </div>
);

/**
 * Screen-reader twin of the chart: every value without hovering. Wrapped in a
 * div because tables ignore the 1px box of `.visually-hidden` and would
 * overflow the page.
 */
const VolumeTable = ({ days }) => (
  <div className="visually-hidden">
    <table>
      <caption>{td('volume.tableCaption')}</caption>
      <thead>
        <tr>
          <th scope="col">{td('volume.table.date')}</th>
          <th scope="col">{td('volume.table.status')}</th>
          <th scope="col">{td('volume.table.volume')}</th>
          <th scope="col">{td('volume.table.sets')}</th>
        </tr>
      </thead>
      <tbody>
        {days.filter((day) => day.session).map(({ date, session }) => (
          <tr key={date}>
            <th scope="row">{formatLongDate(date)}</th>
            <td>{statusLabel(session.status)}</td>
            <td>{formatSessionVolume(session)}</td>
            <td>{formatSets(session.completedSets, session.totalSets)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

VolumeTable.propTypes = { days: PropTypes.array.isRequired };

/** Tooltip + roving-focus state: one tab stop, arrows move across sessions, Escape closes. */
const useSessionFocus = (sessionIndices) => {
  const [openIndex, setOpenIndex] = useState(null);
  const [focusIndex, setFocusIndex] = useState(null);
  const slotRefs = useRef(new Map());

  useEffect(() => {
    if (openIndex === null) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpenIndex(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [openIndex]);

  const handleKeyDown = (event, index) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpenIndex((current) => (current === index ? null : index));
      return;
    }
    const target = findKeyboardTarget(event.key, index, sessionIndices);
    if (target === null || target === undefined) return;
    event.preventDefault();
    slotRefs.current.get(target)?.focus();
  };

  const handlers = {
    onOpen: setOpenIndex,
    onClose: () => setOpenIndex(null),
    onFocus: (index) => { setFocusIndex(index); setOpenIndex(index); },
    onKeyDown: handleKeyDown,
  };
  const registerSlot = (index) => (node) => {
    if (node) slotRefs.current.set(index, node);
    else slotRefs.current.delete(index);
  };
  const tabbableIndex = sessionIndices.includes(focusIndex) ? focusIndex : sessionIndices.at(-1);
  return { openIndex, tabbableIndex, handlers, registerSlot };
};

/**
 * Volume per session on a real day axis: one slot per calendar day of the
 * period (rest days stay empty with a baseline tick). Height encodes volume;
 * the outcome is encoded by shape, not hue: solid (completo), light fill +
 * border (parcial), dashed outline + × (abandonado).
 */
const PulseWaveform = ({ days }) => {
  const idPrefix = useId();
  const sessionIndices = listSessionIndices(days ?? []);
  const { openIndex, tabbableIndex, handlers, registerSlot } = useSessionFocus(sessionIndices);

  if (sessionIndices.length === 0) return null;

  const labelled = pickValueLabelIndices(days);
  const hintId = `${idPrefix}-hint`;

  return (
    <div className="volume-chart">
      <p id={hintId} className="visually-hidden">{td('volume.keyboardHint')}</p>
      <div className="volume-chart__plot" role="group" aria-label={td('volume.chartAria')} aria-describedby={hintId}>
        {days.map((day, index) => (day.session ? (
          <SessionDay
            key={day.date}
            day={day}
            index={index}
            total={days.length}
            tooltipId={`${idPrefix}-tooltip-${index}`}
            showValue={labelled.has(index)}
            tabbable={tabbableIndex === index}
            open={openIndex === index}
            slotRef={registerSlot(index)}
            handlers={handlers}
          />
        ) : <div key={day.date} className="volume-chart__day volume-chart__day--rest" />))}
      </div>
      <VolumeAxis days={days} />
      <VolumeLegend />
      <VolumeTable days={days} />
    </div>
  );
};

PulseWaveform.propTypes = {
  days: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      session: PropTypes.shape({
        status: PropTypes.oneOf(['completed', 'partial', 'abandoned']).isRequired,
        volumeKg: PropTypes.number,
        hasLoad: PropTypes.bool.isRequired,
        pct: PropTypes.number.isRequired,
        sessionCount: PropTypes.number,
        trainingName: PropTypes.string,
        completedSets: PropTypes.number,
        totalSets: PropTypes.number,
      }),
    }),
  ),
};

export default PulseWaveform;
