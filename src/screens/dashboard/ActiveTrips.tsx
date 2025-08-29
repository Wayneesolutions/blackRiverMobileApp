import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions
} from "react-native";

const { width } = Dimensions.get('window');

interface Trip {
  id: number;
  startLocation: {
    city: string;
    state: string;
    address: string;
    coords: { lat: number; lng: number };
  };
  endLocation: {
    city: string;
    state: string;
    address: string;
    coords: { lat: number; lng: number };
  };
  cargo: {
    name: string;
    code: string;
    weight: string;
    type: string;
  };
  driverName: string;
  driverPhone: string;
  totalMiles: number;
  completedMiles: number;
  estimatedArrival: string;
  status: string;
  currentLocation: string;
}

interface SimpleMapProps {
  trip: Trip;
}

interface TripCardProps {
  trip: Trip;
}

const ActiveTrips = () => {
  // Enhanced sample data for active trips
  const activeTrips: Trip[] = [
    {
      id: 1,
      startLocation: {
        city: "New York",
        state: "NY",
        address: "1234 Industrial Blvd, New York, NY 10001",
        coords: { lat: 40.7128, lng: -74.0060 }
      },
      endLocation: {
        city: "Los Angeles",
        state: "CA",
        address: "5678 Warehouse Ave, Los Angeles, CA 90001",
        coords: { lat: 34.0522, lng: -118.2437 }
      },
      cargo: {
        name: "Electronics",
        code: "ELC-2024-001",
        weight: "15,000 lbs",
        type: "Fragile"
      },
      driverName: "John Smith",
      driverPhone: "+1-555-0123",
      totalMiles: 2789,
      completedMiles: 1245,
      estimatedArrival: "2024-08-30 14:30",
      status: "In Transit",
      currentLocation: "Denver, CO"
    },
    {
      id: 2,
      startLocation: {
        city: "Chicago",
        state: "IL",
        address: "9876 Commerce St, Chicago, IL 60601",
        coords: { lat: 41.8781, lng: -87.6298 }
      },
      endLocation: {
        city: "Miami",
        state: "FL",
        address: "3456 Port Rd, Miami, FL 33101",
        coords: { lat: 25.7617, lng: -80.1918 }
      },
      cargo: {
        name: "Pharmaceuticals",
        code: "PHR-2024-045",
        weight: "8,500 lbs",
        type: "Temperature Controlled"
      },
      driverName: "Maria Garcia",
      driverPhone: "+1-555-0456",
      totalMiles: 1365,
      completedMiles: 892,
      estimatedArrival: "2024-08-29 09:15",
      status: "In Transit",
      currentLocation: "Atlanta, GA"
    },
    {
      id: 3,
      startLocation: {
        city: "Seattle",
        state: "WA",
        address: "2468 Marine Dr, Seattle, WA 98101",
        coords: { lat: 47.6062, lng: -122.3321 }
      },
      endLocation: {
        city: "Denver",
        state: "CO",
        address: "1357 Mountain View Blvd, Denver, CO 80201",
        coords: { lat: 39.7392, lng: -104.9903 }
      },
      cargo: {
        name: "Automotive Parts",
        code: "AUTO-2024-078",
        weight: "22,000 lbs",
        type: "Standard"
      },
      driverName: "David Johnson",
      driverPhone: "+1-555-0789",
      totalMiles: 1318,
      completedMiles: 456,
      estimatedArrival: "2024-08-31 16:45",
      status: "In Transit",
      currentLocation: "Salt Lake City, UT"
    }, {
      id: 4,
      startLocation: {
        city: "New York",
        state: "NY",
        address: "1234 Industrial Blvd, New York, NY 10001",
        coords: { lat: 40.7128, lng: -74.0060 }
      },
      endLocation: {
        city: "Los Angeles",
        state: "CA",
        address: "5678 Warehouse Ave, Los Angeles, CA 90001",
        coords: { lat: 34.0522, lng: -118.2437 }
      },
      cargo: {
        name: "Electronics",
        code: "ELC-2024-001",
        weight: "15,000 lbs",
        type: "Fragile"
      },
      driverName: "John Smith",
      driverPhone: "+1-555-0123",
      totalMiles: 2789,
      completedMiles: 1245,
      estimatedArrival: "2024-08-30 14:30",
      status: "In Transit",
      currentLocation: "Denver, CO"
    },
    {
      id: 5,
      startLocation: {
        city: "New York",
        state: "NY",
        address: "1234 Industrial Blvd, New York, NY 10001",
        coords: { lat: 40.7128, lng: -74.0060 }
      },
      endLocation: {
        city: "Los Angeles",
        state: "CA",
        address: "5678 Warehouse Ave, Los Angeles, CA 90001",
        coords: { lat: 34.0522, lng: -118.2437 }
      },
      cargo: {
        name: "Electronics",
        code: "ELC-2024-001",
        weight: "15,000 lbs",
        type: "Fragile"
      },
      driverName: "John Smith",
      driverPhone: "+1-555-0123",
      totalMiles: 2789,
      completedMiles: 1245,
      estimatedArrival: "2024-08-30 14:30",
      status: "In Transit",
      currentLocation: "Denver, CO"
    },
  ];

  const [selectedTrip, setSelectedTrip] = useState<number | null>(null);

  const getProgressPercentage = (completed: number, total: number) => {
    return Math.round((completed / total) * 100);
  };

  const [trips, setTrips] = useState(activeTrips);

  const handleCompleteTrip = (tripId: any) => {
    // Remove trip from active and add to completed
    const tripToComplete = trips.find(trip => trip.id === tripId);
    if (tripToComplete) {
      setTrips(prevTrips => prevTrips.filter(trip => trip.id !== tripId));

      // In a real app, you'd call something like:
      // onTripCompleted(tripToComplete);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Transit": return "#27ae60";
      case "Delayed": return "#f39c12";
      case "Loading": return "#3498db";
      default: return "#95a5a6";
    }
  };

  const SimpleMap: React.FC<SimpleMapProps> = ({ trip }) => (
    <View style={styles.mapContainer}>
      <View style={styles.mapHeader}>
        <Text style={styles.mapIcon}>🗺️</Text>
        <Text style={styles.mapTitle}>Route Overview</Text>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, { backgroundColor: '#27ae60' }]} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLocationText}>
              {trip.startLocation.city}, {trip.startLocation.state}
            </Text>
            <Text style={styles.routeAddressText}>{trip.startLocation.address}</Text>
          </View>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.routePoint}>
          <View style={[styles.routeDot, { backgroundColor: '#3498db' }]} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLocationText}>Current: {trip.currentLocation}</Text>
            <Text style={styles.routeAddressText}>{trip.completedMiles} miles completed</Text>
          </View>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.routePoint}>
          <View style={[styles.routeDot, { backgroundColor: '#e74c3c' }]} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLocationText}>
              {trip.endLocation.city}, {trip.endLocation.state}
            </Text>
            <Text style={styles.routeAddressText}>{trip.endLocation.address}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const TripCard: React.FC<TripCardProps> = ({ trip }) => (
    <View style={styles.tripCard}>
      <View style={styles.cardHeader}>
        <View style={styles.headerInfo}>
          <Text style={styles.routeText}>
            {trip.startLocation.city}, {trip.startLocation.state} → {trip.endLocation.city}, {trip.endLocation.state}
          </Text>
          <View style={styles.currentLocationContainer}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.currentLocationText}>Currently in {trip.currentLocation}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
          <Text style={styles.statusText}>{trip.status}</Text>
        </View>
      </View>

      <View style={styles.detailsGrid}>
        <View style={styles.detailSection}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>📦</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailTitle}>{trip.cargo.name}</Text>
              <Text style={styles.detailSubtext}>Code: {trip.cargo.code}</Text>
              <Text style={styles.detailSubtext}>{trip.cargo.weight} • {trip.cargo.type}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>👤</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailTitle}>{trip.driverName}</Text>
              <Text style={styles.detailSubtext}>{trip.driverPhone}</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailSection}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>⏰</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailTitle}>Est. Arrival</Text>
              <Text style={styles.detailSubtext}>{trip.estimatedArrival}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🚛</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailTitle}>Distance</Text>
              <Text style={styles.detailSubtext}>{trip.totalMiles} miles total</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={styles.progressMiles}>
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

        <Text style={styles.progressPercentage}>
          {getProgressPercentage(trip.completedMiles, trip.totalMiles)}% Complete
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setSelectedTrip(selectedTrip === trip.id ? null : trip.id)}
        >
          <Text style={styles.primaryButtonText}>
            {selectedTrip === trip.id ? 'Hide Route' : 'View Route'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => handleCompleteTrip(trip.id)}
        >
          <Text style={styles.completeButtonText}>Complete Trip</Text>
        </TouchableOpacity>
      </View>

      {selectedTrip === trip.id && <SimpleMap trip={trip} />}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>

            <Text style={styles.headerTitle}>Active Trips</Text>
          </View>
          <Text style={styles.headerSubtitle}>Monitor your ongoing shipments in real-time</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#27ae60' }]} />
              <Text style={styles.statText}>{activeTrips.length} Active Trips</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#3498db' }]} />
              <Text style={styles.statText}>Real-time Tracking</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTrips.map(trip => (
          <TripCard
            key={trip.id}
            trip={trip}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ActiveTrips;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6fa"
  },
  header: {
    backgroundColor: "#8B5CF6",
    paddingBottom: 20
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 20
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  headerIcon: {
    fontSize: 32,
    marginRight: 12
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff"
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#e8d8ff",
    marginBottom: 16
  },
  statsContainer: {
    flexDirection: "row",
    gap: 24
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center"
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  statText: {
    fontSize: 14,
    color: "#e8d8ff"
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  tripCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#f1f2f6"
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20
  },
  headerInfo: {
    flex: 1,
    marginRight: 12
  },
  routeText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 6
  },
  currentLocationContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 6
  },
  currentLocationText: {
    fontSize: 14,
    color: "#7f8c8d"
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff"
  },
  detailsGrid: {
    flexDirection: "row",
    marginBottom: 20
  },
  detailSection: {
    flex: 1,
    gap: 16
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  detailIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2
  },
  detailContent: {
    flex: 1
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 2
  },
  detailSubtext: {
    fontSize: 13,
    color: "#7f8c8d",
    lineHeight: 18
  },
  progressSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#34495e"
  },
  progressMiles: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2c3e50"
  },
  progressBar: {
    height: 8,
    backgroundColor: "#ecf0f1",
    borderRadius: 4,
    marginBottom: 8
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3498db",
    borderRadius: 4
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3498db",
    textAlign: "center"
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#3498db",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700"
  },
  completeButton: {
    backgroundColor: "#27ae60",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    minWidth: 100
  },
  completeButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700"
  },
  secondaryButton: {
    backgroundColor: "#f1f2f6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: "#2c3e50",
    fontSize: 14,
    fontWeight: "700"
  },
  mapContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginTop: 20
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16
  },
  mapIcon: {
    fontSize: 20,
    marginRight: 8
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50"
  },
  routeContainer: {
    paddingLeft: 8
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12
  },
  routeInfo: {
    flex: 1,
    marginBottom: 8
  },
  routeLocationText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 2
  },
  routeAddressText: {
    fontSize: 13,
    color: "#7f8c8d",
    lineHeight: 18
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: "#ddd",
    marginLeft: 5,
    marginVertical: 4
  }
});