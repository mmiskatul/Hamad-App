import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Add01Icon, Folder01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { useShallow } from 'zustand/react/shallow';

import ProjectMenu, { type ProjectMenuAction } from '../components/ProjectMenu';
import ProjectRow from '../components/ProjectRow';
import {
  PROJECT_FILTERS,
  useProjectStore,
  visibleProjects,
  type Project,
  type ProjectFilter,
} from '../store/projectStore';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import AppButton from '@/shared/ui/AppButton';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import IconPillButton from '@/shared/ui/IconPillButton';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import ScreenHeader from '@/shared/ui/ScreenHeader';

/*
 * Projects (Figma 142:1070 empty, 151:1742 with content).
 *
 * ONE SCREEN, TWO STATES — the two Figma frames are the same screen with and
 * without rows, so they are not two components: the header, filter chips and
 * search pill are constant, and only the middle swaps between the empty pitch
 * and the list.
 *
 * The search pill at the bottom (Figma 144:1471) is a control, not a link to a
 * search screen — there is no search frame in the file. Tapping it turns the
 * pill into a live filter field, which keeps the interaction on one screen and
 * matches where the design put it.
 *
 * OPENING A PROJECT is a callback, not something this screen does itself.
 * A project workspace IS a chat scoped to the project, and creating one means
 * writing to the chat store — which this feature may not import. The ROUTE
 * file supplies the handler, because a route is a composition root and may
 * import both features (same pattern as src/app/index.tsx injecting the auth
 * feature's hydration task into shared bootstrap).
 */
const CONTENT_WIDTH = 370;
const EMPTY_WIDTH = 312;
const CHIP_HEIGHT = 32;
/* Distance from the top of the list to hang a row's long-press menu. */
const LIST_TOP = 200;
const ROW_PITCH = 88;

export type ProjectListScreenProps = {
  /** Open a project's workspace. Omitted, the rows are inert. */
  onOpenProject?: (project: Project) => void;
};

export default function ProjectListScreen({
  onOpenProject,
}: ProjectListScreenProps = {}): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const projects = useProjectStore(useShallow((state) => state.projects));
  const filter = useProjectStore((state) => state.filter);
  const setFilter = useProjectStore((state) => state.setFilter);
  const setEditingId = useProjectStore((state) => state.setEditingId);
  const togglePinned = useProjectStore((state) => state.togglePinned);
  const deleteProject = useProjectStore((state) => state.deleteProject);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [menuTop, setMenuTop] = useState(0);

  const visible = useMemo(
    () => visibleProjects(projects, filter, query),
    [projects, filter, query],
  );
  const target = projects.find((project) => project.id === menuFor) ?? null;

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
          togglePinned(menuFor);
          break;
        case 'delete':
          deleteProject(menuFor);
          break;
        case 'sources':
          setEditingId(menuFor);
          router.push('/project-sources');
          break;
        case 'newChat':
          // "New project chat" → create a new project from the list, which
          // hands off to the conversation view via the project-store bridge.
          router.push('/project-new');
          break;
        case 'files':
          // "Files in chat" from the project row menu → the Files screen.
          // The chat store has no active conversation yet from this entry
          // point, so the screen renders its empty state — the same honest
          // answer as on a brand-new chat.
          router.push('/chat-files');
          break;
        case 'share':
          // TODO: sharing needs a server-issued share id.
          break;
      }
      setMenuFor(null);
    },
    [menuFor, setEditingId, router, togglePinned, deleteProject],
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

      {visible.length === 0 ? (
        <EmptyState onCreate={() => router.push('/project-new')} hasProjects={projects.length > 0} />
      ) : (
        <ScrollView
          contentContainerStyle={{
            alignItems: 'center',
            paddingHorizontal: theme.space.lg,
            paddingTop: theme.space.xl,
            // paddingBottom clears the search pill (~52 high) plus its bottom
            // offset (insets.bottom + space.lg) and adds a gap of space.lg so
            // the last project card never sits flush against the pill.
            paddingBottom: insets.bottom + theme.space.lg + 52 + theme.space.xl,
            gap: theme.space.sm,
          }}
          showsVerticalScrollIndicator={false}
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
                onDelete={() => deleteProject(project.id)}
              />
            </View>
          ))}
        </ScrollView>
      )}

      {/*
        Search pill, pinned above the bottom inset (Figma 144:1471).

        It RIDES THE KEYBOARD. The pill is the thing being typed into, so leaving
        it at a fixed offset put it under the keyboard the moment it was tapped —
        the user could not see their own query. `translate` mode rather than
        padding because this is absolutely positioned: it is out of flow, so its
        `bottom` ignores any padding on the parent.
      */}
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
                // Collapse back to the pill only when nothing is being filtered,
                // so dismissing the keyboard does not silently drop the query.
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
              // Selected is a FILL, unselected is an outline (Figma 142:1152).
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
        {/*
         * Pitch card (Figma 142:1125): the icon and the empty-state copy share
         * one rounded surface, so the card reads as a unit. No projects at all
         * uses the full card; "no matches" hides the CTA below it because the
         * CTA would otherwise pitch a project the user already has.
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
            {/*
             * Two different empty states, one layout: no projects at all is a
             * pitch, while "no matches" must not tell a user with 20 projects
             * to start their first one.
             */}
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
          // Full width via the wrapper, NOT AppButton's `fill`: `fill` is flex:1,
          // which in a COLUMN would stretch the button vertically. `alignItems:
          // 'stretch'` lets the child AppButton fill the wrapper's width without
          // needing an explicit width on the child.
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
