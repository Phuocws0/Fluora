import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, Switch, Text, TextInput, View } from "react-native";
import { ActionState, Button, Card, Copy, Empty, Heading, Page, ResourceState, confirmAction, ui, useAction, useResource } from "../../features/shared/feature-ui";
import { Learner, Settings, WeeklyDay, profileService } from "../../features/profile/service";
import { clearAccessToken } from "../../services/session";

const ink = "#20352B";
const green = "#236C19";

function go(section: string) { router.push({ pathname: "/settings/[section]", params: { section } }); }

function Tile({ title, detail, section, icon }: { title: string; detail: string; section: string; icon: React.ComponentProps<typeof Ionicons>["name"] }) {
  return <Pressable onPress={() => go(section)} accessibilityRole="button" style={{ backgroundColor: "#F5F9F2", borderRadius: 20, padding: 17, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 13 }}>
    <Ionicons name={icon} size={22} color={green} />
    <View style={{ flex: 1 }}><Text style={{ color: ink, fontSize: 16, fontWeight: "700" }}>{title}</Text><Text style={ui.small}>{detail}</Text></View>
    <Ionicons name="chevron-forward" size={18} color="#688173" />
  </Pressable>;
}

function Toggle({ title, detail, value, onChange }: { title: string; detail?: string; value: boolean; onChange: (v: boolean) => void }) {
  return <View style={{ backgroundColor: "#F5F9F2", borderRadius: 18, padding: 15, marginVertical: 5, flexDirection: "row", alignItems: "center", gap: 10 }}>
    <View style={{ flex: 1 }}><Text style={{ color: ink, fontSize: 15, fontWeight: "700" }}>{title}</Text>{detail && <Text style={ui.small}>{detail}</Text>}</View>
    <Switch accessibilityLabel={title} value={value} onValueChange={onChange} trackColor={{ true: "#69BD58" }} />
  </View>;
}

