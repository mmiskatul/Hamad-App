/*
 * Public surface for shared UI primitives. `@/shared/ui` resolves here.
 *
 * AppText is also importable via its direct path (`@/shared/ui/AppText`) — a lot
 * of existing code does that — and both continue to work.
 */
export { AppText } from './AppText';
export { default as AppButton, type AppButtonVariant } from './AppButton';
export { default as HexLogo } from './HexLogo';
export { Icon, type IconProps } from './Icon';
export { default as IconPillButton } from './IconPillButton';
export { default as LanguageToggle, type LanguageTogglePalette } from './LanguageToggle';
export {
  default as MetaListRow,
  type MetaListRowAction,
  type MetaListRowProps,
} from './MetaListRow';
export { default as Toggle, type ToggleProps } from './Toggle';
export { default as TypewriterText, type TypewriterTextProps } from './TypewriterText';
export { default as KeyboardAvoider, type KeyboardAvoiderProps } from './KeyboardAvoider';
export { default as FormScrollArea, type FormScrollAreaProps } from './FormScrollArea';
export { default as ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';
export { default as TextField, type TextFieldVariant } from './TextField';
export {
  default as Popover,
  type PopoverAnchor,
  type PopoverOrigin,
} from './Popover';
export { default as RadioOption } from './RadioOption';
export { default as ScreenHeader, type ScreenHeaderAction } from './ScreenHeader';
export { usePressFeedback } from './usePressFeedback';
export { default as Shimmer } from './Shimmer';
