import React, { useCallback } from 'react';

import ChatHeader from './ChatHeader';

/*
 * Home's top bar (Figma 404:1774–404:1798). Thin wrapper over the shared
 * ChatHeader — the menu / model pill / appearance switch come from ChatHeader
 * unchanged and can never drift from the conversation screen's bar.
 *
 * No trailing compose button: "new chat" lives in the drawer (drawer-new-chat),
 * which is where it has always lived for the conversation screen. Two entry
 * points to the same action would just drift.
 */
export type ChatTopBarProps = {
  /** Currently selected model, e.g. "Gemini". */
  model: string;
  onOpenMenu?: () => void;
  onOpenModelPicker?: () => void;
};

function ChatTopBar({ model, onOpenMenu, onOpenModelPicker }: ChatTopBarProps): React.JSX.Element {
  const onMenu = useCallback(() => onOpenMenu?.(), [onOpenMenu]);
  const onModelPress = useCallback(() => onOpenModelPicker?.(), [onOpenModelPicker]);

  return (
    <ChatHeader
      model={model}
      onMenu={onMenu}
      onModelPress={onModelPress}
      menuTestID="chat-menu"
      modelTestID="chat-model-pill"
      themeToggleTestID="chat-theme-toggle"
    />
  );
}

/*
 * NOT memoised: it is a thin wrapper over ChatHeader (already non-memo, see
 * its header note), and adding memo here is what made the bar's themed fills
 * stale on toggle. Cost of re-rendering this body on every parent render is
 * trivial.
 */
export default ChatTopBar;
