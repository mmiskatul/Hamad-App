import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';

import AuthSessionBoundary from '../AuthSessionBoundary';
import { invalidateAuthSession } from '@/shared/auth';
import { queryClient } from '@/shared/api/queryClient';
import { clearAccountCaches } from '../logout';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));
jest.mock('../logout', () => ({ clearAccountCaches: jest.fn() }));
jest.mock('@/shared/api/queryClient', () => ({
  queryClient: { clear: jest.fn() },
}));

beforeEach(() => {
  mockReplace.mockClear();
  jest.mocked(clearAccountCaches).mockClear();
  jest.mocked(queryClient.clear).mockClear();
});

it('clears account state and leaves authenticated routes when a session is invalidated', async () => {
  const view = render(<AuthSessionBoundary />);

  await act(async () => {
    await invalidateAuthSession();
  });

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  expect(clearAccountCaches).toHaveBeenCalledTimes(1);
  expect(queryClient.clear).toHaveBeenCalledTimes(1);
  view.unmount();
});
