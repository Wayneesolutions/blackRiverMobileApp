import React, { useState } from 'react';
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
  type: 'vehicle' | 'cross_border' | 'driver' | 'permit';
  status: 'valid' | 'expired' | 'expiring_soon';
  expiryDate: string;
  issueDate: string;
  documentNumber?: string;
}

const DocumentsScreen = () => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'vehicle' | 'cross_border' | 'driver' | 'permits'>('vehicle');

  // Static vehicle data
  const vehicles: Vehicle[] = [
    { id: '1', name: 'Freightliner Cascadia', plateNumber: 'ABC-123', type: 'Truck', status: 'active' },
    { id: '2', name: 'Peterbilt 579', plateNumber: 'XYZ-456', type: 'Truck', status: 'active' },
    { id: '3', name: 'Kenworth T680', plateNumber: 'DEF-789', type: 'Truck', status: 'inactive' },
    { id: '4', name: 'Volvo VNL', plateNumber: 'GHI-012', type: 'Truck', status: 'active' },
  ];

  // Static document data based on selected vehicle
  const getDocuments = (vehicleId: string | null, type: string): Document[] => {
    if (!vehicleId) {
      return [
        { id: '1', name: 'Commercial Driver License', type: 'driver', status: 'valid', expiryDate: '2025-12-15', issueDate: '2021-12-15', documentNumber: 'CDL-123456' },
        { id: '2', name: 'Medical Certificate', type: 'driver', status: 'expiring_soon', expiryDate: '2025-09-30', issueDate: '2023-09-30', documentNumber: 'MED-789012' },
        { id: '3', name: 'HAZMAT Endorsement', type: 'driver', status: 'valid', expiryDate: '2026-03-20', issueDate: '2022-03-20', documentNumber: 'HAZ-345678' },
      ];
    }

    const baseDocuments: Record<string, Document[]> = {
      vehicle: [
        { id: 'v1', name: 'Vehicle Registration', type: 'vehicle', status: 'valid', expiryDate: '2025-11-30', issueDate: '2023-11-30', documentNumber: `REG-${vehicleId}001` },
        { id: 'v2', name: 'Insurance Certificate', type: 'vehicle', status: 'valid', expiryDate: '2025-10-15', issueDate: '2024-10-15', documentNumber: `INS-${vehicleId}002` },
        { id: 'v3', name: 'Safety Inspection', type: 'vehicle', status: 'expiring_soon', expiryDate: '2025-09-05', issueDate: '2024-09-05', documentNumber: `SAF-${vehicleId}003` },
        { id: 'v4', name: 'Emission Test', type: 'vehicle', status: 'valid', expiryDate: '2026-01-20', issueDate: '2024-01-20', documentNumber: `EMI-${vehicleId}004` },
        { id: 'v5', name: 'Vehicle Title', type: 'vehicle', status: 'valid', expiryDate: '2030-12-31', issueDate: '2020-01-01', documentNumber: `TTL-${vehicleId}005` },
      ],
      cross_border: [
        { id: 'cb1', name: 'FAST Card', type: 'cross_border', status: 'valid', expiryDate: '2027-08-15', issueDate: '2022-08-15', documentNumber: `FAST-${vehicleId}001` },
        { id: 'cb2', name: 'Carnet Document', type: 'cross_border', status: 'valid', expiryDate: '2025-12-31', issueDate: '2024-01-01', documentNumber: `CAR-${vehicleId}002` },
        { id: 'cb3', name: 'Customs Bond', type: 'cross_border', status: 'expired', expiryDate: '2025-07-20', issueDate: '2024-07-20', documentNumber: `CB-${vehicleId}003` },
        { id: 'cb4', name: 'Border Crossing Permit', type: 'cross_border', status: 'valid', expiryDate: '2025-11-10', issueDate: '2024-11-10', documentNumber: `BCP-${vehicleId}004` },
        { id: 'cb5', name: 'International Fuel Tax Agreement', type: 'cross_border', status: 'valid', expiryDate: '2025-12-31', issueDate: '2025-01-01', documentNumber: `IFTA-${vehicleId}005` },
      ],
      driver: [
        { id: 'd1', name: 'Commercial Driver License', type: 'driver', status: 'valid', expiryDate: '2025-12-15', issueDate: '2021-12-15', documentNumber: 'CDL-123456' },
        { id: 'd2', name: 'Medical Certificate', type: 'driver', status: 'expiring_soon', expiryDate: '2025-09-30', issueDate: '2023-09-30', documentNumber: 'MED-789012' },
        { id: 'd3', name: 'HAZMAT Endorsement', type: 'driver', status: 'valid', expiryDate: '2026-03-20', issueDate: '2022-03-20', documentNumber: 'HAZ-345678' },
        { id: 'd4', name: 'Passport', type: 'driver', status: 'valid', expiryDate: '2028-05-10', issueDate: '2018-05-10', documentNumber: 'PP-987654321' },
        { id: 'd5', name: 'TWIC Card', type: 'driver', status: 'valid', expiryDate: '2026-09-15', issueDate: '2021-09-15', documentNumber: 'TWIC-555444' },
      ],
      permits: [
        { id: 'p1', name: 'Oversize Load Permit', type: 'permit', status: 'valid', expiryDate: '2025-10-31', issueDate: '2025-08-01', documentNumber: `OSL-${vehicleId}001` },
        { id: 'p2', name: 'Hazardous Materials Permit', type: 'permit', status: 'valid', expiryDate: '2026-02-28', issueDate: '2025-02-28', documentNumber: `HMP-${vehicleId}002` },
        { id: 'p3', name: 'Interstate Commerce Permit', type: 'permit', status: 'expired', expiryDate: '2025-07-15', issueDate: '2024-07-15', documentNumber: `ICP-${vehicleId}003` },
        { id: 'p4', name: 'Weight Distance Tax Permit', type: 'permit', status: 'valid', expiryDate: '2025-12-31', issueDate: '2025-01-01', documentNumber: `WDT-${vehicleId}004` },
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
  };

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
    </View>
  );

  const renderTabContent = () => {
    const documents = getDocuments(selectedVehicle?.id || null, activeTab);
    
    if (documents.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No {activeTab.replace('_', ' ')} documents found
          </Text>
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
          Manage vehicle and driver documents
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
                  Showing driver documents only
                </Text>
              </>
            )}
          </View>
          <Text style={styles.selectorArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Document Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'vehicle', label: 'Vehicle', disabled: !selectedVehicle },
            { key: 'cross_border', label: 'Cross Border', disabled: !selectedVehicle },
            { key: 'driver', label: 'Driver' },
            { key: 'permits', label: 'Permits', disabled: !selectedVehicle },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab,
                tab.disabled && styles.disabledTab,
              ]}
              onPress={() => !tab.disabled && setActiveTab(tab.key as any)}
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
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  disabledTab: {
    opacity: 0.4,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
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