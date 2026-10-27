import PropTypes from 'prop-types';

const WEEK_DAYS = [
  { key: 'sunday', label: 'Dom' },
  { key: 'monday', label: 'Seg' },
  { key: 'tuesday', label: 'Ter' },
  { key: 'wednesday', label: 'Qua' },
  { key: 'thursday', label: 'Qui' },
  { key: 'friday', label: 'Sex' },
  { key: 'saturday', label: 'Sáb' },
];

// Formats "N singular" / "N plural" for a count.
const formatCount = (count, singular, plural) => `${count} ${count === 1 ? singular : plural}`;

// Single day pill: a button when a training uses the day, plain text otherwise.
const DayPill = ({ label, trainingId, onSelectTraining }) => {
  if (!trainingId) return <span className="summary-strip__day">{label}</span>;
  return (
    <button
      type="button"
      className="summary-strip__day summary-strip__day--active"
      onClick={() => onSelectTraining(trainingId)}
    >
      {label}
    </button>
  );
};

DayPill.propTypes = {
  label: PropTypes.string.isRequired,
  trainingId: PropTypes.string,
  onSelectTraining: PropTypes.func.isRequired,
};

// Compact routine summary: totals plus the 7 week-day pills that jump to a training.
const RoutineSummaryStrip = ({ trainings, onSelectTraining }) => {
  const exerciseCount = trainings.reduce((sum, training) => sum + (training.exercises?.length || 0), 0);
  const withDayCount = trainings.filter((training) => training.weekDay).length;
  const firstTrainingByDay = (dayKey) =>
    trainings.find((training) => training.weekDay?.toLowerCase() === dayKey)?.id;

  return (
    <section className="summary-strip" aria-label="Resumo da rotina">
      <div className="summary-strip__totals type-body-strong">
        <span>{formatCount(trainings.length, 'treino', 'treinos')}</span>
        <span>{formatCount(exerciseCount, 'exercício', 'exercícios')}</span>
        <span className="summary-strip__totals-muted">{`${withDayCount} de ${trainings.length} com dia`}</span>
      </div>
      <div className="summary-strip__days">
        {WEEK_DAYS.map((day) => (
          <DayPill
            key={day.key}
            label={day.label}
            trainingId={firstTrainingByDay(day.key)}
            onSelectTraining={onSelectTraining}
          />
        ))}
      </div>
    </section>
  );
};

RoutineSummaryStrip.propTypes = {
  trainings: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      weekDay: PropTypes.string,
      exercises: PropTypes.array,
    })
  ).isRequired,
  onSelectTraining: PropTypes.func.isRequired,
};

export default RoutineSummaryStrip;
