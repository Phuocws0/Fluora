import { PreferenceModal as Modal } from "../../components/PreferenceModal";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSpeechPrompt } from "../learning/audio/useSpeechPrompt";
import { practiceApi } from "./practice.service";
import type { Deck, WordCard } from "./practice.types";
import { ActionState, Button, Card, Choice, Editor, Empty, Field, GardenSubtitle, LinkCard, PracticePage, ResourceState, confirmAction, s, useAction, useResource } from "./practice-ui";
import type { EditorSpec } from "./practice-ui";

export function Flashcards({ cards, close, onRate }: { cards: Array<{ id: string; front: string; back: string; example?: string | null }>; close: () => void; onRate?: (id: string, correct: boolean) => Promise<void> }) {
  const [index, setIndex] = useState(0), [flipped, setFlipped] = useState(false);
  const action = useAction();
  const { speak, stop } = useSpeechPrompt();
  const card = cards[index];
  const next = async (correct: boolean) => {
    if (await action.run(async () => { if (onRate && card) await onRate(card.id, correct); }, "")) {
      stop(); setFlipped(false); setIndex(i => i + 1);
    }
  };
  return <Modal visible animationType="slide" onRequestClose={close}><PracticePage title={card ? "Do you remember?" : "Practice complete"} onBack={close}>
    <Button label="Close flashcards" onPress={() => { stop(); close(); }} />
    {card ? <>
      <Text style={s.caption}>FLASHCARD {index + 1} / {cards.length} · Self-assessed recall</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={flipped ? "Show word" : "Reveal meaning"} onPress={() => setFlipped(!flipped)} style={{ minHeight: 290, borderRadius: 28, backgroundColor: "#EAF8DE", justifyContent: "center", alignItems: "center", padding: 24, marginVertical: 18 }}>
        <Text style={[s.cardTitle, { fontFamily: "Nunito_400Regular", fontSize: 28, textAlign: "center" }]}>{flipped ? card.back : card.front}</Text>
        {flipped && card.example ? <Text style={s.body}>{card.example}</Text> : null}
        <Text style={s.caption}>Tap to {flipped ? "show word" : "flip"}</Text>
      </Pressable>
      <Button label="Listen" onPress={() => speak(card.front)} />
      {flipped && <View style={s.wrap}><Button label="Practice again" disabled={action.busy} onPress={() => void next(false)} /><Button label="I remembered" disabled={action.busy} onPress={() => void next(true)} /></View>}
      {onRate && <Text style={s.caption}>Remembered: next review in 24 hours. Practice again: 10 minutes.</Text>}
    </> : <GardenSubtitle>{onRate ? "Your recall results were saved. Return to refresh the due queue." : "Your deck practice is finished. Use Add to spaced review to schedule cards."}</GardenSubtitle>}
    <ActionState action={action} />
  </PracticePage></Modal>;
}

export function DeckListScreen() {
  const resource = useResource(practiceApi.decks), action = useAction();
  const [editor, setEditor] = useState<EditorSpec | null>(null);
  const edit = (deck?: Deck) => setEditor({ title: deck ? "Rename deck" : "Create a deck", fields: [{ key: "name", label: "Deck name", value: deck?.name, required: true, max: 120 }], save: async v => { if (deck) await practiceApi.renameDeck(deck.id, v.name); else await practiceApi.createDeck(v.name); await resource.refresh(); } });
  return <PracticePage title="My vocabulary" action={{ label: "Create a word deck", onPress: () => edit() }}>
    <GardenSubtitle>Collect useful words and build your daily practice.</GardenSubtitle>
    <Button label="Import CSV / JSON" onPress={() => router.push({ pathname: "/practice/[section]", params: { section: "import" } })} />
    <ResourceState resource={resource} /><ActionState action={action} />
    {resource.data?.length === 0 && <Empty text="Create your first personal deck. Curated lessons stay read-only." />}
    {resource.data?.map(deck => <Card key={deck.id}>
      <LinkCard title={deck.name} detail={`${deck._count?.cards ?? 0} cards`} onPress={() => router.push({ pathname: "/practice/decks/[deckId]", params: { deckId: deck.id } })} />
      <View style={s.wrap}><Button label="Rename" onPress={() => edit(deck)} /><Button label="Delete deck" danger disabled={action.busy} onPress={() => confirmAction("Delete deck and all cards?", "This permanently removes your personal cards.", () => void action.run(async () => { await practiceApi.deleteDeck(deck.id); await resource.refresh(); }, "Deck deleted."))} /></View>
    </Card>)}
    <Editor spec={editor} close={() => setEditor(null)} />
  </PracticePage>;
}

