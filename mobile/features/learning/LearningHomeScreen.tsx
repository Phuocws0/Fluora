import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ContentState } from "../../components/ContentState";
import { LearningCard } from "../../components/LearningCard";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SectionTitle } from "../../components/SectionTitle";
import { useAuth } from "../auth/AuthContext";
import { getCourse, getCourses } from "./learning.service";
import { getHomeSummary } from "./activity.service";
import type { CourseSummary, HomeSummary } from "../../types/learning";

type NextLessonInfo = {
  id: string;
  title: string;
  skill: string;
  level: string;
  durationMinutes: number;
};

export function LearningHomeScreen() {
  const { user } = useAuth();
  return <LearningHomeContent key={user?.id ?? "guest"} />;
}

function LearningHomeContent() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [homeSummary, setHomeSummary] = useState<HomeSummary | null>(null);
  const [nextLesson, setNextLesson] = useState<NextLessonInfo | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedCourses = await getCourses();
      setCourses(fetchedCourses);

      let summary: HomeSummary | null = null;
      if (isAuthenticated) {
        try {
          summary = await getHomeSummary();
          setHomeSummary(summary);
        } catch (cause) {
          setHomeSummary(null);
          throw cause;
        }
      } else {
        setHomeSummary(null);
      }

      const activeCourseId = summary?.course?.id ?? fetchedCourses[0]?.id;
      let resolvedNext: NextLessonInfo | null = null;
      if (activeCourseId) {
        try {
          const courseDetail = await getCourse(activeCourseId);
          const allLessons: NextLessonInfo[] = courseDetail.units.flatMap((u) =>
            (u.lessons ?? []).map((l) => ({
              id: l.id,
              title: l.title,
              skill: l.skill,
              level: l.level,
              durationMinutes: l.durationMinutes,
            })),
          );
          if (allLessons.length > 0) {
            const completedIds = new Set(summary?.progress.completedLessonIds ?? []);
            const pending = allLessons.find((item) => !completedIds.has(item.id));
            resolvedNext = pending ?? allLessons[0];
            setReviewMode(!pending && Boolean(summary));
          }
        } catch (cause) {
          throw cause;
        }
      }
      setNextLesson(resolvedNext);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load courses.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));

  const firstCourse = courses[0];

  return (
    <ScreenContainer>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Ionicons name="grid-outline" size={24} color="#236c19" />
          <Text style={styles.brandText}>YOUR LEARNING GARDEN</Text>
        </View>
        <View style={styles.topActions}>
          {isAuthenticated && homeSummary ? (
            <View style={styles.statsBar}>
              <View style={styles.statPill}>
                <Text style={styles.statEmoji}>🔥</Text>
                <Text style={styles.statValue}>{homeSummary.streak}</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statEmoji}>⚡</Text>
                <Text style={styles.statValue}>{homeSummary.progress.xp}</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statEmoji}>💎</Text>
                <Text style={styles.statValue}>{homeSummary.wallet.gems}</Text>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(tabs)/tutor")}
              style={styles.floButton}
            >
              <Text style={styles.floText}>Flo AI</Text>
            </Pressable>
          )}
        </View>
      </View>

      <Text style={styles.greeting}>Let’s grow your learning habit.</Text>
      <Text style={styles.subtitle}>Choose a small step and keep moving forward.</Text>

      {!isAuthenticated ? (
        <View style={styles.guestBanner}>
          <View style={styles.guestCopy}>
            <Text style={styles.guestTitle}>Sign in to save progress</Text>
            <Text style={styles.guestSubtitle}>Track your streak, earn XP, and unlock insights.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(auth)/login")}
            style={styles.guestButton}
          >
            <Text style={styles.guestButtonText}>Sign in</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#58cc02" size="large" />
          <Text style={styles.loadingText}>Loading your learning garden…</Text>
        </View>
      ) : error ? (
        <ContentState
          title="Content is unavailable"
          message={error}
          actionLabel="Try again"
          onAction={() => void loadData()}
        />
      ) : courses.length === 0 ? (
        <ContentState
          title="No courses yet"
          message="Published courses will appear here when they are available."
        />
      ) : (
        <>
          {isAuthenticated && nextLesson ? (
            <>
              <View style={styles.heroHeader}>
                <Text style={styles.heroEyebrow}>
                  {reviewMode ? "REVIEW" : "CONTINUE LEARNING"} · {nextLesson.skill.toLocaleUpperCase()}
                </Text>
                <Text style={styles.heroTitle}>{reviewMode ? "Review a completed lesson" : "Resume next lesson"}</Text>
              </View>
              <LearningCard
                highlighted
                title={nextLesson.title}
                subtitle={`${nextLesson.level} · ${nextLesson.skill}`}
                description="Continue your language journey with practice exercises."
                detail={`${nextLesson.durationMinutes} min`}
                onPress={() =>
                  router.push({
                    pathname: "/lesson/[lessonId]",
                    params: { lessonId: nextLesson.id },
                  })
                }
              />
            </>
          ) : firstCourse ? (
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
                onPress={() =>
                  router.push({
                    pathname: "/course/[courseId]",
                    params: { courseId: firstCourse.id },
                  })
                }
              />
            </>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/lessons/search")}
              style={styles.actionButton}
            >
              <Ionicons name="search-outline" size={18} color="#236c19" />
              <Text style={styles.actionText}>Find a lesson</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/learning-paths")}
              style={styles.actionButton}
            >
              <Ionicons name="git-compare-outline" size={18} color="#236c19" />
              <Text style={styles.actionText}>Compare paths</Text>
            </Pressable>
          </View>

          <View style={styles.insightsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/planner")}
              style={styles.insightButton}
            >
              <Ionicons name="calendar-outline" size={18} color="#236c19" />
              <Text style={styles.insightText}>Study Planner</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/missions/passport")}
              style={styles.insightButton}
            >
              <Ionicons name="ribbon-outline" size={18} color="#236c19" />
              <Text style={styles.insightText}>Missions</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/learning/insights")}
              style={styles.insightButton}
            >
              <Ionicons name="analytics-outline" size={18} color="#236c19" />
              <Text style={styles.insightText}>Insights Hub</Text>
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
              onPress={() =>
                router.push({
                  pathname: "/course/[courseId]",
                  params: { courseId: course.id },
                })
              }
            />
          ))}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  brand: { alignItems: "center", flexDirection: "row", gap: 10 },
  brandText: { color: "#65766c", fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  floButton: { backgroundColor: "#eaf8de", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8 },
  floText: { color: "#236c19", fontSize: 12, fontWeight: "800" },
  statsBar: { flexDirection: "row", alignItems: "center", gap: 6 },
  statPill: {
    backgroundColor: "#f5f8f4",
    borderColor: "#dee8d9",
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  statEmoji: { fontSize: 12 },
  statValue: { color: "#20352b", fontSize: 12, fontWeight: "800" },
  greeting: { color: "#20352b", fontSize: 28, fontWeight: "900", lineHeight: 36 },
  subtitle: { color: "#65766c", fontSize: 14, lineHeight: 22, marginBottom: 18, marginTop: 4 },
  guestBanner: {
    backgroundColor: "#eaf8de",
    borderColor: "#d2ebd0",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  guestCopy: { flex: 1 },
  guestTitle: { color: "#20352b", fontSize: 14, fontWeight: "800" },
  guestSubtitle: { color: "#52625d", fontSize: 12, lineHeight: 17, marginTop: 2 },
  guestButton: {
    backgroundColor: "#236c19",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  guestButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  heroHeader: { marginBottom: 8 },
  heroEyebrow: { color: "#236c19", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  heroTitle: { color: "#20352b", fontSize: 20, fontWeight: "900", marginTop: 4 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  actionButton: {
    alignItems: "center",
    backgroundColor: "#f1f7ee",
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 8,
  },
  actionText: { color: "#236c19", fontSize: 12, fontWeight: "700" },
  insightsRow: { flexDirection: "row", gap: 8, marginTop: 10, marginBottom: 8 },
  insightButton: {
    alignItems: "center",
    backgroundColor: "#f5f8f4",
    borderColor: "#dee8d9",
    borderWidth: 1,
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 6,
  },
  insightText: { color: "#236c19", fontSize: 11, fontWeight: "700" },
  loading: {
    alignItems: "center",
    backgroundColor: "#f5f8f4",
    borderRadius: 20,
    justifyContent: "center",
    minHeight: 180,
    padding: 24,
  },
  loadingText: { color: "#65766c", fontSize: 14, marginTop: 12 },
});
