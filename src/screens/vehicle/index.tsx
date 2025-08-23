import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';

const VehicleFinder = () => {
  const [searchText, setSearchText] = useState('');

  const vehicleData = [
    {
      id: 1,
      serialNo: '1253566',
      status: 'default',
    },
    {
      id: 2,
      serialNo: '12jkk655',
      status: 'ready',
    },
    {
      id: 3,
      serialNo: '141584',
      status: 'service',
    },
  ];

  const getStatusStyle = (status:any) => {
    switch (status) {
      case 'ready':
        return styles.readyText;
      case 'service':
        return styles.serviceText;
      default:
        return styles.defaultText;
    }
  };

  const getStatusText = (status:any) => {
    switch (status) {
      case 'ready':
        return 'Ready to Load';
      case 'service':
        return 'On In Service';
      default:
        return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {/* Header */}
        <Text style={styles.header}>Find Vehicle</Text>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search By Plate or Serial No"
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#999"
          />
        </View>

        {/* Find Button */}
        <TouchableOpacity style={styles.findButton}>
          <Text style={styles.findButtonText}>Find</Text>
        </TouchableOpacity>

        {/* Vehicle List Header */}
        <Text style={styles.listHeader}>Vehicle List</Text>

        {/* Vehicle Items */}
        <View style={styles.vehicleList}>
          {vehicleData.map((vehicle) => (
            <View key={vehicle.id} style={styles.vehicleItem}>
              <Text style={styles.vehicleText}>
                Cascadio : S.No : {vehicle.serialNo}
              </Text>
              {vehicle.status !== 'default' && (
                <Text style={getStatusStyle(vehicle.status)}>
                  {getStatusText(vehicle.status)}
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  findButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignSelf: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  findButtonText: {
    color: '#fff',
    fontSize: 16,
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
  readyText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  serviceText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  defaultText: {
    fontSize: 14,
    color: '#666',
  },
});

export default VehicleFinder;