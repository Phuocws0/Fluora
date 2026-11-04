import { LearningText as Text } from "../../components/LearningText";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { ContentState } from "../../components/ContentState";
import { ScreenContainer } from "../../components/ScreenContainer";
import { getLearningPaths, compareLearningPaths } from "./learning.service";
import type { LearningPath } from "../../types/learning";

export function LearningPathComparisonScreen() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getLearningPaths()
      .then((result) => { if (active) setPaths(result); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load learning paths.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const togglePath = (pathId: string) => {
    setSelectedIds((current) => {
      if (current.includes(pathId)) return current.filter((id) => id !== pathId);
      return current.length === 2 ? [current[1], pathId] : [...current, pathId];
    });
    setComparison([]);
  };

  const compare = async () => {
    setComparing(true);
    setError(null);
    try {
      setComparison(await compareLearningPaths(selectedIds));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not compare learning paths.");
    } finally {
      setComparing(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>LEARNING PLANS</Text>
      <Text style={styles.title}>Compare learning paths</Text>
      <Text style={styles.subtitle}>Choose two goals to compare their language level, time, and syllabus.</Text>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator color="#58cc02" /><Text style={styles.loadingText}>Loading paths…</Text></View>
      ) : error && paths.length === 0 ? (
        <ContentState title="Paths are unavailable" message={error} />
      ) : paths.length === 0 ? (
        <ContentState title="No paths yet" message="Published learning paths will appear here." />
      ) : (
        <>
          {paths.map((path) => {
            const selected = selectedIds.includes(path.id);
            return (
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} key={path.id} onPress={() => togglePath(path.id)} style={[styles.pathCard, selected && styles.pathSelected]}>
                <View style={styles.pathCopy}>
                  <Text style={styles.pathTitle}>{path.title}</Text>
                  <Text style={styles.pathGoal}>{path.careerGoal} · {path.level}</Text>
                  <Text style={styles.pathSummary}>{path.summary}</Text>
                </View>
                <Text style={[styles.check, selected && styles.checked]}>{selected ? "✓" : "+"}</Text>
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" disabled={selectedIds.length !== 2 || comparing} onPress={() => void compare()} style={[styles.compareButton, (selectedIds.length !== 2 || comparing) && styles.disabled]}>
            <Text style={styles.compareButtonText}>{comparing ? "Comparing…" : "Compare selected paths"}</Text>
          </Pressable>
          {error ? <ContentState title="Comparison failed" message={error} actionLabel="Try again" onAction={() => void compare()} /> : null}
          {comparison.length > 0 ? (
            <View style={styles.comparison}>
              {comparison.map((path) => (
                <View key={path.id} style={styles.comparisonColumn}>
                  <Text style={styles.pathTitle}>{path.title}</Text>
                  <Text style={styles.pathGoal}>{path.careerGoal}</Text>
                  <Text style={styles.comparisonItem}>{path.targetLanguage} · {path.level}</Text>
                  <Text style={styles.comparisonItem}>{path.estimatedMinutes} min total</Text>
                  {path.estimatedWeeks ? <Text style={styles.comparisonItem}>{path.estimatedWeeks} weeks</Text> : null}
                  <Text style={styles.comparisonHeading}>You will learn to</Text>
                  {path.outcomes.map((outcome) => <Text key={outcome} style={styles.outcome}>• {outcome}</Text>)}
                  <Text style={styles.comparisonHeading}>Course</Text>
                  <Text style={styles.comparisonItem}>{path.course.title}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: "Nunito_800ExtraBold", color: "#236c19", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  title: { fontFamily: "Nunito_800ExtraBold", color: "#20352b", fontSize: 28, fontWeight: "900", lineHeight: 36, marginTop: 7 },
  subtitle: { fontFamily: "Nunito_400Regular", color: "#65766c", fontSize: 14, lineHeight: 21, marginBottom: 20, marginTop: 7 },
  loading: { alignItems: "center", backgroundColor: "#f5f8f4", borderRadius: 18, padding: 24 },
  loadingText: { fontFamily: "Nunito_400Regular", color: "#65766c", fontSize: 14, marginTop: 10 },
  pathCard: { alignItems: "center", backgroundColor: "#ffffff", borderColor: "#dee8d9", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 12, marginBottom: 12, padding: 16 },
  pathSelected: { backgroundColor: "#eaf8de", borderColor: "#58cc02" },
  pathCopy: { flex: 1 },
  pathTitle: { fontFamily: "Nunito_800ExtraBold", color: "#20352b", fontSize: 16, fontWeight: "800" },
  pathGoal: { fontFamily: "Nunito_700Bold", color: "#236c19", fontSize: 12, fontWeight: "700", marginTop: 5 },
  pathSummary: { fontFamily: "Nunito_400Regular", color: "#65766c", fontSize: 13, lineHeight: 19, marginTop: 6 },
  check: { fontFamily: "Nunito_400Regular", alignItems: "center", borderColor: "#a8b5aa", borderRadius: 14, borderWidth: 1, color: "#65766c", fontSize: 18, height: 28, overflow: "hidden", textAlign: "center", textAlignVertical: "center", width: 28 },
  checked: { backgroundColor: "#58cc02", borderColor: "#58cc02", color: "#20352b" },
  compareButton: { alignItems: "center", backgroundColor: "#58cc02", borderRadius: 16, marginTop: 8, padding: 16 },
  disabled: { backgroundColor: "#dfe8dc" },
  compareButtonText: { fontFamily: "Nunito_800ExtraBold", color: "#20352b", fontSize: 14, fontWeight: "800" },
  comparison: { flexDirection: "row", gap: 10, marginTop: 18 },
  comparisonColumn: { backgroundColor: "#f5f8f4", borderRadius: 16, flex: 1, padding: 12 },
  comparisonItem: { fontFamily: "Nunito_400Regular", color: "#52625d", fontSize: 12, lineHeight: 18, marginTop: 7 },
  comparisonHeading: { fontFamily: "Nunito_800ExtraBold", color: "#20352b", fontSize: 12, fontWeight: "800", marginTop: 18 },
  outcome: { fontFamily: "Nunito_400Regular", color: "#52625d", fontSize: 11, lineHeight: 16, marginTop: 6 },
});
