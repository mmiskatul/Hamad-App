import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, View, type ListRenderItem } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoreHorizontalIcon } from '@hugeicons/core-free-icons';
import { useShallow } from 'zustand/react/shallow';

import {
  deleteConversation as deleteConversationRemote,
  refreshConversations,
  updateConversation as updateConversationRemote,
  createConversationForAttachment,
  uploadConversationAttachment,
  refreshConversationAttachments,
} from '../api/conversationApi';
import { pickAttachment } from '../api/attachments';
import AssistantMessage from '../components/AssistantMessage';
import AttachmentMenu, { type AttachmentSource } from '../components/AttachmentMenu';
import ChatComposer from '../components/ChatComposer';
import ConversationAttachments from '../components/ConversationAttachments';
import ChatDrawer from '../components/ChatDrawer';
import ChatHeader from '../components/ChatHeader';
import ChatMenu, { type ChatMenuAction } from '../components/ChatMenu';
import DeleteChatDialog from '../components/DeleteChatDialog';
import ModelMenu from '../components/ModelMenu';
import PlanMenu, { type PlanMenuAction } from '../components/PlanMenu';
import RenameChatDialog from '../components/RenameChatDialog';
import ThinkingIndicator from '../components/ThinkingIndicator';
import UsageChip from '../components/UsageChip';
import UserBubble from '../components/UserBubble';
import { findModel } from '../constants';
import { useSendPrompt } from '../hooks/useSendPrompt';
import { useChatStore, type ChatMessage } from '../store/chatStore';
import {
  deleteProject as deleteProjectRequest,
  ProjectMenu,
  projectErrorMessage,
  updateProject as updateProjectRequest,
  useProjectStore,
  type ProjectMenuAction,
} from '@/features/projects';

import { readAuthSession } from '@/shared/auth';
import { ApiError } from '@/shared/api/client';
import { formatRowTime } from '@/shared/format';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import IconPillButton from '@/shared/ui/IconPillButton';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import { logoutCurrentSession } from '@/services/logout';

/*
 * The conversation view (Figma 428:1424 Chat history, 144:1314 thinking, 146:1652 answered).
 *
 * Anatomy, top to bottom: menu pill, model pill, theme toggle and menu; a
 * "Project / name" breadcrumb; the transcript (user bubbles on the end edge,
 * assistant replies led by the brand mark with a thumbs / copy / regenerate row);
 * the quota chip (with warning when usage limits are exceeded); and the composer.
 *
 * IT IS A SEPARATE ROUTE FROM /home, not a branch inside it. The welcome hero
 * and a live transcript have different scroll behaviour, different chrome and
 * different keyboard handling. Sending the first prompt from /home navigates
 * here.
 *
 * GATED ON activeId, hydration first -- the chat store is persisted, so `null` on
 * the first frame is "not read yet", not "no conversation" (mobile/CLAUDE.md).
 */
const SCREEN_PADDING = 16;
const TOP_BAR_TOP = 22;
const HEADER_PILL = 52;
const MESSAGE_GAP = 32;

export default function ConversationScreen(): React.JSX.Element {
  const activeId = useChatStore((state) => state.activeId);
  const conversations = useChatStore(useShallow((state) => state.conversations));
  const pendingProject = useChatStore((state) => state.pendingProject);
  const hasHydrated = useChatStore((state) => state.hasHydrated);

  const conversation = conversations.find((item) => item.id === activeId) ?? null;

  if (!hasHydrated) return <View />;
  if (!conversation && !pendingProject) return <Redirect href="/home" />;

  if (!conversation && pendingProject) {
    return <FreshProjectChatContent project={pendingProject} />;
  }

  if (!conversation) return <View />;

  return <ConversationContent key={conversation.id} id={conversation.id} />;
}

