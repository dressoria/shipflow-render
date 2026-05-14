import { SafeAreaView, ScrollView, StyleSheet, type ViewStyle } from "react-native";
import { colors } from "../constants/theme";

export function Screen({
  children,
  scroll = true,
  contentStyle,
  transparent = false,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  transparent?: boolean;
}) {
  if (!scroll) {
    return <SafeAreaView style={[styles.safe, transparent && styles.transparent, contentStyle]}>{children}</SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.safe, transparent && styles.transparent]}>
      <ScrollView contentContainerStyle={[styles.content, contentStyle]}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 18,
    paddingBottom: 32,
  },
  transparent: {
    backgroundColor: "transparent",
  },
});
