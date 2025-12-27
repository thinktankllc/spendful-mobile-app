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
  DailyLog,
  Subscription,
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
  const [totals, setTotals] = useState({
    daysLogged: 0,
    spendDays: 0,
    noSpendDays: 0,
    totalSpent: 0,
  });

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

      let daysLogged = 0;
      let spendDays = 0;
      let noSpendDays = 0;
      let totalSpent = 0;

      logs.forEach((log) => {
        const isLogRestricted = !canViewDate(log.date, subscription, settings.free_history_days);
        if (!isLogRestricted) {
          daysLogged++;
          if (log.did_spend) {
            spendDays++;
            totalSpent += log.amount || 0;
          } else {
            noSpendDays++;
          }
        }
      });

      setWeekData(weekDays);
      setTotals({ daysLogged, spendDays, noSpendDays, totalSpent });
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
              <View key={day.date} style={[styles.dayColumn, day.isRestricted && styles.restrictedDay]}>
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
              </View>
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
                {totals.daysLogged}
              </ThemedText>
              <ThemedText type="small" secondary>
                Days logged
              </ThemedText>
            </Card>

            <Card elevation={1} style={styles.statCard}>
              <ThemedText type="h2" style={styles.statValue}>
                {totals.spendDays}
              </ThemedText>
              <ThemedText type="small" secondary>
                Spend days
              </ThemedText>
            </Card>

            <Card elevation={1} style={styles.statCard}>
              <ThemedText type="h2" style={styles.statValue}>
                {totals.noSpendDays}
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
              ${totals.totalSpent.toFixed(2)}
            </ThemedText>
          </Card>

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
