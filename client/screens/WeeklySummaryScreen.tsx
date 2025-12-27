import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable } from "react-native";
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
  getWeekDateRange,
  getSubscription,
  getAppSettings,
  canViewDate,
  isPremium,
  calculateSpendingStats,
  DailyLog,
  Subscription,
  SpendingStats,
} from "@/lib/database";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DaySummary {
  date: string;
  dayName: string;
  dayNumber: number;
  log: DailyLog | null;
  isToday: boolean;
  isRestricted: boolean;
}

export default function WeeklySummaryScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [weekData, setWeekData] = useState<DaySummary[]>([]);
  const [hasRestrictedDays, setHasRestrictedDays] = useState(false);
  const [userIsPremium, setUserIsPremium] = useState(false);
  const [stats, setStats] = useState<SpendingStats>({
    totalSpend: 0,
    averageSpendPerSpendDay: 0,
    spendDays: 0,
    noSpendDays: 0,
    topCategories: [],
  });
  const [daysLogged, setDaysLogged] = useState(0);

  const loadWeekData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { startDate, endDate } = getWeekDateRange();
      const logs = await getLogsForDateRange(startDate, endDate);
      const subscription = await getSubscription();
      const settings = await getAppSettings();

      const premium = isPremium(subscription);
      setUserIsPremium(premium);

      const logsMap = new Map(logs.map((log) => [log.date, log]));

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const dayOfWeek = today.getDay();

      const weekDays: DaySummary[] = [];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      let anyRestricted = false;

      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - dayOfWeek + i);
        const dateStr = date.toISOString().split("T")[0];
        const isRestricted = !canViewDate(dateStr, subscription, settings.free_history_days);
        
        if (isRestricted) {
          anyRestricted = true;
        }

        weekDays.push({
          date: dateStr,
          dayName: dayNames[i],
          dayNumber: date.getDate(),
          log: isRestricted ? null : (logsMap.get(dateStr) || null),
          isToday: dateStr === todayStr,
          isRestricted,
        });
      }

      setHasRestrictedDays(anyRestricted);

      const accessibleLogs = logs.filter(
        (log) => canViewDate(log.date, subscription, settings.free_history_days)
      );

      const calculatedStats = calculateSpendingStats(accessibleLogs);
      setStats(calculatedStats);
      setDaysLogged(accessibleLogs.length);
      setWeekData(weekDays);
    } catch (error) {
      console.error("Error loading week data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWeekData();
    }, [loadWeekData])
  );

  const getDotColor = (day: DaySummary) => {
    if (day.isRestricted) {
      return theme.notLoggedDot;
    }
    if (!day.log) {
      return day.isToday ? theme.border : theme.notLoggedDot;
    }
    return day.log.did_spend ? theme.spendDot : theme.noSpendDot;
  };

  const handleUpgradePress = () => {
    navigation.navigate("Paywall");
  };

  const handleDayPress = (day: DaySummary) => {
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
          <View style={styles.weekGrid}>
            {weekData.map((day) => (
              <Pressable
                key={day.date}
                style={[styles.dayColumn, day.isRestricted && styles.restrictedDay]}
                onPress={() => handleDayPress(day)}
              >
                <ThemedText
                  type="caption"
                  muted
                  style={[
                    styles.dayName,
                    day.isToday && { color: theme.accent },
                    day.isRestricted && { opacity: 0.4 },
                  ]}
                >
                  {day.dayName}
                </ThemedText>
                <ThemedText
                  type="body"
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
                    day.isRestricted && { opacity: 0.4 },
                  ]}
                />
                {day.isRestricted ? (
                  <Feather name="lock" size={10} color={theme.textMuted} style={styles.lockIcon} />
                ) : null}
              </Pressable>
            ))}
          </View>

          {hasRestrictedDays && !userIsPremium ? (
            <Pressable onPress={handleUpgradePress} style={[styles.upgradeBanner, { backgroundColor: theme.accentLight }]}>
              <Feather name="unlock" size={18} color={theme.accent} />
              <View style={styles.upgradeBannerText}>
                <ThemedText type="body" style={{ color: theme.accent }}>
                  See your full week
                </ThemedText>
                <ThemedText type="caption" secondary>
                  Unlock unlimited history
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color={theme.accent} />
            </Pressable>
          ) : null}

          <View style={styles.statsGrid}>
            <Card elevation={1} style={styles.statCard}>
              <ThemedText type="h2" style={styles.statValue}>
                {daysLogged}
              </ThemedText>
              <ThemedText type="small" secondary>
                Days logged
              </ThemedText>
            </Card>

            <Card elevation={1} style={styles.statCard}>
              <ThemedText type="h2" style={styles.statValue}>
                {stats.spendDays}
              </ThemedText>
              <ThemedText type="small" secondary>
                Spend days
              </ThemedText>
            </Card>

            <Card elevation={1} style={styles.statCard}>
              <ThemedText type="h2" style={styles.statValue}>
                {stats.noSpendDays}
              </ThemedText>
              <ThemedText type="small" secondary>
                No-spend days
              </ThemedText>
            </Card>
          </View>

          <Card elevation={1} style={styles.totalCard}>
            <ThemedText type="small" secondary>
              Total spent this week
            </ThemedText>
            <ThemedText type="h1" style={styles.totalValue}>
              ${stats.totalSpend.toFixed(2)}
            </ThemedText>
            {stats.spendDays > 0 ? (
              <ThemedText type="small" secondary style={styles.averageText}>
                ${stats.averageSpendPerSpendDay.toFixed(2)} avg per spend day
              </ThemedText>
            ) : null}
          </Card>

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
                style={[
                  styles.legendDot,
                  { backgroundColor: theme.noSpendDot },
                ]}
              />
              <ThemedText type="caption" muted>
                No-spend day
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
  weekGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing["3xl"],
  },
  dayColumn: {
    alignItems: "center",
    flex: 1,
  },
  dayName: {
    marginBottom: Spacing.xs,
  },
  dayNumber: {
    marginBottom: Spacing.sm,
  },
  dayDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  todayDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  restrictedDay: {
    opacity: 0.8,
  },
  lockIcon: {
    marginTop: Spacing.xs,
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
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  statValue: {
    marginBottom: Spacing.xs,
  },
  totalCard: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    marginBottom: Spacing["2xl"],
  },
  totalValue: {
    marginTop: Spacing.sm,
  },
  averageText: {
    marginTop: Spacing.xs,
  },
  categoriesCard: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing["2xl"],
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
