import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── Configure how notifications appear when app is foregrounded ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
    shouldShowBanner: true,  
    shouldShowList:   true,
  }),
});

// ── Request permissions ───────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('❌ Notification permission denied');
    return false;
  }

  // Android channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('diet-reminders', {
      name:        'Diet Reminders',
      importance:  Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:  '#059669',
    });
  }

  console.log('✓ Notification permission granted');
  return true;
}

// ── Cancel all scheduled notifications ───────────────────────────
export async function cancelAllDietNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('✓ All scheduled notifications cancelled');
}

// ── PRODUCTION: Schedule before meals (daily) ────────────────────
export async function scheduleDietNotifications(
  dietName: string,
  principles: string[]
) {
  await cancelAllDietNotifications();

  const mealSchedules = [
    { hour: 7,  minute: 30, meal: 'Breakfast 🌅', principleIndex: 0 },
    { hour: 11, minute: 30, meal: 'Lunch ☀️',      principleIndex: 1 },
    { hour: 18, minute: 30, meal: 'Dinner 🌙',     principleIndex: 2 },
  ];

  for (const schedule of mealSchedules) {
    const principle = principles[schedule.principleIndex];
    if (!principle) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🥗 You have to follow ${dietName} diet for ${schedule.meal}`,
        body:  principle,
        data:  { type: 'diet-reminder', meal: schedule.meal },
      },
      trigger: {
  type:    Notifications.SchedulableTriggerInputTypes.DAILY,
  hour:    schedule.hour,
  minute:  schedule.minute,
},
    });

    console.log(`✓ Scheduled: ${schedule.meal} at ${schedule.hour}:${String(schedule.minute).padStart(2, '0')}`);
  }

  console.log('✓ All diet notifications scheduled!');
}

// ── TESTING: Send 3 notifications 3 minutes apart ────────────────
export async function scheduleTestNotifications(
  dietName: string,
  principles: string[]
) {
  await cancelAllDietNotifications();

  const labels = ['Breakfast 🌅', 'Lunch ☀️', 'Dinner 🌙'];

  for (let i = 0; i < 3; i++) {
    const principle = principles[i] || principles[0];
    const delaySeconds = (i + 1) * 180;   // 3min, 6min, 9min

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🥗 You have to follow ${dietName} diet for ${labels[i]}`,
        body:  principle,
        data:  { type: 'diet-reminder-test', index: i },
      },
      trigger: {
  type:    Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
  seconds: delaySeconds,
  repeats: false,
},
    });

    const mins = Math.floor(delaySeconds / 60);
    console.log(`✓ Test notification ${i + 1} scheduled in ${mins} min: "${principle}"`);
  }

  console.log('✓ 3 test notifications scheduled (3min, 6min, 9min)');
  return true;
}

// ── Get all scheduled notifications (for debugging) ──────────────
export async function getScheduledNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  console.log(`Scheduled notifications: ${scheduled.length}`);
  scheduled.forEach((n, i) => {
    console.log(`  ${i + 1}. ${n.content.title}`);
  });
  return scheduled;
}