function FreshProjectChatContent({
  project,
}: {
  project: { id: string; name: string };
}): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const model = useChatStore((state) => state.model);
  const setModel = useChatStore((state) => state.setModel);
  const startNewChat = useChatStore((state) => state.startNewChat);
  const openConversation = useChatStore((state) => state.openConversation);
  const createAttachmentConversation = useChatStore((state) => state.createAttachmentConversation);

  // Read the project so the menu flips to "Unpin" once toggled, matching the
  // menu shown from the projects list (Figma 404:1915 / 404:1940).
  const projects = useProjectStore((s) => s.projects);
  const setEditingId = useProjectStore((s) => s.setEditingId);
  const upsertProject = useProjectStore((s) => s.upsertProject);
  const removeProjectRecord = useProjectStore((s) => s.removeProjectRecord);
  const setProjectError = useProjectStore((s) => s.setError);

  const projectRecord = projects.find((p) => p.id === project.id) ?? null;

  const [draft, setDraft] = useState('');
  const [surface, setSurface] = useState<'none' | 'drawer' | 'models' | 'attach' | 'menu'>('none');

  // The hook handles sendPrompt + AbortController + receiveReply orchestration.
  // `targetId=null` because sendPrompt picks `activeId` itself; the hook reads
  // it after the prompt is filed so the new conversation is the one that
  // receives the reply.
  const sendReply = useSendPrompt(null);

  const onSend = useCallback(
    (message: string) => {
      setDraft('');
      sendReply(message);
    },
    [sendReply],
  );

  // Project-scope actions (Figma 404:1915 / 404:1940). The fresh chat's
  // pendingProject is set from the projects list, so its id is in this store
  // and these actions route to the project admin screens the same way.
  const onProjectMenuAction = useCallback(
    (action: ProjectMenuAction) => {
      setEditingId(project.id);
      switch (action) {
        case 'rename':
          router.push('/project-rename');
          break;
        case 'instructions':
          router.push('/project-instructions');
          break;
        case 'sources':
          router.push('/project-sources');
          break;
        case 'pin':
          upsertProject({
            ...(projectRecord ?? {
              id: project.id,
              name: project.name,
              description: '',
              instructions: '',
              scope: 'default',
              pinned: false,
              shared: false,
              sources: [],
              updatedAt: Date.now(),
            }),
            pinned: !(projectRecord?.pinned ?? false),
            updatedAt: Date.now(),
          });
          setProjectError(null);
          void readAuthSession()
            .then((session) => {
              if (!session) return null;
              return updateProjectRequest(project.id, { pinned: !(projectRecord?.pinned ?? false) }).then((updatedProject) => {
                upsertProject(updatedProject);
              });
            })
            .catch((updateError) => {
              setProjectError(projectErrorMessage(updateError, 'Could not update the project.'));
            });
          break;
        case 'delete':
          removeProjectRecord(project.id);
          setProjectError(null);
          startNewChat();
          router.replace('/home');
          void readAuthSession()
            .then((session) => {
              if (!session) return null;
              return deleteProjectRequest(project.id);
            })
            .catch((deleteError) => {
              setProjectError(projectErrorMessage(deleteError, 'Could not delete the project.'));
            });
          break;
        case 'newChat':
          // "New project chat" from the fresh-project menu opens the New Project
          // form. The created project becomes the active project and the
          // fresh chat wraps itself around it.
          router.push('/project-new');
          break;
        case 'files':
          // "Files in chat" opens the Files screen (Figma 184:2882). The chat
          // store has no active conversation yet from this entry point, so
          // the screen renders its empty state -- the same honest answer as
          // on a brand-new chat.
          router.push('/chat-files');
          break;
        case 'share':
          // TODO: sharing needs a server-issued share id.
          break;
      }
    },
    [project.id, project.name, projectRecord, removeProjectRecord, router, setEditingId, setProjectError, startNewChat, upsertProject],
  );

  const closeSurface = useCallback(() => setSurface('none'), []);
  const openDrawer = useCallback(() => setSurface('drawer'), []);
  const openModels = useCallback(() => setSurface('models'), []);
  const onAttach = useCallback(() => setSurface('attach'), []);
  const onVoice = useCallback(() => {}, []);
  const onPick = useCallback(async (source: AttachmentSource) => {
    try {
      const file = await pickAttachment(source);
      if (!file) return;
      const conversation = createAttachmentConversation(file.name);
      await createConversationForAttachment(conversation);
      await uploadConversationAttachment(conversation.id, file);
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'The file could not be uploaded.');
    }
  }, [createAttachmentConversation]);
  const onNewChat = useCallback(() => {
    setSurface('none');
    startNewChat();
    router.replace('/home');
  }, [startNewChat, router]);
  const onUpgrade = useCallback(() => {
    setSurface('none');
    router.push('/upgrade');
  }, [router]);
  const onAccount = useCallback(() => {
    setSurface('none');
    router.push('/profile');
  }, [router]);
  const onSignOut = useCallback(async () => {
    setSurface('none');
    try {
      await logoutCurrentSession();
    } finally {
      router.replace('/login');
    }
  }, [router]);
  const onSeeAll = useCallback(() => {
    setSurface('none');
    router.push('/chat-history');
  }, [router]);
  const onProjects = useCallback(() => {
    setSurface('none');
    router.push('/projects');
  }, [router]);
  const onOpenConversation = useCallback(
    (openId: string) => {
      setSurface('none');
      openConversation(openId);
    },
    [openConversation],
  );
  const onConversationMenu = useCallback(() => {}, []);
  const onHeaderMenuPress = useCallback(() => setSurface('menu'), []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <KeyboardAvoider style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + TOP_BAR_TOP,
            paddingBottom: insets.bottom + 16,
            justifyContent: 'space-between',
          }}
        >
          <ChatHeader
            model={findModel(model).name}
            onMenu={openDrawer}
            onModelPress={openModels}
            paddingHorizontal={SCREEN_PADDING}
            menuTestID="conversation-menu-drawer"
            modelTestID="conversation-model-pill"
            themeToggleTestID="conversation-theme-toggle"
            trailing={
              <IconPillButton
                icon={MoreHorizontalIcon}
                size={HEADER_PILL}
                iconSize={24}
                accessibilityLabel={t('projects.menu.close')}
                onPress={onHeaderMenuPress}
                testID="conversation-menu"
              />
            }
          />

          {/* Breadcrumb: Project / <Name> (Figma 404:1692) */}
          <AppText
            style={{
              ...theme.type.caption,
              color: theme.color.textSecondary,
              paddingHorizontal: SCREEN_PADDING,
              paddingTop: theme.space.xl,
            }}
            testID="conversation-breadcrumb"
          >
            {t('chat.conversation.breadcrumb', { project: project.name })}
          </AppText>

          <View style={{ flex: 1 }} />

          <View style={{ paddingHorizontal: SCREEN_PADDING, gap: 0 }}>
            <ChatComposer
              value={draft}
              onChangeText={setDraft}
              onSend={onSend}
              onAttach={onAttach}
              onVoice={onVoice}
            />
          </View>
        </View>
      </KeyboardAvoider>

      <AttachmentMenu
        visible={surface === 'attach'}
        onDismiss={closeSurface}
        onPick={onPick}
      />

      <ChatDrawer
        visible={surface === 'drawer'}
        onDismiss={closeSurface}
        onNewChat={onNewChat}
        onUpgrade={onUpgrade}
        onAccount={onAccount}
        onSignOut={onSignOut}
        onSeeAll={onSeeAll}
        onProjects={onProjects}
        onOpenConversation={onOpenConversation}
        onConversationMenu={onConversationMenu}
      />

      <ModelMenu
        visible={surface === 'models'}
        onDismiss={closeSurface}
        selected={model}
        onSelect={setModel}
        onUpgrade={onUpgrade}
      />

      {/*
        Project-scoped three-dot menu (Figma 404:1915 unpinned, 404:1940 pinned).
        Different actions than the per-chat menu: rename, pin, sources, files,
        instructions, share, delete all act on the project, not on a chat.
      */}
      <ProjectMenu
        visible={surface === 'menu'}
        onDismiss={closeSurface}
        pinned={projectRecord?.pinned ?? false}
        onAction={onProjectMenuAction}
        anchor={{ end: SCREEN_PADDING, top: insets.top + TOP_BAR_TOP + HEADER_PILL + 8 }}
      />
    </View>
  );
}

