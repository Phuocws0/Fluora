import type { ComponentProps } from "react";
import { Modal } from "react-native";
import { useAuth } from "../features/auth/AuthContext";

export function PreferenceModal({ animationType, ...props }: ComponentProps<typeof Modal>) {
  const { settings } = useAuth();
  return <Modal {...props} animationType={settings?.reducedMotion ? "none" : animationType} />;
}
