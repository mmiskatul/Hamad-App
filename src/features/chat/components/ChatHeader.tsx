import React from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ArrowDown01Icon, Menu09Icon, Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons';

import { useTheme, useThemeToggle } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import IconPillButton from '@/shared/ui/IconPillButton';

/*
 * The chat top bar, SINGLE-SOURCED (Figma 404:1774–404:1798).
 *
 * Every AI-chat surface — home, the conversation transcript, a fresh project
 * chat — shows the same row: hamburger, model pill, the appearance switch, then
 * one trailing action that varies (compose on home, ⋯ on a conversation). It was
 * hand-rolled in THREE places (ChatTopBar + ConversationScreen ×2), which is
 * exactly where the chrome drifted between screens. It now lives here once, so
 * the menu / model pill / theme toggle are byte-identical everywhere and only the
 * `trailing` slot differs.
 *
 * The appearance switch is owned here (useThemeToggle) rather than passed in:
 * it is the same control on every screen and its label follows its DESTINATION
 * (sun on dark = "tap for light"), so there is nothing per-screen about it.
 *
 * RTL: a plain flex row — the whole bar mirrors under Arabic, no left/right.
 */
const HEADER_PILL = 52;
/*
 * The model pill uses the THEME-FILL TWO-LAYER pattern (see IconPillButton):
 * a plain <View> carries the themed muted fill, and the inner
 * AnimatedPressable handles the press + ripple. Putting the themed fill on
 * the animated wrapper used to fail to repaint on a theme flip on Android
 * (the reanimated style path doesn't repaint from token swaps).
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ChatHeaderProps = {
  /** Selected model name, e.g. "Gemini". */
  model: string;
  onMenu: () => void;
  onModelPress: () => void;
  /** The trailing action — compose on home, the ⋯ menu on a conversation. */
  trailing?: React.ReactNode;
  /** Screens that inset their own sections pass SCREEN_PADDING; home pads the column. */
  paddingHorizontal?: number;
  menuTestID?: string;
  modelTestID?: string;
  themeToggleTestID?: string;
};

function ChatHeader({
  model,
  onMenu,
  onModelPress,
  trailing,
  paddingHorizontal,
  menuTestID,
  modelTestID,
  themeToggleTestID,
}: ChatHeaderProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const { mode, toggle } = useThemeToggle();

  // Labelled by destination, not current state — see the header note.
  const goingToLight = mode === 'dark';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md, paddingHorizontal }}>
      <IconPillButton
        icon={Menu09Icon}
        size={HEADER_PILL}
        iconSize={24}
        filled
        accessibilityLabel={t('chat.menu')}
        onPress={onMenu}
        testID={menuTestID}
      />

      <View
        style={{
          // Themed muted fill on the plain <View> so the theme flip repaints
          // (the reanimated style path skips the repaint on token changes).
          backgroundColor: theme.color.muted,
          borderRadius: theme.radius.pill,
          overflow: 'hidden',
        }}
        testID="chat-model-pill-fill"
      >
        <AnimatedPressable
          onPress={onModelPress}
          accessibilityRole="button"
          accessibilityLabel={t('chat.modelPicker', { model })}
          android_ripple={{ color: theme.color.accentSoft }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space.sm,
            minHeight: HEADER_PILL,
            paddingVertical: 14,
            paddingStart: theme.space.xl,
            paddingEnd: 20,
          }}
          testID={modelTestID}
        >
          <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>{model}</AppText>
          <Icon icon={ArrowDown01Icon} size={24} color={theme.color.textPrimary} />
        </AnimatedPressable>
      </View>

      {/* Spacer pushes the trailing actions to the end edge. */}
      <View style={{ flex: 1 }} />

      <IconPillButton
        icon={goingToLight ? Sun03Icon : Moon02Icon}
        size={40}
        iconSize={24}
        accessibilityLabel={t(goingToLight ? 'chat.theme.toLight' : 'chat.theme.toDark')}
        onPress={toggle}
        testID={themeToggleTestID}
      />

      {trailing}
    </View>
  );
}

/*
 * NOT memoised: the hamburger / model pill / appearance switch / compose
 * action are themed via inline `theme.color.*` reads, and `React.memo` can
 * short-circuit the re-render that re-evaluates those styles on Fabric — the
 * user's reported bug was the bar's muted fills staying on the previous
 * palette while the canvas and text flipped. The bar is on screen for the
 * whole conversation, so the cost of re-running the body on every parent
 * render is acceptable in exchange for the palette being correct.
 */
export default ChatHeader;
