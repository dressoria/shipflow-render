import { StyleSheet, Text } from "react-native";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { colors } from "../constants/theme";
import { useAuth } from "../services/auth";

export function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <Screen>
      <SectionTitle title="Profile" subtitle="Information loaded from profiles." />
      <Card style={styles.card}>
        <Text style={styles.name}>{user?.businessName ?? "ShipFlow account"}</Text>
        <Text style={styles.muted}>{user?.email}</Text>
        <Text style={styles.role}>{user?.role === "admin" ? "Administrator" : "User"}</Text>
      </Card>
      <Button title="Sign out" variant="dark" onPress={logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
  },
  name: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
  },
  muted: {
    color: colors.muted,
  },
  role: {
    color: colors.cyan,
    fontWeight: "900",
    marginTop: 8,
  },
});
