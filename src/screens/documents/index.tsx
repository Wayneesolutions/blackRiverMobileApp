import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';

interface Vehicle {
  id: string;
  name: string;
  plateNumber: string;
  type: string;
  status: 'active' | 'inactive';
}

interface Document {
  id: string;
  name: string;
  type: 'vehicle' | 'cross_border' | 'driver' | 'permit' | 'trailer' | 'transport_goods' | 'eld';
  status: 'valid' | 'expired' | 'expiring_soon';
  expiryDate: string;
  issueDate: string;
  documentNumber?: string;
}

type TabKey = 'vehicle' | 'cross_border' | 'driver' | 'permits' | 'trailer' | 'transport_goods' | 'eld';

const DocumentsScreen = () => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('vehicle');
  const tabScrollViewRef = useRef<ScrollView>(null);
  const handleViewDocument = (document: Document) => {
    // Handle document viewing logic here
    console.log('Viewing document:', document.name);
    // In a real app, you might open a PDF viewer or navigate to a detail screen
  };

  // Static vehicle data
  const vehicles: Vehicle[] = [
    { id: '1', name: 'Freightliner Cascadia', plateNumber: 'ABC-123', type: 'Truck', status: 'active' },
    { id: '2', name: 'Peterbilt 579', plateNumber: 'XYZ-456', type: 'Truck', status: 'active' },
    { id: '3', name: 'Kenworth T680', plateNumber: 'DEF-789', type: 'Truck', status: 'inactive' },
    { id: '4', name: 'Volvo VNL', plateNumber: 'GHI-012', type: 'Truck', status: 'active' },
  ];

  // Static document data based on selected vehicle
  const getDocuments = (vehicleId: string | null, type: string): Document[] => {
    // Driver documents are always available regardless of vehicle selection
    if (type === 'driver') {
      return [
        { id: 'd1', name: 'Commercial Driver License', type: 'driver', status: 'valid', expiryDate: '2025-12-15', issueDate: '2021-12-15', documentNumber: 'CDL-123456' },
        { id: 'd2', name: 'Medical Certificate', type: 'driver', status: 'expiring_soon', expiryDate: '2025-09-30', issueDate: '2023-09-30', documentNumber: 'MED-789012' },
        { id: 'd3', name: 'HAZMAT Endorsement', type: 'driver', status: 'valid', expiryDate: '2026-03-20', issueDate: '2022-03-20', documentNumber: 'HAZ-345678' },
        { id: 'd4', name: 'Passport', type: 'driver', status: 'valid', expiryDate: '2028-05-10', issueDate: '2018-05-10', documentNumber: 'PP-987654321' },
        { id: 'd5', name: 'TWIC Card', type: 'driver', status: 'valid', expiryDate: '2026-09-15', issueDate: '2021-09-15', documentNumber: 'TWIC-555444' },
        { id: 'd6', name: 'Driver Hours of Service Record', type: 'driver', status: 'valid', expiryDate: '2025-12-31', issueDate: '2025-01-01', documentNumber: 'HOS-789123' },
      ];
    }

    // ELD documents are always available regardless of vehicle selection
    if (type === 'eld') {
      return [
        { id: 'eld1', name: 'ELD Device Registration', type: 'eld', status: 'valid', expiryDate: '2026-12-31', issueDate: '2022-01-01', documentNumber: 'ELD-REG-001' },
        { id: 'eld2', name: 'ELD Compliance Certificate', type: 'eld', status: 'valid', expiryDate: '2025-11-30', issueDate: '2023-11-30', documentNumber: 'ELD-COMP-002' },
        { id: 'eld3', name: 'Driver Training Certificate', type: 'eld', status: 'expiring_soon', expiryDate: '2025-09-15', issueDate: '2023-09-15', documentNumber: 'ELD-TRAIN-003' },
        { id: 'eld4', name: 'ELD Malfunction Report', type: 'eld', status: 'valid', expiryDate: '2025-12-31', issueDate: '2025-08-01', documentNumber: 'ELD-MAL-004' },
        { id: 'eld5', name: 'Hours of Service Data Transfer', type: 'eld', status: 'valid', expiryDate: '2025-12-31', issueDate: '2025-01-01', documentNumber: 'ELD-DATA-005' },
      ];
    }

    // Vehicle-specific documents
    if (!vehicleId) {
      return [];
    }

    const baseDocuments: Record<string, Document[]> = {
      vehicle: [
        { id: 'v1', name: 'Vehicle Registration', type: 'vehicle', status: 'valid', expiryDate: '2025-11-30', issueDate: '2023-11-30', documentNumber: `REG-${vehicleId}001` },
        { id: 'v2', name: 'Insurance Certificate', type: 'vehicle', status: 'valid', expiryDate: '2025-10-15', issueDate: '2024-10-15', documentNumber: `INS-${vehicleId}002` },
        { id: 'v3', name: 'Safety Inspection', type: 'vehicle', status: 'expiring_soon', expiryDate: '2025-09-05', issueDate: '2024-09-05', documentNumber: `SAF-${vehicleId}003` },
        { id: 'v4', name: 'Emission Test', type: 'vehicle', status: 'valid', expiryDate: '2026-01-20', issueDate: '2024-01-20', documentNumber: `EMI-${vehicleId}004` },
        { id: 'v5', name: 'Vehicle Title', type: 'vehicle', status: 'valid', expiryDate: '2030-12-31', issueDate: '2020-01-01', documentNumber: `TTL-${vehicleId}005` },
        { id: 'v6', name: 'DOT Number Certificate', type: 'vehicle', status: 'valid', expiryDate: '2026-06-30', issueDate: '2024-06-30', documentNumber: `DOT-${vehicleId}006` },
      ],
      cross_border: [
        { id: 'cb1', name: 'FAST Card', type: 'cross_border', status: 'valid', expiryDate: '2027-08-15', issueDate: '2022-08-15', documentNumber: `FAST-${vehicleId}001` },
        { id: 'cb2', name: 'Carnet Document', type: 'cross_border', status: 'valid', expiryDate: '2025-12-31', issueDate: '2024-01-01', documentNumber: `CAR-${vehicleId}002` },
        { id: 'cb3', name: 'Customs Bond', type: 'cross_border', status: 'expired', expiryDate: '2025-07-20', issueDate: '2024-07-20', documentNumber: `CB-${vehicleId}003` },
        { id: 'cb4', name: 'Border Crossing Permit', type: 'cross_border', status: 'valid', expiryDate: '2025-11-10', issueDate: '2024-11-10', documentNumber: `BCP-${vehicleId}004` },
        { id: 'cb5', name: 'International Fuel Tax Agreement', type: 'cross_border', status: 'valid', expiryDate: '2025-12-31', issueDate: '2025-01-01', documentNumber: `IFTA-${vehicleId}005` },
        { id: 'cb6', name: 'C-TPAT Certificate', type: 'cross_border', status: 'valid', expiryDate: '2026-03-31', issueDate: '2023-03-31', documentNumber: `CTPAT-${vehicleId}006` },
      ],
      permits: [
        { id: 'p1', name: 'Oversize Load Permit', type: 'permit', status: 'valid', expiryDate: '2025-10-31', issueDate: '2025-08-01', documentNumber: `OSL-${vehicleId}001` },
        { id: 'p2', name: 'Hazardous Materials Permit', type: 'permit', status: 'valid', expiryDate: '2026-02-28', issueDate: '2025-02-28', documentNumber: `HMP-${vehicleId}002` },
        { id: 'p3', name: 'Interstate Commerce Permit', type: 'permit', status: 'expired', expiryDate: '2025-07-15', issueDate: '2024-07-15', documentNumber: `ICP-${vehicleId}003` },
        { id: 'p4', name: 'Weight Distance Tax Permit', type: 'permit', status: 'valid', expiryDate: '2025-12-31', issueDate: '2025-01-01', documentNumber: `WDT-${vehicleId}004` },
        { id: 'p5', name: 'Operating Authority', type: 'permit', status: 'valid', expiryDate: '2026-12-31', issueDate: '2024-01-01', documentNumber: `OA-${vehicleId}005` },
      ],
      trailer: [
        { id: 't1', name: 'Trailer Registration', type: 'trailer', status: 'valid', expiryDate: '2025-12-15', issueDate: '2023-12-15', documentNumber: `TREG-${vehicleId}001` },
        { id: 't2', name: 'Trailer Insurance', type: 'trailer', status: 'valid', expiryDate: '2025-10-31', issueDate: '2024-10-31', documentNumber: `TINS-${vehicleId}002` },
        { id: 't3', name: 'Trailer Inspection Certificate', type: 'trailer', status: 'expiring_soon', expiryDate: '2025-09-20', issueDate: '2024-09-20', documentNumber: `TINSP-${vehicleId}003` },
        { id: 't4', name: 'Trailer Title', type: 'trailer', status: 'valid', expiryDate: '2030-12-31', issueDate: '2020-01-01', documentNumber: `TTTL-${vehicleId}004` },
        { id: 't5', name: 'Refrigeration Unit Certificate', type: 'trailer', status: 'valid', expiryDate: '2025-11-30', issueDate: '2024-11-30', documentNumber: `REFR-${vehicleId}005` },
        { id: 't6', name: 'Trailer Safety Inspection', type: 'trailer', status: 'valid', expiryDate: '2026-01-15', issueDate: '2025-01-15', documentNumber: `TSAF-${vehicleId}006` },
      ],
      transport_goods: [
        { id: 'tg1', name: 'Bill of Lading Template', type: 'transport_goods', status: 'valid', expiryDate: '2025-12-31', issueDate: '2024-01-01', documentNumber: `BOL-${vehicleId}001` },
        { id: 'tg2', name: 'Cargo Insurance Certificate', type: 'transport_goods', status: 'valid', expiryDate: '2025-11-30', issueDate: '2024-11-30', documentNumber: `CINS-${vehicleId}002` },
        { id: 'tg3', name: 'Freight Broker Authority', type: 'transport_goods', status: 'valid', expiryDate: '2026-06-30', issueDate: '2024-06-30', documentNumber: `FBA-${vehicleId}003` },
        { id: 'tg4', name: 'Temperature Control Certificate', type: 'transport_goods', status: 'expiring_soon', expiryDate: '2025-09-10', issueDate: '2024-09-10', documentNumber: `TEMP-${vehicleId}004` },
        { id: 'tg5', name: 'Cargo Manifest', type: 'transport_goods', status: 'valid', expiryDate: '2025-12-31', issueDate: '2025-01-01', documentNumber: `MANI-${vehicleId}005` },
        { id: 'tg6', name: 'Dangerous Goods Declaration', type: 'transport_goods', status: 'valid', expiryDate: '2025-10-31', issueDate: '2024-10-31', documentNumber: `DGD-${vehicleId}006` },
        { id: 'tg7', name: 'Customs Declaration Form', type: 'transport_goods', status: 'valid', expiryDate: '2025-12-31', issueDate: '2025-01-01', documentNumber: `CDF-${vehicleId}007` },
      ],
    };

    return baseDocuments[type] || [];
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'valid': return '#4CAF50';
      case 'expired': return '#F44336';
      case 'expiring_soon': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'valid': return 'Valid';
      case 'expired': return 'Expired';
      case 'expiring_soon': return 'Expiring Soon';
      default: return 'Unknown';
    }
  };

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowVehicleModal(false);
    // Switch to vehicle tab when a vehicle is selected
    if (activeTab !== 'driver' && activeTab !== 'eld') {
      setActiveTab('vehicle');
    }
  };

  const tabs = [
    { key: 'vehicle' as TabKey, label: 'Vehicle', disabled: !selectedVehicle },
    { key: 'trailer' as TabKey, label: 'Trailer', disabled: !selectedVehicle },
    { key: 'cross_border' as TabKey, label: 'Cross Border', disabled: !selectedVehicle },
    { key: 'transport_goods' as TabKey, label: 'Transport Goods', disabled: !selectedVehicle },
    { key: 'driver' as TabKey, label: 'Driver' },
    { key: 'permits' as TabKey, label: 'Permits', disabled: !selectedVehicle },
    { key: 'eld' as TabKey, label: 'ELD' },
  ];

  const renderVehicleModal = () => (
    <Modal
      visible={showVehicleModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.vehicleModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Vehicle</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowVehicleModal(false)}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={vehicles}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.vehicleItem,
                  item.status === 'inactive' && styles.inactiveVehicle
                ]}
                onPress={() => handleVehicleSelect(item)}
                disabled={item.status === 'inactive'}
              >
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>{item.name}</Text>
                  <Text style={styles.vehicleDetails}>
                    {item.plateNumber} • {item.type}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: item.status === 'active' ? '#4CAF50' : '#9E9E9E' }
                ]}>
                  <Text style={styles.statusBadgeText}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  const renderDocumentItem = (document: Document) => (
    <View key={document.id} style={styles.documentItem}>
      <View style={styles.documentHeader}>
        <Text style={styles.documentName}>{document.name}</Text>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: getStatusColor(document.status) }
        ]}>
          <Text style={styles.statusText}>
            {getStatusText(document.status)}
          </Text>
        </View>
      </View>

      <View style={styles.documentDetails}>
        {document.documentNumber && (
          <Text style={styles.documentNumber}>
            Doc #: {document.documentNumber}
          </Text>
        )}
        <Text style={styles.documentDate}>
          Issued: {document.issueDate}
        </Text>
        <Text style={styles.documentDate}>
          Expires: {document.expiryDate}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.viewDocumentButton}
        onPress={() => handleViewDocument(document)}
      >
        <Text style={styles.viewDocumentButtonText}>View Document</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTabContent = () => {
    const documents = getDocuments(selectedVehicle?.id || null, activeTab);

    if (documents.length === 0) {
      const tabLabel = tabs.find(tab => tab.key === activeTab)?.label || activeTab;
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No {tabLabel.toLowerCase()} documents found
          </Text>
          {!selectedVehicle && activeTab !== 'driver' && activeTab !== 'eld' && (
            <Text style={styles.emptyStateSubtext}>
              Select a vehicle to view {tabLabel.toLowerCase()} documents
            </Text>
          )}
        </View>
      );
    }

    return (
      <View style={styles.documentsContainer}>
        {documents.map(renderDocumentItem)}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Documents</Text>
        <Text style={styles.headerSubtitle}>
          Manage vehicle, trailer, driver, and transport documents
        </Text>
      </View>

      {/* Vehicle Selection */}
      <View style={styles.vehicleSection}>
        <Text style={styles.sectionTitle}>Selected Vehicle</Text>
        <TouchableOpacity
          style={styles.vehicleSelector}
          onPress={() => setShowVehicleModal(true)}
        >
          <View style={styles.selectedVehicleInfo}>
            {selectedVehicle ? (
              <>
                <Text style={styles.selectedVehicleName}>
                  {selectedVehicle.name}
                </Text>
                <Text style={styles.selectedVehicleDetails}>
                  {selectedVehicle.plateNumber} • {selectedVehicle.type}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.selectedVehicleName}>
                  No Vehicle Selected
                </Text>
                <Text style={styles.selectedVehicleDetails}>
                  Showing driver and ELD documents only
                </Text>
              </>
            )}
          </View>
          <Text style={styles.selectorArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Document Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          ref={tabScrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScrollView}
        >
          <View style={styles.tabsRow}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  activeTab === tab.key && styles.activeTab,
                  tab.disabled && styles.disabledTab,
                ]}
                onPress={() => {
                  if (!tab.disabled) {
                    setActiveTab(tab.key);
                    // Auto-scroll to center the selected tab
                    const tabIndex = tabs.findIndex(t => t.key === tab.key);
                    const tabWidth = 100; // Approximate tab width including margins
                    const scrollToX = Math.max(0, (tabIndex * tabWidth) - 50);

                    tabScrollViewRef.current?.scrollTo({
                      x: scrollToX,
                      animated: true
                    });
                  }
                }}
                disabled={tab.disabled}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                  tab.disabled && styles.disabledTabText,
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Document Content */}
      {renderTabContent()}

      {/* Vehicle Selection Modal */}
      {renderVehicleModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#906AD1',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  vehicleSection: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  vehicleSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  selectedVehicleInfo: {
    flex: 1,
  },
  selectedVehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedVehicleDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  selectorArrow: {
    fontSize: 16,
    color: '#2196F3',
  },
  tabsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabsScrollView: {
    flexGrow: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 2,
    minWidth: 100, // Increased for better spacing
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#2196F3',
  },
  disabledTab: {
    opacity: 0.4,
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  viewDocumentButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  viewDocumentButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  disabledTabText: {
    color: '#999',
  },
  documentsContainer: {
    margin: 16,
  },
  documentItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  documentDetails: {
    gap: 4,
  },
  documentNumber: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  documentDate: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleModal: {
    backgroundColor: 'white',
    borderRadius: 15,
    width: '90%',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#666',
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  inactiveVehicle: {
    opacity: 0.5,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
});

export default DocumentsScreen;