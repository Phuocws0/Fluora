import { LearningText as Text } from "../../../../components/LearningText";
import { StyleSheet, View } from "react-native";
import { font, garden } from "../../../profile/garden-ui";
import { LocalizedPressable as Pressable } from "../../../i18n/i18n";

type Props = {
  options: Array<{ id: string; label: string; value: string; order: number }>;
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
  disabled?: boolean;
};

export function ChoiceExercise({ options, selectedOptionId, onSelect, disabled = false }: Props) {
  const sorted = [...options].sort((a, b) => a.order - b.order);

  return (
    <View style={styles.container}>
      {sorted.map((option) => {
        const isSelected = selectedOptionId === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled }}
            disabled={disabled}
            onPress={() => onSelect(option.id)}
            style={[styles.optionCard, isSelected && styles.optionCardSelected, disabled && styles.disabled]}
          >
            <Text style={styles.label} translate={false}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14, marginVertical: 14 },
  optionCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: garden.line,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },
  optionCardSelected: {
    backgroundColor: garden.mint,
    borderColor: garden.forest,
  },
  label: {
    color: garden.ink,
    fontFamily: font.bold,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  disabled: {
    opacity: 0.6,
  },
});
