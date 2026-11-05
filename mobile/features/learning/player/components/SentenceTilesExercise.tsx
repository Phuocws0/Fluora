import { LearningText as Text } from "../../../../components/LearningText";
import { StyleSheet, View } from "react-native";
import { LocalizedPressable as Pressable } from "../../../i18n/i18n";

type Props = {
  content: unknown;
  tokens: string[];
  onChange: (tokens: string[]) => void;
  disabled?: boolean;
};

function parseTiles(content: unknown): string[] {
  if (content && typeof content === "object" && "tiles" in content) {
    const raw = (content as { tiles: unknown }).tiles;
    if (Array.isArray(raw)) {
      return raw.filter((item): item is string => typeof item === "string");
    }
  }
  return [];
}

export function SentenceTilesExercise({ content, tokens, onChange, disabled = false }: Props) {
  const allTiles = parseTiles(content);

  // Track availability of each tile in the bank by counting occurrences
  const tokenCounts = tokens.reduce<Record<string, number>>((acc, token) => {
    acc[token] = (acc[token] ?? 0) + 1;
    return acc;
  }, {});

  const bankTileUsages: Record<number, boolean> = {};
  const currentCounts: Record<string, number> = {};

  allTiles.forEach((tile, index) => {
    const usedCount = tokenCounts[tile] ?? 0;
    const current = currentCounts[tile] ?? 0;
    if (current < usedCount) {
      bankTileUsages[index] = true;
      currentCounts[tile] = current + 1;
    } else {
      bankTileUsages[index] = false;
    }
  });

  const handleTilePress = (tile: string) => {
    if (disabled) return;
    onChange([...tokens, tile]);
  };

  const handleRemoveToken = (indexToRemove: number) => {
    if (disabled) return;
    onChange(tokens.filter((_, idx) => idx !== indexToRemove));
  };

  const handleClear = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>YOUR SENTENCE:</Text>
      <View style={styles.arrangedArea}>
        {tokens.length === 0 ? (
          <Text style={styles.placeholderText}>Tap words below to form your sentence</Text>
        ) : (
          <View style={styles.tokenRow}>
            {tokens.map((token, index) => (
              <Pressable
                key={`${token}-${index}`}
                disabled={disabled}
                onPress={() => handleRemoveToken(index)}
                style={styles.arrangedToken}
              >
                <Text style={styles.arrangedTokenText} translate={false}>{token}</Text>
                <Text style={styles.removeIcon}>×</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {tokens.length > 0 && !disabled ? (
        <Pressable accessibilityRole="button" onPress={handleClear} style={styles.clearButton}>
          <Text style={styles.clearText}>Clear sentence</Text>
        </Pressable>
      ) : null}

      <Text style={styles.sectionLabel}>WORD BANK:</Text>
      <View style={styles.bankArea}>
        {allTiles.map((tile, index) => {
          const isUsed = bankTileUsages[index];
          return (
            <Pressable
              key={`bank-${tile}-${index}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: isUsed || disabled }}
              disabled={isUsed || disabled}
              onPress={() => handleTilePress(tile)}
              style={[
                styles.bankTile,
                isUsed && styles.bankTileUsed,
                disabled && styles.disabled,
              ]}
            >
              <Text style={[styles.bankTileText, isUsed && styles.bankTileTextUsed]} translate={false}>
                {tile}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 14 },
  sectionLabel: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#65766c",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  arrangedArea: {
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 76,
    padding: 12,
  },
  placeholderText: {
    fontFamily: "Nunito_400Regular",
    color: "#8d9d94",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
  },
  tokenRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  arrangedToken: {
    alignItems: "center",
    backgroundColor: "#eaf8de",
    borderColor: "#236c19",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  arrangedTokenText: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 15,
    fontWeight: "800",
  },
  removeIcon: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#236c19",
    fontSize: 16,
    fontWeight: "800",
    marginTop: -2,
  },
  clearButton: {
    alignSelf: "flex-end",
    marginBottom: 14,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearText: {
    fontFamily: "Nunito_700Bold",
    color: "#65766c",
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  bankArea: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  bankTile: {
    backgroundColor: "#ffffff",
    borderColor: "#c5d6bf",
    borderRadius: 14,
    borderWidth: 1.5,
    elevation: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  bankTileUsed: {
    backgroundColor: "#f5f8f4",
    borderColor: "#e5ece2",
    elevation: 0,
    opacity: 0.35,
    shadowOpacity: 0,
  },
  bankTileText: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#20352b",
    fontSize: 15,
    fontWeight: "800",
  },
  bankTileTextUsed: {
    color: "#8d9d94",
  },
  disabled: {
    opacity: 0.5,
  },
});
