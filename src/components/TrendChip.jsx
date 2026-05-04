import PropTypes from 'prop-types';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const sign = value > 0 ? '+' : '';
  // Server is already pre-rounded to 2 decimals; trim trailing zeros for display.
  const fixed = Number(value.toFixed(2));
  return `${sign}${fixed}%`;
};

/**
 * Renders a directional trend pill ("↑ +10%" / "↓ -5%" / "—"). The icon carries the
 * direction so colorblind users get the meaning without relying on hue.
 *
 * `null` / undefined deltaPct renders a muted "—" chip (no icon) — represents
 * single-session anchor or unavailable baseline per backend contract.
 * `0` renders a flat Minus icon with "0%" (zero change, data present).
 */
const TrendChip = ({ deltaPct, ariaLabel }) => {
  if (deltaPct === null || deltaPct === undefined) {
    return (
      <span className="trend-chip trend-chip--neutral" aria-label={ariaLabel ?? 'Sem comparativo'}>
        <span>—</span>
      </span>
    );
  }

  const direction = deltaPct > 0 ? 'up' : deltaPct < 0 ? 'down' : 'neutral';
  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus;
  const text = formatPercent(deltaPct);

  return (
    <span className={`trend-chip trend-chip--${direction}`} aria-label={ariaLabel ?? text}>
      <Icon size={12} strokeWidth={2} aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
};

TrendChip.propTypes = {
  deltaPct: PropTypes.number,
  ariaLabel: PropTypes.string,
};

export default TrendChip;
