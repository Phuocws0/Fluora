import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, Switch, Text, TextInput, View } from "react-native";
import { ActionState, Button, Card, Copy, Empty, Heading, ResourceState, confirmAction, ui, useAction, useResource } from "../../features/shared/feature-ui";
import { Learner, Settings, WeeklyDay, profileService } from "../../features/profile/service";
import { clearAccessToken } from "../../services/session";
import { font, garden, GardenCaption, GardenCard, GardenSubtitle, Page } from "./garden-ui";

const ink = "#20352B";
const green = "#236C19";

function go(section: string) { router.push({ pathname: "/settings/[section]", params: { section } }); }

function Tile({ title, detail, section }: { title: string; detail: string; section: string; icon?: React.ComponentProps<typeof Ionicons>["name"] }) {
  return <Pressable onPress={() => go(section)} accessibilityRole="button" accessibilityHint={detail} style={{ backgroundColor: "white", borderRadius: 16, minHeight: 50, paddingHorizontal: 14, marginBottom: 8, flexDirection: "row", alignItems: "center" }}>
    <Text style={{ color: green, fontFamily: font.bold, fontSize: 15, lineHeight: 22, flex: 1 }}>{title}</Text>
  </Pressable>;
}

function Toggle({ title, detail, value, onChange }: { title: string; detail?: string; value: boolean; onChange: (v: boolean) => void }) {
  return <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, minHeight: 76, marginVertical: 7, flexDirection: "row", alignItems: "center", gap: 10 }}>
    <View style={{ flex: 1 }}><Text style={{ color: ink, fontFamily: font.bold, fontSize: 15, lineHeight: 22 }}>{title}</Text><Text style={{ color: garden.muted, fontFamily: font.bold, fontSize: 12, lineHeight: 18 }}>{detail ?? (value ? "On" : "Off")}</Text></View>
    <Switch accessibilityLabel={title} value={value} onValueChange={onChange} trackColor={{ true: garden.green, false: garden.line }} />
  </View>;
}

