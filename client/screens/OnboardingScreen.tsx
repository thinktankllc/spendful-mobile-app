import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { updateAppSettings } from "@/lib/database";
import {
  requestNotificationPermission,
  scheduleNotification,
} from "@/lib/notifications";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface OnboardingPage {
  id: number;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
}

const pages: OnboardingPage[] = [
  {
    id: 1,
    title: "This is not a budget",
    subtitle:
      "Spendful is a calm space for awareness. No categories, no limits, no judgment. Just a simple daily question.",
    icon: "heart",
  },
  {
    id: 2,
    title: "One question, once a day",
    subtitle:
      'Each day, we’ll ask you one thing:\n"Did you spend money today?"\n\nThat’s it. Nothing more.',
    icon: "help-circle",
  },
  {
    id: 3,
    title: "Awareness, not control",
    subtitle:
      "This isn’t about restricting yourself. It’s about noticing patterns and building gentle awareness of your spending habits.",
    icon: "eye",
  },
  {
    id: 4,
    title: "Set your reminder",
    subtitle:
      "Choose a time when you’d like to reflect on your day. We’ll send you a gentle nudge.",
    icon: "bell",
  },
];

function PageIndicator({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.indicatorContainer}>
      {Array.from({ length: totalPages }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.indicator,
            {
              backgroundColor:
                index === currentPage ? theme.accent : theme.border,
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);
  const [reminderTime, setReminderTime] = useState(new Date(2024, 0, 1, 20, 0));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleNext = async () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      await completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const completeOnboarding = async () => {
    const hours = reminderTime.getHours().toString().padStart(2, "0");
    const minutes = reminderTime.getMinutes().toString().padStart(2, "0");
    const timeString = `${hours}:${minutes}`;

    await updateAppSettings({
      onboarding_completed: true,
      first_launch_at: Date.now(),
      daily_reminder_time: timeString,
      notifications_enabled: notificationsEnabled,
    });

    if (notificationsEnabled) {
      await scheduleNotification(
        reminderTime.getHours(),
        reminderTime.getMinutes(),
      );
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "DailyPrompt" }],
      }),
    );
  };

  const handleRequestNotificationPermission = async () => {
    if (Platform.OS === "web") {
      setNotificationsEnabled(!notificationsEnabled);
      return;
    }

    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationsEnabled((prevState) => !prevState);
    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedDate) {
      setReminderTime(selectedDate);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const currentPageData = pages[currentPage];
  const isLastPage = currentPage === pages.length - 1;

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.header}>
        {currentPage > 0 ? (
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}

        <PageIndicator currentPage={currentPage} totalPages={pages.length} />

        {!isLastPage ? (
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <ThemedText type="body" secondary>
              Skip
            </ThemedText>
          </Pressable>
        ) : (
          <View style={styles.skipButton} />
        )}
      </View>

      <View style={styles.pageContainer}>
        <Animated.View
          key={currentPage}
          entering={FadeIn.duration(300)}
          style={styles.pageContent}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: theme.accentLight },
            ]}
          >
            <Feather
              name={currentPageData.icon}
              size={48}
              color={theme.accent}
            />
          </View>

          <ThemedText type="h2" style={styles.title}>
            {currentPageData.title}
          </ThemedText>

          <ThemedText type="body" secondary style={styles.subtitle}>
            {currentPageData.subtitle}
          </ThemedText>

          {isLastPage ? (
            <View style={styles.reminderSection}>
              <Pressable
                style={[
                  styles.timeButton,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                onPress={() => setShowTimePicker(true)}
              >
                <Feather name="clock" size={20} color={theme.text} />
                <ThemedText type="h4" style={styles.timeText}>
                  {formatTime(reminderTime)}
                </ThemedText>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={theme.textMuted}
                />
              </Pressable>

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

              <Pressable
                style={[
                  styles.notificationToggle,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                onPress={handleRequestNotificationPermission}
              >
                <View style={styles.notificationContent}>
                  <Feather
                    name={notificationsEnabled ? "bell" : "bell-off"}
                    size={20}
                    color={
                      notificationsEnabled ? theme.accent : theme.textMuted
                    }
                  />
                  <ThemedText type="body" style={styles.notificationText}>
                    Daily reminders
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.toggleIndicator,
                    {
                      backgroundColor: notificationsEnabled
                        ? theme.accent
                        : theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleDot,
                      {
                        backgroundColor: theme.backgroundRoot,
                        transform: [
                          { translateX: notificationsEnabled ? 16 : 0 },
                        ],
                      },
                    ]}
                  />
                </View>
              </Pressable>
            </View>
          ) : null}
        </Animated.View>
      </View>

      <View style={[styles.footer, { paddingHorizontal: Spacing.xl }]}>
        <Button onPress={handleNext} style={styles.nextButton}>
          {isLastPage ? "Get Started" : "Continue"}
        </Button>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  skipButton: {
    width: 44,
    height: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  indicatorContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pageContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  pageContent: {
    alignItems: "center",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius["2xl"],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["3xl"],
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  subtitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  reminderSection: {
    width: "100%",
    marginTop: Spacing["3xl"],
    gap: Spacing.lg,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  timeText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  pickerContainer: {
    alignItems: "center",
  },
  notificationToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationText: {
    marginLeft: Spacing.md,
  },
  toggleIndicator: {
    width: 44,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  footer: {
    paddingTop: Spacing.xl,
  },
  nextButton: {
    width: "100%",
  },
});
