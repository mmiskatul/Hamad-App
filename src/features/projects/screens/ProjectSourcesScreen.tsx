import React from 'react';
import { ScrollView, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Cancel01Icon,
  Download01Icon,
  Folder01Icon,
  UploadCircle01Icon,
} from '@hugeicons/core-free-icons';
import { useShallow } from 'zustand/react/shallow';

import { useProjectStore, type Project } from '../store/projectStore';

import { formatRowDate, formatRowTime } from '@/shared/format';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import AppButton from '@/shared/ui/AppButton';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import MetaListRow from '@/shared/ui/MetaListRow';
import ScreenHeader from '@/shared/ui/ScreenHeader';

/*
 * Project sources — ONE screen with two states, exactly as the file draws them:
 * 168:2002 is the pitch ("Give more context" + Add Sources) and 170:2091 is the
 * populated list. Two frames, one screen, same as the project list's empty and
 * filled states.
 *
 * FLOW STATE: the project comes from the store's `editingId`, never a route
 * param (mobile/CLAUDE.md), and hydration is checked BEFORE the redirect — a
 * persisted store reads null on the first frame, and redirecting off that would
 * bounce a user who does have a project.
 *
 * TODO(backend): both add paths (the header ⬆ and the empty state's CTA) need
 * expo-document-picker plus an upload endpoint, and download needs a signed
 * URL. They are wired to the same handler so there is one place to fill in.
 * Until then the screen shows its empty state, which is the honest answer:
 * nothing can add a source yet.
 */
const CONTENT_WIDTH = 370;
const PITCH_WIDTH = 312;
const PITCH_BADGE = 44;

export default function ProjectSourcesScreen(): React.JSX.Element {
  const editingId = useProjectStore((state) => state.editingId);
  const projects = useProjectStore(useShallow((state) => state.projects));
  const hasHydrated = useProjectStore((state) => state.hasHydrated);

  const project = projects.find((item) => item.id === editingId) ?? null;

  if (!hasHydrated) return <View />;
  if (!project) return <Redirect href="/projects" />;

  return <ProjectSourcesContent project={project} />;
}

function ProjectSourcesContent({ project }: { project: Project }): React.JSX.Element {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const removeSource = useProjectStore((state) => state.removeSource);

  const onAdd = () => {
    // TODO(backend): expo-document-picker → upload → addSource(project.id, …).
  };

  const empty = project.sources.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <ScreenHeader
        title={t('projects.sources.title')}
        fallbackHref="/projects"
        actions={[
          {
            id: 'add',
            icon: UploadCircle01Icon,
            label: t('projects.sources.add'),
            onPress: onAdd,
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: empty ? 'center' : 'flex-start',
          paddingTop: empty ? 0 : theme.space.xl,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: theme.space.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {empty ? (
          <View
            style={{ width: '100%', maxWidth: PITCH_WIDTH, alignItems: 'center', gap: theme.space.xl }}
            testID="sources-empty"
          >
            {/*
              Pitch card (Figma 168:2002): the folder badge and the pitch copy
              share one rounded surface, so the empty state reads as a unit.
              The Add Sources CTA sits BELOW the card (not inside) so the
              button is its own clickable target on the canvas.
            */}
            <View
              style={{
                width: '100%',
                alignItems: 'center',
                gap: theme.space.md,
                paddingVertical: theme.space.xl,
                paddingHorizontal: theme.space.lg,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.color.surface,
              }}
            >
              <View
                style={{
                  width: PITCH_BADGE,
                  height: PITCH_BADGE,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.color.muted,
                }}
              >
                <Icon icon={Folder01Icon} size={20} color={theme.color.textPrimary} />
              </View>

              <AppText
                style={{ ...theme.type.h4, color: theme.color.textPrimary, textAlign: 'center' }}
              >
                {t('projects.sources.emptyTitle')}
              </AppText>
              <AppText
                style={{
                  ...theme.type.caption,
                  color: theme.color.textSecondary,
                  textAlign: 'center',
                }}
              >
                {t('projects.sources.emptyBody')}
              </AppText>
            </View>

            <View style={{ width: '100%' }}>
              <AppButton
                label={t('projects.sources.cta')}
                variant="inverse"
                pill
                icon={UploadCircle01Icon}
                onPress={onAdd}
                testID="sources-empty-cta"
              />
            </View>
          </View>
        ) : (
          <View style={{ width: '100%', maxWidth: CONTENT_WIDTH, gap: theme.space.sm }}>
            {project.sources.map((source, index) => (
              <MetaListRow
                key={source.id}
                title={source.name}
                time={formatRowTime(source.at, i18n.language)}
                date={formatRowDate(source.at, i18n.language)}
                divider={index < project.sources.length - 1}
                actions={[
                  {
                    id: 'download',
                    icon: Download01Icon,
                    label: t('projects.sources.download', { name: source.name }),
                    onPress: () => {
                      // TODO(backend): signed URL + expo-file-system, same as
                      // the chat files list.
                    },
                  },
                  {
                    id: 'remove',
                    icon: Cancel01Icon,
                    label: t('projects.sources.remove', { name: source.name }),
                    onPress: () => removeSource(project.id, source.id),
                  },
                ]}
                testID={`source-row-${source.id}`}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
