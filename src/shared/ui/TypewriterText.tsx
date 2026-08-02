import React, { useEffect, useRef, useState } from 'react';
import { Pressable, type TextStyle } from 'react-native';

import { AppText } from './AppText';

/*
 * Reveals text one WORD at a time, the way a streamed model reply arrives.
 *
 * Why words and not characters: a character typewriter re-wraps the last line on
 * almost every tick, so the paragraph visibly jitters. Revealing whole words
 * means a line only ever reflows when a word genuinely does not fit, which is
 * what real streaming looks like.
 *
 * ONLY THE ARRIVING MESSAGE ANIMATES. `animate={false}` renders the whole string
 * immediately, and callers pass that for every message already in the
 * transcript: replaying the reveal for the entire history on every mount (a
 * scroll, a re-render, coming back from another screen) would be absurd, and it
 * would also make old messages look like they were still being written.
 *
 * TAP TO SKIP. A long reply is a long wait, and a user who wants to read ahead
 * should not have to. Tapping completes it instantly; `onDone` still fires, so
 * whatever the caller does at the end (scroll to bottom, re-enable the composer)
 * happens either way.
 *
 * The interval is cleared on unmount AND whenever the text changes, so a
 * conversation switched mid-reveal cannot leave a timer writing into a component
 * that no longer exists.
 */
const WORD_INTERVAL_MS = 45;

/** Split into visible word-sized chunks while preserving all original whitespace. */
export function wordChunks(text: string): string[] {
  return text.match(/\s*\S+(?:\s+|$)/g) ?? (text ? [text] : []);
}

export type TypewriterTextProps = {
  text: string;
  /** False renders the full text at once — the default for stored messages. */
  animate?: boolean;
  style?: TextStyle;
  /** Milliseconds between words. */
  intervalMs?: number;
  /** Called once the last word is on screen (including after a tap-to-skip). */
  onDone?: () => void;
  /** Called after each newly revealed word, used to keep chat pinned to bottom. */
  onProgress?: () => void;
  /** Announced to screen readers, which never see the partial string. */
  accessibilityLabel?: string;
  testID?: string;
};

export default function TypewriterText({
  text,
  animate = false,
  style,
  intervalMs = WORD_INTERVAL_MS,
  onDone,
  onProgress,
  accessibilityLabel,
  testID,
}: TypewriterTextProps): React.JSX.Element {
  // Each interval reveals one visible word. Whitespace stays attached to its
  // neighbouring word, preserving paragraphs without wasting every second tick
  // on an invisible whitespace-only update.
  const parts = React.useMemo(() => wordChunks(text), [text]);

  const [count, setCount] = useState(() => (animate ? 0 : parts.length));
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;

    if (!animate) {
      setCount(parts.length);
      return;
    }

    setCount(0);
    const timer = setInterval(() => {
      setCount((current) => {
        const next = current + 1;
        if (next >= parts.length) clearInterval(timer);
        return Math.min(next, parts.length);
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [animate, parts, intervalMs]);

  // Fire onDone exactly once per text, from an effect rather than inside the
  // interval callback — calling a parent's setState from within a timer tick
  // that is also calling our own setState is how double-scroll bugs start.
  useEffect(() => {
    // Settled history is rendered with animate=false. It must never report
    // completion, otherwise an older message can clear the new reply's shared
    // streaming id before that reply reveals its first word.
    if (animate && count >= parts.length && !doneRef.current) {
      doneRef.current = true;
      onDone?.();
    }
  }, [animate, count, parts.length, onDone]);

  useEffect(() => {
    if (animate && count > 0) onProgress?.();
  }, [animate, count, onProgress]);

  const revealed = count >= parts.length ? text : parts.slice(0, count).join('');
  const streaming = count < parts.length;

  return (
    <Pressable
      onPress={streaming ? () => setCount(parts.length) : undefined}
      disabled={!streaming}
      accessibilityRole="text"
      // Screen readers get the COMPLETE text: a partial string read aloud as it
      // grows would repeat the whole reply on every word.
      accessibilityLabel={accessibilityLabel ?? text}
      testID={testID}
    >
      <AppText style={style}>
        {revealed}
        {streaming ? '▍' : ''}
      </AppText>
    </Pressable>
  );
}
