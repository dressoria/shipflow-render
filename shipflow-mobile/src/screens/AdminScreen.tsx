import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { colors } from "../constants/theme";
import { getCouriers } from "../services/couriers";
import { getShipments } from "../services/shipments";
import type { Courier, Shipment } from "../types";

export function AdminScreen() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getCouriers(), getShipments()]).then(([nextCouriers, nextShipments]) => {
        setCouriers(nextCouriers);
        setShipments(nextShipments);
      });
    }, []),
  );

  return (
    <Screen>
      <SectionTitle title="Admin" subtitle="Visible sólo cuando role = admin." />
      <View style={styles.grid}>
        <Card style={styles.metric}>
          <Text style={styles.value}>{couriers.length}</Text>
          <Text style={styles.label}>Couriers</Text>
        </Card>
        <Card style={styles.metric}>
          <Text style={styles.value}>{shipments.length}</Text>
          <Text style={styles.label}>Guías</Text>
        </Card>
      </View>
      <Card>
        <Text style={styles.title}>Couriers activos</Text>
        {couriers.map((courier) => (
          <Text key={courier.id} style={styles.item}>
            {courier.nombre} · {courier.activo ? "Activo" : "Inactivo"}
          </Text>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    gap: 10,
  },
  metric: {
    flex: 1,
  },
  value: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "900",
  },
  label: {
    color: colors.muted,
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },
  item: {
    borderTopColor: "#F1F5F9",
    borderTopWidth: 1,
    color: colors.ink,
    fontWeight: "800",
    paddingVertical: 12,
  },
});
