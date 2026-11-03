import { StyleSheet, View } from "react-native";

type Props = {
  active: boolean;
  meteringLevel?: number; // 0.0 to 1.0
  barCount?: number;
};

export function WaveformVisualizer({ active, meteringLevel = 0.1, barCount = 20 }: Props) {
  const bars = Array.from({ length: barCount }, (_, index) => {
    // Generate organic wave contour using sine & metering
    const normalizedIndex = index / barCount;
    const wave = Math.sin(normalizedIndex * Math.PI);
    const baseHeight = active ? 12 + wave * meteringLevel * 48 : 8;
    const clampedHeight = Math.min(60, Math.max(6, baseHeight));

    return (
      <View
        key={index}
        style={[
          styles.bar,
          { height: clampedHeight },
          active ? styles.barActive : styles.barIdle,
        ]}
      />
    );
  });

  return <View style={styles.container}>{bars}</View>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#f5f8f4",
    borderColor: "#dee8d9",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    height: 70,
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
  },
  bar: {
    borderRadius: 3,
    width: 4,
  },
  barActive: {
    backgroundColor: "#58cc02",
  },
  barIdle: {
    backgroundColor: "#c5d6bf",
  },
});
