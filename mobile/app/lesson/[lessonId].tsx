import { LessonPlayerScreen } from "../../features/learning/player/LessonPlayerScreen";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "../../features/auth/AuthContext";

export default function LessonRoute() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { user } = useAuth();
  return <LessonPlayerScreen key={`${user?.id ?? "guest"}:${lessonId}`} />;
}