function Choice<T extends string>({ title, value, choices, onChange }: { title: string; value: T; choices: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return <View style={{ marginVertical: 12 }}><Text style={ui.heading}>{title}</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{choices.map(c =>
    <Pressable key={c.value} onPress={() => onChange(c.value)} accessibilityRole="radio" accessibilityState={{ selected: value === c.value }}
      style={{ borderWidth: 1, borderColor: value === c.value ? green : "#DCE7D8", backgroundColor: value === c.value ? "#E8F8DF" : "white", borderRadius: 15, paddingVertical: 11, paddingHorizontal: 14 }}>
      <Text style={{ color: ink, fontWeight: "700" }}>{c.label}</Text>
    </Pressable>)}</View></View>;
}

function TextSizePicker({ value, onChange }: { value: Settings["textSize"]; onChange: (value: Settings["textSize"]) => void }) {
  const sizes: { value: Settings["textSize"]; label: string }[] = [
    { value: "default", label: "100%" },
    { value: "large", label: "120%" },
    { value: "extra_large", label: "140%" },
  ];
  return <View style={{ marginVertical: 18 }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={ui.heading}>Text size</Text><Text style={[ui.heading, { color: green }]}>{sizes.find(size => size.value === value)?.label}</Text></View>
    <View style={{ height: 36, justifyContent: "center" }}>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: garden.line, position: "absolute", left: 0, right: 0 }} />
      <View style={{ height: 8, borderRadius: 4, backgroundColor: garden.green, position: "absolute", left: 0, width: value === "default" ? "17%" : value === "large" ? "50%" : "84%" }} />
      <View style={{ flexDirection: "row" }}>{sizes.map(size => <Pressable key={size.value} accessibilityRole="radio" accessibilityLabel={`Text size ${size.label}`} accessibilityState={{ selected: value === size.value }} onPress={() => onChange(size.value)} style={{ flex: 1, alignItems: "center", justifyContent: "center", height: 36 }}>
        <View style={{ height: 28, width: 28, borderRadius: 14, backgroundColor: value === size.value ? garden.forest : "transparent" }} />
      </Pressable>)}
    </View>
    </View>
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: garden.muted, fontFamily: font.bold, fontSize: 12 }}>A</Text><Text style={{ color: garden.muted, fontFamily: font.heavy, fontSize: 24 }}>A</Text></View>
  </View>;
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

  return <Page title="Make learning your own" action={{ label: "App language", onPress: () => go("language") }}><GardenSubtitle>Manage your account and learning preferences.</GardenSubtitle><ResourceState resource={resource} />
    <GardenCaption>ACCOUNT</GardenCaption>
    <Tile icon="person-outline" title="Profile & identity" detail="Your name and bio" section="edit-profile" />
    <Tile icon="bar-chart-outline" title="Learning analytics" detail="Weekly activity and XP breakdown" section="analytics" />
    <Tile icon="shield-checkmark-outline" title="Sign-in & security" detail="Password, sessions and account deletion" section="security" />
    <Tile icon="language-outline" title="App language" detail="Language used in Fluora" section="language" />
    <GardenCaption>LEARNING EXPERIENCE</GardenCaption>
    <Tile icon="flag-outline" title="Goals & commitment" detail="Daily target, promise and Flo companion" section="goals" />
    <Tile icon="notifications-outline" title="Reminders" detail="Choose what reaches you" section="notifications" />
    <Tile icon="accessibility-outline" title="Accessibility" detail="Text size, motion and captions" section="accessibility" />
    <Tile icon="eye-outline" title="Privacy & sharing" detail="Your progress and tutor history" section="privacy" />
    <Tile icon="leaf-outline" title="Focus mode" detail="A quieter lesson view" section="focus" />
    <Tile icon="cellular-outline" title="Low bandwidth" detail="Use less data" section="low-bandwidth" />
    <Tile icon="heart-outline" title="Wellbeing" detail="Set a break reminder" section="wellbeing" />
    <GardenCaption>HELP & DATA</GardenCaption>
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
  const photoInput = useRef<TextInput>(null);
  const [name, setName] = useState(""); const [bio, setBio] = useState(""); const [avatar, setAvatar] = useState(""); const [validation, setValidation] = useState("");
  useEffect(() => { if (resource.data) { setName(resource.data.displayName || ""); setBio(resource.data.bio || ""); setAvatar(resource.data.avatarUrl || ""); } }, [resource.data]);
  const save = async () => {
    if (!name.trim() || name.trim().length > 50) return setValidation("Display name must be 1–50 characters.");
    if (bio.trim().length > 160) return setValidation("Bio must be 160 characters or fewer.");
    if (avatar.trim() && (!/^https?:\/\/\S+$/i.test(avatar.trim()) || avatar.trim().length > 500)) return setValidation("Photo URL must be a valid http(s) link.");
    setValidation("");
    if (await action.run(() => profileService.updateProfile({ displayName: name.trim(), bio: bio.trim() || null, avatarUrl: avatar.trim() || null }), "Profile saved.")) await resource.refresh();
  };
  return <Page title="Make it yours" action={{ label: action.busy ? "Saving…" : "Save changes", onPress: () => void save(), disabled: action.busy || !resource.data }}><GardenSubtitle>Your name and avatar help friends find you.</GardenSubtitle><ResourceState resource={resource} />
    {resource.data && <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 20, marginBottom: 30 }}>
        {avatar ? <Image source={{ uri: avatar }} style={{ width: 68, height: 68, borderRadius: 34 }} /> : <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: garden.mint, alignItems: "center", justifyContent: "center" }}><Text style={{ color: green, fontFamily: font.bold, fontSize: 18 }}>{(name || resource.data.email).slice(0, 1).toUpperCase()}</Text></View>}
        <View style={{ flex: 1 }}><Text style={{ color: ink, fontFamily: font.heavy, fontSize: 24, lineHeight: 32 }}>{name || "Learner"}</Text><Pressable accessibilityRole="button" onPress={() => photoInput.current?.focus()} style={{ backgroundColor: garden.mint, borderRadius: 16, padding: 8, marginTop: 6, maxWidth: 160 }}><Text style={{ color: green, fontFamily: font.bold, fontSize: 12 }}>Change photo link</Text></Pressable></View>
      </View>
      <GardenCard><Text style={{ color: ink, fontFamily: font.bold, fontSize: 12 }}>Display name</Text><TextInput style={{ color: garden.muted, fontFamily: font.body, fontSize: 16, minHeight: 32 }} accessibilityLabel="Display name" maxLength={50} value={name} onChangeText={setName} /></GardenCard>
      <GardenCard><Text style={{ color: ink, fontFamily: font.bold, fontSize: 12 }}>Email address</Text><Text style={{ color: garden.muted, fontFamily: font.body, fontSize: 16, marginTop: 4 }}>{resource.data.email}</Text></GardenCard>
      <GardenCard tint={garden.blue}><Text style={{ color: green, fontFamily: font.bold, fontSize: 15 }}>ABOUT ME</Text><TextInput style={{ color: garden.muted, fontFamily: font.body, fontSize: 14, minHeight: 70, textAlignVertical: "top", marginTop: 8 }} accessibilityLabel="About me" multiline maxLength={160} value={bio} onChangeText={setBio} placeholder="What are you learning for?" /></GardenCard>
      <GardenCaption>PHOTO LINK</GardenCaption><TextInput ref={photoInput} style={ui.input} accessibilityLabel="Photo URL" maxLength={500} autoCapitalize="none" keyboardType="url" value={avatar} onChangeText={setAvatar} placeholder="https://..." />
      {!!validation && <Text style={ui.error}>{validation}</Text>}<ActionState action={action} />
    </>}
  </Page>;
}

