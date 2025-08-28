import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';


interface DocumentInfo {
  status: "active" | "expired" | "pending";
  expiryDate: string;
}

interface TrailerInfo {
  serialNo: string;
  capacity: string;
  status: string;
}

interface Location {
  address: string;
  city: string;
  state: string;
}

interface Vehicle {
  serialNo: string;
  status: "active" | "inactive" | "maintenance";
  hasTrailer: boolean;
  trailerInfo?: TrailerInfo;
  location?: Location;
  distance: number;
  documents: Record<string, DocumentInfo>;
}


const VehicleFinder = () => {
  const [searchText, setSearchText] = useState('');
  const [currentScreen, setCurrentScreen] = useState('vehicleList'); // 'vehicleList' or 'documents'
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [filterType, setFilterType] = useState('all'); // 'all', 'nearby', 'withTrailer'

  // Current user location (Ludhiana, Punjab)
  const userLocation = { lat: 30.9010, lng: 75.8573, city: 'Ludhiana', state: 'Punjab' };

  const vehicleData = [
    {
      id: 1,
      serialNo: '1253566',
      status: 'available',
      location: { lat: 30.9015, lng: 75.8580, city: 'Ludhiana', state: 'Punjab', address: 'Model Town' },
      distance: 1.2, // km from user
      hasTrailer: true,
      trailerInfo: {
        serialNo: 'TRL-001',
        capacity: '20 tons',
        status: 'attached'
      },
      documents: {
        registration: { status: 'completed', expiryDate: '2025-12-15' },
        insurance: { status: 'pending', expiryDate: '2025-08-30' },
        permit: { status: 'expired', expiryDate: '2025-07-20' },
        fitness: { status: 'completed', expiryDate: '2026-03-10' },
      }
    },
    {
      id: 2,
      serialNo: '12jkk655',
      status: 'ready',
      location: { lat: 30.8850, lng: 75.8400, city: 'Ludhiana', state: 'Punjab', address: 'Civil Lines' },
      distance: 3.5, // km from user
      hasTrailer: false,
      trailerInfo: null,
      documents: {
        registration: { status: 'completed', expiryDate: '2025-11-22' },
        insurance: { status: 'completed', expiryDate: '2025-10-15' },
        permit: { status: 'completed', expiryDate: '2025-09-30' },
        fitness: { status: 'pending', expiryDate: '2025-12-01' },
      }
    },
    {
      id: 3,
      serialNo: '141584',
      status: 'service',
      location: { lat: 31.0804, lng: 77.1734, city: 'Shimla', state: 'Himachal Pradesh', address: 'Mall Road' },
      distance: 285, // km from user
      hasTrailer: true,
      trailerInfo: {
        serialNo: 'TRL-003',
        capacity: '25 tons',
        status: 'attached'
      },
      documents: {
        registration: { status: 'completed', expiryDate: '2025-12-05' },
        insurance: { status: 'expired', expiryDate: '2025-07-15' },
        permit: { status: 'completed', expiryDate: '2025-11-20' },
        fitness: { status: 'completed', expiryDate: '2025-10-25' },
      }
    },
    {
      id: 4,
      serialNo: '987654',
      status: 'available',
      location: { lat: 30.9200, lng: 75.8700, city: 'Ludhiana', state: 'Punjab', address: 'BRS Nagar' },
      distance: 2.8, // km from user
      hasTrailer: true,
      trailerInfo: {
        serialNo: 'TRL-004',
        capacity: '18 tons',
        status: 'attached'
      },
      documents: {
        registration: { status: 'completed', expiryDate: '2025-10-30' },
        insurance: { status: 'completed', expiryDate: '2025-09-20' },
        permit: { status: 'completed', expiryDate: '2025-11-15' },
        fitness: { status: 'pending', expiryDate: '2025-12-10' },
      }
    }
  ];

  const getStatusStyle = (status: any) => {
    switch (status) {
      case 'ready':
        return [styles.statusText, styles.readyStatus];
      case 'service':
        return [styles.statusText, styles.serviceStatus];
      case 'available':
        return [styles.statusText, styles.availableStatus];
      default:
        return [styles.statusText, styles.defaultStatus];
    }
  };

  const getStatusText = (status: any) => {
    switch (status) {
      case 'ready':
        return 'Ready to Load';
      case 'service':
        return 'In Service';
      case 'available':
        return 'Available';
      default:
        return 'Unknown';
    }
  };

  const getDocumentStatusStyle = (status: any) => {
    switch (status) {
      case 'completed':
        return [styles.docStatusText, styles.completedDoc];
      case 'pending':
        return [styles.docStatusText, styles.pendingDoc];
      case 'expired':
        return [styles.docStatusText, styles.expiredDoc];
      default:
        return [styles.docStatusText, styles.defaultDoc];
    }
  };

  const getDocumentStatusText = (status: any) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'expired':
        return 'Expired';
      default:
        return 'Not Available';
    }
  };

  const handleVehiclePress = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setCurrentScreen('documents');
  };

  const handleBackPress = () => {
    setCurrentScreen('vehicleList');
    setSelectedVehicle(null);
  };

  // Filter vehicles based on search text and filter type
  const filteredVehicles = vehicleData.filter(vehicle => {
    const matchesSearch = vehicle.serialNo.toLowerCase().includes(searchText.toLowerCase());

    switch (filterType) {
      case 'nearby':
        return matchesSearch && vehicle.distance <= 10; // Within 10km
      case 'withTrailer':
        return matchesSearch && vehicle.hasTrailer;
      default:
        return matchesSearch;
    }
  });

  const renderVehicleList = () => (
    <View style={styles.content}>
      {/* Header */}
      <Text style={styles.header}>Find Vehicle</Text>

      {/* Search Input + Find Button in one row */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search By Plate or Serial No"
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.findButton}>
          <Text style={styles.findButtonText}>Find</Text>
        </TouchableOpacity>
      </View>


      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.filterButtonText, filterType === 'all' && styles.filterButtonTextActive]}>
            All Vehicles
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'nearby' && styles.filterButtonActive]}
          onPress={() => setFilterType('nearby')}
        >
          <Text style={[styles.filterButtonText, filterType === 'nearby' && styles.filterButtonTextActive]}>
            📍 Nearby
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'withTrailer' && styles.filterButtonActive]}
          onPress={() => setFilterType('withTrailer')}
        >
          <Text style={[styles.filterButtonText, filterType === 'withTrailer' && styles.filterButtonTextActive]}>
            🚛 With Trailer
          </Text>
        </TouchableOpacity>
      </View>



      {/* Vehicle List Header */}
      <Text style={styles.listHeader}>
        Vehicle List ({filteredVehicles.length} found)
      </Text>

      {/* Vehicle Items */}
      <View style={styles.vehicleList}>
        {filteredVehicles.map((vehicle) => (
          <TouchableOpacity
            key={vehicle.id}
            style={styles.vehicleItem}
            onPress={() => handleVehiclePress(vehicle)}
            activeOpacity={0.7}
          >
            <Text style={styles.vehicleText}>
              Cascadio : S.No : {vehicle.serialNo}
            </Text>
            <View style={styles.vehicleDetailsRow}>
              <Text style={getStatusStyle(vehicle.status)}>
                {getStatusText(vehicle.status)}
              </Text>
              {vehicle.hasTrailer && (
                <Text style={styles.trailerBadge}>🚛 Trailer Attached</Text>
              )}
            </View>
            <View style={styles.locationRow}>
              <Text style={styles.locationText}>
                📍 {vehicle.location.address}, {vehicle.location.city}
              </Text>
              <Text style={styles.distanceText}>
                {vehicle.distance < 1
                  ? `${(vehicle.distance * 1000).toFixed(0)}m away`
                  : `${vehicle.distance.toFixed(1)}km away`
                }
              </Text>
            </View>
            {vehicle.hasTrailer && (
              <Text style={styles.trailerInfo}>
                Trailer: {vehicle.trailerInfo?.serialNo} ({vehicle.trailerInfo?.capacity})
              </Text>
            )}
            <Text style={styles.tapHint}>Tap to view documents</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDocuments = () => (
    <View style={styles.content}>
      {/* Header with Back Button */}
      <View style={styles.documentsHeader}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Vehicle Documents</Text>
      </View>

      {/* Vehicle Info */}
      <View style={styles.vehicleInfoCard}>
        <Text style={styles.vehicleInfoText}>
          Cascadio : S.No : {selectedVehicle?.serialNo}
        </Text>
        <View style={styles.vehicleDetailsRow}>
          <Text style={getStatusStyle(selectedVehicle?.status)}>
            {getStatusText(selectedVehicle?.status)}
          </Text>
          {selectedVehicle?.hasTrailer && (
            <Text style={styles.trailerBadge}>🚛 Trailer Attached</Text>
          )}
        </View>
        <View style={styles.locationRow}>
          <Text style={styles.locationText}>
            📍 {selectedVehicle?.location?.address}, {selectedVehicle?.location?.city}, {selectedVehicle?.location?.state}
          </Text>
          <Text style={styles.distanceText}>
            {(selectedVehicle?.distance ?? 0) < 1
              ? `${((selectedVehicle?.distance ?? 0) * 1000).toFixed(0)}m away`
              : `${(selectedVehicle?.distance ?? 0).toFixed(1)}km away`}
          </Text>
        </View>
        {selectedVehicle?.hasTrailer && selectedVehicle?.trailerInfo && (
          <View style={styles.trailerDetailsCard}>
            <Text style={styles.trailerTitle}>Trailer Details:</Text>
            <Text style={styles.trailerDetail}>Serial No: {selectedVehicle.trailerInfo.serialNo}</Text>
            <Text style={styles.trailerDetail}>Capacity: {selectedVehicle.trailerInfo.capacity}</Text>
            <Text style={styles.trailerDetail}>Status: {selectedVehicle.trailerInfo.status}</Text>
          </View>
        )}
      </View>

      {/* Documents List */}
      <Text style={styles.listHeader}>Documents Status</Text>
      <View style={styles.documentsList}>
        {selectedVehicle?.documents && Object.entries(selectedVehicle.documents).map(([docType, docInfo]) => (
          <View key={docType} style={styles.documentItem}>
            <View style={styles.documentHeader}>
              <Text style={styles.documentType}>
                {docType.charAt(0).toUpperCase() + docType.slice(1)}
              </Text>
              <Text style={getDocumentStatusStyle(docInfo.status)}>
                {getDocumentStatusText(docInfo.status)}
              </Text>
            </View>
            <Text style={styles.expiryText}>
              Expiry Date: {docInfo.expiryDate}
            </Text>
            {docInfo.status === 'expired' && (
              <Text style={styles.warningText}>⚠️ Document has expired</Text>
            )}
            {docInfo.status === 'pending' && (
              <Text style={styles.pendingText}>📋 Action required</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentScreen === 'vehicleList' ? renderVehicleList() : renderDocuments()}
      </ScrollView>

    </SafeAreaView>
  );
};

export default VehicleFinder;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80, // Add padding to account for footer
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  documentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },

  searchInput: {
    flex: 1, // take available space
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginRight: 8, // space between input & button
    color: "#000",
  },

  findButton: {
    backgroundColor: "#007bff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },

  findButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: 44,
  },
  filterButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  listHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  vehicleList: {
    flex: 1,
  },
  vehicleItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  vehicleText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 2,
  },
  readyStatus: {
    color: '#10B981',
  },
  serviceStatus: {
    color: '#EF4444',
  },
  availableStatus: {
    color: '#3B82F6',
  },
  defaultStatus: {
    color: '#666',
  },
  tapHint: {
    fontSize: 12,
    color: '#8B5CF6',
    fontStyle: 'italic',
    marginTop: 5,
  },
  vehicleInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  vehicleInfoText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 5,
  },
  documentsList: {
    flex: 1,
  },
  documentItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  docStatusText: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  completedDoc: {
    color: '#10B981',
    backgroundColor: '#D1FAE5',
  },
  pendingDoc: {
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  expiredDoc: {
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  defaultDoc: {
    color: '#666',
    backgroundColor: '#F3F4F6',
  },
  expiryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  pendingText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  vehicleDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  trailerBadge: {
    fontSize: 12,
    color: '#8B5CF6',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 3,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    marginRight: 10,
  },
  distanceText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  trailerInfo: {
    fontSize: 12,
    color: '#8B5CF6',
    fontStyle: 'italic',
    marginTop: 3,
  },
  trailerDetailsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  trailerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  trailerDetail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});