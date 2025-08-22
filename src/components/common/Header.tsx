import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Header() {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.logo}>FleetGo</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "white",
  },
  header: {
    paddingVertical: 8,
    alignItems: "center",
  },
  logo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "black",
  },
});
