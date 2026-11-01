import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ContentState } from "../../components/ContentState";
import { LearningCard } from "../../components/LearningCard";
import { ScreenContainer } from "../../components/ScreenContainer";
import { SectionTitle } from "../../components/SectionTitle";
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

  return (
    <ScreenContainer>
      <ResourceStatus loading={loading} error={error} refresh={() => void refresh()} />
      {course ? (
        <>
          <DetailHeader eyebrow={`${course.language} · ${course.level}`} title={course.title} description={course.description} />
          <View style={styles.metricRow}>
            <Text style={styles.metric}>{course.units.length} units</Text>
            <Text style={styles.metric}>{course.units.reduce((count, unit) => count + (unit.lessons?.length ?? 0), 0)} lessons</Text>
          </View>
          <SectionTitle>Course syllabus</SectionTitle>
          {course.units.map((unit) => (
            <LearningCard
              key={unit.id}
              title={unit.title}
              subtitle={`Unit ${unit.order}`}
              description={unit.description}
              detail={`${unit.lessons?.length ?? 0} lessons`}
              onPress={() => router.push({ pathname: "/unit/[unitId]", params: { unitId: unit.id } })}
            />
          ))}
          {course.learningPaths.length > 0 ? (
            <>
              <SectionTitle>Learning paths</SectionTitle>
              {course.learningPaths.map((path) => (
                <LearningCard
                  key={path.id}
                  title={path.title}
                  subtitle="Career syllabus"
                  onPress={() => router.push("/learning-paths")}
                />
              ))}
            </>
          ) : null}
        </>
      ) : !loading && !error ? (
        <ContentState title="Course not found" message="This course may have been removed or is no longer published." />
      ) : null}
    </ScreenContainer>
  );
}

export function UnitScreen() {
  const { unitId = "" } = useLocalSearchParams<{ unitId: string }>();
  const router = useRouter();
  const { data: unit, loading, error, refresh } = useLearningResource(unitId, getUnit);

  return (
    <ScreenContainer>
      <ResourceStatus loading={loading} error={error} refresh={() => void refresh()} />
      {unit ? (
        <>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/course/[courseId]", params: { courseId: unit.course.id } })}>
            <Text style={styles.breadcrumb}>{unit.course.title}  ›</Text>
          </Pressable>
          <DetailHeader eyebrow={`Unit ${unit.order}`} title={unit.title} description={unit.description} />
          <SectionTitle>Lessons in this unit</SectionTitle>
          {unit.lessons.map((lesson) => (
            <LearningCard
              key={lesson.id}
              title={lesson.title}
              subtitle={`${lesson.skill} · ${lesson.level}`}
              description={lesson.description}
              detail={`${lesson.durationMinutes} min`}
              onPress={() => router.push({ pathname: "/lesson/[lessonId]", params: { lessonId: lesson.id } })}
            />
          ))}
          {unit.lessons.length === 0 ? <ContentState title="No lessons yet" message="Lessons for this unit will appear here." /> : null}
        </>
      ) : !loading && !error ? (
        <ContentState title="Unit not found" message="This unit may have been removed or is no longer published." />
      ) : null}
    </ScreenContainer>
  );
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
  backText: { color: "#236c19", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#236c19", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  title: { color: "#20352b", fontSize: 28, fontWeight: "900", lineHeight: 36, marginTop: 7 },
  description: { color: "#65766c", fontSize: 14, lineHeight: 21, marginTop: 10 },
  breadcrumb: { color: "#236c19", fontSize: 13, fontWeight: "700", marginBottom: 16 },
  metricRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  metric: { backgroundColor: "#eaf8de", borderRadius: 12, color: "#236c19", fontSize: 12, fontWeight: "800", overflow: "hidden", paddingHorizontal: 14, paddingVertical: 9 },
  loading: { alignItems: "center", backgroundColor: "#f5f8f4", borderRadius: 18, marginTop: 18, padding: 28 },
  loadingText: { color: "#65766c", fontSize: 14, marginTop: 10 },
  exerciseCard: { backgroundColor: "#f5f8f4", borderRadius: 18, marginBottom: 12, padding: 16 },
  exerciseTitle: { color: "#20352b", fontSize: 16, fontWeight: "700", lineHeight: 23, marginTop: 7 },
});
