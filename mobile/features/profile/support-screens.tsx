import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Pressable, Text, TextInput, View } from "react-native";
import { ActionState, Button, Card, Copy, Empty, Heading, Page, ResourceState, confirmAction, ui, useAction, useResource } from "../../features/shared/feature-ui";
import { Article, SupportRequest, profileService } from "./service";

function go(section: string) { router.push({ pathname: "/settings/[section]", params: { section } }); }
function Help() {
  const articles = useResource(profileService.articles);
  const requests = useResource(profileService.requests);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const visible = (articles.data || []).filter(a => (category === "all" || a.category === category) && (a.title + " " + a.body).toLowerCase().includes(query.toLowerCase()));
  return <Page title="Help center" back><Text style={ui.text}>How can we help?</Text>
    <TextInput style={ui.input} accessibilityLabel="Search help articles" value={query} onChangeText={setQuery} placeholder="Search for answers" />
    <View style={ui.row}>{["all", "account", "learning", "practice"].map(c => <Button key={c} label={(category === c ? "✓ " : "") + c} onPress={() => setCategory(c)} />)}</View>
    <Heading>COMMON QUESTIONS</Heading><ResourceState resource={articles} />
    {!articles.loading && !articles.error && (visible.length ? visible.map(a => <Card key={a.id}><Text style={{ color: "#20352B", fontSize: 16, fontWeight: "700" }}>{a.title}</Text><Copy>{a.body}</Copy></Card>) : <Empty text="No matching articles. Try another search or contact support." />)}
    <Heading>YOUR REQUESTS</Heading><ResourceState resource={requests} />
    {!requests.loading && !requests.error && (requests.data?.length ? requests.data.map(r => <Pressable key={r.id} onPress={() => go("support")} style={ui.card}><Text style={{ fontWeight: "700", color: "#20352B" }}>{r.status === "open" ? "Open" : "Closed"} · {new Date(r.createdAt).toLocaleDateString()}</Text><Text style={ui.text} numberOfLines={2}>{r.message}</Text></Pressable>) : <Empty text="You have no support requests yet." />)}
    <View style={{ marginTop: 18 }}><Button primary label="Contact support" onPress={() => go("support")} /></View>
  </Page>;
}
function Support() {
  const resource = useResource(profileService.requests);
  const action = useAction();
  const [message, setMessage] = useState(""); const [screenshot, setScreenshot] = useState(""); const [editing, setEditing] = useState<string | null>(null); const [validation, setValidation] = useState("");
  const clear = () => { setEditing(null); setMessage(""); setScreenshot(""); };
  const save = async () => {
    const trimmed = message.trim();
    if (!trimmed || trimmed.length > 5000) return setValidation("Message must be 1–5000 characters.");
    if (screenshot.trim().length > 500) return setValidation("Screenshot reference must be 500 characters or fewer.");
    setValidation("");
    const ok = await action.run(async () => { if (editing) await profileService.updateRequest(editing, trimmed); else await profileService.createRequest(trimmed, screenshot.trim() || undefined); }, editing ? "Request updated." : "Request sent.");
    if (ok) { clear(); await resource.refresh(); }
  };
  return <Page title="Contact support" back><Text style={ui.text}>We’re here to listen.</Text><ResourceState resource={resource} />
    <Heading>{editing ? "Edit open request" : "New request"}</Heading>
    <Copy>Tell us what happened</Copy><TextInput style={[ui.input, { minHeight: 130, textAlignVertical: "top" }]} multiline accessibilityLabel="Support message" value={message} maxLength={5000} onChangeText={setMessage} placeholder="Describe the issue..." />
    {!editing && <><Copy>Screenshot reference (optional)</Copy><TextInput style={ui.input} accessibilityLabel="Screenshot reference" value={screenshot} maxLength={500} onChangeText={setScreenshot} placeholder="Link to an existing image" />
      <Text style={ui.small}>This demo accepts a link or reference, not an image upload.</Text></>}
    {!!validation && <Text style={ui.error}>{validation}</Text>}<ActionState action={action} />
    <View style={ui.row}><Button primary label={editing ? "Save request" : "Send request"} disabled={action.busy} onPress={() => void save()} />{editing && <Button label="Discard edit" onPress={clear} />}</View>
    <Heading>YOUR REQUESTS</Heading>
    {!resource.loading && !resource.error && (resource.data?.length ? resource.data.map(r => <Card key={r.id}>
      <Text style={{ color: r.status === "open" ? "#236c19" : "#65766c", fontWeight: "800" }}>{r.status.toUpperCase()}</Text>
      <Text style={ui.text}>{r.message}</Text><Text style={ui.small}>#{r.id.slice(0, 8)} · {new Date(r.createdAt).toLocaleString()}</Text>
      {r.status === "open" && <View style={ui.row}><Button label="Edit" onPress={() => { setEditing(r.id); setMessage(r.message); setScreenshot(r.screenshot || ""); }} />
        <Button label="Cancel request" danger disabled={action.busy} onPress={() => confirmAction("Cancel this request?", "The open support request will be deleted.", () => void action.run(async () => { await profileService.cancelRequest(r.id); if (editing === r.id) clear(); await resource.refresh(); }, "Request cancelled."))} /></View>}
    </Card>) : <Empty text="No support requests yet." />)}
  </Page>;
}
function Exports() {
  const resource = useResource(profileService.exports);
  const action = useAction();
  const [downloadError, setDownloadError] = useState("");
  const download = async (id: string) => {
    setDownloadError("");
    await action.run(async () => {
      const current = await profileService.exportStatus(id);
      if (current.status !== "ready") throw new Error("This export is unavailable until its status is ready.");
      const payload = await profileService.downloadExport(id);
      const file = new File(Paths.cache, "fluora-export-" + id + ".json");
      if (!file.exists) file.create();
      await file.write(JSON.stringify(payload, null, 2));
      if (!(await Sharing.isAvailableAsync())) throw new Error("File sharing is unavailable on this device.");
      try { await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Save your Fluora data copy" }); } finally { if (file.exists) file.delete(); }
    }, "Export file opened for saving or sharing.");
  };
  return <Page title="Your data copy" back><Text style={ui.text}>Request a personal copy of your Fluora data. Your export is generated when you download it.</Text>
    <ResourceState resource={resource} /><ActionState action={action} />
    <Button primary label={action.busy ? "Please wait…" : "Request export"} disabled={action.busy} onPress={() => void action.run(async () => { await profileService.createExport(); await resource.refresh(); }, "Your data copy is ready.")} />
    <Heading>EXPORT REQUESTS</Heading>
    {!resource.loading && !resource.error && (resource.data?.length ? resource.data.map(e => <Card key={e.id}>
      <Text style={{ color: "#20352B", fontWeight: "800" }}>Data copy · {new Date(e.createdAt).toLocaleDateString()}</Text>
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
