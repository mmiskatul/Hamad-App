import { useEffect, useState } from 'react';
import {
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedReaction,
} from 'react-native-reanimated';

/*
 * useKeyboardOpen — boolean form of the reanimated keyboard state used by
 * KeyboardAvoider, mirrored to the JS thread so React can re-render from it.
 *
 * Single consumer right now (ChatHomeScreen decides hero visibility from it).
 * Returns true when the software keyboard is currently visible (height > 0),
 * false otherwise.
 *
 * WHY THE REACT STATE, NOT .value IN THE RENDER BODY:
 * `useAnimatedKeyboard().height` is a Reanimated SharedValue. Reading `.value`
 * straight from a JS-thread render body captures a stale snapshot — the JS
 * thread does not re-render when a SharedValue changes on the UI thread, so
 * the screen would never repaint as the keyboard opens or closes. We bridge
 * the height into a `useState` so that any consumer can render against it
 * normally.
 *
 * HOW WE BRIDGE: `useAnimatedReaction` runs on the UI thread and only invokes
 * `runOnJS(setOpen)` when the *boolean* flips (open ⇔ closed), not on every
 * pixel of the animation — so React repaints once at the start of the
 * keyboard rise and once at the end of the dismiss, no per-frame churn.
 *
 * The ?.value guard mirrors KeyboardAvoider.tsx:69 because reanimated's jest
 * mock returns `{ height: { value: 0 } }` rather than a SharedValue, which
 * would otherwise make `keyboard.height.value` throw under tests.
 */
export default function useKeyboardOpen(): boolean {
  const keyboard = useAnimatedKeyboard();
  const [open, setOpen] = useState(false);

  // Seed once from whatever the UI thread already has — on a hot navigation
  // back to the home screen with the IME still up, this avoids a one-frame
  // stale `false` before the next show/hide event.
  useEffect(() => {
    setOpen((keyboard.height?.value ?? 0) > 0);
  }, [keyboard]);

  useAnimatedReaction(
    () => (keyboard.height?.value ?? 0) > 0,
    (next, prev) => {
      if (next !== prev) runOnJS(setOpen)(next);
    },
    [keyboard],
  );

  return open;
}