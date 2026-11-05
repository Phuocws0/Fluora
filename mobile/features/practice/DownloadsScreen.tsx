import { PreferenceModal as Modal } from "../../components/PreferenceModal";
import { useCallback, useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { getCourse, getCourses } from "../learning/learning.service";
import { practiceApi } from "./practice.service";
import { addDownload, cancelDownload, downloadError, downloadSnapshot, eraseDownloads, initializeDownloads, retryDownload, subscribeDownloads } from "./downloads";
import { readPackage, STORAGE_LIMIT } from "./offline.storage";
import type { DownloadEntry, DownloadKind, OfflinePackage } from "./offline.storage";
import { ActionState, Button, Card, Empty, GardenSubtitle, PracticePage, ResourceState, Section, confirmAction, garden, s, useAction, useResource } from "./practice-ui";
import { LocalizedText as Text } from "../i18n/i18n";

const loadCatalog = async () => { const [courses, stories] = await Promise.all([getCourses(), practiceApi.stories()]); return { courses, stories }; };
export function useDownloads(owner: string) {
  const [entries, setEntries] = useState<DownloadEntry[]>([]), [error, setError] = useState<string | null>(null), [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const refresh = () => { if (alive) { setEntries(downloadSnapshot(owner)); setError(downloadError(owner)); } };
    setLoading(true); setEntries([]); setError(null);
    const unsubscribe = subscribeDownloads(refresh);
    void initializeDownloads(owner).then(refresh).catch(cause => { if (alive) setError(cause instanceof Error ? cause.message : "Could not open local storage."); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; unsubscribe(); };
  }, [owner]);
  return { entries, error, loading };
}
export function DownloadsScreen() {
  const { user, settings } = useAuth();
  const owner = user!.id;
  const local = useDownloads(owner), action = useAction(), catalog = useResource(loadCatalog);
  const [courseId, setCourseId] = useState(""), [includeMedia, setIncludeMedia] = useState(!settings?.lowBandwidth);
  const course = useResource(useCallback(() => courseId ? getCourse(courseId) : Promise.resolve(null), [courseId]));
  const [opened, setOpened] = useState<OfflinePackage | null>(null);
  const used = local.entries.filter(e => e.status === "completed").reduce((sum, e) => sum + e.bytes, 0);
  const firstCourse = catalog.data?.courses[0];
  const queue = (kind: DownloadKind, id: string, title: string) => void action.run(() => addDownload(owner, kind, id, title, includeMedia), "Added to your device queue.");
  const open = (entry: DownloadEntry) => void action.run(async () => {
    const data = await readPackage(owner, entry.id);
    if (data.story) router.push({ pathname: "/stories/[storyId]", params: { storyId: data.story.id, offline: "1" } });
    else setOpened(data);
  }, "");
  return <PracticePage title="Take your classroom with you" action={firstCourse ? { label: "Download course", onPress: () => queue("course", firstCourse.id, firstCourse.title), disabled: action.busy } : undefined}>
    <GardenSubtitle>Keep learning even with an unreliable connection.</GardenSubtitle>
    <Text style={[s.section, { marginTop: 0 }]}>DEVICE STORAGE</Text>
    <Text style={[s.cardTitle, { fontFamily: "Nunito_400Regular", fontSize: 30, marginTop: 7 }]}>{(used / 1024 / 1024).toFixed(2)} MB</Text><Text style={[s.caption, { marginTop: 22 }]}>of 200 MB reserved for Fluora</Text>
    <View style={{ height: 24, borderRadius: 12, backgroundColor: garden.line, marginTop: 15, marginBottom: 19 }}><View style={{ width: `${Math.min(100, used / STORAGE_LIMIT * 100)}%`, height: 24, borderRadius: 12, backgroundColor: garden.green }} /></View>
    {local.error && <Text style={s.error}>{local.error}</Text>}
    <ActionState action={action} /><Section>DOWNLOAD QUEUE</Section>
    {!local.loading && !local.entries.length && <Empty text="Download a course, unit, lesson or story while connected." />}
    {local.entries.map(entry => <Card key={entry.id}><Text style={s.cardTitle} translate={false}>{entry.title}</Text><Text style={s.caption}>{entry.status.toUpperCase()} · {entry.progress}% · {(entry.bytes / 1024).toFixed(1)} KB · {entry.includeMedia ? "With available media" : "Text-first"}</Text>
      {entry.status === "downloading" && <View style={{ height: 6, backgroundColor: garden.line }}><View style={{ height: 6, backgroundColor: garden.green, width: `${entry.progress}%` }} /></View>}
      {entry.error && <Text style={s.error}>{entry.error}</Text>}
      <View style={s.wrap}>{entry.status === "completed" && <Button label="Open offline" onPress={() => open(entry)} />}
        {["failed", "cancelled"].includes(entry.status) && <Button label="Retry" onPress={() => void action.run(() => retryDownload(owner, entry.id), "Queued again.")} />}
        {["queued", "downloading"].includes(entry.status) && <Button label="Cancel" onPress={() => void action.run(() => cancelDownload(owner, entry.id), "Download cancelled.")} />}
        <Button label="Remove" danger onPress={() => confirmAction("Remove download?", "This deletes only the local copy. Your account progress stays on the server.", () => void action.run(() => cancelDownload(owner, entry.id, true), "Local copy removed."))} />
      </View>
    </Card>)}
    <Button label="Clear this account's local library" danger onPress={() => confirmAction("Clear local library and drafts?", "Downloaded content and device drafts for this account will be deleted.", () => void action.run(async () => eraseDownloads(owner), "Local library cleared."))} />
    <Section>ADD A DOWNLOAD</Section>
    <View style={s.wrap}><Switch accessibilityLabel="Include available audio and images" value={includeMedia} onValueChange={setIncludeMedia} /><Text style={s.caption}>Include available media {!includeMedia ? "· Low bandwidth / text-first" : ""}</Text></View>
    <Text style={s.caption}>Current demo lessons are mostly text. Speech uses an installed device voice; download that voice in your device settings for offline playback. Offline practice does not award XP or submit answers.</Text>
    <ResourceState resource={catalog} />
    {catalog.data?.courses.map(c => <Card key={c.id}><Text style={s.cardTitle} translate={false}>{c.title}</Text><View style={s.wrap}><Button label="Download course" disabled={action.busy} onPress={() => queue("course", c.id, c.title)} /><Button label="Choose unit / lesson" onPress={() => setCourseId(courseId === c.id ? "" : c.id)} /></View></Card>)}
    {courseId && <><ResourceState resource={course} />{course.data?.units.map(unit => <Card key={unit.id}><Button label={`Download unit: ${unit.title}`} onPress={() => queue("unit", unit.id, unit.title)} translateLabel={false} />{unit.lessons.map(lesson => <Button key={lesson.id} label={`↓ ${lesson.title}`} onPress={() => queue("lesson", lesson.id, lesson.title)} translateLabel={false} />)}</Card>)}</>}
    {catalog.data?.stories.map(story => <Button key={story.id} label={`Download story: ${story.title}`} onPress={() => queue("story", story.id, story.title)} translateLabel={false} />)}
    {opened && <Modal visible onRequestClose={() => setOpened(null)}><PracticePage title={opened.course?.title ?? opened.unit?.title ?? "Downloaded lesson"} onBack={() => setOpened(null)} translateTitle={!opened.course && !opened.unit}><Button label="Close" onPress={() => setOpened(null)} />{opened.lessons.map(lesson => <Button key={lesson.id} label={lesson.title} onPress={() => { setOpened(null); router.push({ pathname: "/lesson/[lessonId]", params: { lessonId: lesson.id, offline: "1" } }); }} translateLabel={false} />)}</PracticePage></Modal>}
  </PracticePage>;
}
