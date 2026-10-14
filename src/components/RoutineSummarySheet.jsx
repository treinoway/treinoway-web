import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import Modal from './ds/Modal';
import Badge from './ds/Badge';
import RoutineSummarySheetItem from './RoutineSummarySheetItem';

const pluralize = (count, singular, plural) => `${count} ${count === 1 ? singular : plural}`;

const RoutineSummarySheet = ({
  open,
  trainings,
  saveStatusLabel,
  onClose,
  onScrollToTraining,
  onScrollToExercise,
}) => {
  if (!open) return null;

  const exerciseCount = trainings.reduce((sum, t) => sum + (t.exercises?.length || 0), 0);
  const eyebrowText = `Resumo · ${pluralize(trainings.length, 'treino', 'treinos')} · ${pluralize(exerciseCount, 'exercício', 'exercícios')}`;

  const footer = (
    <div className="routine-summary-footer">
      <Badge variant="tag" tone="neutral">{saveStatusLabel}</Badge>
      <span className="routine-summary-footer__hint type-caption">Toque num exercício para ir até ele</span>
    </div>
  );

  return createPortal(
    <Modal
      title="Exercícios da rotina"
      eyebrow={eyebrowText}
      closeLabel="Fechar resumo"
      onClose={onClose}
      footer={footer}
    >
      {trainings.length === 0 ? (
        <p className="routine-summary-peek-empty type-body">Nenhum treino adicionado à rotina.</p>
      ) : (
        <div className="routine-summary-list">
          {trainings.map((training, index) => (
            <RoutineSummarySheetItem
              key={training.id}
              training={training}
              index={index}
              onJumpToTraining={(id) => {
                onClose();
                onScrollToTraining(id);
              }}
              onJumpToExercise={(trainingId, exId) => {
                onClose();
                onScrollToExercise(trainingId, exId);
              }}
            />
          ))}
        </div>
      )}
    </Modal>,
    document.body
  );
};

RoutineSummarySheet.propTypes = {
  open: PropTypes.bool.isRequired,
  trainings: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      weekDay: PropTypes.string,
      exercises: PropTypes.array,
    })
  ).isRequired,
  saveStatusLabel: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onScrollToTraining: PropTypes.func.isRequired,
  onScrollToExercise: PropTypes.func.isRequired,
};

export default RoutineSummarySheet;
