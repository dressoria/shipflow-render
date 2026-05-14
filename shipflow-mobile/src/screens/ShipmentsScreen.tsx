import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { StatusBadge } from "../components/StatusBadge";
import { colors } from "../constants/theme";
import { openGuidePdf, shareGuidePdf } from "../services/pdfGuideService";
import { getShipments } from "../services/shipments";
import type { Shipment } from "../types";

export function ShipmentsScreen() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [guideAction, setGuideAction] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getShipments().then(setShipments);
    }, []),
  );

  async function runGuideAction(shipment: Shipment, action: "view" | "save" | "print") {
    const actionId = `${shipment.id}-${action}`;
    setGuideAction(actionId);
    try {
      if (action === "view" || action === "print") {
        await openGuidePdf(shipment);
      }

      if (action === "save") {
        await shareGuidePdf(shipment);
        Alert.alert("Save PDF", "To save the PDF, use Share and select Save to Files.");
      }
    } catch (error) {
      Alert.alert("We could not process the label", error instanceof Error ? error.message : "Try again.");
    } finally {
      setGuideAction(null);
    }
  }

  return (
    <Screen>
      <SectionTitle title="My shipments" subtitle="All shipments come from Supabase." />
      {shipments.map((shipment) => (
        <Card key={shipment.id}>
          <View style={styles.row}>
            <View>
              <Text style={styles.guide}>{shipment.trackingNumber}</Text>
              <Text style={styles.muted}>{shipment.recipientName}</Text>
            </View>
            <Text style={styles.price}>${shipment.value.toFixed(2)}</Text>
          </View>
          <Text style={styles.route}>{shipment.originCity} to {shipment.destinationCity}</Text>
          <View style={styles.footer}>
            <Text style={styles.status}>{shipment.courier}</Text>
            <StatusBadge status={shipment.status} />
          </View>
          <GuideActions
            loadingAction={guideAction}
            shipment={shipment}
            onAction={runGuideAction}
          />
        </Card>
      ))}
      {shipments.length === 0 ? (
        <Card>
          <Text style={styles.muted}>Create a label to see it here and in the web app.</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

function GuideActions({
  shipment,
  loadingAction,
  onAction,
}: {
  shipment: Shipment;
  loadingAction: string | null;
  onAction: (shipment: Shipment, action: "view" | "save" | "print") => Promise<void>;
}) {
  const actions: Array<{ id: "view" | "save" | "print"; label: string }> = [
    { id: "view", label: "View label" },
    { id: "save", label: "Share/Save PDF" },
    { id: "print", label: "Print" },
  ];

  return (
    <View style={styles.actions}>
      {actions.map((action) => {
        const actionId = `${shipment.id}-${action.id}`;
        const loading = loadingAction === actionId;

        return (
          <Pressable
            disabled={Boolean(loadingAction)}
            key={action.id}
            onPress={() => onAction(shipment, action.id)}
            style={[styles.actionButton, loading && styles.actionButtonLoading]}
          >
            <Text style={styles.actionText}>{loading ? "Processing..." : action.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  guide: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  muted: {
    color: colors.muted,
    marginTop: 3,
  },
  price: {
    color: colors.cyan,
    fontWeight: "900",
  },
  route: {
    color: colors.ink,
    fontWeight: "800",
    marginTop: 14,
  },
  status: {
    color: colors.muted,
    fontWeight: "800",
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  actionButton: {
    backgroundColor: "#ECFEFF",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  actionButtonLoading: {
    opacity: 0.65,
  },
  actionText: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: "900",
  },
});
