export type Paragraph = { speaker?: string; text: string; quote?: boolean };
export type Comprehension = { question: string; options: string[] };
export type ReadingContent = { paragraphs: Paragraph[]; questions: Comprehension[]; challenge: { lessonId: string; exerciseId?: string } | null };
function object(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
export function parseReading(value: unknown): ReadingContent {
  const content = object(value);
  const raw = content?.paragraphs ?? content?.body ?? content?.text;
  const paragraphs = (typeof raw === "string" ? raw.split(/\n+/) : Array.isArray(raw) ? raw : []).flatMap((row): Paragraph[] => {
    if (typeof row === "string") return [{ text: row }];
    const p = object(row);
    return p && typeof p.text === "string" ? [{ text: p.text, quote: p.quote === true, ...(typeof p.speaker === "string" ? { speaker: p.speaker } : {}) }] : [];
  });
  const questions = (Array.isArray(content?.comprehension) ? content.comprehension : []).flatMap((raw): Comprehension[] => {
    const row = object(raw);
    return row && typeof row.question === "string" && Array.isArray(row.options) ? [{ question: row.question, options: row.options.filter((v): v is string => typeof v === "string") }] : [];
  });
  const challenge = object(content?.challenge);
  return { paragraphs, questions, challenge: challenge && typeof challenge.lessonId === "string" ? { lessonId: challenge.lessonId, ...(typeof challenge.exerciseId === "string" ? { exerciseId: challenge.exerciseId } : {}) } : null };
}
