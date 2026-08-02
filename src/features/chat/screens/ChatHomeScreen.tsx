import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  deleteConversation as deleteConversationRemote,
  refreshConversations,
  updateConversation as updateConversationRemote,
} from '../api/conversationApi';
import AttachmentMenu from '../components/AttachmentMenu';
import ChatComposer from '../components/ChatComposer';
import ChatDrawer from '../components/ChatDrawer';
import ChatMenu, { type ChatMenuAction } from '../components/ChatMenu';
import ChatTopBar from '../components/ChatTopBar';
import DeleteChatDialog from '../components/DeleteChatDialog';
import ModelMenu from '../components/ModelMenu';
import RenameChatDialog from '../components/RenameChatDialog';
import UpsellDialog from '../components/UpsellDialog';
import WelcomeHero from '../components/WelcomeHero';
import { findModel } from '../constants';
import { useSendPrompt } from '../hooks/useSendPrompt';
import { shouldShowUpsell, useChatStore } from '../store/chatStore';

import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import useKeyboardOpen from '@/shared/ui/useKeyboardOpen';
import { ApiError } from '@/shared/api/client';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { useCanUpgrade } from '@/shared/plan';
import { useTheme } from '@/shared/theme';

const SCREEN_PADDING = 16;
const TOP_BAR_TOP = 22;
const COMPOSER_BOTTOM_GAP = 8;

type Surface =
  | 'none'
  | 'drawer'
  | 'models'
  | 'attach'
  | 'upsell'
  | 'chatMenu'
  | 'rename'
  | 'delete';

const DRAWER_ROW_PITCH = 52;
const DRAWER_RECENTS_TOP = 300;

export default function ChatHomeScreen(): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const model = useChatStore((state) => state.model);
  const setModel = useChatStore((state) => state.setModel);
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
  const keyboardOpen = useKeyboardOpen();
  const heroHidden = keyboardOpen;
  const [targetId, setTargetId] = useState<string | null>(null);
  const [menuTop, setMenuTop] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // The first message must use the same backend orchestration as follow-up
  // messages. Calling the store directly creates the local user turn and sets
  // `thinkingFor`, but never sends anything to Fastify, leaving the UI spinning.
  const sendReply = useSendPrompt(null);

  const closeSurface = useCallback(() => setSurface('none'), []);

  const onOpenMenu = useCallback(() => setSurface('drawer'), []);
  const onOpenModelPicker = useCallback(() => setSurface('models'), []);
  const onAttach = useCallback(() => setSurface('attach'), []);
  const onVoice = useCallback(() => {
    // TODO(backend): voice input is a Pro/Business feature and still needs the speech module.
  }, []);
  const onPickAttachment = useCallback(() => {
    // TODO(backend): file upload still needs a picker + upload endpoint.
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
      const conversation = useChatStore.getState().conversations.find((item) => item.id === id);
      openConversation(id);
      if (conversation) setModel(conversation.model);
      router.push('/conversation');
    },
    [openConversation, router, setModel],
  );
  const onRenameDismiss = useCallback(() => {
    closeSurface();
    setTargetId(null);
  }, [closeSurface]);
  const onRenameSubmit = useCallback(
    (title: string) => {
      if (!targetId) return;
      renameConversation(targetId, title);
      setTargetId(null);
      setSurface('none');
      void updateConversationRemote(targetId, { title }).catch(() => {
        void refreshConversations();
      });
    },
    [renameConversation, targetId],
  );

  const target = conversations.find((conversation) => conversation.id === targetId) ?? null;

  const onSend = useCallback(
    (message: string) => {
      sendReply(message);
      setDraft('');

      if (canUpgrade && shouldShowUpsell(useChatStore.getState())) {
        setSurface('upsell');
      }

      router.push('/conversation');
    },
    [canUpgrade, router, sendReply],
  );

  const onNewChat = useCallback(() => {
    startNewChat();
    setDraft('');
    closeSurface();
  }, [closeSurface, startNewChat]);

  const openUpgrade = useCallback(() => {
    closeSurface();
    markUpsellSeen();
    router.push('/upgrade');
  }, [closeSurface, markUpsellSeen, router]);

  const onConversationMenu = useCallback(
    (id: string, index: number) => {
      setTargetId(id);
      setMenuTop(insets.top + DRAWER_RECENTS_TOP + index * DRAWER_ROW_PITCH);
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
          return;
        case 'pin': {
          const nextPinned = !(target?.pinned ?? false);
          togglePinned(targetId);
          void updateConversationRemote(targetId, { pinned: nextPinned }).catch(() => {
            void refreshConversations();
          });
          break;
        }
        case 'files':
          openConversation(targetId);
          router.push('/chat-files');
          break;
        case 'share':
          break;
        case 'delete':
          setDeleteError(null);
          setSurface('delete');
          return;
      }
      setTargetId(null);
    },
    [onNewChat, openConversation, router, target?.pinned, targetId, togglePinned],
  );

  const onDeleteDismiss = useCallback(() => {
    if (isDeleting) return;
    setSurface('none');
    setTargetId(null);
    setDeleteError(null);
  }, [isDeleting]);

  const onDeleteConfirm = useCallback(async () => {
    if (!targetId || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteConversationRemote(targetId);
      deleteConversation(targetId);
      setSurface('none');
      setTargetId(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        deleteConversation(targetId);
        setSurface('none');
        setTargetId(null);
        return;
      }
      setDeleteError(
        error instanceof Error ? error.message : t('chat.deleteDialog.error'),
      );
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConversation, isDeleting, t, targetId]);

  const openAccount = useCallback(() => {
    closeSurface();
    router.push('/profile');
  }, [closeSurface, router]);

  const dismissUpsell = useCallback(() => {
    markUpsellSeen();
    closeSurface();
  }, [closeSurface, markUpsellSeen]);

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

      <AttachmentMenu visible={surface === 'attach'} onDismiss={closeSurface} onPick={onPickAttachment} />

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

      <DeleteChatDialog
        visible={surface === 'delete'}
        loading={isDeleting}
        error={deleteError}
        onDismiss={onDeleteDismiss}
        onConfirm={onDeleteConfirm}
      />

      <ModelMenu
        visible={surface === 'models'}
        onDismiss={closeSurface}
        selected={model}
        onSelect={setModel}
        onUpgrade={openUpgrade}
      />

      <UpsellDialog visible={surface === 'upsell'} onDismiss={dismissUpsell} onUpgrade={openUpgrade} />
    </View>
  );
}
