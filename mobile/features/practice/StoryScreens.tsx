import { LearningText } from "../../components/LearningText";
import { PreferenceModal as Modal } from "../../components/PreferenceModal";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { useSpeechPrompt } from "../learning/audio/useSpeechPrompt";
import { practiceApi } from "./practice.service";
import { parseReading } from "./reading";
import { DictionaryPanel } from "./DictionaryPanel";
import { isConnectionError, offlineStory } from "./downloads";
import { readDraft, writeDraft } from "./offline.storage";
import type { Bookmark, ReadingProgress } from "./practice.types";
import { ActionState, Button, Card, Choice, Editor, Empty, font, GardenSubtitle, LinkCard, PracticePage, ResourceState, Section, confirmAction, s, useAction, useResource } from "./practice-ui";
import type { EditorSpec } from "./practice-ui";
import { LocalizedPressable as Pressable, LocalizedText as Text } from "../i18n/i18n";

export function StoryLibraryScreen() {
  const resource = useResource(practiceApi.stories);
  const stories = resource.data ?? [];
  const featured = stories[0];
  const shortReads = stories.slice(1, 3);
  const openStory = (storyId: string) => router.push({ pathname: "/stories/[storyId]", params: { storyId } });
  return <PracticePage title="Learn through stories" action={featured ? { label: "Read first story", onPress: () => openStory(featured.id) } : undefined}>
    <GardenSubtitle>Read something fun. Learn language naturally.</GardenSubtitle>
    <ResourceState resource={resource} />
    {resource.data && !featured && <Empty text="No published stories are available yet." />}
    {featured && <View style={storyStyles.layout}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Featured story: ${featured.title}`} onPress={() => openStory(featured.id)} style={storyStyles.featured}>
        <Text style={storyStyles.featuredLabel}>FEATURED / {featured.kind.toUpperCase()}</Text>
        <Text numberOfLines={2} style={storyStyles.featuredTitle} translate={false}>{featured.title}</Text>
        <Text numberOfLines={1} style={storyStyles.featuredDescription}>A short {featured.kind} to practice your English.</Text>
        <Text style={storyStyles.featuredMeta}>OPEN STORY · ENGLISH</Text>
      </Pressable>
      <Text style={storyStyles.sectionTitle}>SHORT READS FOR YOUR DAY</Text>
      <View style={storyStyles.shortReads}>
        {shortReads.map((story, index) => <Pressable key={story.id} accessibilityRole="button" accessibilityLabel={`Read ${story.title}`} onPress={() => openStory(story.id)} style={[storyStyles.shortRead, index % 2 === 0 ? storyStyles.shortReadBlue : storyStyles.shortReadMint]}>
          <Text numberOfLines={2} style={storyStyles.shortReadTitle} translate={false}>{story.title}</Text>
          <Text style={storyStyles.shortReadMeta}>{story.kind.toUpperCase()} · READ</Text>
        </Pressable>)}
        {shortReads.length === 1 && <View style={storyStyles.shortReadPlaceholder} />}
      </View>
      {stories.length > 3 && <View style={storyStyles.moreStories}>
        <Section>MORE STORIES</Section>
        {stories.slice(3).map(story => <LinkCard key={story.id} title={story.title} detail={story.kind} onPress={() => openStory(story.id)} />)}
      </View>}
    </View>}
  </PracticePage>;
}

const storyStyles = StyleSheet.create({
  layout: { minHeight: 450, position: "relative", width: "100%" },
  featured: { backgroundColor: "#236c19", borderRadius: 16, height: 220, left: 0, overflow: "hidden", padding: 14, position: "absolute", top: 0, width: "100%" },
  featuredLabel: { color: "#eaf8de", fontFamily: font.bold, fontSize: 12, lineHeight: 18 },
  featuredTitle: { color: "#ffffff", fontFamily: font.heavy, fontSize: 32, lineHeight: 40, height: 80, marginTop: 6, width: 260 },
  featuredDescription: { color: "#ffffff", fontFamily: font.bold, fontSize: 15, lineHeight: 22, marginTop: 6, width: 270 },
  featuredMeta: { color: "#eaf8de", fontFamily: font.bold, fontSize: 12, lineHeight: 18, marginTop: 6 },
  sectionTitle: { color: "#65766c", fontFamily: font.bold, fontSize: 12, lineHeight: 18, left: 0, position: "absolute", top: 246, width: "100%" },
  shortReads: { flexDirection: "row", gap: 12, left: 0, position: "absolute", top: 280, width: "100%" },
  shortRead: { borderRadius: 16, height: 136, padding: 14, width: "48.25%" },
  shortReadBlue: { backgroundColor: "#eaf4ff" },
  shortReadMint: { backgroundColor: "#eaf8de" },
  shortReadTitle: { color: "#236c19", fontFamily: font.bold, fontSize: 15, lineHeight: 22 },
  shortReadMeta: { color: "#65766c", fontFamily: font.bold, fontSize: 12, lineHeight: 18, marginTop: 6 },
  shortReadPlaceholder: { flex: 1 },
  moreStories: { marginTop: 450 },
});

type LocalProgress = ReadingProgress & { dirty: boolean; reset?: boolean };
export function StoryReaderScreen() {
  const { storyId = "", offline } = useLocalSearchParams<{ storyId: string; offline?: string }>();
  const { user } = useAuth();
  return <Reader key={`${user?.id ?? "guest"}:${storyId}:${offline}`} id={storyId} forceOffline={offline === "1"} />;
}
function Reader({ id, forceOffline }: { id: string; forceOffline: boolean }) {
  const scrollRef = useRef<ScrollView>(null), paragraphOffsets = useRef<Record<number, number>>({});
  const { user, settings } = useAuth(), action = useAction(), { speak, stop, isSpeaking } = useSpeechPrompt();
  const [mode, setMode] = useState("article"), [position, setPosition] = useState(0), [progressReady, setProgressReady] = useState(false), [pending, setPending] = useState<LocalProgress | null>(null), [progressError, setProgressError] = useState("");
  const [word, setWord] = useState<string | null>(null), [selections, setSelections] = useState<Record<number, string>>({}), [evidence, setEvidence] = useState<Record<number, string>>({});
  const resource = useResource(useCallback(async () => {
    if (!forceOffline) try { return { story: await practiceApi.story(id), offline: false }; } catch (cause) { if (!isConnectionError(cause)) throw cause; }
    const story = user ? await offlineStory(user.id, id) : null;
    if (!story) throw new Error("This story is not downloaded. Connect to Fluora or download it first.");
    return { story, offline: true };
  }, [id, forceOffline, user?.id]));
  const marks = useResource(useCallback(() => user && !resource.data?.offline ? practiceApi.bookmarks() : Promise.resolve([] as Bookmark[]), [user?.id, resource.data?.offline]));
  const content = parseReading(resource.data?.story.content);
  const bookmark = marks.data?.find(m => m.targetType === "story" && m.targetId === id);
  useEffect(() => {
    if (progressReady && mode !== "comprehension") scrollRef.current?.scrollTo({ y: paragraphOffsets.current[position] ?? 0, animated: true });
  }, [position, progressReady, mode]);
  useEffect(() => {
    let alive = true;
    if (!resource.data) return;
    const loaded = resource.data;
    setMode(resource.data.story.kind === "dialogue" ? "dialogue" : "article"); setProgressReady(false);
    void (async () => {
      try {
        let progress: ReadingProgress | null = null;
        const local = user ? await readDraft(user.id, `reading-${id}`) as LocalProgress | null : null;
        if (local?.dirty || loaded.offline) { progress = local; if (alive) setPending(local?.dirty ? local : null); }
        else if (user) progress = await practiceApi.reading(id);
        if (alive) { setPosition(Math.min(Math.max(0, progress?.position ?? 0), Math.max(0, content.paragraphs.length - 1))); setProgressError(""); }
      } catch (cause) { if (alive) setProgressError(cause instanceof Error ? cause.message : "Could not restore your reading position."); }
      finally { if (alive) setProgressReady(true); }
    })();
    return () => { alive = false; };
  }, [resource.data, user?.id, id]);
  const save = (next: number, completed = false) => void action.run(async () => {
    stop();
    if (!user) { setPosition(next); return; }
    const local: LocalProgress = { position: next, completed, dirty: true };
    writeDraft(user.id, `reading-${id}`, local); setPosition(next); setPending(local);
    if (!resource.data?.offline) {
      try { await practiceApi.saveReading(id, next, completed); writeDraft(user.id, `reading-${id}`, { ...local, dirty: false }); setPending(null); }
      catch (cause) { if (!isConnectionError(cause)) throw cause; }
    }
  }, user ? "Reading position saved." : "Reading position updated for this visit.");
  const sync = () => void action.run(async () => {
    if (!user || !pending) return;
    if (pending.reset) await practiceApi.resetReading(id); else await practiceApi.saveReading(id, pending.position, pending.completed);
    writeDraft(user.id, `reading-${id}`, { ...pending, dirty: false }); setPending(null);
  }, "Reading progress synchronized.");
  const reset = () => confirmAction("Reset reading progress?", "This removes your saved position for this story.", () => void action.run(async () => {
    stop();
    setPosition(0);
    if (user) {
      const local: LocalProgress = { position: 0, completed: false, dirty: true, reset: true };
      writeDraft(user.id, `reading-${id}`, local); setPending(local);
      if (!resource.data?.offline) { await practiceApi.resetReading(id); writeDraft(user.id, `reading-${id}`, { ...local, dirty: false }); setPending(null); }
    }
    setPosition(0);
  }, "Reading position reset."));
  return <PracticePage title={resource.data?.story.title ?? "Your story"} translateTitle={!resource.data?.story.title} scrollRef={scrollRef}>
    <ResourceState resource={resource} />
    {resource.data && <>
      {resource.data.offline && <Text style={s.caption}>OFFLINE COPY · Reading progress stays on this device until you sync.</Text>}
      {progressError ? <Text style={s.error}>{progressError}</Text> : null}
      {pending && <Card><Text style={s.caption}>Reading position is saved on this device and pending sync.</Text><Button label="Sync saved position" disabled={action.busy} onPress={sync} /></Card>}
      <Choice value={mode} options={[{ id: "article", label: "Article" }, { id: "dialogue", label: "Dialogue comic" }, { id: "comprehension", label: "Check meaning" }]} onChange={v => { stop(); setMode(v); }} />
      {!content.paragraphs.length && <Empty text="This published story has no readable paragraphs." />}
      {mode !== "comprehension" && <>
        <Text style={s.caption}>Paragraph {content.paragraphs.length ? position + 1 : 0} / {content.paragraphs.length} · Tap a word to explore its meaning</Text>
        {content.paragraphs.map((paragraph, i) => <View key={i} onLayout={event => { paragraphOffsets.current[i] = event.nativeEvent.layout.y; if (progressReady && i === position) scrollRef.current?.scrollTo({ y: event.nativeEvent.layout.y, animated: false }); }} style={{ backgroundColor: mode === "dialogue" ? i % 2 ? "#EAF4FF" : "#EAF8DE" : paragraph.quote ? "#EAF8DE" : "white", borderWidth: i === position ? 1 : 0, borderColor: "#58CC02", borderRadius: 18, padding: 16, marginVertical: 7, marginLeft: mode === "dialogue" && i % 2 ? 28 : 0 }}>
          {paragraph.speaker && <Text style={s.label} translate={false}>{paragraph.speaker}</Text>}
          <LearningText style={s.body} translate={false}>{paragraph.text.split(/(\s+)/).map((token, index) => <Text key={index} onPress={token.trim() ? () => setWord(token.replace(/[^\p{L}'-]/gu, "").toLowerCase()) : undefined}>{token}</Text>)}</LearningText>
          <Button label={isSpeaking && i === position ? "Stop reading aloud" : "Read aloud"} onPress={() => { setPosition(i); if (isSpeaking) stop(); else speak(paragraph.text); }} />
        </View>)}
        <View style={s.wrap}><Button label="Previous" disabled={!progressReady || action.busy || position === 0} onPress={() => save(position - 1)} /><Button label="Next / save position" disabled={!progressReady || action.busy || position >= content.paragraphs.length - 1} onPress={() => save(position + 1)} /><Button label="Mark read" disabled={!progressReady || action.busy || !content.paragraphs.length} onPress={() => save(Math.max(0, content.paragraphs.length - 1), true)} /></View>
      </>}
      {mode === "comprehension" && <>
        <GardenSubtitle>Follow the story → choose your response → open the graded lesson challenge. These reflection choices are not automatically graded.</GardenSubtitle>
        {content.questions.map((question, i) => <Card key={i}><Text style={s.cardTitle} translate={false}>{question.question}</Text><View style={{ height: 24, width: 2, alignSelf: "center", backgroundColor: "#236c19" }} /><Choice value={selections[i] ?? ""} options={question.options.map(o => ({ id: o, label: o, translate: false }))} onChange={v => setSelections(s => ({ ...s, [i]: v }))} />{selections[i] && <><Text style={s.label}>Find the sentence that proves your choice</Text><Choice value={evidence[i] ?? ""} options={content.paragraphs.map((p, index) => ({ id: String(index), label: p.text, translate: false }))} onChange={v => setEvidence(e => ({ ...e, [i]: v }))} />{evidence[i] !== undefined && <Text style={s.caption}>You linked “{selections[i]}” to paragraph {Number(evidence[i]) + 1}. Reread it to check your reasoning.</Text>}</>}</Card>)}
        {!content.questions.length && <Empty text="No comprehension prompts are published for this story." />}
        {content.challenge && <Button primary label="Open graded challenge in lesson player" onPress={() => { stop(); router.push({ pathname: "/lesson/[lessonId]", params: { lessonId: content.challenge!.lessonId } }); }} />}
      </>}
      {user && <><ResourceState resource={marks} /><Button label={bookmark ? "Remove story bookmark" : "Save story bookmark"} disabled={action.busy || marks.loading || Boolean(marks.error) || resource.data.offline} onPress={() => void action.run(async () => { if (bookmark) await practiceApi.removeBookmark(bookmark.id); else await practiceApi.bookmark("story", id); await marks.refresh(); }, "Bookmarks updated.")} /></>}
      <Button label="Reset reading position" disabled={action.busy} danger onPress={reset} />
      <ActionState action={action} />
    </>}
    {word !== null && <Modal visible animationType="slide" onRequestClose={() => setWord(null)}><PracticePage title="A word in context" onBack={() => setWord(null)}><Button label="Back to reading" onPress={() => setWord(null)} /><DictionaryPanel initialWord={word} /></PracticePage></Modal>}
  </PracticePage>;
}

export function BookmarkShelfScreen() {
  const resource = useResource(practiceApi.bookmarks), stories = useResource(practiceApi.stories), action = useAction();
  const [filter, setFilter] = useState("all"), [editor, setEditor] = useState<EditorSpec | null>(null), [word, setWord] = useState<string | null>(null);
  const edit = (bookmark: Bookmark) => setEditor({ title: "Edit bookmark", fields: [{ key: "note", label: "Note", value: bookmark.note ?? "", max: 1000, multiline: true }, { key: "tag", label: "Tag", value: bookmark.tag ?? "", max: 100 }], save: async v => { await practiceApi.editBookmark(bookmark.id, v.note || null, v.tag || null); await resource.refresh(); } });
  const visible = resource.data?.filter(mark => filter === "all" || mark.targetType === filter) ?? [];
  return <PracticePage title="Your reading shelf"><GardenSubtitle>Saved stories and words, with your own notes and tags.</GardenSubtitle><Choice value={filter} options={[{ id: "all", label: "All" }, { id: "story", label: "Stories" }, { id: "word", label: "Words" }]} onChange={setFilter} /><ResourceState resource={resource} /><ActionState action={action} />
    {resource.data && !visible.length && <Empty text="Save a story or a dictionary word to see it here." />}
    {visible.map(mark => <Card key={mark.id}><LinkCard title={mark.targetType === "story" ? stories.data?.find(story => story.id === mark.targetId)?.title ?? "Saved story" : mark.targetId} detail={mark.note ?? mark.tag ?? mark.targetType} onPress={() => mark.targetType === "story" ? router.push({ pathname: "/stories/[storyId]", params: { storyId: mark.targetId } }) : setWord(mark.targetId)} translateTitle={mark.targetType === "story" && !stories.data?.some(story => story.id === mark.targetId)} translateDetail={false} /><View style={s.wrap}><Button label="Edit note / tag" onPress={() => edit(mark)} /><Button label="Remove" danger disabled={action.busy} onPress={() => confirmAction("Remove bookmark?", "The original story or dictionary word is unchanged.", () => void action.run(async () => { await practiceApi.removeBookmark(mark.id); await resource.refresh(); }, "Bookmark removed."))} /></View></Card>)}
    <Editor spec={editor} close={() => setEditor(null)} />
    {word && <Modal visible onRequestClose={() => setWord(null)}><PracticePage title="Saved word" onBack={() => setWord(null)}><Button label="Close" onPress={() => setWord(null)} /><DictionaryPanel initialWord={word} /></PracticePage></Modal>}
  </PracticePage>;
}
