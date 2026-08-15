import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAuth } from "../hooks/useAuth";

export default function DashboardScreen() {
  const { session, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome 👋</Text>
      <Text style={styles.email}>{session?.user?.email}</Text>
      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: { fontSize: 22, fontWeight: "600" },
  email: { fontSize: 14, color: "#6b6779", marginTop: 8, marginBottom: 32 },
  button: {
    backgroundColor: "#f1f0f4",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  buttonText: { color: "#1e1b2e", fontWeight: "500" },
});
