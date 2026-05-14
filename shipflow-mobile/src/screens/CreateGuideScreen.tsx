import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { colors } from "../constants/theme";
import { calculateRate, getActiveCouriers } from "../services/couriers";
import { createShipment } from "../services/shipments";
import type { Courier } from "../types";

export function CreateGuideScreen() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [saving, setSaving] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [originCity, setOriginCity] = useState("New York, NY");
  const [destinationCity, setDestinationCity] = useState("Chicago, IL");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [weight, setWeight] = useState("1");
  const [productType, setProductType] = useState("Ecommerce package");
  const [courierId, setCourierId] = useState("");

  useFocusEffect(
    useCallback(() => {
      getActiveCouriers().then((items) => {
        setCouriers(items);
        setCourierId((current) => current || items[0]?.id || "");
      });
    }, []),
  );

  const courier = couriers.find((item) => item.id === courierId) ?? couriers[0];
  const numericWeight = Number(weight || 1);
  const total = courier ? calculateRate({ courier, weight: numericWeight, originCity, destinationCity }) : 0;

  async function submit() {
    if (!recipientName || !recipientPhone || !destinationAddress || !courier) {
      Alert.alert("Complete the details", "Enter recipient, phone, address, and carrier.");
      return;
    }

    setSaving(true);
    try {
      const id = `SF-${Date.now().toString().slice(-6)}`;
      await createShipment({
        id,
        trackingNumber: id,
        senderName: "ShipFlow App",
        senderPhone: "555-0100",
        originCity,
        recipientName,
        recipientPhone,
        destinationCity,
        destinationAddress,
        weight: numericWeight,
        productType,
        courier: courier.nombre,
        shippingSubtotal: total,
        cashOnDeliveryCommission: 0,
        total,
        cashOnDelivery: false,
        cashAmount: 0,
        status: "Pendiente",
        value: total,
      });
      Alert.alert("Label created", `Label ${id} is synced with the web app.`);
      setRecipientName("");
      setRecipientPhone("");
      setDestinationAddress("");
    } catch (error) {
      Alert.alert("We could not create the label", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <SectionTitle title="Create label" subtitle="Saved in Supabase and synced with the web app." />
      <Card style={styles.form}>
        <Input label="Recipient" value={recipientName} onChangeText={setRecipientName} />
        <Input label="Phone" value={recipientPhone} onChangeText={setRecipientPhone} keyboardType="phone-pad" />
        <Input label="Origin city" value={originCity} onChangeText={setOriginCity} />
        <Input label="Destination city" value={destinationCity} onChangeText={setDestinationCity} />
        <Input label="Destination address" value={destinationAddress} onChangeText={setDestinationAddress} />
        <Input label="Weight kg" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
        <Input label="Product" value={productType} onChangeText={setProductType} />
      </Card>
      <Card style={styles.form}>
        <Text style={styles.title}>Carrier</Text>
        {couriers.map((item) => (
          <Card key={item.id} style={[styles.courier, courierId === item.id && styles.courierActive]}>
            <Text onPress={() => setCourierId(item.id)} style={[styles.courierName, courierId === item.id && styles.courierNameActive]}>
              {item.nombre}
            </Text>
            <Text onPress={() => setCourierId(item.id)} style={styles.courierMeta}>
              {item.tiempoEstimado} · {item.cobertura}
            </Text>
          </Card>
        ))}
        <Text style={styles.total}>Estimated total: ${total.toFixed(2)}</Text>
        <Button title={saving ? "Saving..." : "Create label"} disabled={saving} onPress={submit} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  courier: {
    backgroundColor: "#FFFFFF",
    padding: 14,
  },
  courierActive: {
    backgroundColor: "#ECFEFF",
    borderColor: colors.cyan,
  },
  courierName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  courierNameActive: {
    color: colors.cyan,
  },
  courierMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  total: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
});
