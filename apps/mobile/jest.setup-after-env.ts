// Adds the React Native matchers (toHaveStyle, toBeVisible, …) and their types.
import '@testing-library/react-native/extend-expect';
import { render } from '@testing-library/react-native';
import { createElement } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';

// The first render of a test file loads and transforms much of React Native and the test
// renderer on demand. On a cold CI runner that takes seconds, which used to land inside the first
// test's timeout. A throwaway render here pays it under a timeout of its own, so the tests'
// timeouts measure the app only.
beforeAll(() => {
  const warmUp = render(createElement(
    View,
    null,
    createElement(Text, null, 'warm-up'),
    createElement(Pressable),
    createElement(ActivityIndicator),
    createElement(KeyboardAvoidingView, null, createElement(ScrollView, null, createElement(TextInput))),
  ));
  warmUp.unmount();
}, 60_000);
