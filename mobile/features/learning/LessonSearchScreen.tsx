import { LearningText as Text } from "../../components/LearningText";
import { LearningTextInput as TextInput } from "../../components/LearningText";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { ContentState } from "../../components/ContentState";
import { LearningCard } from "../../components/LearningCard";
import { ScreenContainer } from "../../components/ScreenContainer";
import { searchLessons } from "./learning.service";
import type { LessonSummary } from "../../types/learning";
import { LocalizedPressable as Pressable } from "../i18n/i18n";

const levels = ["", "A1", "A2"];
const skills = ["", "speaking", "listening", "reading", "writing"];
const durations = ["", "10", "15", "20"];

export function LessonSearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [level, setLevel] = useState("");
  const [skill, setSkill] = useState("");
  const [minutes, setMinutes] = useState("");
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchKey, setSearchKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void searchLessons({ query: submittedQuery, level, skill, minutes })
      .then((result) => { if (active) setLessons(result); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not search lessons.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [level, minutes, searchKey, skill, submittedQuery]);

  const submitSearch = () => {
    setSubmittedQuery(query);
    setSearchKey((value) => value + 1);
  };

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>LEARNING LIBRARY</Text>
      <Text style={styles.title}>Find a lesson</Text>
      <Text style={styles.subtitle}>Search and filter the lessons in your courses.</Text>
      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Search lessons"
          autoCapitalize="none"
          onChangeText={setQuery}
          onSubmitEditing={submitSearch}
          placeholder="Search lessons"
          returnKeyType="search"
          style={styles.input}
          value={query}
        />
        <Pressable accessibilityRole="button" onPress={submitSearch} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>

      <Text style={styles.filterLabel}>Level</Text>
      <ChipRow values={levels} selected={level} onSelect={setLevel} />
      <Text style={styles.filterLabel}>Skill</Text>
      <ChipRow values={skills} selected={skill} onSelect={setSkill} />
      <Text style={styles.filterLabel}>Up to</Text>
      <ChipRow values={durations} selected={minutes} onSelect={setMinutes} suffix=" min" />

      {loading ? (
        <View style={styles.loading}><ActivityIndicator color="#58cc02" /><Text style={styles.loadingText}>Searching lessons…</Text></View>
      ) : error ? (
        <ContentState title="Search is unavailable" message={error} actionLabel="Try again" onAction={submitSearch} />
      ) : lessons.length === 0 ? (
        <ContentState title="No lessons found" message="Try another word or clear one of the filters." />
      ) : (
        <>
          <Text style={styles.resultCount}>{lessons.length} lessons</Text>
          {lessons.map((lesson) => (
            <LearningCard
              key={lesson.id}
              translateContent={false}
              title={lesson.title}
              subtitle={`${lesson.skill} · ${lesson.level}`}
              description={`${lesson.unit.title} · ${lesson.unit.course.title}`}
              detail={`${lesson.durationMinutes} min`}
              onPress={() => router.push({ pathname: "/lesson/[lessonId]", params: { lessonId: lesson.id } })}
            />
          ))}
        </>
      )}
    </ScreenContainer>
  );
}

function ChipRow({ values, selected, onSelect, suffix = "" }: { values: string[]; selected: string; onSelect: (value: string) => void; suffix?: string }) {
  return (
    <ScrollView horizontal contentContainerStyle={styles.chipRow} showsHorizontalScrollIndicator={false}>
      {values.map((value) => {
        const label = value ? `${value}${suffix}` : "Any";
        const active = selected === value;
        return (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} key={value || "any"} onPress={() => onSelect(value)} style={[styles.chip, active && styles.chipSelected]}>
            <Text style={[styles.chipText, active && styles.chipTextSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: "Nunito_800ExtraBold", color: "#236c19", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  title: { fontFamily: "Nunito_800ExtraBold", color: "#20352b", fontSize: 28, fontWeight: "900", marginTop: 7 },
  subtitle: { fontFamily: "Nunito_400Regular", color: "#65766c", fontSize: 14, lineHeight: 21, marginBottom: 20, marginTop: 7 },
  searchRow: { flexDirection: "row", gap: 8 },
  input: { backgroundColor: "#f5f8f4", borderColor: "#dee8d9", borderRadius: 14, borderWidth: 1, color: "#20352b", flex: 1, minHeight: 48, paddingHorizontal: 14 },
  searchButton: { alignItems: "center", backgroundColor: "#58cc02", borderRadius: 14, justifyContent: "center", paddingHorizontal: 15 },
  searchButtonText: { fontFamily: "Nunito_800ExtraBold", color: "#20352b", fontSize: 13, fontWeight: "800" },
  filterLabel: { fontFamily: "Nunito_800ExtraBold", color: "#20352b", fontSize: 13, fontWeight: "800", marginTop: 17 },
  chipRow: { gap: 8, paddingVertical: 8 },
  chip: { backgroundColor: "#f5f8f4", borderColor: "#dee8d9", borderRadius: 14, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 },
  chipSelected: { backgroundColor: "#eaf8de", borderColor: "#58cc02" },
  chipText: { fontFamily: "Nunito_700Bold", color: "#65766c", fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  chipTextSelected: { color: "#236c19" },
  loading: { alignItems: "center", backgroundColor: "#f5f8f4", borderRadius: 18, marginTop: 18, padding: 24 },
  loadingText: { fontFamily: "Nunito_400Regular", color: "#65766c", fontSize: 14, marginTop: 10 },
  resultCount: { fontFamily: "Nunito_700Bold", color: "#65766c", fontSize: 12, fontWeight: "700", marginBottom: 12, marginTop: 24 },
});