function Analytics() {
  const resource = useResource(profileService.weeklyAnalytics);
  const progress = useResource(profileService.progress);
  const days = resource.data ?? [];
  const totalXp = days.reduce((sum, d) => sum + d.xp, 0);
  const totalAnswers = days.reduce((sum, d) => sum + d.answers, 0);
  const peakXp = Math.max(1, ...days.map(day => day.xp));

  return <Page title="Look how far you've grown!" action={{ label: "View daily goal", onPress: () => go("goals") }}>
    <GardenSubtitle>THIS WEEK · YOUR LAST 7 DAYS</GardenSubtitle>
    <ResourceState resource={resource} />
    {!resource.loading && !resource.error && <>
      <View style={{ height: 200, backgroundColor: garden.mint, borderRadius: 24, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
        {days.map(day => <View key={day.date} style={{ width: 32, alignItems: "center", gap: 8 }}>
          <View style={{ width: 24, height: Math.max(4, Math.round(144 * day.xp / peakXp)), borderRadius: 8, backgroundColor: garden.green }} />
          <Text style={{ color: green, fontFamily: font.bold, fontSize: 12 }}>{new Date(day.date + "T12:00:00").toLocaleDateString("en", { weekday: "narrow" })}</Text>
        </View>)}
      </View>
      <GardenCard><Text style={{ color: ink, fontFamily: font.heavy, fontSize: 18 }}>{totalXp} XP</Text><Text style={{ color: garden.muted, fontFamily: font.body, fontSize: 14 }}>Earned this week</Text></GardenCard>
      <GardenCard><Text style={{ color: ink, fontFamily: font.heavy, fontSize: 18 }}>{totalAnswers} answers</Text><Text style={{ color: garden.muted, fontFamily: font.body, fontSize: 14 }}>Practice completed this week</Text></GardenCard>
      <GardenCard><Text style={{ color: ink, fontFamily: font.heavy, fontSize: 18 }}>{progress.data?.completedLessons ?? "—"} lessons</Text><Text style={{ color: garden.muted, fontFamily: font.body, fontSize: 14 }}>Total completed lessons</Text></GardenCard>
      <GardenCaption>DAILY BREAKDOWN</GardenCaption>
      {days.length ? days.map(day => <View key={day.date} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }}><Text style={{ color: ink, fontFamily: font.bold }}>{new Date(day.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</Text><Text style={{ color: green, fontFamily: font.bold }}>{day.xp} XP</Text></View>) : <Empty text="No learning activity recorded in the past 7 days." />}
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
    accessibility: "Learn more comfortably",
    "large-type": "Larger text preview",
    focus: "Focus mode",
    "low-bandwidth": "Low-bandwidth mode",
    wellbeing: "Wellbeing timer",
    privacy: "Your data belongs to you",
    notifications: "Just the right reminders",
    goals: "Goals & commitment",
  };

  const subtitles: Record<string, string> = {
    accessibility: "Adjust the experience to suit your needs.",
    "large-type": "See how lesson text will appear.",
    privacy: "You're in control of what you share.",
    notifications: "Choose when you'd like a little nudge.",
    "low-bandwidth": "Download content and save data.",
    wellbeing: "Rest briefly before continuing.",
    focus: "A calmer lesson view with fewer distractions.",
  };

  const saved = resource.data;
  const dirty = !!draft && !!saved && fields[section]?.some(k => draft[k] !== saved[k]);

  const save = async () => {
    if (!draft || !fields[section]) return;
    if (section === "notifications" && draft.reminderEnabled && !draft.reminderTime) return setError("Choose a reminder time before saving.");
    if (section === "notifications" && draft.reminderTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.reminderTime)) return setError("Use HH:MM for reminder time.");
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

  return <Page title={titles[section] || "Preferences"} eyebrow={section === "low-bandwidth" || section === "wellbeing" ? "ACCESSIBILITY" : "YOUR PERSONAL SPACE"} onBack={back} action={{ label: action.busy ? "Saving…" : "Save preferences", onPress: () => void save(), disabled: action.busy || !dirty || (section === "wellbeing" && draft?.wellbeingTimerMinutes !== null && (!Number.isInteger(draft?.wellbeingTimerMinutes) || (draft?.wellbeingTimerMinutes ?? 0) < 5 || (draft?.wellbeingTimerMinutes ?? 0) > 180)) }}>
    {subtitles[section] && <GardenSubtitle>{subtitles[section]}</GardenSubtitle>}<ResourceState resource={resource} />
    {draft && <>
      {section === "language" && <Choice title="App language" value={draft.appLanguage} choices={[{ value: "en", label: "English" }, { value: "vi", label: "Tiếng Việt" }]} onChange={v => set("appLanguage", v)} />}
      
      {section === "accessibility" || section === "large-type" ? <>
        <GardenCaption>LIVE PREVIEW</GardenCaption>
        <View style={{ backgroundColor: "#EAF8DE", borderRadius: 16, padding: 14, minHeight: 152 }}>
          <Text style={{ color: green, fontSize: draft.textSize === "extra_large" ? 28 : draft.textSize === "large" ? 24 : 20, fontWeight: "800", lineHeight: draft.textSize === "extra_large" ? 37 : 32 }}>A little, every day.</Text>
          <Text style={{ color: ink, fontSize: draft.textSize === "extra_large" ? 22 : draft.textSize === "large" ? 18 : 16, fontWeight: "700", lineHeight: draft.textSize === "extra_large" ? 30 : 25 }}>This is how lesson text will appear.</Text>
        </View>
        <TextSizePicker value={draft.textSize} onChange={v => set("textSize", v)} />
        {section === "accessibility" && <>
          <Toggle title="Reduced motion" detail="Fewer animated effects" value={draft.reducedMotion} onChange={v => set("reducedMotion", v)} />
          <Toggle title="Listening captions" detail="Show captions with audio lessons" value={draft.captions} onChange={v => set("captions", v)} />
        </>}
      </> : null}

      {section === "focus" && <><GardenCard tint={garden.mint}><Text style={{ fontSize: 20, fontFamily: font.heavy, color: ink }}>What did you learn today?</Text><Text style={ui.text}>A quieter view for your lessons.</Text></GardenCard><Toggle title="Focus mode" value={draft.focusMode} onChange={v => set("focusMode", v)} /></>}

      {section === "low-bandwidth" && <><GardenCaption>DATA SAVER</GardenCaption><Text style={{ color: green, fontFamily: font.heavy, fontSize: 32, lineHeight: 40 }}>{draft.lowBandwidth ? "Data saver on" : "Standard"}</Text><GardenSubtitle>Detailed data usage is not yet available.</GardenSubtitle>
        <View style={{ height: 150, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginVertical: 12 }}>{[30, 47, 64, 81, 33, 50, 67].map((height, index) => <View key={index} style={{ flexDirection: "row", alignItems: "flex-end", gap: 3 }}><View style={{ width: 17, height, borderRadius: 4, backgroundColor: garden.line }} /><View style={{ width: 17, height: draft.lowBandwidth ? Math.max(10, Math.round(height * 0.3)) : height, borderRadius: 4, backgroundColor: garden.green }} /></View>)}</View>
        <Text style={{ color: garden.muted, fontFamily: font.bold, fontSize: 12, marginBottom: 22 }}>Illustration of normal usage and data saver</Text>
        <GardenCard tint={garden.mint}><Text style={{ color: green, fontFamily: font.bold }}>Text-first lessons · {draft.lowBandwidth ? "ON" : "OFF"}</Text></GardenCard>
        <GardenCard><Text style={{ color: green, fontFamily: font.bold }}>Defer large media · {draft.lowBandwidth ? "ON" : "OFF"}</Text></GardenCard>
        <Toggle title="Low-bandwidth mode" detail="Prefer lighter lesson content" value={draft.lowBandwidth} onChange={v => set("lowBandwidth", v)} />
      </>}

      {section === "wellbeing" && <><GardenCaption>A HEALTHY PAUSE</GardenCaption><View style={{ alignSelf: "center", width: 204, height: 204, borderRadius: 102, backgroundColor: garden.mint, alignItems: "center", justifyContent: "center", marginVertical: 28 }}><View style={{ width: 134, height: 134, borderRadius: 67, backgroundColor: "white", alignItems: "center", justifyContent: "center" }}><Text style={{ color: green, fontFamily: font.heavy, textAlign: "center", fontSize: 38 }}>{draft.wellbeingTimerMinutes ? String(draft.wellbeingTimerMinutes).padStart(2, "0") + ":00" : "Off"}</Text></View></View><Text style={{ color: ink, fontFamily: font.heavy, textAlign: "center", fontSize: 21 }}>Break reminder</Text><View style={{ flexDirection: "row", gap: 14, marginVertical: 28 }}><Text style={{ flex: 1, textAlign: "center", backgroundColor: garden.blue, color: "#286CB5", borderRadius: 16, padding: 8, fontFamily: font.bold, fontSize: 12 }}>Breathe in · 4 sec</Text><Text style={{ flex: 1, textAlign: "center", backgroundColor: garden.mint, color: green, borderRadius: 16, padding: 8, fontFamily: font.bold, fontSize: 12 }}>Breathe out · 6 sec</Text></View><Text style={{ color: garden.muted, fontFamily: font.body, textAlign: "center", marginBottom: 18 }}>Return when you feel ready.</Text>
        <Choice title="Break reminder" value={String(draft.wellbeingTimerMinutes ?? "off")} choices={["off", "5", "15", "30", "60"].map(v => ({ value: v, label: v === "off" ? "Off" : v + " min" }))} onChange={v => set("wellbeingTimerMinutes", v === "off" ? null : Number(v))} />
        <Copy>Custom interval (5–180 minutes)</Copy><TextInput style={ui.input} accessibilityLabel="Custom break interval" keyboardType="number-pad" value={draft.wellbeingTimerMinutes === null ? "" : String(draft.wellbeingTimerMinutes)} onChangeText={v => set("wellbeingTimerMinutes", v ? Number(v) : null)} />
      </>}

      {section === "privacy" && <><GardenCaption>WHO CAN SEE YOUR LEARNING?</GardenCaption>
        <View style={{ flexDirection: "row", gap: 9, marginBottom: 22 }}>{([{ value: "private", label: "Only me", detail: "Private" }, { value: "friends", label: "Friends", detail: "Connected" }, { value: "public", label: "Everyone", detail: "Public" }] as const).map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected: draft.progressVisibility === option.value }} onPress={() => set("progressVisibility", option.value)} style={{ flex: 1, minHeight: 100, backgroundColor: draft.progressVisibility === option.value ? garden.mint : "#F7FAF6", borderRadius: 16, padding: 12 }}><Text style={{ color: green, fontFamily: font.bold, fontSize: 15 }}>{option.label}</Text><Text style={{ color: garden.muted, fontFamily: font.bold, fontSize: 12, marginTop: 8 }}>{option.detail}</Text></Pressable>)}</View>
        <GardenCaption>DATA PERMISSIONS</GardenCaption>
        <Toggle title="Find me in discovery" value={draft.discoverable} onChange={v => set("discoverable", v)} />
        <Toggle title="Save tutor history" detail="Keep past AI tutor conversations" value={draft.saveTutorHistory} onChange={v => set("saveTutorHistory", v)} />
        <View style={{ marginTop: 12, marginBottom: 8 }}><Button label="Clear tutor chat history" danger disabled={action.busy} onPress={clearTutor} /></View>
        <Tile icon="download-outline" title="Export my data" detail="Get a personal copy" section="exports" />
      </>}

      {section === "notifications" && <>
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

  return <Page title="Keep your account safe" action={{ label: action.busy ? "Updating…" : "Change password", onPress: () => void changePassword(), disabled: action.busy || !resource.data }}><GardenSubtitle>Manage your sign-in details and connected devices.</GardenSubtitle><ResourceState resource={resource} />
    {resource.data && <><View style={{ flexDirection: "row", alignItems: "center", gap: 20, marginTop: 8, marginBottom: 24 }}><View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: garden.mint, alignItems: "center", justifyContent: "center" }}><Text style={{ color: green, fontFamily: font.heavy, fontSize: 32 }}>✓</Text></View><View style={{ flex: 1 }}><Text style={{ color: green, fontFamily: font.heavy, fontSize: 24 }}>Account protected</Text><Text style={{ color: garden.muted, fontFamily: font.bold, fontSize: 12 }}>{resource.data.hasPassword ? "Password set" : "Google sign-in"} · {resource.data.email}</Text></View></View>
      <GardenCaption>SIGNED-IN SESSIONS</GardenCaption><ResourceState resource={sessions} />
      {!sessions.loading && !sessions.error && (sessions.data?.length ? sessions.data.map(s => <GardenCard key={s.id} tint={s.current ? garden.mint : "white"}>
        <Text style={{ color: green, fontFamily: font.bold, fontSize: 15 }}>{s.deviceName || s.userAgent || "Device"}{s.current ? " · Active now" : ""}</Text>
        <Text style={{ color: garden.muted, fontFamily: font.bold, fontSize: 12, marginTop: 6 }}>Last used {new Date(s.lastUsedAt).toLocaleString()}</Text>
        {!s.current && <Button label="Sign out device" danger disabled={action.busy} onPress={() => confirmAction("Sign out this device?", "This session will be revoked.", () => void action.run(async () => { await profileService.revokeSession(s.id); await sessions.refresh(); }, "Device signed out."))} />}
      </GardenCard>) : <Empty text="No active sessions." />)}
      <GardenCaption>CHANGE PASSWORD</GardenCaption>
      {resource.data.hasPassword && <TextInput accessibilityLabel="Current password" secureTextEntry style={ui.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" />}
      <TextInput accessibilityLabel="New password" secureTextEntry style={ui.input} value={newPassword} onChangeText={setNewPassword} placeholder="New password (8–128 characters)" />
      {!!validation && <Text style={ui.error}>{validation}</Text>}
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
