import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { parseImport } from "../mobile/features/practice/import.ts";
import { parseReading } from "../mobile/features/practice/reading.ts";

test("CSV imports preserve quoted commas, quotes, CRLF and multiline fields", () => {
  const rows = parseImport('\uFEFFterm,meaning,example\r\nhello,"a greeting, politely","He said ""hello""."\r\nname,identity,"line one\nline two"');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].meaning, "a greeting, politely");
  assert.equal(rows[0].example, 'He said "hello".');
  assert.equal(rows[1].example, "line one\nline two");
});
test("CSV/JSON validation rejects ambiguous headers, malformed quotes and oversized imports", () => {
  assert.throws(() => parseImport("word,word\na,b"), /distinct/);
  assert.throws(() => parseImport('front,back\n"unclosed,value'), /unclosed/);
  assert.throws(() => parseImport('front,back\n"hello"extra,greeting'), /closing CSV quote/);
  assert.throws(() => parseImport("front,back\na,b,c"), /expected/);
  assert.throws(() => parseImport(JSON.stringify([{ term: 1, meaning: "text" }])), /text values/);
  assert.throws(() => parseImport(JSON.stringify(Array.from({ length: 501 }, () => ({ a: "a", b: "b" })))), /500/);
  assert.throws(() => parseImport("a".repeat(1024 * 1024 + 1)), /1 MB/);
  assert.equal(parseImport('[{"front":"hello","back":"greeting"}]')[0].front, "hello");
});
test("reader parses article, dialogue, quote and challenge content without assuming answer keys", () => {
  const parsed = parseReading({ paragraphs: ["An article.", { speaker: "Mia", text: "Hello." }, { text: "A quote.", quote: true }, null], comprehension: [{ question: "Who speaks?", options: ["Mia", 123] }], challenge: { lessonId: "lesson-1", exerciseId: "exercise-1" } });
  assert.equal(parsed.paragraphs.length, 3);
  assert.equal(parsed.paragraphs[1].speaker, "Mia");
  assert.equal(parsed.paragraphs[2].quote, true);
  assert.deepEqual(parsed.questions[0].options, ["Mia"]);
  assert.equal(parsed.challenge.lessonId, "lesson-1");
  assert.equal(parseReading(null).paragraphs.length, 0);
});

