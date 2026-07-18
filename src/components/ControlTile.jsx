import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Sparkles } from 'lucide-react';

const SEVERITY_ICON = {
  critical: AlertTriangle,
  warn: Clock,
  celebration: Sparkles,
};

/**
 * One tile-card inside the ControlTower panel — reused across the Radar,
 * Financeiro and Pulso bands. Severity is expressed as a container wash
 * across the whole card (never by a lone hue on text): critical = error
 * container + error number; warn = amber-safe tier-4 container + tier-4
 * number; celebration = blue primary-container wash + primary-blue number
 * (never --brand-accent as text, ~2.8:1 contrast, fails AA; and never the
 * peach accent-container, which reads amber-adjacent to warn); neutral = a
 * plain surface-container card for informational, non-urgent readouts.
 *
 * Clickable only when `to` (router Link) or `onAction` (button, e.g. "toque
 * para atualizar" on stale data) is given — the tile itself is the tap
 * target, there is no trailing chevron. Non-clickable tiles get no hover
 * treatment. `dimmed` mutes an otherwise-colored value to steel when the
 * underlying data is known stale (used by Financeiro).
 *
 * `children` overrides the default label/value/subcue body entirely (used by
 * Adesão do mês, which renders its own StatDisplay) while still getting the
 * shared card shell, severity wash and click affordance.
 */
const ControlTile = ({
  label,
  value,
  subcue,
  severity,
  icon,
  to,
  onAction,
  ariaLabel,
  valueFamily = 'stat',
  dimmed = false,
  size = 'default',
  className,
  children,
}) => {
  const clickable = Boolean(to) || Boolean(onAction);
  const Icon = icon || SEVERITY_ICON[severity];

  const valueClassName = [
    'control-tile-value',
    `control-tile-value--${severity}`,
    `control-tile-value--${valueFamily}`,
    size === 'protagonist' ? 'control-tile-value--protagonist' : '',
    dimmed ? 'control-tile-value--dimmed' : '',
  ].filter(Boolean).join(' ');

  const body = children || (
    <>
      <span className="control-tile-label-row">
        {Icon && (
          <Icon size={16} strokeWidth={2} className="control-tile-icon" aria-hidden="true" />
        )}
        <span className="control-tile-label">{label}</span>
      </span>
      <span className={valueClassName}>{value}</span>
      {subcue && <span className="control-tile-subcue">{subcue}</span>}
    </>
  );

  const wrapperClassName = [
    'control-tile',
    `control-tile--${severity}`,
    clickable ? 'control-tile--clickable' : '',
    size === 'protagonist' ? 'control-tile--protagonist' : '',
    className || '',
  ].filter(Boolean).join(' ');

  if (clickable && to) {
    return (
      <Link to={to} className={wrapperClassName} aria-label={ariaLabel}>
        {body}
      </Link>
    );
  }

  if (clickable && onAction) {
    return (
      <button type="button" onClick={onAction} className={wrapperClassName} aria-label={ariaLabel}>
        {body}
      </button>
    );
  }

  return <div className={wrapperClassName}>{body}</div>;
};

ControlTile.propTypes = {
  label: PropTypes.string,
  value: PropTypes.node,
  subcue: PropTypes.node,
  severity: PropTypes.oneOf(['critical', 'warn', 'neutral', 'celebration']).isRequired,
  icon: PropTypes.elementType,
  to: PropTypes.string,
  onAction: PropTypes.func,
  ariaLabel: PropTypes.string,
  valueFamily: PropTypes.oneOf(['stat', 'message']),
  dimmed: PropTypes.bool,
  size: PropTypes.oneOf(['default', 'protagonist']),
  className: PropTypes.string,
  children: PropTypes.node,
};

export default ControlTile;
