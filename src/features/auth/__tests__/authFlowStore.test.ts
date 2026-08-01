import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AUTH_FLOW_STORAGE_KEY,
  useAuthFlowStore,
  whenAuthFlowHydrated,
} from '../store/authFlowStore';

/*
 * The auth-flow store: what it holds, what it persists, and the hydration
 * contract the gated screens depend on.
 */

beforeEach(async () => {
  await AsyncStorage.clear();
  useAuthFlowStore.setState({
    email: null,
    registered: null,
    verificationToken: null,
    hasHydrated: true,
  });
});

it('records the email-check result', () => {
  useAuthFlowStore.getState().startFlow({ email: 'user@example.com', registered: true });

  expect(useAuthFlowStore.getState().email).toBe('user@example.com');
  expect(useAuthFlowStore.getState().registered).toBe(true);
});

it('overwrites the previous flow when a different email is submitted', () => {
  useAuthFlowStore.getState().startFlow({ email: 'user@example.com', registered: true });
  useAuthFlowStore.getState().startFlow({ email: 'new.person@example.com', registered: false });

  expect(useAuthFlowStore.getState().email).toBe('new.person@example.com');
  expect(useAuthFlowStore.getState().registered).toBe(false);
});

it('clearFlow empties the flow', () => {
  useAuthFlowStore.getState().startFlow({ email: 'user@example.com', registered: true });
  useAuthFlowStore.getState().setVerificationToken('runtime-only-token');
  useAuthFlowStore.getState().clearFlow();

  expect(useAuthFlowStore.getState().email).toBeNull();
  expect(useAuthFlowStore.getState().registered).toBeNull();
  expect(useAuthFlowStore.getState().verificationToken).toBeNull();
});

it('persists email + registered + intent to AsyncStorage, and nothing else', async () => {
  useAuthFlowStore.getState().startFlow({ email: 'user@example.com', registered: true });

  const raw = await AsyncStorage.getItem(AUTH_FLOW_STORAGE_KEY);
  expect(raw).toBeTruthy();
  const persisted = JSON.parse(raw as string).state;

  expect(persisted).toEqual({ email: 'user@example.com', registered: true, intent: 'signin' });
  // hasHydrated is runtime-only: persisting it would restore `true` before the
  // read that is supposed to set it has happened.
  expect(persisted).not.toHaveProperty('hasHydrated');
  expect(persisted).not.toHaveProperty('verificationToken');
});

it('restores a stored flow on rehydrate, so an app restart resumes it', async () => {
  // Cold start: empty memory FIRST (persist writes through on every setState, so
  // clearing after seeding disk would erase what we just seeded), then put a
  // stored flow on disk and rehydrate from it.
  useAuthFlowStore.setState({ email: null, registered: null, hasHydrated: false });
  await AsyncStorage.setItem(
    AUTH_FLOW_STORAGE_KEY,
    JSON.stringify({ state: { email: 'user@example.com', registered: true }, version: 0 }),
  );

  await useAuthFlowStore.persist.rehydrate();

  expect(useAuthFlowStore.getState().email).toBe('user@example.com');
  expect(useAuthFlowStore.getState().registered).toBe(true);
  expect(useAuthFlowStore.getState().hasHydrated).toBe(true);
});

it('whenAuthFlowHydrated resolves immediately once hydrated', async () => {
  await expect(whenAuthFlowHydrated()).resolves.toBeUndefined();
});

it('whenAuthFlowHydrated resolves when hydration completes later', async () => {
  useAuthFlowStore.setState({ hasHydrated: false });

  const pending = whenAuthFlowHydrated();
  useAuthFlowStore.setState({ hasHydrated: true });

  await expect(pending).resolves.toBeUndefined();
});

it('fails open: hydration that never answers still releases after the timeout', async () => {
  jest.useFakeTimers();
  useAuthFlowStore.setState({ hasHydrated: false });

  const pending = whenAuthFlowHydrated();
  jest.runOnlyPendingTimers();

  await expect(pending).resolves.toBeUndefined();
  // Flag flipped anyway — the app proceeds with an empty flow rather than
  // trapping the user on a splash or a shell.
  expect(useAuthFlowStore.getState().hasHydrated).toBe(true);
  jest.useRealTimers();
});
