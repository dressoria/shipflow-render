import { StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/theme";

export function Chip({ label, accent = false, icon }: { label: string; accent?: boolean; icon?: string }) {
  return (
    <View style={[styles.chip, accent && styles.accent]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={[styles.text, accent && styles.accentText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.84)",
    borderColor: "rgba(255,255,255,0.76)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    shadowColor: "#831843",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  accent: {
    backgroundColor: "rgba(255,234,246,0.88)",
  },
  text: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
  },
  icon: {
    fontSize: 12,
  },
  accentText: {
    color: colors.pink,
  },
});
