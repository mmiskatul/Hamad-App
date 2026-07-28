import React from 'react';
import { Image, Pressable, View } from 'react-native';

import { profileInitial, useProfileStore } from '@/shared/profile';
import { useTheme } from '@/shared/theme';
import { AppText } from '@/shared/ui/AppText';
import { Icon, type IconProps } from '@/shared/ui/Icon';

/*
 * 92pt avatar with the small action badge on its end-bottom corner (Figma
 * 142:1001 on Profile, 142:1002 on the edit screen — same component, different
 * badge glyph: a pencil that opens the editor, a camera that picks a photo).
 *
 * The badge's 1.5pt ring is bg/canvas, not a border colour: it exists to punch
 * the badge out of the avatar behind it, so it has to match whatever the badge
 * sits on. Same trick as the notch in TextField.
 *
 * FALLBACK: the Figma mock shows a grey ellipse — a placeholder, not an asset.
 * With no photo we render the name's initial on bg/muted rather than shipping a
 * fake portrait or an empty circle.
 */
const AVATAR_SIZE = 92;
const BADGE_GLYPH = 16;
const BADGE_PADDING = 6;
const BADGE_RING = 1.5;

export type ProfileAvatarProps = {
  /** Badge glyph — pencil on the profile screen, camera on the editor. */
  badgeIcon: IconProps['icon'];
  onPressBadge?: () => void;
  badgeLabel: string;
  testID?: string;
};

export default function ProfileAvatar({
  badgeIcon,
  onPressBadge,
  badgeLabel,
  testID,
}: ProfileAvatarProps): React.JSX.Element {
  const theme = useTheme();
  const name = useProfileStore((state) => state.name);
  const avatarUri = useProfileStore((state) => state.avatarUri);

  return (
    <View style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }} testID={testID}>
      {avatarUri ? (
        <Image
          source={{ uri: avatarUri }}
          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: AVATAR_SIZE / 2,
            backgroundColor: theme.color.muted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          testID="profile-avatar-fallback"
        >
          <AppText style={{ ...theme.type.h3, color: theme.color.textSecondary }}>
            {profileInitial(name)}
          </AppText>
        </View>
      )}

      <Pressable
        onPress={onPressBadge}
        accessibilityRole="button"
        accessibilityLabel={badgeLabel}
        hitSlop={8}
        style={{
          position: 'absolute',
          bottom: 0,
          end: 0,
          padding: BADGE_PADDING,
          borderRadius: theme.radius.pill,
          borderWidth: BADGE_RING,
          borderColor: theme.color.canvas,
          backgroundColor: theme.color.muted,
        }}
        testID="profile-avatar-badge"
      >
        <Icon icon={badgeIcon} size={BADGE_GLYPH} color={theme.color.textPrimary} />
      </Pressable>
    </View>
  );
}
