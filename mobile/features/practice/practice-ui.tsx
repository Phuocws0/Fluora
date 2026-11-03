import type { ReactNode, RefObject } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { font, garden, GardenButton, Page } from "../profile/garden-ui";
export { font, garden, GardenButton, GardenCard, GardenSubtitle, GardenCaption } from "../profile/garden-ui";
export { ActionState, Button, Card, Copy, Editor, Empty, ResourceState, confirmAction, useAction, useResource, ui } from "../shared/feature-ui";
export type { EditorSpec } from "../shared/feature-ui";

export function PracticePage({ title, children, tab = false, action, scrollRef, onBack }: { title: string; children: ReactNode; tab?: boolean; action?: { label: string; onPress: () => void; disabled?: boolean }; scrollRef?: RefObject<ScrollView | null>; onBack?: () => void }) {
  return <Page title={title} back={!tab} showFooter={!tab} activeTab="Practice" eyebrow="PRACTICE & EXPLORE" action={action} scrollRef={scrollRef} onBack={onBack ?? (() => router.canGoBack() ? router.back() : router.replace("/(tabs)/practice"))}>{children}</Page>;
}
export function PracticeGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={garden.forest} />;
  if (!isAuthenticated) return <PracticePage title="Your practice space"><Text style={s.body}>Sign in to manage your vocabulary, review and downloads.</Text><GardenButton label="Sign in" onPress={() => router.push("/(auth)/login")} /></PracticePage>;
  return <>{children}</>;
}
export function Section({ children }: { children: ReactNode }) { return <Text style={s.section}>{children}</Text>; }
export function Field({ label, value, onChange, multiline, maxLength, editable = true }: { label: string; value: string; onChange: (text: string) => void; multiline?: boolean; maxLength?: number; editable?: boolean }) {
  return <View style={{ marginVertical: 8 }}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} style={[s.input, multiline && { minHeight: 110, textAlignVertical: "top" }]} value={value} onChangeText={onChange} multiline={multiline} maxLength={maxLength} editable={editable} autoCapitalize="none" /></View>;
}
export function Choice({ value, options, onChange, disabled = false }: { value: string; options: Array<{ id: string; label: string }>; onChange: (id: string) => void; disabled?: boolean }) {
  return <View style={s.wrap}>{options.map(option => <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ selected: option.id === value, disabled }} disabled={disabled} style={[s.chip, option.id === value && { backgroundColor: garden.mint, borderColor: garden.forest }]} onPress={() => onChange(option.id)}><Text style={s.label}>{option.label}</Text></Pressable>)}</View>;
}
export function LinkCard({ title, detail, onPress, blue = false }: { title: string; detail?: string; onPress: () => void; blue?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[s.linkCard, blue && { backgroundColor: garden.blue }]}><Text style={s.cardTitle}>{title}</Text>{detail && <Text style={s.caption}>{detail}</Text>}</Pressable>;
}
export const s = StyleSheet.create({
  body: { color: garden.ink, fontFamily: font.body, fontSize: 16, lineHeight: 25, marginVertical: 8 },
  caption: { color: garden.muted, fontFamily: font.bold, fontSize: 12, lineHeight: 19, marginTop: 5 },
  label: { color: garden.forest, fontFamily: font.bold, fontSize: 14, lineHeight: 21 },
  section: { color: garden.muted, fontFamily: font.bold, fontSize: 12, marginTop: 22, marginBottom: 10 },
  input: { minHeight: 50, color: garden.ink, borderWidth: 1, borderColor: garden.line, borderRadius: 16, padding: 14, fontFamily: font.body, fontSize: 16, marginTop: 6, backgroundColor: "white" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 10 },
  chip: { borderWidth: 1, borderColor: garden.line, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9 },
  linkCard: { backgroundColor: "#F7FAF6", borderRadius: 18, padding: 16, marginVertical: 5, minHeight: 75 },
  cardTitle: { color: garden.forest, fontFamily: font.bold, fontSize: 16, lineHeight: 23 },
  error: { color: "#a82c20", backgroundColor: "#fff0ed", padding: 12, borderRadius: 12, marginVertical: 8 },
});
