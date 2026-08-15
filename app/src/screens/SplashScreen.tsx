import React from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Rembr</Text>
      <ActivityIndicator
        size="small"
        color="#8b5cf6"
        style={{ marginTop: 16 }}
      />
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
  logo: {
    fontSize: 28,
    fontWeight: "600",
    color: "#1e1b2e",
  },
});
