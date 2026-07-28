import { requestReply } from '../requestReply';

/*
 * The canned-reply stub. What matters here is the cancellation contract: a
 * caller that aborts its controller must NOT receive the resolved reply, even
 * if the underlying setTimeout has already been queued. This is the behaviour
 * the conversation screen relies on to avoid a stale reply landing on the next
 * conversation.
 */

describe('requestReply', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves with the canned reply after the thinking delay', async () => {
    const promise = requestReply('hello');

    jest.advanceTimersByTime(1200);

    await expect(promise).resolves.toContain('organize');
  });

  it('rejects with AbortError when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    // The error must carry name: 'AbortError' because useSendPrompt keys on
    // that to distinguish an aborted send from a real network failure. We
    // can't use `instanceof DOMException` — DOMException is a Web-only API
    // and is not present in React Native's Hermes runtime, which is why
    // requestReply throws a plain Error with the right `name` instead.
    const promise = requestReply('hello', { signal: controller.signal });
    await expect(promise).rejects.toMatchObject({
      name: 'AbortError',
      message: 'Aborted',
    });
  });

  it('rejects with AbortError when aborted before the delay fires', async () => {
    const controller = new AbortController();
    const promise = requestReply('hello', { signal: controller.signal });

    controller.abort();

    await expect(promise).rejects.toMatchObject({
      name: 'AbortError',
      message: 'Aborted',
    });
  });

  it('does not reject if aborted AFTER the reply has resolved', async () => {
    const controller = new AbortController();
    const promise = requestReply('hello', { signal: controller.signal });

    jest.advanceTimersByTime(1200);
    await expect(promise).resolves.toContain('organize');

    // Aborting after resolution must be a no-op — the listener has already
    // removed itself, so the timer is gone and there is nothing to reject.
    expect(() => controller.abort()).not.toThrow();
  });

  it('does not reject when the signal is missing', async () => {
    const promise = requestReply('hello');

    jest.advanceTimersByTime(1200);

    await expect(promise).resolves.toContain('organize');
  });
});