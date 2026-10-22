import PropTypes from 'prop-types';

/**
 * LibraryPageHeader — `ds-page-header` wrapper shared by the Biblioteca lists.
 *
 * Props:
 *  - icon (elementType)  — lucide icon rendered at 24px (same as the sidebar icon)
 *  - title (string)      — page title (h1)
 *  - actions (node)      — trailing actions (primary button etc.); `children` is an alias
 */
const LibraryPageHeader = ({ icon: Icon, title, actions, children }) => (
  <header className="ds-page-header">
    <div className="ds-page-header__heading">
      {Icon && <Icon size={24} strokeWidth={2} aria-hidden="true" />}
      <h1 className="ds-page-header__title type-h1">{title}</h1>
    </div>
    {(actions || children) && (
      <div className="ds-page-header__actions">
        {actions}
        {children}
      </div>
    )}
  </header>
);

LibraryPageHeader.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string.isRequired,
  actions: PropTypes.node,
  children: PropTypes.node,
};

export default LibraryPageHeader;
