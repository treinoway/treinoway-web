const MAX_CODE_ALNUM = 12;
const CROCKFORD_MAP = { O: '0', I: '1', L: '1' };

// Normalizes toward TF-XXXX-XXXX-XX: uppercase, Crockford (O→0, I/L→1),
// strip anything outside [0-9A-Z], then insert hyphens at fixed group boundaries.
export const normalizeInviteCode = (raw) => {
  const cleaned = String(raw ?? '')
    .toUpperCase()
    .replace(/[OIL]/g, (char) => CROCKFORD_MAP[char])
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, MAX_CODE_ALNUM);

  return [
    cleaned.slice(0, 2),
    cleaned.slice(2, 6),
    cleaned.slice(6, 10),
    cleaned.slice(10, 12),
  ].filter(Boolean).join('-');
};
