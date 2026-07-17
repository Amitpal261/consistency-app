import { registerRootComponent } from 'expo';
import notifee from '@notifee/react-native';
import { handleNotifeeAlarmEvent } from './src/lib/alarm';

import App from './App';
import './src/lib/geofence';

// Runs even if the app is fully killed (Android headless task). This is
// what lets the alarm ring loudly on STREAM_ALARM (bypassing DND) instead
// of just showing a notification — see handleNotifeeAlarmEvent in
// src/lib/alarm.ts. Navigation-on-tap is still handled later, on app
// startup, via getHabitIdFromAlarmLaunch()/getPendingAlarmHabitId() in App.tsx.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  await handleNotifeeAlarmEvent(type, detail);
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);