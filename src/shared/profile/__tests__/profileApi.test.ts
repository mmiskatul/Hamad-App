import { apiRequest } from '@/shared/api/client';
import { getProfile, refreshProfile, updateProfile } from '../profileApi';
import { useProfileStore } from '../profileStore';

jest.mock('@/shared/api/client', () => ({ apiRequest: jest.fn() }));
const apiRequestMock = apiRequest as jest.MockedFunction<typeof apiRequest>;

const response = {
  id: 'user-1',
  name: 'Miskatul',
  email: 'miskatul@example.com',
  phone: '+8801700000000',
  avatarUri: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T01:00:00.000Z',
};

describe('profile API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useProfileStore.setState({ name: '', email: '', phone: '', avatarUri: null });
  });

  it('loads and caches the authenticated profile', async () => {
    apiRequestMock.mockResolvedValue(response);
    await expect(refreshProfile()).resolves.toEqual({
      name: response.name,
      email: response.email,
      phone: response.phone,
      avatarUri: null,
    });
    expect(apiRequestMock).toHaveBeenCalledWith('/profile', { authenticated: true });
    expect(useProfileStore.getState().name).toBe('Miskatul');
  });

  it('patches edits and returns the canonical server profile', async () => {
    apiRequestMock.mockResolvedValue(response);
    await expect(updateProfile({ name: 'Miskatul' })).resolves.toMatchObject({
      name: 'Miskatul',
      email: 'miskatul@example.com',
    });
    expect(apiRequestMock).toHaveBeenCalledWith('/profile', {
      method: 'PATCH',
      authenticated: true,
      body: JSON.stringify({ name: 'Miskatul' }),
    });
  });

  it('can fetch without mutating the cache', async () => {
    apiRequestMock.mockResolvedValue(response);
    await getProfile();
    expect(useProfileStore.getState().name).toBe('');
  });
});
