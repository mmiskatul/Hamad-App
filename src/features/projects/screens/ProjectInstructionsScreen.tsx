import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { useShallow } from 'zustand/react/shallow';

import { useProjectStore } from '../store/projectStore';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import { AppText } from '@/shared/ui/AppText';
import IconPillButton from '@/shared/ui/IconPillButton';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import TextField from '@/shared/ui/TextField';

/*
 * Project instructions (Figma 152:1951): the persona/tone the model adopts
 * inside this project. Back pill, "Instructions" title, a ✓ commit button on
 * the end edge, an explainer, then a 224pt filled editor.
 *
 * The ✓ IS the save — there is no Cancel in the design, so leaving by Back
 * discards. That asymmetry is deliberate in the original and kept here: the
 * commit is explicit, and nothing is written per keystroke.
 *
 * FLOW STATE from the store's `editingId`, not a route param, with the same
 * hydration-safe gate as the rename screen (mobile/CLAUDE.md).
 */
const CONTENT_WIDTH = 370;
const HEADER_TOP = 22;
const HEADER_SIZE = 52;
const EDITOR_HEIGHT = 224;

export default function ProjectInstructionsScreen(): React.JSX.Element {
  const editingId = useProjectStore((state) => state.editingId);
  const projects = useProjectStore(useShallow((state) => state.projects));
  const hasHydrated = useProjectStore((state) => state.hasHydrated);

  const project = projects.find((item) => item.id === editingId) ?? null;

  if (!hasHydrated) return <View />;
  if (!project) return <Redirect href="/projects" />;

  return <InstructionsForm id={project.id} initial={project.instructions} />;
}

function InstructionsForm({ id, initial }: { id: string; initial: string }): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const setInstructions = useProjectStore((state) => state.setInstructions);
  const setEditingId = useProjectStore((state) => state.setEditingId);

  const [draft, setDraft] = useState(initial);

  const onSave = useCallback(() => {
    // TODO(backend): PATCH the project; instructions ride along with every
    // completion request once the chat module exists.
    setInstructions(id, draft);
    setEditingId(null);
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/projects');
  }, [setInstructions, id, draft, setEditingId, router]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <View>
        <ScreenHeader title={t('projects.instructions.title')} fallbackHref="/projects" />
        <View style={{ position: 'absolute', end: theme.space.lg, top: insets.top + HEADER_TOP }}>
          <IconPillButton
            icon={Tick02Icon}
            size={HEADER_SIZE}
            iconSize={24}
            filled
            accessibilityLabel={t('common.save')}
            onPress={onSave}
            testID="instructions-save"
          />
        </View>
      </View>

      <KeyboardAvoider style={{ flex: 1 }}>
        <View style={{ alignItems: 'center', paddingTop: theme.space.xl }}>
          <View
            style={{
              width: '100%',
              maxWidth: CONTENT_WIDTH,
              paddingHorizontal: theme.space.lg,
              gap: 44,
            }}
          >
            <View style={{ gap: theme.space.sm }}>
              <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>
                {t('projects.instructions.prompt')}
              </AppText>
              <AppText style={{ ...theme.type.body, color: theme.color.textSecondary }}>
                {t('projects.instructions.help')}
              </AppText>
            </View>

            <TextField
              variant="filled"
              value={draft}
              onChangeText={setDraft}
              placeholder={t('projects.instructions.placeholder')}
              multiline
              height={EDITOR_HEIGHT}
              testID="instructions-input"
            />
          </View>
        </View>
      </KeyboardAvoider>
    </View>
  );
}
