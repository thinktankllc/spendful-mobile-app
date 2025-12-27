import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import {
  getEntriesForDateRange,
  getMonthDateRange,
  getSubscription,
  getAppSettings,
  canViewDate,
  isPremium,
  calculateSpendingStats,
  formatCurrency,
  formatDate,
  SpendEntry,
  SpendingStats,
} from "@/lib/database";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CalendarDay {
  date: string | null;
  dayNumber: number | null;
  entries: SpendEntry[];
  totalAmount: number;
  hasSpend: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
  isRestricted: boolean;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

const REFLECTIONS = [
  "Just notice. No need to judge.",
  "Awareness is the first step.",
  "Every day is a new opportunity.",
  "You're building understanding.",
  "Small steps, big awareness.",
];

export default function MonthlyOverviewScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [isLoading, setIsLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [currentMonth, setCurrentMonth] = useState("");
  const [hasRestrictedDays, setHasRestrictedDays] = useState(false);
  const [userIsPremium, setUserIsPremium] = useState(false);
  const [daysInMonth, setDaysInMonth] = useState(30);
  const [stats, setStats] = useState<SpendingStats>({
    totalSpend: 0,
    totalEntries: 0,
    spendDays: 0,
    averageSpendPerSpendDay: 0,
    topCategories: [],
    highestSpendDay: null,
    lowestSpendDay: null,
    totalDaysInPeriod: 30,
  });

  const loadMonthData = useCallback(async () => {
    try {
      setIsLoading(true);

      const { startDate, endDate, year, month } = getMonthDateRange(monthOffset);
      const sub = await getSubscription();
      const settings = await getAppSettings();

      const premium = isPremium(sub);
      setUserIsPremium(premium);

      const entries = await getEntriesForDateRange(startDate, endDate);

      const entriesByDate = new Map<string, SpendEntry[]>();
      for (const entry of entries) {
        if (!entriesByDate.has(entry.date)) {
          entriesByDate.set(entry.date, []);
        }
        entriesByDate.get(entry.date)!.push(entry);
      }

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      const firstDayOfMonth = new Date(year, month - 1, 1);
      const lastDayOfMonth = new Date(year, month, 0);
      const startDayOfWeek = firstDayOfMonth.getDay();
      const totalDaysInMonth = lastDayOfMonth.getDate();
      setDaysInMonth(totalDaysInMonth);

      const days: CalendarDay[] = [];
      let anyRestricted = false;

      for (let i = 0; i < startDayOfWeek; i++) {
        days.push({
          date: null,
          dayNumber: null,
          entries: [],
          totalAmount: 0,
          hasSpend: false,
          isToday: false,
          isCurrentMonth: false,
          isRestricted: false,
        });
      }

      for (let day = 1; day <= totalDaysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const isRestricted = !canViewDate(dateStr, sub, settings.free_history_days);

        if (isRestricted) {
          anyRestricted = true;
        }

        const dayEntries = isRestricted ? [] : (entriesByDate.get(dateStr) || []);
        const totalAmount = dayEntries.reduce((sum, e) => sum + e.amount, 0);

        days.push({
          date: dateStr,
          dayNumber: day,
          entries: dayEntries,
          totalAmount,
          hasSpend: dayEntries.length > 0,
          isToday: dateStr === todayStr,
          isCurrentMonth: true,
          isRestricted,
        });
      }

      const remainingDays = 42 - days.length;
      for (let i = 0; i < remainingDays; i++) {
        days.push({
          date: null,
          dayNumber: null,
          entries: [],
          totalAmount: 0,
          hasSpend: false,
          isToday: false,
          isCurrentMonth: false,
          isRestricted: false,
        });
      }

      setHasRestrictedDays(anyRestricted);

      const accessibleEntries = entries.filter(
        (entry) => canViewDate(entry.date, sub, settings.free_history_days)
      );

      const calculatedStats = calculateSpendingStats(accessibleEntries, totalDaysInMonth);
      setStats(calculatedStats);
      setCalendarDays(days);
      setCurrentMonth(`${MONTH_NAMES[month - 1]} ${year}`);
    } catch (error) {
      console.error("Error loading month data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [monthOffset]);

  useFocusEffect(
    useCallback(() => {
      loadMonthData();
    }, [loadMonthData])
  );

  const getDotColor = (day: CalendarDay) => {
    if (!day.isCurrentMonth || !day.date) return "transparent";
    if (day.isRestricted) return theme.notLoggedDot;
    if (!day.hasSpend) return theme.notLoggedDot;
    return theme.spendDot;
  };

  const getRandomReflection = () => {
    return REFLECTIONS[Math.floor(Math.random() * REFLECTIONS.length)];
  };

  const handleUpgradePress = () => {
    navigation.navigate("Paywall");
  };

  const handleDayPress = (day: CalendarDay) => {
    if (!day.date || !day.isCurrentMonth) return;
    
    if (day.isRestricted) {
      navigation.navigate("Paywall");
      return;
    }
    navigation.navigate("DailyPrompt", { targetDate: day.date });
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.accent} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(300)}>
          <View style={styles.monthNav}>
            <Pressable
              style={[styles.navArrow, { backgroundColor: theme.backgroundDefault }]}
              onPress={() => setMonthOffset((prev) => prev - 1)}
            >
              <Feather name="chevron-left" size={20} color={theme.text} />
            </Pressable>
            <ThemedText type="h3">{currentMonth}</ThemedText>
            <Pressable
              style={[
                styles.navArrow,
                { backgroundColor: theme.backgroundDefault },
                monthOffset >= 0 && styles.navArrowDisabled,
              ]}
              onPress={() => {
                if (monthOffset < 0) setMonthOffset((prev) => prev + 1);
              }}
            >
              <Feather
                name="chevron-right"
                size={20}
                color={monthOffset >= 0 ? theme.textMuted : theme.text}
              />
            </Pressable>
          </View>

          <View style={styles.dayNamesRow}>
            {DAY_NAMES.map((name, index) => (
              <View key={index} style={styles.dayNameCell}>
                <ThemedText type="caption" muted>
                  {name}
                </ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => (
              <Pressable
                key={index}
                style={[
                  styles.calendarCell,
                  day.isToday && [styles.todayCell, { borderColor: theme.accent }],
                ]}
                onPress={() => handleDayPress(day)}
              >
                {day.isCurrentMonth && day.dayNumber ? (
                  <>
                    <ThemedText
                      type="small"
                      style={[
                        styles.calendarDayNumber,
                        day.isToday && { color: theme.accent, fontWeight: "600" },
                        day.isRestricted && { opacity: 0.4 },
                      ]}
                    >
                      {day.dayNumber}
                    </ThemedText>
                    <View
                      style={[
                        styles.calendarDot,
                        { backgroundColor: getDotColor(day) },
                        day.isRestricted && { opacity: 0.4 },
                      ]}
                    />
                    {day.isRestricted ? (
                      <Feather name="lock" size={8} color={theme.textMuted} style={styles.lockIcon} />
                    ) : null}
                  </>
                ) : null}
              </Pressable>
            ))}
          </View>

          {hasRestrictedDays && !userIsPremium ? (
            <Pressable
              onPress={handleUpgradePress}
              style={[styles.upgradeBanner, { backgroundColor: theme.accentLight }]}
            >
              <Feather name="unlock" size={18} color={theme.accent} />
              <View style={styles.upgradeBannerText}>
                <ThemedText type="body" style={{ color: theme.accent }}>
                  See your full month
                </ThemedText>
                <ThemedText type="caption" secondary>
                  Unlock unlimited history
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color={theme.accent} />
            </Pressable>
          ) : null}

          <Animated.View entering={FadeInDown.duration(300).delay(100)}>
            <Card elevation={1} style={styles.totalCard}>
              <ThemedText type="small" secondary>
                Total spent this month
              </ThemedText>
              <ThemedText type="h1" style={styles.totalValue}>
                {formatCurrency(stats.totalSpend)}
              </ThemedText>
              {stats.totalEntries > 0 ? (
                <ThemedText type="small" secondary>
                  {stats.totalEntries} {stats.totalEntries === 1 ? "entry" : "entries"} across {stats.spendDays} {stats.spendDays === 1 ? "day" : "days"}
                </ThemedText>
              ) : null}
            </Card>
          </Animated.View>

          <View style={styles.statsGrid}>
            <Card elevation={1} style={styles.statCard}>
              <ThemedText type="h3" style={styles.statValue}>
                {stats.spendDays}
              </ThemedText>
              <ThemedText type="small" secondary>
                Spend days
              </ThemedText>
            </Card>

            <Card elevation={1} style={styles.statCard}>
              <ThemedText type="body" style={styles.statValue}>
                {stats.spendDays > 0 ? formatCurrency(stats.averageSpendPerSpendDay) : "-"}
              </ThemedText>
              <ThemedText type="small" secondary>
                Avg/day
              </ThemedText>
            </Card>

            <Card elevation={1} style={styles.statCard}>
              <ThemedText type="h3" style={styles.statValue}>
                {daysInMonth - stats.spendDays}
              </ThemedText>
              <ThemedText type="small" secondary>
                No-spend
              </ThemedText>
            </Card>
          </View>

          {stats.highestSpendDay || stats.lowestSpendDay ? (
            <Animated.View entering={FadeInDown.duration(300).delay(150)}>
              <View style={styles.highlightRow}>
                {stats.highestSpendDay ? (
                  <Card elevation={1} style={styles.highlightCard}>
                    <Feather name="trending-up" size={16} color={theme.textSecondary} />
                    <ThemedText type="small" secondary style={styles.highlightLabel}>
                      Highest day
                    </ThemedText>
                    <ThemedText type="body">{formatCurrency(stats.highestSpendDay.amount)}</ThemedText>
                    <ThemedText type="caption" muted>{formatDate(stats.highestSpendDay.date)}</ThemedText>
                  </Card>
                ) : null}
                {stats.lowestSpendDay && stats.lowestSpendDay.date !== stats.highestSpendDay?.date ? (
                  <Card elevation={1} style={styles.highlightCard}>
                    <Feather name="trending-down" size={16} color={theme.textSecondary} />
                    <ThemedText type="small" secondary style={styles.highlightLabel}>
                      Lowest day
                    </ThemedText>
                    <ThemedText type="body">{formatCurrency(stats.lowestSpendDay.amount)}</ThemedText>
                    <ThemedText type="caption" muted>{formatDate(stats.lowestSpendDay.date)}</ThemedText>
                  </Card>
                ) : null}
              </View>
            </Animated.View>
          ) : null}

          {stats.topCategories.length > 0 ? (
            <Animated.View entering={FadeInDown.duration(300).delay(200)}>
              <Card elevation={1} style={styles.categoriesCard}>
                <ThemedText type="h4" style={styles.categoriesTitle}>
                  Top Categories
                </ThemedText>
                {stats.topCategories.slice(0, 3).map((cat) => (
                  <View key={cat.category} style={styles.categoryRow}>
                    <View style={styles.categoryInfo}>
                      <View style={[styles.categoryBadge, { backgroundColor: theme.accentLight }]}>
                        <ThemedText type="small" style={{ color: theme.accent }}>
                          {cat.category}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText type="body">{formatCurrency(cat.total)}</ThemedText>
                  </View>
                ))}
              </Card>
            </Animated.View>
          ) : null}

          {stats.spendDays > 0 ? (
            <Animated.View entering={FadeInDown.duration(300).delay(250)}>
              <Card elevation={1} style={styles.frequencyCard}>
                <View style={styles.frequencyContent}>
                  <Feather name="calendar" size={20} color={theme.accent} />
                  <View style={styles.frequencyText}>
                    <ThemedText type="body">
                      {stats.spendDays} of {daysInMonth} days had spending
                    </ThemedText>
                    <ThemedText type="small" secondary>
                      {Math.round((stats.spendDays / daysInMonth) * 100)}% of the month
                    </ThemedText>
                  </View>
                </View>
              </Card>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.duration(300).delay(300)}>
            <Card elevation={1} style={styles.reflectionCard}>
              <Feather name="heart" size={18} color={theme.accent} />
              <ThemedText type="body" secondary style={styles.reflectionText}>
                {getRandomReflection()}
              </ThemedText>
            </Card>
          </Animated.View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: theme.spendDot }]}
              />
              <ThemedText type="caption" muted>
                Spend day
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: theme.notLoggedDot }]}
              />
              <ThemedText type="caption" muted>
                No spending
              </ThemedText>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing["4xl"],
  },
  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  navArrow: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  navArrowDisabled: {
    opacity: 0.5,
  },
  dayNamesRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  dayNameCell: {
    flex: 1,
    alignItems: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: Spacing.xl,
  },
  calendarCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  todayCell: {
    borderWidth: 2,
    borderRadius: BorderRadius.md,
  },
  calendarDayNumber: {
    marginBottom: 2,
  },
  calendarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  lockIcon: {
    marginTop: 1,
  },
  upgradeBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  upgradeBannerText: {
    flex: 1,
  },
  totalCard: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    marginBottom: Spacing.lg,
  },
  totalValue: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  statValue: {
    marginBottom: Spacing.xs,
  },
  highlightRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  highlightCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.xs,
  },
  highlightLabel: {
    marginTop: Spacing.xs,
  },
  categoriesCard: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  categoriesTitle: {
    marginBottom: Spacing.md,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  frequencyCard: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  frequencyContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  frequencyText: {
    flex: 1,
  },
  reflectionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  reflectionText: {
    flex: 1,
    fontStyle: "italic",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xl,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
