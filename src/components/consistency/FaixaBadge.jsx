import PropTypes from 'prop-types';
import Badge from '../ds/Badge';
import { FAIXA, FAIXA_LABELS } from '../../constants/consistencyRanking';

const FAIXA_TONES = Object.freeze({
  [FAIXA.FULL]: 'success',
  [FAIXA.CONSTANT]: 'brand',
  [FAIXA.STEADY]: 'neutral',
  [FAIXA.RESTARTING]: 'warning',
  [FAIXA.ENTERING]: 'neutral',
});

// Badge of the season band (100%, Constante, Em ritmo, Retomando, Entrando) as the light DS tag; 100% is the green one (AD-062)
const FaixaBadge = ({ faixa, variant = 'status' }) => {
  const label = FAIXA_LABELS[faixa];
  if (!label) return null;
  return <Badge tone={FAIXA_TONES[faixa]} variant={variant}>{label}</Badge>;
};

FaixaBadge.propTypes = {
  faixa: PropTypes.string,
  variant: PropTypes.oneOf(['status', 'tag']),
};

export default FaixaBadge;
