import PropTypes from 'prop-types';
import { useAuth } from '../contexts/AuthContext';
import RouteFallback from './RouteFallback';

// Holds the app back until the native secure store was read, so a signed-in trainer never sees the login screen flash.
const NativeBootGate = ({ children }) => {
  const { isRestoring } = useAuth();

  if (isRestoring) return <RouteFallback />;
  return children;
};

NativeBootGate.propTypes = {
  children: PropTypes.node.isRequired,
};

export default NativeBootGate;