async function offlineRuntime({ holdMedia = false, mediaStatus = 200 } = {}) {
  const files = new Map(), directories = new Set();
  const transfers = [];
  const path = (...segments) => segments.map(p => typeof p === "string" ? p : p.uri).join("/").replace(/\/{2,}/g, "/");
  class Directory {
    constructor(...segments) { this.uri = path(...segments); }
    get exists() { return directories.has(this.uri); }
    create() { directories.add(this.uri); }
    delete() { for (const key of files.keys()) if (key.startsWith(`${this.uri}/`)) files.delete(key); for (const key of directories) if (key === this.uri || key.startsWith(`${this.uri}/`)) directories.delete(key); }
  }
  class File {
    constructor(...segments) { this.uri = path(...segments); }
    get exists() { return files.has(this.uri); }
    get size() { return Buffer.byteLength(files.get(this.uri) ?? ""); }
    create() { files.set(this.uri, ""); }
    write(value) { assert.ok(this.exists, "create a file before writing"); files.set(this.uri, value); }
    async text() { if (!this.exists) throw new Error("missing file"); return files.get(this.uri); }
    delete() { files.delete(this.uri); }
  }
  function createDownloadResumable(_url, uri, _options, onProgress) {
    let finish;
    const transfer = {
      cancelled: false,
      async cancelAsync() { this.cancelled = true; finish?.(undefined); },
      async downloadAsync() {
        const destination = new File(uri);
        destination.create(); destination.write("local-audio-data");
        onProgress({ totalBytesWritten: destination.size, totalBytesExpectedToWrite: destination.size });
        return holdMedia ? new Promise(resolve => { finish = resolve; }) : { uri, status: mediaStatus };
      },
    };
    transfers.push(transfer);
    return transfer;
  }
  class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
  let getLesson = async id => ({ id, title: id, exercises: [{ id: "exercise", type: "listening_choice", content: { audioUrl: "https://example.test/prompt.mp3" } }] });
  const learning = {
    getCourse: async id => ({ id, title: "Course", units: [{ id: "unit", lessons: [{ id: "lesson-1" }, { id: "lesson-2" }] }] }),
    getUnit: async id => ({ id, title: "Unit", lessons: [{ id: "lesson-1" }] }),
    getLesson: id => getLesson(id),
  };
  const context = vm.createContext({ URL, Date, Map, Set, Error });
  const cache = new Map();
  async function load(name) {
    if (cache.has(name)) return cache.get(name);
    const source = await readFile(new URL(`../mobile/features/practice/${name}.ts`, import.meta.url), "utf8");
    const module = new vm.SourceTextModule(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, { context });
    cache.set(name, module);
    await module.link(async specifier => {
      if (specifier === "./offline.storage") return load("offline.storage");
      const exports = specifier === "expo-file-system" ? { File, Directory, Paths: { document: "/documents" } }
        : specifier === "expo-file-system/legacy" ? { createDownloadResumable }
        : specifier.includes("learning.service") ? learning
        : specifier.includes("practice.service") ? { practiceApi: { story: async id => ({ id, title: "Story", kind: "article", content: { paragraphs: ["Saved story"] } }) } }
        : { ApiError };
      return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
    });
    return module;
  }
  const downloads = await load("downloads"); await downloads.evaluate();
  const storage = cache.get("offline.storage").namespace;
  return { api: downloads.namespace, storage, files, transfers, setLesson: value => { getLesson = value; } };
}
async function until(api, owner, predicate) {
  const current = () => api.downloadSnapshot(owner);
  if (predicate(current())) return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { unsubscribe(); reject(new Error("Queue did not reach the expected state.")); }, 3000);
    const unsubscribe = api.subscribeDownloads(() => { if (predicate(current())) { clearTimeout(timer); unsubscribe(); resolve(); } });
  });
}
test("downloads persist course content and media, expose real progress, and isolate account libraries", async () => {
  const { api, storage, files } = await offlineRuntime();
  const states = [];
  const unsub = api.subscribeDownloads(() => states.push(api.downloadSnapshot("alice")[0]?.status));
  await api.addDownload("alice", "course", "course-1", "English", true);
  await until(api, "alice", entries => entries[0]?.status === "completed"); unsub();
  assert.ok(states.includes("queued")); assert.ok(states.includes("downloading"));
  const entry = api.downloadSnapshot("alice")[0]; assert.equal(entry.progress, 100); assert.ok(entry.bytes > 0);
  const lesson = await api.offlineLesson("alice", "lesson-1"); assert.ok(lesson.exercises[0].content.audioUrl.startsWith("/documents/fluora-offline/alice/"));
  assert.equal(await api.offlineLesson("bob", "lesson-1"), null);
  assert.ok((await storage.readPackage("alice", entry.id)).lessons.length === 2);
  await api.cancelDownload("alice", entry.id, true);
  assert.equal(api.downloadSnapshot("alice").length, 0);
  assert.ok(![...files.keys()].some(key => key.includes("course-course-1/")));
});
test("cancelled in-flight downloads cannot resurrect files; retry keeps the new revision", async () => {
  const { api, files, setLesson } = await offlineRuntime();
  let release;
  setLesson(() => new Promise(resolve => { release = resolve; }));
  await api.addDownload("alice", "lesson", "one", "Lesson", false);
  await until(api, "alice", entries => entries[0]?.status === "downloading");
  await api.cancelDownload("alice", "lesson-one");
  assert.equal(api.downloadSnapshot("alice")[0].status, "cancelled");
  release({ id: "one", exercises: [] });
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(![...files.keys()].some(key => key.includes("lesson-one/content.json")));
  setLesson(async id => ({ id, exercises: [] }));
  await api.retryDownload("alice", "lesson-one");
  await until(api, "alice", entries => entries[0]?.status === "completed");
  assert.equal(api.downloadSnapshot("alice")[0].revision, 2);
});
test("text-only downloads omit remote media so offline playback can use a local voice", async () => {
  const { api } = await offlineRuntime();
  await api.addDownload("alice", "lesson", "one", "Lesson", false);
  await until(api, "alice", entries => entries[0]?.status === "completed");
  const lesson = await api.offlineLesson("alice", "one");
  assert.equal(lesson.exercises[0].content.audioUrl, undefined);
});
test("media transfers report bytes and stop when cancelled or cleared", async () => {
  const { api, files, transfers } = await offlineRuntime({ holdMedia: true });
  for (const clear of [false, true]) {
    await api.addDownload("alice", "lesson", "one", "Lesson", true);
    await until(api, "alice", entries => entries[0]?.bytes > 0);
    if (clear) await api.eraseDownloads("alice");
    else await api.cancelDownload("alice", "lesson-one");
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(transfers.at(-1).cancelled, true);
    assert.ok(![...files.keys()].some(key => key.includes("lesson-one/")));
    assert.equal(api.downloadSnapshot("alice")[0]?.status, clear ? undefined : "cancelled");
  }
});
test("media HTTP errors do not create a completed offline package", async () => {
  const { api, files } = await offlineRuntime({ mediaStatus: 404 });
  await api.addDownload("alice", "lesson", "one", "Lesson", true);
  await until(api, "alice", entries => entries[0]?.status === "failed");
  assert.match(api.downloadSnapshot("alice")[0].error, /HTTP 404/);
  assert.ok(![...files.keys()].some(key => key.includes("lesson-one/")));
});
test("failed jobs can retry, interrupted jobs recover as failed, and corrupt libraries can be cleared", async () => {
  const { api, storage, files, setLesson } = await offlineRuntime();
  setLesson(async () => { throw new Error("Connection lost"); });
  await api.addDownload("alice", "lesson", "one", "Lesson", false);
  await until(api, "alice", entries => entries[0]?.status === "failed");
  assert.match(api.downloadSnapshot("alice")[0].error, /Connection/);
  setLesson(async id => ({ id, exercises: [] }));
  await api.retryDownload("alice", "lesson-one"); await until(api, "alice", entries => entries[0]?.status === "completed");
  storage.saveManifest("bob", [{ id: "lesson-two", targetId: "two", kind: "lesson", status: "downloading", progress: 40, bytes: 0, revision: 1 }]);
  await api.initializeDownloads("bob"); assert.equal(api.downloadSnapshot("bob")[0].status, "failed");
  files.set("/documents/fluora-offline/corrupt/manifest.json", "invalid-json");
  await assert.rejects(api.initializeDownloads("corrupt"));
  await api.eraseDownloads("corrupt"); await api.initializeDownloads("corrupt");
  assert.equal(api.downloadSnapshot("corrupt").length, 0);
  assert.equal(api.downloadSnapshot("alice")[0].status, "completed");
  await assert.rejects(api.initializeDownloads("../outside"), /Invalid local/);
});

test("offline session snapshots only restore for the matching token and logout removes them", async () => {
  const values = new Map();
  const secure = { getItemAsync: async key => values.get(key) ?? null, setItemAsync: async (key, value) => { values.set(key, value); }, deleteItemAsync: async key => { values.delete(key); } };
  const context = vm.createContext({});
  const source = await readFile(new URL("../mobile/services/session.ts", import.meta.url), "utf8");
  const module = new vm.SourceTextModule(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, { context });
  await module.link(specifier => {
    const exports = specifier === "react-native" ? { Platform: { OS: "android" } } : secure;
    return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
  });
  await module.evaluate(); const api = module.namespace;
  await api.saveAccessToken("token-a");
  await api.saveSessionSnapshot({ token: "token-a", user: { id: "alice", email: "alice@example.invalid" }, settings: null });
  assert.equal((await api.loadSessionSnapshot("token-a")).user.id, "alice");
  assert.equal(await api.loadSessionSnapshot("token-b"), null);
  await api.clearAccessToken();
  assert.equal(await api.getAccessToken(), null);
  assert.equal(await api.loadSessionSnapshot("token-a"), null);
});
