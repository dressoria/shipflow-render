import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { colors, radii } from "../constants/theme";

type InputProps = TextInputProps & {
  label: string;
};

export function Input({ label, style, ...props }: InputProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#94A3B8"
        {...props}
        style={[styles.input, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: radii.input,
    borderWidth: 1,
    color: colors.ink,
    minHeight: 50,
    paddingHorizontal: 14,
  },
});
