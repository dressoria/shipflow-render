import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../constants/theme";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "dark" | "secondary";
  disabled?: boolean;
};

export function Button({ title, onPress, variant = "primary", disabled }: ButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {variant === "primary" ? <View style={styles.primaryGlow} /> : null}
      <Text style={[styles.text, variant === "secondary" && styles.secondaryText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: radii.button,
    minHeight: 58,
    overflow: "hidden",
    justifyContent: "center",
    paddingHorizontal: 18,
    shadowColor: "#BE185D",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 28,
    elevation: 5,
  },
  primary: {
    backgroundColor: colors.pink,
  },
  dark: {
    backgroundColor: colors.ink,
  },
  secondary: {
    backgroundColor: "rgba(255,255,255,0.82)",
  },
  text: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryText: {
    color: colors.pink,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    transform: [{ scale: 0.97 }, { translateY: 1 }],
  },
  primaryGlow: {
    backgroundColor: "rgba(255,255,255,0.22)",
    height: 80,
    position: "absolute",
    right: -18,
    top: -42,
    transform: [{ rotate: "-14deg" }],
    width: 140,
  },
});
