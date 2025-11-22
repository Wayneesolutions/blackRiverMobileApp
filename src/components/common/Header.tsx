import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const logo = require("../../../assets/FleetGo.png");

export default function Header() {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
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
    width: 100,
    height: 35,
  },
});
