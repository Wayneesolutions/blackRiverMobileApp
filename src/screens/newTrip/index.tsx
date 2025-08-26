import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width: screenWidth } = Dimensions.get('window');

// Types
type RootStackParamList = {
  Dashboard: undefined;
  Inspection: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Inspection'>;

interface VehicleItem {
  id: string;
  name: string;
  serialNo: string;
  status: string;
  statusColor: string;
}

interface InspectionItem {
  id: string;
  name: string;
  isChecked: boolean;
}

// Data
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

const inspectionItems: InspectionItem[] = [
  { id: "1", name: "Brakes (Parking)", isChecked: false },
  { id: "2", name: "Brakes (Service)", isChecked: false },
  { id: "3", name: "Coupling Devices", isChecked: false },
  { id: "4", name: "Emergency Equipment", isChecked: false },
  { id: "5", name: "Horn", isChecked: false },
  { id: "6", name: "Lights and Reflectors", isChecked: false },
  { id: "7", name: "Mirrors", isChecked: false },
  { id: "8", name: "Steering", isChecked: false },
  { id: "9", name: "Tires", isChecked: false },
  { id: "10", name: "Wheels & Rims", isChecked: false },
  { id: "11", name: "Windshield Wipers", isChecked: false },
  { id: "12", name: "Others", isChecked: false },
];

// Progress Indicator Component
const ProgressIndicator = ({ currentStep }: { currentStep: number }) => {
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
                  index + 1 === currentStep && styles.activeStep,
                  index + 1 < currentStep && styles.completedStep,
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    index + 1 === currentStep && styles.activeStepText,
                    index + 1 < currentStep && styles.completedStepText,
                  ]}
                >
                  {index + 1 < currentStep ? '✓' : (index + 1).toString()}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  index + 1 === currentStep && styles.activeStepLabel,
                ]}
              >
                {stepName}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepConnector,
                  index + 1 < currentStep && styles.completedConnector,
                ]}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

// Back Button Component
const BackButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.backButton} onPress={onPress}>
    <Text style={styles.backButtonText}>← Back</Text>
  </TouchableOpacity>
);

// Search Form Component
const SearchForm = ({
  title,
  placeholder,
  searchQuery,
  setSearchQuery,
  onFind,
  onBack
}: {
  title: string;
  placeholder: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onFind: () => void;
  onBack: () => void;
}) => (
  <ScrollView style={styles.scrollViewContainer} showsVerticalScrollIndicator={false}>
    <View style={styles.searchFormContainer}>
      <BackButton onPress={onBack} />

      <View style={styles.titleSection}>
        <Text style={styles.mainTitle}>{title}</Text>
      </View>

      <View style={styles.searchCard}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            style={styles.findButton}
            onPress={onFind}
          >
            <Text style={styles.buttonText}>Find</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </ScrollView>
);

