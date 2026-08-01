import { apiRequest } from '@/shared/api/client';
import { readAuthSession, saveAuthSession } from '@/shared/auth';
import { useProfileStore, type Profile } from './profileStore';

type ProfileResponse = Profile & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export async function getProfile(): Promise<Profile> {
  return toProfile(await apiRequest<ProfileResponse>('/profile', { authenticated: true }));
}

export async function updateProfile(patch: Partial<Profile>): Promise<Profile> {
  const profile = toProfile(await apiRequest<ProfileResponse>('/profile', {
    method: 'PATCH',
    authenticated: true,
    body: JSON.stringify(patch),
  }));
  // Keep Keychain's non-secret user snapshot aligned with the updated account;
  // token/session values remain untouched.
  try {
    const session = await readAuthSession();
    if (session) {
      await saveAuthSession({
        ...session,
        user: { ...session.user, name: profile.name, email: profile.email },
      });
    }
  } catch {
    // The server update already succeeded. The next token refresh repairs the
    // cached identity, so do not misreport this as a failed profile save.
  }
  return profile;
}

export async function refreshProfile(): Promise<Profile> {
  const profile = await getProfile();
  useProfileStore.getState().replaceProfile(profile);
  return profile;
}

function toProfile(response: ProfileResponse): Profile {
  return {
    name: response.name,
    email: response.email,
    phone: response.phone,
    avatarUri: response.avatarUri,
  };
}
