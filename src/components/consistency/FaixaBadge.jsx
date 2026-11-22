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

// Badge of the season band (100%, Constante, Em ritmo, Retomando, Entrando); the team ranking paints 100% solid (PAN-10), the championship uses the plain DS tag
const FaixaBadge = ({ faixa, variant = 'status' }) => {
  const label = FAIXA_LABELS[faixa];
  if (!label) return null;
  const solid = variant === 'status' && faixa === FAIXA.FULL;
  return <Badge tone={FAIXA_TONES[faixa]} variant={variant} className={solid ? 'badge--solid' : ''}>{label}</Badge>;
};

FaixaBadge.propTypes = {
  faixa: PropTypes.string,
  variant: PropTypes.oneOf(['status', 'tag']),
};

export default FaixaBadge;
