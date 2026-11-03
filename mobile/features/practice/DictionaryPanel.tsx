import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { useSpeechPrompt } from "../learning/audio/useSpeechPrompt";
import { practiceApi } from "./practice.service";
import type { DictionaryEntry } from "./practice.types";
import { ActionState, Button, Card, Field, GardenSubtitle, PracticePage, s, useAction } from "./practice-ui";

export function DictionaryPanel({ initialWord = "" }: { initialWord?: string }) {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState(initialWord), [entry, setEntry] = useState<DictionaryEntry | null>(null), [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const action = useAction(), { speak } = useSpeechPrompt();
  const lookup = () => void action.run(async () => {
    setEntry(null); setBookmarkId(null);
    if (!query.trim()) throw new Error("Enter a word.");
    const result = await practiceApi.dictionary(query);
    const marks = await practiceApi.bookmarks();
    setEntry(result); setBookmarkId(marks.find(m => m.targetType === "word" && m.targetId === result.word)?.id ?? null);
  }, "");
  if (!isAuthenticated) return <><GardenSubtitle>Sign in to use your dictionary and save words.</GardenSubtitle><Button label="Sign in" onPress={() => router.push("/(auth)/login")} /></>;
  return <>
    <Field label="Dictionary word" value={query} onChange={setQuery} maxLength={100} />
    <Button label="Look up word" disabled={action.busy} onPress={lookup} />
    <Text style={s.caption}>The local demo dictionary currently includes hello, morning and name. Other words may return no result.</Text>
    <ActionState action={action} />
    {entry && <Card><Text style={s.cardTitle}>{entry.word}</Text><Text style={s.body}>{entry.definition}</Text><Text style={s.caption}>{entry.example}</Text><Button label="Listen" onPress={() => speak(entry.word)} />
      <Button label={bookmarkId ? "Remove saved word" : "Save word"} disabled={action.busy} onPress={() => void action.run(async () => {
        if (bookmarkId) { await practiceApi.removeBookmark(bookmarkId); setBookmarkId(null); }
        else { const r = await practiceApi.bookmark("word", entry.word); setBookmarkId(r.bookmark.id); }
      }, bookmarkId ? "Saved word removed." : "Word saved to bookmarks.")} />
    </Card>}
  </>;
}
export function DictionaryScreen() { return <PracticePage title="Learn words in context"><DictionaryPanel /></PracticePage>; }