function Choice<T extends string>({ title, value, choices, onChange }: { title: string; value: T; choices: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return <View style={{ marginVertical: 12 }}><Text style={ui.heading}>{title}</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{choices.map(c =>
    <Pressable key={c.value} onPress={() => onChange(c.value)} accessibilityRole="radio" accessibilityState={{ selected: value === c.value }}
      style={{ borderWidth: 1, borderColor: value === c.value ? green : "#DCE7D8", backgroundColor: value === c.value ? "#E8F8DF" : "white", borderRadius: 15, paddingVertical: 11, paddingHorizontal: 14 }}>
      <Text style={{ color: ink, fontWeight: "700" }}>{c.label}</Text>
    </Pressable>)}</View></View>;
}

function General() {
  const resource = useResource(profileService.settings);
  const action = useAction();
  const reset = () => confirmAction("Reset all preferences?", "This will discard your changes and restore default preferences. Course language, starting level and onboarding stay as they are.", () => void action.run(async () => { await profileService.resetSettings(); await resource.refresh(); }, "Preferences reset."));
  const signOut = () => confirmAction("Sign out of Fluora?", "You will need to sign in again to access your account.", () => void action.run(async () => {
    try { await profileService.logout(); } catch {}
    await clearAccessToken();
    router.replace("/(auth)/welcome");
  }, "Signed out."));

  return <Page title="Settings" back><Text style={ui.text}>Make learning your own.</Text><ResourceState resource={resource} />
    <Heading>ACCOUNT</Heading>
    <Tile icon="person-outline" title="Profile & identity" detail="Your name and bio" section="edit-profile" />
    <Tile icon="bar-chart-outline" title="Learning analytics" detail="Weekly activity and XP breakdown" section="analytics" />
    <Tile icon="shield-checkmark-outline" title="Sign-in & security" detail="Password, sessions and account deletion" section="security" />
    <Tile icon="language-outline" title="App language" detail="Language used in Fluora" section="language" />
    <Heading>LEARNING EXPERIENCE</Heading>
    <Tile icon="flag-outline" title="Goals & commitment" detail="Daily target, promise and Flo companion" section="goals" />
    <Tile icon="notifications-outline" title="Reminders" detail="Choose what reaches you" section="notifications" />
    <Tile icon="accessibility-outline" title="Accessibility" detail="Text size, motion and captions" section="accessibility" />
    <Tile icon="eye-outline" title="Privacy & sharing" detail="Your progress and tutor history" section="privacy" />
    <Tile icon="leaf-outline" title="Focus mode" detail="A quieter lesson view" section="focus" />
    <Tile icon="cellular-outline" title="Low bandwidth" detail="Use less data" section="low-bandwidth" />
    <Tile icon="heart-outline" title="Wellbeing" detail="Set a break reminder" section="wellbeing" />
    <Heading>HELP & DATA</Heading>
    <Tile icon="help-circle-outline" title="Help center" detail="Articles and support" section="help" />
    <Tile icon="download-outline" title="Export my data" detail="Download a personal JSON copy" section="exports" />
    <ActionState action={action} />
    <View style={{ marginTop: 16, gap: 10 }}>
      <Button label="Reset preferences" danger disabled={action.busy || resource.loading} onPress={reset} />
      <Button label="Sign out" disabled={action.busy} onPress={signOut} />
    </View>
  </Page>;
}

function EditProfile() {
  const resource = useResource(profileService.profile);
  const action = useAction();
  const [name, setName] = useState(""); const [bio, setBio] = useState(""); const [avatar, setAvatar] = useState(""); const [validation, setValidation] = useState("");
  useEffect(() => { if (resource.data) { setName(resource.data.displayName || ""); setBio(resource.data.bio || ""); setAvatar(resource.data.avatarUrl || ""); } }, [resource.data]);
  const save = async () => {
    if (!name.trim() || name.trim().length > 50) return setValidation("Display name must be 1–50 characters.");
    if (bio.trim().length > 160) return setValidation("Bio must be 160 characters or fewer.");
    if (avatar.trim() && (!/^https?:\/\/\S+$/i.test(avatar.trim()) || avatar.trim().length > 500)) return setValidation("Photo URL must be a valid http(s) link.");
    setValidation("");
    if (await action.run(() => profileService.updateProfile({ displayName: name.trim(), bio: bio.trim() || null, avatarUrl: avatar.trim() || null }), "Profile saved.")) await resource.refresh();
  };
  return <Page title="Edit profile" back><Text style={ui.text}>Make it yours.</Text><ResourceState resource={resource} />
    {resource.data && <>
      <View style={{ alignItems: "center", marginVertical: 22 }}>{avatar ? <Image source={{ uri: avatar }} style={{ width: 88, height: 88, borderRadius: 44 }} /> : <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: "#E8F5DF", alignItems: "center", justifyContent: "center" }}><Ionicons name="person" color={green} size={38} /></View>}</View>
      <Copy>Display name</Copy><TextInput style={ui.input} accessibilityLabel="Display name" maxLength={50} value={name} onChangeText={setName} />
      <Copy>About me</Copy><TextInput style={[ui.input, { minHeight: 96 }]} accessibilityLabel="About me" multiline maxLength={160} value={bio} onChangeText={setBio} placeholder="What are you learning for?" />
      <Copy>Photo URL</Copy><TextInput style={ui.input} accessibilityLabel="Photo URL" maxLength={500} autoCapitalize="none" keyboardType="url" value={avatar} onChangeText={setAvatar} placeholder="https://..." />
      <Text style={ui.small}>Your email: {resource.data.email}</Text>
      {!!validation && <Text style={ui.error}>{validation}</Text>}<ActionState action={action} />
      <View style={{ marginTop: 12 }}><Button primary label={action.busy ? "Saving…" : "Save changes"} disabled={action.busy} onPress={() => void save()} /></View>
    </>}
  </Page>;
}

