import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  FlatList,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import {
  getTodayDate,
  getDayData,
  addSpendEntry,
  updateSpendEntry,
  deleteSpendEntry,
  getAppSettings,
  getSubscription,
  canViewDate,
  formatCurrency,
  SpendEntry,
  DayData,
  SPENDING_CATEGORIES,
} from "@/lib/database";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DailyPromptRouteProp = RouteProp<RootStackParamList, "DailyPrompt">;

type ScreenState = "loading" | "day_view" | "add_entry" | "edit_entry";

export default function DailyPromptScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DailyPromptRouteProp>();
  const { theme } = useTheme();

  const targetDate = route.params?.targetDate || getTodayDate();
  const isToday = targetDate === getTodayDate();

  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [dayData, setDayData] = useState<DayData | null>(null);
  const [editingEntry, setEditingEntry] = useState<SpendEntry | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Uncategorized");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const settings = await getAppSettings();
      if (!settings.onboarding_completed) {
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

      const data = await getDayData(targetDate);
      setDayData(data);
      setScreenState("day_view");
    } catch (error) {
      setScreenState("day_view");
    }
  }, [navigation, targetDate]);

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

  const handleAddEntry = () => {
    triggerHaptic();
    setAmount("");
    setCategory("Uncategorized");
    setNote("");
    setEditingEntry(null);
    setScreenState("add_entry");
  };

  const handleEditEntry = (entry: SpendEntry) => {
    triggerHaptic();
    setAmount(entry.amount.toString());
    setCategory(entry.category || "Uncategorized");
    setNote(entry.note || "");
    setEditingEntry(entry);
    setScreenState("edit_entry");
  };

  const handleDeleteEntry = (entry: SpendEntry) => {
    triggerHaptic();
    
    const doDelete = async () => {
      try {
        await deleteSpendEntry(entry.entry_id);
        await loadData();
      } catch (error) {
        console.error("Error deleting entry:", error);
      }
    };

    if (Platform.OS === "web") {
      if (confirm("Remove this entry?")) {
        doDelete();
      }
    } else {
      Alert.alert(
        "Remove Entry",
        "Are you sure you want to remove this entry?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

  const handleSaveEntry = async () => {
    const parsedAmount = parseFloat(amount.replace(/[^0-9.]/g, ""));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    try {
      setIsSaving(true);
      triggerHaptic();

      if (editingEntry) {
        await updateSpendEntry(
          editingEntry.entry_id,
          parsedAmount,
          category,
          note.trim() || null
        );
      } else {
        await addSpendEntry(targetDate, parsedAmount, category, note.trim() || null);
      }

      setAmount("");
      setCategory("Uncategorized");
      setNote("");
      setEditingEntry(null);
      await loadData();
    } catch (error) {
      console.error("Error saving entry:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setAmount("");
    setCategory("Uncategorized");
    setNote("");
    setEditingEntry(null);
    setShowCategoryPicker(false);
    setScreenState("day_view");
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

  const formatEntryTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isValidAmount = () => {
    const parsedAmount = parseFloat(amount.replace(/[^0-9.]/g, ""));
    return !isNaN(parsedAmount) && parsedAmount > 0;
  };

  const renderCategorySelector = () => {
    if (Platform.OS === "web") {
      return (
        <View style={[styles.categoryContainer, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" secondary style={styles.categoryLabel}>
            Category
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
          Category
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
          <Animated.View 
            entering={FadeIn.duration(150)} 
            exiting={FadeOut.duration(100)}
            style={styles.categoryList}
          >
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
          </Animated.View>
        ) : null}
      </View>
    );
  };

  const renderEntryItem = ({ item }: { item: SpendEntry }) => (
    <Animated.View entering={FadeIn.duration(200)}>
      <Card style={styles.entryCard}>
        <Pressable
          style={styles.entryContent}
          onPress={() => handleEditEntry(item)}
        >
          <View style={styles.entryMain}>
            <View style={styles.entryHeader}>
              <ThemedText type="h3">{formatCurrency(item.amount)}</ThemedText>
              <ThemedText type="small" secondary>
                {formatEntryTime(item.timestamp)}
              </ThemedText>
            </View>
            <View style={styles.entryDetails}>
              <View style={[styles.categoryBadge, { backgroundColor: theme.accentLight }]}>
                <ThemedText type="small" style={{ color: theme.accent }}>
                  {item.category || "Uncategorized"}
                </ThemedText>
              </View>
              {item.note ? (
                <ThemedText type="small" secondary numberOfLines={1} style={styles.entryNote}>
                  {item.note}
                </ThemedText>
              ) : null}
            </View>
          </View>
          <Pressable
            style={[styles.deleteButton, { backgroundColor: theme.backgroundSecondary }]}
            onPress={() => handleDeleteEntry(item)}
            hitSlop={8}
          >
            <Feather name="x" size={16} color={theme.textSecondary} />
          </Pressable>
        </Pressable>
      </Card>
    </Animated.View>
  );

  const renderDayView = () => {
    const hasEntries = dayData && dayData.entries.length > 0;

    return (
      <View style={styles.dayViewContent}>
        {hasEntries ? (
          <>
            <Card style={styles.totalCard}>
              <ThemedText type="small" secondary>
                {isToday ? "Today's spending" : "Day total"}
              </ThemedText>
              <ThemedText type="h1" style={styles.totalAmount}>
                {formatCurrency(dayData.totalAmount)}
              </ThemedText>
              <ThemedText type="small" secondary>
                {dayData.entries.length} {dayData.entries.length === 1 ? "entry" : "entries"}
              </ThemedText>
            </Card>

            <View style={styles.entriesSection}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                Entries
              </ThemedText>
              <FlatList
                data={dayData.entries}
                keyExtractor={(item) => item.entry_id}
                renderItem={renderEntryItem}
                scrollEnabled={false}
              />
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="sun" size={40} color={theme.textMuted} />
            </View>
            <ThemedText type="h3" style={styles.emptyTitle}>
              {isToday ? "No spending yet today" : "No spending recorded"}
            </ThemedText>
            <ThemedText type="body" secondary style={styles.emptySubtitle}>
              {isToday
                ? "Tap below to log an expense"
                : "Tap below to add an entry for this day"}
            </ThemedText>
          </View>
        )}

        <Animated.View entering={SlideInDown.duration(300).delay(100)}>
          <Button onPress={handleAddEntry} style={styles.addButton}>
            <View style={styles.addButtonContent}>
              <Feather name="plus" size={20} color="#fff" />
              <ThemedText type="body" style={{ color: "#fff", marginLeft: Spacing.sm }}>
                Add Spend
              </ThemedText>
            </View>
          </Button>
        </Animated.View>
      </View>
    );
  };

  const renderEntryForm = () => (
    <Animated.View 
      entering={FadeIn.duration(200)} 
      exiting={FadeOut.duration(150)}
      style={styles.formContent}
    >
      <ThemedText type="h3" style={styles.formTitle}>
        {editingEntry ? "Edit entry" : "New entry"}
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

      <View style={styles.formActions}>
        <Pressable
          style={[
            styles.cancelButton,
            { backgroundColor: theme.backgroundDefault },
          ]}
          onPress={handleCancel}
        >
          <ThemedText type="body">Cancel</ThemedText>
        </Pressable>

        <Button
          onPress={handleSaveEntry}
          disabled={isSaving || !isValidAmount()}
          style={styles.saveButton}
        >
          {isSaving ? "Saving..." : editingEntry ? "Update" : "Save"}
        </Button>
      </View>
    </Animated.View>
  );

  const renderContent = () => {
    switch (screenState) {
      case "loading":
        return (
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        );

      case "day_view":
        return renderDayView();

      case "add_entry":
      case "edit_entry":
        return renderEntryForm();

      default:
        return null;
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
            <ThemedText type="h1">{isToday ? "Today" : "Log Entry"}</ThemedText>
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

        {isToday && screenState === "day_view" ? (
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
    paddingVertical: Spacing["2xl"],
  },
  loadingContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayViewContent: {
    flex: 1,
  },
  totalCard: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    marginBottom: Spacing.xl,
  },
  totalAmount: {
    marginVertical: Spacing.sm,
  },
  entriesSection: {
    flex: 1,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  entryCard: {
    marginBottom: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  entryContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  entryMain: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  entryDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  entryNote: {
    flex: 1,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius["2xl"],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    textAlign: "center",
  },
  addButton: {
    marginTop: Spacing.lg,
  },
  addButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  formContent: {
    flex: 1,
  },
  formTitle: {
    textAlign: "center",
    marginBottom: Spacing["2xl"],
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
  formActions: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    flex: 2,
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
