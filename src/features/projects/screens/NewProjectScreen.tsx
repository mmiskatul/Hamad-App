import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createProject, projectErrorMessage } from '../projectApi';
import { useProjectStore, type ProjectScope } from '../store/projectStore';

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

const SCOPES: readonly ProjectScope[] = ['default', 'project-only'];

export default function NewProjectScreen(): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const createProjectLocal = useProjectStore((state) => state.createProject);
  const upsertProject = useProjectStore((state) => state.upsertProject);
  const removeProjectRecord = useProjectStore((state) => state.removeProjectRecord);
  const setError = useProjectStore((state) => state.setError);

  const [name, setName] = useState('');
  const [scope, setScope] = useState<ProjectScope>('default');

  const close = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/projects');
  }, [router]);

  const onCreate = useCallback(() => {
    if (name.trim().length === 0) return;

    const tempId = createProjectLocal({ name, scope });
    setError(null);
    close();

    void readAuthSession()
      .then((session) => {
        if (!session) return null;
        return createProject({ name, scope }).then((createdProject) => {
          removeProjectRecord(tempId);
          upsertProject(createdProject);
        });
      })
      .catch((createError) => {
        setError(projectErrorMessage(createError, 'Could not create the project.'));
      });
  }, [close, createProjectLocal, name, removeProjectRecord, scope, setError, upsertProject]);

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
            {t('projects.new')}
          </AppText>

          <IconPillButton
            icon={Cancel01Icon}
            size={HEADER_SIZE}
            iconSize={24}
            filled
            accessibilityLabel={t('common.cancel')}
            onPress={close}
            testID="new-project-close"
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
              testID="new-project-name"
            />

            <View style={{ gap: theme.space.xl }} accessibilityRole="radiogroup">
              {SCOPES.map((option) => (
                <RadioOption
                  key={option}
                  label={t(`projects.scope.${option}.title`)}
                  description={t(`projects.scope.${option}.body`)}
                  selected={scope === option}
                  onPress={() => setScope(option)}
                  testID={`new-project-scope-${option}`}
                />
              ))}
            </View>

            <AppButton
              label={t('projects.create')}
              variant="inverse"
              pill
              disabled={name.trim().length === 0}
              onPress={onCreate}
              testID="new-project-create"
            />
          </View>
        </ScrollView>
      </KeyboardAvoider>
    </View>
  );
}