import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";

const PendingTrips = () => {
  // Sample data for pending trips
  const pendingTrips = [
    {
      id: 1,
      pickupLocation: "Dallas, TX",
      destination: "Phoenix, AZ",
      cargoType: "Electronics",
      carrier: "TechTransport LLC",
      driverName: "Alex Thompson",
      assignedDate: "2025-08-27",
      scheduledPickup: "2025-08-28",
      estimatedDistance: 887,
      priority: "High",
      status: "Not Started",
      cargoWeight: "15,000 lbs",
      specialInstructions: "Handle with care - fragile items"
    },
    {
      id: 2,
      pickupLocation: "Miami, FL",
      destination: "Jacksonville, FL",
      cargoType: "Medical Supplies",
      carrier: "HealthCargo Express",
      driverName: "Emma Rodriguez",
      assignedDate: "2025-08-27",
      scheduledPickup: "2025-08-27",
      estimatedDistance: 345,
      priority: "Urgent",
      status: "Awaiting Pickup",
      cargoWeight: "8,500 lbs",
      specialInstructions: "Temperature controlled - keep refrigerated"
    },
    {
      id: 3,
      pickupLocation: "Portland, OR",
      destination: "San Francisco, CA",
      cargoType: "Food Products",
      carrier: "Fresh Foods Transport",
      driverName: "Carlos Martinez",
      assignedDate: "2025-08-26",
      scheduledPickup: "2025-08-27",
      estimatedDistance: 635,
      priority: "Medium",
      status: "Awaiting Pickup",
      cargoWeight: "22,000 lbs",
      specialInstructions: "Perishable goods - expedited delivery required"
    },
    {
      id: 4,
      pickupLocation: "Chicago, IL",
      destination: "Detroit, MI",
      cargoType: "Automotive Parts",
      carrier: "AutoMove Logistics",
      driverName: "Jessica Kim",
      assignedDate: "2025-08-27",
      scheduledPickup: "2025-08-28",
      estimatedDistance: 283,
      priority: "Medium",
      status: "Not Started",
      cargoWeight: "18,500 lbs",
      specialInstructions: "Standard delivery - no special requirements"
    },
    {
      id: 5,
      pickupLocation: "Houston, TX",
      destination: "New Orleans, LA",
      cargoType: "Industrial Equipment",
      carrier: "Heavy Haul Pro",
      driverName: "Michael Davis",
      assignedDate: "2025-08-26",
      scheduledPickup: "2025-08-27",
      estimatedDistance: 348,
      priority: "High",
      status: "Awaiting Pickup",
      cargoWeight: "35,000 lbs",
      specialInstructions: "Oversized load - special permits required"
    }
  ];

  const getPriorityColor = (priority:any) => {
    switch (priority) {
      case "Urgent":
        return "#e74c3c";
      case "High":
        return "#f39c12";
      case "Medium":
        return "#3498db";
      case "Low":
        return "#95a5a6";
      default:
        return "#95a5a6";
    }
  };

  const getStatusColor = (status:any) => {
    switch (status) {
      case "Awaiting Pickup":
        return "#f39c12";
      case "Not Started":
        return "#95a5a6";
      case "Ready to Start":
        return "#27ae60";
      default:
        return "#95a5a6";
    }
  };

  const formatDate = (dateString:any) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    }
  };

  const renderTripCard = (trip:any) => (
    <TouchableOpacity key={trip.id} style={styles.tripCard} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.routeContainer}>
          <Text style={styles.pickupText}>{trip.pickupLocation}</Text>
          <Text style={styles.arrowText}>→</Text>
          <Text style={styles.destinationText}>{trip.destination}</Text>
        </View>
        <View style={styles.badgeContainer}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(trip.priority) }]}>
            <Text style={styles.badgeText}>{trip.priority}</Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
        <Text style={styles.statusText}>{trip.status}</Text>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Cargo Type:</Text>
          <Text style={styles.value}>{trip.cargoType}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Carrier:</Text>
          <Text style={styles.value}>{trip.carrier}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Driver:</Text>
          <Text style={styles.value}>{trip.driverName}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Weight:</Text>
          <Text style={styles.value}>{trip.cargoWeight}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Distance:</Text>
          <Text style={styles.value}>{trip.estimatedDistance} miles</Text>
        </View>
        
        <View style={styles.scheduleSection}>
          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleLabel}>Assigned:</Text>
            <Text style={styles.scheduleValue}>{formatDate(trip.assignedDate)}</Text>
          </View>
          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleLabel}>Pickup:</Text>
            <Text style={[styles.scheduleValue, styles.pickupDate]}>{formatDate(trip.scheduledPickup)}</Text>
          </View>
        </View>
        
        {trip.specialInstructions && (
          <View style={styles.instructionsSection}>
            <Text style={styles.instructionsLabel}>Special Instructions:</Text>
            <Text style={styles.instructionsText}>{trip.specialInstructions}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const getTripStats = () => {
    const totalTrips = pendingTrips.length;
    const awaitingPickup = pendingTrips.filter(trip => trip.status === "Awaiting Pickup").length;
    const notStarted = pendingTrips.filter(trip => trip.status === "Not Started").length;
    const urgentTrips = pendingTrips.filter(trip => trip.priority === "Urgent" || trip.priority === "High").length;
    
    return { totalTrips, awaitingPickup, notStarted, urgentTrips };
  };

  const stats = getTripStats();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🕒 Pending Trips</Text>
        <Text style={styles.headerSubtitle}>Assigned but not yet started</Text>
      </View>
      
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalTrips}</Text>
          <Text style={styles.statLabel}>Total Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.awaitingPickup}</Text>
          <Text style={styles.statLabel}>Awaiting Pickup</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.urgentTrips}</Text>
          <Text style={styles.statLabel}>High Priority</Text>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {pendingTrips.map(renderTripCard)}
      </ScrollView>
    </View>
  );
};

export default PendingTrips;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5"
  },
  header: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingTop: 20
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#fdeaa7",
    opacity: 0.9
  },
  statsSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#f39c12",
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    textAlign: "center"
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16
  },
  tripCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginVertical: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12
  },
  routeContainer: {
    flex: 1,
    marginRight: 8
  },
  pickupText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 4
  },
  arrowText: {
    fontSize: 14,
    color: "#7f8c8d",
    marginVertical: 2,
    textAlign: "center"
  },
  destinationText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50"
  },
  badgeContainer: {
    alignItems: "flex-end"
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff"
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff"
  },
  cardContent: {
    gap: 8
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#7f8c8d",
    flex: 1
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    flex: 2,
    textAlign: "right"
  },
  scheduleSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2
  },
  scheduleLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#34495e"
  },
  scheduleValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2c3e50"
  },
  pickupDate: {
    color: "#f39c12"
  },
  instructionsSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#f39c12"
  },
  instructionsLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#856404",
    marginBottom: 4
  },
  instructionsText: {
    fontSize: 13,
    color: "#856404",
    lineHeight: 18
  }
});