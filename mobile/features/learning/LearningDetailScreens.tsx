import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { ContentState } from "../../components/ContentState";
import { LearningCard } from "../../components/LearningCard";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SectionTitle } from "../../components/SectionTitle";
import { font, garden, GardenSubtitle, Page } from "../profile/garden-ui";
import { getCourse, getLesson, getUnit } from "./learning.service";
import { useLearningResource } from "./useLearningResource";

function DetailHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string | null }) {
  const router = useRouter();
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>‹  Back</Text>
      </Pressable>
      <Text style={styles.eyebrow}>{eyebrow.toLocaleUpperCase()}</Text>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </>
  );
}

function ResourceStatus({ loading, error, refresh }: { loading: boolean; error: string | null; refresh: () => void }) {
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#58cc02" />
        <Text style={styles.loadingText}>Loading learning content…</Text>
      </View>
    );
  }
  if (error) return <ContentState title="Content is unavailable" message={error} actionLabel="Try again" onAction={refresh} />;
  return null;
}

export function CourseScreen() {
  const { courseId = "" } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const { data: course, loading, error, refresh } = useLearningResource(courseId, getCourse);

  const lessonCount = course?.units.reduce((count, unit) => count + unit.lessons.length, 0) ?? 0;
  return <Page title={course?.title ?? "Course"} eyebrow="LEARN EVERY DAY" activeTab="Learn"
    action={course ? { label: "Explore units", onPress: () => router.push({ pathname: "/course/[courseId]/units", params: { courseId: course.id } }) } : undefined}>
    <ResourceStatus loading={loading} error={error} refresh={() => void refresh()} />
    {course ? <>
      <View style={styles.courseSubtitleGap}><GardenSubtitle compact numberOfLines={2}>{course.description || "From your first hello to confident conversations."}</GardenSubtitle></View>
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/course/[courseId]/units", params: { courseId: course.id } })} style={styles.courseHero}>
        <View style={styles.courseCopy}>
          <Text style={styles.courseEyebrow}>{course.language.toLocaleUpperCase()} · {course.level}</Text>
          <Text numberOfLines={2} style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.courseMeta}>{lessonCount} lessons · {course.units.length} units</Text>
          <Text style={styles.courseAvailability}>Free · Offline ready</Text>
        </View>
        <Image source={require("../../assets/profile-sprout.png")} style={styles.courseMascot} resizeMode="contain" accessibilityLabel="Flo, the Fluora garden mascot" />
      </Pressable>
      <Text style={styles.outcomesLabel}>WHAT YOU WILL BE ABLE TO DO</Text>
      <View style={styles.outcomeRow}>
        <View style={[styles.outcomeCard, styles.outcomeBlue]}><Text style={styles.outcomeTitle}>Speak</Text><Text style={styles.outcomeCopy}>Introduce yourself</Text></View>
        <View style={[styles.outcomeCard, styles.outcomeMint]}><Text style={styles.outcomeTitle}>Understand</Text><Text style={styles.outcomeCopy}>Follow daily exchanges</Text></View>
      </View>
      <Text style={styles.roadmapTitle}>Course roadmap</Text>
      <View style={styles.levelTrack}><View style={styles.levelProgress} /></View>
      <View style={styles.levelLabels}>{["A1", "A2", "B1", "B2"].map((level) => <Text key={level} style={styles.levelLabel}>{level}</Text>)}</View>
    </> : !loading && !error ? <ContentState title="Course not found" message="This course may have been removed or is no longer published." /> : null}
  </Page>;
}

