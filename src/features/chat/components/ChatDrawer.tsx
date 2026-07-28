import React, { useCallback, useEffect, useMemo } from 'react';
import { I18nManager, Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Folder01Icon,
  Logout01Icon,
  PinIcon,
  QuillWrite01Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { useShallow } from 'zustand/react/shallow';

import { orderedConversations, useChatStore, type Conversation } from '../store/chatStore';

import { usePlan } from '@/shared/plan';
import { useProfileStore } from '@/shared/profile';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import HexLogo from '@/shared/ui/HexLogo';
import { Icon } from '@/shared/ui/Icon';
import LanguageToggle from '@/shared/ui/LanguageToggle';
import Overlay from '@/shared/ui/Overlay';

/*
 * Navigation drawer (Figma 404:829 "Sidebar"): 318 wide, full height, bg/canvas,
 * 32pt corner radius on its INNER edge, 20pt padding, elevation/5 shadow.
 * Sections: plan chip + wordmark + search, New chat / Project, Recents, and a
 * footer with the account pill and sign-out.
 *
 * RTL — the reason this is hand-rolled rather than a plain absolute panel:
 * a drawer is inherently directional. Under LTR it lives on the left and slides
 * in from -width; under RTL it must live on the right and slide in from +width,
 * with the rounded corner on the other side. `I18nManager.isRTL` drives all
 * three (edge, travel direction, corner) from one place, and the swipe-to-close
 * gesture flips with it — closing is always "push it back toward its own edge".
 *
 * Dismissal: tapping the scrim (Overlay), Android Back (Overlay), or swiping the
 * panel toward its edge. All three land on the same `onDismiss`.
 */
const DRAWER_WIDTH = 318;
const DRAWER_RADIUS = 32;
const DRAWER_PADDING = 20;
/* Figma 140:869 — the search affordance is a 40pt circle, not a 52pt pill. */
const SEARCH_SIZE = 40;
/* Figma 140:1924 / 140:1010 — the two footer pills. */
const FOOTER_PILL = 52;
/* Past this fraction of its width, or this velocity, a swipe closes it. */
const DISMISS_FRACTION = 0.4;
const DISMISS_VELOCITY = 700;

export type ChatDrawerProps = {
  visible: boolean;
  onDismiss: () => void;
  onNewChat: () => void;
  onUpgrade: () => void;
  /** Open the settings hub — the screen owns navigation, not the drawer. */
  onAccount: () => void;
  /** Open the full history list ("See all"). */
  onSeeAll: () => void;
  /** Open the project list. */
  onProjects: () => void;
  /** A Recents row was tapped — the screen navigates to the transcript. */
  onOpenConversation: (id: string) => void;
  /**
   * Long press on a Recents row. The design gives the rows no ⋯ affordance, so
   * long press is the trigger for the per-chat menu; the screen owns the menu
   * because only one overlay may be open at a time.
   */
  onConversationMenu: (id: string, index: number) => void;
};

function ChatDrawer({
  visible,
  onDismiss,
  onNewChat,
  onUpgrade,
  onAccount,
  onSeeAll,
  onProjects,
  onOpenConversation,
  onConversationMenu,
}: ChatDrawerProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Overlay visible={visible} onDismiss={onDismiss} scrimLabel={t('chat.drawer.close')}>
      {({ progress }) => (
        <DrawerPanel
          progress={progress}
          onDismiss={onDismiss}
          onNewChat={onNewChat}
          onUpgrade={onUpgrade}
          onAccount={onAccount}
          onSeeAll={onSeeAll}
          onProjects={onProjects}
          onOpenConversation={onOpenConversation}
          onConversationMenu={onConversationMenu}
        />
      )}
    </Overlay>
  );
}