function Analytics() {
  const resource = useResource(profileService.weeklyAnalytics);
  const days = resource.data ?? [];
  const totalXp = days.reduce((sum, d) => sum + d.xp, 0);
  const totalAnswers = days.reduce((sum, d) => sum + d.answers, 0);

  return <Page title="Learning analytics" back>
    <Text style={ui.text}>Your learning progress over the past 7 days.</Text>
    <ResourceState resource={resource} />
    {!resource.loading && !resource.error && <>
      <View style={{ flexDirection: "row", gap: 10, marginVertical: 14 }}>
        <View style={{ flex: 1, backgroundColor: "#EAF8DE", borderRadius: 18, padding: 16, alignItems: "center" }}>
          <Text style={{ color: green, fontSize: 26, fontWeight: "800" }}>{totalXp}</Text>
          <Text style={{ color: green, fontSize: 10, fontWeight: "800", letterSpacing: 0.7 }}>WEEKLY XP</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: "#EAF8DE", borderRadius: 18, padding: 16, alignItems: "center" }}>
          <Text style={{ color: green, fontSize: 26, fontWeight: "800" }}>{totalAnswers}</Text>
          <Text style={{ color: green, fontSize: 10, fontWeight: "800", letterSpacing: 0.7 }}>ANSWERS</Text>
        </View>
      </View>
      <Heading>DAILY BREAKDOWN</Heading>
      {days.length ? days.map(d => (
        <Card key={d.date}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: ink, fontWeight: "700", fontSize: 15 }}>{new Date(d.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</Text>
            <Text style={{ color: green, fontWeight: "800" }}>+{d.xp} XP</Text>
          </View>
          <Text style={ui.small}>{d.answers} {d.answers === 1 ? "answer submitted" : "answers submitted"}</Text>
        </Card>
      )) : <Empty text="No learning activity recorded in the past 7 days." />}
    </>}
  </Page>;
}

type EditableKey =
  | "appLanguage"
  | "textSize"
  | "reducedMotion"
  | "captions"
  | "focusMode"
  | "lowBandwidth"
  | "wellbeingTimerMinutes"
  | "progressVisibility"
  | "discoverable"
  | "saveTutorHistory"
  | "reminderEnabled"
  | "reminderTime"
  | "notifyFriendRequests"
  | "notifyRewards"
  | "notifyReminders"
  | "dailyGoalMinutes"
  | "dailyTimeBudgetMinutes"
  | "learningPromise"
  | "floCompanion";

