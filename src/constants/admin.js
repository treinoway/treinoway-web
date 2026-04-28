/**
 * Bootstrap admin allowlist — mirrors backend `src/constants/admin.js`.
 *
 * The backend is the source of truth: `POST /me/grant-admin` validates the
 * caller's email against its own allowlist and returns 403 otherwise. This
 * frontend constant exists only to gate the UI affordance, so users not on
 * the list never see a button that would obviously fail.
 */
export const BOOTSTRAP_ADMIN_EMAILS = Object.freeze([
  'n.santos1897@gmail.com',
]);

/**
 * Case-insensitive, trim-tolerant check against the bootstrap allowlist.
 * @param {string|null|undefined} email
 * @returns {boolean}
 */
export function isBootstrapAdminEmail(email) {
  if (typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return BOOTSTRAP_ADMIN_EMAILS.some((allowed) => allowed.toLowerCase() === normalized);
}
