import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type Props = { children: ReactNode; scroll?: boolean; contentTopPadding?: number; fixedFooter?: ReactNode; fixedFooterBottom?: number };

export function ScreenContainer({ children, scroll = true, contentTopPadding = 16, fixedFooter, fixedFooterBottom = 82 }: Props) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(0, contentTopPadding - Math.max(0, insets.top - 24));
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: topPadding }]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { paddingTop: topPadding }]}>{children}</View>
      )}
      {fixedFooter ? <View style={[styles.fixedFooter, { bottom: fixedFooterBottom }]}>{fixedFooter}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#ffffff" },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 112 },
  fixedFooter: { left: 24, position: "absolute", right: 24 },
});
