/*
 * Ask the assistant for a reply.
 *
 * STUB. There is no chat endpoint yet, so this returns a canned answer after a
 * short delay — enough for the THINKING state (Figma 144:1314) and the
 * word-by-word reveal to be real behaviour rather than a mock in the UI layer.
 *
 * It lives behind a function with the final signature on purpose: the screen
 * already awaits a promise of text, so replacing this body with the real call
 * changes nothing above it.
 *
 * The optional `AbortSignal` lets callers cancel an in-flight reply if the
 * component unmounts mid-think — otherwise the resolved reply would race back
 * to `receiveReply(id, ...)` for a conversation the user has already left,
 * and the next send would write the canned answer on top of a fresh prompt.
 *
 * ABORT ERROR: this runs in React Native's Hermes runtime, where
 * `DOMException` is NOT a global — it is a Web-only API. We throw a plain
 * `Error` with `name: 'AbortError'` instead. `useSendPrompt` keys on
 * `error.name === 'AbortError'` (not on `instanceof DOMException`), so the
 * contract is preserved. `fetch` in React Native raises the same kind of
 * `AbortError`-named Error, which is what real callers expect.
 *
 * TODO(backend): route through backend/src/ai/routing.service.ts (plan-aware
 * model access + automatic fallback — never call OpenRouter from here), and
 * stream the response so the reveal is driven by real tokens instead of a timer.
 */
const THINKING_DELAY_MS = 1200;

const CANNED_REPLY =
  '"I can help organize every detail, from the venue and catering to timelines and decor, ensuring your event is a success.”';

function makeAbortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

export function requestReply(
  _prompt: string,
  options?: { signal?: AbortSignal },
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (options?.signal?.aborted) {
      reject(makeAbortError());
      return;
    }
    const timer = setTimeout(() => {
      if (options?.signal) {
        options.signal.removeEventListener('abort', onAbort);
      }
      resolve(CANNED_REPLY);
    }, THINKING_DELAY_MS);

    const onAbort = () => {
      clearTimeout(timer);
      reject(makeAbortError());
    };

    if (options?.signal) {
      options.signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}
