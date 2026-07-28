import React from 'react';
import { Pressable, View } from 'react-native';
import { Cancel01Icon, PinIcon } from '@hugeicons/core-free-icons';

import type { Project } from '../store/projectStore';

import { formatRowDate, formatRowTime } from '@/shared/format';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';

/*
 * Project list row (Figma 151:1742): a rounded surface card with a leading
 * pin marker (only when pinned), the project name, an optional description,
 * a "TIME • DATE" caption that gains a "• shared" segment for shared projects,
 * and a ✕ on the end edge.
 *
 * Card-on-canvas, NOT a hairline-divided list — matches the chat history
 * pattern (one conversation per surface) and the Figma frame.
 */
const ACTION_SIZE = 32;
const ACTION_GLYPH = 16;

export type ProjectRowProps = {
  project: Project;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
};

export default function ProjectRow({
  project,
  onPress,
  onLongPress,
  onDelete,
}: ProjectRowProps): React.JSX.Element {
  const theme = useTheme();
  const { t, i18n } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={project.name}
      android_ripple={{ color: theme.color.accentSoft }}
      style={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.md,
        paddingHorizontal: theme.space.lg,
        paddingVertical: theme.space.md,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.color.surface,
      }}
      testID={`project-row-${project.id}`}
    >
      {/*
        Pin glyph, when set, sits at the start of the row so the title doesn't
        shift between pinned and unpinned states. When not pinned the slot is
        empty (no dot) — the icon is meaningful, not a bullet.
      */}
      {project.pinned ? (
        <Icon icon={PinIcon} size={16} color={theme.color.textPrimary} />
      ) : null}

      <View style={{ flex: 1, gap: theme.space.xs }}>
        <AppText
          numberOfLines={1}
          style={{ ...theme.type.body, color: theme.color.textPrimary }}
        >
          {project.name}
        </AppText>

        {project.description ? (
          <AppText
            numberOfLines={1}
            style={{ ...theme.type.body, color: theme.color.textSecondary }}
          >
            {project.description}
          </AppText>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MetaText>{formatRowTime(project.updatedAt, i18n.language)}</MetaText>
          <MetaDot />
          <MetaText>{formatRowDate(project.updatedAt, i18n.language)}</MetaText>
          {project.shared ? (
            <>
              <MetaDot />
              <MetaText accent>{t('projects.row.shared')}</MetaText>
            </>
          ) : null}
        </View>
      </View>

      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={t('projects.row.delete', { name: project.name })}
        hitSlop={8}
        android_ripple={{ color: theme.color.accentSoft, borderless: true }}
        style={{
          width: ACTION_SIZE,
          height: ACTION_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radius.pill,
        }}
        testID={`project-row-${project.id}-delete`}
      >
        <Icon icon={Cancel01Icon} size={ACTION_GLYPH} color={theme.color.textPrimary} />
      </Pressable>
    </Pressable>
  );
}

function MetaText({
  children,
  accent = false,
}: {
  children: string;
  accent?: boolean;
}): React.JSX.Element {
  const theme = useTheme();

  return (
    <AppText
      style={{
        ...theme.type.tag,
        // The "shared" marker is the one tinted segment in the design.
        color: accent ? theme.color.accent : theme.color.textSecondary,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </AppText>
  );
}

function MetaDot(): React.JSX.Element {
  const theme = useTheme();

  return (
    <View
      style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: theme.color.textSecondary }}
    />
  );
}
