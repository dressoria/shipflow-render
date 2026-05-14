import { StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/theme";

export function Brand({ size = 26, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.icon} />
      <Text style={[styles.text, { fontSize: size, color: dark ? colors.ink : colors.white }]}>
        Ship<Text style={styles.accent}>Flow</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  icon: {
    backgroundColor: colors.cyan,
    borderRadius: 10,
    height: 24,
    width: 24,
  },
  text: {
    fontWeight: "900",
  },
  accent: {
    color: colors.cyan,
  },
});