export function DeckDetailScreen() {
  const { deckId = "" } = useLocalSearchParams<{ deckId: string }>();
  return <DeckDetail key={deckId} id={deckId} />;
}
function DeckDetail({ id }: { id: string }) {
  const resource = useResource(useCallback(() => practiceApi.deck(id), [id]));
  const action = useAction();
  const [query, setQuery] = useState(""), [tag, setTag] = useState("all"), [studying, setStudying] = useState(false);
  const [editor, setEditor] = useState<EditorSpec | null>(null), [scheduled, setScheduled] = useState<string[]>([]);
  const cards = resource.data?.cards ?? [];
  const visible = cards.filter(card => (tag === "all" || card.tag === tag) && `${card.front} ${card.back}`.toLowerCase().includes(query.toLowerCase()));
  const edit = (card?: WordCard) => setEditor({ title: card ? "Edit card" : "Add a card", fields: [
    { key: "front", label: "Front / word", value: card?.front, required: true, max: 300 },
    { key: "back", label: "Back / meaning", value: card?.back, required: true, max: 1000, multiline: true },
    { key: "tag", label: "Topic / tag", value: card?.tag ?? "", max: 100 },
    { key: "example", label: "Example", value: card?.example ?? "", max: 1000, multiline: true },
  ], save: async v => {
    const input = { front: v.front, back: v.back, tag: v.tag || null, example: v.example || null };
    if (card) await practiceApi.updateCard(card.id, input); else await practiceApi.createCard(id, { ...input, tag: v.tag || undefined, example: v.example || undefined });
    await resource.refresh();
  } });
  return <PracticePage title={resource.data?.set.name ?? "Your word deck"} action={{ label: "Add a card", onPress: () => edit(), disabled: !resource.data }}>
    <ResourceState resource={resource} />
    <Field label="Find a word" value={query} onChange={setQuery} />
    <Choice value={tag} onChange={setTag} options={[{ id: "all", label: "All topics" }, ...Array.from(new Set(cards.map(c => c.tag).filter((v): v is string => Boolean(v)))).map(t => ({ id: t, label: t }))]} />
    <Button label="Study these cards" disabled={!visible.length} onPress={() => setStudying(true)} />
    <ActionState action={action} />
    {resource.data && !visible.length && <Empty text={cards.length ? "No matching cards." : "Add a word to get started."} />}
    {visible.map(card => <Card key={card.id}><Text style={s.cardTitle}>{card.front}</Text><Text style={s.body}>{card.back}</Text><Text style={s.caption}>{card.tag}{card.example ? ` · ${card.example}` : ""}</Text>
      <View style={s.wrap}><Button label="Edit" onPress={() => edit(card)} /><Button label="Delete" danger disabled={action.busy} onPress={() => confirmAction("Delete this card?", card.front, () => void action.run(async () => { await practiceApi.deleteCard(card.id); await resource.refresh(); }, "Card removed."))} />
        <Button label={scheduled.includes(card.id) ? "Added to review" : "Add to spaced review"} disabled={action.busy || scheduled.includes(card.id)} onPress={() => void action.run(async () => { await practiceApi.createReview(card.front, card.back); setScheduled(ids => [...ids, card.id]); }, "Added as a personal review item.")} />
      </View></Card>)}
    <Editor spec={editor} close={() => setEditor(null)} />
    {studying && <Flashcards cards={visible} close={() => setStudying(false)} />}
  </PracticePage>;
}
