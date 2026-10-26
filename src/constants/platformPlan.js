export const PLATFORM_PLAN_TIERS = ['FREE', 'PRO', 'PLATINUM', 'DIAMOND', 'BETA'];

// BETA is unlimited like DIAMOND, so both share the top rank.
const TIER_RANK = { FREE: 0, PRO: 1, PLATINUM: 2, DIAMOND: 3, BETA: 3 };

/** True when `nextTier` ranks below `currentTier` in the platform plan order. */
export const isTierDowngrade = (currentTier, nextTier) =>
  TIER_RANK[nextTier] < TIER_RANK[currentTier];