function DrawerPanel({
  progress,
  onDismiss,
  onNewChat,
  onUpgrade,
  onAccount,
  onSeeAll,
  onProjects,
  onOpenConversation,
  onConversationMenu,
}: {
  progress: SharedValue<number>;
  onDismiss: () => void;
  onNewChat: () => void;
  onUpgrade: () => void;
  onAccount: () => void;
  onSeeAll: () => void;
  onProjects: () => void;
  onOpenConversation: (id: string) => void;
  onConversationMenu: (id: string, index: number) => void;
}): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const conversations = useChatStore(useShallow(state => state.conversations));
  const activeId = useChatStore(state => state.activeId);
  const plan = usePlan();
  // The redesigned footer shows an AVATAR, not the name — so the drawer needs
  // only the initial. Still account data from the store, never an i18n string.
  const accountName = useProfileStore(state => state.name);
  const accountInitial = accountName.trim().charAt(0).toUpperCase() || '?';

  // Pinned chats first, then most recent — derived, never a stored order.
  const ordered = useMemo(() => orderedConversations(conversations), [conversations]);

  const rtl = I18nManager.isRTL;
  /* Hidden position: off its own edge. Sign flips with writing direction. */
  const hiddenX = rtl ? DRAWER_WIDTH : -DRAWER_WIDTH;
  const dragX = useSharedValue(0);

  // Cancel any in-flight drag spring if we unmount mid-animation — reanimated
  // worklets otherwise keep running on a detached shared value.
  useEffect(() => () => cancelAnimation(dragX), [dragX]);

  const pan = Gesture.Pan()
    .failOffsetY([-10, 10])
    .onChange(event => {
      // Only allow dragging TOWARD the panel's own edge (closing).
      const next = dragX.value + event.changeX;
      dragX.value = rtl ? Math.max(0, next) : Math.min(0, next);
    })
    .onEnd(event => {
      const travelled = Math.abs(dragX.value);
      const velocity = rtl ? event.velocityX : -event.velocityX;
      if (travelled > DRAWER_WIDTH * DISMISS_FRACTION || velocity > DISMISS_VELOCITY) {
        runOnJS(onDismiss)();
        return;
      }
      dragX.value = withSpring(0, { damping: 20, stiffness: 240 });
    });

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [hiddenX, 0]) + dragX.value }],
  }));

  const handleOpen = useCallback(
    (conversation: Conversation) => {
      // Close first, then let the SCREEN navigate: the drawer selects, it does
      // not route (same split as the account row's onAccount).
      onDismiss();
      onOpenConversation(conversation.id);
    },
    [onDismiss, onOpenConversation],
  );

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            // `start` resolves to left under LTR and right under RTL, so the
            // panel is on the correct edge without a conditional.
            start: 0,
            width: DRAWER_WIDTH,
            backgroundColor: theme.color.canvas,
            // Only the inner edge is rounded — the outer one is the screen edge.
            borderTopEndRadius: DRAWER_RADIUS,
            borderBottomEndRadius: DRAWER_RADIUS,
            paddingTop: insets.top + DRAWER_PADDING,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: DRAWER_PADDING,
            justifyContent: 'space-between',
          },
          panelStyle,
        ]}
        testID="chat-drawer"
      >
        <View style={{ flex: 1 }}>
          {/* Plan + wordmark + search */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ gap: theme.space.md }}>
              <Pressable
                onPress={onUpgrade}
                accessibilityRole="button"
                accessibilityLabel={t('chat.drawer.planCta')}
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: theme.color.muted,
                  borderRadius: 6,
                  paddingHorizontal: theme.space.md,
                  paddingVertical: 2,
                }}
                testID="drawer-plan-chip"
              >
                <AppText
                  style={{
                    ...theme.type.tag,
                    color: theme.color.textSecondary,
                    textTransform: 'uppercase',
                  }}
                >
                  {t(`chat.plan.${plan}`)}
                </AppText>
              </Pressable>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm }}
                testID="drawer-brand-row"
              >
                <HexLogo motion="none" ring={false} scale={0.5} />
                <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>
                  {t('chat.drawer.brand')}
                </AppText>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('chat.drawer.search')}
              android_ripple={{ color: theme.color.accentSoft, borderless: true }}
              style={{
                width: SEARCH_SIZE,
                height: SEARCH_SIZE,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: theme.radius.pill,
                backgroundColor: theme.color.muted,
                overflow: 'hidden',
              }}
              testID="drawer-search"
              onPress={() => {
                // TODO: conversation search (Core section, not built yet).
              }}
            >
              <Icon icon={Search01Icon} size={20} color={theme.color.textPrimary} />
            </Pressable>
          </View>

          {/* Primary actions */}
          <View style={{ paddingTop: 32, gap: theme.space.xl }}>
            <DrawerAction
              icon={QuillWrite01Icon}
              label={t('chat.drawer.newChat')}
              onPress={onNewChat}
              testID="drawer-new-chat"
            />
            <DrawerAction
              icon={Folder01Icon}
              label={t('chat.drawer.project')}
              onPress={onProjects}
              testID="drawer-project"
            />
          </View>

          {/* Recents */}
          <View style={{ paddingTop: 32, flex: 1 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <AppText style={{ ...theme.type.caption, color: theme.color.textSecondary }}>
                {t('chat.drawer.recents')}
              </AppText>
              <Pressable onPress={onSeeAll} accessibilityRole="button" hitSlop={8} testID="drawer-see-all">
                <AppText style={{ ...theme.type.caption, color: theme.color.textSecondary }}>
                  {t('chat.drawer.seeAll')}
                </AppText>
              </Pressable>
            </View>

            {conversations.length === 0 ? (
              <AppText
                style={{
                  ...theme.type.caption,
                  color: theme.color.textSecondary,
                  paddingTop: theme.space.md,
                }}
                testID="drawer-recents-empty"
              >
                {t('chat.drawer.noRecents')}
              </AppText>
            ) : (
              <ScrollView
                style={{ flex: 1, paddingTop: theme.space.sm }}
                contentContainerStyle={{ paddingBottom: theme.space.lg }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled
              >
                {ordered.map((conversation, index) => {
                  const active = conversation.id === activeId;
                  return (
                    <Pressable
                      key={conversation.id}
                      onPress={() => handleOpen(conversation)}
                      onLongPress={() => onConversationMenu(conversation.id, index)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      android_ripple={{ color: theme.color.accentSoft }}
                      style={{
                        marginTop: theme.space.xs,
                        paddingHorizontal: theme.space.lg,
                        paddingVertical: theme.space.md,
                        borderRadius: theme.radius.xl,
                        backgroundColor: active ? theme.color.surface : 'transparent',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: theme.space.xs,
                        overflow: 'hidden',
                      }}
                    >
                      {conversation.pinned ? (
                        <Icon
                          icon={PinIcon}
                          size={14}
                          color={active ? theme.color.textPrimary : theme.color.textSecondary}
                        />
                      ) : null}
                      <AppText
                        numberOfLines={1}
                        style={{
                          flex: 1,
                          ...theme.type.body,
                          color: active ? theme.color.textPrimary : theme.color.textSecondary,
                        }}
                      >
                        {conversation.title}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>

        {/*
         * Footer (Figma 140:1055, the REDESIGNED one): a single justify-between
         * row — 52pt account avatar · compact EN|AR · 52pt sign-out.
         *
         * It used to be two stacked rows, with a labelled "Language" line above
         * a wide account pill carrying the person's NAME. That put the fixed
         * 90pt toggle hard against the sign-out button, which is the crowding
         * the user reported. The design's answer is to drop the name and the
         * label entirely: the avatar identifies the account, the toggle sizes to
         * its own content, and `space-between` does the spacing.
         */}
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          testID="drawer-footer"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('chat.drawer.account')}
            android_ripple={{ color: theme.color.accentSoft, borderless: true }}
            style={{
              width: FOOTER_PILL,
              height: FOOTER_PILL,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radius.pill,
              backgroundColor: theme.color.muted,
              overflow: 'hidden',
            }}
            testID="drawer-account"
            onPress={onAccount}
          >
            <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>{accountInitial}</AppText>
          </Pressable>

          <LanguageToggle
            size="compact"
            palette={{
              border: theme.color.border,
              activeBorder: theme.color.borderFocus,
              activeText: theme.color.accent,
              // The design's inactive option is text/on-accent, i.e. full
              // strength — not the dimmed secondary the auth toggle uses.
              inactiveText: theme.color.textPrimary,
              ripple: theme.color.accentSoft,
            }}
            labelStyle={theme.type.caption}
            testID="drawer-language"
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('chat.drawer.signOut')}
            android_ripple={{ color: theme.color.accentSoft, borderless: true }}
            style={{
              width: FOOTER_PILL,
              height: FOOTER_PILL,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radius.pill,
              backgroundColor: theme.color.muted,
            }}
            testID="drawer-sign-out"
            onPress={() => {
              // TODO(backend): clear the session (keychain) and route to /login.
            }}
          >
            {/* Danger tone per the design — sign-out is the one destructive act here. */}
            <Icon icon={Logout01Icon} size={24} color={theme.color.danger} />
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/*
 * NOT memoised: the panel is themed via inline `theme.color.*` reads, and
 * `React.memo` can short-circuit the re-render that re-evaluates those styles
 * on Fabric — the user's reported bug was the drawer's muted fills staying on
 * the previous palette after a theme toggle. Cost is contained because the
 * drawer is only mounted while visible.
 */
export default ChatDrawer;

function DrawerAction({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: React.ComponentProps<typeof Icon>['icon'];
  label: string;
  onPress: () => void;
  testID: string;
}): React.JSX.Element {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm }}
      hitSlop={8}
      testID={testID}
    >
      <Icon icon={icon} size={18} color={theme.color.textPrimary} />
      <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>{label}</AppText>
    </Pressable>
  );
}
