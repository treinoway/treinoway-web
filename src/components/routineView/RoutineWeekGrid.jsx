import PropTypes from 'prop-types';

const DAYS = [
  { key: 'monday', label: 'Seg' },
  { key: 'tuesday', label: 'Ter' },
  { key: 'wednesday', label: 'Qua' },
  { key: 'thursday', label: 'Qui' },
  { key: 'friday', label: 'Sex' },
  { key: 'saturday', label: 'Sáb' },
  { key: 'sunday', label: 'Dom' },
];

const countByWeekDay = (trainings) => {
  const counts = {};
  trainings.forEach((training) => {
    const day = (training.weekDay || '').toLowerCase();
    if (day) counts[day] = (counts[day] || 0) + 1;
  });
  return counts;
};

/** "Semana" card: which weekdays carry a training and how many. */
const RoutineWeekGrid = ({ trainings }) => {
  const counts = countByWeekDay(trainings);

  return (
    <section className="section-card cockpit-card" aria-labelledby="routine-week-heading">
      <h2 id="routine-week-heading" className="cockpit-card__title type-h3">Semana</h2>
      <ul className="routine-week">
        {DAYS.map(({ key, label }) => (
          <li
            key={key}
            className={`routine-week__day${counts[key] ? ' routine-week__day--active' : ''}`}
          >
            <span className="type-caption-strong">{label}</span>
            <span className="routine-week__count type-body-strong">{counts[key] || '–'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

RoutineWeekGrid.propTypes = {
  trainings: PropTypes.arrayOf(PropTypes.shape({ weekDay: PropTypes.string })).isRequired,
};

export default RoutineWeekGrid;
