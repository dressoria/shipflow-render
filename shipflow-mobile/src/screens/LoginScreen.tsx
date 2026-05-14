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
import type { RootStackParamList } from "../types";
import { useAuth } from "../services/auth";
import { colors } from "../constants/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error) {
      Alert.alert("We could not sign you in", error instanceof Error ? error.message : "Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <HeroBackground>
      <Screen contentStyle={styles.screen}>
        <Brand />
        <SectionTitle title="Sign in" subtitle="Use the same account you use on the web." />
        <Card style={styles.form}>
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
          <Button title={loading ? "Checking..." : "Sign in"} disabled={loading} onPress={submit} />
        </Card>
        <Text style={styles.link} onPress={() => navigation.navigate("Register")}>
          Create a new account
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
