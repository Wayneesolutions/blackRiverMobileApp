import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  StyleSheet 
} from 'react-native';

// Define types for the data structures
interface VehicleItem {
  id: string;
  name: string;
  serialNo: string;
  status: string;
  statusColor: string;
}

interface StepData {
  title: string;
  placeholder: string;
  data: VehicleItem[];
  listTitle: string;
}

const dummyVehicles: VehicleItem[] = [
  { 
    id: "1", 
    name: "Cascadia", 
    serialNo: "1253566", 
    status: "On Track with Active Load", 
    statusColor: "#F59E0B" 
  },
  { 
    id: "2", 
    name: "Cascadia", 
    serialNo: "12jkk555", 
    status: "Ready to Load", 
    statusColor: "#10B981" 
  },
  { 
    id: "3", 
    name: "Cascadia", 
    serialNo: "141584", 
    status: "On In Service", 
    statusColor: "#EF4444" 
  },
];

const dummyTrailers: VehicleItem[] = [
  { 
    id: "1", 
    name: "GreatDane", 
    serialNo: "1265456", 
    status: "Available", 
    statusColor: "#10B981" 
  },
  { 
    id: "2", 
    name: "GreatDane", 
    serialNo: "1394956", 
    status: "In Use", 
    statusColor: "#F59E0B" 
  },
  { 
    id: "3", 
    name: "Utility", 
    serialNo: "1389454", 
    status: "Maintenance", 
    statusColor: "#EF4444" 
  },
];

const dummyShipments: VehicleItem[] = [
  { 
    id: "1", 
    name: "Shipment", 
    serialNo: "SH001234", 
    status: "Ready to Ship", 
    statusColor: "#10B981" 
  },
  { 
    id: "2", 
    name: "Shipment", 
    serialNo: "SH005678", 
    status: "Processing", 
    statusColor: "#F59E0B" 
  },
  { 
    id: "3", 
    name: "Shipment", 
    serialNo: "SH009012", 
    status: "On Hold", 
    statusColor: "#EF4444" 
  },
];

const NewTripScreen = () => {
  const [step, setStep] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<VehicleItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<VehicleItem | null>(null);

  // Get current step data
  const getCurrentStepData = (): StepData | null => {
    switch (step) {
      case 1:
        return {
          title: "Find Vehicle",
          placeholder: "Search by Plate or Serial No",
          data: dummyVehicles,
          listTitle: "Vehicle List"
        };
      case 2:
        return {
          title: "Find Trailer",
          placeholder: "Search by Plate or Serial No",
          data: dummyTrailers,
          listTitle: "Trailer List"
        };
      case 3:
        return {
          title: "Attach Shipment",
          placeholder: "Search Shipment",
          data: dummyShipments,
          listTitle: "Shipment List"
        };
      default:
        return null;
    }
  };

  const handleSearch = () => {
    const stepData = getCurrentStepData();
    if (stepData) {
      // Filter results based on search query
      const filteredResults = stepData.data.filter((item: VehicleItem) =>
        item.serialNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filteredResults.length > 0 ? filteredResults : stepData.data);
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedItem(null);
    } else {
      // Final step - complete trip creation
      Alert.alert("Success", "Trip Created Successfully!");
      // Reset to initial state
      setStep(1);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedItem(null);
    }
  };

  const handleItemSelect = (item: VehicleItem) => {
    setSelectedItem(item);
  };

  const renderSearchSection = () => {
    const stepData = getCurrentStepData();
    if (!stepData) return null;

    return (
      <View style={styles.searchCard}>
        <Text style={styles.cardTitle}>
          {stepData.title}
        </Text>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={stepData.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          
          <TouchableOpacity
            style={styles.findButton}
            onPress={handleSearch}
          >
            <Text style={styles.buttonText}>Find</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderResultsList = () => {
    if (searchResults.length === 0) return null;

    const stepData = getCurrentStepData();
    if (!stepData) return null;
    
    return (
      <View style={styles.resultsCard}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            {stepData.listTitle}
          </Text>
        </View>
        
        <View>
          {searchResults.map((item: VehicleItem) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleItemSelect(item)}
              style={[
                styles.resultItem,
                selectedItem?.id === item.id && styles.selectedItem
              ]}
            >
              <View style={styles.itemContent}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>
                    {item.name} : S.No : {item.serialNo}
                  </Text>
                  <Text style={[styles.itemStatus, { color: item.statusColor }]}>
                    {item.status}
                  </Text>
                </View>
                {selectedItem?.id === item.id && (
                  <View style={styles.checkIconContainer}>
                    <Text style={styles.checkIcon}>✓</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        
        {selectedItem && (
          <View style={styles.nextButtonContainer}>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.buttonText}>
                {step === 3 ? 'Create Trip' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderProgressIndicator = () => {
    const steps = ['Vehicle', 'Trailer', 'Shipment'];
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          {steps.map((stepName, index) => (
            <View key={stepName} style={styles.stepRow}>
              <View style={styles.stepContainer}>
                <View
                  style={[
                    styles.stepCircle,
                    index + 1 === step && styles.activeStep,
                    index + 1 < step && styles.completedStep,
                  ]}
                >
                  <Text style={[
                    styles.stepNumber,
                    index + 1 === step && styles.activeStepText,
                    index + 1 < step && styles.completedStepText,
                  ]}>
                    {index + 1 < step ? '✓' : (index + 1).toString()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    index + 1 === step && styles.activeStepLabel,
                  ]}
                >
                  {stepName}
                </Text>
              </View>
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.stepConnector,
                    index + 1 < step && styles.completedConnector,
                  ]}
                />
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.mainTitle}>New Trip</Text>
          <Text style={styles.subtitle}>
            Follow the steps below to create a new trip
          </Text>
        </View>

        {renderProgressIndicator()}
        
        <View style={styles.sectionsContainer}>
          {renderSearchSection()}
          {renderResultsList()}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStep: {
    backgroundColor: '#8B5CF6',
  },
  completedStep: {
    backgroundColor: '#10B981',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeStepText: {
    color: '#FFFFFF',
  },
  completedStepText: {
    color: '#FFFFFF',
  },
  stepLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeStepLabel: {
    color: '#8B5CF6',
  },
  stepConnector: {
    width: 30,
    height: 2,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 8,
  },
  completedConnector: {
    backgroundColor: '#10B981',
  },
  sectionsContainer: {
    gap: 24,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  searchContainer: {
    gap: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  findButton: {
    backgroundColor: '#8B5CF6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  resultsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  resultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectedItem: {
    backgroundColor: '#F3F4F6',
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  itemStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  nextButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  nextButton: {
    backgroundColor: '#8B5CF6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
});

export default NewTripScreen;