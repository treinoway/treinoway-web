import PropTypes from 'prop-types';
import { personName } from '../../utils/nutritionFormat';

// KPI tile with the patient's personal trainer in TeuFit (hidden when there is none; the weekly training link is v2).
const TrainerCard = ({ trainer }) => {
  if (!trainer) return null;
  return (
    <div className="nutri-kpi">
      <span className="nutri-eyebrow">Personal</span>
      <span className="nutri-kpi__name">{personName(trainer)}</span>
    </div>
  );
};

TrainerCard.propTypes = { trainer: PropTypes.object };

export default TrainerCard;
