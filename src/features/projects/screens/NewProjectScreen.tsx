import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Cancel01Icon } from '@hugeicons/core-free-icons';

import { useProjectStore, type ProjectScope } from '../store/projectStore';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import AppButton from '@/shared/ui/AppButton';
import { AppText } from '@/shared/ui/AppText';
import IconPillButton from '@/shared/ui/IconPillButton';
import RadioOption from '@/shared/ui/RadioOption';
import TextField from '@/shared/ui/TextField';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/*
 * New Project (Figma 144:1229): a filled name field, the memory-scope choice,
 * and a Create CTA on the inverse surface.
 *
 * The header's leading control is a ✕, NOT a back arrow — this is a modal task
 * you abandon, not a place you navigate back from, and the design says so.
 *
 * Create is disabled until the project has a name: an unnamed project produces
 * a blank row in the list with nothing to identify or tap.
 */
const CONTENT_WIDTH = 370;
const HEADER_TOP = 22;
const HEADER_SIZE = 52;

const SCOPES: readonly ProjectScope[] = ['default', 'project-only'];

export default function NewProjectScreen(): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const createProject = useProjectStore((state) => state.createProject);

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
    // TODO(backend): POST the project; the store then caches the response.
    createProject({ name, scope });
    close();
  }, [createProject, name, scope, close]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      {/* Hand-rolled rather than ScreenHeader: the leading control is a ✕ that
          abandons the task, not a back arrow that pops a stack. */}
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
        {/*
          ScrollView, not View: with the name field, two radio descriptions and
          the Create CTA, the form is taller than the keyboard leaves on a small
          phone. Without scrolling the Create button sits under the keyboard and
          the user can't tap it — the reported bug. The ScrollView shrinks as
          the KeyboardAvoider shrinks (its flex:1 contract), so the user can
          scroll the button into view.
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
