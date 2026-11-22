import { createContext, useContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

const NO_COOLDOWN = { ownerId: null, deadline: 0 };

const ResendCooldownContext = createContext(null);

// Holds one resend-cooldown deadline (owner id + timestamp) and its setter.
export const useCooldownDeadlineState = () => useState(NO_COOLDOWN);

// Returns the cooldown store shared by the app, or null outside the provider.
export const useSharedResendCooldown = () => useContext(ResendCooldownContext);

// Shares one resend-cooldown deadline across every screen, so it survives remounts and route changes.
export const ResendCooldownProvider = ({ children }) => {
  const [cooldown, setCooldown] = useCooldownDeadlineState();
  const value = useMemo(() => [cooldown, setCooldown], [cooldown, setCooldown]);
  return <ResendCooldownContext.Provider value={value}>{children}</ResendCooldownContext.Provider>;
};

ResendCooldownProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
