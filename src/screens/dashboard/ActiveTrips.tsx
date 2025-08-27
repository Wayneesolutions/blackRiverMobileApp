import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

const ActiveTrips = () => {
  // Sample data for active trips
  const activeTrips = [
    {
      id: 1,
      route: "New York, NY → Los Angeles, CA",
      cargo: "Electronics",
      carrier: "Swift Transport",
      driverName: "John Smith",
      totalMiles: 2789,
      completedMiles: 1245,
      status: "In Transit"
    },
    {
      id: 2,
      route: "Chicago, IL → Miami, FL",
      cargo: "Pharmaceuticals",
      carrier: "MedCargo Express",
      driverName: "Maria Garcia",
      totalMiles: 1365,
      completedMiles: 892,
      status: "In Transit"
    },
    {
      id: 3,
      route: "Seattle, WA → Denver, CO",
      cargo: "Automotive Parts",
      carrier: "AutoHaul Logistics",
      driverName: "David Johnson",
      totalMiles: 1318,
      completedMiles: 456,
      status: "In Transit"
    }
  ];

  const getProgressPercentage = (completed:any, total:any) => {
    return Math.round((completed / total) * 100);
  };

  const renderTripCard = (trip:any) => (
    <View key={trip.id} style={styles.tripCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.routeText}>{trip.route}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{trip.status}</Text>
        </View>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Cargo:</Text>
          <Text style={styles.value}>{trip.cargo}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Carrier:</Text>
          <Text style={styles.value}>{trip.carrier}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Driver:</Text>
          <Text style={styles.value}>{trip.driverName}</Text>
        </View>
        
        <View style={styles.milesSection}>
          <View style={styles.milesInfo}>
            <Text style={styles.milesLabel}>Miles Progress</Text>
            <Text style={styles.milesText}>
              {trip.completedMiles} / {trip.totalMiles} miles
            </Text>
          </View>
          
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${getProgressPercentage(trip.completedMiles, trip.totalMiles)}%` }
              ]} 
            />
          </View>
          
          <Text style={styles.percentageText}>
            {getProgressPercentage(trip.completedMiles, trip.totalMiles)}% Complete
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚚 Active Trips</Text>
        <Text style={styles.headerSubtitle}>Currently ongoing trips</Text>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTrips.map(renderTripCard)}
      </ScrollView>
    </View>
  );
};

export default ActiveTrips;

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
    color: "#bdc3c7",
    opacity: 0.9
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
    alignItems: "center",
    marginBottom: 12
  },
  routeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    flex: 1,
    marginRight: 8
  },
  statusBadge: {
    backgroundColor: "#27ae60",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20
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
  milesSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8
  },
  milesInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  milesLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#34495e"
  },
  milesText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50"
  },
  progressBar: {
    height: 6,
    backgroundColor: "#ecf0f1",
    borderRadius: 3,
    marginVertical: 8
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3498db",
    borderRadius: 3
  },
  percentageText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#7f8c8d",
    textAlign: "center"
  }
});