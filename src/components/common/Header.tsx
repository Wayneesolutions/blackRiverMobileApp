import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING } from "../../theme";

const logo = require("../../../assets/FleetGo.png");

export default function Header() {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </View>
      {/* Neon glow line — mirrors the web's --accent-blue border */}
      <View style={styles.glowLine} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.bgCard,
  },
  header: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.base,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bgCard,
  },
  logo: {
    width: 110,
    height: 36,
  },
  glowLine: {
    height: 1,
    backgroundColor: COLORS.accentBlue,
    opacity: 0.45,
  },
});
