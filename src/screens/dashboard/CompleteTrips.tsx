import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

const CompleteTrips = () => {
  // Sample data for completed trips in the last month
  const completedTrips = [
    {
      id: 1,
      route: "Boston, MA → Atlanta, GA",
      cargo: "Medical Supplies",
      carrier: "MedExpress Logistics",
      driverName: "Sarah Wilson",
      distanceCovered: 1087,
      startDate: "2025-08-15",
      completedDate: "2025-08-17",
      deliveryTime: "2 days, 4 hours",
      status: "Delivered On Time",
      rating: 5
    },
    {
      id: 2,
      route: "Phoenix, AZ → Portland, OR",
      cargo: "Consumer Electronics",
      carrier: "TechHaul Express",
      driverName: "Mike Rodriguez",
      distanceCovered: 1424,
      startDate: "2025-08-10",
      completedDate: "2025-08-13",
      deliveryTime: "2 days, 18 hours",
      status: "Delivered Early",
      rating: 5
    },
    {
      id: 3,
      route: "Houston, TX → Nashville, TN",
      cargo: "Automotive Parts",
      carrier: "AutoCargo Solutions",
      driverName: "Jennifer Lee",
      distanceCovered: 928,
      startDate: "2025-08-20",
      completedDate: "2025-08-22",
      deliveryTime: "1 day, 22 hours",
      status: "Delivered On Time",
      rating: 4
    },
    {
      id: 4,
      route: "San Francisco, CA → Las Vegas, NV",
      cargo: "Food & Beverages",
      carrier: "Fresh Cargo Co.",
      driverName: "Robert Chen",
      distanceCovered: 568,
      startDate: "2025-08-05",
      completedDate: "2025-08-06",
      deliveryTime: "1 day, 3 hours",
      status: "Delivered On Time",
      rating: 5
    },
    {
      id: 5,
      route: "Minneapolis, MN → Kansas City, MO",
      cargo: "Industrial Equipment",
      carrier: "Heavy Haul Logistics",
      driverName: "Thomas Brown",
      distanceCovered: 465,
      startDate: "2025-08-22",
      completedDate: "2025-08-24",
      deliveryTime: "2 days, 8 hours",
      status: "Delivered Late",
      rating: 3
    },
    {
      id: 6,
      route: "Orlando, FL → Charlotte, NC",
      cargo: "Textiles",
      carrier: "Southern Transport",
      driverName: "Lisa Johnson",
      distanceCovered: 523,
      startDate: "2025-08-12",
      completedDate: "2025-08-13",
      deliveryTime: "1 day, 6 hours",
      status: "Delivered Early",
      rating: 5
    }
  ];

  const getStatusColor = (status:any) => {
    switch (status) {
      case "Delivered Early":
        return "#27ae60";
      case "Delivered On Time":
        return "#3498db";
      case "Delivered Late":
        return "#e74c3c";
      default:
        return "#95a5a6";
    }
  };

  const formatDate = (dateString:any) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const renderStarRating = (rating:any) => {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  };

  const renderTripCard = (trip:any) => (
    <View key={trip.id} style={styles.tripCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.routeText}>{trip.route}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
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
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Distance:</Text>
          <Text style={styles.value}>{trip.distanceCovered} miles</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Delivery Time:</Text>
          <Text style={styles.value}>{trip.deliveryTime}</Text>
        </View>
        
        <View style={styles.dateSection}>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Started:</Text>
            <Text style={styles.dateValue}>{formatDate(trip.startDate)}</Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Completed:</Text>
            <Text style={styles.dateValue}>{formatDate(trip.completedDate)}</Text>
          </View>
        </View>
        
        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Performance Rating:</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{renderStarRating(trip.rating)}</Text>
            <Text style={styles.ratingText}>({trip.rating}/5)</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const getTotalStats = () => {
    const totalTrips = completedTrips.length;
    const totalMiles = completedTrips.reduce((sum, trip) => sum + trip.distanceCovered, 0);
    const onTimeDeliveries = completedTrips.filter(trip => 
      trip.status === "Delivered On Time" || trip.status === "Delivered Early"
    ).length;
    const onTimePercentage = Math.round((onTimeDeliveries / totalTrips) * 100);
    
    return { totalTrips, totalMiles, onTimePercentage };
  };

  const stats = getTotalStats();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>✅ Complete Trips</Text>
        <Text style={styles.headerSubtitle}>Successfully completed this month</Text>
      </View>
      
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalTrips}</Text>
          <Text style={styles.statLabel}>Total Trips</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalMiles.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Miles Covered</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.onTimePercentage}%</Text>
          <Text style={styles.statLabel}>On Time</Text>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {completedTrips.map(renderTripCard)}
      </ScrollView>
    </View>
  );
};

export default CompleteTrips;

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
    color: "#a8d5ba",
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
    color: "#27ae60",
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
  dateSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#34495e"
  },
  dateValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2c3e50"
  },
  ratingSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1"
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#34495e",
    marginBottom: 6
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  stars: {
    fontSize: 16,
    color: "#f39c12"
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#7f8c8d"
  }
});