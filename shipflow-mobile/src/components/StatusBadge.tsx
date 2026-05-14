import { StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/theme";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized.includes("entregado")
    ? styles.green
    : normalized.includes("pendiente")
      ? styles.amber
      : styles.pink;

  return (
    <View style={[styles.badge, tone]}>
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pink: {
    backgroundColor: "#FFEAF6",
  },
  green: {
    backgroundColor: "#DCFCE7",
  },
  amber: {
    backgroundColor: "#FEF3C7",
  },
  text: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "900",
  },
});
