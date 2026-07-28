import AsyncStorage from '@react-native-async-storage/async-storage';

import { checkEmailRegistered } from '../api/checkEmailRegistered';
import {
  ACCOUNTS_STORAGE_KEY,
  clearAccounts,
  isEmailRegistered,
  registerAccount,
} from '../api/localAccounts';

/*
 * The local account list is what decides the login branch (user rule): an email
 * absent from storage is a NEW account → verification; a stored one → password.
 */

beforeEach(async () => {
  await clearAccounts();
});

it('treats an unknown email as unregistered', async () => {
  expect(await isEmailRegistered('nobody@example.com')).toBe(false);
});

it('treats a stored email as registered', async () => {
  await registerAccount('user@example.com');

  expect(await isEmailRegistered('user@example.com')).toBe(true);
});

it('matches case-insensitively and ignores surrounding whitespace', async () => {
  await registerAccount('  User@Example.COM ');

  expect(await isEmailRegistered('user@example.com')).toBe(true);
  expect(await isEmailRegistered('USER@EXAMPLE.COM')).toBe(true);
});

it('does not duplicate an account that is registered twice', async () => {
  await registerAccount('user@example.com');
  await registerAccount('user@example.com');

  const raw = await AsyncStorage.getItem(ACCOUNTS_STORAGE_KEY);
  expect(JSON.parse(raw as string)).toEqual(['user@example.com']);
});

it('reads corrupted storage as "no accounts" instead of throwing', async () => {
  await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, 'not json at all');

  await expect(isEmailRegistered('user@example.com')).resolves.toBe(false);
});

it('drives checkEmailRegistered: unknown → sign-up, stored → login', async () => {
  await expect(checkEmailRegistered('brand.new@example.com')).resolves.toEqual({
    email: 'brand.new@example.com',
    registered: false,
  });

  await registerAccount('brand.new@example.com');

  await expect(checkEmailRegistered('brand.new@example.com')).resolves.toEqual({
    email: 'brand.new@example.com',
    registered: true,
  });
});
