import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { colors } from "../constants/theme";
import { addBalance, getAvailableBalance, getBalanceMovements } from "../services/balance";
import type { BalanceMovement } from "../types";

export function BalanceScreen() {
  const [balance, setBalance] = useState(0);
  const [movements, setMovements] = useState<BalanceMovement[]>([]);

  async function load() {
    const [nextBalance, nextMovements] = await Promise.all([getAvailableBalance(), getBalanceMovements()]);
    setBalance(nextBalance);
    setMovements(nextMovements);
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  async function recharge() {
    try {
      await addBalance(25);
      await load();
    } catch (error) {
      Alert.alert("We could not add balance", error instanceof Error ? error.message : "Try again.");
    }
  }

  return (
    <Screen>
      <SectionTitle title="Balance" subtitle="Movements saved in balance_movements." />
      <Card style={styles.balance}>
        <Text style={styles.label}>Available balance</Text>
        <Text style={styles.amount}>${balance.toFixed(2)}</Text>
        <Button title="Add balance" onPress={recharge} />
      </Card>
      {movements.map((movement) => (
        <Card key={movement.id}>
          <View style={styles.row}>
            <View>
              <Text style={styles.concept}>{movement.concept}</Text>
              <Text style={styles.muted}>{new Date(movement.date).toLocaleDateString()}</Text>
            </View>
            <Text style={movement.amount > 0 ? styles.positive : styles.negative}>${movement.amount.toFixed(2)}</Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  balance: {
    backgroundColor: colors.ink,
    gap: 12,
  },
  label: {
    color: "#CBD5E1",
  },
  amount: {
    color: colors.white,
    fontSize: 42,
    fontWeight: "900",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  concept: {
    color: colors.ink,
    fontWeight: "900",
  },
  muted: {
    color: colors.muted,
    marginTop: 4,
  },
  positive: {
    color: colors.green,
    fontWeight: "900",
  },
  negative: {
    color: colors.ink,
    fontWeight: "900",
  },
});
