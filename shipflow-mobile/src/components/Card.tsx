import { StyleSheet, View, type ViewProps } from "react-native";
import { colors, radii } from "../constants/theme";

export function Card({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.card, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: "#FCE7F3",
    borderRadius: radii.card,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#831843",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 2,
  },
});
