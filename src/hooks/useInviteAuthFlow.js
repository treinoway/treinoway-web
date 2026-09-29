import { normalizeInviteCode } from '../utils/inviteCode';
import useInvitePreview from './useInvitePreview';

// Derives what an auth screen (Signup/Login) should render for an invite
// link. `isInviteFlow` is true whenever `?code=` is present — even when the
// preview is unavailable, the closed-beta framing is kept.
export const useInviteAuthFlow = (rawCode) => {
  const code = normalizeInviteCode(rawCode || '');
  const preview = useInvitePreview(code);
  const isInviteFlow = Boolean(rawCode);
  const isValid = isInviteFlow && preview.status === 'valid';

  return {
    code,
    isInviteFlow,
    isLoading: isInviteFlow && preview.status === 'loading',
    isInvalid: isInviteFlow && preview.status === 'invalid',
    isValid,
    errorCode: preview.errorCode,
    lockedEmail: isValid ? preview.data?.email || null : null,
    accountExists: isValid && preview.data?.accountExists === true,
  };
};

export default useInviteAuthFlow;
