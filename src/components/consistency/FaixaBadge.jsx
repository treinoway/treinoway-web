import PropTypes from 'prop-types';
import Badge from '../ds/Badge';
import { FAIXA, FAIXA_LABELS } from '../../constants/consistencyRanking';

const FAIXA_TONES = Object.freeze({
  [FAIXA.FULL]: 'brand',
  [FAIXA.CONSTANT]: 'brand',
  [FAIXA.STEADY]: 'neutral',
  [FAIXA.RESTARTING]: 'warning',
  [FAIXA.ENTERING]: 'neutral',
});

// Badge of the season band (100%, Constante, Em ritmo, Retomando, Entrando)
const FaixaBadge = ({ faixa }) => {
  const label = FAIXA_LABELS[faixa];
  if (!label) return null;
  return <Badge tone={FAIXA_TONES[faixa]} className={faixa === FAIXA.FULL ? 'badge--solid' : ''}>{label}</Badge>;
};

FaixaBadge.propTypes = {
  faixa: PropTypes.string,
};

export default FaixaBadge;
