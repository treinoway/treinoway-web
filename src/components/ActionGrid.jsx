import PropTypes from 'prop-types';

/**
 * Layout wrapper around the existing .quick-actions responsive grid.
 */
const ActionGrid = ({ children }) => (
  <div className="quick-actions">
    {children}
  </div>
);

ActionGrid.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ActionGrid;
