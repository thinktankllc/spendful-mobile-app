import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { getLogsForDateRange, getWeekDateRange, DailyLog } from "@/lib/database";

interface DaySummary {
  date: string;
  dayName: string;
  dayNumber: number;
  log: DailyLog | null;
  isToday: boolean;
}

export default function WeeklySummaryScreen() {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [weekData, setWeekData] = useState<DaySummary[]>([]);
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

      const logsMap = new Map(logs.map((log) => [log.date, log]));

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const dayOfWeek = today.getDay();

      const weekDays: DaySummary[] = [];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - dayOfWeek + i);
        const dateStr = date.toISOString().split("T")[0];

        weekDays.push({
          date: dateStr,
          dayName: dayNames[i],
          dayNumber: date.getDate(),
          log: logsMap.get(dateStr) || null,
          isToday: dateStr === todayStr,
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

  const getDotColor = (log: DailyLog | null, isToday: boolean) => {
    if (!log) {
      return isToday ? theme.border : theme.notLoggedDot;
    }
    return log.did_spend ? theme.spendDot : theme.noSpendDot;
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
              <View key={day.date} style={styles.dayColumn}>
                <ThemedText
                  type="caption"
                  muted
                  style={[
                    styles.dayName,
                    day.isToday && { color: theme.accent },
                  ]}
                >
                  {day.dayName}
                </ThemedText>
                <ThemedText
                  type="body"
                  style={[
                    styles.dayNumber,
                    day.isToday && { color: theme.accent, fontWeight: "600" },
                  ]}
                >
                  {day.dayNumber}
                </ThemedText>
                <View
                  style={[
                    styles.dayDot,
                    { backgroundColor: getDotColor(day.log, day.isToday) },
                    day.isToday && styles.todayDot,
                  ]}
                />
              </View>
            ))}
          </View>

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
