import { useState } from "react";
import { Text, View } from "react-native";
import { File } from "expo-file-system";
import { practiceApi } from "./practice.service";
import { parseImport } from "./import";
import type { ImportMapping, ImportPreview, ImportRow } from "./practice.types";
import { ActionState, Button, Card, Choice, Field, GardenSubtitle, PracticePage, ResourceState, Section, s, useAction, useResource } from "./practice-ui";

export function ImportScreen() {
  const decks = useResource(practiceApi.decks), action = useAction();
  const [text, setText] = useState(""), [filename, setFilename] = useState("vocabulary.csv"), [destination, setDestination] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]), [mapping, setMapping] = useState<ImportMapping>({ front: "", back: "" });
  const [preview, setPreview] = useState<ImportPreview | null>(null), [approved, setApproved] = useState<number[]>([]);
  const [validation, setValidation] = useState("");
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const invalidate = () => { setPreview(null); setApproved([]); };
  const load = () => { try {
    const parsed = parseImport(text);
    setRows(parsed); setMapping({ front: Object.keys(parsed[0])[0], back: Object.keys(parsed[0])[1] ?? "" }); invalidate(); setValidation("");
  } catch (cause) { setValidation(cause instanceof Error ? cause.message : "Could not parse this file."); setRows([]); invalidate(); } };
  const pick = () => void action.run(async () => {
    // Android document providers can label CSV as Excel or octet-stream. Let
    // the existing size/parser/preview validation decide what can be imported.
    const result = await File.pickFileAsync({ mimeTypes: ["*/*"] });
    if (result.canceled) return;
    if (result.result.size > 1024 * 1024) throw new Error("Choose a vocabulary file up to 1 MB.");
    const content = await result.result.text();
    setText(content); setFilename(result.result.name); setRows([]); invalidate();
  }, "File loaded. Parse it to map its columns.");
  const check = () => void action.run(async () => {
    if (!mapping.front || !mapping.back) throw new Error("Map both Front and Back.");
    const p = await practiceApi.preview(filename, rows, mapping);
    setPreview(p); setApproved(p.validRows.map((_, i) => i));
  }, "Preview ready. Review the valid rows and select the ones to import.");
  const finish = () => void action.run(async () => {
    const target = destination || decks.data?.[0]?.id;
    if (!target) throw new Error("Create a destination deck first.");
    if (!preview || !approved.length) throw new Error("Preview and approve at least one row first.");
    // Re-map approved, validated rows. Invalid or unselected source rows are never submitted.
    const approvedRows = approved.map(i => {
      const card = preview.validRows[i];
      return { front: card.front, back: card.back, ...(card.tag ? { tag: card.tag } : {}), ...(card.example ? { example: card.example } : {}) };
    });
    const result = await practiceApi.import(target, approvedRows, { front: "front", back: "back", ...(mapping.tag ? { tag: "tag" } : {}), ...(mapping.example ? { example: "example" } : {}) });
    invalidate(); setRows([]); setText("");
    return result;
  }, "Approved words imported into your deck.");
  return <PracticePage title="Bring your own vocabulary" action={{ label: "Import approved rows", onPress: finish, disabled: action.busy || !preview || !approved.length || !decks.data?.length }}>
    <GardenSubtitle>Map columns and check every word before importing. CSV headers or a JSON array of text objects, up to 500 rows.</GardenSubtitle>
    <Button label="Choose CSV / JSON file" disabled={action.busy} onPress={pick} />
    <Field editable={!action.busy} label="Filename" value={filename} onChange={v => { setFilename(v); invalidate(); }} maxLength={200} />
    <Field editable={!action.busy} label="Or paste CSV / JSON" value={text} onChange={v => { setText(v); setRows([]); invalidate(); }} multiline />
    <Button label="Parse file" disabled={action.busy} onPress={load} />
    {validation ? <Text style={s.error}>{validation}</Text> : null}
    <ResourceState resource={decks} />
    <Section>DESTINATION DECK</Section>
    {!decks.loading && !decks.data?.length && <Text style={s.error}>Create a deck from My vocabulary before importing.</Text>}
    <Choice disabled={action.busy} value={destination || decks.data?.[0]?.id || ""} options={(decks.data ?? []).map(d => ({ id: d.id, label: d.name }))} onChange={setDestination} />
    {!!rows.length && <><Section>FILE COLUMN → CARD FIELD</Section>
      {(["front", "back", "tag", "example"] as const).map(field => <View key={field}><Text style={s.label}>{field.toUpperCase()}</Text><Choice disabled={action.busy} value={mapping[field] ?? ""} options={[...(field === "tag" || field === "example" ? [{ id: "", label: "Skip" }] : []), ...columns.map(c => ({ id: c, label: c }))]} onChange={v => { setMapping(m => { const next = { ...m }; if (!v && (field === "tag" || field === "example")) delete next[field]; else next[field] = v; return next; }); invalidate(); }} /></View>)}
      <Button label="Validate mapping & preview" disabled={action.busy} onPress={check} />
    </>}
    <ActionState action={action} />
    {preview && <><Section>{approved.length} APPROVED / {preview.validRows.length} VALID ROWS</Section>
      {preview.errors.map(error => <Text key={error.row} style={s.error}>Source row {error.row}: {error.message}</Text>)}
      {preview.validRows.map((row, i) => <Card key={i}><Button disabled={action.busy} label={`${approved.includes(i) ? "✓ " : ""}${row.front} → ${row.back}`} onPress={() => setApproved(a => a.includes(i) ? a.filter(id => id !== i) : [...a, i])} /><Text style={s.caption}>{row.tag} {row.example}</Text></Card>)}
    </>}
  </PracticePage>;
}
