import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { useShallow } from 'zustand/react/shallow';

import { useProjectStore } from '../store/projectStore';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import AppButton from '@/shared/ui/AppButton';
import { AppText } from '@/shared/ui/AppText';
import IconPillButton from '@/shared/ui/IconPillButton';
import RadioOption from '@/shared/ui/RadioOption';
import TextField from '@/shared/ui/TextField';

/*
 * Rename Project (Figma 152:1914): the New Project form with the name field
 * live and the memory-scope option rendered INERT at 30% opacity.
 *
 * That dimming is a real product rule, not decoration: a project's memory scope
 * decides what its chats could already read, so flipping it after the fact would
 * retroactively change what has been shared. The design shows it visible but
 * untouchable — the user can see what they chose without being able to undo it
 * here.
 *
 * FLOW STATE: the project being renamed comes from the store's `editingId`, not
 * a route param (mobile/CLAUDE.md). A deep link straight to /project-rename has
 * no project to act on, so it redirects to the list rather than rendering a form
 * whose Save would do nothing.
 */
const CONTENT_WIDTH = 370;
const HEADER_TOP = 22;
const HEADER_SIZE = 52;

export default function RenameProjectScreen(): React.JSX.Element {
  const editingId = useProjectStore((state) => state.editingId);
  const projects = useProjectStore(useShallow((state) => state.projects));
  const hasHydrated = useProjectStore((state) => state.hasHydrated);

  const project = projects.find((item) => item.id === editingId) ?? null;

  // Persisted stores hydrate asynchronously — never redirect off a null that
  // has not been read from disk yet (mobile/CLAUDE.md).
  if (!hasHydrated) return <View />;
  if (!project) return <Redirect href="/projects" />;

  return <RenameProjectForm id={project.id} initialName={project.name} scope={project.scope} />;
}

function RenameProjectForm({
  id,
  initialName,
  scope,
}: {
  id: string;
  initialName: string;
  scope: 'default' | 'project-only';
}): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const renameProject = useProjectStore((state) => state.renameProject);
  const setEditingId = useProjectStore((state) => state.setEditingId);

  const [name, setName] = useState(initialName);

  const close = useCallback(() => {
    setEditingId(null);
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/projects');
  }, [setEditingId, router]);

  const onSave = useCallback(() => {
    renameProject(id, name);
    close();
  }, [renameProject, id, name, close]);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && trimmed !== initialName;

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <View style={{ paddingTop: insets.top + HEADER_TOP, paddingHorizontal: theme.space.lg }}>
        <View style={{ height: HEADER_SIZE, justifyContent: 'center' }}>
          <AppText
            numberOfLines={1}
            style={{
              ...theme.type.h4,
              color: theme.color.textPrimary,
              position: 'absolute',
              start: 0,
              end: 0,
              textAlign: 'center',
            }}
          >
            {t('projects.rename')}
          </AppText>

          <IconPillButton
            icon={Cancel01Icon}
            size={HEADER_SIZE}
            iconSize={24}
            filled
            accessibilityLabel={t('common.cancel')}
            onPress={close}
            testID="rename-project-close"
          />
        </View>
      </View>

      <KeyboardAvoider style={{ flex: 1 }}>
        {/*
          ScrollView, not View: with the name field, the scope description and
          the Save CTA, the form is taller than the keyboard leaves on a small
          phone. Without scrolling the Save button sits under the keyboard and
          the user can't tap it. The ScrollView shrinks as the KeyboardAvoider
          shrinks (its flex:1 contract), so the user can scroll the button into
          view.
        */}
        <ScrollView
          contentContainerStyle={{
            alignItems: 'center',
            paddingTop: theme.space.xl,
            paddingBottom: insets.bottom + theme.space.xl,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              width: '100%',
              maxWidth: CONTENT_WIDTH,
              paddingHorizontal: theme.space.lg,
              gap: 28,
            }}
          >
            <TextField
              variant="filled"
              value={name}
              onChangeText={setName}
              placeholder={t('projects.namePlaceholder')}
              autoFocus
              testID="rename-project-name"
            />

            <RadioOption
              label={t(`projects.scope.${scope}.title`)}
              description={t(`projects.scope.${scope}.body`)}
              selected
              disabled
              onPress={() => {
                /* inert by design — see the header */
              }}
              testID="rename-project-scope"
            />

            <AppButton
              label={t('common.save')}
              variant="inverse"
              pill
              disabled={!canSave}
              onPress={onSave}
              testID="rename-project-save"
            />
          </View>
        </ScrollView>
      </KeyboardAvoider>
    </View>
  );
}
