import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "../../components/ScreenContainer";
import { ContentState } from "../../components/ContentState";
import { ApiError, getJson, postJson } from "../../services/api";
import { getAccessToken, saveAccessToken } from "../../services/session";
import { font, garden } from "../profile/garden-ui";

export const ui = StyleSheet.create({
  title: {
    fontFamily: font.heavy,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 32,
    color: garden.ink,
    marginVertical: 8,
  },
  heading: {
    fontFamily: font.bold,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 25,
    color: garden.ink,
    marginVertical: 12,
  },
  text: { color: garden.muted, fontFamily: font.body, fontSize: 16, lineHeight: 24 },
  small: { color: garden.muted, fontFamily: font.bold, fontSize: 12, lineHeight: 18 },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginVertical: 8,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: garden.line,
    padding: 16,
    marginVertical: 6,
    gap: 6,
  },
  input: {
    borderColor: garden.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: "#20352b",
    backgroundColor: "white",
    fontFamily: font.body,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 46,
    marginVertical: 6,
  },
  button: {
    backgroundColor: garden.mint,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  buttonText: { color: garden.forest, fontFamily: font.bold, fontWeight: "700", fontSize: 14, lineHeight: 20 },
  danger: { backgroundColor: "#ffe9e5" },
  disabled: { opacity: 0.45 },
  error: {
    color: "#a82c20",
    padding: 12,
    backgroundColor: "#fff0ed",
    borderRadius: 12,
    marginVertical: 6,
  },
  success: {
    color: "#236c19",
    padding: 12,
    backgroundColor: "#eaf8de",
    borderRadius: 12,
    marginVertical: 6,
  },
});
export function Button({
  label,
  onPress,
  disabled,
  danger,
  primary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[ui.button, primary && { backgroundColor: garden.green, alignItems: "center", minHeight: 56 }, danger && ui.danger, disabled && ui.disabled]}
    >
      <Text style={[ui.buttonText, primary && { fontFamily: "Nunito_400Regular", color: garden.ink, fontSize: 16, lineHeight: 24 }]}>{label}</Text>
    </Pressable>
  );
}
export function Card({ children }: { children: ReactNode }) {
  return <View style={ui.card}>{children}</View>;
}
export function Heading({ children }: { children: ReactNode }) {
  return <Text style={ui.heading}>{children}</Text>;
}
export function Copy({ children }: { children: ReactNode }) {
  return <Text style={ui.text}>{children}</Text>;
}
export function Page({
  title,
  children,
  back = false,
  onBack,
}: {
  title: string;
  children: ReactNode;
  back?: boolean;
  onBack?: () => void;
}) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenContainer>
        {back && (
          <Button
            label="‹ Back"
            onPress={
              onBack ??
              (() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace("/(tabs)/learn")
              )
            }
          />
        )}
        <Text style={ui.title}>{title}</Text>
        {children}
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
export function Empty({ text = "Nothing here yet." }: { text?: string }) {
  return <ContentState title="No results" message={text} />;
}
export function failure(cause: unknown): string {
  if (cause instanceof ApiError && cause.status === 401)
    return "Your session expired. Please sign in again.";
  if (cause instanceof ApiError && cause.status === 404)
    return "This item is missing, unavailable, or private. Refresh the list.";
  return cause instanceof Error
    ? cause.message
    : "Something went wrong. Please try again.";
}
export function confirmAction(
  title: string,
  message: string,
  action: () => void,
) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Confirm", style: "destructive", onPress: action },
  ]);
}
export function useAction() {
  const lock = useRef(false);
  const alive = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const run = async (
    operation: () => Promise<unknown>,
    message = "Saved successfully.",
  ): Promise<boolean> => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await operation();
      if (alive.current) setSuccess(message);
      return true;
    } catch (e) {
      if (alive.current) setError(failure(e));
      return false;
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const reset = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);
  return { busy, error, success, run, reset };
}
export function ActionState({
  action,
}: {
  action: ReturnType<typeof useAction>;
}) {
  return (
    <>
      {action.busy && <ActivityIndicator color="#236c19" />}
      {action.error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {action.error}
        </Text>
      )}
      {action.success && (
        <Text accessibilityLiveRegion="polite" style={ui.success}>
          {action.success}
        </Text>
      )}
    </>
  );
}
export function useResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const serial = useRef(0);
  const refresh = useCallback(async () => {
    const ticket = ++serial.current;
    setLoading(true);
    setError(null);
    try {
      const value = await load();
      if (ticket === serial.current) setData(value);
    } catch (e) {
      if (ticket === serial.current) {
        setData(null);
        setError(failure(e));
      }
    } finally {
      if (ticket === serial.current) setLoading(false);
    }
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      setData(null);
      void refresh();
      return () => {
        serial.current++;
      };
    }, [refresh]),
  );
  return { data, loading, error, refresh };
}
export function ResourceState({
  resource,
}: {
  resource: {
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
  };
}) {
  return (
    <>
      {resource.loading && <ActivityIndicator color="#236c19" />}
      {resource.error && (
        <ContentState
          title="Could not load"
          message={resource.error}
          actionLabel="Try again"
          onAction={() => void resource.refresh()}
        />
      )}
    </>
  );
}
export type Field = {
  key: string;
  label: string;
  value?: string;
  required?: boolean;
  max?: number;
  min?: number;
  numeric?: boolean;
  choices?: string[];
  multiline?: boolean;
};
export type EditorSpec = {
  title: string;
  fields: Field[];
  save: (values: Record<string, string>) => Promise<void>;
};
export function Editor({
  spec,
  close,
}: {
  spec: EditorSpec | null;
  close: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<string | null>(null);
  const action = useAction();
  useEffect(() => {
    if (spec) {
      action.reset();
      setValues(
        Object.fromEntries(
          spec.fields.map((f) => [f.key, f.value ?? f.choices?.[0] ?? ""]),
        ),
      );
      setValidation(null);
    }
  }, [spec, action.reset]);
  if (!spec) return null;
  const save = async () => {
    const cleaned = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v.trim()]),
    );
    for (const f of spec.fields) {
      const v = cleaned[f.key] ?? "";
      if (
        (f.required && !v) ||
        (v && f.min && v.length < f.min) ||
        (f.max && v.length > f.max) ||
        (f.numeric && (!v || !Number.isFinite(Number(v))))
      ) {
        setValidation(`Check ${f.label}.`);
        return;
      }
    }
    setValidation(null);
    if (await action.run(() => spec.save(cleaned))) close();
  };
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!action.busy) close();
      }}
    >
      <KeyboardAvoidingView
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: "#0007",
          padding: 16,
        }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 20,
            padding: 20,
            maxHeight: "90%",
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <Heading>{spec.title}</Heading>
            {spec.fields.map((f) => (
              <View key={f.key}>
                <Copy>{f.label}</Copy>
                {f.choices ? (
                  <View style={ui.row}>
                    {f.choices.map((c) => (
                      <Button
                        key={c}
                        label={`${values[f.key] === c ? "✓ " : ""}${c}`}
                        disabled={action.busy}
                        onPress={() => setValues((v) => ({ ...v, [f.key]: c }))}
                      />
                    ))}
                  </View>
                ) : (
                  <TextInput
                    accessibilityLabel={f.label}
                    style={ui.input}
                    value={values[f.key] ?? ""}
                    editable={!action.busy}
                    onChangeText={(text) =>
                      setValues((v) => ({ ...v, [f.key]: text }))
                    }
                    maxLength={f.max}
                    multiline={f.multiline}
                    keyboardType={f.numeric ? "numeric" : "default"}
                    autoCapitalize="sentences"
                  />
                )}
              </View>
            ))}
            {validation && <Text style={ui.error}>{validation}</Text>}
            <ActionState action={action} />
            <View style={ui.row}>
              <Button label="Cancel" disabled={action.busy} onPress={close} />
              <Button
                label={action.busy ? "Saving…" : "Save"}
                disabled={action.busy}
                onPress={() => void save()}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export type SessionUser = { id: string; displayName: string | null };
