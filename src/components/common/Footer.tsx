// components/Footer.tsx
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Footer({ navigation }: any) {
  return (
    <View style={styles.footer}>
      <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate("Home")}>
        <Ionicons name="home" size={24} color="#906AD1" />
        <Text style={styles.tabText}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate("Trips")}>
        <Ionicons name="car" size={24} color="#6B7280" />
        <Text style={styles.tabText}>Trips</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate("Settings")}>
        <Ionicons name="settings" size={24} color="#6B7280" />
        <Text style={styles.tabText}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  tab: {
    alignItems: "center",
  },
  tabText: {
    fontSize: 12,
    color: "#374151",
  },
});
