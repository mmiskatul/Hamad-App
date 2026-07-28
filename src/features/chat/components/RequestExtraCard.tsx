import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import AppButton from '@/shared/ui/AppButton';
import { AppText } from '@/shared/ui/AppText';
import TextField from '@/shared/ui/TextField';

/*
 * "Req. Extra" — the third billing option (Figma 281:898): top-ups bought on
 * top of the current plan rather than a different plan.
 *
 * It is a BRANCH of the upgrade screen, not a screen of its own: 281:898 is the
 * same frame as 404:1024 with the third segment selected and the plan cards
 * replaced by this single card. `BILLING_PERIODS` already carried 'extra'; up
 * to now that segment re-rendered the plan cards, which was simply wrong.
 *
 * THE PRICE IS "$???" IN THE DESIGN, and it stays unresolved here rather than
 * being invented: what a top-up costs is a commercial decision the client must
 * not guess, and per-unit pricing has to come from the server anyway. The card
 * shows a placeholder and the CTA is inert until that endpoint exists — a
 * "Confirm & Buy" that charges an amount the app made up is the one failure
 * mode worth engineering against.
 *
 * Inputs are numeric and validated to "at least one positive quantity", so the
 * button cannot be armed by an empty or zero order.
 */
const CARD_RADIUS = 16;

/** Digits only — a quantity, and RN's numeric keyboards still allow separators. */
function toQuantity(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, '');
  return digits ? Number.parseInt(digits, 10) : 0;
}

export default function RequestExtraCard(): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();

  const [requests, setRequests] = useState('');
  const [tokens, setTokens] = useState('');

  const canBuy = useMemo(
    () => toQuantity(requests) > 0 || toQuantity(tokens) > 0,
    [requests, tokens],
  );

  return (
    <View
      style={{
        backgroundColor: theme.color.surface,
        borderRadius: CARD_RADIUS,
        borderWidth: 0.8,
        borderColor: theme.color.border,
        padding: 26,
      }}
      testID="request-extra-card"
    >
      <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>
        {t('chat.upgrade.extra.name')}
      </AppText>

      <View
        style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.space.sm, paddingTop: 4 }}
      >
        <AppText style={{ ...theme.type.h3, color: theme.color.textPrimary }}>
          {t('chat.upgrade.extra.price')}
        </AppText>
        <AppText style={{ ...theme.type.caption, color: theme.color.textPrimary }}>
          {t('chat.upgrade.extra.priceNote')}
        </AppText>
      </View>

      <View style={{ paddingTop: theme.space.xl, paddingBottom: 32, gap: theme.space.lg }}>
        <TextField
          value={requests}
          onChangeText={setRequests}
          placeholder={t('chat.upgrade.extra.requestsPlaceholder')}
          keyboardType="number-pad"
          testID="extra-requests"
        />
        <TextField
          value={tokens}
          onChangeText={setTokens}
          placeholder={t('chat.upgrade.extra.tokensPlaceholder')}
          keyboardType="number-pad"
          testID="extra-tokens"
        />
      </View>

      <AppButton
        label={t('chat.upgrade.extra.cta')}
        variant="inverse"
        disabled={!canBuy}
        onPress={() => {
          // TODO(backend): price the order server-side, then open the store
          // purchase flow. Deliberately inert — see the header.
        }}
        testID="extra-cta"
      />
    </View>
  );
}
