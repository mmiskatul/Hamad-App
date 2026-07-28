import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, View, type ListRenderItem } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import ChatHistoryRow from '../components/ChatHistoryRow';
import ChatMenu, { type ChatMenuAction } from '../components/ChatMenu';
import RenameChatDialog from '../components/RenameChatDialog';
import { orderedConversations, useChatStore, type Conversation } from '../store/chatStore';

import { formatRowDate, formatRowTime } from '@/shared/format';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import ScreenHeader from '@/shared/ui/ScreenHeader';

/*
 * Recent Chat History (Figma 182:723) — the destination of the drawer's "See
 * all".
 *
 * Each conversation is its own rounded surface card: tap opens the
 * conversation; the ✕ deletes it; a long press opens the same per-chat menu
 * the drawer rows use. The OPEN conversation is the only one rendered at
 * full contrast (Figma dims the rest), so the list shows where you are.
 */
const CONTENT_WIDTH = 370;
/* Rough row height + gap — used only to place the long-press menu near its row. */
const ROW_PITCH = 75;

function RowGap(): React.JSX.Element {
  const theme = useTheme();
  return <View style={{ height: theme.space.sm }} />;
}

type Surface = 'none' | 'menu' | 'rename';

export default function ChatHistoryScreen(): React.JSX.Element {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const conversations = useChatStore(useShallow((state) => state.conversations));
  const activeId = useChatStore((state) => state.activeId);
  const openConversation = useChatStore((state) => state.openConversation);
  const deleteConversation = useChatStore((state) => state.deleteConversation);
  const renameConversation = useChatStore((state) => state.renameConversation);
  const togglePinned = useChatStore((state) => state.togglePinned);
  const startNewChat = useChatStore((state) => state.startNewChat);

  const [surface, setSurface] = useState<Surface>('none');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [menuTop, setMenuTop] = useState(0);

  const ordered = useMemo(() => orderedConversations(conversations), [conversations]);

  const target = ordered.find((conversation) => conversation.id === targetId) ?? null;

  const open = useCallback(
    (conversation: Conversation) => {
      openConversation(conversation.id);
      router.push('/conversation');
    },
    [openConversation, router],
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
        case 'pin':
          togglePinned(targetId);
          break;
        case 'files':
          openConversation(targetId);
          router.push('/chat-files');
          break;
        case 'share':
          break;
        case 'delete':
          deleteConversation(targetId);
          break;
      }
      setTargetId(null);
    },
    [targetId, startNewChat, router, togglePinned, openConversation, deleteConversation],
  );

  const closeSurface = useCallback(() => setSurface('none'), []);
  const onRenameDismiss = useCallback(() => {
    setSurface('none');
    setTargetId(null);
  }, []);
  const onRenameSubmit = useCallback(
    (title: string) => {
      if (targetId) renameConversation(targetId, title);
      setTargetId(null);
    },
    [targetId, renameConversation],
  );

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
        onDelete={() => deleteConversation(item.id)}
        testID={`history-row-${item.id}`}
      />
    ),
    [i18n.language, activeId, open, insets.top, deleteConversation],
  );

  const keyExtractor = useCallback((conversation: Conversation) => conversation.id, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <ScreenHeader
        title={t('chat.history.title')}
        testID="history-header"
      />

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
    </View>
  );
}
