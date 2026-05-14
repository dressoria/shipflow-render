import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, StyleSheet, Text } from "react-native";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { HeroBackground } from "../components/HeroBackground";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import { SectionTitle } from "../components/SectionTitle";
import { colors } from "../constants/theme";
import { useAuth } from "../services/auth";
import type { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await register(email.trim(), password, businessName.trim());
    } catch (error) {
      Alert.alert("We could not register", error instanceof Error ? error.message : "Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <HeroBackground>
      <Screen contentStyle={styles.screen}>
        <Brand />
        <SectionTitle title="Create your account" subtitle="Your profile is saved in Supabase and available on the web." />
        <Card style={styles.form}>
          <Input label="Business name" value={businessName} onChangeText={setBusinessName} />
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
          <Button title={loading ? "Creating..." : "Create account"} disabled={loading} onPress={submit} />
        </Card>
        <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
          I already have an account
        </Text>
      </Screen>
    </HeroBackground>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: "rgba(255,255,255,0.92)",
    gap: 14,
  },
  screen: {
    flexGrow: 1,
    justifyContent: "center",
  },
  link: {
    color: colors.cyan,
    fontWeight: "900",
    textAlign: "center",
  },
});
