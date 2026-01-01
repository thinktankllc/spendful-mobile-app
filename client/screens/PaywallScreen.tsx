import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { updateSubscription } from "@/lib/database";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

/**
 * IAP INTEGRATION NOTE:
 *
 * For production, replace the mock subscription logic with real IAP:
 *
 * 1. Install expo-in-app-purchases (requires development build, not Expo Go)
 *    npx expo install expo-in-app-purchases
 *
 * 2. Configure products in App Store Connect and Google Play Console:
 *    - Monthly: com.spendful.app.premium.monthly ($0.99/month)
 *    - Yearly: com.spendful.app.premium.yearly ($8.99/year)
 *    - Lifetime: com.spendful.app.premium.lifetime ($14.99 one-time)
 *
 * 3. Replace handleSubscribe with actual IAP purchase flow
 * 4. Replace handleRestorePurchases with actual restore flow
 * 5. Add receipt validation on your backend for security
 */

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type PlanType = "monthly" | "yearly" | "lifetime";

interface PricingOption {
  type: PlanType;
  price: string;
  period: string;
  description: string;
  recommended?: boolean;
}

const PRICING_OPTIONS: PricingOption[] = [
  {
    type: "monthly",
    price: "$0.99",
    period: "/month",
    description: "Cancel anytime",
  },
  {
    type: "yearly",
    price: "$8.99",
    period: "/year",
    description: "Save 24%",
    recommended: true,
  },
  {
    type: "lifetime",
    price: "$14.99",
    period: "",
    description: "One-time purchase",
  },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();

  const [selectedPlan, setSelectedPlan] = useState<PlanType>("yearly");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleSelectPlan = (plan: PlanType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(plan);
  };

  const handleSubscribe = async () => {
    try {
      setIsProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await updateSubscription({
        plan: selectedPlan,
        is_active: true,
        expires_at:
          selectedPlan === "lifetime"
            ? null
            : Date.now() +
              (selectedPlan === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000,
        source: "apple",
      });

      navigation.goBack();
    } catch (error) {
      console.error("Error processing subscription:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setIsRestoring(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // TODO: Replace with actual IAP restore logic
      // In production:
      // const history = await InAppPurchases.getPurchaseHistoryAsync();
      // Validate receipts and restore subscription status

      // For demo/development, show a message
      if (Platform.OS === "web") {
        window.alert(
          "Restore Purchases\n\nNo previous purchases found. If you believe this is an error, please contact support.",
        );
      } else {
        Alert.alert(
          "Restore Purchases",
          "No previous purchases found. If you believe this is an error, please contact support.",
        );
      }
    } catch (error) {
      console.error("Error restoring purchases:", error);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDismiss = () => {
    navigation.goBack();
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content}>
        <View
          style={{ paddingTop: Spacing["5xl"], paddingBottom: insets.bottom }}
        >
          {/*<Pressable style={styles.closeButton} onPress={handleDismiss}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>*/}

          <View style={styles.header}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.accentLight },
              ]}
            >
              <Feather name="unlock" size={40} color={theme.accent} />
            </View>

            <ThemedText type="h2" style={styles.title}>
              Keep your full picture
            </ThemedText>

            <ThemedText type="body" secondary style={styles.subtitle}>
              Unlock long-term awareness and see your complete spending journey
            </ThemedText>
          </View>

          <View style={styles.features}>
            <View style={styles.featureRow}>
              <Feather name="check-circle" size={20} color={theme.accent} />
              <ThemedText type="body" style={styles.featureText}>
                Unlimited history access
              </ThemedText>
            </View>
            <View style={styles.featureRow}>
              <Feather name="check-circle" size={20} color={theme.accent} />
              <ThemedText type="body" style={styles.featureText}>
                Monthly insights over time
              </ThemedText>
            </View>
            <View style={styles.featureRow}>
              <Feather name="check-circle" size={20} color={theme.accent} />
              <ThemedText type="body" style={styles.featureText}>
                Support calm development
              </ThemedText>
            </View>
          </View>

          <View style={styles.pricingOptions}>
            {PRICING_OPTIONS.map((option) => (
              <Pressable
                key={option.type}
                onPress={() => handleSelectPlan(option.type)}
                style={[
                  styles.pricingCard,
                  {
                    backgroundColor:
                      selectedPlan === option.type
                        ? theme.accentLight
                        : theme.backgroundDefault,
                    borderColor:
                      selectedPlan === option.type
                        ? theme.accent
                        : "transparent",
                    borderWidth: 2,
                  },
                ]}
              >
                {option.recommended ? (
                  <View
                    style={[
                      styles.recommendedBadge,
                      { backgroundColor: theme.accent },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={{ color: theme.buttonText, fontWeight: "600" }}
                    >
                      Best Value
                    </ThemedText>
                  </View>
                ) : null}

                <View style={styles.pricingContent}>
                  <View style={styles.priceRow}>
                    <ThemedText type="h3">{option.price}</ThemedText>
                    <ThemedText type="body" secondary>
                      {option.period}
                    </ThemedText>
                  </View>
                  <ThemedText type="caption" muted>
                    {option.description}
                  </ThemedText>
                </View>

                <View
                  style={[
                    styles.radioOuter,
                    {
                      borderColor:
                        selectedPlan === option.type
                          ? theme.accent
                          : theme.border,
                    },
                  ]}
                >
                  {selectedPlan === option.type ? (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: theme.accent },
                      ]}
                    />
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.footer}>
            <Button
              onPress={handleSubscribe}
              disabled={isProcessing}
              style={styles.subscribeButton}
            >
              {isProcessing ? (
                <ActivityIndicator color={theme.buttonText} />
              ) : (
                `Continue with ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}`
              )}
            </Button>

            <View style={styles.secondaryButtons}>
              <Pressable onPress={handleDismiss} style={styles.notNowButton}>
                <ThemedText type="body" secondary>
                  Not now
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={handleRestorePurchases}
                style={styles.restoreButton}
                disabled={isRestoring}
              >
                {isRestoring ? (
                  <ActivityIndicator size="small" color={theme.textSecondary} />
                ) : (
                  <ThemedText type="body" secondary>
                    Restore Purchases
                  </ThemedText>
                )}
              </Pressable>
            </View>

            <ThemedText type="caption" muted style={styles.termsText}>
              Recurring billing. Cancel anytime in Settings.
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  closeButton: {
    alignSelf: "flex-end",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  subtitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  features: {
    gap: Spacing.md,
    marginBottom: Spacing["3xl"],
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  featureText: {
    flex: 1,
  },
  pricingOptions: {
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  pricingCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    position: "relative",
  },
  recommendedBadge: {
    position: "absolute",
    top: -10,
    right: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  pricingContent: {
    flex: 1,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  footer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  subscribeButton: {
    marginBottom: Spacing.lg,
  },
  secondaryButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xl,
    marginBottom: Spacing.md,
  },
  notNowButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  termsText: {
    textAlign: "center",
  },
});
