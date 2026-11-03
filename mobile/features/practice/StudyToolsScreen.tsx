import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, Switch, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { useSpeechPrompt } from "../learning/audio/useSpeechPrompt";
import { SpeakingExercise } from "../learning/player/components/SpeakingExercise";
import { WaveformVisualizer } from "../learning/components/WaveformVisualizer";
import { practiceApi } from "./practice.service";
import { readDraft, writeDraft } from "./offline.storage";
import { Button, Card, Choice, Field, GardenSubtitle, LinkCard, PracticePage, ResourceState, Section, s, useResource } from "./practice-ui";

export function StudyToolsCatalog() {
  const resource = useResource(practiceApi.tools);
  return <PracticePage title="Explore your study tools"><GardenSubtitle>Short, focused activities for your daily language garden.</GardenSubtitle><ResourceState resource={resource} />
    {resource.data?.map(tool => <LinkCard key={tool.id} title={tool.title} detail={tool.kind} onPress={() => router.push({ pathname: "/practice/tools/[toolId]", params: { toolId: tool.id } })} />)}
    <Section>YOUR LEARNING RECORDS</Section>
    <LinkCard title="Dictionary" onPress={() => router.push({ pathname: "/practice/[section]", params: { section: "dictionary" } })} />
    <LinkCard title="Personal error notebook" detail="Review mistakes derived from your answers" onPress={() => router.push({ pathname: "/practice/[section]", params: { section: "review" } })} />
    <LinkCard title="Learning calendar" detail="Your weekly planner" onPress={() => router.push("/planner")} />
    <LinkCard title="Spaced review schedule" onPress={() => router.push({ pathname: "/practice/[section]", params: { section: "review" } })} />
  </PracticePage>;
}
export function StudyToolScreen() {
  const { toolId = "" } = useLocalSearchParams<{ toolId: string }>();
  return <StudyTool key={toolId} id={toolId} />;
}
function StudyTool({ id }: { id: string }) {
  const resource = useResource(useCallback(() => practiceApi.tool(id), [id]));
  return <PracticePage title={resource.data?.title ?? "Study tool"}><ResourceState resource={resource} />
    {resource.data && <><Text style={s.caption}>GUIDED DEMO · Curated practice from the design samples. Local checks do not award XP or replace graded lessons.</Text>
      {id === "listening" && <ListeningTool />}
      {id === "pronunciation" && <PronunciationTool />}
      {id === "writing" && <WritingTool />}
      {id === "grammar" && <GrammarTool />}
      {id === "word-map" && <WordMapTool />}
      {["city", "cafe", "transit"].includes(id) && <SituationTool kind={id} />}
    </>}
  </PracticePage>;
}
function ListeningTool() {
  const [mode, setMode] = useState("pairs"), [rate, setRate] = useState("1"), [captions, setCaptions] = useState(false), [pauses, setPauses] = useState(false);
  const [answer, setAnswer] = useState(""), [result, setResult] = useState(""), [pair, setPair] = useState("ship");
  const { speak, stop, isSpeaking } = useSpeechPrompt();
  const sample = "I usually take the train to work.";
  const changeMode = (v: string) => { stop(); setMode(v); setResult(""); setAnswer(""); setCaptions(false); };
  const say = (text: string) => speak(text, { rate: Number(rate), pauseMs: pauses ? 800 : 0 });
  return <><Choice value={mode} options={[{ id: "pairs", label: "Minimal pairs" }, { id: "dictation", label: "Dictation / gaps" }, { id: "conversation", label: "Soundscape" }]} onChange={changeMode} />
    <Section>PLAYBACK CONTROLS</Section>
    <Choice value={rate} options={[{ id: "0.75", label: "0.75×" }, { id: "1", label: "1×" }, { id: "1.25", label: "1.25×" }]} onChange={setRate} />
    <View style={s.wrap}><Switch accessibilityLabel="Show transcript captions" value={captions} onValueChange={setCaptions} /><Text style={s.label}>Transcript captions</Text><Switch accessibilityLabel="Pause between sentences" value={pauses} onValueChange={setPauses} /><Text style={s.label}>Pause between sentences</Text></View>
    <WaveformVisualizer active={isSpeaking} meteringLevel={0.5} /><Text style={s.caption}>Playback activity illustration · Speech uses your installed device voice.</Text>
    <Button label="Stop playback" onPress={stop} />
    {mode === "pairs" && <><Section>HEAR THE DIFFERENCE</Section><View style={s.wrap}><Button label="ship /ɪ/ · short vowel" onPress={() => say("ship")} /><Button label="sheep /iː/ · long vowel" onPress={() => say("sheep")} /></View><Button label="Listen to a word" onPress={() => { setResult(""); const next = pair === "ship" ? "sheep" : "ship"; setPair(next); say(next); }} />
      <Text style={s.body}>Which word do you hear?</Text><Choice value={answer} options={[{ id: "ship", label: "ship" }, { id: "sheep", label: "sheep" }]} onChange={setAnswer} /><Button label="Check local practice" disabled={!answer} onPress={() => setResult(answer === pair ? "You matched the word. Listen again and compare the vowel length." : "Try listening again. Compare /ɪ/ with /iː/.")} /></>}
    {mode === "dictation" && <><Section>WRITE WHAT YOU HEAR</Section><Button label="Play full sentence" onPress={() => say(sample)} />{captions && <Text style={s.body}>{sample}</Text>}<Text style={s.caption}>Gap prompt: I usually take ___ train to work.</Text><Field label="Your full transcript or missing word" value={answer} onChange={setAnswer} maxLength={1000} multiline /><Button label="Compare with sample" disabled={!answer.trim()} onPress={() => setResult([sample.toLowerCase().replace(/[.!?]/g, ""), "the"].includes(answer.trim().toLowerCase().replace(/[.!?]/g, "")) ? "The transcript matches the guided sample." : `Compare your sentence with: ${sample}`)} /></>}
    {mode === "conversation" && <><Section>FOLLOW THE CONVERSATION</Section><Button label="Play both speakers" onPress={() => say("Excuse me. Sure! How can I help you?")} /><Card><Text style={s.label}>Speaker A</Text>{captions && <Text style={s.body}>Excuse me…</Text>}<Button label="Listen to A" onPress={() => say("Excuse me.")} /></Card><Card><Text style={s.label}>Speaker B</Text>{captions && <Text style={s.body}>Sure! How can I help you?</Text>}<Button label="Listen to B" onPress={() => say("Sure! How can I help you?")} /></Card><Text style={s.caption}>This demo uses device voices. No background-audio track is supplied by the current API.</Text></>}
    {!!result && <Card><Text style={s.body}>{result}</Text></Card>}
  </>;
}
function PronunciationTool() {
  const [mode, setMode] = useState("sounds"), [score, setScore] = useState({ transcript: "", score: 0 });
  const [phoneme, setPhoneme] = useState("TH"), [confidence, setConfidence] = useState<Record<string, string>>({});
  const { speak } = useSpeechPrompt();
  return <><Choice value={mode} options={[{ id: "sounds", label: "Phonemes / mouth guide" }, { id: "rhythm", label: "Rhythm timeline" }, { id: "studio", label: "Recording studio" }]} onChange={setMode} />
    {mode === "sounds" && <><Section>HOW TO SHAPE THE SOUND</Section><Image accessibilityLabel="Mouth guide for the theta sound: tongue between the teeth" source={require("../../assets/practice-mouth-guide.png")} style={{ width: "100%", aspectRatio: 342 / 285, marginVertical: 12 }} resizeMode="contain" /><Card><Text style={[s.cardTitle, { fontSize: 34 }]}>/θ/ · thought</Text><Text style={s.body}>1 · Tongue: between your teeth.{"\n"}2 · Air: release gently.</Text><Button label="Listen to thought" onPress={() => speak("thought")} /></Card><Card><Text style={s.label}>TH · OU · GH · T</Text><Text style={s.body}>Round your lips for /ɔː/ in the middle sound. Listen, then record your attempt.</Text></Card><Section>PHONEME CONFIDENCE · SELF-ASSESSED</Section><View style={s.wrap}>{["TH", "OU", "GH", "T"].map(sound => <Pressable key={sound} accessibilityRole="button" onPress={() => setPhoneme(sound)} style={{ padding: 18, borderRadius: 16, borderWidth: sound === phoneme ? 2 : 0, borderColor: "#236c19", backgroundColor: confidence[sound] === "100" ? "#EAF8DE" : confidence[sound] === "50" ? "#FFF4E5" : "#EAF4FF" }}><Text style={s.label}>{sound}</Text><Text style={s.caption}>{confidence[sound] ?? "—"}%</Text></Pressable>)}</View><Choice value={confidence[phoneme] ?? ""} options={[{ id: "0", label: "Needs work" }, { id: "50", label: "Getting there" }, { id: "100", label: "Confident" }]} onChange={v => setConfidence(c => ({ ...c, [phoneme]: v }))} /><Text style={s.caption}>No automatic phoneme accuracy is measured. These ratings and the speaking scorecard are self-assessments.</Text></>}
    {mode === "rhythm" && <><Section>FOLLOW THE RHYTHM</Section><View style={s.wrap}>{["I", "would", "LIKE", "some", "tea"].map(word => <Card key={word}><Text style={[s.cardTitle, word === "LIKE" && { fontSize: 26 }]}>{word}</Text></Card>)}</View><Button label="Slow" onPress={() => speak("I would like some tea.", { rate: 0.65 })} /><Button label="Natural" onPress={() => speak("I would like some tea.")} /><Button label="Repeat stressed phrase" onPress={() => speak("I would LIKE some tea.")} /></>}
    {mode === "studio" && <SpeakingExercise content={{ suggestedPhrase: "I would like some tea." }} prompt="Practice aloud" transcript={score.transcript} score={score.score} onChange={setScore} />}
  </>;
}
function WritingTool() {
  const { user } = useAuth();
  const [draft, setDraft] = useState(""), [ready, setReady] = useState(false), [restoreFailed, setRestoreFailed] = useState(false), [error, setError] = useState(""), [view, setView] = useState("canvas"), [rubric, setRubric] = useState<Record<string, string>>({});
  const owner = user!.id;
  useEffect(() => { let alive = true; void readDraft(owner, "writing").then(value => { if (alive) { if (typeof value === "string") setDraft(value); setReady(true); } }).catch(cause => { if (alive) { setError(cause instanceof Error ? cause.message : "Could not restore your draft."); setRestoreFailed(true); } }); return () => { alive = false; }; }, [owner]);
  const saveDraft = (value: string) => { setDraft(value); try { writeDraft(owner, "writing", value); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this draft."); } };
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  return <><Choice value={view} options={[{ id: "canvas", label: "Canvas" }, { id: "annotated", label: "Annotated sample" }, { id: "compare", label: "Compare revision" }, { id: "rubric", label: "Rubric" }]} onChange={setView} />
    {view === "canvas" && <><GardenSubtitle>Describe your favorite place. Your draft stays on this device.</GardenSubtitle><Field label="Your writing" value={draft} editable={ready} onChange={saveDraft} maxLength={5000} multiline /><Text style={s.caption}>{words} words · {ready && !error ? "Saved locally" : "Loading draft…"}</Text><Button label="Use guided sample" disabled={!ready} onPress={() => saveDraft("Yesterday I go to the market and buy a fresh apple.")} /><Text style={s.caption}>Free writing is not automatically graded by this local tool.</Text><Button label="Open Flo for writing questions" onPress={() => router.push("/(tabs)/tutor")} /></>}
    {view === "annotated" && <><Section>GUIDED SAMPLE · EDIT WITH GUIDANCE</Section><Card><Text style={s.body}>Yesterday I go to the market and buy a fresh apple.</Text></Card><LinkCard title="go → went" detail="Past tense for yesterday" onPress={() => setView("compare")} /><LinkCard title="buy → bought" detail="Keep both actions in the past" onPress={() => setView("compare")} /></>}
    {view === "compare" && <><Section>GUIDED SAMPLE · BEFORE</Section><Card><Text style={s.body}>I go to café yesterday and drink coffee.</Text></Card><Section>AFTER</Section><Card><Text style={s.body}>I went to a café yesterday and drank coffee.</Text></Card><Text style={s.caption}>Use past tense for yesterday; include an article before café. These corrections describe this sample, not an automatic review of your own draft.</Text></>}
    {view === "rubric" && <><GardenSubtitle>Assess your own writing and choose the next revision. These scores stay in this session.</GardenSubtitle>{["Meaning", "Grammar", "Vocabulary", "Flow"].map(label => <View key={label}><Section>{label}</Section><Choice value={rubric[label] ?? ""} options={[0, 1, 2, 3, 4].map(n => ({ id: String(n), label: `${n}/4` }))} onChange={v => setRubric(r => ({ ...r, [label]: v }))} /></View>)}<Text style={s.cardTitle}>{Object.values(rubric).reduce((sum, v) => sum + Number(v), 0)} / 16 · Self-assessed</Text></>}
    {!!error && <Text style={s.error}>{error}</Text>}{restoreFailed && <Button label="Replace unreadable draft with a new draft" onPress={() => { setReady(true); setRestoreFailed(false); saveDraft(""); }} />}
  </>;
}
function GrammarTool() {
  const [view, setView] = useState("reference"), [tense, setTense] = useState("present"), [subject, setSubject] = useState("I"), [answer, setAnswer] = useState("");
  const { speak } = useSpeechPrompt();
  const present: Record<string, string> = { I: "am", you: "are", "he / she": "is", we: "are", they: "are" };
  const past: Record<string, string> = { I: "was", you: "were", "he / she": "was", we: "were", they: "were" };
  const table = tense === "past" ? past : present;
  return <><Choice value={view} options={[{ id: "reference", label: "Tense reference matrix" }, { id: "verbs", label: "Verb workbench" }]} onChange={setView} />
    {view === "reference" ? <>{[{ tense: "Present", example: "I work.", meaning: "Routine", form: "S + verb", time: "every day" }, { tense: "Past", example: "I worked.", meaning: "Finished action", form: "S + past verb", time: "yesterday" }, { tense: "Future", example: "I will work.", meaning: "Future plan", form: "S + will + verb", time: "tomorrow" }].map(row => <Card key={row.tense}><Text style={s.cardTitle}>{row.tense} · {row.example}</Text><Text style={s.body}>{row.meaning}</Text><Text style={s.caption}>FORM: {row.form} · TIME WORD: {row.time}</Text><Button label="Listen to example" onPress={() => speak(row.example)} /></Card>)}</> : <>
      <Choice value={tense} options={[{ id: "present", label: "Present" }, { id: "past", label: "Past" }]} onChange={v => { setTense(v); setAnswer(""); }} /><Section>VERB: BE</Section>{Object.entries(table).map(([s, v]) => <Text key={s} style={s === subject ? stylesActive : undefined}>{s} → {v}</Text>)}
      <Section>MATCH THE SUBJECT</Section><Choice value={subject} options={Object.keys(table).map(id => ({ id, label: id }))} onChange={v => { setSubject(v); setAnswer(""); }} /><Choice value={answer} options={["am", "is", "are", "was", "were"].map(id => ({ id, label: id }))} onChange={setAnswer} />{answer && <Text style={s.body}>{answer === table[subject] ? "The form agrees with the subject." : `Compare with the reference: ${subject} ${table[subject]}.`}</Text>}
    </>}
  </>;
}
const stylesActive = { color: "#236c19", fontWeight: "700" as const, paddingVertical: 8 };
function WordMapTool() {
  const [view, setView] = useState("map"), [groups, setGroups] = useState<Record<string, string>>({}), [collocation, setCollocation] = useState("");
  const { speak } = useSpeechPrompt();
  return <><Choice value={view} options={[{ id: "map", label: "Semantic map" }, { id: "sort", label: "Word sorting" }, { id: "collocation", label: "Collocations" }, { id: "family", label: "Word family" }]} onChange={setView} />
    {view === "map" && <><Section>TRAVEL · CONNECT THE IDEAS</Section><View style={{ height: 420, marginVertical: 12 }}><View style={{ position: "absolute", left: "50%", top: 30, bottom: 30, width: 2, backgroundColor: "#DEE8D9" }} /><View style={{ position: "absolute", left: "9%", right: "9%", top: 210, height: 2, backgroundColor: "#DEE8D9" }} />{[{ word: "travel", x: "32%" as const, y: 150, size: 120 }, { word: "ticket", x: "37%" as const, y: 15, size: 88 }, { word: "journey", x: "0%" as const, y: 170, size: 88 }, { word: "hotel", x: "73%" as const, y: 170, size: 88 }, { word: "arrive", x: "37%" as const, y: 320, size: 88 }].map(node => <Pressable key={node.word} accessibilityRole="button" accessibilityLabel={`Listen to ${node.word}`} onPress={() => speak(node.word)} style={{ position: "absolute", left: node.x, top: node.y, width: node.size, height: node.size, borderRadius: node.size / 2, backgroundColor: node.word === "travel" ? "#EAF8DE" : "#EAF4FF", alignItems: "center", justifyContent: "center" }}><Text style={[s.cardTitle, node.word === "travel" && { fontSize: 24 }]}>{node.word}</Text></Pressable>)}</View><Text style={s.body}>A ticket lets you begin a journey. You can arrive at a hotel while you travel.</Text></>}
    {view === "sort" && <><Section>SORT BY MEANING</Section>{["bread", "station", "apple", "park"].map(word => <Card key={word}><Text style={s.cardTitle}>{word}</Text><Choice value={groups[word] ?? ""} options={[{ id: "Food", label: "Food" }, { id: "Places", label: "Places" }]} onChange={v => setGroups(g => ({ ...g, [word]: v }))} /></Card>)}{Object.keys(groups).length === 4 && <Text style={s.body}>{["bread", "apple"].every(w => groups[w] === "Food") && ["station", "park"].every(w => groups[w] === "Places") ? "All four words are in their meaning groups." : "Try again: bread and apple are food; station and park are places."}</Text>}</>}
    {view === "collocation" && <><Section>MAKE + …</Section><Choice value={collocation} options={["a decision", "a homework", "a sunshine"].map(id => ({ id, label: id }))} onChange={setCollocation} />{collocation && <Text style={s.body}>{collocation === "a decision" ? "Make a decision is a natural combination." : "Try another choice. We make a decision, but do homework."}</Text>}</>}
    {view === "family" && <><Section>GROW A WORD FAMILY</Section>{[{ word: "act", kind: "verb" }, { word: "action", kind: "noun" }, { word: "active", kind: "adjective" }, { word: "activate", kind: "verb" }].map(row => <LinkCard key={row.word} title={row.word} detail={row.kind} onPress={() => speak(row.word)} />)}<Text style={s.body}>Take action today.</Text></>}
  </>;
}
function SituationTool({ kind }: { kind: string }) {
  const [destination, setDestination] = useState("Station"), [order, setOrder] = useState<string[]>([]), [start, setStart] = useState("Home"), [end, setEnd] = useState("Station");
  const { speak } = useSpeechPrompt();
  const menu = [{ name: "Coffee", price: 3 }, { name: "Tea", price: 2 }, { name: "Sandwich", price: 5 }, { name: "Fruit bowl", price: 4 }];
  const stops = [{ name: "Home", time: "09:05" }, { name: "Central Square", time: "09:12" }, { name: "Museum", time: "09:19" }, { name: "Station", time: "09:27" }];
  return <>
    {kind === "city" && <><GardenSubtitle>Practice city directions with a guided language map.</GardenSubtitle><View style={{ height: 348, backgroundColor: "#F7FAF6", borderRadius: 22, overflow: "hidden", marginVertical: 16 }}>{[1, 2, 3].map(n => <View key={`v${n}`} style={{ position: "absolute", left: `${n * 25}%`, width: 8, top: 0, bottom: 0, backgroundColor: "white" }} />)}{[1, 2, 3, 4].map(n => <View key={`h${n}`} style={{ position: "absolute", top: `${n * 20}%`, height: 8, left: 0, right: 0, backgroundColor: "white" }} />)}{[{ name: "Café", x: "8%" as const, y: 70 }, { name: "Station", x: "62%" as const, y: 145 }, { name: "Market", x: "33%" as const, y: 250 }].map(place => <Pressable key={place.name} accessibilityRole="button" accessibilityLabel={`Choose ${place.name}`} onPress={() => setDestination(place.name)} style={{ position: "absolute", left: place.x, top: place.y, alignItems: "center" }}><View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: destination === place.name ? "#58CC02" : "#2876BD" }} /><Text style={s.caption}>{place.name}</Text></Pressable>)}</View><Card><Text style={s.cardTitle}>Café → Market → Station</Text><Text style={s.body}>Turn left. Go straight. Where is the {destination.toLowerCase()}?</Text><Button label="Listen to directions" onPress={() => speak(`Excuse me. Where is the ${destination.toLowerCase()}? Turn left, then go straight.`)} /></Card><Text style={s.caption}>This is a language-practice diagram, without live maps or location tracking.</Text></>}
    {kind === "cafe" && <><Section>THE GARDEN CAFÉ</Section>{menu.map(item => <Button key={item.name} label={`${order.includes(item.name) ? "✓ " : ""}${item.name} · $${item.price}`} onPress={() => setOrder(o => o.includes(item.name) ? o.filter(v => v !== item.name) : [...o, item.name])} />)}<Card><Text style={s.cardTitle}>My order · {order.join(" + ") || "Choose an item"}</Text><Text style={s.body}>Sample total: ${menu.filter(item => order.includes(item.name)).reduce((sum, item) => sum + item.price, 0)}</Text><Button label="Say my order" disabled={!order.length} onPress={() => speak(`Could I have ${order.join(" and ").toLowerCase()}, please?`)} /></Card><Button label="Read a dialogue" onPress={() => router.push({ pathname: "/practice/[section]", params: { section: "stories" } })} /></>}
    {kind === "transit" && <><Section>GUIDED TIMETABLE · ONE OUTBOUND JOURNEY</Section>{stops.map(stop => <Text key={stop.name} style={s.body}>{stop.name} → {stop.time}</Text>)}<Text style={s.label}>From</Text><Choice value={start} options={stops.map(s => ({ id: s.name, label: s.name }))} onChange={setStart} /><Text style={s.label}>To</Text><Choice value={end} options={stops.map(s => ({ id: s.name, label: s.name }))} onChange={setEnd} />{stops.findIndex(s => s.name === start) >= stops.findIndex(s => s.name === end) ? <Text style={s.error}>Choose a destination after your starting stop in this sample journey.</Text> : <Card><Text style={s.body}>{start} at {stops.find(s => s.name === start)?.time} → {end} at {stops.find(s => s.name === end)?.time}</Text><Button label="Practice the question" onPress={() => speak(`What time does the train arrive at ${end}?`)} /></Card>}</>}
    <Button label="View mission passport" onPress={() => router.push("/missions/passport")} />
  </>;
}
