export const GOOGLE_CREDENTIAL_CONFLICT = 'auth/account-exists-with-different-credential';

// Firebase popup outcomes that mean "the user walked away", not a failure.
export const GOOGLE_POPUP_CANCEL_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

export const GOOGLE_CREDENTIAL_CONFLICT_MESSAGE =
  'Esse e-mail já está cadastrado com senha. Entre com e-mail e senha.';
export const GOOGLE_UNEXPECTED_ERROR_MESSAGE = 'Ocorreu um erro inesperado.';
