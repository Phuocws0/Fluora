import { File } from "expo-file-system";
import { createDownloadResumable } from "expo-file-system/legacy";
import { ApiError } from "../../services/api";
import { getCourse, getLesson, getUnit } from "../learning/learning.service";
import { practiceApi } from "./practice.service";
import { clearLibrary, loadManifest, packageDir, readPackage, removePackage, saveManifest, savePackage, STORAGE_LIMIT } from "./offline.storage";
import type { DownloadEntry, DownloadKind, OfflinePackage } from "./offline.storage";

const states = new Map<string, DownloadEntry[]>(), initialized = new Map<string, Promise<void>>(), running = new Set<string>();
const listeners = new Set<() => void>();
const errors = new Map<string, string>();
const activeTasks = new Map<string, { cancelAsync: () => Promise<void> }>();
export function downloadError(owner: string) { return errors.get(owner) ?? null; }
export function subscribeDownloads(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function downloadSnapshot(owner: string) { return states.get(owner) ?? []; }
function publish(owner: string, entries: DownloadEntry[]) { saveManifest(owner, entries); states.set(owner, entries); listeners.forEach(fn => fn()); }
export async function initializeDownloads(owner: string) {
  if (!initialized.has(owner)) initialized.set(owner, (async () => {
    const entries = await loadManifest(owner);
    // A process restart interrupted these requests; retain them for an explicit retry.
    publish(owner, entries.map(e => ["queued", "downloading"].includes(e.status) ? { ...e, status: "failed" as const, error: "Download interrupted. Tap Retry.", progress: 0 } : e));
  })());
  try { await initialized.get(owner); } catch (cause) { initialized.delete(owner); throw cause; }
}
function update(owner: string, id: string, patch: Partial<DownloadEntry>) { publish(owner, downloadSnapshot(owner).map(e => e.id === id ? { ...e, ...patch } : e)); }
export async function addDownload(owner: string, kind: DownloadKind, targetId: string, title: string, includeMedia: boolean) {
  await initializeDownloads(owner);
  const id = `${kind}-${targetId}`;
  const old = downloadSnapshot(owner).find(e => e.id === id);
  if (old && ["queued", "downloading", "completed"].includes(old.status)) throw new Error("This content is already queued or downloaded.");
  const entry: DownloadEntry = { id, targetId, kind, title, includeMedia, status: "queued", progress: 0, bytes: 0, error: null, revision: (old?.revision ?? 0) + 1 };
  publish(owner, [...downloadSnapshot(owner).filter(e => e.id !== id), entry]);
  errors.delete(owner);
  void runDownloads(owner).catch(cause => { errors.set(owner, cause instanceof Error ? cause.message : "Could not update the local download queue."); listeners.forEach(fn => fn()); });
}
export async function cancelDownload(owner: string, id: string, remove = false) {
  await initializeDownloads(owner);
  if (remove) publish(owner, downloadSnapshot(owner).filter(e => e.id !== id));
  else update(owner, id, { status: "cancelled", error: null });
  await activeTasks.get(`${owner}:${id}`)?.cancelAsync();
  removePackage(owner, id);
}
export async function retryDownload(owner: string, id: string) {
  await initializeDownloads(owner);
  const entry = downloadSnapshot(owner).find(e => e.id === id);
  if (!entry) throw new Error("Download not found.");
  await addDownload(owner, entry.kind, entry.targetId, entry.title, entry.includeMedia);
}
export async function eraseDownloads(owner: string) {
  // Invalidate the queue before awaiting native cancellation.
  publish(owner, []);
  await Promise.all([...activeTasks].filter(([key]) => key.startsWith(`${owner}:`)).map(([, task]) => task.cancelAsync()));
  clearLibrary(owner); states.set(owner, []); initialized.delete(owner); errors.delete(owner); listeners.forEach(fn => fn());
}
function mediaUrls(value: unknown, urls = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach(v => mediaUrls(v, urls));
  else if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) {
    if (/^(audio|image|media)Url$/.test(key) && typeof child === "string" && /^https?:\/\//.test(child)) urls.add(child);
    else mediaUrls(child, urls);
  }
  return urls;
}
async function runDownloads(owner: string) {
  if (running.has(owner)) return;
  running.add(owner);
  try {
    let entry: DownloadEntry | undefined;
    while ((entry = downloadSnapshot(owner).find(e => e.status === "queued"))) {
      const job = entry;
      const valid = () => downloadSnapshot(owner).some(e => e.id === job.id && e.revision === job.revision && e.status === "downloading");
      update(owner, job.id, { status: "downloading", progress: 0, error: null });
      try {
        removePackage(owner, job.id);
        const data: OfflinePackage = { version: 1, owner, lessons: [], media: {} };
        let lessonIds: string[] = [];
        if (job.kind === "story") data.story = await practiceApi.story(job.targetId);
        if (job.kind === "course") { data.course = await getCourse(job.targetId); lessonIds = data.course.units.flatMap(u => u.lessons.map(l => l.id)); }
        if (job.kind === "unit") { data.unit = await getUnit(job.targetId); lessonIds = data.unit.lessons.map(l => l.id); }
        if (job.kind === "lesson") lessonIds = [job.targetId];
        if (!valid()) { removePackage(owner, job.id); continue; }
        for (const [index, lessonId] of lessonIds.entries()) {
          data.lessons.push(await getLesson(lessonId));
          if (!valid()) break;
          update(owner, job.id, { progress: Math.round((index + 1) / Math.max(1, lessonIds.length) * 70) });
        }
        if (!valid()) { removePackage(owner, job.id); continue; }
        let mediaBytes = 0;
        const urls = job.includeMedia ? [...mediaUrls(data)] : [];
        for (const [index, url] of urls.entries()) {
          const extension = new URL(url).pathname.match(/\.([a-zA-Z0-9]{1,5})$/)?.[1] ?? "bin";
          const file = new File(packageDir(owner, job.id), `media-${index}.${extension}`);
          // The legacy entry point still provides transfer progress and cancellation.
          const task = createDownloadResumable(url, file.uri, {}, progress => {
            if (valid()) update(owner, job.id, { bytes: mediaBytes + progress.totalBytesWritten, progress: 70 + Math.round((index + (progress.totalBytesExpectedToWrite > 0 ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite : 0)) / urls.length * 25) });
          });
          activeTasks.set(`${owner}:${job.id}`, task);
          try {
            const result = await task.downloadAsync();
            if (!result) throw new Error("Download paused before completion. Tap Retry.");
            if (result.status < 200 || result.status >= 300) throw new Error(`Media download failed (HTTP ${result.status}). Tap Retry.`);
          } finally {
            activeTasks.delete(`${owner}:${job.id}`);
            // Also removes the legacy progress listener after success or failure.
            await task.cancelAsync();
          }
          mediaBytes += file.size;
          data.media[url] = file.uri;
          if (!valid()) break;
          const used = downloadSnapshot(owner).filter(e => e.status === "completed").reduce((sum, e) => sum + e.bytes, 0);
          if (used + mediaBytes > STORAGE_LIMIT) throw new Error("The 200 MB local library limit was reached. Remove a download first.");
          update(owner, job.id, { progress: 70 + Math.round((index + 1) / urls.length * 25) });
        }
        if (!valid()) { removePackage(owner, job.id); continue; }
        const bytes = savePackage(owner, job.id, data) + mediaBytes;
        const used = downloadSnapshot(owner).filter(e => e.status === "completed").reduce((sum, e) => sum + e.bytes, 0);
        if (used + bytes > STORAGE_LIMIT) throw new Error("The 200 MB local library limit was reached. Remove a download first.");
        update(owner, job.id, { status: "completed", progress: 100, bytes });
      } catch (cause) {
        removePackage(owner, job.id);
        if (valid()) update(owner, job.id, { status: "failed", progress: 0, bytes: 0, error: cause instanceof Error ? cause.message : "Could not download this content." });
      }
    }
  } finally { running.delete(owner); }
}
export async function offlineLesson(owner: string, lessonId: string) {
  await initializeDownloads(owner);
  for (const entry of downloadSnapshot(owner).filter(e => e.status === "completed" && e.kind !== "story")) {
    try {
      const data = await readPackage(owner, entry.id);
      const lesson = data.lessons.find(l => l.id === lessonId);
      if (lesson) return { ...lesson, exercises: lesson.exercises.map(e => ({ ...e, content: replaceMedia(e.content, data.media) })) };
    } catch (cause) { update(owner, entry.id, { status: "failed", error: cause instanceof Error ? cause.message : "Download files are missing." }); }
  }
  return null;
}
export async function offlineStory(owner: string, storyId: string) {
  await initializeDownloads(owner);
  const entry = downloadSnapshot(owner).find(e => e.status === "completed" && e.kind === "story" && e.targetId === storyId);
  if (!entry) return null;
  try {
    const data = await readPackage(owner, entry.id);
    return data.story ? { ...data.story, content: replaceMedia(data.story.content, data.media) } : null;
  } catch (cause) {
    update(owner, entry.id, { status: "failed", error: cause instanceof Error ? cause.message : "Download files are missing." });
    throw cause;
  }
}
function replaceMedia(value: unknown, urls: Record<string, string>): unknown {
  if (typeof value === "string") return urls[value] ?? value;
  if (Array.isArray(value)) return value.map(v => replaceMedia(v, urls));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value)
    // A text-only snapshot must never try to stream an uncached remote asset.
    .filter(([key, child]) => !(/^(audio|image|media)Url$/.test(key) && typeof child === "string" && /^https?:\/\//.test(child) && !urls[child]))
    .map(([k, v]) => [k, replaceMedia(v, urls)]));
  return value;
}
export function isConnectionError(cause: unknown) { return cause instanceof ApiError && cause.status === undefined; }
