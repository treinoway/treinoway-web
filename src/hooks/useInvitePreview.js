import { useEffect, useState } from 'react';
import api from '../api/axios';
import { translateError } from '../i18n';

const INVITE_MESSAGE_CODE_PREFIX = 'invite.';
const TOO_MANY_REQUESTS = 429;

const IDLE = { status: 'idle', data: null, errorCode: null, message: '' };
const LOADING = { status: 'loading', data: null, errorCode: null, message: '' };

// `invalid` = the server positively told us this invite is dead (4xx + invite.*).
// Everything else (network, 5xx, 429, unknown 4xx) is `error`: the caller
// degrades gracefully instead of blocking the user.
const classifyPreviewError = (error) => {
  const status = error.errorInfo?.status ?? error.response?.status ?? null;
  const messageCode = error.errorInfo?.messageCode ?? null;
  const isClientError = status >= 400 && status < 500 && status !== TOO_MANY_REQUESTS;
  const isInviteCode = Boolean(messageCode?.startsWith(INVITE_MESSAGE_CODE_PREFIX));

  return {
    status: isClientError && isInviteCode ? 'invalid' : 'error',
    data: null,
    errorCode: messageCode,
    message: error.userMessage || translateError(error),
  };
};

// Public, unauthenticated lookup of an old invite link so /invite can send the
// visitor to login or signup. Results are keyed by code: a response for a stale code
// is never surfaced, and the in-flight request is aborted on change/unmount.
export const useInvitePreview = (code) => {
  const [result, setResult] = useState({ code: null, state: IDLE });

  useEffect(() => {
    if (!code) return undefined;

    const controller = new AbortController();

    api.get('/invite/preview', { params: { code }, signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        setResult({
          code,
          state: { status: 'valid', data: response.data, errorCode: null, message: '' },
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setResult({ code, state: classifyPreviewError(error) });
      });

    return () => controller.abort();
  }, [code]);

  if (!code) return IDLE;
  if (result.code !== code) return LOADING;
  return result.state;
};

export default useInvitePreview;