// Results List Component
const ResultsList = ({
  title,
  items,
  selectedItem,
  onItemSelect,
  onNext,
  onBack
}: {
  title: string;
  items: VehicleItem[];
  selectedItem: VehicleItem | null;
  onItemSelect: (item: VehicleItem) => void;
  onNext: () => void;
  onBack: () => void;
}) => (
  <View style={styles.resultsContainer}>
    <BackButton onPress={onBack} />

    <View style={styles.titleSection}>
      <Text style={styles.mainTitle}>{title}</Text>
    </View>

    <View style={styles.resultsCard}>
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>{title}</Text>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {items.map((item: VehicleItem) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => onItemSelect(item)}
            style={[
              styles.resultItem,
              selectedItem?.id === item.id && styles.selectedItem,
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
      </ScrollView>

      {selectedItem && (
        <View style={styles.nextButtonContainer}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={onNext}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  </View>
);

// Inspection Screen Component
const InspectionScreen = ({
  selectedVehicle,
  inspectionChecklist,
  inspectionLocation,
  setInspectionLocation,
  remarks,
  setRemarks,
  inspectionType,
  setInspectionType,
  onInspectionItemToggle,
  onSubmit,
  onBack,
  showForm,
  setShowForm
}: {
  selectedVehicle: VehicleItem | null;
  inspectionChecklist: InspectionItem[];
  inspectionLocation: string;
  setInspectionLocation: (location: string) => void;
  remarks: string;
  setRemarks: (remarks: string) => void;
  inspectionType: string;
  setInspectionType: (type: string) => void;
  onInspectionItemToggle: (id: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  showForm: boolean;
  setShowForm: (show: boolean) => void;
}) => {
  if (!selectedVehicle) return null;

  // Check if any checkbox is selected (has defects)
  const hasDefects = inspectionChecklist.some(item => item.isChecked);

  return (
    <View style={styles.inspectionContainer}>
      <BackButton onPress={onBack} />

      <View style={styles.inspectionHeaderCard}>
        <View style={styles.inspectionHeader}>
          <View style={styles.inspectionHeaderInfo}>
            <Text style={styles.inspectionTitle}>Inspect Vehicle</Text>
            <Text style={styles.inspectionSubtitle}>
              {selectedVehicle.name} : S.No : {selectedVehicle.serialNo}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: selectedVehicle.statusColor + '20',
              }
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: selectedVehicle.statusColor }]}>
              {selectedVehicle.status}
            </Text>
          </View>
        </View>

        {!showForm && (
          <TouchableOpacity
            onPress={() => setShowForm(true)}
            style={styles.greenButton}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>

      {showForm && (
        <ScrollView style={styles.resultsCard} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.expandPreviewsButton}>
            <Text style={styles.expandPreviewsText}>Expand Previous Inspection</Text>
          </TouchableOpacity>

          <View style={styles.newInspectionHeader}>
            <Text style={styles.newInspectionText}>New inspection</Text>
          </View>

          <View style={styles.checklistContainer}>
            {inspectionChecklist.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.inspectionItem}
                onPress={() => onInspectionItemToggle(item.id)}
              >
                <View style={styles.checkboxItemContainer}>
                  <View style={[styles.checkbox, item.isChecked && styles.checkedBox]}>
                    {item.isChecked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.inspectionItemText}>{item.name}</Text>
                </View>
                <View style={styles.dropdownIcon}>
                  <Text style={styles.dropdownArrow}>⌄</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Inspection Location</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter inspection location"
              value={inspectionLocation}
              onChangeText={setInspectionLocation}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Remarks</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Enter remarks"
              value={remarks}
              onChangeText={setRemarks}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Select Inspection Type</Text>
            <View style={styles.typeButtonsContainer}>
              {['Pre Trip', 'In Trip', 'Post Trip'].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setInspectionType(type)}
                  style={[
                    styles.typeButton,
                    inspectionType === type && styles.selectedTypeButton,
                  ]}
                >
                  <Text style={[
                    styles.typeButtonText,
                    inspectionType === type && styles.selectedTypeButtonText,
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.submitContainer}>
            <View style={styles.submitButtonsRow}>
              {/* Show "No Defects" button only if NO checkboxes are selected */}
              {!hasDefects && (
                <TouchableOpacity
                  onPress={onSubmit}
                  style={[
                    styles.noDefectsButton,
                    { opacity: !inspectionType ? 0.5 : 1 }
                  ]}
                  disabled={!inspectionType}
                >
                  <Text style={styles.buttonText}>No Defects</Text>
                </TouchableOpacity>
              )}
              
              {/* Submit button - always show but adjust width */}
              <TouchableOpacity
                onPress={onSubmit}
                style={[
                  styles.submitButton,
                  { opacity: !inspectionType ? 0.5 : 1 },
                  hasDefects ? styles.submitButtonFullWidth : {}
                ]}
                disabled={!inspectionType}
              >
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

// Success Screen Component
const SuccessScreen = ({
  selectedVehicle,
  onFinish
}: {
  selectedVehicle: VehicleItem | null;
  onFinish: () => void;
}) => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.successContainer}>
      <View style={styles.successCard}>
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Text style={styles.successCheckmark}>✓</Text>
          </View>
          <Text style={styles.successTitle}>
            Inspection Saved Successfully
          </Text>
          {selectedVehicle && (
            <Text style={styles.successSubtitle}>
              {selectedVehicle.name} : S.No : {selectedVehicle.serialNo}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => {
            onFinish();
            navigation.navigate('Dashboard');
          }}
          style={styles.nextButton}
        >
          <Text style={styles.buttonText}>Finish</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Main Component
const NewTripScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  // Main flow states
  const [currentStep, setCurrentStep] = useState<number>(1); // 1=Vehicle, 2=Trailer, 3=Shipment, 4=Inspection, 5=Success
  const [currentView, setCurrentView] = useState<'search' | 'results' | 'inspection' | 'success'>('search');

  // Search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<VehicleItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<{
    vehicle: VehicleItem | null;
    trailer: VehicleItem | null;
    shipment: VehicleItem | null;
  }>({
    vehicle: null,
    trailer: null,
    shipment: null
  });

  // Inspection states
  const [inspectionChecklist, setInspectionChecklist] = useState<InspectionItem[]>([...inspectionItems]);
  const [inspectionLocation, setInspectionLocation] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [inspectionType, setInspectionType] = useState<string>("");
  const [showInspectionForm, setShowInspectionForm] = useState<boolean>(false);

  const getStepConfig = () => {
    switch (currentStep) {
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
    const config = getStepConfig();
    if (!config) return;

    const filteredResults = config.data.filter((item: VehicleItem) =>
      item.serialNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setSearchResults(filteredResults.length > 0 ? filteredResults : config.data);
    setCurrentView('results');
  };

  const handleItemSelect = (item: VehicleItem) => {
    const key = currentStep === 1 ? 'vehicle' : currentStep === 2 ? 'trailer' : 'shipment';
    setSelectedItems(prev => ({ ...prev, [key]: item }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      // Move to next step
      setCurrentStep(currentStep + 1);
      setCurrentView('search');
      setSearchQuery("");
      setSearchResults([]);
    } else {
      // Move to inspection
      setCurrentStep(4);
      setCurrentView('inspection');
    }
  };

  const handleBack = () => {
    if (currentView === 'results') {
      // Go back from results to search
      setCurrentView('search');
      setSearchResults([]);
    } else if (currentView === 'inspection') {
      // Go back from inspection to previous step (shipment search)
      setCurrentStep(3);
      setCurrentView('search');
      setShowInspectionForm(false);
    } else if (currentView === 'search') {
      // Go back from search to previous step or dashboard
      if (currentStep > 1) {
        setCurrentStep(currentStep - 1);
        setSearchQuery("");
        setSearchResults([]);
        // Reset selection for current step when going back
        const currentKey = currentStep === 1 ? 'vehicle' : currentStep === 2 ? 'trailer' : 'shipment';
        setSelectedItems(prev => ({ ...prev, [currentKey]: null }));
      } else {
        // Only go to dashboard if we're at the first step
        navigation.navigate('Dashboard');
      }
    }
  };

  const handleInspectionItemToggle = (id: string) => {
    setInspectionChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isChecked: !item.isChecked } : item
      )
    );
  };

  const handleInspectionSubmit = () => {
    setCurrentStep(5);
    setCurrentView('success');
  };

  const handleFinish = () => {
    // Reset all states
    setCurrentStep(1);
    setCurrentView('search');
    setSearchQuery("");
    setSearchResults([]);
    setSelectedItems({ vehicle: null, trailer: null, shipment: null });
    setInspectionChecklist([...inspectionItems]);
    setInspectionLocation("");
    setRemarks("");
    setInspectionType("");
    setShowInspectionForm(false);
  };

  const getCurrentSelectedItem = () => {
    return currentStep === 1 ? selectedItems.vehicle :
      currentStep === 2 ? selectedItems.trailer :
        selectedItems.shipment;
  };

  const renderContent = () => {
    const config = getStepConfig();

    // Success Screen
    if (currentView === 'success') {
      return (
        <SuccessScreen
          selectedVehicle={selectedItems.vehicle}
          onFinish={handleFinish}
        />
      );
    }

    // Inspection Screen
    if (currentView === 'inspection') {
      return (
        <InspectionScreen
          selectedVehicle={selectedItems.vehicle}
          inspectionChecklist={inspectionChecklist}
          inspectionLocation={inspectionLocation}
          setInspectionLocation={setInspectionLocation}
          remarks={remarks}
          setRemarks={setRemarks}
          inspectionType={inspectionType}
          setInspectionType={setInspectionType}
          onInspectionItemToggle={handleInspectionItemToggle}
          onSubmit={handleInspectionSubmit}
          onBack={handleBack}
          showForm={showInspectionForm}
          setShowForm={setShowInspectionForm}
        />
      );
    }

    // Results List
    if (currentView === 'results' && config) {
      return (
        <ResultsList
          title={config.listTitle}
          items={searchResults}
          selectedItem={getCurrentSelectedItem()}
          onItemSelect={handleItemSelect}
          onNext={handleNext}
          onBack={handleBack}
        />
      );
    }

    // Search Form (default)
    if (config) {
      return (
        <View style={styles.mainContainer}>
          <ProgressIndicator currentStep={currentStep} />
          <SearchForm
            title={config.title}
            placeholder={config.placeholder}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onFind={handleSearch}
            onBack={handleBack}
          />
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {renderContent()}
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  scrollViewContainer: {
    flex: 1,
  },
  searchFormContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  inspectionContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  successContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  progressContainer: {
    marginTop: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    textAlign: 'center',
  },
  activeStepLabel: {
    color: '#8B5CF6',
  },
  stepConnector: {
    width: Math.min(30, (screenWidth - 200) / 3),
    height: 2,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 8,
  },
  completedConnector: {
    backgroundColor: '#10B981',
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 20,
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
    minHeight: 48,
  },
  findButton: {
    backgroundColor: '#8B5CF6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    flex: 1,
    maxHeight: '80%',
  },
  resultsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  scrollContainer: {
    flex: 1,
  },
  resultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 80,
    justifyContent: 'center',
  },
  selectedItem: {
    backgroundColor: '#F3F4F6',
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
    flexWrap: 'wrap',
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
    flexShrink: 0,
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
    minHeight: 48,
    justifyContent: 'center',
  },
  inspectionHeaderCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  inspectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  inspectionHeaderInfo: {
    flex: 1,
    paddingRight: 12,
  },
  inspectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  inspectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  greenButton: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  expandPreviewsButton: {
    backgroundColor: '#8B5CF6',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandPreviewsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  newInspectionHeader: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  newInspectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  checklistContainer: {
    backgroundColor: '#FFFFFF',
  },
  inspectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    minHeight: 60,
  },
  checkboxItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkedBox: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inspectionItemText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
    flexWrap: 'wrap',
  },
  dropdownIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownArrow: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  inputSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    minHeight: 40,
    justifyContent: 'center',
  },
  selectedTypeButton: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  selectedTypeButtonText: {
    color: '#FFFFFF',
  },
  submitContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  submitButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  submitButton: {
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  submitButtonFullWidth: {
    flex: 1,
  },
  noDefectsButton: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    margin: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    maxHeight: '80%',
  },
  successContent: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#10B981',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successCheckmark: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    flexWrap: 'wrap',
  },
});

export default NewTripScreen;