import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Footer({ navigation }: any) {
  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.footer}>
        {/* Left Icons */}
        <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate("Trips")}>
          <Ionicons name="timer-outline" size={24} color="#6B7280" />
          <Text style={styles.tabText}>Trips</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate("Vehicle")}>
          <Ionicons name="search-outline" size={24} color="#6B7280" />
          <Text style={styles.tabText}>Search</Text>
        </TouchableOpacity>

        {/* Floating Center Button */}
        <TouchableOpacity
          style={styles.centerButton}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Ionicons name="home" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Right Icons */}
        <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate("Documents")}>
          <Ionicons name="chatbubbles-outline" size={24} color="#6B7280" />
          <Text style={styles.tabText}>Docs</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate("Settings")}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#6B7280" />
          <Text style={styles.tabText}>More</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#fff",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    position: "relative",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  tabText: {
    fontSize: 10,
    color: "#374151",
    marginTop: 2,
  },
  centerButton: {
    position: "absolute",
    bottom: 20, // lifts above footer
    alignSelf: "center",
    backgroundColor: "#906AD1",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
});
