import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ContentState } from "../../../components/ContentState";
import { getSkillBaseline } from "../activity.service";
import type { SkillBaselineResult } from "../../../types/learning";

export function SkillBaselineSection() {
  const [data, setData] = useState<SkillBaselineResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBaseline = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSkillBaseline();
      setData(res);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Complete an exercise or placement test to see your skill baseline.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBaseline();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color="#58cc02" size="large" />
        <Text style={styles.loadingText}>Calculating skill baseline…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <ContentState
        title="Baseline not yet established"
        message={error ?? "Complete exercises or take a placement test to establish your initial CEFR skill baseline."}
        actionLabel="Try again"
        onAction={() => void fetchBaseline()}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Overall Level Card */}
      <View style={styles.levelCard}>
        <Text style={styles.levelEyebrow}>SUGGESTED CEFR LEVEL</Text>
        <View style={styles.levelRow}>
          <Text style={styles.levelBadge}>{data.level}</Text>
          <View style={styles.levelMeta}>
            <Text style={styles.levelTitle}>Demonstrated Proficiency</Text>
            <Text style={styles.levelSource}>
              Source: {data.source === "answers" ? "Exercise Answer History" : "Placement Test"}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Confidence by Language Skill</Text>

      {/* Skills Matrix */}
      <View style={styles.matrixList}>
        {data.skills.map((item) => {
          const confidence = Math.min(100, Math.max(0, item.confidence));
          const barColor =
            confidence >= 75 ? "#236c19" : confidence >= 50 ? "#e67700" : "#65766c";

          return (
            <View key={item.skill} style={styles.skillCard}>
              <View style={styles.skillHeader}>
                <Text style={styles.skillName}>
                  {item.skill.charAt(0).toUpperCase() + item.skill.slice(1)}
                </Text>
                <Text style={[styles.confidenceText, { color: barColor }]}>
                  {confidence}%
                </Text>
              </View>

              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${confidence}%`, backgroundColor: barColor },
                  ]}
                />
              </View>

              <Text style={styles.attemptsText}>
                {item.attempts} recorded practice attempt{item.attempts === 1 ? "" : "s"}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  loadingBox: { alignItems: "center", padding: 40 },
  loadingText: { color: "#65766c", fontSize: 14, marginTop: 12 },
  levelCard: {
    backgroundColor: "#eaf8de",
    borderColor: "#d2ebd0",
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  levelEyebrow: {
    color: "#236c19",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  levelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    marginTop: 8,
  },
  levelBadge: {
    backgroundColor: "#236c19",
    borderRadius: 14,
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  levelMeta: { flex: 1 },
  levelTitle: { color: "#20352b", fontSize: 16, fontWeight: "900" },
  levelSource: { color: "#52625d", fontSize: 12, marginTop: 2 },
  sectionTitle: {
    color: "#20352b",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 6,
  },
  matrixList: { gap: 10 },
  skillCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  skillHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  skillName: { color: "#20352b", fontSize: 15, fontWeight: "800" },
  confidenceText: { fontSize: 14, fontWeight: "900" },
  barTrack: {
    backgroundColor: "#e5ece2",
    borderRadius: 6,
    height: 8,
    overflow: "hidden",
  },
  barFill: {
    borderRadius: 6,
    height: "100%",
  },
  attemptsText: { color: "#65766c", fontSize: 11, marginTop: 6 },
});
