import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
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
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useStore } from "@/context/StoreContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PlanType = "monthly" | "yearly" | "lifetime";

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { products, purchase, restore } = useStore();

  const [selectedPlan, setSelectedPlan] = useState<PlanType>("yearly");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const monthly = products.find((p) => p.productId.includes("monthly"));
  const yearly = products.find((p) => p.productId.includes("yearly"));
  const lifetime = products.find((p) => p.productId.includes("lifetime"));

  const handleSelectPlan = (plan: PlanType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(plan);
  };

  const handleSubscribe = async () => {
    try {
      setIsProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const product =
        selectedPlan === "monthly"
          ? monthly
          : selectedPlan === "yearly"
            ? yearly
            : lifetime;

      if (!product) {
        Alert.alert("Unavailable", "This purchase option is not available.");
        return;
      }

      await purchase(product.productId);
      navigation.goBack();
    } catch (error) {
      console.error("Purchase error:", error);
      Alert.alert("Purchase Failed", "Please try again later.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setIsRestoring(true);
      await restore();
      Alert.alert("Restored", "Your purchases have been restored.");
    } catch (error) {
      console.error("Restore error:", error);
      Alert.alert("Restore Failed", "No purchases were found.");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDismiss = () => navigation.goBack();

  const pricingOptions = [
    {
      type: "monthly" as PlanType,
      price: monthly?.localizedPrice ?? "--",
      period: "/month",
      description: "Cancel anytime",
    },
    {
      type: "yearly" as PlanType,
      price: yearly?.localizedPrice ?? "--",
      period: "/year",
      description: "Best value",
      recommended: true,
    },
    {
      type: "lifetime" as PlanType,
      price: lifetime?.localizedPrice ?? "--",
      period: "",
      description: "One-time purchase",
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content}>
        <View
          style={{ paddingTop: Spacing["5xl"], paddingBottom: insets.bottom }}
        >
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

          <View style={styles.pricingOptions}>
            {pricingOptions.map((option) => (
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
                {option.recommended && (
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
                )}

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
                  {selectedPlan === option.type && (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: theme.accent },
                      ]}
                    />
                  )}
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
                `Continue`
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
                  <ActivityIndicator size="small" />
                ) : (
                  <ThemedText type="body" secondary>
                    Restore Purchases
                  </ThemedText>
                )}
              </Pressable>
            </View>

            <ThemedText type="caption" muted style={styles.termsText}>
              Subscriptions renew automatically unless canceled in App Store
              settings.
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
