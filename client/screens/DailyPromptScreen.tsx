import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import {
  getTodayDate,
  getDailyLog,
  saveDailyLog,
  getAppSettings,
  DailyLog,
} from "@/lib/database";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ScreenState = "loading" | "prompt" | "amount" | "confirmed" | "already_logged";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function DailyPromptScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();

  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadTodayData = useCallback(async () => {
    try {
      const settings = await getAppSettings();
      if (!settings.onboarding_completed) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Onboarding" }],
        });
        return;
      }

      const today = getTodayDate();
      const log = await getDailyLog(today);
      setTodayLog(log);

      if (log) {
        setScreenState("already_logged");
      } else {
        setScreenState("prompt");
      }
    } catch (error) {
      setScreenState("prompt");
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadTodayData();
    }, [loadTodayData])
  );

  const handleNoSpend = async () => {
    try {
      setIsSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const today = getTodayDate();
      const log = await saveDailyLog(today, false);
      setTodayLog(log);
      setScreenState("confirmed");
    } catch (error) {
      console.error("Error saving log:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleYesSpend = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScreenState("amount");
  };

  const handleSaveSpend = async () => {
    try {
      setIsSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const today = getTodayDate();
      const parsedAmount = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
      const log = await saveDailyLog(today, true, parsedAmount, note || null);
      setTodayLog(log);
      setScreenState("confirmed");
    } catch (error) {
      console.error("Error saving log:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    if (todayLog) {
      if (todayLog.did_spend) {
        setAmount(todayLog.amount?.toString() || "");
        setNote(todayLog.note || "");
        setScreenState("amount");
      } else {
        setScreenState("prompt");
      }
    }
  };

  const formatDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "long",
      day: "numeric",
    };
    return today.toLocaleDateString(undefined, options);
  };

  const renderContent = () => {
    switch (screenState) {
      case "loading":
        return (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        );

      case "prompt":
        return (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.centerContent}
          >
            <ThemedText type="h2" style={styles.question}>
              Did you spend money today?
            </ThemedText>

            <View style={styles.buttonRow}>
              <AnimatedPressable
                style={[
                  styles.choiceButton,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                onPress={handleNoSpend}
                disabled={isSaving}
              >
                <Feather name="x" size={28} color={theme.text} />
                <ThemedText type="h4" style={styles.choiceText}>
                  No
                </ThemedText>
              </AnimatedPressable>

              <AnimatedPressable
                style={[
                  styles.choiceButton,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                onPress={handleYesSpend}
                disabled={isSaving}
              >
                <Feather name="check" size={28} color={theme.text} />
                <ThemedText type="h4" style={styles.choiceText}>
                  Yes
                </ThemedText>
              </AnimatedPressable>
            </View>
          </Animated.View>
        );

      case "amount":
        return (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.amountContent}
          >
            <ThemedText type="h3" style={styles.amountTitle}>
              How much did you spend?
            </ThemedText>

            <View
              style={[
                styles.amountInputContainer,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <ThemedText type="h2" style={styles.currencySymbol}>
                $
              </ThemedText>
              <TextInput
                style={[styles.amountInput, { color: theme.text }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            <View
              style={[
                styles.noteInputContainer,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <TextInput
                style={[styles.noteInput, { color: theme.text }]}
                value={note}
                onChangeText={setNote}
                placeholder="Add a note (optional)"
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.amountActions}>
              <Pressable
                style={[
                  styles.backButton,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                onPress={() => {
                  setAmount("");
                  setNote("");
                  setScreenState("prompt");
                }}
              >
                <ThemedText type="body">Back</ThemedText>
              </Pressable>

              <Button
                onPress={handleSaveSpend}
                disabled={isSaving || !amount}
                style={styles.saveButton}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </View>
          </Animated.View>
        );

      case "confirmed":
        return (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.centerContent}
          >
            <View
              style={[
                styles.confirmIcon,
                { backgroundColor: theme.accentLight },
              ]}
            >
              <Feather name="check" size={48} color={theme.accent} />
            </View>

            <ThemedText type="h3" style={styles.confirmTitle}>
              Thanks. See you tomorrow
            </ThemedText>

            {todayLog?.did_spend ? (
              <ThemedText type="body" secondary style={styles.confirmDetail}>
                Logged ${todayLog.amount?.toFixed(2) || "0.00"}
                {todayLog.note ? ` - ${todayLog.note}` : ""}
              </ThemedText>
            ) : (
              <ThemedText type="body" secondary style={styles.confirmDetail}>
                No spending logged for today
              </ThemedText>
            )}

            <Pressable onPress={handleEdit} style={styles.editLink}>
              <ThemedText type="link">Edit today's entry</ThemedText>
            </Pressable>
          </Animated.View>
        );

      case "already_logged":
        return (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.centerContent}
          >
            <View
              style={[
                styles.confirmIcon,
                { backgroundColor: theme.accentLight },
              ]}
            >
              <Feather name="check-circle" size={48} color={theme.accent} />
            </View>

            <ThemedText type="h3" style={styles.confirmTitle}>
              Today is logged
            </ThemedText>

            {todayLog?.did_spend ? (
              <ThemedText type="body" secondary style={styles.confirmDetail}>
                You spent ${todayLog.amount?.toFixed(2) || "0.00"}
                {todayLog.note ? ` - ${todayLog.note}` : ""}
              </ThemedText>
            ) : (
              <ThemedText type="body" secondary style={styles.confirmDetail}>
                No spending today
              </ThemedText>
            )}

            <Pressable onPress={handleEdit} style={styles.editLink}>
              <ThemedText type="link">Edit today's entry</ThemedText>
            </Pressable>
          </Animated.View>
        );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing["3xl"],
          },
        ]}
      >
        <View style={styles.header}>
          <View>
            <ThemedText type="h1">Today</ThemedText>
            <ThemedText type="body" secondary>
              {formatDate()}
            </ThemedText>
          </View>

          <Pressable
            style={[styles.iconButton, { backgroundColor: theme.backgroundDefault }]}
            onPress={() => navigation.navigate("Settings")}
          >
            <Feather name="settings" size={20} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.mainContent}>{renderContent()}</View>

        <View style={styles.navButtons}>
          <Pressable
            style={[styles.navButton, { backgroundColor: theme.backgroundDefault }]}
            onPress={() => navigation.navigate("WeeklySummary")}
          >
            <Feather name="calendar" size={18} color={theme.text} />
            <ThemedText type="small" style={styles.navButtonText}>
              This Week
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.navButton, { backgroundColor: theme.backgroundDefault }]}
            onPress={() => navigation.navigate("MonthlyOverview", {})}
          >
            <Feather name="grid" size={18} color={theme.text} />
            <ThemedText type="small" style={styles.navButtonText}>
              Monthly
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
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
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
  },
  centerContent: {
    alignItems: "center",
  },
  question: {
    textAlign: "center",
    marginBottom: Spacing["4xl"],
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    width: "100%",
  },
  choiceButton: {
    flex: 1,
    height: 120,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  choiceText: {
    marginTop: Spacing.xs,
  },
  amountContent: {
    width: "100%",
  },
  amountTitle: {
    textAlign: "center",
    marginBottom: Spacing["3xl"],
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  currencySymbol: {
    marginRight: Spacing.xs,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: "600",
    minWidth: 100,
    textAlign: "center",
  },
  noteInputContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  noteInput: {
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: "top",
  },
  amountActions: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  backButton: {
    flex: 1,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    flex: 2,
  },
  confirmIcon: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius["2xl"],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  confirmTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  confirmDetail: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  editLink: {
    padding: Spacing.md,
  },
  navButtons: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  navButtonText: {
    marginLeft: Spacing.xs,
  },
});
