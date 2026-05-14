import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { HeroBackground } from "../components/HeroBackground";
import { Screen } from "../components/Screen";
import { colors } from "../constants/theme";
import type { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <HeroBackground>
      <Screen contentStyle={styles.content} transparent>
        <View style={styles.container}>
          <View style={styles.heroCard}>
            <Brand size={29} dark />
            <View style={styles.chips}>
              <Chip accent icon="SF" label="U.S. shipping platform" />
              <Chip icon="4+" label="USPS, UPS, FedEx, DHL" />
            </View>
            <View style={styles.hero}>
              <Text style={styles.title}>
                Create shipping labels across the <Text style={styles.titleAccent}>U.S.</Text> from one platform
              </Text>
              <Text style={styles.text}>
                Compare carriers, generate labels, manage balance, and track packages from a mobile experience synced with the web.
              </Text>
            </View>
          </View>
          <DashboardPreview />
          <View style={styles.features}>
            <Feature title="Package tracking" value="Live" />
            <Feature title="Multi-carrier" value="4+" />
            <Feature title="Instant labels" value="PDF" />
          </View>
          <Button title="Sign in" onPress={() => navigation.navigate("Login")} />
          <Button title="Create account" variant="secondary" onPress={() => navigation.navigate("Register")} />
        </View>
      </Screen>
    </HeroBackground>
  );
}

function DashboardPreview() {
  return (
    <View style={styles.preview}>
      <View style={styles.previewHeader}>
        <View>
          <Text style={styles.previewEyebrow}>Dashboard</Text>
          <Text style={styles.previewTitle}>Active operation</Text>
        </View>
      </View>
      <View style={styles.kpiRow}>
        <MiniKpi label="Labels" value="128" />
        <MiniKpi label="Balance" value="$86" />
        <MiniKpi label="In transit" value="12" />
      </View>
      <View style={styles.trackingRow}>
        <View style={styles.trackingDot} />
        <View style={{ flex: 1 }}>
          <Text style={styles.trackingTitle}>SF-24018 · In transit</Text>
          <Text style={styles.trackingText}>UPS · New York to Chicago</Text>
        </View>
      </View>
      <View style={styles.courierRow}>
        {["USPS", "UPS", "FedEx", "DHL"].map((item) => (
          <Text key={item} style={styles.courierPill}>{item}</Text>
        ))}
      </View>
    </View>
  );
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function Feature({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.feature}>
      <Text style={styles.featureValue}>{value}</Text>
      <Text style={styles.featureTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 0,
    paddingVertical: 42,
  },
  container: {
    alignSelf: "center",
    gap: 12,
    maxWidth: 430,
    paddingHorizontal: 20,
    width: "100%",
  },
  heroCard: {
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "rgba(255,255,255,0.98)",
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.20,
    shadowRadius: 36,
    width: "100%",
  },
  hero: {
    gap: 14,
    marginTop: 22,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 18,
  },
  title: {
    color: colors.ink,
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 41,
  },
  titleAccent: {
    color: colors.cyan,
  },
  text: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 25,
  },
  preview: {
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.90)",
    borderColor: "rgba(255,255,255,0.94)",
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.24,
    shadowRadius: 38,
    width: "100%",
  },
  previewHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  previewEyebrow: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  previewTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  kpi: {
    backgroundColor: "rgba(236,254,255,0.86)",
    borderRadius: 18,
    flex: 1,
    padding: 10,
  },
  kpiValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  kpiLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  trackingRow: {
    alignItems: "center",
    backgroundColor: "rgba(248,250,252,0.86)",
    borderRadius: 18,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  trackingDot: {
    backgroundColor: colors.green,
    borderRadius: 7,
    height: 14,
    width: 14,
  },
  trackingTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
  },
  trackingText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  courierRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  courierPill: {
    backgroundColor: "#ECFEFF",
    borderRadius: 999,
    color: colors.cyan,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  features: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    marginTop: 2,
    width: "100%",
  },
  feature: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(255,255,255,0.78)",
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    minHeight: 86,
    padding: 10,
  },
  featureValue: {
    color: colors.cyan,
    fontSize: 18,
    fontWeight: "900",
  },
  featureTitle: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 15,
    marginTop: 4,
  },
});
