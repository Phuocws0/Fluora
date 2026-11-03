import { Directory, File, Paths } from "expo-file-system";
import type { LessonOverview, CourseOverview, UnitOverview } from "../../types/learning";
import type { Story } from "./practice.types";

export type DownloadKind = "course" | "unit" | "lesson" | "story";
export type DownloadEntry = { id: string; targetId: string; title: string; kind: DownloadKind; status: "queued" | "downloading" | "completed" | "failed" | "cancelled"; progress: number; bytes: number; error: string | null; includeMedia: boolean; revision: number };
export type OfflinePackage = { version: 1; owner: string; lessons: LessonOverview[]; story?: Story; course?: CourseOverview; unit?: UnitOverview; media: Record<string, string> };
export const STORAGE_LIMIT = 200 * 1024 * 1024;
function safe(value: string) { if (!/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new Error("Invalid local storage key."); return value; }
function ownerDir(owner: string) { const dir = new Directory(Paths.document, "fluora-offline", safe(owner)); dir.create({ intermediates: true, idempotent: true }); return dir; }
function write(file: File, value: unknown) { if (!file.exists) file.create(); file.write(JSON.stringify(value)); }
export function packageDir(owner: string, id: string) { const dir = new Directory(ownerDir(owner), safe(id)); dir.create({ intermediates: true, idempotent: true }); return dir; }
export async function loadManifest(owner: string): Promise<DownloadEntry[]> {
  const file = new File(ownerDir(owner), "manifest.json");
  if (!file.exists) return [];
  const parsed: unknown = JSON.parse(await file.text());
  if (!Array.isArray(parsed) || parsed.some(e => !e || typeof e.id !== "string" || typeof e.status !== "string" || !["course", "unit", "lesson", "story"].includes(e.kind))) throw new Error("Download index is damaged. Remove this account's local library to start again.");
  return parsed as DownloadEntry[];
}
export function saveManifest(owner: string, entries: DownloadEntry[]) { write(new File(ownerDir(owner), "manifest.json"), entries); }
export function savePackage(owner: string, id: string, data: OfflinePackage) {
  const file = new File(packageDir(owner, id), "content.json"); write(file, data); return file.size;
}
export async function readPackage(owner: string, id: string): Promise<OfflinePackage> {
  const file = new File(ownerDir(owner), safe(id), "content.json");
  if (!file.exists) throw new Error("Download files are missing. Remove this item and download it again.");
  const data = JSON.parse(await file.text()) as OfflinePackage;
  if (data.version !== 1 || data.owner !== owner || !Array.isArray(data.lessons)) throw new Error("This download is incompatible. Download it again.");
  return data;
}
export function removePackage(owner: string, id: string) { const dir = new Directory(ownerDir(owner), safe(id)); if (dir.exists) dir.delete(); }
export function clearLibrary(owner: string) { const dir = ownerDir(owner); dir.delete(); }
export async function readDraft(owner: string, key: string): Promise<unknown> { const file = new File(ownerDir(owner), `draft-${safe(key)}.json`); return file.exists ? JSON.parse(await file.text()) : null; }
export function writeDraft(owner: string, key: string, value: unknown) { write(new File(ownerDir(owner), `draft-${safe(key)}.json`), value); }
