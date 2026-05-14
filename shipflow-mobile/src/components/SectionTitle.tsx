import { StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/theme";

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
});
