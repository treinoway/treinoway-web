import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { t } from '../i18n';

// Minimal backoffice shell: top bar with the title and a link back to the main app.
const ManagerLayout = ({ children }) => (
  <div className="manager-shell">
    <header className="manager-topbar">
      <span className="manager-topbar__title type-h3">{t('manager.title')}</span>
      <Link to="/dashboard" className="btn btn--ghost">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {t('manager.backToApp')}
      </Link>
    </header>
    <main className="manager-main">{children}</main>
  </div>
);

ManagerLayout.propTypes = { children: PropTypes.node.isRequired };

export default ManagerLayout;
