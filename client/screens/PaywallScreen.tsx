import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ProductType } from "react-native-iap";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useStore } from "@/context/StoreContext";
import { BorderRadius, Spacing } from "@/constants/theme";

type Plan = "monthly" | "yearly" | "lifetime";

const PLAN_TYPES: Record<Plan, ProductType> = {
  monthly: "subs",
  yearly: "subs",
  lifetime: "in-app",
};

export default function PaywallScreen() {
  const { theme } = useTheme();
  const { products, loading: productsLoading, purchase, restore } = useStore();

  const [selectedPlan, setSelectedPlan] = useState<Plan>("yearly");
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);

  // Map products by plan
  const productMap = useMemo(() => {
    return {
      monthly: products.find((p) => p.id.includes(".monthly")),
      yearly: products.find((p) => p.id.includes(".yearly")),
      lifetime: products.find((p) => p.id.includes("lifetime")),
    };
  }, [products]);

  const handleSelect = (plan: Plan) => {
    if (productsLoading || purchaseInProgress || restoreInProgress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(plan);
  };

  const handlePurchase = async () => {
    const product = productMap[selectedPlan];
    if (!product || productsLoading) return;

    try {
      setPurchaseInProgress(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const productType = PLAN_TYPES[selectedPlan];
      await purchase(product.id, productType);

      Alert.alert("Purchase success!", "Thank you for upgrading.");
    } catch (err: any) {
      console.error("Purchase error:", err);
      Alert.alert("Purchase failed", err?.message ?? "Unknown error");
    } finally {
      setPurchaseInProgress(false);
    }
  };

  const handleRestore = async () => {
    try {
      setRestoreInProgress(true);
      await restore();
      Alert.alert("Restored", "Your purchases have been restored.");
    } catch (err: any) {
      console.error("Restore error:", err);
      Alert.alert("Restore failed", err?.message ?? "Unknown error");
    } finally {
      setRestoreInProgress(false);
    }
  };

  const renderOption = (plan: Plan, label: string, badge?: string) => {
    const product = productMap[plan];
    const selected = selectedPlan === plan;
    const disabled = productsLoading || purchaseInProgress || restoreInProgress;

    return (
      <Pressable
        onPress={() => handleSelect(plan)}
        disabled={disabled}
        style={[
          styles.card,
          {
            borderColor: selected ? theme.accent : theme.border,
            backgroundColor: selected
              ? theme.accentLight
              : theme.backgroundSecondary,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {badge && (
          <View style={[styles.badge, { backgroundColor: theme.accent }]}>
            <ThemedText type="caption" style={{ color: theme.buttonText }}>
              {badge}
            </ThemedText>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <ThemedText type="h3">
            {productsLoading ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : product ? (
              product.displayPrice
            ) : (
              "--"
            )}
          </ThemedText>
          <ThemedText type="caption" muted>
            {label}
          </ThemedText>
        </View>

        <View
          style={[
            styles.radio,
            {
              borderColor: selected ? theme.accent : theme.border,
              backgroundColor: selected ? theme.accent : "transparent",
            },
          ]}
        />
      </Pressable>
    );
  };

  const isButtonDisabled =
    productsLoading || purchaseInProgress || restoreInProgress;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={[styles.icon, { backgroundColor: theme.accentLight }]}>
            <Feather name="unlock" size={36} color={theme.accent} />
          </View>

          <ThemedText type="h2">Keep your full picture</ThemedText>
          <ThemedText type="body" secondary style={styles.subtitle}>
            Unlock long-term awareness and see your complete spending journey
          </ThemedText>
        </View>

        <View style={styles.features}>
          {[
            "Unlimited history access",
            "Recurring spending",
            "Data export & insights",
          ].map((text) => (
            <View key={text} style={styles.featureRow}>
              <Feather name="check-circle" size={18} color={theme.accent} />
              <ThemedText>{text}</ThemedText>
            </View>
          ))}
        </View>

        {renderOption("monthly", "per month")}
        {renderOption("yearly", "per year", "Best Value")}
        {renderOption("lifetime", "one-time purchase")}

        <Button
          onPress={handlePurchase}
          disabled={isButtonDisabled}
          style={styles.cta}
        >
          {purchaseInProgress ? (
            <ActivityIndicator color={theme.buttonText} />
          ) : (
            "Continue"
          )}
        </Button>

        <View style={styles.footer}>
          <Pressable onPress={handleRestore} disabled={isButtonDisabled}>
            {restoreInProgress ? (
              <ActivityIndicator size="small" />
            ) : (
              <ThemedText secondary>Restore Purchases</ThemedText>
            )}
          </Pressable>
        </View>

        <ThemedText type="caption" muted style={styles.legal}>
          Subscriptions renew automatically unless cancelled in App Store
          settings.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  content: {
    paddingVertical: Spacing["3xl"],
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  subtitle: {
    textAlign: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  features: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  featureRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    marginBottom: Spacing.md,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -10,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  cta: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  footer: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },
  legal: {
    marginTop: Spacing.md,
    textAlign: "center",
    lineHeight: 16,
  },
});
