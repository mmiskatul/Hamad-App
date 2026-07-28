/*
 * Public surface for the signed-in user's profile. `@/shared/profile` resolves here.
 */
export {
  useProfileStore,
  profileInitial,
  PROFILE_STORAGE_KEY,
  type Profile,
  type ProfileState,
} from './profileStore';
