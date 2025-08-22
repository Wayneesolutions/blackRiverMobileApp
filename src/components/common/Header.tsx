// components/Header.tsx
import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

export default function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.logo}>FleetGo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#906AD1",
    paddingVertical: 16,
    alignItems: "center",
  },
  logo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
});
