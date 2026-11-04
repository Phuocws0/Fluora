import { LearningText as Text } from "../../components/LearningText";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";
import { ContentState } from "../../components/ContentState";
import { ScreenContainer } from "../../components/ScreenContainer";
import { useAuth } from "../auth/AuthContext";
import { getCourse, getCourses } from "./learning.service";
import { getHomeSummary } from "./activity.service";
import { firstUnfinishedLesson } from "./next-lesson";
import type { CourseOverview, CourseSummary, HomeSummary } from "../../types/learning";
import { font, garden } from "../profile/garden-ui";

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
  const { isAuthenticated, user } = useAuth();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [courseDetail, setCourseDetail] = useState<CourseOverview | null>(null);
  const [homeSummary, setHomeSummary] = useState<HomeSummary | null>(null);
  const [nextLesson, setNextLesson] = useState<NextLessonInfo | null>(null);
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
        summary = await getHomeSummary();
        setHomeSummary(summary);
      } else {
        setHomeSummary(null);
      }

      const activeCourseId = summary?.course?.id ?? fetchedCourses[0]?.id;
      if (!activeCourseId) {
        setCourseDetail(null);
        setNextLesson(null);
        return;
      }

      const detail = await getCourse(activeCourseId);
      setCourseDetail(detail);
      const allLessons = detail.units.flatMap((unit) =>
        unit.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          skill: lesson.skill,
          level: lesson.level,
          durationMinutes: lesson.durationMinutes,
        })),
      );
      setNextLesson(firstUnfinishedLesson(allLessons, summary?.progress.completedLessonIds ?? []));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load courses.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));

  const firstCourse = courses[0];
  const currentUnit = useMemo(
    () => courseDetail?.units.find((unit) => unit.lessons.some((lesson) => lesson.id === nextLesson?.id)) ?? courseDetail?.units[0] ?? null,
    [courseDetail, nextLesson?.id],
  );
  const completedIds = new Set(homeSummary?.progress.completedLessonIds ?? []);
  const completedInUnit = currentUnit?.lessons.filter((lesson) => completedIds.has(lesson.id)).length ?? 0;
  const lessonCount = courseDetail?.units.reduce((total, unit) => total + unit.lessons.length, 0) ?? 0;
  const courseComplete = lessonCount > 0 && nextLesson === null;
  const learnerName = (user?.displayName || user?.email.split("@")[0] || "there").trim().split(/\s+/)[0];

  const openCourse = () => {
    const courseId = courseDetail?.id ?? firstCourse?.id;
    if (courseId) router.push({ pathname: "/course/[courseId]", params: { courseId } });
  };
  const startLesson = () => {
    if (courseComplete) router.push("/(tabs)/practice");
    else if (nextLesson) router.push({ pathname: "/lesson/[lessonId]", params: { lessonId: nextLesson.id } });
    else openCourse();
  };

  return (
    <ScreenContainer contentTopPadding={28} fixedFooter={!loading && !error && courseDetail ? <Pressable accessibilityRole="button" onPress={startLesson} style={styles.startButton}><Text style={styles.startButtonText}>{courseComplete ? "Practice what you learned" : nextLesson ? "Start next lesson" : "Explore units"}</Text></Pressable> : undefined}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Ionicons name="grid-outline" size={22} color={garden.forest} />
          <Text style={styles.brandText}>YOUR LEARNING GARDEN</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/tutor")} style={styles.floButton}>
          <Text style={styles.floText}>Flo AI</Text>
        </Pressable>
      </View>

      <Text style={styles.greeting}>Hi, {learnerName}!</Text>
      <Text style={styles.subtitle}>Let’s grow your learning habit this week.</Text>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={garden.green} size="large" />
          <Text style={styles.loadingText}>Loading your learning garden…</Text>
        </View>
      ) : error ? (
        <ContentState title="Content is unavailable" message={error} actionLabel="Try again" onAction={() => void loadData()} />
      ) : firstCourse && courseDetail ? (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel={`Open ${courseDetail.title}`} onPress={openCourse} style={styles.courseCard}>
            <View style={styles.courseCopy}>
              <Text style={styles.courseEyebrow}>{courseComplete ? `COURSE COMPLETE · ${courseDetail.level}` : currentUnit ? `UNIT ${String(currentUnit.order).padStart(2, "0")} · ${courseDetail.level}` : `${courseDetail.language} · ${courseDetail.level}`}</Text>
              <Text style={styles.courseTitle}>{currentUnit?.title ?? courseDetail.title}</Text>
            </View>
            <Image source={require("../../assets/profile-sprout.png")} style={styles.mascot} resizeMode="contain" accessibilityLabel="Flo, the Fluora garden mascot" />
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${currentUnit?.lessons.length ? Math.min(100, Math.round((completedInUnit / currentUnit.lessons.length) * 100)) : 0}%` }]} /></View>
            <Text style={styles.progressCaption}>
              {currentUnit ? `${completedInUnit} of ${currentUnit.lessons.length} lessons complete` : `${courseDetail.units.length} units · ${courseDetail.units.reduce((sum, unit) => sum + unit.lessons.length, 0)} lessons`}
            </Text>
          </Pressable>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statPeach]}><Text style={styles.statValue}>{homeSummary?.streak ?? 0}</Text><Text style={styles.statLabel}>streak</Text></View>
            <View style={[styles.statCard, styles.statBlue]}><Text style={styles.statValue}>{homeSummary?.wallet.gems ?? 0}</Text><Text style={styles.statLabel}>gems</Text></View>
            <View style={[styles.statCard, styles.statMint]}><Text style={styles.statValue}>{homeSummary?.progress.xp ?? 0}</Text><Text style={styles.statLabel}>XP</Text></View>
          </View>

          <Text style={styles.sectionTitle}>{courseComplete ? "Review your lessons" : "Your next little steps"}</Text>
          <View style={styles.steps}>
            {(currentUnit?.lessons ?? []).slice(0, 3).map((lesson, index) => {
              const complete = completedIds.has(lesson.id);
              const active = lesson.id === nextLesson?.id;
              return (
                <Pressable key={lesson.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/lesson/[lessonId]", params: { lessonId: lesson.id } })} style={styles.stepRow}>
                  <View style={[styles.stepMarker, complete && styles.stepComplete, active && styles.stepActive]}>
                    <Text style={[styles.stepNumber, (complete || active) && styles.stepNumberActive]}>{complete ? "✓" : String(index + 1)}</Text>
                  </View>
                  <Text style={styles.stepLabel}>{lesson.title}</Text>
                </Pressable>
              );
            })}
            {(currentUnit?.lessons.length ?? 0) < 3 && <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/practice")} style={styles.stepRow}>
              <View style={styles.stepMarker}><Text style={styles.stepNumber}>{(currentUnit?.lessons.length ?? 0) + 1}</Text></View>
              <Text style={styles.stepLabel}>Practice</Text>
            </Pressable>}
          </View>

          <View style={styles.secondaryActions}>
            <SecondaryAction label="Find a lesson" onPress={() => router.push("/lessons/search")} />
            <SecondaryAction label="Compare learning paths" onPress={() => router.push("/learning-paths")} />
            <SecondaryAction label="Study planner" onPress={() => router.push("/planner")} />
            <SecondaryAction label="Mission passport" onPress={() => router.push("/missions/passport")} />
            <SecondaryAction label="Learning insights" onPress={() => router.push("/learning/insights")} />
            {courses.filter(course => course.id !== courseDetail.id).map((course) => <SecondaryAction key={course.id} label={course.title} onPress={() => router.push({ pathname: "/course/[courseId]", params: { courseId: course.id } })} />)}
          </View>
        </>
      ) : (
        <ContentState title="No courses yet" message="Published courses will appear here when they are available." />
      )}
    </ScreenContainer>
  );
}

function SecondaryAction({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>{label}</Text><Ionicons name="chevron-forward" size={16} color={garden.forest} /></Pressable>;
}

const styles = StyleSheet.create({
  topBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  brand: { alignItems: "center", flexDirection: "row", gap: 8 },
  brandText: { color: garden.muted, fontFamily: font.bold, fontSize: 10, lineHeight: 15 },
  floButton: { alignItems: "center", backgroundColor: garden.mint, borderRadius: 14, justifyContent: "center", minWidth: 74, paddingHorizontal: 14, paddingVertical: 7 },
  floText: { color: garden.forest, fontFamily: font.bold, fontSize: 12, lineHeight: 18 },
  greeting: { color: garden.ink, fontFamily: font.heavy, fontSize: 30, lineHeight: 38 },
  subtitle: { color: garden.muted, fontFamily: font.body, fontSize: 14, lineHeight: 22, marginTop: 14, marginBottom: 12 },
  courseCard: { backgroundColor: garden.mint, borderColor: garden.line, borderRadius: 20, borderWidth: 1, minHeight: 176, marginBottom: 12, overflow: "hidden", padding: 20, position: "relative" },
  courseCopy: { maxWidth: "68%", minHeight: 88 },
  courseEyebrow: { color: garden.forest, fontFamily: font.bold, fontSize: 12, lineHeight: 18 },
  courseTitle: { color: garden.ink, fontFamily: font.heavy, fontSize: 24, lineHeight: 30, marginTop: 4 },
  mascot: { height: 103, position: "absolute", right: 7, top: 20, width: 108 },
  progressTrack: { backgroundColor: "#ffffff", borderRadius: 4, height: 7, marginTop: 12, overflow: "hidden" },
  progressFill: { backgroundColor: garden.green, borderRadius: 4, height: 7 },
  progressCaption: { color: garden.forest, fontFamily: font.bold, fontSize: 12, lineHeight: 16, marginTop: 8 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 17 },
  statCard: { alignItems: "center", borderRadius: 18, flex: 1, minHeight: 66, paddingVertical: 8, justifyContent: "center" },
  statPeach: { backgroundColor: "#FFF0EF" },
  statBlue: { backgroundColor: garden.blue },
  statMint: { backgroundColor: "#FFFFFF" },
  statValue: { color: garden.forest, fontFamily: font.heavy, fontSize: 24, lineHeight: 29 },
  statLabel: { color: garden.muted, fontFamily: font.bold, fontSize: 11, lineHeight: 16 },
  sectionTitle: { color: garden.ink, fontFamily: font.bold, fontSize: 18, lineHeight: 23, marginBottom: 8 },
  steps: { gap: 6, marginBottom: 10 },
  stepRow: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 48 },
  stepMarker: { alignItems: "center", backgroundColor: garden.mint, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  stepActive: { backgroundColor: garden.green },
  stepComplete: { backgroundColor: garden.green },
  stepNumber: { color: garden.muted, fontFamily: font.heavy, fontSize: 15, lineHeight: 21 },
  stepNumberActive: { color: garden.ink },
  stepLabel: { color: garden.ink, flex: 1, fontFamily: font.bold, fontSize: 14, lineHeight: 20 },
  startButton: { alignItems: "center", backgroundColor: garden.green, borderRadius: 16, height: 56, justifyContent: "center", marginTop: 2, shadowColor: garden.forest, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 0, elevation: 3 },
  startButtonText: { color: garden.ink, fontFamily: font.bold, fontSize: 16, lineHeight: 24 },
  secondaryActions: { gap: 4, marginTop: 18 },
  secondaryAction: { alignItems: "center", borderBottomColor: garden.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", minHeight: 48, paddingHorizontal: 4 },
  secondaryActionText: { color: garden.forest, fontFamily: font.bold, fontSize: 14, lineHeight: 20 },
  loading: { alignItems: "center", backgroundColor: garden.mint, borderRadius: 20, justifyContent: "center", minHeight: 176, padding: 24 },
  loadingText: { color: garden.muted, fontFamily: font.body, fontSize: 14, marginTop: 12 },
});
