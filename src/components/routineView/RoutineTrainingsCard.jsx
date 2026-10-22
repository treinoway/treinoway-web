import { useState } from 'react';
import PropTypes from 'prop-types';
import RoutineTrainingItem from './RoutineTrainingItem';

const toTrainingView = (item) => ({
  id: item.id,
  name: item.trainingTemplate?.name || item.name || '—',
  order: item.order,
  weekDay: item.weekDay,
  estimatedDurationSeconds:
    item.estimatedDurationSeconds ?? item.trainingTemplate?.estimatedDurationSeconds,
});

const toggleId = (openIds, id) => {
  const next = new Set(openIds);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

/** "Treinos" card: accordion list of the routine's trainings with expand/collapse all. */
const RoutineTrainingsCard = ({ trainings, exercisesByTraining }) => {
  const [openIds, setOpenIds] = useState(() => new Set());
  const allOpen = trainings.length > 0 && openIds.size === trainings.length;

  const handleToggle = (id) => setOpenIds((current) => toggleId(current, id));
  const handleToggleAll = () => {
    setOpenIds(allOpen ? new Set() : new Set(trainings.map((item) => item.id)));
  };

  return (
    <section className="section-card cockpit-card" aria-labelledby="routine-trainings-heading">
      <header className="cockpit-card__header cockpit-card__header--action-slot">
        <h2 id="routine-trainings-heading" className="cockpit-card__title type-h3">
          Treinos <span className="cockpit-card__title-suffix">({trainings.length})</span>
        </h2>
        {trainings.length > 0 && (
          <button type="button" className="btn btn--ghost" onClick={handleToggleAll}>
            {allOpen ? 'Recolher tudo' : 'Expandir tudo'}
          </button>
        )}
      </header>
      {trainings.length === 0 ? (
        <div className="cockpit-card__empty">
          <div className="cockpit-card__empty-text">
            <p className="type-body-strong">Sem treinos nesta rotina ainda</p>
            <p className="type-caption">Use &ldquo;Editar&rdquo; para adicionar treinos.</p>
          </div>
        </div>
      ) : (
        <ul className="cockpit-card__list">
          {trainings.map((item) => (
            <RoutineTrainingItem
              key={item.id}
              training={toTrainingView(item)}
              exercises={exercisesByTraining[item.id] || []}
              open={openIds.has(item.id)}
              onToggle={handleToggle}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

RoutineTrainingsCard.propTypes = {
  trainings: PropTypes.array.isRequired,
  exercisesByTraining: PropTypes.object.isRequired,
};

export default RoutineTrainingsCard;
