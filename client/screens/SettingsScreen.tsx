import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import {
  getAppSettings,
  updateAppSettings,
  getSubscription,
  AppSettings,
  Subscription,
} from "@/lib/database";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const appSettings = await getAppSettings();
      const sub = await getSubscription();

      setSettings(appSettings);
      setSubscription(sub);

      const [hours, minutes] = appSettings.daily_reminder_time.split(":");
      const time = new Date();
      time.setHours(parseInt(hours, 10));
      time.setMinutes(parseInt(minutes, 10));
      setReminderTime(time);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (value && Platform.OS !== "web") {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please enable notifications in your device settings."
          );
          return;
        }
      }

      await updateAppSettings({ notifications_enabled: value });
      setSettings((prev) =>
        prev ? { ...prev, notifications_enabled: value } : null
      );

      if (value) {
        await scheduleNotification();
      } else {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
    } catch (error) {
      console.error("Error toggling notifications:", error);
    }
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === "ios");

    if (selectedDate) {
      setReminderTime(selectedDate);

      const hours = selectedDate.getHours().toString().padStart(2, "0");
      const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
      const timeString = `${hours}:${minutes}`;

      await updateAppSettings({ daily_reminder_time: timeString });
      setSettings((prev) =>
        prev ? { ...prev, daily_reminder_time: timeString } : null
      );

      if (settings?.notifications_enabled) {
        await scheduleNotification();
      }
    }
  };

  const scheduleNotification = async () => {
    if (Platform.OS === "web") return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    const trigger = {
      type: "daily" as const,
      hour: reminderTime.getHours(),
      minute: reminderTime.getMinutes(),
    };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Spendful",
        body: "Did you spend money today?",
        sound: true,
      },
      trigger,
    });
  };

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getPlanDisplayName = () => {
    if (!subscription) return "Free";
    if (subscription.plan === "free" || !subscription.is_active) return "Free";
    return subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <ThemedText type="small" secondary style={styles.sectionTitle}>
            Reminders
          </ThemedText>

          <Card elevation={1} style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Feather name="bell" size={20} color={theme.text} />
                <ThemedText type="body" style={styles.settingLabel}>
                  Daily reminders
                </ThemedText>
              </View>
              <Switch
                value={settings?.notifications_enabled || false}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor={theme.backgroundRoot}
              />
            </View>

            <View style={styles.divider} />

            <Pressable
              style={styles.settingRow}
              onPress={() => setShowTimePicker(true)}
              disabled={!settings?.notifications_enabled}
            >
              <View style={styles.settingInfo}>
                <Feather name="clock" size={20} color={theme.text} />
                <ThemedText
                  type="body"
                  style={[
                    styles.settingLabel,
                    !settings?.notifications_enabled && { opacity: 0.5 },
                  ]}
                >
                  Reminder time
                </ThemedText>
              </View>
              <View style={styles.settingValue}>
                <ThemedText
                  type="body"
                  secondary
                  style={!settings?.notifications_enabled && { opacity: 0.5 }}
                >
                  {formatTime(reminderTime)}
                </ThemedText>
                <Feather name="chevron-right" size={20} color={theme.textMuted} />
              </View>
            </Pressable>
          </Card>

          {showTimePicker || Platform.OS === "ios" ? (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={reminderTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleTimeChange}
                textColor={theme.text}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <ThemedText type="small" secondary style={styles.sectionTitle}>
            Subscription
          </ThemedText>

          <Card
            elevation={1}
            style={styles.settingsCard}
            onPress={() => navigation.navigate("Paywall")}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Feather name="star" size={20} color={theme.accent} />
                <View>
                  <ThemedText type="body" style={styles.settingLabel}>
                    Current plan
                  </ThemedText>
                  <ThemedText type="caption" muted>
                    {subscription?.plan === "free" || !subscription?.is_active
                      ? "14 days of history"
                      : "Unlimited history"}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.settingValue}>
                <ThemedText type="body" style={{ color: theme.accent }}>
                  {getPlanDisplayName()}
                </ThemedText>
                <Feather name="chevron-right" size={20} color={theme.textMuted} />
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <ThemedText type="small" secondary style={styles.sectionTitle}>
            About
          </ThemedText>

          <Card elevation={1} style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Feather name="info" size={20} color={theme.text} />
                <ThemedText type="body" style={styles.settingLabel}>
                  Version
                </ThemedText>
              </View>
              <ThemedText type="body" secondary>
                1.0.0
              </ThemedText>
            </View>
          </Card>
        </View>

        <View style={styles.appInfo}>
          <ThemedText type="h4" style={styles.appName}>
            Spendful
          </ThemedText>
          <ThemedText type="caption" muted style={styles.tagline}>
            Calm awareness, one day at a time.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing["4xl"],
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    marginLeft: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  settingsCard: {
    padding: 0,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  settingLabel: {
    flex: 1,
  },
  settingValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginHorizontal: Spacing.lg,
  },
  pickerContainer: {
    marginTop: Spacing.md,
    alignItems: "center",
  },
  appInfo: {
    alignItems: "center",
    paddingTop: Spacing["3xl"],
  },
  appName: {
    marginBottom: Spacing.xs,
  },
  tagline: {
    textAlign: "center",
  },
});
