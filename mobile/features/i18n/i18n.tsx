import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import {
  Alert as NativeAlert,
  Platform,
  Pressable as NativePressable,
  Switch as NativeSwitch,
  Text as NativeText,
  TextInput as NativeTextInput,
  type AlertButton,
  type PressableProps,
  type TextInputProps,
  type TextProps,
  type SwitchProps,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../auth/AuthContext";
import { isAppLanguage, setTranslationLanguage, translateCopy, translateCurrentCopy, type AppLanguage } from "./translations";
export { formatUiDate, translateCopy } from "./translations";

const STORAGE_KEY = "fluora.ui-language";

type LocaleContextValue = {
  language: AppLanguage;
  ready: boolean;
  setLanguage: (language: AppLanguage) => void;
  clearPreview: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function AppLanguageProvider({ children }: { children: ReactNode }) {
  const { settings } = useAuth();
  const [deviceLanguage, setDeviceLanguage] = useState<AppLanguage>("en");
  const [previewLanguage, setPreviewLanguage] = useState<AppLanguage | null>(null);
  const [ready, setReady] = useState(Platform.OS === "web");
  const accountLanguage = isAppLanguage(settings?.appLanguage) ? settings.appLanguage : null;

  useEffect(() => {
    if (Platform.OS === "web") return;
    let mounted = true;
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((stored) => {
        if (mounted && isAppLanguage(stored)) setDeviceLanguage(stored);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!accountLanguage) return;
    if (settings?.onboardingCompleted === false && previewLanguage) return;
    setDeviceLanguage(accountLanguage);
    if (settings?.onboardingCompleted) setPreviewLanguage(null);
    else setPreviewLanguage((current) => current === accountLanguage ? null : current);
    if (Platform.OS !== "web") {
      void SecureStore.setItemAsync(STORAGE_KEY, accountLanguage).catch(() => {});
    }
  }, [accountLanguage, settings?.onboardingCompleted, previewLanguage]);

  const language = settings?.onboardingCompleted === true
    ? accountLanguage ?? deviceLanguage
    : previewLanguage ?? accountLanguage ?? deviceLanguage;
  setTranslationLanguage(language);

  const setLanguage = useCallback((next: AppLanguage) => {
    setPreviewLanguage(next);
    setDeviceLanguage(next);
    if (Platform.OS !== "web") {
      void SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
    }
  }, []);

  const clearPreview = useCallback(() => setPreviewLanguage(null), []);
  const value = useMemo(() => ({ language, ready, setLanguage, clearPreview }), [language, ready, setLanguage, clearPreview]);

  if (!ready) return null;
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useAppLanguage(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useAppLanguage must be used within an AppLanguageProvider");
  return context;
}

export function translateChildren(children: ReactNode, language: AppLanguage): ReactNode {
  if (typeof children === "string") return translateCopy(children, language);
  if (Array.isArray(children)) {
    if (children.every((child) => typeof child === "string" || typeof child === "number")) {
      const text = children.map(String).join("");
      const translated = translateCopy(text, language);
      if (translated !== text) return translated;
    }
    return children.map((child) => typeof child === "string" ? translateCopy(child, language) : child);
  }
  return children;
}

type LocalizedTextProps = TextProps & { translate?: boolean };

export const LocalizedText = forwardRef<ComponentRef<typeof NativeText>, LocalizedTextProps>(function LocalizedText(
  { children, accessibilityLabel, accessibilityHint, translate = true, ...props },
  ref,
) {
  const { language } = useAppLanguage();
  return (
    <NativeText
      {...props}
      ref={ref}
      accessibilityLabel={accessibilityLabel ? translateCopy(accessibilityLabel, language) : accessibilityLabel}
      accessibilityHint={accessibilityHint ? translateCopy(accessibilityHint, language) : accessibilityHint}
    >
      {translate ? translateChildren(children, language) : children}
    </NativeText>
  );
});

export const LocalizedTextInput = forwardRef<ComponentRef<typeof NativeTextInput>, TextInputProps>(function LocalizedTextInput(
  { placeholder, accessibilityLabel, accessibilityHint, ...props },
  ref,
) {
  const { language } = useAppLanguage();
  return (
    <NativeTextInput
      {...props}
      ref={ref}
      placeholder={placeholder ? translateCopy(placeholder, language) : placeholder}
      accessibilityLabel={accessibilityLabel ? translateCopy(accessibilityLabel, language) : accessibilityLabel}
      accessibilityHint={accessibilityHint ? translateCopy(accessibilityHint, language) : accessibilityHint}
    />
  );
});

export const LocalizedPressable = forwardRef<ComponentRef<typeof NativePressable>, PressableProps>(function LocalizedPressable(
  { accessibilityLabel, accessibilityHint, ...props },
  ref,
) {
  const { language } = useAppLanguage();
  return (
    <NativePressable
      {...props}
      ref={ref}
      accessibilityLabel={accessibilityLabel ? translateCopy(accessibilityLabel, language) : accessibilityLabel}
      accessibilityHint={accessibilityHint ? translateCopy(accessibilityHint, language) : accessibilityHint}
    />
  );
});

export const LocalizedSwitch = forwardRef<ComponentRef<typeof NativeSwitch>, SwitchProps>(function LocalizedSwitch(
  { accessibilityLabel, accessibilityHint, ...props },
  ref,
) {
  const { language } = useAppLanguage();
  return (
    <NativeSwitch
      {...props}
      ref={ref}
      accessibilityLabel={accessibilityLabel ? translateCopy(accessibilityLabel, language) : accessibilityLabel}
      accessibilityHint={accessibilityHint ? translateCopy(accessibilityHint, language) : accessibilityHint}
    />
  );
});

export const LocalizedAlert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: Parameters<typeof NativeAlert.alert>[3]): void {
    NativeAlert.alert(
      translateCurrentCopy(title),
      message ? translateCurrentCopy(message) : message,
      buttons?.map((button) => ({ ...button, text: button.text ? translateCurrentCopy(button.text) : button.text })),
      options,
    );
  },
};

export function t(copy: string): string {
  return translateCurrentCopy(copy);
}
