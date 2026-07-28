import React, { useCallback } from 'react';
import { I18nManager, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from './AppText';
import IconPillButton, { type IconPillButtonProps } from './IconPillButton';

/*
 * Header for every pushed screen in the adaptive part of the app (Figma Core:
 * Profile 140:1461, About 140:1726, Terms 140:1968, Privacy 140:2027, Contact
 * support 140:2044 — all identical).
 *
 * Figma: 52pt bg/muted back pill at x16, y74; Heading 4 title centred in the
 * frame. y74 is measured from the top of the DEVICE, and the 52pt status band
 * above it is the notch area — so the pin here is `insets.top + HEADER_TOP`,
 * not a hardcoded 74, or the header collides with the clock on tall devices.
 *
 * The title is centred on the SCREEN, not in the row: it is absolutely
 * positioned rather than a flex sibling, so a long title cannot shove itself
 * off-centre relative to the design just because the back pill takes 52pt on one
 * side and nothing balances it on the other.
 *
 * NAVIGATION CONTRACT (same as the auth stack's back button, and for the same
 * reason): it POPS, never PUSHES. `router.push` would mount a second copy of the
 * screen underneath. `canGoBack()` is false only when this screen IS the first
 * route — a deep link or dev reload — so we `replace` with a fallback instead.
 *
 * RTL: the arrow is a direction, not a glyph, so it flips with the writing
 * direction, and the pill sits on the `start` edge.
 *
 * TRAILING ACTIONS (Memory 185:3354 ✓, Memory summary 187:826 🗑, Project
 * sources 182:604 ⬆) are the same 52pt filled pill mirrored onto the `end` edge.
 * They are a prop rather than a `children` slot so every screen gets the same
 * size, spacing and vertical alignment as the back pill — three screens hand-
 * placing an absolutely-positioned button is three chances to be 2pt off.
 *
 * The optional `subtitle` is the small-caps line under the title (187:879
 * "UPDATED 9:48 PM"). Adding it grows the header rather than overlapping the
 * pills, so the title block stays centred between them.
 */
const HEADER_TOP = 22; // Figma y74 − the 52pt status band
const BACK_SIZE = 52;
const SIDE_PADDING = 16;
/** Keeps the centred title clear of the back pill and any trailing action. */
const TITLE_INSET = BACK_SIZE + 8;

export type ScreenHeaderAction = {
  id: string;
  icon: IconPillButtonProps['icon'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  testID?: string;
};

export type ScreenHeaderProps = {
  /** Heading 4 title. Omit for screens whose header is the back pill alone. */
  title?: string;
  /** Small-caps line under the title (Figma 187:879). */
  subtitle?: string;
  /** 52pt filled pills on the end edge, in reading order. */
  actions?: readonly ScreenHeaderAction[];
  /** Where to land when there is no history to pop (deep link / reload). */
  fallbackHref?: Href;
  testID?: string;
};

export default function ScreenHeader({
  title,
  subtitle,
  actions = [],
  fallbackHref = '/home',
  testID,
}: ScreenHeaderProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const onBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallbackHref);
  }, [router, fallbackHref]);

  return (
    <View
      style={{ paddingTop: insets.top + HEADER_TOP, paddingHorizontal: SIDE_PADDING }}
      testID={testID}
    >
      <View style={{ minHeight: BACK_SIZE, justifyContent: 'center' }}>
        {title ? (
          // Inset by a pill's width on BOTH edges: symmetric, so the title stays
          // centred on the screen exactly as before, but it now truncates
          // instead of sliding under the back pill or a trailing action.
          <View
            style={{
              position: 'absolute',
              start: TITLE_INSET,
              end: TITLE_INSET,
              alignItems: 'center',
              gap: 6,
            }}
            pointerEvents="none"
          >
            <AppText
              numberOfLines={1}
              style={{ ...theme.type.h4, color: theme.color.textPrimary, textAlign: 'center' }}
              testID="screen-header-title"
            >
              {title}
            </AppText>
            {subtitle ? (
              <AppText
                numberOfLines={1}
                style={{
                  ...theme.type.tag,
                  color: theme.color.textSecondary,
                  textTransform: 'uppercase',
                  textAlign: 'center',
                }}
                testID="screen-header-subtitle"
              >
                {subtitle}
              </AppText>
            ) : null}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconPillButton
            icon={I18nManager.isRTL ? ArrowRight01Icon : ArrowLeft01Icon}
            size={BACK_SIZE}
            iconSize={24}
            filled
            accessibilityLabel={t('common.back')}
            onPress={onBack}
            testID="screen-back"
          />

          <View style={{ flex: 1 }} />

          {actions.map((action) => (
            <View key={action.id} style={{ marginStart: theme.space.sm }}>
              <IconPillButton
                icon={action.icon}
                size={BACK_SIZE}
                iconSize={24}
                filled
                color={action.danger ? theme.color.danger : undefined}
                disabled={action.disabled}
                accessibilityLabel={action.label}
                onPress={action.onPress}
                testID={action.testID ?? `screen-action-${action.id}`}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
