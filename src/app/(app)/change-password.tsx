import { ChangePasswordScreen } from '@/features/auth';

/*
 * "/change-password" — pushed from the profile's Password row.
 *
 * The ROUTE is in (app) because that is where it is entered from; the SCREEN
 * belongs to the auth feature and paints the fixed brand canvas itself (Figma
 * puts this frame in the Auth section — see the screen's header). The (app)
 * group's ThemeProvider wraps it but nothing in the screen reads useTheme(), so
 * the fixed-palette contract holds.
 */
export default ChangePasswordScreen;
