import { registerRootComponent } from 'expo';
import notifee from '@notifee/react-native';

import App from './App';

// Required by notifee even if we don't need to do anything here — the
// actual "where do we navigate to" logic runs later, on app startup, via
// wasOpenedFromAlarm() in src/lib/alarm.ts.
notifee.onBackgroundEvent(async () => {});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
