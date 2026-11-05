import { LearningText as Text } from "../../../components/LearningText";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ContentState } from "../../../components/ContentState";
import { getMisconceptions, setMisconceptionDismissed } from "../activity.service";
import type { MisconceptionItem } from "../../../types/learning";
import { LocalizedAlert as Alert, LocalizedPressable as Pressable } from "../../i18n/i18n";

export function MisconceptionMapSection() {
  const [items, setItems] = useState<MisconceptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "dismissed">("active");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMisconceptions();
      setItems(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load misconception map.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchItems();
  }, []);

  const handleToggleDismiss = async (item: MisconceptionItem) => {
    const nextDismissed = !item.dismissed;
    setUpdatingId(item.id);
    try {
      await setMisconceptionDismissed(item.id, nextDismissed);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, dismissed: nextDismissed } : i)),
      );
    } catch (cause) {
      Alert.alert(
        "Update Failed",
        cause instanceof Error ? cause.message : "Could not update pattern status.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color="#58cc02" size="large" />
        <Text style={styles.loadingText}>Analyzing recurring mistake patterns…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <ContentState
        title="Could not load error patterns"
        message={error}
        actionLabel="Try again"
        onAction={() => void fetchItems()}
      />
    );
  }

  const activeItems = items.filter((i) => !i.dismissed);
  const dismissedItems = items.filter((i) => i.dismissed);
  const displayedItems = filter === "active" ? activeItems : dismissedItems;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionSubtitle}>
        Fluora automatically flags recurring mistakes (2+ errors) to help you master challenging concepts.
      </Text>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: filter === "active" }}
          onPress={() => setFilter("active")}
          style={[styles.filterTab, filter === "active" && styles.filterTabActive]}
        >
          <Text style={[styles.filterTabText, filter === "active" && styles.filterTabTextActive]}>
            Active Mistakes ({activeItems.length})
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: filter === "dismissed" }}
          onPress={() => setFilter("dismissed")}
          style={[styles.filterTab, filter === "dismissed" && styles.filterTabActive]}
        >
          <Text style={[styles.filterTabText, filter === "dismissed" && styles.filterTabTextActive]}>
            Dismissed ({dismissedItems.length})
          </Text>
        </Pressable>
      </View>

      {displayedItems.length === 0 ? (
        <ContentState
          title={filter === "active" ? "No active error patterns! 🎉" : "No dismissed patterns"}
          message={
            filter === "active"
              ? "You haven’t repeated any mistakes twice. Keep up the high accuracy!"
              : "Patterns you dismiss as mastered will appear here."
          }
        />
      ) : (
        <View style={styles.itemsList}>
          {displayedItems.map((item) => (
            <View key={item.id} style={styles.patternCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.lessonMeta} translate={false}>
                  {item.lesson.title} · {item.lesson.skill}
                </Text>
                <View style={styles.mistakeBadge}>
                  <Text style={styles.mistakeBadgeText}>{item.mistakeCount} mistakes</Text>
                </View>
              </View>

              <Text style={styles.prompt} translate={false}>{item.prompt}</Text>

              {item.explanation ? (
                <View style={styles.explanationBox}>
                  <Text style={styles.explanationTitle}>KEY TAKEAWAY:</Text>
                  <Text style={styles.explanationText} translate={false}>{item.explanation}</Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={updatingId === item.id}
                onPress={() => void handleToggleDismiss(item)}
                style={[styles.actionButton, item.dismissed && styles.actionButtonRestore]}
              >
                {updatingId === item.id ? (
                  <ActivityIndicator color={item.dismissed ? "#236c19" : "#65766c"} size="small" />
                ) : (
                  <>
                    <Ionicons
                      name={item.dismissed ? "refresh-outline" : "checkmark-circle-outline"}
                      size={16}
                      color={item.dismissed ? "#236c19" : "#65766c"}
                    />
                    <Text
                      style={[
                        styles.actionButtonText,
                        item.dismissed && styles.actionButtonTextRestore,
                      ]}
                    >
                      {item.dismissed ? "Restore pattern" : "Dismiss (mastered)"}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  loadingBox: { alignItems: "center", padding: 40 },
  loadingText: { fontFamily: "Nunito_400Regular", color: "#65766c", fontSize: 14, marginTop: 12 },
  sectionSubtitle: {
    fontFamily: "Nunito_400Regular",
    color: "#52625d",
    fontSize: 13,
    lineHeight: 19,
  },
  filterBar: {
    backgroundColor: "#f5f8f4",
    borderRadius: 14,
    flexDirection: "row",
    padding: 4,
  },
  filterTab: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    paddingVertical: 8,
  },
  filterTabActive: {
    backgroundColor: "#ffffff",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  filterTabText: {
    fontFamily: "Nunito_700Bold",
    color: "#65766c",
    fontSize: 12,
    fontWeight: "700",
  },
  filterTabTextActive: {
    color: "#236c19",
    fontWeight: "800",
  },
  itemsList: { gap: 12 },
  patternCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  lessonMeta: {
    fontFamily: "Nunito_700Bold",
    color: "#65766c",
    fontSize: 11,
    fontWeight: "700",
  },
  mistakeBadge: {
    backgroundColor: "#fff0ed",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  mistakeBadgeText: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#a82c20",
    fontSize: 10,
    fontWeight: "800",
  },
  prompt: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  explanationBox: {
    backgroundColor: "#f5f8f4",
    borderRadius: 12,
    marginTop: 10,
    padding: 12,
  },
  explanationTitle: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  explanationText: {
    fontFamily: "Nunito_400Regular",
    color: "#20352b",
    fontSize: 13,
    lineHeight: 18,
  },
  actionButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionButtonRestore: {},
  actionButtonText: {
    fontFamily: "Nunito_700Bold",
    color: "#65766c",
    fontSize: 12,
    fontWeight: "700",
  },
  actionButtonTextRestore: {
    color: "#236c19",
    fontWeight: "800",
  },
});
