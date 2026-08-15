import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

export default function DashboardScreen() {
  const { session, signOut } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleProcessEmails = async () => {
    setSyncing(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("sync-gmail");

      console.log("Full response data:", JSON.stringify(data));
      console.log("Full response error:", JSON.stringify(error));

      if (error) {
        Alert.alert("Sync failed", error.message ?? "Unknown error");
        return;
      }

      setLastResult(`Scanned ${data.scanned} emails`);
    } catch (err: any) {
      Alert.alert("Sync failed", err.message ?? "Unknown error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome 👋</Text>
      <Text style={styles.email}>{session?.user?.email}</Text>

      <Pressable
        style={styles.button}
        onPress={handleProcessEmails}
        disabled={syncing}
      >
        {syncing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Process My Emails</Text>
        )}
      </Pressable>

      {lastResult && <Text style={styles.result}>{lastResult}</Text>}

      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
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
    paddingHorizontal: 32,
  },
  title: { fontSize: 22, fontWeight: "600" },
  email: { fontSize: 14, color: "#6b6779", marginTop: 8, marginBottom: 32 },
  button: {
    backgroundColor: "#8b5cf6",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "500" },
  result: { marginTop: 16, fontSize: 14, color: "#3b3a3f" },
  signOutButton: {
    marginTop: 24,
    backgroundColor: "#f1f0f4",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  signOutText: { color: "#1e1b2e", fontWeight: "500" },
});
