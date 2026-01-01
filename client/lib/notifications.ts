import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getAppSettings } from "./database";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function scheduleNotification(hour: number, minute: number): Promise<void> {
  if (Platform.OS === "web") return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const trigger: Notifications.DailyTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Spendful",
      body: "Did you spend money today?",
      sound: true,
    },
    trigger,
  });
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

export async function initializeNotifications(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const settings = await getAppSettings();
    
    if (settings.notifications_enabled) {
      const [hours, minutes] = settings.daily_reminder_time.split(":");
      await scheduleNotification(parseInt(hours, 10), parseInt(minutes, 10));
    }
  } catch (error) {
    console.error("Error initializing notifications:", error);
  }
}
