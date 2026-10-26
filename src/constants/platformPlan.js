export const PLATFORM_PLAN_TIERS = ['FREE', 'PRO', 'PLATINUM', 'DIAMOND'];

/** True when `nextTier` ranks below `currentTier` in the platform plan order. */
export const isTierDowngrade = (currentTier, nextTier) =>
  PLATFORM_PLAN_TIERS.indexOf(nextTier) < PLATFORM_PLAN_TIERS.indexOf(currentTier);
