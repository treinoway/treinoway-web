import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { isNative } from '../platform';

// Renders the page on the website; the native app has no sign-up, so it goes back to the login screen.
const WebOnlyRoute = ({ children }) => {
  if (isNative()) return <Navigate to="/login" replace />;
  return children;
};

WebOnlyRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default WebOnlyRoute;
