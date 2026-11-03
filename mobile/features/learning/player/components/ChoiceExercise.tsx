import { Pressable, StyleSheet, Text, View } from "react-native";

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
      {sorted.map((option, index) => {
        const isSelected = selectedOptionId === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled }}
            disabled={disabled}
            onPress={() => onSelect(option.id)}
            style={[
              styles.optionCard,
              isSelected && styles.optionCardSelected,
              disabled && styles.disabled,
            ]}
          >
            <View style={[styles.indicator, isSelected && styles.indicatorSelected]}>
              <Text style={[styles.indicatorText, isSelected && styles.indicatorTextSelected]}>
                {String.fromCharCode(65 + index)}
              </Text>
            </View>
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, marginVertical: 14 },
  optionCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dee8d9",
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 14,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionCardSelected: {
    backgroundColor: "#eaf8de",
    borderColor: "#236c19",
  },
  indicator: {
    alignItems: "center",
    backgroundColor: "#f5f8f4",
    borderColor: "#dee8d9",
    borderRadius: 12,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  indicatorSelected: {
    backgroundColor: "#236c19",
    borderColor: "#236c19",
  },
  indicatorText: {
    color: "#65766c",
    fontSize: 13,
    fontWeight: "800",
  },
  indicatorTextSelected: {
    color: "#ffffff",
  },
  label: {
    color: "#20352b",
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  labelSelected: {
    color: "#20352b",
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.6,
  },
});
