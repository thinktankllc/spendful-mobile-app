import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";

import OnboardingScreen from "@/screens/OnboardingScreen";
import DailyPromptScreen from "@/screens/DailyPromptScreen";
import WeeklySummaryScreen from "@/screens/WeeklySummaryScreen";
import MonthlyOverviewScreen from "@/screens/MonthlyOverviewScreen";
import PaywallScreen from "@/screens/PaywallScreen";
import SettingsScreen from "@/screens/SettingsScreen";

export type RootStackParamList = {
  Onboarding: undefined;
  DailyPrompt: { targetDate?: string } | undefined;
  WeeklySummary: undefined;
  MonthlyOverview: { month?: string };
  Paywall: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const opaqueScreenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DailyPrompt"
        component={DailyPromptScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WeeklySummary"
        component={WeeklySummaryScreen}
        options={{
          ...opaqueScreenOptions,
          headerTitle: "This Week",
        }}
      />
      <Stack.Screen
        name="MonthlyOverview"
        component={MonthlyOverviewScreen}
        options={{
          ...opaqueScreenOptions,
          headerTitle: "Monthly",
        }}
      />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          ...opaqueScreenOptions,
          headerTitle: "Settings",
        }}
      />
    </Stack.Navigator>
  );
}
