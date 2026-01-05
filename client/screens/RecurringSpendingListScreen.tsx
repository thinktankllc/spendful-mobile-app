import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import {
  getRecurringEntries,
  updateRecurringEntry,
  deleteRecurringEntry,
  RecurringEntry,
  formatCurrency,
} from "@/lib/database";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FREQUENCY_LABELS: Record<RecurringEntry["frequency"], string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

export default function RecurringSpendingListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();

  const [entries, setEntries] = useState<RecurringEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<RecurringEntry | null>(
    null
  );

  const loadEntries = useCallback(async () => {
    try {
      const data = await getRecurringEntries();
      setEntries(data.sort((a, b) => b.created_at - a.created_at));
    } catch (error) {
      console.error("Error loading recurring entries:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const handleToggleActive = async (entry: RecurringEntry) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await updateRecurringEntry(entry.id, { is_active: !entry.is_active });
      await loadEntries();
    } catch (error) {
      console.error("Error toggling entry:", error);
    }
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await deleteRecurringEntry(entryToDelete.id);
      await loadEntries();
    } catch (error) {
      console.error("Error deleting entry:", error);
    } finally {
      setDeleteModalVisible(false);
      setEntryToDelete(null);
    }
  };

  const handleDelete = (entry: RecurringEntry) => {
    if (Platform.OS === "web") {
      setEntryToDelete(entry);
      setDeleteModalVisible(true);
    } else {
      Alert.alert(
        "Remove Recurring Spending",
        "This will stop future entries from being created. Existing entries will not be affected.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await deleteRecurringEntry(entry.id);
                await loadEntries();
              } catch (error) {
                console.error("Error deleting entry:", error);
              }
            },
          },
        ]
      );
    }
  };

  const handleEdit = (entry: RecurringEntry) => {
    navigation.navigate("RecurringSpendingForm", { entryId: entry.id });
  };

  const handleAdd = () => {
    navigation.navigate("RecurringSpendingForm", {});
  };

  const renderEntry = ({ item }: { item: RecurringEntry }) => {
    const currencyCode = item.currency || "USD";

    return (
      <Card elevation={1} style={styles.entryCard}>
        <Pressable style={styles.entryContent} onPress={() => handleEdit(item)}>
          <View style={styles.entryMain}>
            <View style={styles.entryHeader}>
              <ThemedText type="h4" style={styles.amount}>
                {formatCurrency(item.amount, currencyCode)}
              </ThemedText>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: item.is_active
                      ? theme.success + "20"
                      : theme.textMuted + "20",
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{
                    color: item.is_active ? theme.success : theme.textMuted,
                  }}
                >
                  {item.is_active ? "Active" : "Paused"}
                </ThemedText>
              </View>
            </View>

            <View style={styles.entryDetails}>
              {item.category ? (
                <View style={styles.detailRow}>
                  <Feather name="tag" size={14} color={theme.textMuted} />
                  <ThemedText type="caption" muted style={styles.detailText}>
                    {item.category}
                  </ThemedText>
                </View>
              ) : null}
              <View style={styles.detailRow}>
                <Feather name="repeat" size={14} color={theme.textMuted} />
                <ThemedText type="caption" muted style={styles.detailText}>
                  {FREQUENCY_LABELS[item.frequency]}
                </ThemedText>
              </View>
              {item.note ? (
                <View style={styles.detailRow}>
                  <Feather name="file-text" size={14} color={theme.textMuted} />
                  <ThemedText
                    type="caption"
                    muted
                    style={styles.detailText}
                    numberOfLines={1}
                  >
                    {item.note}
                  </ThemedText>
                </View>
              ) : null}
              <View style={styles.detailRow}>
                <Feather name="edit-2" size={14} color={theme.accent} />
                <ThemedText
                  type="caption"
                  style={[styles.detailText, { color: theme.accent }]}
                >
                  Tap to edit
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.entryActions}>
            <Pressable
              style={[
                styles.actionBtn,
                { backgroundColor: theme.backgroundDefault },
              ]}
              onPress={() => handleToggleActive(item)}
              hitSlop={8}
            >
              <Feather
                name={item.is_active ? "pause" : "play"}
                size={18}
                color={theme.text}
              />
            </Pressable>
            <Pressable
              style={[
                styles.actionBtn,
                { backgroundColor: theme.backgroundDefault },
              ]}
              onPress={() => handleDelete(item)}
              hitSlop={8}
            >
              <Feather name="trash-2" size={18} color={theme.error} />
            </Pressable>
          </View>
        </Pressable>
      </Card>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIconContainer,
          { backgroundColor: theme.accentLight },
        ]}
      >
        <Feather name="repeat" size={32} color={theme.accent} />
      </View>
      <ThemedText type="h4" style={styles.emptyTitle}>
        No recurring spending
      </ThemedText>
      <ThemedText type="body" muted style={styles.emptyDescription}>
        Add recurring items like subscriptions or regular expenses. They will
        automatically appear in your daily spending.
      </ThemedText>
      <Button onPress={handleAdd} style={styles.emptyButton}>
        Add Recurring Spending
      </Button>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
        ListEmptyComponent={isLoading ? null : renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {entries.length > 0 ? (
        <View
          style={[styles.fabContainer, { bottom: insets.bottom + Spacing.lg }]}
        >
          <Pressable
            style={[styles.fab, { backgroundColor: theme.accent }]}
            onPress={handleAdd}
          >
            <Feather name="plus" size={24} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDeleteModalVisible(false);
          setEntryToDelete(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundElevated },
            ]}
          >
            <View
              style={[
                styles.modalIconContainer,
                { backgroundColor: theme.error + "15" },
              ]}
            >
              <Feather name="trash-2" size={28} color={theme.error} />
            </View>
            <ThemedText type="h4" style={styles.modalTitle}>
              Remove Recurring Spending
            </ThemedText>
            <ThemedText type="body" muted style={styles.modalMessage}>
              This will stop future entries from being created. Existing entries
              will not be affected.
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setEntryToDelete(null);
                }}
              >
                <ThemedText type="body">Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.error }]}
                onPress={confirmDelete}
              >
                <ThemedText type="body" style={{ color: "#fff" }}>
                  Remove
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  entryCard: {
    padding: 0,
    overflow: "hidden",
  },
  entryContent: {
    flexDirection: "row",
    padding: Spacing.md,
  },
  entryMain: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  amount: {
    fontSize: 20,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  entryDetails: {
    gap: Spacing.xs,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  detailText: {
    flex: 1,
  },
  entryActions: {
    justifyContent: "center",
    gap: Spacing.sm,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["4xl"],
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  emptyButton: {
    minWidth: 200,
  },
  fabContainer: {
    position: "absolute",
    right: Spacing.lg,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  modalMessage: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
});