export function CourseUnitCatalogScreen() {
  const { courseId = "" } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const { data: course, loading, error, refresh } = useLearningResource(courseId, getCourse);
  const firstUnit = course?.units[0];
  return <Page title="Your learning path" eyebrow="LEARN EVERY DAY" activeTab="Learn"
    action={firstUnit ? { label: `Open unit ${firstUnit.order}`, onPress: () => router.push({ pathname: "/unit/[unitId]", params: { unitId: firstUnit.id } }) } : undefined}>
    <ResourceStatus loading={loading} error={error} refresh={() => void refresh()} />
    {course ? <>
      <GardenSubtitle>Start small and grow one step at a time.</GardenSubtitle>
      {course.units.length > 0 && <View style={[styles.pathList, { height: course.units.length * 92 }]}>
        {course.units.slice(0, -1).map((unit, index) => {
          const centers = [0.5, 0.7, 0.33, 0.42];
          const innerWidth = screenWidth - 48;
          const segments = bezierSegments(
            innerWidth * centers[index % centers.length],
            index * 92 + 28,
            innerWidth * centers[(index + 1) % centers.length],
            (index + 1) * 92 + 28,
            innerWidth,
            index % 2 === 0 ? 1 : -1,
          );
          return <View key={"path-" + unit.id} pointerEvents="none">{segments.map((segment, segmentIndex) => <View key={segmentIndex} style={[styles.pathConnector, segment]} />)}</View>;
        })}
        {course.units.map((unit, index) => {
          const centers = [0.5, 0.7, 0.33, 0.42];
          const center = (screenWidth - 48) * centers[index % centers.length];
          const active = index === 0;
          return <Pressable key={unit.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/unit/[unitId]", params: { unitId: unit.id } })} style={[styles.pathRow, { top: index * 92 }]}>
            <View style={[styles.pathNode, active && styles.pathNodeActive, { left: center - 28 }]}><Text style={[styles.pathNumber, active && styles.pathNumberActive]}>{String(unit.order).padStart(2, "0")}</Text></View>
            <Text numberOfLines={2} style={styles.pathTitle}>{unit.title}</Text>
          </Pressable>;
        })}
      </View>}
      {!!firstUnit && <Text style={styles.pathSummary}>{firstUnit.lessons.length} lessons · Continue your first unit</Text>}
      {!course.units.length && <ContentState title="No units yet" message="Units for this course will appear here when they are available." />}
    </> : !loading && !error ? <ContentState title="Course not found" message="This course may have been removed or is no longer published." /> : null}
  </Page>;
}

export function UnitScreen() {
  const { unitId = "" } = useLocalSearchParams<{ unitId: string }>();
  const router = useRouter();
  const { data: unit, loading, error, refresh } = useLearningResource(unitId, getUnit);

  const firstLesson = unit?.lessons[0];
  const secondLesson = unit?.lessons[1];
  const thirdLesson = unit?.lessons[2];
  return <Page title={unit?.title ?? "Unit"} eyebrow="LEARN EVERY DAY" activeTab="Learn"
    action={firstLesson ? { label: "Start lesson 1", onPress: () => router.push({ pathname: "/lesson/[lessonId]", params: { lessonId: firstLesson.id } }) } : undefined}>
    <ResourceStatus loading={loading} error={error} refresh={() => void refresh()} />
    {unit ? <>
      <Text style={styles.unitKicker}>UNIT {String(unit.order).padStart(2, "0")} · BEGINNER {firstLesson?.level ?? "A1"}</Text>
      <Text style={styles.unitMeta}>{unit.lessons.reduce((sum, lesson) => sum + lesson.durationMinutes, 0)} min · {unit.lessons.length} lessons</Text>
      <View style={styles.lessonCards}>
        {firstLesson && <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/lesson/[lessonId]", params: { lessonId: firstLesson.id } })} style={[styles.lessonCard, styles.lessonCardFeatured]}>
          <Text style={styles.lessonCardTitle}>01 / {capitalize(firstLesson.skill)}</Text><Text style={styles.lessonCardDescription}>{firstLesson.title}</Text>
          <View style={styles.lessonProgressTrack}><View style={styles.lessonProgressFill} /></View>
        </Pressable>}
        {[secondLesson, thirdLesson].filter((lesson) => lesson !== undefined).map((lesson, index) => <Pressable key={lesson.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/lesson/[lessonId]", params: { lessonId: lesson.id } })} style={[styles.lessonCard, styles.lessonCardSmall, unit.lessons.length === 2 && styles.lessonCardSingle, index === 1 && styles.lessonCardPlain]}>
          <Text style={styles.lessonCardTitle}>{String(index + 2).padStart(2, "0")} / {capitalize(lesson.skill)}</Text><Text style={styles.lessonCardDescription}>{lesson.title}</Text>
        </Pressable>)}
      </View>
      {!!unit.lessons.length && <View style={styles.unitWordsSection}>
        <Text style={styles.unitWordsHeading}>WORDS YOU WILL USE</Text>
        <View style={styles.unitWordsGrid}>{unit.lessons.flatMap((lesson) => lesson.title.toLowerCase().split(/[^a-z]+/)).filter((word) => word.length > 3).slice(0, 4).map((word, index) => <Text key={word + "-" + index} style={styles.unitWord}>{word}</Text>)}</View>
      </View>}
      {unit.lessons.length > 3 && <View style={styles.remainingLessons}><SectionTitle>More lessons</SectionTitle>{unit.lessons.slice(3).map((lesson) => <LearningCard key={lesson.id} title={lesson.title} subtitle={`${lesson.skill} · ${lesson.level}`} detail={`${lesson.durationMinutes} min`} onPress={() => router.push({ pathname: "/lesson/[lessonId]", params: { lessonId: lesson.id } })} />)}</View>}
      {!unit.lessons.length && <ContentState title="No lessons yet" message="Lessons for this unit will appear here when they are available." />}
    </> : !loading && !error ? <ContentState title="Unit not found" message="This unit may have been removed or is no longer published." /> : null}
  </Page>;
}

export function LessonScreen() {
  const { lessonId = "" } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();
  const { data: lesson, loading, error, refresh } = useLearningResource(lessonId, getLesson);

  return (
    <ScreenContainer>
      <ResourceStatus loading={loading} error={error} refresh={() => void refresh()} />
      {lesson ? (
        <>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/unit/[unitId]", params: { unitId: lesson.unit.id } })}>
            <Text style={styles.breadcrumb}>{lesson.unit.title}  ›</Text>
          </Pressable>
          <DetailHeader eyebrow={`${lesson.skill} · ${lesson.level}`} title={lesson.title} description={lesson.description} />
          <Text style={styles.description}>{lesson.durationMinutes} minutes · {lesson.exercises.length} activities</Text>
          <SectionTitle>Lesson activities</SectionTitle>
          {lesson.exercises.map((exercise, index) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <Text style={styles.eyebrow}>ACTIVITY {index + 1} · {exercise.type.replaceAll("_", " ")}</Text>
              <Text style={styles.exerciseTitle}>{exercise.prompt}</Text>
              {exercise.instruction ? <Text style={styles.description}>{exercise.instruction}</Text> : null}
            </View>
          ))}
          <ContentState title="Ready to practice?" message="Activity controls and answer feedback will appear here when lesson practice is available." />
        </>
      ) : !loading && !error ? (
        <ContentState title="Lesson not found" message="This lesson may have been removed or is no longer published." />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: { alignSelf: "flex-start", marginBottom: 22, paddingVertical: 6 },
  backText: { color: garden.forest, fontFamily: font.bold, fontSize: 15, fontWeight: "700" },
  eyebrow: { color: garden.forest, fontFamily: font.bold, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  title: { color: garden.ink, fontFamily: font.heavy, fontSize: 24, fontWeight: "800", lineHeight: 32, marginTop: 7 },
  description: { color: garden.muted, fontFamily: font.body, fontSize: 14, lineHeight: 21, marginTop: 10 },
  breadcrumb: { color: garden.forest, fontFamily: font.bold, fontSize: 13, fontWeight: "700", marginBottom: 12, marginTop: 2 },
  metricRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  metric: { backgroundColor: garden.mint, borderRadius: 12, color: garden.forest, fontFamily: font.bold, fontSize: 12, fontWeight: "800", overflow: "hidden", paddingHorizontal: 14, paddingVertical: 9 },
  loading: { alignItems: "center", backgroundColor: garden.mint, borderRadius: 18, marginTop: 18, padding: 28 },
  loadingText: { color: garden.muted, fontFamily: font.body, fontSize: 14, marginTop: 10 },
  exerciseCard: { backgroundColor: garden.mint, borderRadius: 18, marginBottom: 12, padding: 16 },
  exerciseTitle: { color: garden.ink, fontFamily: font.bold, fontSize: 16, fontWeight: "700", lineHeight: 23, marginTop: 7 },
  courseHero: { backgroundColor: garden.mint, borderRadius: 20, minHeight: 174, overflow: "hidden", padding: 14, position: "relative" },
  courseCopy: { maxWidth: "76%" },
  courseEyebrow: { color: garden.forest, fontFamily: font.bold, fontSize: 11, lineHeight: 16 },
  courseTitle: { color: garden.forest, fontFamily: font.heavy, fontSize: 22, lineHeight: 28, marginTop: 3 },
  courseMeta: { color: garden.muted, fontFamily: font.bold, fontSize: 13, lineHeight: 19, marginTop: 4 },
  courseAvailability: { color: garden.muted, fontFamily: font.bold, fontSize: 11, lineHeight: 16, marginTop: 4 },
  courseMascot: { height: 88, position: "absolute", right: 13, top: 56, width: 92 },
  outcomeRow: { flexDirection: "row", gap: 12, marginTop: 0 },
  courseSubtitleGap: { marginBottom: 5 },
  outcomesLabel: { color: garden.muted, fontFamily: font.bold, fontSize: 12, lineHeight: 18, marginTop: 29, marginBottom: 12 },
  outcomeCard: { borderRadius: 20, flex: 1, minHeight: 96, padding: 14 },
  outcomeBlue: { backgroundColor: garden.blue },
  outcomeMint: { backgroundColor: garden.mint },
  outcomeTitle: { color: garden.forest, fontFamily: font.bold, fontSize: 15, lineHeight: 22 },
  outcomeCopy: { color: garden.muted, fontFamily: font.bold, fontSize: 11, lineHeight: 17, marginTop: 4 },
  roadmapTitle: { color: garden.ink, fontFamily: font.bold, fontSize: 17, lineHeight: 24, marginTop: 26 },
  levelTrack: { backgroundColor: garden.line, borderRadius: 5, height: 8, marginTop: 30, overflow: "hidden" },
  levelProgress: { backgroundColor: garden.green, borderRadius: 5, height: 8, width: "30%" },
  levelLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  levelLabel: { color: garden.muted, fontFamily: font.bold, fontSize: 11, lineHeight: 16 },
  pathList: { marginTop: 9, position: "relative" },
  pathConnector: { backgroundColor: garden.line, borderRadius: 5, height: 8, position: "absolute" },
  pathRow: { height: 92, left: 0, position: "absolute", right: 0, top: 0 },
  pathNode: { alignItems: "center", backgroundColor: garden.mint, borderRadius: 28, height: 56, justifyContent: "center", position: "absolute", top: 0, width: 56, zIndex: 1 },
  pathNodeActive: { backgroundColor: garden.green },
  pathNumber: { color: garden.forest, fontFamily: font.bold, fontSize: 16, lineHeight: 22 },
  pathNumberActive: { color: garden.ink },
  pathTitle: { color: garden.forest, fontFamily: font.bold, fontSize: 14, lineHeight: 20, left: 0, maxWidth: 150, position: "absolute", top: 65 },
  pathSummary: { color: garden.muted, fontFamily: font.bold, fontSize: 12, lineHeight: 18, marginTop: 2, marginBottom: 10 },
  lessonCards: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 9 },
  lessonCard: { borderRadius: 18, justifyContent: "flex-start", padding: 14 },
  lessonCardFeatured: { backgroundColor: garden.mint, height: 134, width: "100%" },
  lessonCardSmall: { backgroundColor: garden.blue, minHeight: 122, width: "48%" },
  lessonCardSingle: { width: "100%" },
  lessonCardPlain: { backgroundColor: "#ffffff" },
  lessonCardTitle: { color: garden.forest, fontFamily: font.bold, fontSize: 14, lineHeight: 20 },
  lessonCardDescription: { color: garden.muted, fontFamily: font.bold, fontSize: 12, lineHeight: 18, marginTop: 5 },
  lessonProgressTrack: { backgroundColor: garden.line, borderRadius: 4, height: 6, marginHorizontal: 4, marginTop: 18, width: "72%" },
  lessonProgressFill: { backgroundColor: garden.green, borderRadius: 4, height: 6, width: "38%" },
  unitKicker: { color: garden.muted, fontFamily: font.bold, fontSize: 12, lineHeight: 18, marginTop: 7 },
  unitMeta: { color: garden.muted, fontFamily: font.bold, fontSize: 11, lineHeight: 16, marginTop: 16, marginBottom: 12 },
  unitWordsSection: { marginTop: 40 },
  unitWordsHeading: { color: garden.muted, fontFamily: font.bold, fontSize: 11, lineHeight: 16, marginBottom: 8 },
  unitWordsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  unitWord: { backgroundColor: garden.mint, borderRadius: 18, color: garden.forest, flexBasis: "48%", fontFamily: font.bold, fontSize: 11, lineHeight: 16, overflow: "hidden", paddingHorizontal: 12, paddingVertical: 7 },
  remainingLessons: { marginTop: 14 },
});

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

function bezierSegments(x0: number, y0: number, x3: number, y3: number, width: number, side: 1 | -1) {
  const available = side === 1 ? width - Math.max(x0, x3) - 22 : Math.min(x0, x3) - 22;
  const bulge = Math.max(22, Math.min(82, available));
  const x1 = x0 + side * bulge;
  const x2 = x3 + side * Math.min(26, bulge / 2);
  const y1 = y0 + 8;
  const y2 = y3 - 8;
  const points = Array.from({ length: 17 }, (_, index) => {
    const t = index / 16;
    const inverse = 1 - t;
    return {
      x: inverse ** 3 * x0 + 3 * inverse ** 2 * t * x1 + 3 * inverse * t ** 2 * x2 + t ** 3 * x3,
      y: inverse ** 3 * y0 + 3 * inverse ** 2 * t * y1 + 3 * inverse * t ** 2 * y2 + t ** 3 * y3,
    };
  });
  const sampled = points.filter((_, index) => index % 2 === 0 || index === points.length - 1);
  return sampled.slice(1).map((point, index) => {
    const previous = sampled[index];
    const length = Math.hypot(point.x - previous.x, point.y - previous.y);
    return {
      left: (point.x + previous.x) / 2 - length / 2,
      top: (point.y + previous.y) / 2 - 4,
      width: length + 6,
      transform: [{ rotate: `${Math.atan2(point.y - previous.y, point.x - previous.x)}rad` }],
    };
  });
}
