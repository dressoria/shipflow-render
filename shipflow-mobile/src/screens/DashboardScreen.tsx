import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Brand } from "../components/Brand";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { StatusBadge } from "../components/StatusBadge";
import { colors } from "../constants/theme";
import { getAvailableBalance } from "../services/balance";
import { getShipments } from "../services/shipments";
import type { Shipment } from "../types";

export function DashboardScreen() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [balance, setBalance] = useState(0);

  async function load() {
    const [nextShipments, nextBalance] = await Promise.all([getShipments(), getAvailableBalance()]);
    setShipments(nextShipments);
    setBalance(nextBalance);
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const inTransit = shipments.filter((shipment) => shipment.status === "En tránsito").length;

  return (
    <Screen contentStyle={styles.content} scroll>
      <Brand />
      <SectionTitle title="Dashboard" subtitle="Supabase is active. Data is shared with the web app." />
      <View style={styles.grid}>
        <Metric label="Labels" value={shipments.length.toString()} />
        <Metric label="In transit" value={inTransit.toString()} />
        <Metric label="Balance" value={`$${balance.toFixed(2)}`} />
      </View>
      <Card>
        <Text style={styles.cardTitle}>Latest shipments</Text>
        {shipments.slice(0, 4).map((shipment) => (
          <View key={shipment.id} style={styles.row}>
            <View>
              <Text style={styles.strong}>{shipment.trackingNumber}</Text>
              <Text style={styles.muted}>{shipment.recipientName}</Text>
            </View>
            <StatusBadge status={shipment.status} />
          </View>
        ))}
        {shipments.length === 0 ? <Text style={styles.muted}>No shipments yet.</Text> : null}
      </Card>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 80,
  },
  grid: {
    flexDirection: "row",
    gap: 10,
  },
  metric: {
    flex: 1,
    padding: 14,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },
  row: {
    alignItems: "center",
    borderTopColor: "#F1F5F9",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  strong: {
    color: colors.ink,
    fontWeight: "900",
  },
  muted: {
    color: colors.muted,
  },
});
