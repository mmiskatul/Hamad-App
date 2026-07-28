import React, { useCallback, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import AttachmentMenu from '../components/AttachmentMenu';
import ChatComposer from '../components/ChatComposer';
import ChatDrawer from '../components/ChatDrawer';
import ChatMenu, { type ChatMenuAction } from '../components/ChatMenu';
import ChatTopBar from '../components/ChatTopBar';
import ModelMenu from '../components/ModelMenu';
import RenameChatDialog from '../components/RenameChatDialog';
import UpsellDialog from '../components/UpsellDialog';
import WelcomeHero from '../components/WelcomeHero';
import { findModel } from '../constants';
import { shouldShowUpsell, useChatStore } from '../store/chatStore';

import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import useKeyboardOpen from '@/shared/ui/useKeyboardOpen';
import { useCanUpgrade } from '@/shared/plan';
import { useTheme } from '@/shared/theme';

/*
 * Chat home (Figma 404:1772 empty state, 404:804 with the drawer open).
 *
 * This screen owns the four dismissible surfaces, because they are all opened
 * from its chrome and must be mutually exclusive — two overlays on screen at
 * once is a stack of scrims and a trapped user. `surface` is therefore ONE piece
 * of state, not four booleans that can disagree:
 *   drawer     ← hamburger
 *   models     ← the model pill's chevron
 *   attach     ← the composer's +
 *   upsell     ← automatically, after the session's 2nd prompt
 *
 * ADAPTIVE: all colour comes from useTheme() (node 404:1772 is the light
 * variant; the user's reference render is dark).
 *
 * TODO(backend): sending currently records the prompt locally so Recents and the
 * upsell counter behave; the actual completion goes through
 * backend/src/ai/routing.service.ts once the chat module exists, and the
 * conversation view replaces this welcome hero as soon as a chat has messages.
 */
const SCREEN_PADDING = 16;
const TOP_BAR_TOP = 22; // Figma top 74 − the 52pt status bar band
const COMPOSER_BOTTOM_GAP = 8;

type Surface = 'none' | 'drawer' | 'models' | 'attach' | 'upsell' | 'chatMenu' | 'rename';

/* Recents row height + gap, used to hang the long-press menu near its row. */
const DRAWER_ROW_PITCH = 52;
const DRAWER_RECENTS_TOP = 300;

export default function ChatHomeScreen(): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const model = useChatStore((state) => state.model);
  const setModel = useChatStore((state) => state.setModel);
  const sendPrompt = useChatStore((state) => state.sendPrompt);
  const startNewChat = useChatStore((state) => state.startNewChat);
  const markUpsellSeen = useChatStore((state) => state.markUpsellSeen);
  const conversations = useChatStore(useShallow((state) => state.conversations));
  const openConversation = useChatStore((state) => state.openConversation);
  const renameConversation = useChatStore((state) => state.renameConversation);
  const togglePinned = useChatStore((state) => state.togglePinned);
  const deleteConversation = useChatStore((state) => state.deleteConversation);

  const canUpgrade = useCanUpgrade();

  const [draft, setDraft] = useState('');
  const [surface, setSurface] = useState<Surface>('none');

  /*
   * Hero collapses to the logomark only while the keyboard is open. The
   * composer is the only thing that opens the IME on this screen, so the
   * single signal "keyboard up ⇔ user is interacting with the composer"
   * covers both focus-only and typing without checking focus separately. The
   * draft text alone is NOT a trigger — pasting then dismissing the keyboard
   * (or state restoration from /conversation) leaves the title/subtitle/
   * Upgrade chip visible.
   */
  const keyboardOpen = useKeyboardOpen();
  const heroHidden = keyboardOpen;
  /* The conversation a row menu / rename dialog is acting on. */
  const [targetId, setTargetId] = useState<string | null>(null);
  const [menuTop, setMenuTop] = useState(0);

  const closeSurface = useCallback(() => setSurface('none'), []);

  const onOpenMenu = useCallback(() => setSurface('drawer'), []);
  const onOpenModelPicker = useCallback(() => setSurface('models'), []);
  const onAttach = useCallback(() => setSurface('attach'), []);
  const onVoice = useCallback(() => {
    // TODO(backend): voice input is a Pro/Business feature (plan matrix)
    // and needs the speech module.
  }, []);
  const onPickAttachment = useCallback(() => {
    // TODO(backend): file upload is a Pro/Business feature and needs
    // expo-image-picker / expo-document-picker plus the upload endpoint.
  }, []);
  const onSeeAll = useCallback(() => {
    closeSurface();
    router.push('/chat-history');
  }, [closeSurface, router]);
  const onProjects = useCallback(() => {
    closeSurface();
    router.push('/projects');
  }, [closeSurface, router]);
  const onOpenConversation = useCallback(
    (id: string) => {
      openConversation(id);
      router.push('/conversation');
    },
    [openConversation, router],
  );
  const onRenameDismiss = useCallback(() => {
    closeSurface();
    setTargetId(null);
  }, [closeSurface]);
  const onRenameSubmit = useCallback(
    (title: string) => {
      if (targetId) renameConversation(targetId, title);
    },
    [targetId, renameConversation],
  );

  const target = conversations.find((conversation) => conversation.id === targetId) ?? null;

  const onSend = useCallback(
    (message: string) => {
      sendPrompt(message);
      setDraft('');

      // Read the state AFTER the write so the count includes this prompt. The
      // nudge is only for the Free tier — selling Pro to a Pro subscriber is
      // worse than saying nothing.
      if (canUpgrade && shouldShowUpsell(useChatStore.getState())) {
        setSurface('upsell');
      }

      /*
       * Hand off to the transcript. sendPrompt() has just created the
       * conversation and pointed activeId at it, so /conversation resolves
       * immediately; the reply is requested there, which is also what makes the
       * thinking indicator appear in the right place.
       *
       * PUSH, not replace: back from a conversation should land on the welcome
       * screen, which is where the user started.
       */
      router.push('/conversation');
    },
    [sendPrompt, canUpgrade, router],
  );

  const onNewChat = useCallback(() => {
    // The open conversation is already in Recents (sendPrompt put it there the
    // moment it got its first prompt), so this only clears the pointer — a new
    // chat can never discard the previous one.
    startNewChat();
    setDraft('');
    closeSurface();
  }, [startNewChat, closeSurface]);

  const openUpgrade = useCallback(() => {
    closeSurface();
    markUpsellSeen();
    router.push('/upgrade');
  }, [closeSurface, markUpsellSeen, router]);

  const onConversationMenu = useCallback(
    (id: string, index: number) => {
      setTargetId(id);
      setMenuTop(insets.top + DRAWER_RECENTS_TOP + index * DRAWER_ROW_PITCH);
      // Replaces the drawer rather than stacking on it — one overlay at a time.
      setSurface('chatMenu');
    },
    [insets.top],
  );

  const onMenuAction = useCallback(
    (action: ChatMenuAction) => {
      if (!targetId) return;

      switch (action) {
        case 'new':
          onNewChat();
          break;
        case 'rename':
          setSurface('rename');
          return; // the dialog still needs targetId
        case 'pin':
          togglePinned(targetId);
          break;
        case 'files':
          openConversation(targetId);
          router.push('/chat-files');
          break;
        case 'share':
          // TODO(backend): needs a server-issued share id.
          break;
        case 'delete':
          deleteConversation(targetId);
          break;
      }
      setTargetId(null);
    },
    [targetId, onNewChat, togglePinned, openConversation, deleteConversation, router],
  );

  const openAccount = useCallback(() => {
    // Close first: the drawer must not still be open underneath when the user
    // comes back from settings.
    closeSurface();
    router.push('/profile');
  }, [closeSurface, router]);

  const dismissUpsell = useCallback(() => {
    // Seen counts as dismissed: it must not reappear on the next prompt.
    markUpsellSeen();
    closeSurface();
  }, [markUpsellSeen, closeSurface]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <KeyboardAvoider style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + TOP_BAR_TOP,
            paddingBottom: insets.bottom + COMPOSER_BOTTOM_GAP,
            paddingHorizontal: SCREEN_PADDING,
          }}
        >
          <ChatTopBar
            model={findModel(model).name}
            onOpenMenu={onOpenMenu}
            onOpenModelPicker={onOpenModelPicker}
          />

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {heroHidden ? (
              <ScrollView
                contentContainerStyle={{
                  flexGrow: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: theme.space.lg,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={{ alignSelf: 'stretch' }}
              >
                <WelcomeHero compact />
              </ScrollView>
            ) : (
              <WelcomeHero onUpgrade={openUpgrade} />
            )}
          </View>

          <ChatComposer
            value={draft}
            onChangeText={setDraft}
            onSend={onSend}
            onAttach={onAttach}
            onVoice={onVoice}
          />
        </View>
      </KeyboardAvoider>

      <AttachmentMenu
        visible={surface === 'attach'}
        onDismiss={closeSurface}
        onPick={onPickAttachment}
      />

      <ChatDrawer
        visible={surface === 'drawer'}
        onDismiss={closeSurface}
        onNewChat={onNewChat}
        onUpgrade={openUpgrade}
        onAccount={openAccount}
        onSeeAll={onSeeAll}
        onProjects={onProjects}
        onOpenConversation={onOpenConversation}
        onConversationMenu={onConversationMenu}
      />

      <ChatMenu
        visible={surface === 'chatMenu'}
        onDismiss={closeSurface}
        top={menuTop}
        pinned={target?.pinned ?? false}
        onAction={onMenuAction}
      />

      <RenameChatDialog
        visible={surface === 'rename'}
        title={target?.title ?? ''}
        onDismiss={onRenameDismiss}
        onSubmit={onRenameSubmit}
      />

      <ModelMenu
        visible={surface === 'models'}
        onDismiss={closeSurface}
        selected={model}
        onSelect={setModel}
        onUpgrade={openUpgrade}
      />

      <UpsellDialog
        visible={surface === 'upsell'}
        onDismiss={dismissUpsell}
        onUpgrade={openUpgrade}
      />
    </View>
  );
}
