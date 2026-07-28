import React from 'react';
import { ScrollView, type ViewStyle } from 'react-native';

/*
 * The middle of a centred form screen — the part that has to give way when the
 * keyboard takes half the screen.
 *
 * THE BUG THIS EXISTS TO PREVENT: a form block written as
 * `<View style={{ flex: 1, justifyContent: 'center' }}>` centres beautifully at
 * rest, and then LIES once KeyboardAvoider shrinks the column. flex:1 shrinks the
 * BOX; the header, fields and buttons inside it keep their natural height, so the
 * content simply overflows its own container and paints on top of whatever sits
 * below — on the login screen, the legal footer landed across the Google and
 * Apple buttons. Nothing clips it, because React Native does not clip by default.
 *
 * A ScrollView with `flexGrow: 1` + `justifyContent: 'center'` is the fix that
 * keeps both behaviours: with room to spare the content is centred exactly as
 * before (flexGrow lets the content container fill the viewport), and when the
 * space is smaller than the content the same container scrolls instead of
 * overflowing. There is no third state and no measurement to get wrong.
 *
 * `keyboardShouldPersistTaps="handled"` matters more than it looks: without it
 * the first tap on a button while the keyboard is up is swallowed by the
 * dismissal, so every CTA needs pressing twice.
 */
export type FormScrollAreaProps = {
  children: React.ReactNode;
  /** Merged into the content container, e.g. extra horizontal padding. */
  contentStyle?: ViewStyle;
  testID?: string;
};

export default function FormScrollArea({
  children,
  contentStyle,
  testID,
}: FormScrollAreaProps): React.JSX.Element {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[{ flexGrow: 1, justifyContent: 'center' }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      testID={testID}
    >
      {children}
    </ScrollView>
  );
}
