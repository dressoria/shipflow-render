import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { colors } from "../constants/theme";
import { openGuidePdf, shareGuidePdf } from "../services/pdfGuideService";
import { getRealTracking } from "../services/realTrackingService";
import { getShipmentByTrackingNumber } from "../services/shipments";
import { getTrackingEvents, saveRealTrackingEvents } from "../services/tracking";
import type { Shipment, TrackingEvent, TrackingStatus } from "../types";

type GuideAction = "view" | "save" | "print";

export function TrackingScreen() {
  const [guide, setGuide] = useState("");
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [tracking, setTracking] = useState<TrackingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [guideAction, setGuideAction] = useState<GuideAction | null>(null);

  async function search() {
    setLoading(true);
    setTracking(null);
    try {
      const found = await getShipmentByTrackingNumber(guide);
      setShipment(found);

      if (!found) {
        setEvents([]);
        Alert.alert("No results", "We could not find that label in Supabase.");
        return;
      }

      const storedEvents = await getTrackingEvents(found.trackingNumber);
      const nextTracking = await getRealTracking(found.trackingNumber, found.courier, storedEvents);
      await saveRealTrackingEvents(found.id, nextTracking);
      setEvents(await getTrackingEvents(found.trackingNumber));
      setTracking(nextTracking);
    } catch (error) {
      Alert.alert("We could not check tracking", error instanceof Error ? error.message : "Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function runGuideAction(action: GuideAction) {
    if (!shipment) return;

    setGuideAction(action);
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
      <SectionTitle title="Tracking" subtitle="Check status from ShipFlow and the carrier when available." />
      <Card style={styles.form}>
        <Input label="Tracking number" value={guide} onChangeText={setGuide} autoCapitalize="characters" />
        <Button title={loading ? "Searching..." : "Search label"} disabled={loading} onPress={search} />
      </Card>
      {shipment ? (
        <Card style={styles.result}>
          <View style={styles.header}>
            <View>
              <Text style={styles.label}>Label</Text>
              <Text style={styles.guide}>{shipment.trackingNumber}</Text>
            </View>
            <View style={[styles.badge, tracking?.isReal ? styles.realBadge : styles.fallbackBadge]}>
              <Text style={styles.badgeText}>{tracking?.statusLabel ?? shipment.status}</Text>
            </View>
          </View>

          <View style={styles.summary}>
            <Info label="Carrier" value={tracking?.courier ?? shipment.courier} />
            <Info label="Current city" value={tracking?.currentLocation ?? shipment.destinationCity} />
            <Info
              label="Last update"
              value={tracking?.lastUpdate ? new Date(tracking.lastUpdate).toLocaleString() : new Date(shipment.date).toLocaleString()}
            />
            <Text style={styles.source}>
              {tracking?.isReal ? "Information retrieved from the logistics carrier" : "Temporary simulated information"}
            </Text>
          </View>

          <GuideActions loadingAction={guideAction} onAction={runGuideAction} />

          <View style={styles.timeline}>
            {tracking?.events.length
              ? tracking.events.map((event) => (
                  <View key={event.id} style={styles.event}>
                    <View style={styles.rail}>
                      <View style={styles.dot} />
                    </View>
                    <View style={styles.eventBody}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      {event.location ? <Text style={styles.eventLocation}>{event.location}</Text> : null}
                      {event.description ? <Text style={styles.muted}>{event.description}</Text> : null}
                      <Text style={styles.muted}>{event.date ? new Date(event.date).toLocaleString() : event.statusLabel}</Text>
                    </View>
                  </View>
                ))
              : events.map((event) => (
                  <View key={event.id} style={styles.event}>
                    <View style={styles.rail}>
                      <View style={styles.dot} />
                    </View>
                    <View style={styles.eventBody}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.muted}>{new Date(event.date).toLocaleString()}</Text>
                    </View>
                  </View>
                ))}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

function GuideActions({
  loadingAction,
  onAction,
}: {
  loadingAction: GuideAction | null;
  onAction: (action: GuideAction) => Promise<void>;
}) {
  const actions: Array<{ id: GuideAction; label: string }> = [
    { id: "view", label: "View label" },
    { id: "save", label: "Share/Save PDF" },
    { id: "print", label: "Print" },
  ];

  return (
    <View style={styles.actions}>
      {actions.map((action) => (
        <Pressable
          disabled={Boolean(loadingAction)}
          key={action.id}
          onPress={() => onAction(action.id)}
          style={[styles.actionButton, loadingAction === action.id && styles.actionButtonLoading]}
        >
          <Text style={styles.actionText}>{loadingAction === action.id ? "Processing..." : action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
  result: {
    gap: 16,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  guide: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  realBadge: {
    backgroundColor: "#DCFCE7",
  },
  fallbackBadge: {
    backgroundColor: "#ECFEFF",
  },
  badgeText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "900",
  },
  summary: {
    gap: 10,
  },
  info: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 12,
  },
  infoValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 4,
  },
  source: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: "900",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  muted: {
    color: colors.muted,
    marginTop: 4,
  },
  timeline: {
    gap: 14,
    marginTop: 2,
  },
  event: {
    flexDirection: "row",
    gap: 12,
  },
  rail: {
    alignItems: "center",
    backgroundColor: "#ECFEFF",
    borderRadius: 999,
    width: 18,
  },
  dot: {
    backgroundColor: colors.cyan,
    borderRadius: 6,
    height: 12,
    marginTop: 6,
    width: 12,
  },
  eventBody: {
    flex: 1,
  },
  eventTitle: {
    color: colors.ink,
    fontWeight: "900",
  },
  eventLocation: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
});
