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
  DailyLog,
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
  const [totals, setTotals] = useState({
    daysLogged: 0,
    spendDays: 0,
    noSpendDays: 0,
    totalSpent: 0,
  });

  const loadMonthData = useCallback(async () => {
    try {
      setIsLoading(true);

      const { startDate, endDate, year, month } = getMonthDateRange(monthOffset);
      const subscription = await getSubscription();
      const settings = await getAppSettings();

      if (!canViewDate(startDate, subscription, settings.free_history_days)) {
        navigation.navigate("Paywall");
        return;
      }

      const logs = await getLogsForDateRange(startDate, endDate);
      const logsMap = new Map(logs.map((log) => [log.date, log]));

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      const firstDayOfMonth = new Date(year, month - 1, 1);
      const lastDayOfMonth = new Date(year, month, 0);
      const startDayOfWeek = firstDayOfMonth.getDay();
      const daysInMonth = lastDayOfMonth.getDate();

      const days: CalendarDay[] = [];

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
          subscription,
          settings.free_history_days
        );

        days.push({
          date: dateStr,
          dayNumber: day,
          log: logsMap.get(dateStr) || null,
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

      let daysLogged = 0;
      let spendDays = 0;
      let noSpendDays = 0;
      let totalSpent = 0;

      logs.forEach((log) => {
        daysLogged++;
        if (log.did_spend) {
          spendDays++;
          totalSpent += log.amount || 0;
        } else {
          noSpendDays++;
        }
      });

      setCalendarDays(days);
      setCurrentMonth(`${MONTH_NAMES[month - 1]} ${year}`);
      setTotals({ daysLogged, spendDays, noSpendDays, totalSpent });
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
              <View key={index} style={styles.dayCell}>
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
              </View>
            ))}
          </View>

          <View style={styles.statsGrid}>
            <Card elevation={1} style={styles.statCard}>
              <ThemedText type="h3" style={styles.statValue}>
                {totals.daysLogged}
              </ThemedText>
              <ThemedText type="caption" secondary>
                Logged
              </ThemedText>
            </Card>

            <Card elevation={1} style={styles.statCard}>
              <ThemedText type="h3" style={styles.statValue}>
                {totals.spendDays}
              </ThemedText>
              <ThemedText type="caption" secondary>
                Spend
              </ThemedText>
            </Card>

            <Card elevation={1} style={styles.statCard}>
              <ThemedText type="h3" style={styles.statValue}>
                {totals.noSpendDays}
              </ThemedText>
              <ThemedText type="caption" secondary>
                No-spend
              </ThemedText>
            </Card>

            <Card elevation={1} style={styles.statCard}>
              <ThemedText type="h3" style={styles.statValue}>
                ${totals.totalSpent.toFixed(0)}
              </ThemedText>
              <ThemedText type="caption" secondary>
                Total
              </ThemedText>
            </Card>
          </View>

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
    marginBottom: Spacing["2xl"],
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
