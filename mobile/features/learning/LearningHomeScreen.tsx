import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ContentState } from "../../components/ContentState";
import { LearningCard } from "../../components/LearningCard";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SectionTitle } from "../../components/SectionTitle";
import { getCourses } from "./learning.service";
import type { CourseSummary } from "../../types/learning";

export function LearningHomeScreen() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCourses(await getCourses());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load courses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadCourses(); }, [loadCourses]));

  const firstCourse = courses[0];

  return (
    <ScreenContainer>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Ionicons name="grid-outline" size={24} color="#236c19" />
          <Text style={styles.brandText}>YOUR LEARNING GARDEN</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/tutor")} style={styles.floButton}>
          <Text style={styles.floText}>Flo AI</Text>
        </Pressable>
      </View>

      <Text style={styles.greeting}>Let’s grow your learning habit.</Text>
      <Text style={styles.subtitle}>Choose a small step and keep moving forward.</Text>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#58cc02" size="large" />
          <Text style={styles.loadingText}>Loading your courses…</Text>
        </View>
      ) : error ? (
        <ContentState title="Courses are unavailable" message={error} actionLabel="Try again" onAction={() => void loadCourses()} />
      ) : courses.length === 0 ? (
        <ContentState title="No courses yet" message="Published courses will appear here when they are available." />
      ) : (
        <>
          {firstCourse ? (
            <>
              <View style={styles.heroHeader}>
                <Text style={styles.heroEyebrow}>YOUR NEXT LITTLE STEP</Text>
                <Text style={styles.heroTitle}>Start learning</Text>
              </View>
              <LearningCard
                highlighted
                title={firstCourse.title}
                subtitle={`${firstCourse.level} · ${firstCourse.language}`}
                description={firstCourse.description}
                detail={`${firstCourse.unitCount} units · ${firstCourse.lessonCount} lessons`}
                onPress={() => router.push({ pathname: "/course/[courseId]", params: { courseId: firstCourse.id } })}
              />
            </>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable accessibilityRole="button" onPress={() => router.push("/lessons/search")} style={styles.actionButton}>
              <Ionicons name="search-outline" size={18} color="#236c19" />
              <Text style={styles.actionText}>Find a lesson</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push("/learning-paths")} style={styles.actionButton}>
              <Ionicons name="git-compare-outline" size={18} color="#236c19" />
              <Text style={styles.actionText}>Compare paths</Text>
            </Pressable>
          </View>

          <SectionTitle>Explore courses</SectionTitle>
          {courses.map((course) => (
            <LearningCard
              key={course.id}
              title={course.title}
              subtitle={`${course.level} · ${course.language}`}
              description={course.description}
              detail={`${course.unitCount} units · ${course.lessonCount} lessons`}
              onPress={() => router.push({ pathname: "/course/[courseId]", params: { courseId: course.id } })}
            />
          ))}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 26 },
  brand: { alignItems: "center", flexDirection: "row", gap: 10 },
  brandText: { color: "#65766c", fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  floButton: { backgroundColor: "#eaf8de", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 8 },
  floText: { color: "#236c19", fontSize: 12, fontWeight: "800" },
  greeting: { color: "#20352b", fontSize: 28, fontWeight: "900", lineHeight: 36 },
  subtitle: { color: "#65766c", fontSize: 14, lineHeight: 22, marginBottom: 24, marginTop: 6 },
  heroHeader: { marginBottom: 8 },
  heroEyebrow: { color: "#236c19", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  heroTitle: { color: "#20352b", fontSize: 20, fontWeight: "900", marginTop: 4 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  actionButton: { alignItems: "center", backgroundColor: "#f1f7ee", borderRadius: 14, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 46, paddingHorizontal: 8 },
  actionText: { color: "#236c19", fontSize: 12, fontWeight: "700" },
  loading: { alignItems: "center", backgroundColor: "#f5f8f4", borderRadius: 20, justifyContent: "center", minHeight: 180, padding: 24 },
  loadingText: { color: "#65766c", fontSize: 14, marginTop: 12 },
});
