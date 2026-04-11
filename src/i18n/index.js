import ptBR from './locales/pt-BR';

const locales = {
  'pt-BR': ptBR,
};

const DEFAULT_LOCALE = 'pt-BR';

let currentLocale = DEFAULT_LOCALE;

export function getLocale() {
  return currentLocale;
}

export function setLocale(locale) {
  if (locales[locale]) {
    currentLocale = locale;
  }
}

export function getTranslations() {
  return locales[currentLocale] || locales[DEFAULT_LOCALE];
}

export function t(path) {
  const translations = getTranslations();
  return path.split('.').reduce((obj, key) => obj?.[key], translations);
}

/**
 * Translates a backend error response into a user-friendly message.
 *
 * Resolution order:
 *   1. `errors[errorCode]` — specific error code (e.g., INVALID_CREDENTIALS)
 *   2. `messageCodes[messageCode]` — stable i18n code (e.g., auth.unauthorized)
 *   3. `httpStatus[status]` — HTTP status fallback
 *   4. `fallback` — generic message
 *
 * Validation errors (messageCode === 'validation.failed') are handled
 * separately by translating each field-level detail.
 */
export function translateError(error, fallbackMessage) {
  const translations = getTranslations();

  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return translations.network.timeout;
    }
    return translations.network.offline;
  }

  const { data, status } = error.response;
  const errorCode = data?.error;
  const messageCode = data?.messageCode;
  const details = data?.details;

  if (messageCode === 'validation.failed' && Array.isArray(details) && details.length > 0) {
    return translateValidationDetails(details);
  }

  if (errorCode && translations.errors[errorCode]) {
    return translations.errors[errorCode];
  }

  if (messageCode && translations.messageCodes[messageCode]) {
    return translations.messageCodes[messageCode];
  }

  if (status && translations.httpStatus[status]) {
    return translations.httpStatus[status];
  }

  // The backend now sends pre-translated `message` in the response body (PR1 i18n).
  // Use it as a fallback when we don't have a local translation — it's already
  // in the correct language for the user (pt-BR default, or whatever the backend resolved).
  if (data?.message && typeof data.message === 'string') {
    return data.message;
  }

  return fallbackMessage || translations.fallback;
}

/**
 * Resolves a field name to its translated label. Handles nested paths
 * like "address.postalCode" by trying the full path first, then the
 * leaf segment (e.g., "postalCode").
 */
function resolveFieldName(field, translations) {
  if (!field) return field;
  if (translations.fields[field]) return translations.fields[field];

  const leaf = field.includes('.') ? field.split('.').pop() : null;
  if (leaf && translations.fields[leaf]) return translations.fields[leaf];

  return field;
}

/**
 * Translates an array of validation detail objects into a single
 * user-facing string.
 *
 * Each detail may contain:
 *   - messageCode  (e.g., "validation.email.format")
 *   - field        (e.g., "email")
 *   - validations  (e.g., ["format"])
 */
function translateValidationDetails(details) {
  const translations = getTranslations();

  const messages = details.map((detail) => {
    if (detail.messageCode && translations.validation[detail.messageCode]) {
      return translations.validation[detail.messageCode];
    }

    const fieldName = resolveFieldName(detail.field, translations);
    const rule = detail.validations?.[0];
    if (rule && translations.validationRules[rule]) {
      return translations.validationRules[rule].replace('{field}', fieldName);
    }

    return `Erro no campo ${fieldName}.`;
  });

  const unique = [...new Set(messages)];
  return unique.join(' ');
}

/**
 * Extracts structured error info from an Axios error for components
 * that need access to error code or messageCode.
 */
export function extractErrorInfo(error) {
  if (!error.response) {
    return { messageCode: null, errorCode: null, status: null, details: null };
  }

  const { data, status } = error.response;
  return {
    messageCode: data?.messageCode || null,
    errorCode: data?.error || null,
    status,
    details: data?.details || null,
  };
}
