import { useCallback, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { practiceApi } from "./practice.service";
import type { ReviewItem } from "./practice.types";
import { Flashcards } from "./VocabularyScreens";
import { ActionState, Button, Card, Choice, Editor, Empty, GardenSubtitle, PracticePage, ResourceState, confirmAction, s, useAction, useResource } from "./practice-ui";
import type { EditorSpec } from "./practice-ui";
import { formatUiDate, LocalizedText as Text, useAppLanguage } from "../i18n/i18n";

export function ReviewScreen() {
  const { language } = useAppLanguage();
  const [kind, setKind] = useState("all"), [studying, setStudying] = useState(false), [schedule, setSchedule] = useState("due");
  const resource = useResource(useCallback(() => practiceApi.reviews(kind === "all" ? undefined : kind, schedule === "all"), [kind, schedule]));
  const action = useAction(), [editor, setEditor] = useState<EditorSpec | null>(null);
  const edit = (item?: ReviewItem) => setEditor({ title: item ? "Edit personal review item" : "Add personal review item", fields: [{ key: "front", label: "Prompt", value: item?.front, required: true, max: 300 }, { key: "back", label: "Answer / explanation", value: item?.back, required: true, max: 1000, multiline: true }], save: async v => { if (item) await practiceApi.updateReview(item.id, v.front, v.back); else await practiceApi.createReview(v.front, v.back); await resource.refresh(); } });
  return <PracticePage title="A little recall, every day" action={{ label: schedule === "due" ? "Review due items" : "Practice scheduled items", onPress: () => setStudying(true), disabled: !resource.data?.length }}>
    <GardenSubtitle>Personal items are editable. Mistakes come from your answer history; dismissing them never edits submitted answers.</GardenSubtitle>
    <Choice value={kind} options={[{ id: "all", label: "All types" }, { id: "custom", label: "My cards" }, { id: "mistake", label: "Mistakes" }]} onChange={setKind} />
    <Choice value={schedule} options={[{ id: "due", label: "Due now" }, { id: "all", label: "All scheduled items" }]} onChange={setSchedule} />
    <Button label="Add personal item" onPress={() => edit()} />
    <Button label="View / restore dismissed mistake patterns" onPress={() => router.push("/learning/insights")} />
    <ResourceState resource={resource} /><ActionState action={action} />
    {resource.data?.length === 0 && <Empty text="Nothing is due. Remembered items return in 24 hours; missed items return in 10 minutes." />}
    {resource.data?.map(item => <Card key={item.id}><Text style={s.cardTitle} translate={false}>{item.front}</Text><Text style={s.caption}>{item.kind === "mistake" ? `Derived mistake · ${item.mistakeCount ?? 0} errors` : "Personal review item"} · Due {formatUiDate(item.nextReviewAt, language, { dateStyle: "medium", timeStyle: "short" })}</Text>
      <View style={s.wrap}>{item.kind === "custom" && <Button label="Edit" onPress={() => edit(item)} />}<Button label={item.kind === "mistake" ? "Dismiss" : "Delete"} danger disabled={action.busy} onPress={() => confirmAction(item.kind === "mistake" ? "Dismiss this mistake?" : "Delete review item?", item.kind === "mistake" ? "Your original answers remain unchanged. Restore it from Learning Insights." : "This removes your personal review item and its schedule.", () => void action.run(async () => { await practiceApi.deleteReview(item.id); await resource.refresh(); }, "Review queue updated."))} /></View>
    </Card>)}
    <Editor spec={editor} close={() => setEditor(null)} />
    {studying && <Flashcards cards={resource.data ?? []} onRate={async (id, correct) => { await practiceApi.answerReview(id, correct); }} close={() => { setStudying(false); void resource.refresh(); }} />}
  </PracticePage>;
}
