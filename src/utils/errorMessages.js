import { translateError, extractErrorInfo } from '../i18n';

/**
 * Returns a user-friendly error message by resolving the backend's
 * structured error format (messageCode + error code) through the
 * i18n translation system.
 *
 * @param {Error} error - Axios error object
 * @param {string} [fallback] - Optional fallback message
 * @returns {string} Translated error message
 */
export function getErrorMessage(error, fallback) {
  return translateError(error, fallback);
}

export { extractErrorInfo };
