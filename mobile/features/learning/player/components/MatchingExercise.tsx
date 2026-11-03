import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  content: unknown;
  pairs: Array<{ left: string; right: string }>;
  onChange: (pairs: Array<{ left: string; right: string }>) => void;
  disabled?: boolean;
};

function parseMatchingItems(content: unknown): { left: string[]; right: string[] } {
  if (content && typeof content === "object") {
    const obj = content as Record<string, unknown>;
    const left = Array.isArray(obj.leftItems)
      ? obj.leftItems.filter((i): i is string => typeof i === "string")
      : [];
    const right = Array.isArray(obj.rightItems)
      ? obj.rightItems.filter((i): i is string => typeof i === "string")
      : [];
    return { left, right };
  }
  return { left: [], right: [] };
}

const pairColors = [
  { bg: "#eaf8de", border: "#236c19", text: "#20352b" },
  { bg: "#eaf4ff", border: "#1967d2", text: "#103463" },
  { bg: "#fff4e5", border: "#e67700", text: "#5c3000" },
  { bg: "#f3e8ff", border: "#7e22ce", text: "#3b0764" },
];

export function MatchingExercise({ content, pairs, onChange, disabled = false }: Props) {
  const { left: leftItems, right: rightItems } = parseMatchingItems(content);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  // Map each paired left item to its pair index
  const leftPairIndex = new Map<string, number>();
  const rightPairIndex = new Map<string, number>();

  pairs.forEach((pair, index) => {
    leftPairIndex.set(pair.left, index);
    rightPairIndex.set(pair.right, index);
  });

  const handleLeftPress = (left: string) => {
    if (disabled) return;
    // If already paired, unpair it
    if (leftPairIndex.has(left)) {
      onChange(pairs.filter((p) => p.left !== left));
      setSelectedLeft(null);
      return;
    }
    if (selectedLeft === left) {
      setSelectedLeft(null);
    } else {
      setSelectedLeft(left);
    }
  };

  const handleRightPress = (right: string) => {
    if (disabled) return;
    // If already paired, unpair it
    if (rightPairIndex.has(right)) {
      onChange(pairs.filter((p) => p.right !== right));
      return;
    }
    // If a left item is selected, form pair
    if (selectedLeft) {
      onChange([...pairs.filter((p) => p.left !== selectedLeft), { left: selectedLeft, right }]);
      setSelectedLeft(null);
    }
  };

  const handleReset = () => {
    if (disabled) return;
    onChange([]);
    setSelectedLeft(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.instruction}>
        {selectedLeft
          ? `Select the matching definition for “${selectedLeft}”`
          : "Tap a phrase on the left, then tap its match on the right."}
      </Text>

      <View style={styles.columns}>
        {/* Left Column */}
        <View style={styles.column}>
          <Text style={styles.columnHeader}>TERMS</Text>
          {leftItems.map((item) => {
            const pairIdx = leftPairIndex.get(item);
            const isPaired = pairIdx !== undefined;
            const isSelected = selectedLeft === item;
            const styleTheme = isPaired
              ? pairColors[pairIdx % pairColors.length]
              : null;

            return (
              <Pressable
                key={`left-${item}`}
                accessibilityRole="button"
                disabled={disabled}
                onPress={() => handleLeftPress(item)}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                  isPaired && styleTheme && {
                    backgroundColor: styleTheme.bg,
                    borderColor: styleTheme.border,
                  },
                  disabled && styles.disabled,
                ]}
              >
                <Text
                  style={[
                    styles.cardText,
                    isSelected && styles.cardTextSelected,
                    isPaired && styleTheme && { color: styleTheme.text },
                  ]}
                >
                  {item}
                </Text>
                {isPaired ? <Text style={styles.badgeText}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>

        {/* Right Column */}
        <View style={styles.column}>
          <Text style={styles.columnHeader}>DEFINITIONS</Text>
          {rightItems.map((item) => {
            const pairIdx = rightPairIndex.get(item);
            const isPaired = pairIdx !== undefined;
            const styleTheme = isPaired
              ? pairColors[pairIdx % pairColors.length]
              : null;

            return (
              <Pressable
                key={`right-${item}`}
                accessibilityRole="button"
                disabled={disabled}
                onPress={() => handleRightPress(item)}
                style={[
                  styles.card,
                  isPaired && styleTheme && {
                    backgroundColor: styleTheme.bg,
                    borderColor: styleTheme.border,
                  },
                  disabled && styles.disabled,
                ]}
              >
                <Text
                  style={[
                    styles.cardText,
                    isPaired && styleTheme && { color: styleTheme.text },
                  ]}
                >
                  {item}
                </Text>
                {isPaired ? <Text style={styles.badgeText}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {pairs.length > 0 && !disabled ? (
        <Pressable accessibilityRole="button" onPress={handleReset} style={styles.resetButton}>
          <Text style={styles.resetText}>Reset all matches</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 14 },
  instruction: {
    color: "#65766c",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginBottom: 14,
  },
  columns: {
    flexDirection: "row",
    gap: 12,
  },
  column: {
    flex: 1,
    gap: 8,
  },
  columnHeader: {
    color: "#236c19",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderRadius: 14,
    borderWidth: 1.5,
    minHeight: 64,
    padding: 10,
    justifyContent: "center",
  },
  cardSelected: {
    backgroundColor: "#eaf8de",
    borderColor: "#236c19",
  },
  cardText: {
    color: "#20352b",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  cardTextSelected: {
    color: "#236c19",
    fontWeight: "800",
  },
  badgeText: {
    color: "#236c19",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  resetButton: {
    alignSelf: "center",
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resetText: {
    color: "#65766c",
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  disabled: {
    opacity: 0.6,
  },
});