function Preferences({ section }: { section: string }) {
  const resource = useResource(profileService.settings);
  const action = useAction();
  const [draft, setDraft] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { if (resource.data) setDraft(resource.data); }, [resource.data]);
  const set = <K extends EditableKey>(key: K, value: Settings[K]) => setDraft(d => d ? { ...d, [key]: value } : d);

  const fields: Record<string, EditableKey[]> = {
    language: ["appLanguage"],
    accessibility: ["textSize", "reducedMotion", "captions"],
    "large-type": ["textSize"],
    focus: ["focusMode"],
    "low-bandwidth": ["lowBandwidth"],
    wellbeing: ["wellbeingTimerMinutes"],
    privacy: ["progressVisibility", "discoverable", "saveTutorHistory"],
    notifications: ["reminderEnabled", "reminderTime", "notifyFriendRequests", "notifyRewards", "notifyReminders"],
    goals: ["dailyGoalMinutes", "dailyTimeBudgetMinutes", "learningPromise", "floCompanion"],
  };

  const titles: Record<string, string> = {
    language: "App language",
    accessibility: "Accessibility",
    "large-type": "Larger text",
    focus: "Focus mode",
    "low-bandwidth": "Low bandwidth",
    wellbeing: "Wellbeing timer",
    privacy: "Privacy & sharing",
    notifications: "Reminders",
    goals: "Goals & commitment",
  };

  const saved = resource.data;
  const dirty = !!draft && !!saved && fields[section]?.some(k => draft[k] !== saved[k]);

  const save = async () => {
    if (!draft || !fields[section]) return;
    if (section === "notifications" && draft.reminderEnabled && draft.reminderTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.reminderTime)) return setError("Use HH:MM for reminder time.");
    if (section === "goals") {
      if (draft.dailyGoalMinutes !== null && (!Number.isInteger(draft.dailyGoalMinutes) || draft.dailyGoalMinutes < 1 || draft.dailyGoalMinutes > 240)) return setError("Daily goal must be 1–240 minutes.");
      if (draft.dailyTimeBudgetMinutes !== null && (!Number.isInteger(draft.dailyTimeBudgetMinutes) || draft.dailyTimeBudgetMinutes < 1 || draft.dailyTimeBudgetMinutes > 240)) return setError("Time budget must be 1–240 minutes.");
      if (draft.learningPromise && draft.learningPromise.trim().length > 200) return setError("Learning promise must be 200 characters or fewer.");
    }
    setError("");
    const patch = Object.fromEntries(fields[section].map(k => [k, draft[k]])) as Partial<Settings>;
    if (await action.run(() => profileService.updateSettings(patch), "Preferences saved.")) await resource.refresh();
  };

  const clearTutor = () => confirmAction("Clear tutor chat history?", "All past Flo conversations will be permanently deleted. This cannot be undone.", () => void action.run(async () => {
    await profileService.clearTutorChats();
  }, "Tutor chat history cleared."));

  const back = () => {
    if (dirty) Alert.alert("Discard changes?", "Your unsaved preferences will be lost.", [{ text: "Keep editing", style: "cancel" }, { text: "Discard", style: "destructive", onPress: () => router.back() }]);
    else router.back();
  };

  return <Page title={titles[section] || "Preferences"} back onBack={back}><ResourceState resource={resource} />
    {draft && <>
      {section === "language" && <Choice title="App language" value={draft.appLanguage} choices={[{ value: "en", label: "English" }, { value: "vi", label: "Tiếng Việt" }]} onChange={v => set("appLanguage", v)} />}
      
      {section === "accessibility" || section === "large-type" ? <>
        <Text style={ui.text}>Learn more comfortably.</Text>
        <Card><Text style={{ color: ink, fontSize: draft.textSize === "extra_large" ? 24 : draft.textSize === "large" ? 20 : 16, lineHeight: draft.textSize === "extra_large" ? 33 : 27 }}>A little, every day. This is how lesson text will appear.</Text></Card>
        <Choice title="Text size" value={draft.textSize} choices={[{ value: "default", label: "Standard" }, { value: "large", label: "Large" }, { value: "extra_large", label: "Extra large" }]} onChange={v => set("textSize", v)} />
        {section === "accessibility" && <>
          <Toggle title="Reduced motion" detail="Fewer animated effects" value={draft.reducedMotion} onChange={v => set("reducedMotion", v)} />
          <Toggle title="Listening captions" detail="Show captions with audio lessons" value={draft.captions} onChange={v => set("captions", v)} />
        </>}
      </> : null}

      {section === "focus" && <><Text style={ui.text}>A calmer lesson view with fewer distractions.</Text><Card><Text style={{ fontSize: 20, color: ink }}>What did you learn today?</Text><Text style={ui.text}>Preview: navigation is hidden while you focus.</Text></Card><Toggle title="Focus mode" value={draft.focusMode} onChange={v => set("focusMode", v)} /></>}

      {section === "low-bandwidth" && <><Text style={ui.text}>Use less data during lessons.</Text><Card><Ionicons name="cellular-outline" color={green} size={40} /><Text style={ui.text}>Media is reduced when low-bandwidth mode is on.</Text></Card><Toggle title="Low-bandwidth mode" detail="Prefer lighter lesson content" value={draft.lowBandwidth} onChange={v => set("lowBandwidth", v)} /></>}

      {section === "wellbeing" && <><Text style={ui.text}>Choose how often to take a break.</Text><Card><Text style={{ color: green, textAlign: "center", fontSize: 42, fontWeight: "800" }}>{draft.wellbeingTimerMinutes ? String(draft.wellbeingTimerMinutes).padStart(2, "0") + ":00" : "Off"}</Text></Card>
        <Choice title="Break reminder" value={String(draft.wellbeingTimerMinutes ?? "off")} choices={["off", "5", "15", "30", "60"].map(v => ({ value: v, label: v === "off" ? "Off" : v + " min" }))} onChange={v => set("wellbeingTimerMinutes", v === "off" ? null : Number(v))} />
        <Copy>Custom interval (5–180 minutes)</Copy><TextInput style={ui.input} accessibilityLabel="Custom break interval" keyboardType="number-pad" value={draft.wellbeingTimerMinutes === null ? "" : String(draft.wellbeingTimerMinutes)} onChangeText={v => set("wellbeingTimerMinutes", v ? Number(v) : null)} />
      </>}

      {section === "privacy" && <><Text style={ui.text}>Your data belongs to you.</Text>
        <Choice title="Who can see my progress?" value={draft.progressVisibility} choices={[{ value: "private", label: "Only me" }, { value: "friends", label: "Friends" }, { value: "public", label: "Everyone" }]} onChange={v => set("progressVisibility", v)} />
        <Toggle title="Find me in discovery" value={draft.discoverable} onChange={v => set("discoverable", v)} />
        <Toggle title="Save tutor history" detail="Keep past AI tutor conversations" value={draft.saveTutorHistory} onChange={v => set("saveTutorHistory", v)} />
        <View style={{ marginTop: 12, marginBottom: 8 }}><Button label="Clear tutor chat history" danger disabled={action.busy} onPress={clearTutor} /></View>
        <Tile icon="download-outline" title="Export my data" detail="Get a personal copy" section="exports" />
      </>}

      {section === "notifications" && <><Text style={ui.text}>Just the right reminders.</Text>
        <Toggle title="Daily study reminder" value={draft.reminderEnabled} onChange={v => set("reminderEnabled", v)} />
        {draft.reminderEnabled && <><Copy>Reminder time (HH:MM)</Copy><TextInput style={ui.input} accessibilityLabel="Reminder time" value={draft.reminderTime || ""} onChangeText={v => set("reminderTime", v || null)} placeholder="19:00" /></>}
        <Toggle title="Friend activity" value={draft.notifyFriendRequests} onChange={v => set("notifyFriendRequests", v)} />
        <Toggle title="Rewards" value={draft.notifyRewards} onChange={v => set("notifyRewards", v)} />
        <Toggle title="Learning reminders" value={draft.notifyReminders} onChange={v => set("notifyReminders", v)} />
      </>}

      {section === "goals" && <><Text style={ui.text}>Set your personal learning targets and companion.</Text>
        <Choice title="Daily learning goal" value={String(draft.dailyGoalMinutes ?? "none")} choices={[{ value: "none", label: "None" }, { value: "15", label: "15 min" }, { value: "30", label: "30 min" }, { value: "45", label: "45 min" }, { value: "60", label: "60 min" }]} onChange={v => set("dailyGoalMinutes", v === "none" ? null : Number(v))} />
        <Choice title="Daily time budget" value={String(draft.dailyTimeBudgetMinutes ?? "none")} choices={[{ value: "none", label: "None" }, { value: "15", label: "15 min" }, { value: "30", label: "30 min" }, { value: "60", label: "60 min" }]} onChange={v => set("dailyTimeBudgetMinutes", v === "none" ? null : Number(v))} />
        <Choice title="Flo Companion" value={draft.floCompanion ?? "sprout"} choices={[{ value: "sprout", label: "Sprout Flo" }, { value: "bloom", label: "Bloom Flo" }, { value: "sage", label: "Sage Flo" }]} onChange={v => set("floCompanion", v)} />
        <Copy>Learning promise</Copy><TextInput style={ui.input} accessibilityLabel="Learning promise" maxLength={200} value={draft.learningPromise ?? ""} onChangeText={v => set("learningPromise", v.trim() ? v : null)} placeholder="E.g. Practice 15 minutes before breakfast" />
      </>}

      {section === "wellbeing" && draft.wellbeingTimerMinutes !== null && (!Number.isInteger(draft.wellbeingTimerMinutes) || draft.wellbeingTimerMinutes < 5 || draft.wellbeingTimerMinutes > 180) && <Text style={ui.error}>Choose 5–180 minutes.</Text>}
      {!!error && <Text style={ui.error}>{error}</Text>}<ActionState action={action} />
      <View style={{ marginTop: 18 }}><Button primary label={action.busy ? "Saving…" : "Save changes"} disabled={action.busy || !dirty || (section === "wellbeing" && draft.wellbeingTimerMinutes !== null && (!Number.isInteger(draft.wellbeingTimerMinutes) || draft.wellbeingTimerMinutes < 5 || draft.wellbeingTimerMinutes > 180))} onPress={() => void save()} /></View>
    </>}
  </Page>;
}

