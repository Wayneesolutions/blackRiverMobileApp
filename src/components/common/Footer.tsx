import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  Alert,
  Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { AuthService } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

interface FooterProps {
  onLogout?: () => void;
  navigation?: any;
}

export default function Footer({ onLogout }: FooterProps) {
  const navigation = useNavigation<NavigationProp>();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Handle navigation for trips - show trip info page
  const handleTripsNavigation = () => {
    navigation.navigate("Trips"); // or create a TripInfo screen
  };

  // Handle search - open search functionality
  const handleSearchNavigation = () => {
    navigation.navigate("Search"); // You can create a dedicated SearchScreen
  };

  // Handle dashboard navigation
  const handleDashboardNavigation = () => {
    navigation.navigate("MainTabs", { screen: "Dashboard" });
  };

  // Handle notifications navigation
  const handleNotificationsNavigation = () => {
    navigation.navigate("Notifications"); // Create NotificationsScreen
  };

  // Handle more menu toggle
  const handleMorePress = () => {
    setShowMoreMenu(!showMoreMenu);
  };

  // Handle logout confirmation
  const handleLogoutPress = () => {
    setShowMoreMenu(false);
    setShowLogoutModal(true);
  };

  // Handle help navigation
  const handleHelpPress = () => {
    setShowMoreMenu(false);
    navigation.navigate("Help"); // Create HelpScreen
  };

  // Confirm logout - handle both prop and direct logout
  const confirmLogout = async () => {
    setShowLogoutModal(false);
    
    try {
      if (onLogout && typeof onLogout === 'function') {
        // Use the passed onLogout function
        onLogout();
      } else {
        // Fallback: Clear auth directly and reset navigation
        await AuthService.clearAuth();
        // Reset navigation to login screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  // Cancel logout
  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.footer}>
        {/* Left Section - Trips */}
        <TouchableOpacity style={styles.tab} onPress={handleTripsNavigation}>
          <Ionicons name="timer-outline" size={24} color="#6B7280" />
          <Text style={styles.tabText}>Trips</Text>
        </TouchableOpacity>

        {/* Search */}
        <TouchableOpacity style={styles.tab} onPress={handleSearchNavigation}>
          <Ionicons name="search-outline" size={24} color="#6B7280" />
          <Text style={styles.tabText}>Search</Text>
        </TouchableOpacity>

        {/* Center Spacer for Home Button */}
        <View style={styles.centerSpacer} />

        {/* Notifications (was Docs) */}
        <TouchableOpacity style={styles.tab} onPress={handleNotificationsNavigation}>
          <Ionicons name="notifications-outline" size={24} color="#6B7280" />
          <Text style={styles.tabText}>Notifications</Text>
        </TouchableOpacity>

        {/* More Menu */}
        <TouchableOpacity style={styles.tab} onPress={handleMorePress}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#6B7280" />
          <Text style={styles.tabText}>More</Text>
        </TouchableOpacity>

        {/* Floating Center Button - Home */}
        <TouchableOpacity
          style={styles.centerButton}
          onPress={handleDashboardNavigation}
        >
          <Ionicons name="home" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* More Menu Modal */}
      <Modal
        visible={showMoreMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMoreMenu(false)}
        >
          <View style={styles.moreMenu}>
            <TouchableOpacity style={styles.menuItem} onPress={handleHelpPress}>
              <Ionicons name="help-circle-outline" size={20} color="#374151" />
              <Text style={styles.menuItemText}>Help</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleLogoutPress}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={[styles.menuItemText, { color: "#EF4444" }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelLogout}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.logoutModal}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning-outline" size={32} color="#F59E0B" />
              <Text style={styles.modalTitle}>Confirm Logout</Text>
            </View>

            <Text style={styles.modalMessage}>
              Are you sure you want to log out? You'll need to sign in again to access your account.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelLogout}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.logoutButton]}
                onPress={confirmLogout}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#fff",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    position: "relative",
    height: 70,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 8,
  },
  tabText: {
    fontSize: 10,
    color: "#374151",
    marginTop: 2,
    fontWeight: "500",
  },
  centerSpacer: {
    flex: 1,
    // This creates space for the home button
  },
  centerButton: {
    position: "absolute",
    bottom: 30, // lifts above footer
    left: (width / 2) - 30, // Center horizontally
    backgroundColor: "#906AD1",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",

  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  // More Menu Styles
  moreMenu: {
    position: "absolute",
    bottom: 80,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 150,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: "#374151",
    marginLeft: 12,
    fontWeight: "500",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
  },

  // Logout Modal Styles
  logoutModal: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  logoutButton: {
    backgroundColor: "#EF4444",
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});