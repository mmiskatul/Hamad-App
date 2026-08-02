import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Add01Icon, Folder01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { useShallow } from 'zustand/react/shallow';

import ProjectMenu, { type ProjectMenuAction } from '../components/ProjectMenu';
import ProjectRow from '../components/ProjectRow';
import {
  deleteProject,
  projectErrorMessage,
  refreshProjects,
  updateProject,
} from '../projectApi';
import {
  PROJECT_FILTERS,
  useProjectStore,
  visibleProjects,
  type Project,
  type ProjectFilter,
} from '../store/projectStore';

import { readAuthSession } from '@/shared/auth';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import AppButton from '@/shared/ui/AppButton';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import IconPillButton from '@/shared/ui/IconPillButton';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import ScreenHeader from '@/shared/ui/ScreenHeader';

const CONTENT_WIDTH = 370;
const EMPTY_WIDTH = 312;
const CHIP_HEIGHT = 32;
const LIST_TOP = 200;
const ROW_PITCH = 88;

export type ProjectListScreenProps = {
  onOpenProject?: (project: Project) => void;
};

export default function ProjectListScreen({
  onOpenProject,
}: ProjectListScreenProps = {}): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { projects, filter, isRefreshing, error } = useProjectStore(useShallow((state) => ({
    projects: state.projects,
    filter: state.filter,
    isRefreshing: state.isRefreshing,
    error: state.error,
  })));
  const setFilter = useProjectStore((state) => state.setFilter);
  const setEditingId = useProjectStore((state) => state.setEditingId);
  const togglePinnedLocal = useProjectStore((state) => state.togglePinned);
  const removeProjectRecord = useProjectStore((state) => state.removeProjectRecord);
  const upsertProject = useProjectStore((state) => state.upsertProject);
  const setRefreshing = useProjectStore((state) => state.setRefreshing);
  const setError = useProjectStore((state) => state.setError);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [menuTop, setMenuTop] = useState(0);

  const visible = useMemo(
    () => visibleProjects(projects, filter, query),
    [projects, filter, query],
  );
  const target = projects.find((project) => project.id === menuFor) ?? null;

  const loadProjects = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshProjects();
      setError(null);
    } catch (loadError) {
      setError(projectErrorMessage(loadError, 'Could not refresh projects.'));
    } finally {
      setRefreshing(false);
    }
  }, [setError, setRefreshing]);

  const removeProject = useCallback((projectId: string) => {
    removeProjectRecord(projectId);
    setError(null);

    void readAuthSession()
      .then((session) => {
        if (!session) return null;
        return deleteProject(projectId);
      })
      .catch((removeError) => {
        setError(projectErrorMessage(removeError, 'Could not delete the project.'));
      });
  }, [removeProjectRecord, setError]);

  const toggleProjectPinned = useCallback((project: Project) => {
    togglePinnedLocal(project.id);
    setError(null);

    void readAuthSession()
      .then((session) => {
        if (!session) return null;
        return updateProject(project.id, { pinned: !project.pinned }).then((updatedProject) => {
          upsertProject(updatedProject);
        });
      })
      .catch((updateError) => {
        setError(projectErrorMessage(updateError, 'Could not update the project.'));
      });
  }, [setError, togglePinnedLocal, upsertProject]);

  const onAction = useCallback(
    (action: ProjectMenuAction) => {
      if (!menuFor) return;

      switch (action) {
        case 'rename':
          setEditingId(menuFor);
          router.push('/project-rename');
          break;
        case 'instructions':
          setEditingId(menuFor);
          router.push('/project-instructions');
          break;
        case 'pin':
          if (target) {
            toggleProjectPinned(target);
          }
          break;
        case 'delete':
          removeProject(menuFor);
          break;
        case 'sources':
          setEditingId(menuFor);
          router.push('/project-sources');
          break;
        case 'newChat':
          router.push('/project-new');
          break;
        case 'files':
          router.push('/chat-files');
          break;
        case 'share':
          break;
      }
      setMenuFor(null);
    },
    [menuFor, removeProject, router, setEditingId, target, toggleProjectPinned],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <View>
        <ScreenHeader title={t('projects.title')} />
        <View
          style={{
            position: 'absolute',
            end: theme.space.lg,
            top: insets.top + 22,
          }}
        >
          <IconPillButton
            icon={Add01Icon}
            size={52}
            iconSize={24}
            filled
            accessibilityLabel={t('projects.new')}
            onPress={() => router.push('/project-new')}
            testID="projects-add"
          />
        </View>
      </View>

      <FilterChips filter={filter} onChange={setFilter} />

      {error ? (
        <View
          style={{
            marginHorizontal: theme.space.lg,
            marginTop: theme.space.md,
            padding: theme.space.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.color.surface,
          }}
          testID="projects-error"
        >
          <AppText style={{ ...theme.type.caption, color: theme.color.textSecondary }}>
            {error}
          </AppText>
        </View>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState onCreate={() => router.push('/project-new')} hasProjects={projects.length > 0} />
      ) : (
        <ScrollView
          contentContainerStyle={{
            alignItems: 'center',
            paddingHorizontal: theme.space.lg,
            paddingTop: theme.space.xl,
            paddingBottom: insets.bottom + theme.space.lg + 52 + theme.space.xl,
            gap: theme.space.sm,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                loadProjects().catch(() => undefined);
              }}
              tintColor={theme.color.accent}
              colors={[theme.color.accent]}
            />
          )}
        >
          {visible.map((project, index) => (
            <View key={project.id} style={{ width: '100%', maxWidth: CONTENT_WIDTH }}>
              <ProjectRow
                project={project}
                onPress={() => onOpenProject?.(project)}
                onLongPress={() => {
                  setMenuFor(project.id);
                  setMenuTop(insets.top + LIST_TOP + index * ROW_PITCH);
                }}
                onDelete={() => removeProject(project.id)}
              />
            </View>
          ))}
        </ScrollView>
      )}

      <KeyboardAvoider
        mode="translate"
        style={{
          position: 'absolute',
          start: theme.space.lg,
          end: theme.space.lg,
          bottom: insets.bottom + theme.space.lg,
        }}
      >
        <Pressable
          onPress={() => setSearching(true)}
          accessibilityRole="search"
          accessibilityLabel={t('projects.search')}
          android_ripple={{ color: theme.color.accentSoft }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space.md,
            minHeight: 52,
            paddingHorizontal: theme.space.xl,
            paddingVertical: 14,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.color.surface,
            overflow: 'hidden',
          }}
          testID="projects-search"
        >
          <Icon icon={Search01Icon} size={24} color={theme.color.textPrimary} />
          {searching ? (
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              onBlur={() => {
                if (!query) setSearching(false);
              }}
              placeholder={t('projects.search')}
              placeholderTextColor={theme.color.textSecondary}
              selectionColor={theme.color.accent}
              style={{ ...theme.type.body, flex: 1, color: theme.color.textPrimary, padding: 0 }}
              testID="projects-search-input"
            />
          ) : (
            <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>
              {t('projects.search')}
            </AppText>
          )}
        </Pressable>
      </KeyboardAvoider>

      <ProjectMenu
        visible={menuFor !== null}
        onDismiss={() => setMenuFor(null)}
        top={menuTop}
        pinned={target?.pinned ?? false}
        onAction={onAction}
      />
    </View>
  );
}

