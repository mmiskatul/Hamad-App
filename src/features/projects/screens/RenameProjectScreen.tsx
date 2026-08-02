import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { useShallow } from 'zustand/react/shallow';

import { projectErrorMessage, updateProject } from '../projectApi';
import { useProjectStore } from '../store/projectStore';

import { readAuthSession } from '@/shared/auth';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import AppButton from '@/shared/ui/AppButton';
import { AppText } from '@/shared/ui/AppText';
import IconPillButton from '@/shared/ui/IconPillButton';
import RadioOption from '@/shared/ui/RadioOption';
import TextField from '@/shared/ui/TextField';

const CONTENT_WIDTH = 370;
const HEADER_TOP = 22;
const HEADER_SIZE = 52;

export default function RenameProjectScreen(): React.JSX.Element {
  const editingId = useProjectStore((state) => state.editingId);
  const projects = useProjectStore(useShallow((state) => state.projects));
  const hasHydrated = useProjectStore((state) => state.hasHydrated);

  const project = projects.find((item) => item.id === editingId) ?? null;

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

  const renameProjectLocal = useProjectStore((state) => state.renameProject);
  const upsertProject = useProjectStore((state) => state.upsertProject);
  const setEditingId = useProjectStore((state) => state.setEditingId);
  const setError = useProjectStore((state) => state.setError);

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
    renameProjectLocal(id, name);
    setError(null);
    close();

    void readAuthSession()
      .then((session) => {
        if (!session) return null;
        return updateProject(id, { name }).then((updatedProject) => {
          upsertProject(updatedProject);
        });
      })
      .catch((saveError) => {
        setError(projectErrorMessage(saveError, 'Could not rename the project.'));
      });
  }, [close, id, name, renameProjectLocal, setError, upsertProject]);

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
                /* inert by design */
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