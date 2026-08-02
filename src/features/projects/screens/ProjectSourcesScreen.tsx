import React, { useCallback } from 'react';
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

import { projectErrorMessage, removeProjectSource } from '../projectApi';
import { useProjectStore, type Project } from '../store/projectStore';

import { readAuthSession } from '@/shared/auth';
import { formatRowDate, formatRowTime } from '@/shared/format';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import AppButton from '@/shared/ui/AppButton';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import MetaListRow from '@/shared/ui/MetaListRow';
import ScreenHeader from '@/shared/ui/ScreenHeader';

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

  const removeSourceLocal = useProjectStore((state) => state.removeSource);
  const upsertProject = useProjectStore((state) => state.upsertProject);
  const setError = useProjectStore((state) => state.setError);

  const onAdd = () => {
    // TODO(backend): expo-document-picker -> upload -> addProjectSource(project.id, ...).
  };

  const onRemove = useCallback((sourceId: string) => {
    removeSourceLocal(project.id, sourceId);
    setError(null);

    void readAuthSession()
      .then((session) => {
        if (!session) return null;
        return removeProjectSource(project.id, sourceId).then((updated) => {
          upsertProject(updated);
        });
      })
      .catch((removeError) => {
        setError(projectErrorMessage(removeError, 'Could not remove the source.'));
      });
  }, [project.id, removeSourceLocal, setError, upsertProject]);

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
                      // TODO(backend): signed URL + expo-file-system, same as the chat files list.
                    },
                  },
                  {
                    id: 'remove',
                    icon: Cancel01Icon,
                    label: t('projects.sources.remove', { name: source.name }),
                    onPress: () => onRemove(source.id),
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