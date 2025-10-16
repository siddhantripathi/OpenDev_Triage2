import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import React from 'react';

import ErrorBoundary from './ErrorBoundary';
import App from './App';

function AppWithErrorBoundary() {
  return React.createElement(ErrorBoundary, null, React.createElement(App, null));
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(AppWithErrorBoundary);
