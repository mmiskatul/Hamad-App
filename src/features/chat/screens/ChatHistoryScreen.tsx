import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, View, type ListRenderItem } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  deleteConversation as deleteConversationRemote,
  refreshConversations,
  updateConversation as updateConversationRemote,
} from '../api/conversationApi';
import ChatHistoryRow from '../components/ChatHistoryRow';
import ChatMenu, { type ChatMenuAction } from '../components/ChatMenu';
import DeleteChatDialog from '../components/DeleteChatDialog';
import RenameChatDialog from '../components/RenameChatDialog';
import { orderedConversations, useChatStore, type Conversation } from '../store/chatStore';

import { ApiError } from '@/shared/api/client';
import { formatRowDate, formatRowTime } from '@/shared/format';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import ScreenHeader from '@/shared/ui/ScreenHeader';

const CONTENT_WIDTH = 370;
const ROW_PITCH = 75;

function RowGap(): React.JSX.Element {
  const theme = useTheme();
  return <View style={{ height: theme.space.sm }} />;
}

type Surface = 'none' | 'menu' | 'rename' | 'delete';

export default function ChatHistoryScreen(): React.JSX.Element {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const conversations = useChatStore(useShallow((state) => state.conversations));
  const activeId = useChatStore((state) => state.activeId);
  const openConversation = useChatStore((state) => state.openConversation);
  const setModel = useChatStore((state) => state.setModel);
  const deleteConversation = useChatStore((state) => state.deleteConversation);
  const renameConversation = useChatStore((state) => state.renameConversation);
  const togglePinned = useChatStore((state) => state.togglePinned);
  const startNewChat = useChatStore((state) => state.startNewChat);

  const [surface, setSurface] = useState<Surface>('none');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [menuTop, setMenuTop] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const ordered = useMemo(() => orderedConversations(conversations), [conversations]);
  const target = ordered.find((conversation) => conversation.id === targetId) ?? null;

  const open = useCallback(
    (conversation: Conversation) => {
      openConversation(conversation.id);
      setModel(conversation.model);
      router.push('/conversation');
    },
    [openConversation, router, setModel],
  );

  const syncRemoteUpdate = useCallback(
    (conversationId: string, patch: Parameters<typeof updateConversationRemote>[1]) => {
      void updateConversationRemote(conversationId, patch).catch(() => {
        void refreshConversations();
      });
    },
    [],
  );

  const onAction = useCallback(
    (action: ChatMenuAction) => {
      if (!targetId) return;

      switch (action) {
        case 'new':
          startNewChat();
          router.push('/home');
          break;
        case 'rename':
          setSurface('rename');
          return;
        case 'pin': {
          const nextPinned = !(target?.pinned ?? false);
          togglePinned(targetId);
          syncRemoteUpdate(targetId, { pinned: nextPinned });
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
    [openConversation, router, startNewChat, syncRemoteUpdate, target?.pinned, targetId, togglePinned],
  );

  const closeSurface = useCallback(() => setSurface('none'), []);
  const onRenameDismiss = useCallback(() => {
    setSurface('none');
    setTargetId(null);
  }, []);
  const onRenameSubmit = useCallback(
    (title: string) => {
      if (!targetId) return;
      renameConversation(targetId, title);
      syncRemoteUpdate(targetId, { title });
      setTargetId(null);
      setSurface('none');
    },
    [renameConversation, syncRemoteUpdate, targetId],
  );
  const requestDelete = useCallback((conversationId: string) => {
    setTargetId(conversationId);
    setDeleteError(null);
    setSurface('delete');
  }, []);
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

  const renderItem = useCallback<ListRenderItem<Conversation>>(
    ({ item, index }) => (
      <ChatHistoryRow
        title={item.title}
        time={formatRowTime(item.updatedAt, i18n.language)}
        date={formatRowDate(item.updatedAt, i18n.language)}
        dimmed={item.id !== activeId}
        pinned={item.pinned}
        onPress={() => open(item)}
        onLongPress={() => {
          setTargetId(item.id);
          setMenuTop(insets.top + 160 + index * ROW_PITCH);
          setSurface('menu');
        }}
        onDelete={() => requestDelete(item.id)}
        testID={`history-row-${item.id}`}
      />
    ),
    [activeId, i18n.language, insets.top, open, requestDelete],
  );

  const keyExtractor = useCallback((conversation: Conversation) => conversation.id, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <ScreenHeader title={t('chat.history.title')} testID="history-header" />

      {ordered.length === 0 ? (
        <View
          style={{
            width: '100%',
            maxWidth: CONTENT_WIDTH,
            alignSelf: 'center',
            marginTop: theme.space.xl,
            paddingHorizontal: theme.space.lg,
          }}
        >
          <AppText
            style={{
              ...theme.type.caption,
              color: theme.color.textSecondary,
              textAlign: 'center',
            }}
            testID="history-empty"
          >
            {t('chat.history.empty')}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={ordered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={RowGap}
          contentContainerStyle={{
            alignItems: 'center',
            paddingTop: theme.space.xl,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: theme.space.lg,
          }}
          showsVerticalScrollIndicator
          initialNumToRender={20}
          windowSize={11}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
        />
      )}

      <ChatMenu
        visible={surface === 'menu'}
        onDismiss={closeSurface}
        top={menuTop}
        pinned={target?.pinned ?? false}
        onAction={onAction}
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
    </View>
  );
}
