import { createContext, useContext, type ComponentProps } from "react";
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput } from "react-native";
import { useAuth } from "../features/auth/AuthContext";
import { lessonTextScale } from "../features/profile/learning-preferences";
import { translateChildren, translateCopy, useAppLanguage } from "../features/i18n/i18n";

const InsideText = createContext(false);

/** Add the app's lesson-size setting while retaining native OS font scaling. */
export function LearningText({ style, children, accessibilityLabel, accessibilityHint, translate = true, ...props }: ComponentProps<typeof NativeText> & { translate?: boolean }) {
  const { settings } = useAuth();
  const { language } = useAppLanguage();
  const nested = useContext(InsideText);
  const flat = StyleSheet.flatten(style);
  const scale = lessonTextScale(settings?.textSize);
  const fontSize = flat?.fontSize ?? (nested ? undefined : 14);
  return <InsideText.Provider value={true}><NativeText {...props}
    accessibilityLabel={accessibilityLabel ? translateCopy(accessibilityLabel, language) : accessibilityLabel}
    accessibilityHint={accessibilityHint ? translateCopy(accessibilityHint, language) : accessibilityHint}
    style={[style, {
    ...(fontSize !== undefined ? { fontSize: fontSize * scale } : {}),
    ...(flat?.lineHeight !== undefined ? { lineHeight: flat.lineHeight * scale } : {}),
  }]}>{translate ? translateChildren(children, language) : children}</NativeText></InsideText.Provider>;
}

export function LearningTextInput({ style, placeholder, accessibilityLabel, accessibilityHint, ...props }: ComponentProps<typeof NativeTextInput>) {
  const { settings } = useAuth();
  const { language } = useAppLanguage();
  const flat = StyleSheet.flatten(style);
  const scale = lessonTextScale(settings?.textSize);
  return <NativeTextInput {...props}
    placeholder={placeholder ? translateCopy(placeholder, language) : placeholder}
    accessibilityLabel={accessibilityLabel ? translateCopy(accessibilityLabel, language) : accessibilityLabel}
    accessibilityHint={accessibilityHint ? translateCopy(accessibilityHint, language) : accessibilityHint}
    style={[style, { fontSize: (flat?.fontSize ?? 16) * scale,
    ...(flat?.lineHeight !== undefined ? { lineHeight: flat.lineHeight * scale } : {}),
  }]} />;
}
