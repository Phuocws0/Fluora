import { LearningText as Text } from "../../../components/LearningText";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ContentState } from "../../../components/ContentState";
import { getWeeklyLearningAnalytics, type WeeklyLearningAnalytics } from "../activity.service";

export function WeeklyAnalyticsSection() {
  const [data, setData] = useState<WeeklyLearningAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWeeklyLearningAnalytics();
      setData(res);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load learning analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color="#58cc02" size="large" />
        <Text style={styles.loadingText}>Calculating 7-day activity metrics…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <ContentState
        title="Analytics unavailable"
        message={error ?? "Could not retrieve activity chart."}
        actionLabel="Try again"
        onAction={() => void fetchAnalytics()}
      />
    );
  }

  const maxXp = Math.max(1, ...data.days.map((d) => d.xp));

  return (
    <View style={styles.container}>
      {/* Summary Row */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryEyebrow}>WEEKLY XP</Text>
          <View style={styles.summaryValueRow}>
            <Ionicons name="flash" size={18} color="#e67700" />
            <Text style={styles.summaryValue}>{data.summary.xp}</Text>
          </View>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryEyebrow}>ANSWERS</Text>
          <View style={styles.summaryValueRow}>
            <Ionicons name="checkbox-outline" size={18} color="#236c19" />
            <Text style={styles.summaryValue}>{data.summary.answers}</Text>
          </View>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryEyebrow}>LESSONS</Text>
          <View style={styles.summaryValueRow}>
            <Ionicons name="checkmark-done" size={18} color="#1967d2" />
            <Text style={styles.summaryValue}>{data.summary.completedLessons}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.chartTitle}>7-Day Learning Activity</Text>

      {/* Bar Chart */}
      <View style={styles.chartCard}>
        <View style={styles.barsContainer}>
          {data.days.map((day) => {
            const heightPercent = Math.max(8, Math.round((day.xp / maxXp) * 100));
            const dayLabel = day.date.slice(5); // MM-DD

            return (
              <View key={day.date} style={styles.barColumn}>
                <Text style={styles.barXpValue}>{day.xp > 0 ? day.xp : ""}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${heightPercent}%` },
                      day.xp > 0 ? styles.barFillActive : styles.barFillZero,
                    ]}
                  />
                </View>
                <Text style={styles.barDateLabel}>{dayLabel}</Text>
                <Text style={styles.barAnswerCount}>{day.answers}a</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.chartLegend}>
          Bars indicate daily XP earned; labels below indicate date and answers submitted.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  loadingBox: { alignItems: "center", padding: 40 },
  loadingText: { fontFamily: "Nunito_400Regular", color: "#65766c", fontSize: 14, marginTop: 12 },
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
  },
  summaryBox: {
    backgroundColor: "#f5f8f4",
    borderColor: "#dee8d9",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  summaryEyebrow: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#65766c",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  summaryValueRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  summaryValue: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 18,
    fontWeight: "900",
  },
  chartTitle: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 6,
  },
  chartCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
  },
  barsContainer: {
    alignItems: "flex-end",
    flexDirection: "row",
    height: 150,
    justifyContent: "space-between",
    paddingTop: 16,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
  },
  barXpValue: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 10,
    fontWeight: "800",
    height: 14,
  },
  barTrack: {
    backgroundColor: "#f5f8f4",
    borderRadius: 8,
    height: 90,
    justifyContent: "flex-end",
    marginVertical: 4,
    overflow: "hidden",
    width: 22,
  },
  barFill: {
    borderRadius: 8,
    width: "100%",
  },
  barFillActive: {
    backgroundColor: "#58cc02",
  },
  barFillZero: {
    backgroundColor: "#e5ece2",
  },
  barDateLabel: {
    fontFamily: "Nunito_700Bold",
    color: "#20352b",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },
  barAnswerCount: {
    fontFamily: "Nunito_700Bold",
    color: "#65766c",
    fontSize: 9,
    fontWeight: "600",
  },
  chartLegend: {
    fontFamily: "Nunito_400Regular",
    color: "#65766c",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 14,
    textAlign: "center",
  },
});
