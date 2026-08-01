import { useMutation } from '@tanstack/react-query';

import { checkEmailRegistered, type EmailCheckResult } from '../api/checkEmailRegistered';

/**
 * User-triggered email check. The mutation owns request lifecycle state while
 * the API module owns the check + initial OTP sequence.
 */
export function useCheckEmail() {
  return useMutation<EmailCheckResult, Error, string>({
    mutationFn: checkEmailRegistered,
  });
}

export default useCheckEmail;
