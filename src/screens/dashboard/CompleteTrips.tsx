import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

const CompleteTrips = () => {
  // Enhanced data with fuel consumption and additional metrics
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
      rating: 5,
      fuelUsed: 181.2, // gallons
      fuelCost: 652.32, // USD
      avgMpg: 6.0,
      truckType: "Class 8 Semi",
      weight: 32000, // lbs
      fuelEfficiencyRating: "Good"
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
      rating: 5,
      fuelUsed: 228.6,
      fuelCost: 823.10,
      avgMpg: 6.2,
      truckType: "Class 8 Semi",
      weight: 28500,
      fuelEfficiencyRating: "Excellent"
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
      rating: 4,
      fuelUsed: 161.4,
      fuelCost: 581.04,
      avgMpg: 5.75,
      truckType: "Class 8 Semi",
      weight: 35200,
      fuelEfficiencyRating: "Average"
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
      rating: 5,
      fuelUsed: 89.5,
      fuelCost: 322.20,
      avgMpg: 6.35,
      truckType: "Class 6 Box Truck",
      weight: 18600,
      fuelEfficiencyRating: "Excellent"
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
      rating: 3,
      fuelUsed: 93.0,
      fuelCost: 334.80,
      avgMpg: 5.0,
      truckType: "Heavy Haul",
      weight: 42000,
      fuelEfficiencyRating: "Poor"
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
      rating: 5,
      fuelUsed: 87.2,
      fuelCost: 313.92,
      avgMpg: 6.0,
      truckType: "Class 8 Semi",
      weight: 29800,
      fuelEfficiencyRating: "Good"
    }
  ];

  const getStatusColor = (status: any) => {
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

  const getFuelEfficiencyColor = (rating: any) => {
    switch (rating) {
      case "Excellent":
        return "#27ae60";
      case "Good":
        return "#f39c12";
      case "Average":
        return "#e67e22";
      case "Poor":
        return "#e74c3c";
      default:
        return "#95a5a6";
    }
  };

  const formatDate = (dateString: any) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };



  const renderTripCard = (trip: any) => (
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
          <Text style={styles.label}>Vehicle Type:</Text>
          <Text style={styles.value}>{trip.truckType}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Cargo Weight:</Text>
          <Text style={styles.value}>{trip.weight.toLocaleString()} lbs</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Delivery Time:</Text>
          <Text style={styles.value}>{trip.deliveryTime}</Text>
        </View>

        {/* Fuel Information Section */}
        <View style={styles.fuelSection}>
          <Text style={styles.sectionTitle}>⛽ Fuel Consumption</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Fuel Used:</Text>
            <Text style={styles.value}>{trip.fuelUsed} gallons</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Fuel Cost:</Text>
            <Text style={styles.value}>${trip.fuelCost}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Average MPG:</Text>
            <Text style={styles.value}>{trip.avgMpg}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Fuel Efficiency:</Text>
            <View style={styles.efficiencyContainer}>
              <View style={[styles.efficiencyBadge, { backgroundColor: getFuelEfficiencyColor(trip.fuelEfficiencyRating) }]}>
                <Text style={styles.efficiencyText}>{trip.fuelEfficiencyRating}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Cost per Mile:</Text>
            <Text style={styles.value}>${(trip.fuelCost / trip.distanceCovered).toFixed(2)}</Text>
          </View>
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


      </View>
    </View>
  );

  const getTotalStats = () => {
    const totalTrips = completedTrips.length;
    const totalMiles = completedTrips.reduce((sum, trip) => sum + trip.distanceCovered, 0);
    const totalFuelUsed = completedTrips.reduce((sum, trip) => sum + trip.fuelUsed, 0);
    const totalFuelCost = completedTrips.reduce((sum, trip) => sum + trip.fuelCost, 0);
    const avgMpg = totalMiles / totalFuelUsed;
    const onTimeDeliveries = completedTrips.filter(trip =>
      trip.status === "Delivered On Time" || trip.status === "Delivered Early"
    ).length;
    const onTimePercentage = Math.round((onTimeDeliveries / totalTrips) * 100);

    return {
      totalTrips,
      totalMiles,
      totalFuelUsed: Math.round(totalFuelUsed * 10) / 10,
      totalFuelCost: Math.round(totalFuelCost * 100) / 100,
      avgMpg: Math.round(avgMpg * 10) / 10,
      onTimePercentage
    };
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
    padding: 16,
    gap: 12
  },
  fuelStatsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  fuelStatsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8
  },
  statsRow: {
    flexDirection: "row",
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
  fuelSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#e67e22"
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 12
  },
  efficiencyContainer: {
    flex: 2,
    alignItems: "flex-end"
  },
  efficiencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  efficiencyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff"
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