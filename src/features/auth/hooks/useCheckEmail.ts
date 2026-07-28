import { useMutation } from '@tanstack/react-query';

import { checkEmailRegistered, type EmailCheckResult } from '../api/checkEmailRegistered';

/*
 * Mutation wrapper for the email-existence check. A mutation (not a query)
 * because it is triggered by a user action (tapping Continue), not by mounting,
 * and we want `isPending` to drive the button's loading state.
 *
 * The screen calls `mutate(email, { onSuccess })` and branches on
 * result.registered. Kept tiny on purpose — all the real logic is server-side
 * once the backend lands (see checkEmailRegistered).
 */
export function useCheckEmail() {
  return useMutation<EmailCheckResult, Error, string>({
    mutationFn: checkEmailRegistered,
  });
}

export default useCheckEmail;