// Temporary entry for these private features while the main email sign-in screen is unfinished.
// Uses the same backend/session store; never a development-token bypass.
export function SessionGate({
  children,
  onCancel,
  feature = "League and Tutor",
}: {
  children: (user: SessionUser) => ReactNode;
  onCancel?: () => void;
  feature?: string;
}) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const action = useAction();
  const check = useCallback(async () => {
    // Do not unmount an active private conversation on every tab focus.
    try {
      if (await getAccessToken())
        setUser((await getJson<{ user: SessionUser }>("/users/me")).user);
      else setUser(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setUser(null);
      else throw e;
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void action.run(check, "");
    }, [check]),
  );
  if (loading)
    return (
      <Page title="Fluora">
        <ActivityIndicator />
      </Page>
    );
  if (user)
    return (
      <View key={user.id} style={{ flex: 1 }}>
        {children(user)}
      </View>
    );
  return (
    <Page title="Welcome back">
      {onCancel && (
        <Button label="‹ Back" onPress={onCancel} disabled={action.busy} />
      )}
      <Copy>Sign in to open your private {feature} features.</Copy>
      <TextInput
        accessibilityLabel="Email"
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={ui.input}
      />
      <TextInput
        accessibilityLabel="Password"
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={ui.input}
      />
      <Button
        label="Sign in"
        disabled={action.busy || !email.trim() || !password}
        onPress={() =>
          void action.run(async () => {
            const auth = await postJson<{ token: string; user: SessionUser }>(
              "/auth/login",
              { email: email.trim(), password },
            );
            await saveAccessToken(auth.token);
            setPassword("");
            setUser(auth.user);
          }, "")
        }
      />
      <ActionState action={action} />
    </Page>
  );
}
