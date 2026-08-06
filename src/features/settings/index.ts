/*
 * Settings feature — public surface.
 *
 * The Figma Core section's account cluster: Profile (140:1461), Edit profile
 * (142:877), About (140:1726), Terms (140:1968), Privacy (140:2027) and Contact
 * support (140:2044).
 *
 * ADAPTIVE subtree: every colour and type value comes from useTheme(). Never
 * import anything from features/auth here.
 *
 * The user's identity and plan are NOT owned by this feature — they live in
 * @/shared/profile and @/shared/plan, because the chat drawer reads them too and
 * features may not import each other.
 */
export { default as ProfileScreen } from './screens/ProfileScreen';
export { default as EditProfileScreen } from './screens/EditProfileScreen';
export { default as AboutScreen } from './screens/AboutScreen';
export { default as TermsScreen } from './screens/TermsScreen';
export { default as PrivacyScreen } from './screens/PrivacyScreen';
export { default as ContactSupportScreen } from './screens/ContactSupportScreen';
export { default as MemoryScreen } from './screens/MemoryScreen';
export { default as MemorySummaryScreen } from './screens/MemorySummaryScreen';
export { default as ServerSettingsScreen } from './screens/ServerSettingsScreen';
export { default as SettingRow, type SettingRowProps } from './components/SettingRow';
export { useMemoryStore, MEMORY_STORAGE_KEY, type MemoryState } from '@/shared/memory';
