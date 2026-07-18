import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

/**
 * Home orientation moment: eyebrow (date) + greeting + one contextual CTA.
 * Owns the single geometric-cut accent via the existing .dashboard-hero::before
 * rule — never render another cut anywhere else on the page.
 */
const WelcomeHero = ({ name = null, dateLabel = null, subtitle = null, cta = null, greeting = 'Bom dia' }) => {
  const heading = name ? `${greeting}, ${name}` : 'Bem-vindo';

  return (
    <div className="dashboard-hero">
      {dateLabel && <span className="dashboard-hero-eyebrow">{dateLabel}</span>}
      <h1 className="dashboard-hero-greeting">{heading}</h1>
      {subtitle && <p className="dashboard-hero-subtitle">{subtitle}</p>}

      {cta && cta.to && (
        <Link to={cta.to} className="dashboard-hero-cta">
          {cta.label}
        </Link>
      )}

      {cta && !cta.to && (
        <button
          type="button"
          className="dashboard-hero-cta dashboard-hero-cta--button"
          onClick={cta.onClick}
          disabled={cta.disabled || cta.loading}
        >
          {cta.loading ? 'Carregando...' : cta.label}
        </button>
      )}
    </div>
  );
};

WelcomeHero.propTypes = {
  name: PropTypes.string,
  dateLabel: PropTypes.string,
  subtitle: PropTypes.string,
  cta: PropTypes.shape({
    label: PropTypes.string.isRequired,
    to: PropTypes.string,
    onClick: PropTypes.func,
    loading: PropTypes.bool,
    disabled: PropTypes.bool,
  }),
  greeting: PropTypes.string,
};

export default WelcomeHero;
