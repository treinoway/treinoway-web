import { useAuth } from '../contexts/AuthContext';

/**
 * Reads the beta-gate feature flag. When `VITE_BETA_GATE_ENABLED` is not the
 * literal string `'true'`, the gate is a no-op so the backend can ship the
 * `betaAccess` flag before the frontend gate is turned on.
 */
export function isBetaGateEnabled() {
  return import.meta.env.VITE_BETA_GATE_ENABLED === 'true';
}

/**
 * Returns `true` when the current user must redeem an invite before entering
 * the app: the flag is on, the user is authenticated, `/me` has loaded, and
 * the backend reports `betaAccess === false`. Server-computed exemptions
 * (existing trainers/admins) arrive as `betaAccess: true`, so no client role
 * logic is needed here.
 */
export function useBetaGate() {
  const { isAuthenticated, user } = useAuth();

  return isBetaGateEnabled()
    && isAuthenticated
    && !!user
    && user.betaAccess === false;
}

export default useBetaGate;
