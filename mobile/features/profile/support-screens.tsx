import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Platform, View } from "react-native";
import { ActionState, Button, Card, Copy, Empty, Heading, ResourceState, confirmAction, ui, useAction, useResource } from "../../features/shared/feature-ui";
import { profileService } from "./service";
import { font, garden, GardenCaption, GardenCard, GardenSubtitle, Page } from "./garden-ui";
import { formatUiDate, LocalizedPressable as Pressable, LocalizedText as Text, LocalizedTextInput as TextInput, useAppLanguage } from "../i18n/i18n";

function go(section: string) { router.push({ pathname: "/settings/[section]", params: { section } }); }
function Help() {
  const { language } = useAppLanguage();
  const articles = useResource(profileService.articles);
  const requests = useResource(profileService.requests);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const visible = (articles.data || []).filter(a => (category === "all" || a.category === category) && (a.title + " " + a.body).toLowerCase().includes(query.toLowerCase()));
  return <Page title="How can we help?" action={{ label: "Contact support", onPress: () => go("support") }}><GardenSubtitle>Find quick answers about your learning experience.</GardenSubtitle>
    <GardenCard><Text style={{ color: garden.ink, fontFamily: font.bold, fontSize: 12 }}>Search the help center</Text><TextInput style={{ color: garden.muted, fontFamily: font.body, fontSize: 16, minHeight: 32 }} accessibilityLabel="Search help articles" value={query} onChangeText={setQuery} placeholder="Try “offline”" /></GardenCard>
    <View style={{ flexDirection: "row", gap: 9, marginVertical: 16 }}>{["account", "learning", "practice"].map(c => <Pressable key={c} accessibilityRole="button" accessibilityState={{ selected: category === c }} onPress={() => setCategory(category === c ? "all" : c)} style={{ flex: 1, backgroundColor: garden.mint, borderRadius: 16, minHeight: 34, justifyContent: "center", paddingHorizontal: 8 }}><Text style={{ color: garden.forest, fontFamily: font.bold, fontSize: 12 }}>{c === "practice" ? "Practice" : c[0].toUpperCase() + c.slice(1)}</Text></Pressable>)}</View>
    <ResourceState resource={articles} />
    {!articles.loading && !articles.error && (visible.length ? visible.map((article, index) => <Pressable key={article.id} accessibilityRole="button" accessibilityState={{ expanded: expanded === article.id }} onPress={() => setExpanded(expanded === article.id ? null : article.id)} style={{ borderRadius: 16, backgroundColor: expanded === article.id || (!expanded && !query && category === "all" && index === 0) ? garden.mint : "white", padding: 14, minHeight: expanded === article.id || (!expanded && !query && category === "all" && index === 0) ? 116 : 52, marginBottom: 10 }}><Text style={{ color: garden.forest, fontFamily: font.bold, fontSize: 15 }}>{article.title}{expanded !== article.id && (query || category !== "all" || index !== 0) ? "  +" : ""}</Text>{(expanded === article.id || (!expanded && !query && category === "all" && index === 0)) && <Text style={{ color: garden.muted, fontFamily: font.body, fontSize: 13, lineHeight: 19, marginTop: 8 }}>{article.body}</Text>}</Pressable>) : <Empty text="No matching articles. Try another search or contact support." />)}
    <GardenCaption>YOUR REQUESTS</GardenCaption><ResourceState resource={requests} />
    {!requests.loading && !requests.error && (requests.data?.length ? requests.data.map(r => <Pressable key={r.id} onPress={() => go("support")} style={ui.card}><Text style={{ fontWeight: "700", color: "#20352B" }}>{r.status === "open" ? "Open" : "Closed"} · {formatUiDate(r.createdAt, language, { dateStyle: "medium" })}</Text><Text style={ui.text} numberOfLines={2} translate={false}>{r.message}</Text></Pressable>) : <Empty text="You have no support requests yet." />)}
  </Page>;
}
function Support() {
  const { language } = useAppLanguage();
  const resource = useResource(profileService.requests);
  const action = useAction();
  const [issueCategory, setIssueCategory] = useState("learning");
  const [message, setMessage] = useState(""); const [screenshot, setScreenshot] = useState(""); const [attachedImage, setAttachedImage] = useState<string | null>(null); const [editing, setEditing] = useState<string | null>(null); const [validation, setValidation] = useState("");
  const clear = () => { setEditing(null); setIssueCategory("learning"); setMessage(""); setScreenshot(""); setAttachedImage(null); };
  const pickScreenshot = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], base64: true, quality: 0.85 });
      if (result.canceled) return;
      const encoded = result.assets[0]?.base64;
      if (!encoded) return setValidation("Could not read this image. Choose another screenshot.");
      if (Math.floor(encoded.length * 3 / 4) > 5 * 1024 * 1024) return setValidation("Choose a screenshot smaller than 5 MB.");
      setAttachedImage(`data:image/jpeg;base64,${encoded}`);
      setScreenshot("");
      setValidation("");
    } catch { setValidation("Could not open your photos. Try again or paste a link."); }
  };
  const save = async () => {
    const trimmed = message.trim();
    if (!trimmed || trimmed.length > 5000) return setValidation("Message must be 1–5000 characters.");
    if (screenshot.trim().length > 500) return setValidation("Screenshot reference must be 500 characters or fewer.");
    setValidation("");
    const image = attachedImage || screenshot.trim();
    const ok = await action.run(async () => { if (editing) await profileService.updateRequest(editing, trimmed, image || null, issueCategory); else await profileService.createRequest(trimmed, image || undefined, issueCategory); }, editing ? "Request updated." : "Request sent.");
    if (ok) { clear(); await resource.refresh(); }
  };
  return <Page title="We're here to listen" action={{ label: action.busy ? "Sending…" : editing ? "Save request" : "Send request", onPress: () => void save(), disabled: action.busy }}><GardenSubtitle>Tell us what happened so we can help.</GardenSubtitle><ResourceState resource={resource} />
    <Text style={{ color: garden.forest, fontFamily: font.bold, fontSize: 12, marginBottom: 22 }}>1 / Describe     2 / Evidence     3 / Send</Text>
    <GardenCard><Text style={{ color: garden.ink, fontFamily: font.bold, fontSize: 12 }}>Issue category</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>{[{ id: "account", label: "Account" }, { id: "learning", label: "Learning" }, { id: "technical", label: "Technical" }, { id: "offline-downloads", label: "Offline downloads" }].map(category => <Pressable key={category.id} accessibilityRole="radio" accessibilityState={{ selected: issueCategory === category.id }} onPress={() => setIssueCategory(category.id)} style={{ backgroundColor: issueCategory === category.id ? garden.mint : "white", padding: 7, borderRadius: 12 }}><Text style={{ color: garden.forest, fontFamily: font.bold, fontSize: 12 }}>{category.label}</Text></Pressable>)}</View></GardenCard>
    <GardenCard><Text style={{ color: garden.forest, fontFamily: font.bold, fontSize: 15 }}>What happened?</Text><TextInput style={{ color: garden.muted, fontFamily: font.body, fontSize: 14, minHeight: 100, textAlignVertical: "top", marginTop: 6 }} multiline accessibilityLabel="Support message" value={message} maxLength={5000} onChangeText={setMessage} placeholder="Describe the issue..." /></GardenCard>
    <View style={{ backgroundColor: garden.blue, borderRadius: 16, padding: 14, marginVertical: 12 }}>
      <Pressable accessibilityRole="button" onPress={() => void pickScreenshot()} disabled={action.busy}><Text style={{ color: "#286CB5", fontFamily: font.bold, fontSize: 15 }}>＋ Attach a screenshot</Text></Pressable>
      <Text style={{ color: garden.muted, fontFamily: font.bold, fontSize: 12, marginTop: 6 }}>PNG / JPG · up to 5 MB</Text>
      {attachedImage && <><Image source={{ uri: attachedImage }} style={{ width: 120, height: 90, borderRadius: 8, marginTop: 8 }} resizeMode="cover" /><Button label="Remove screenshot" onPress={() => setAttachedImage(null)} /></>}
    </View>
    <Copy>Or paste a screenshot link (optional)</Copy><TextInput style={ui.input} accessibilityLabel="Screenshot link" value={screenshot} maxLength={500} onChangeText={v => { setScreenshot(v); if (v) setAttachedImage(null); }} placeholder="https://..." />
    <Text style={{ color: garden.muted, fontFamily: font.bold, fontSize: 12, marginVertical: 14 }}>Device details included · {Platform.OS} {String(Platform.Version)}</Text>
    {!!validation && <Text style={ui.error}>{validation}</Text>}<ActionState action={action} />
    {editing && <Button label="Discard edit" onPress={clear} />}
    <GardenCaption>YOUR REQUESTS</GardenCaption>
    {!resource.loading && !resource.error && (resource.data?.length ? resource.data.map(r => <Card key={r.id}>
      <Text style={{ color: r.status === "open" ? "#236c19" : "#65766c", fontWeight: "800" }}>{r.status.toUpperCase()}</Text>
      <Text style={ui.text} translate={false}>{r.message}</Text><Text style={ui.small}>#{r.id.slice(0, 8)} · {formatUiDate(r.createdAt, language, { dateStyle: "medium", timeStyle: "short" })}</Text>
      {r.status === "open" && <View style={ui.row}><Button label="Edit" onPress={() => { setEditing(r.id); setIssueCategory(r.deviceDetails?.issueCategory || "learning"); setMessage(r.message); setAttachedImage(r.screenshot?.startsWith("data:image/") ? r.screenshot : null); setScreenshot(r.screenshot?.startsWith("data:image/") ? "" : r.screenshot || ""); }} />
        <Button label="Cancel request" danger disabled={action.busy} onPress={() => confirmAction("Cancel this request?", "The open support request will be deleted.", () => void action.run(async () => { await profileService.cancelRequest(r.id); if (editing === r.id) clear(); await resource.refresh(); }, "Request cancelled."))} /></View>}
    </Card>) : <Empty text="No support requests yet." />)}
  </Page>;
}
function Exports() {
  const { language } = useAppLanguage();
  const resource = useResource(profileService.exports);
  const action = useAction();
  const download = async (id: string) => {
    await action.run(async () => {
      const current = await profileService.exportStatus(id);
      if (current.status !== "ready") throw new Error("This export is unavailable until its status is ready.");
      const payload = await profileService.downloadExport(id);
      const file = new File(Paths.cache, "fluora-export-" + id + ".json");
      try {
        if (!file.exists) file.create();
        await file.write(JSON.stringify(payload, null, 2));
        if (!(await Sharing.isAvailableAsync())) throw new Error("File sharing is unavailable on this device.");
        await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Save your Fluora data copy" });
      } finally { if (file.exists) file.delete(); }
    }, "Export file opened for saving or sharing.");
  };
  return <Page title="Your data copy" back><Text style={ui.text}>Request a personal copy of your Fluora data. Your export is generated when you download it.</Text>
    <ResourceState resource={resource} /><ActionState action={action} />
    <Button primary label={action.busy ? "Please wait…" : "Request export"} disabled={action.busy} onPress={() => void action.run(async () => { await profileService.createExport(); await resource.refresh(); }, "Your data copy is ready.")} />
    <Heading>EXPORT REQUESTS</Heading>
    {!resource.loading && !resource.error && (resource.data?.length ? resource.data.map(e => <Card key={e.id}>
      <Text style={{ color: "#20352B", fontWeight: "800" }}>Data copy · {formatUiDate(e.createdAt, language, { dateStyle: "medium" })}</Text>
      <Text style={{ color: e.status === "ready" ? "#236c19" : "#A35B00", fontWeight: "700" }}>Status: {e.status}</Text>
      <Text style={ui.small}>#{e.id.slice(0, 8)}</Text>
      {e.status !== "ready" && <Text style={ui.error}>This export is currently unavailable. Refresh its status or request a new copy.</Text>}
      <View style={ui.row}><Button label="Refresh status" onPress={() => void resource.refresh()} />
        {e.status === "ready" && <Button label="Download" disabled={action.busy} onPress={() => void download(e.id)} />}
        <Button label="Cancel" danger disabled={action.busy} onPress={() => confirmAction("Cancel export?", "This export request will be removed. A copy you already saved stays on your device.", () => void action.run(async () => { await profileService.cancelExport(e.id); await resource.refresh(); }, "Export request cancelled."))} />
      </View>
    </Card>) : <Empty text="You have not requested a data copy yet." />)}
  </Page>;
}
export { Help, Support, Exports };
