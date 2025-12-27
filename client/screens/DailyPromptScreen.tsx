import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import {
  getTodayDate,
  getDailyLog,
  saveDailyLog,
  getAppSettings,
  getSubscription,
  canViewDate,
  DailyLog,
  SPENDING_CATEGORIES,
} from "@/lib/database";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DailyPromptRouteProp = RouteProp<RootStackParamList, "DailyPrompt">;

type ScreenState = "loading" | "prompt" | "amount" | "confirmed" | "already_logged";

export default function DailyPromptScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DailyPromptRouteProp>();
  const { theme } = useTheme();

  const targetDate = route.params?.targetDate || getTodayDate();
  const isEditMode = route.params?.mode === "edit";
  const isToday = targetDate === getTodayDate();

  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [currentLog, setCurrentLog] = useState<DailyLog | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Uncategorized");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const settings = await getAppSettings();
      if (!settings.onboarding_completed && !isEditMode) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Onboarding" }],
        });
        return;
      }

      const subscription = await getSubscription();
      const canAccess = canViewDate(targetDate, subscription, settings.free_history_days);

      if (!canAccess) {
        navigation.replace("Paywall");
        return;
      }

      const log = await getDailyLog(targetDate);
      setCurrentLog(log);

      if (isEditMode && log) {
        setAmount(log.amount?.toString() || "");
        setCategory(log.category || "Uncategorized");
        setNote(log.note || "");
        if (log.did_spend) {
          setScreenState("amount");
        } else {
          setScreenState("prompt");
        }
      } else if (log) {
        setAmount(log.amount?.toString() || "");
        setCategory(log.category || "Uncategorized");
        setNote(log.note || "");
        setScreenState("already_logged");
      } else {
        setScreenState("prompt");
      }
    } catch (error) {
      setScreenState("prompt");
    }
  }, [navigation, targetDate, isEditMode]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNoSpend = async () => {
    try {
      setIsSaving(true);
      triggerHaptic();

      const log = await saveDailyLog(targetDate, false, null, null, null);
      setCurrentLog(log);
      setScreenState("confirmed");
    } catch (error) {
      console.error("Error saving log:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleYesSpend = () => {
    triggerHaptic();
    setScreenState("amount");
  };

  const handleSaveSpend = async () => {
    const parsedAmount = parseFloat(amount.replace(/[^0-9.]/g, ""));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    try {
      setIsSaving(true);
      triggerHaptic();

      const log = await saveDailyLog(targetDate, true, parsedAmount, category, note.trim() || null);
      setCurrentLog(log);
      setScreenState("confirmed");
    } catch (error) {
      console.error("Error saving log:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDisplayDate = () => {
    const date = new Date(targetDate + "T12:00:00");
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString(undefined, options);
  };

  const getHeaderTitle = () => {
    if (isToday) {
      return "Today";
    }
    return isEditMode ? "Edit Entry" : "Log Entry";
  };

  const isValidAmount = () => {
    const parsedAmount = parseFloat(amount.replace(/[^0-9.]/g, ""));
    return !isNaN(parsedAmount) && parsedAmount > 0;
  };

  const handleEditLog = () => {
    triggerHaptic();
    if (currentLog?.did_spend) {
      setScreenState("amount");
    } else {
      setScreenState("prompt");
    }
  };

  const handleBack = () => {
    if (isEditMode) {
      navigation.goBack();
    } else {
      setAmount("");
      setNote("");
      setCategory("Uncategorized");
      setScreenState("prompt");
    }
  };

  const renderCategorySelector = () => {
    if (Platform.OS === "web") {
      return (
        <View style={[styles.categoryContainer, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" secondary style={styles.categoryLabel}>
            Category (optional)
          </ThemedText>
          <View style={styles.categoryButtons}>
            {SPENDING_CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: category === cat ? theme.accent : theme.backgroundSecondary,
                  },
                ]}
                onPress={() => setCategory(cat)}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: category === cat ? "#fff" : theme.text,
                  }}
                >
                  {cat}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.categoryContainer, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="small" secondary style={styles.categoryLabel}>
          Category (optional)
        </ThemedText>
        <Pressable
          style={[styles.categorySelector, { backgroundColor: theme.backgroundSecondary }]}
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
        >
          <ThemedText type="body">{category}</ThemedText>
          <Feather
            name={showCategoryPicker ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>
        {showCategoryPicker ? (
          <View style={styles.categoryList}>
            {SPENDING_CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.categoryOption,
                  {
                    backgroundColor: category === cat ? theme.accentLight : "transparent",
                  },
                ]}
                onPress={() => {
                  setCategory(cat);
                  setShowCategoryPicker(false);
                }}
              >
                <ThemedText type="body">{cat}</ThemedText>
                {category === cat ? (
                  <Feather name="check" size={18} color={theme.accent} />
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    );
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
          <View style={styles.centerContent}>
            <ThemedText type="h2" style={styles.question}>
              {isToday ? "Did you spend money today?" : "Did you spend money this day?"}
            </ThemedText>

            <View style={styles.buttonRow}>
              <Pressable
                style={[
                  styles.choiceButton,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                onPress={handleNoSpend}
                disabled={isSaving}
              >
                <ThemedText type="h3" style={styles.choiceText}>
                  No
                </ThemedText>
              </Pressable>

              <Pressable
                style={[
                  styles.choiceButton,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                onPress={handleYesSpend}
                disabled={isSaving}
              >
                <ThemedText type="h3" style={styles.choiceText}>
                  Yes
                </ThemedText>
              </Pressable>
            </View>
          </View>
        );

      case "amount":
        return (
          <View style={styles.amountContent}>
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
                autoFocus={!isEditMode}
              />
            </View>

            {renderCategorySelector()}

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
                onPress={handleBack}
              >
                <ThemedText type="body">{isEditMode ? "Cancel" : "Back"}</ThemedText>
              </Pressable>

              <Button
                onPress={handleSaveSpend}
                disabled={isSaving || !isValidAmount()}
                style={styles.saveButton}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </View>
          </View>
        );

      case "confirmed":
        return (
          <View style={styles.centerContent}>
            <ThemedText type="h2" style={styles.confirmTitle}>
              {isEditMode ? "Entry updated." : "Thanks. See you tomorrow."}
            </ThemedText>
            {isEditMode ? (
              <Button onPress={() => navigation.goBack()} style={{ marginTop: Spacing.xl }}>
                Go Back
              </Button>
            ) : null}
          </View>
        );

      case "already_logged":
        return (
          <View style={styles.centerContent}>
            <View
              style={[
                styles.confirmIcon,
                { backgroundColor: theme.accentLight },
              ]}
            >
              <Feather name="check" size={48} color={theme.accent} />
            </View>

            <ThemedText type="h3" style={styles.confirmTitle}>
              {isToday ? "You've checked in today." : "Entry logged."}
            </ThemedText>

            {currentLog?.did_spend ? (
              <ThemedText type="body" secondary style={styles.confirmDetail}>
                Spent ${currentLog.amount?.toFixed(2) || "0.00"}
                {currentLog.category && currentLog.category !== "Uncategorized"
                  ? ` on ${currentLog.category}`
                  : ""}
                {currentLog.note ? ` - ${currentLog.note}` : ""}
              </ThemedText>
            ) : (
              <ThemedText type="body" secondary style={styles.confirmDetail}>
                No spending {isToday ? "today" : "this day"}
              </ThemedText>
            )}

            <Pressable
              style={[styles.editButton, { backgroundColor: theme.backgroundDefault }]}
              onPress={handleEditLog}
            >
              <Feather name="edit-2" size={16} color={theme.text} />
              <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                Edit
              </ThemedText>
            </Pressable>
          </View>
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
            <ThemedText type="h1">{getHeaderTitle()}</ThemedText>
            <ThemedText type="body" secondary>
              {formatDisplayDate()}
            </ThemedText>
          </View>

          {isToday ? (
            <Pressable
              style={[styles.iconButton, { backgroundColor: theme.backgroundDefault }]}
              onPress={() => navigation.navigate("Settings")}
            >
              <Feather name="settings" size={20} color={theme.text} />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.iconButton, { backgroundColor: theme.backgroundDefault }]}
              onPress={() => navigation.goBack()}
            >
              <Feather name="x" size={20} color={theme.text} />
            </Pressable>
          )}
        </View>

        <View style={styles.mainContent}>{renderContent()}</View>

        {isToday && screenState !== "amount" ? (
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
        ) : null}
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
    height: 100,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceText: {
    textAlign: "center",
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
  categoryContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  categoryLabel: {
    marginBottom: Spacing.sm,
  },
  categorySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  categoryList: {
    marginTop: Spacing.sm,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  categoryButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
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
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
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