function ConversationContent({ id }: { id: string }): React.JSX.Element {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const conversation = useChatStore((state) =>
    state.conversations.find((item) => item.id === id),
  );
  const model = useChatStore((state) => state.model);
  const setModel = useChatStore((state) => state.setModel);
  const thinkingFor = useChatStore((state) => state.thinkingFor);
  const streamingId = useChatStore((state) => state.streamingId);
  const finishStreaming = useChatStore((state) => state.finishStreaming);
  const setMessageFeedback = useChatStore((state) => state.setMessageFeedback);
  const renameConversation = useChatStore((state) => state.renameConversation);
  const togglePinned = useChatStore((state) => state.togglePinned);
  const deleteConversation = useChatStore((state) => state.deleteConversation);
  const openConversation = useChatStore((state) => state.openConversation);
  const startNewChat = useChatStore((state) => state.startNewChat);

  // The chat may belong to a project -- the three-dot then opens the project
  // menu (Figma 404:1915 unpinned, 404:1940 pinned) instead of the chat menu.
  const projectId = conversation?.project?.id ?? null;
  const projectRecord = useProjectStore((s) =>
    projectId ? s.projects.find((p) => p.id === projectId) ?? null : null,
  );
  const setEditingId = useProjectStore((s) => s.setEditingId);
  const upsertProject = useProjectStore((s) => s.upsertProject);
  const removeProjectRecord = useProjectStore((s) => s.removeProjectRecord);
  const setProjectError = useProjectStore((s) => s.setError);

  const [draft, setDraft] = useState('');
  const [surface, setSurface] = useState<'none' | 'drawer' | 'models' | 'attach' | 'menu' | 'plan' | 'rename' | 'delete'>('none');
  const [isDeleting, setIsDeleting] = useState(false);
  const [chatDeleteError, setChatDeleteError] = useState<string | null>(null);

  const scrollRefFlat = useRef<FlatList<ChatMessage>>(null);
  const thinking = thinkingFor === id;

  // The hook handles sendPrompt + AbortController + receiveReply orchestration.
  // `targetId=id` pins the reply to this specific conversation -- a stale reply
  // for a previously-active conversation must never land on this one.
  const sendReply = useSendPrompt(id);

  const scrollToEnd = useCallback(() => {
    scrollRefFlat.current?.scrollToEnd({ animated: true });
  }, []);
  const followStreamingReply = useCallback(() => {
    // Per-word animated scrolls queue up on Android and leave the list behind
    // the response. An immediate scroll keeps the newest word above the composer.
    scrollRefFlat.current?.scrollToEnd({ animated: false });
  }, []);

  const messages = useMemo(() => conversation?.messages ?? [], [conversation?.messages]);

  useEffect(() => {
    void refreshConversationAttachments(id).catch(() => {});
  }, [id]);

  const keyExtractor = useCallback((message: ChatMessage) => message.id, []);

  useEffect(() => {
    const timer = setTimeout(scrollToEnd, 50);
    return () => clearTimeout(timer);
  }, [messages.length, thinking, scrollToEnd]);

  const onSend = useCallback(
    (message: string) => {
      setDraft('');
      sendReply(message);
    },
    [sendReply],
  );

  const onMenuAction = useCallback(
    (action: ChatMenuAction) => {
      switch (action) {
        case 'new':
          startNewChat();
          router.replace('/home');
          break;
        case 'rename':
          setSurface('rename');
          return;
        case 'pin': {
          const nextPinned = !(conversation?.pinned ?? false);
          togglePinned(id);
          updateConversationRemote(id, { pinned: nextPinned }).catch(() => {
            refreshConversations();
          });
          break;
        }
        case 'files':
          openConversation(id);
          router.push('/chat-files');
          break;
        case 'share':
          break;
        case 'delete':
          setChatDeleteError(null);
          setSurface('delete');
          return;
      }
    },
    [conversation?.pinned, startNewChat, router, togglePinned, id, openConversation],
  );

  /*
   * Project-scope actions (Figma 404:1915 / 404:1940). Routing follows the
   * projects-list pattern: actions that need a target screen set `editingId`
   * and push the route; pin/delete act directly on the project store. The
   * user lands on the chat's project if the project is deleted, so the chat
   * has to be cleared too -- otherwise the breadcrumb would point at a
   * project that no longer exists.
   */
  const onProjectMenuAction = useCallback(
    (action: ProjectMenuAction) => {
      if (!projectId) return;
      setEditingId(projectId);
      switch (action) {
        case 'rename':
          router.push('/project-rename');
          break;
        case 'instructions':
          router.push('/project-instructions');
          break;
        case 'sources':
          router.push('/project-sources');
          break;
        case 'pin':
          if (projectRecord) {
            upsertProject({ ...projectRecord, pinned: !projectRecord.pinned, updatedAt: Date.now() });
          }
          setProjectError(null);
          void readAuthSession()
            .then((session) => {
              if (!session) return null;
              return updateProjectRequest(projectId, { pinned: !(projectRecord?.pinned ?? false) }).then((updatedProject) => {
                upsertProject(updatedProject);
              });
            })
            .catch((updateError) => {
              setProjectError(projectErrorMessage(updateError, 'Could not update the project.'));
            });
          break;
        case 'delete':
          removeProjectRecord(projectId);
          setProjectError(null);
          deleteConversation(id);
          router.replace('/home');
          void readAuthSession()
            .then((session) => {
              if (!session) return null;
              return deleteProjectRequest(projectId);
            })
            .catch((deleteError) => {
              setProjectError(projectErrorMessage(deleteError, 'Could not delete the project.'));
            });
          break;
        case 'newChat':
          // "New project chat" from an existing project's menu opens the New
          // Project form. The created project becomes the active project and
          // the fresh chat wraps itself around it.
          router.push('/project-new');
          break;
        case 'files':
          // "Files in chat" opens the Files screen (Figma 184:2882). The active
          // conversation is already set (`id` is the open chat), so the
          // screen reads its attachments straight from the store.
          router.push('/chat-files');
          break;
        case 'share':
          // TODO: sharing needs a server-issued share id.
          break;
      }
    },
    [deleteConversation, id, projectId, projectRecord, removeProjectRecord, router, setEditingId, setProjectError, upsertProject],
  );

  const closeSurface = useCallback(() => setSurface('none'), []);
  const openDrawer = useCallback(() => setSurface('drawer'), []);
  const openModels = useCallback(() => setSurface('models'), []);
  const openPlan = useCallback(() => setSurface('plan'), []);
  const onAttach = useCallback(() => setSurface('attach'), []);
  const onVoice = useCallback(() => {}, []);
  const onPick = useCallback(async (source: AttachmentSource) => {
    try {
      const file = await pickAttachment(source);
      if (!file) return;
      await uploadConversationAttachment(id, file);
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'The file could not be uploaded.');
    }
  }, [id]);
  const onRegenerate = useCallback(
    (assistantMessageId: string) => {
      if (thinking) return;
      const assistantIndex = messages.findIndex((message) => message.id === assistantMessageId);
      if (assistantIndex < 0) return;
      for (let index = assistantIndex - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message?.role === 'user') {
          onSend(message.text);
          return;
        }
      }
    },
    [messages, onSend, thinking],
  );
  const onHeaderMenuPress = useCallback(() => setSurface('menu'), []);
  const onNewChat = useCallback(() => {
    setSurface('none');
    startNewChat();
    router.replace('/home');
  }, [startNewChat, router]);
  const onUpgradeDrawer = useCallback(() => {
    setSurface('none');
    router.push('/upgrade');
  }, [router]);
  const onAccount = useCallback(() => {
    setSurface('none');
    router.push('/profile');
  }, [router]);
  const onSignOut = useCallback(async () => {
    setSurface('none');
    try {
      await logoutCurrentSession();
    } finally {
      router.replace('/login');
    }
  }, [router]);
  const onSeeAll = useCallback(() => {
    setSurface('none');
    router.push('/chat-history');
  }, [router]);
  const onProjects = useCallback(() => {
    setSurface('none');
    router.push('/projects');
  }, [router]);
  const onOpenConversation = useCallback(
    (targetId: string) => {
      setSurface('none');
      openConversation(targetId);
    },
    [openConversation],
  );
  const onConversationMenu = useCallback(() => {
    setSurface('none');
  }, []);
  const onUpgradeModel = useCallback(() => {
    setSurface('none');
    router.push('/upgrade');
  }, [router]);
  const onUpgradePlan = useCallback(
    (action: PlanMenuAction) => {
      setSurface('none');
      router.push(action === 'extra' ? '/upgrade?period=extra' : '/upgrade');
    },
    [router],
  );
  const onRenameDismiss = useCallback(() => setSurface('none'), []);
  const onRenameSubmit = useCallback(
    (title: string) => {
      renameConversation(id, title);
      updateConversationRemote(id, { title }).catch(() => {
        refreshConversations();
      });
    },
    [renameConversation, id],
  );
  const onDeleteDismiss = useCallback(() => {
    if (!isDeleting) {
      setSurface('none');
      setChatDeleteError(null);
    }
  }, [isDeleting]);
  const onDeleteConfirm = useCallback(async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setChatDeleteError(null);
    try {
      await deleteConversationRemote(id);
      deleteConversation(id);
      setSurface('none');
      router.replace('/home');
    } catch (error) {
      // Older app versions could leave a chat only in local storage. A 404
      // means the server copy is already gone, so local deletion can finish.
      if (error instanceof ApiError && error.status === 404) {
        deleteConversation(id);
        setSurface('none');
        router.replace('/home');
        return;
      }
      setChatDeleteError(
        error instanceof Error ? error.message : t('chat.deleteDialog.error'),
      );
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConversation, id, isDeleting, router, t]);

  const renderItem = useCallback<ListRenderItem<ChatMessage>>(
    ({ item }) =>
      item.role === 'user' ? (
        <UserBubble
          text={item.text}
          time={formatRowTime(item.at, i18n.language)}
          testID={`message-${item.id}`}
        />
      ) : (
        <AssistantMessage
          text={item.text}
          generatedImages={item.generatedImages}
          time={formatRowTime(item.at, i18n.language)}
          animate={item.id === streamingId}
          onRevealed={finishStreaming}
          onRevealProgress={item.id === streamingId ? followStreamingReply : undefined}
          feedback={item.feedback}
          onFeedbackChange={(feedback) => setMessageFeedback(id, item.id, feedback)}
          onRegenerate={() => onRegenerate(item.id)}
          testID={`message-${item.id}`}
        />
      ),
    [
      i18n.language,
      streamingId,
      finishStreaming,
      followStreamingReply,
      id,
      onRegenerate,
      setMessageFeedback,
    ],
  );
  const ListFooter = useCallback(() => (thinking ? <ThinkingIndicator /> : null), [thinking]);

  if (!conversation) return <Redirect href="/home" />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <KeyboardAvoider style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + TOP_BAR_TOP,
            paddingBottom: insets.bottom + theme.space.sm,
          }}
        >
          <ChatHeader
            model={findModel(model).name}
            onMenu={openDrawer}
            onModelPress={openModels}
            paddingHorizontal={SCREEN_PADDING}
            menuTestID="conversation-menu-drawer"
            modelTestID="conversation-model-pill"
            themeToggleTestID="conversation-theme-toggle"
            trailing={
              <IconPillButton
                icon={MoreHorizontalIcon}
                size={HEADER_PILL}
                iconSize={24}
                accessibilityLabel={t('chat.menuChat.close')}
                onPress={onHeaderMenuPress}
                testID="conversation-menu"
              />
            }
          />

          {/* Breadcrumb */}
          {conversation.project ? (
            <AppText
              style={{
                ...theme.type.caption,
                color: theme.color.textSecondary,
                paddingHorizontal: SCREEN_PADDING,
                paddingTop: theme.space.xl,
              }}
              testID="conversation-breadcrumb"
            >
              {t('chat.conversation.breadcrumb', { project: conversation.project.name })}
            </AppText>
          ) : null}

          {/* Transcript */}
          <FlatList
            ref={scrollRefFlat}
            data={messages}
            style={{ flex: 1 }}
            contentContainerStyle={{
              gap: MESSAGE_GAP,
              paddingTop: theme.space.xl,
              paddingBottom: theme.space.xl,
              paddingHorizontal: SCREEN_PADDING,
            }}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToEnd}
            initialNumToRender={20}
            windowSize={11}
            removeClippedSubviews
            ListFooterComponent={ListFooter}
          />

          {/* Quota + composer */}
          <View style={{ paddingHorizontal: SCREEN_PADDING, gap: 0 }}>
            <ConversationAttachments attachments={conversation.attachments} />
            <UsageChip onPress={openPlan} expanded={surface === 'plan'} />
            <ChatComposer
              value={draft}
              onChangeText={setDraft}
              onSend={onSend}
              onAttach={onAttach}
              onVoice={onVoice}
            />
          </View>
        </View>
      </KeyboardAvoider>

      <AttachmentMenu
        visible={surface === 'attach'}
        onDismiss={closeSurface}
        onPick={onPick}
      />

      {/* Same footing as the + menu: an overlay of the screen, not of the chip. */}
      <PlanMenu
        visible={surface === 'plan'}
        onDismiss={closeSurface}
        onAction={onUpgradePlan}
      />

      <ChatDrawer
        visible={surface === 'drawer'}
        onDismiss={closeSurface}
        onNewChat={onNewChat}
        onUpgrade={onUpgradeDrawer}
        onAccount={onAccount}
        onSignOut={onSignOut}
        onSeeAll={onSeeAll}
        onProjects={onProjects}
        onOpenConversation={onOpenConversation}
        onConversationMenu={onConversationMenu}
      />

      <ModelMenu
        visible={surface === 'models'}
        onDismiss={closeSurface}
        selected={model}
        onSelect={setModel}
        onUpgrade={onUpgradeModel}
      />

      {/*
        The three-dot dropdown content depends on whether the chat is a
        project chat: per-chat actions for a plain chat (Figma 183:857,
        185:3294), project-scope actions for a chat inside a project (Figma
        404:1915 unpinned, 404:1940 pinned).
      */}
      {projectId ? (
        <ProjectMenu
          visible={surface === 'menu'}
          onDismiss={closeSurface}
          top={insets.top + TOP_BAR_TOP + HEADER_PILL + theme.space.sm}
          pinned={projectRecord?.pinned ?? false}
          onAction={onProjectMenuAction}
        />
      ) : (
        <ChatMenu
          visible={surface === 'menu'}
          onDismiss={closeSurface}
          top={insets.top + TOP_BAR_TOP + HEADER_PILL + theme.space.sm}
          pinned={conversation.pinned}
          onAction={onMenuAction}
        />
      )}

      <RenameChatDialog
        visible={surface === 'rename'}
        title={conversation.title}
        onDismiss={onRenameDismiss}
        onSubmit={onRenameSubmit}
      />

      <DeleteChatDialog
        visible={surface === 'delete'}
        loading={isDeleting}
        error={chatDeleteError}
        onDismiss={onDeleteDismiss}
        onConfirm={onDeleteConfirm}
      />
    </View>
  );
}
