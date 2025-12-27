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
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import {
  getLogsForDateRange,
  getMonthDateRange,
  getSubscription,
  getAppSettings,
  canViewDate,
  isPremium,
  calculateSpendingStats,
  DailyLog,
  SpendingStats,
} from "@/lib/database";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CalendarDay {
  date: string | null;
  dayNumber: number | null;
  log: DailyLog | null;
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
  const [subscription, setSubscription] = useState<any>(null);
  const [freeHistoryDays, setFreeHistoryDays] = useState(14);
  const [stats, setStats] = useState<SpendingStats>({
    totalSpend: 0,
    averageSpendPerSpendDay: 0,
    spendDays: 0,
    noSpendDays: 0,
    topCategories: [],
  });
  const [daysLogged, setDaysLogged] = useState(0);

  const loadMonthData = useCallback(async () => {
    try {
      setIsLoading(true);

      const { startDate, endDate, year, month } = getMonthDateRange(monthOffset);
      const sub = await getSubscription();
      const settings = await getAppSettings();

      const premium = isPremium(sub);
      setUserIsPremium(premium);
      setSubscription(sub);
      setFreeHistoryDays(settings.free_history_days);

      const logs = await getLogsForDateRange(startDate, endDate);
      const logsMap = new Map(logs.map((log) => [log.date, log]));

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      const firstDayOfMonth = new Date(year, month - 1, 1);
      const lastDayOfMonth = new Date(year, month, 0);
      const startDayOfWeek = firstDayOfMonth.getDay();
      const daysInMonth = lastDayOfMonth.getDate();

      const days: CalendarDay[] = [];
      let anyRestricted = false;

      for (let i = 0; i < startDayOfWeek; i++) {
        days.push({
          date: null,
          dayNumber: null,
          log: null,
          isToday: false,
          isCurrentMonth: false,
          isRestricted: false,
        });
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const isRestricted = !canViewDate(
          dateStr,
          sub,
          settings.free_history_days
        );

        if (isRestricted) {
          anyRestricted = true;
        }

        days.push({
          date: dateStr,
          dayNumber: day,
          log: isRestricted ? null : (logsMap.get(dateStr) || null),
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
          log: null,
          isToday: false,
          isCurrentMonth: false,
          isRestricted: false,
        });
      }

      setHasRestrictedDays(anyRestricted);

      const accessibleLogs = logs.filter(
        (log) => canViewDate(log.date, sub, settings.free_history_days)
      );

      const calculatedStats = calculateSpendingStats(accessibleLogs);
      setStats(calculatedStats);
      setDaysLogged(accessibleLogs.length);
      setCalendarDays(days);
      setCurrentMonth(`${MONTH_NAMES[month - 1]} ${year}`);
    } catch (error) {
      console.error("Error loading month data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [monthOffset, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadMonthData();
    }, [loadMonthData])
  );

  const getDotColor = (day: CalendarDay) => {
    if (!day.isCurrentMonth || !day.date) return "transparent";
    if (day.isRestricted) return theme.notLoggedDot;
    if (!day.log) return theme.notLoggedDot;
    return day.log.did_spend ? theme.spendDot : theme.noSpendDot;
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
    navigation.navigate("DailyPrompt", { targetDate: day.date, mode: day.log ? "edit" : "log" });
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
              <Feather name="chevron-left" size={24} color={theme.text} />
            </Pressable>

            <ThemedText type="h3">{currentMonth}</ThemedText>

            <Pressable
              style={[
                styles.navArrow,
                { backgroundColor: theme.backgroundDefault },
                monthOffset >= 0 && styles.navArrowDisabled,
              ]}
              onPress={() => monthOffset < 0 && setMonthOffset((prev) => prev + 1)}
              disabled={monthOffset >= 0}
            >
              <Feather
                name="chevron-right"
                size={24}
                color={monthOffset >= 0 ? theme.textMuted : theme.text}
              />
            </Pressable>
          </View>

          <View style={styles.dayNamesRow}>
            {DAY_NAMES.map((day, index) => (
              <View key={index} style={styles.dayNameCell}>
                <ThemedText type="caption" muted>
                  {day}
                </ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => (
              <Pressable
                key={index}
                style={styles.dayCell}
                onPress={() => handleDayPress(day)}
                disabled={!day.isCurrentMonth}
              >
                {day.isCurrentMonth ? (
                  <>
                    <ThemedText
                      type="small"
                      style={[
                        styles.dayNumber,
                        day.isToday && { color: theme.accent, fontWeight: "600" },
                        day.isRestricted && { opacity: 0.4 },
                      ]}
                    >
                      {day.dayNumber}
                    </ThemedText>
                    <View
                      style={[
                        styles.dayDot,
                        { backgroundColor: getDotColor(day) },
                        day.isToday && styles.todayDot,
                      ]}
                    />
                  </>
                ) : null}
              </Pressable>
            ))}
          </View>

          {hasRestrictedDays && !userIsPremium ? (
            <Pressable onPress={handleUpgradePress} style={[styles.upgradeBanner, { backgroundColor: theme.accentLight }]}>
              <Feather name="unlock" size={18} color={theme.accent} />
              <View style={styles.upgradeBannerText}>
                <ThemedText type="body" style={{ color: theme.accent }}>
                  See your full history
                </ThemedText>
                <ThemedText type="caption" secondary>
                  Unlock all past months
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color={theme.accent} />
            </Pressable>
          ) : null}

          <View style={styles.statsGrid}>
            <Card elevation={1} style={styles.statCard}>
              <ThemedText type="h3" style={styles.statValue}>
                {daysLogged}
              </ThemedText>
              <ThemedText type="caption" secondary>
                Logged
              </ThemedText>
            </Card>

            <Card elevation={1} style={styles.statCard}>
              <ThemedText type="h3" style={styles.statValue}>
                {stats.spendDays}
              </ThemedText>
              <ThemedText type="caption" secondary>
                Spend
              </ThemedText>
            </Card>

            <Card elevation={1} style={styles.statCard}>
              <ThemedText type="h3" style={styles.statValue}>
                {stats.noSpendDays}
              </ThemedText>
              <ThemedText type="caption" secondary>
                No-spend
              </ThemedText>
            </Card>

            <Card elevation={1} style={styles.statCard}>
              <ThemedText type="h3" style={styles.statValue}>
                ${stats.totalSpend.toFixed(0)}
              </ThemedText>
              <ThemedText type="caption" secondary>
                Total
              </ThemedText>
            </Card>
          </View>

          {stats.spendDays > 0 ? (
            <Card elevation={1} style={styles.averageCard}>
              <ThemedText type="body" secondary>
                Average per spend day
              </ThemedText>
              <ThemedText type="h2" style={styles.averageValue}>
                ${stats.averageSpendPerSpendDay.toFixed(2)}
              </ThemedText>
            </Card>
          ) : null}

          {stats.topCategories.length > 0 ? (
            <Card elevation={1} style={styles.categoriesCard}>
              <ThemedText type="small" secondary style={styles.categoriesTitle}>
                Top categories
              </ThemedText>
              {stats.topCategories.map((cat) => (
                <View key={cat.category} style={styles.categoryRow}>
                  <ThemedText type="body">{cat.category}</ThemedText>
                  <ThemedText type="body" secondary>
                    ${cat.total.toFixed(2)}
                  </ThemedText>
                </View>
              ))}
            </Card>
          ) : null}

          <Card elevation={1} style={styles.reflectionCard}>
            <Feather name="sun" size={20} color={theme.accent} />
            <ThemedText type="body" secondary style={styles.reflectionText}>
              {getRandomReflection()}
            </ThemedText>
          </Card>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: theme.spendDot }]}
              />
              <ThemedText type="caption" muted>
                Spend
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: theme.noSpendDot },
                ]}
              />
              <ThemedText type="caption" muted>
                No-spend
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: theme.notLoggedDot },
                ]}
              />
              <ThemedText type="caption" muted>
                Not logged
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  navArrow: {
    width: 44,
    height: 44,
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
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xs,
  },
  dayNumber: {
    marginBottom: Spacing.xs,
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  todayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  statValue: {
    marginBottom: Spacing.xs,
  },
  averageCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  averageValue: {
    marginTop: Spacing.sm,
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
  reflectionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
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