function Security() {
  const resource = useResource(profileService.profile);
  const sessions = useResource(profileService.sessions);
  const action = useAction();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [validation, setValidation] = useState("");

  const changePassword = async () => {
    if (resource.data?.hasPassword && !currentPassword) return setValidation("Enter your current password.");
    if (newPassword.length < 8 || newPassword.length > 128) return setValidation("New password must be 8–128 characters.");
    setValidation("");
    if (await action.run(() => profileService.changePassword(currentPassword, newPassword), "Password changed. Other devices were signed out.")) { setCurrentPassword(""); setNewPassword(""); await sessions.refresh(); }
  };

  const signOut = () => confirmAction("Sign out of Fluora?", "You will need to sign in again to access your account.", () => void action.run(async () => {
    try { await profileService.logout(); } catch {}
    await clearAccessToken();
    router.replace("/(auth)/welcome");
  }, "Signed out."));

  return <Page title="Account security" back><Text style={ui.text}>Keep your account safe.</Text><ResourceState resource={resource} />
    {resource.data && <><Card><Text style={{ color: ink, fontWeight: "700" }}>Account protected</Text><Copy>{resource.data.email}</Copy></Card>
      <Heading>Change password</Heading>
      {resource.data.hasPassword && <TextInput accessibilityLabel="Current password" secureTextEntry style={ui.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" />}
      <TextInput accessibilityLabel="New password" secureTextEntry style={ui.input} value={newPassword} onChangeText={setNewPassword} placeholder="New password (8–128 characters)" />
      {!!validation && <Text style={ui.error}>{validation}</Text>}
      <Button label="Change password" disabled={action.busy} onPress={() => void changePassword()} />
      <Heading>Signed-in devices</Heading><ResourceState resource={sessions} />
      {!sessions.loading && !sessions.error && (sessions.data?.length ? sessions.data.map(s => <Card key={s.id}>
        <Text style={{ color: ink, fontWeight: "700" }}>{s.deviceName || s.userAgent || "Device"}{s.current ? " · This device" : ""}</Text>
        <Text style={ui.small}>Last used {new Date(s.lastUsedAt).toLocaleString()}</Text>
        {!s.current && <Button label="Sign out device" danger disabled={action.busy} onPress={() => confirmAction("Sign out this device?", "This session will be revoked.", () => void action.run(async () => { await profileService.revokeSession(s.id); await sessions.refresh(); }, "Device signed out."))} />}
      </Card>) : <Empty text="No active sessions." />)}
      <View style={{ marginTop: 12, marginBottom: 12 }}>
        <Button label="Sign out this account" disabled={action.busy} onPress={signOut} />
      </View>
      <Heading>Delete account</Heading><Copy>This permanently removes your account and personal data. Enter your email to confirm.</Copy>
      <TextInput accessibilityLabel="Confirm email" autoCapitalize="none" keyboardType="email-address" style={ui.input} value={email} onChangeText={setEmail} placeholder={resource.data.email} />
      <ActionState action={action} />
      <Button label="Delete my account" danger disabled={action.busy || email.trim().toLowerCase() !== resource.data.email.toLowerCase()} onPress={() => confirmAction("Permanently delete account?", "Your account and personal data will be deleted. This cannot be undone.", () => void action.run(async () => { await profileService.deleteAccount(email.trim()); await clearAccessToken(); router.replace("/(auth)/welcome"); }, "Account deleted."))} />
    </>}
  </Page>;
}

export { General, EditProfile, Preferences, Security, Analytics };
