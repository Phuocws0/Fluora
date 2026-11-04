import { createContext, useContext, type ComponentProps } from "react";
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput } from "react-native";
import { useAuth } from "../features/auth/AuthContext";
import { lessonTextScale } from "../features/profile/learning-preferences";

const InsideText = createContext(false);

/** Add the app's lesson-size setting while retaining native OS font scaling. */
export function LearningText({ style, ...props }: ComponentProps<typeof NativeText>) {
  const { settings } = useAuth();
  const nested = useContext(InsideText);
  const flat = StyleSheet.flatten(style);
  const scale = lessonTextScale(settings?.textSize);
  const fontSize = flat?.fontSize ?? (nested ? undefined : 14);
  return <InsideText.Provider value={true}><NativeText {...props} style={[style, {
    ...(fontSize !== undefined ? { fontSize: fontSize * scale } : {}),
    ...(flat?.lineHeight !== undefined ? { lineHeight: flat.lineHeight * scale } : {}),
  }]} /></InsideText.Provider>;
}

export function LearningTextInput({ style, ...props }: ComponentProps<typeof NativeTextInput>) {
  const { settings } = useAuth();
  const flat = StyleSheet.flatten(style);
  const scale = lessonTextScale(settings?.textSize);
  return <NativeTextInput {...props} style={[style, { fontSize: (flat?.fontSize ?? 16) * scale,
    ...(flat?.lineHeight !== undefined ? { lineHeight: flat.lineHeight * scale } : {}),
  }]} />;
}
