import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../src/app/App';

test('the app mounts with theme, navigation and copy', async () => {
  jest.useFakeTimers();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  // Flush the day strip's initial scroll and the seed import scheduled after
  // the first frame, then unmount so nothing fires after the test ends.
  await ReactTestRenderer.act(async () => {
    jest.runOnlyPendingTimers();
  });
  await ReactTestRenderer.act(async () => {
    renderer?.unmount();
  });
  jest.useRealTimers();
});
