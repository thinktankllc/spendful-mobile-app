import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import {
  addRecurringEntry,
  getAllCategories,
  getAppSettings,
  getRecurringEntries,
  SUPPORTED_CURRENCIES,
  updateRecurringEntry,
} from "@/lib/database";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type FormRouteProp = RouteProp<RootStackParamList, "RecurringSpendingForm">;

type Frequency = "weekly" | "biweekly" | "monthly";

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

export default function RecurringSpendingFormScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<FormRouteProp>();
  const { theme } = useTheme();

  const entryId = route.params?.entryId;
  const isEditing = !!entryId;

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [settings, allCategories] = await Promise.all([
        getAppSettings(),
        getAllCategories(),
      ]);

      const defaultCurrency = settings.default_currency || "USD";
      setCategories(allCategories);

      if (entryId) {
        const entries = await getRecurringEntries();
        const entry = entries.find((e) => e.id === entryId);
        if (entry) {
          setAmount(entry.amount.toString());
          setCurrency(entry.currency || defaultCurrency);
          setCategory(entry.category);
          setNote(entry.note || "");
          setFrequency(entry.frequency);
          setStartDate(new Date(entry.start_date + "T00:00:00"));
          if (entry.end_date) {
            setEndDate(new Date(entry.end_date + "T00:00:00"));
            setHasEndDate(true);
          }
          setIsActive(entry.is_active);
        }
      } else {
        setCurrency(defaultCurrency);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: isEditing ? "Edit Recurring" : "Add Recurring",
    });
  }, [navigation, isEditing]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateForStorage = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a valid amount greater than 0.",
      );
      return;
    }

    if (!isEditing) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDateNormalized = new Date(startDate);
      startDateNormalized.setHours(0, 0, 0, 0);
      if (startDateNormalized < today) {
        Alert.alert(
          "Invalid Start Date",
          "Start date cannot be in the past for new entries.",
        );
        return;
      }
    }

    if (hasEndDate && endDate && endDate <= startDate) {
      Alert.alert("Invalid End Date", "End date must be after start date.");
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const startDateStr = formatDateForStorage(startDate);
      const endDateStr =
        hasEndDate && endDate ? formatDateForStorage(endDate) : null;

      if (isEditing && entryId) {
        await updateRecurringEntry(entryId, {
          amount: parsedAmount,
          currency,
          category,
          note: note.trim() || null,
          frequency,
          start_date: startDateStr,
          end_date: endDateStr,
          is_active: isActive,
        });
      } else {
        await addRecurringEntry(
          parsedAmount,
          frequency,
          startDateStr,
          category,
          currency,
          note.trim() || null,
          endDateStr,
        );
      }

      navigation.goBack();
    } catch (error) {
      console.error("Error saving recurring entry:", error);
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getCurrencySymbol = (code: string) => {
    const curr = SUPPORTED_CURRENCIES.find((c) => c.code === code);
    return curr?.symbol || code;
  };

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setAmount(cleaned);
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText type="body" muted>
            Loading...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
      >
        <Card elevation={1} style={styles.formCard}>
          <View style={styles.amountSection}>
            <ThemedText type="small" secondary style={styles.label}>
              Amount
            </ThemedText>
            <View style={styles.amountRow}>
              <Pressable
                style={[
                  styles.currencyButton,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
              >
                <ThemedText type="h4">{getCurrencySymbol(currency)}</ThemedText>
                <Feather
                  name={showCurrencyPicker ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={theme.textMuted}
                />
              </Pressable>
              <View
                style={[
                  styles.amountInputContainer,
                  { backgroundColor: theme.backgroundDefault },
                ]}
              >
                <ThemedText
                  type="h3"
                  style={[
                    styles.amountInput,
                    { color: amount ? theme.text : theme.textMuted },
                  ]}
                  onPress={() => {}}
                >
                  {amount || "0.00"}
                </ThemedText>
              </View>
            </View>

            <View style={styles.numpadContainer}>
              {[
                ["1", "2", "3"],
                ["4", "5", "6"],
                ["7", "8", "9"],
                [".", "0", "del"],
              ].map((row, rowIndex) => (
                <View key={rowIndex} style={styles.numpadRow}>
                  {row.map((key) => (
                    <Pressable
                      key={key}
                      style={[
                        styles.numpadKey,
                        { backgroundColor: theme.backgroundDefault },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (key === "del") {
                          setAmount((prev) => prev.slice(0, -1));
                        } else if (key === ".") {
                          if (!amount.includes(".")) {
                            setAmount((prev) => prev + ".");
                          }
                        } else {
                          handleAmountChange(amount + key);
                        }
                      }}
                    >
                      {key === "del" ? (
                        <Feather name="delete" size={20} color={theme.text} />
                      ) : (
                        <ThemedText type="h4">{key}</ThemedText>
                      )}
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </View>

          {showCurrencyPicker ? (
            <Animated.View
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(150)}
            >
              <View style={styles.pickerList}>
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <Pressable
                    key={curr.code}
                    style={[
                      styles.pickerOption,
                      currency === curr.code && {
                        backgroundColor: theme.accentLight,
                      },
                    ]}
                    onPress={() => {
                      setCurrency(curr.code);
                      setShowCurrencyPicker(false);
                    }}
                  >
                    <ThemedText type="body">
                      {curr.symbol} {curr.code}
                    </ThemedText>
                    {currency === curr.code ? (
                      <Feather name="check" size={18} color={theme.accent} />
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          ) : null}
        </Card>

        <Card elevation={1} style={styles.formCard}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldLabel}>
              <Feather name="repeat" size={18} color={theme.text} />
              <ThemedText type="body">Frequency</ThemedText>
            </View>
            <Pressable
              style={styles.fieldValue}
              onPress={() => setShowFrequencyPicker(!showFrequencyPicker)}
            >
              <ThemedText type="body" secondary>
                {FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label}
              </ThemedText>
              <Feather
                name={showFrequencyPicker ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.textMuted}
              />
            </Pressable>
          </View>

          {showFrequencyPicker ? (
            <View style={styles.pickerList}>
              {FREQUENCY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.pickerOption,
                    frequency === opt.value && {
                      backgroundColor: theme.accentLight,
                    },
                  ]}
                  onPress={() => {
                    setFrequency(opt.value);
                    setShowFrequencyPicker(false);
                  }}
                >
                  <ThemedText type="body">{opt.label}</ThemedText>
                  {frequency === opt.value ? (
                    <Feather name="check" size={18} color={theme.accent} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldLabel}>
              <Feather name="tag" size={18} color={theme.text} />
              <ThemedText type="body">Category</ThemedText>
            </View>
            <Pressable
              style={styles.fieldValue}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <ThemedText type="body" secondary>
                {category || "None"}
              </ThemedText>
              <Feather
                name={showCategoryPicker ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.textMuted}
              />
            </Pressable>
          </View>

          {showCategoryPicker ? (
            <View style={styles.pickerList}>
              <Pressable
                style={[
                  styles.pickerOption,
                  !category && { backgroundColor: theme.accentLight },
                ]}
                onPress={() => {
                  setCategory(null);
                  setShowCategoryPicker(false);
                }}
              >
                <ThemedText type="body">None</ThemedText>
                {!category ? (
                  <Feather name="check" size={18} color={theme.accent} />
                ) : null}
              </Pressable>
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  style={[
                    styles.pickerOption,
                    category === cat && { backgroundColor: theme.accentLight },
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
        </Card>

        <Card elevation={1} style={styles.formCard}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldLabel}>
              <Feather name="calendar" size={18} color={theme.text} />
              <ThemedText type="body">Start date</ThemedText>
            </View>
            <Pressable
              style={styles.fieldValue}
              onPress={() => setShowStartDatePicker(true)}
            >
              <ThemedText type="body" secondary>
                {formatDate(startDate)}
              </ThemedText>
              <Feather name="chevron-right" size={18} color={theme.textMuted} />
            </Pressable>
          </View>

          {showStartDatePicker || Platform.OS === "ios" ? (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  if (Platform.OS !== "ios") setShowStartDatePicker(false);
                  if (date) setStartDate(date);
                }}
                textColor={theme.text}
              />
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldLabel}>
              <Feather name="calendar" size={18} color={theme.text} />
              <ThemedText type="body">End date</ThemedText>
            </View>
            <Switch
              value={hasEndDate}
              onValueChange={(value) => {
                setHasEndDate(value);
                if (value && !endDate) {
                  const date = new Date();
                  date.setMonth(date.getMonth() + 12);
                  setEndDate(date);
                }
              }}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor={theme.backgroundRoot}
            />
          </View>

          {hasEndDate ? (
            <>
              <Pressable
                style={[
                  styles.fieldRow,
                  { paddingLeft: Spacing.xl + Spacing.sm },
                ]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <ThemedText type="body" secondary>
                  Ends on
                </ThemedText>
                <View style={styles.fieldValue}>
                  <ThemedText type="body" secondary>
                    {endDate ? formatDate(endDate) : "Select date"}
                  </ThemedText>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={theme.textMuted}
                  />
                </View>
              </Pressable>

              {showEndDatePicker || Platform.OS === "ios" ? (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={endDate || new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    minimumDate={startDate}
                    onChange={(event, date) => {
                      if (Platform.OS !== "ios") setShowEndDatePicker(false);
                      if (date) setEndDate(date);
                    }}
                    textColor={theme.text}
                  />
                </View>
              ) : null}
            </>
          ) : null}

          {isEditing ? (
            <>
              <View style={styles.divider} />
              <View style={styles.fieldRow}>
                <View style={styles.fieldLabel}>
                  <Feather
                    name={isActive ? "play-circle" : "pause-circle"}
                    size={18}
                    color={theme.text}
                  />
                  <ThemedText type="body">Active</ThemedText>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: theme.border, true: theme.accent }}
                  thumbColor={theme.backgroundRoot}
                />
              </View>
            </>
          ) : null}
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            onPress={handleSave}
            disabled={isSaving || !amount || parseFloat(amount) <= 0}
          >
            {isSaving
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Add Recurring Spending"}
          </Button>
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
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  formCard: {
    padding: Spacing.md,
  },
  amountSection: {
    gap: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  amountRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  currencyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  amountInputContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  amountInput: {
    fontSize: 28,
  },
  numpadContainer: {
    gap: Spacing.xs,
  },
  numpadRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  numpadKey: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerList: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  fieldLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  fieldValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(128,128,128,0.2)",
    marginVertical: Spacing.xs,
  },
  datePickerContainer: {
    marginTop: Spacing.sm,
  },
  buttonContainer: {
    marginTop: Spacing.md,
  },
});
