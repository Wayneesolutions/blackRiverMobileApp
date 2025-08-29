import React, { useState } from "react";
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
  const [trips, setTrips] = useState(pendingTrips);

  const handleStartTrip = (tripId: any) => {
    // Remove trip from pending and add to active
    const tripToStart = trips.find(trip => trip.id === tripId);
    if (tripToStart) {
      // Here you would typically call a parent component function or API
      // For now, we'll just remove it from the local state
      setTrips(prevTrips => prevTrips.filter(trip => trip.id !== tripId));

      // In a real app, you'd call something like:
      // onTripStarted(tripToStart);
    }
  };

  const getPriorityColor = (priority: any) => {
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

  const getStatusColor = (status: any) => {
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

  const formatDate = (dateString: any) => {
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

  const renderTripCard = (trip: any) => (
    <TouchableOpacity key={trip.id} style={styles.tripCard} activeOpacity={0.7}>
      {/* Priority Badge at Top Right */}
      <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(trip.priority) }]}>
        <Text style={styles.priorityText}>{trip.priority} Priority</Text>
      </View>

      {/* Route Header */}
      <View style={styles.routeHeader}>
        <View style={styles.routeContainer}>
          <Text style={styles.routeLabel}>ROUTE</Text>
          <View style={styles.routeDetails}>
            <View style={styles.locationContainer}>
              <Text style={styles.pickupText}>{trip.pickupLocation}</Text>
            </View>
            <View style={styles.arrowContainer}>
              <Text style={styles.arrowText}>→</Text>
            </View>
            <View style={styles.locationContainer}>
              <Text style={styles.destinationText}>{trip.destination}</Text>
            </View>
          </View>
        </View>
        <View style={styles.distanceContainer}>
          <Text style={styles.distanceValue}>{trip.estimatedDistance}</Text>
          <Text style={styles.distanceLabel}>miles</Text>
        </View>
      </View>

      {/* Inline Action Button + Status Badge */}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
        <TouchableOpacity
          style={[styles.startTripButton, { flex: 0.65, marginRight: 10 }]}
          onPress={() => handleStartTrip(trip.id)}
        >
          <Text style={styles.startTripButtonText}>Start Trip</Text>
        </TouchableOpacity>

        <View
          style={[
            styles.statusBadge,
            {
              flex: 0.35,
              backgroundColor: getStatusColor(trip.status),
              alignItems: "center",
              justifyContent: "center", // vertical + horizontal centering
              alignSelf: "stretch",     // makes badge take full row height
              paddingVertical: 0,       // remove extra vertical padding
            },
          ]}
        >
          <Text style={styles.statusText}>{trip.status}</Text>
        </View>
      </View>



      {/* Trip Details Grid */}
      <View style={styles.detailsGrid}>
        {/* Cargo Information */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>📦 CARGO</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>{trip.cargoType}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Weight:</Text>
            <Text style={styles.detailValue}>{trip.cargoWeight}</Text>
          </View>
        </View>

        {/* Carrier Information */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>🚛 CARRIER</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Company:</Text>
            <Text style={styles.detailValue}>{trip.carrier}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Driver:</Text>
            <Text style={styles.detailValue}>{trip.driverName}</Text>
          </View>
        </View>
      </View>

      {/* Schedule Section */}
      <View style={styles.scheduleSection}>
        <Text style={styles.sectionTitle}>📅 SCHEDULE</Text>
        <View style={styles.scheduleGrid}>
          <View style={styles.scheduleItem}>
            <Text style={styles.scheduleLabel}>Assigned</Text>
            <Text style={styles.scheduleValue}>{formatDate(trip.assignedDate)}</Text>
          </View>
          <View style={styles.scheduleItem}>
            <Text style={styles.scheduleLabel}>Pickup</Text>
            <Text style={[styles.scheduleValue, styles.pickupDate]}>
              {formatDate(trip.scheduledPickup)}
            </Text>
          </View>
        </View>
      </View>

      {/* Special Instructions */}
      {trip.specialInstructions && (
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>⚠️ SPECIAL INSTRUCTIONS</Text>
          <Text style={styles.instructionsText}>{trip.specialInstructions}</Text>
        </View>
      )}
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🕒 Pending Trips</Text>
        <Text style={styles.headerSubtitle}>Trips assigned but not yet started</Text>
      </View>

      {/* Statistics Cards */}
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

      {/* Trip Cards */}
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
    backgroundColor: "#f8f9fa"
  },
  header: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 24,
    paddingHorizontal: 20,
    paddingTop: 40
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 6
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#e9d8fd",
    opacity: 0.9
  },
  statsSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#f39c12",
    marginBottom: 6
  },
  statLabel: {
    fontSize: 13,
    color: "#6c757d",
    textAlign: "center",
    fontWeight: "500"
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16
  },
  tripCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginVertical: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    position: "relative"
  },
  priorityBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 1
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff"
  },
  routeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    marginTop: 16
  },
  routeContainer: {
    flex: 1,
    marginRight: 16
  },
  routeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6c757d",
    marginBottom: 8,
    letterSpacing: 0.5
  },
  routeDetails: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    flexWrap: "wrap"
  },
  locationContainer: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: "40%"
  },
  pickupText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    textAlign: "center"
  },
  arrowContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  arrowText: {
    fontSize: 18,
    color: "#8B5CF6",
    fontWeight: "bold"
  },
  destinationText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    textAlign: "center"
  },
  distanceContainer: {
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20
  },
  actionButtonContainer: {
    marginTop: 2,
    marginBottom: 8
  },
  startTripButton: {
    backgroundColor: "#27ae60",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#27ae60",
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4
  },
  startTripButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  },
  distanceValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#8B5CF6"
  },
  distanceLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 2
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    marginBottom: 20
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff"
  },
  detailsGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20
  },
  detailSection: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6c757d",
    marginBottom: 12,
    letterSpacing: 0.5
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6c757d"
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    textAlign: "right",
    flex: 1,
    marginLeft: 8
  },
  scheduleSection: {
    backgroundColor: "#e3f2fd",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16
  },
  scheduleGrid: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  scheduleItem: {
    flex: 1,
    alignItems: "center"
  },
  scheduleLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1976d2",
    marginBottom: 4
  },
  scheduleValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0d47a1"
  },
  pickupDate: {
    color: "#f57c00"
  },
  instructionsSection: {
    backgroundColor: "#fff3e0",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#ff9800"
  },
  instructionsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#e65100",
    marginBottom: 8,
    letterSpacing: 0.5
  },
  instructionsText: {
    fontSize: 14,
    color: "#ef6c00",
    lineHeight: 20,
    fontWeight: "500"
  }
});