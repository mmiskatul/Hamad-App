import React from 'react';
import { act, render, screen } from '@testing-library/react-native';

import TypewriterText, { wordChunks } from '../TypewriterText';
import { AppText } from '../AppText';

jest.useFakeTimers();

describe('TypewriterText', () => {
  it('preserves spacing while making every chunk one visible word', () => {
    expect(wordChunks('One two\nthree')).toEqual(['One ', 'two\n', 'three']);
  });

  it('reveals one word per interval and completes once', () => {
    const onDone = jest.fn();
    const onProgress = jest.fn();
    render(
      <TypewriterText
        text="One two three"
        animate
        intervalMs={50}
        onDone={onDone}
        onProgress={onProgress}
        testID="streamed-text"
      />,
    );

    const renderedText = () => screen.getByTestId('streamed-text').findByType(AppText).props.children;
    expect(renderedText()).toEqual(['', '▍']);

    act(() => jest.advanceTimersByTime(50));
    expect(renderedText()).toEqual(['One ', '▍']);
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(100));
    expect(renderedText()).toEqual(['One two three', '']);
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('does not fire completion for an already settled message', () => {
    const onDone = jest.fn();
    render(<TypewriterText text="Stored reply" onDone={onDone} />);

    expect(onDone).not.toHaveBeenCalled();
  });
});
