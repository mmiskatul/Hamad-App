import React from 'react';
import { Pressable, View } from 'react-native';
import { Cancel01Icon, Zap } from '@hugeicons/core-free-icons';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import Dialog from '@/shared/ui/Dialog';
import { Icon } from '@/shared/ui/Icon';

/*
 * "Enjoying using!" upsell (Figma 404:1907), shown after the user's second
 * prompt of a session — see UPSELL_AFTER_PROMPTS in the chat store.
 *
 * Figma: 44pt bg/muted circle holding a power glyph, gap 24, Heading 4 title,
 * caption body in text/secondary, then a full-width accent CTA (radius 12) with
 * the same glyph. Close affordance is the ✕ in the top trailing corner.
 *
 * Dismissal is generous on purpose — ✕, scrim tap, or Back all close it. A
 * monetisation nudge that is hard to escape is the kind of thing that gets an
 * app uninstalled; it fires once per session either way.
 */
const ICON_CHIP = 44;

export type UpsellDialogProps = {
  visible: boolean;
  onDismiss: () => void;
  onUpgrade: () => void;
};

export default function UpsellDialog({
  visible,
  onDismiss,
  onUpgrade,
}: UpsellDialogProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Dialog visible={visible} onDismiss={onDismiss} scrimLabel={t('chat.upsell.close')}>
      <View style={{ alignItems: 'flex-end' }}>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={t('chat.upsell.close')}
          hitSlop={12}
          testID="upsell-close"
        >
          <Icon icon={Cancel01Icon} size={20} color={theme.color.textPrimary} />
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', gap: theme.space.xl }}>
        <View
          style={{
            width: ICON_CHIP,
            height: ICON_CHIP,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.radius.pill,
            backgroundColor: theme.color.muted,
          }}
        >
          <Icon icon={Zap} size={20} color={theme.color.textPrimary} />
        </View>

        <View style={{ gap: theme.space.md, width: '100%' }}>
          <AppText
            style={{ ...theme.type.h4, color: theme.color.textPrimary, textAlign: 'center' }}
          >
            {t('chat.upsell.title')}
          </AppText>
          <AppText
            style={{ ...theme.type.caption, color: theme.color.textSecondary, textAlign: 'center' }}
          >
            {t('chat.upsell.body')}
          </AppText>
        </View>

        <Pressable
          onPress={onUpgrade}
          accessibilityRole="button"
          android_ripple={{ color: theme.color.accentSoft }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.space.sm,
            width: '100%',
            minHeight: 52,
            paddingHorizontal: theme.space.xl,
            paddingVertical: 14,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.color.accent,
            overflow: 'hidden',
          }}
          testID="upsell-upgrade"
        >
          <Icon icon={Zap} size={24} color={theme.color.textOnAccent} />
          <AppText style={{ ...theme.type.body, color: theme.color.textOnAccent }}>
            {t('chat.upsell.cta')}
          </AppText>
        </Pressable>
      </View>
    </Dialog>
  );
}