function FilterChips({
  filter,
  onChange,
}: {
  filter: ProjectFilter;
  onChange: (filter: ProjectFilter) => void;
}): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: theme.space.sm,
        paddingHorizontal: theme.space.lg,
        paddingTop: theme.space.lg,
      }}
    >
      {PROJECT_FILTERS.map((option) => {
        const active = option === filter;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            android_ripple={{ color: theme.color.accentSoft }}
            style={{
              minHeight: CHIP_HEIGHT,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: theme.space.md,
              paddingVertical: theme.space.sm,
              borderRadius: theme.radius.pill,
              backgroundColor: active ? theme.color.surface : 'transparent',
              borderWidth: active ? 0 : 1,
              borderColor: theme.color.borderStrong,
              overflow: 'hidden',
            }}
            testID={`projects-filter-${option}`}
          >
            <AppText
              style={{
                ...theme.type.body,
                color: active ? theme.color.textPrimary : theme.color.textSecondary,
              }}
            >
              {t(`projects.filters.${option}`)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function EmptyState({
  onCreate,
  hasProjects,
}: {
  onCreate: () => void;
  hasProjects: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: EMPTY_WIDTH, alignItems: 'center', gap: theme.space.xl }}>
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
              width: 44,
              height: 44,
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
            {hasProjects ? t('projects.empty.noMatchTitle') : t('projects.empty.title')}
          </AppText>
          <AppText
            style={{
              ...theme.type.caption,
              color: theme.color.textSecondary,
              textAlign: 'center',
            }}
          >
            {hasProjects ? t('projects.empty.noMatchBody') : t('projects.empty.body')}
          </AppText>
        </View>

        {hasProjects ? null : (
          <View style={{ width: '100%', alignItems: 'stretch' }}>
            <AppButton
              label={t('projects.empty.cta')}
              variant="inverse"
              onPress={onCreate}
              testID="projects-empty-cta"
            />
          </View>
        )}
      </View>
    </View>
  );
}