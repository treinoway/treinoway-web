import { useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';
import { WEEK_DAYS, getWeekDayLabel } from '../constants/weekDays';

const DAY_ABBREVS = {
  monday: 'Seg',
  tuesday: 'Ter',
  wednesday: 'Qua',
  thursday: 'Qui',
  friday: 'Sex',
  saturday: 'Sáb',
  sunday: 'Dom',
};

const normalizeWeekDay = (val) => {
  if (!val || typeof val !== 'string') return '';
  return val.toLowerCase();
};

const buildCountLabel = (trainings) => {
  const scheduled = trainings.filter((t) => normalizeWeekDay(t.weekDay)).length;
  const unscheduled = trainings.length - scheduled;

  if (scheduled > 0 && unscheduled > 0) {
    return `${scheduled} treino${scheduled !== 1 ? 's' : ''} · ${unscheduled} sem dia`;
  }
  if (scheduled > 0) {
    return `${scheduled} treino${scheduled !== 1 ? 's' : ''}`;
  }
  return `${unscheduled} sem dia`;
};

const RoutineSummaryBar = ({ trainings, initialExpanded = false }) => {
  const [expanded, setExpanded] = useState(initialExpanded);

  if (trainings.length === 0) return null;

  const activeDays = new Set(
    trainings.map((t) => normalizeWeekDay(t.weekDay)).filter(Boolean)
  );

  const countLabel = buildCountLabel(trainings);

  const groupedByDay = WEEK_DAYS.reduce((acc, day) => {
    const items = trainings.filter((t) => normalizeWeekDay(t.weekDay) === day);
    if (items.length > 0) acc[day] = items;
    return acc;
  }, {});

  const unscheduled = trainings.filter((t) => !normalizeWeekDay(t.weekDay));

  const panelId = 'routine-bar-panel';

  return (
    <div className="routine-bar-wrapper" role="region" aria-label="Resumo da rotina">
      <div className="routine-bar">
        <div className="routine-bar__cells" aria-hidden="true">
          {WEEK_DAYS.map((day) => {
            const isActive = activeDays.has(day);
            return (
              <div
                key={day}
                className={`routine-bar__cell${isActive ? ' routine-bar__cell--active' : ''}`}
              >
                {DAY_ABBREVS[day]}
                {isActive && <span className="routine-bar__dot" />}
              </div>
            );
          })}
        </div>

        <span className="routine-bar__count">{countLabel}</span>

        <button
          type="button"
          className="routine-bar__toggle"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Recolher resumo da rotina' : 'Expandir resumo da rotina'}
        >
          <ChevronDown size={18} strokeWidth={1.8} />
        </button>
      </div>

      <div
        id={panelId}
        className="routine-bar__panel fade-in"
        hidden={!expanded}
      >
        {WEEK_DAYS.filter((day) => groupedByDay[day]).map((day) => (
          <div key={day} className="routine-bar__day-group">
            <span className="routine-bar__day-group-title">{getWeekDayLabel(day)}</span>
            {groupedByDay[day]
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((t) => (
                <span key={t._id} className="routine-bar__day-item">
                  {t.order}. {t.name}
                </span>
              ))}
          </div>
        ))}

        {unscheduled.length > 0 && (
          <div className="routine-bar__day-group">
            <span className="routine-bar__day-group-title">Sem dia</span>
            {unscheduled
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((t) => (
                <span key={t._id} className="routine-bar__day-item">
                  {t.order}. {t.name}
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

RoutineSummaryBar.propTypes = {
  trainings: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      name: PropTypes.string,
      weekDay: PropTypes.string,
      order: PropTypes.number,
    })
  ).isRequired,
  initialExpanded: PropTypes.bool,
};

export default RoutineSummaryBar;
