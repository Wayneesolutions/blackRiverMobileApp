import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';

const SettingsScreen = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  
  // Password form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Feedback form states
  const [feedbackType, setFeedbackType] = useState('General');
  const [feedbackText, setFeedbackText] = useState('');

  const handleCheckUpdates = async () => {
    setIsUpdating(true);
    setUpdateStatus('Checking for updates...');
    
    // Simulate update check process
    setTimeout(() => {
      setUpdateStatus('Downloading updates...');
      setTimeout(() => {
        setUpdateStatus('Installing updates...');
        setTimeout(() => {
          setIsUpdating(false);
          setUpdateStatus('');
          Alert.alert(
            "Update Complete", 
            "App has been updated to version 5.7.2026.FG\n\nNew Features:\n• Improved performance\n• Bug fixes\n• Enhanced security",
            [{ text: "OK", style: "default" }]
          );
        }, 2000);
      }, 2000);
    }, 2000);
  };

  const handleChangePassword = () => {
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill all password fields");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords don't match");
      return;
    }
    
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    // Simulate password change
    Alert.alert(
      "Success", 
      "Password changed successfully!\nYou will be logged out for security.",
      [{ text: "OK", onPress: () => setShowPasswordModal(false) }]
    );
    
    // Reset form
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSendFeedback = () => {
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim()) {
      Alert.alert("Error", "Please enter your feedback");
      return;
    }

    // Simulate feedback submission
    Alert.alert(
      "Feedback Sent", 
      `Thank you for your ${feedbackType.toLowerCase()} feedback!\n\nTicket ID: #FB${Date.now().toString().slice(-6)}\n\nWe'll review it within 24-48 hours.`,
      [{ text: "OK", onPress: () => setShowFeedbackModal(false) }]
    );
    
    // Reset form
    setFeedbackText('');
    setFeedbackType('General');
  };

  const renderPasswordModal = () => (
    <Modal
      visible={showPasswordModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Change Password</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Current Password"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          
          <TextInput
            style={styles.input}
            placeholder="New Password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalBtn, styles.cancelBtn]} 
              onPress={() => setShowPasswordModal(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalBtn, styles.submitBtn]} 
              onPress={handlePasswordSubmit}
            >
              <Text style={styles.submitBtnText}>Change Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderFeedbackModal = () => (
    <Modal
      visible={showFeedbackModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Send Feedback</Text>
          
          <Text style={styles.label}>Feedback Type</Text>
          <View style={styles.feedbackTypes}>
            {['General', 'Bug Report', 'Feature Request', 'Complaint'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeBtn,
                  feedbackType === type && styles.selectedType
                ]}
                onPress={() => setFeedbackType(type)}
              >
                <Text style={[
                  styles.typeBtnText,
                  feedbackType === type && styles.selectedTypeText
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TextInput
            style={styles.textArea}
            placeholder="Describe your feedback, problem, or feature request..."
            multiline
            numberOfLines={4}
            value={feedbackText}
            onChangeText={setFeedbackText}
            textAlignVertical="top"
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalBtn, styles.cancelBtn]} 
              onPress={() => setShowFeedbackModal(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalBtn, styles.submitBtn]} 
              onPress={handleFeedbackSubmit}
            >
              <Text style={styles.submitBtnText}>Send Feedback</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Action Buttons */}
      <TouchableOpacity 
        style={[styles.actionBtn, isUpdating && styles.disabledBtn]} 
        onPress={handleCheckUpdates}
        disabled={isUpdating}
      >
        <View style={styles.actionContent}>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Check for updates</Text>
            <Text style={styles.actionSubtitle}>
              {updateStatus || "Refresh and synchronize data"}
            </Text>
          </View>
          {isUpdating && <ActivityIndicator size="small" color="#007AFF" />}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionBtn} onPress={handleChangePassword}>
        <Text style={styles.actionTitle}>Change Password</Text>
        <Text style={styles.actionSubtitle}>Change your Password</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionBtn} onPress={handleSendFeedback}>
        <Text style={styles.actionTitle}>Send feedback</Text>
        <Text style={styles.actionSubtitle}>
          Provide a brief Description of your feedback, problem or Feature Request
        </Text>
      </TouchableOpacity>

      {/* Driver Info */}
      <Text style={styles.sectionTitle}>Driver Information</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Current Driver</Text>
          <Text style={styles.value}>Morgan</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}></Text>
          <Text style={styles.value}>Morecrunk@gmail.com</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Units</Text>
          <Text style={styles.value}>Metric units (Kilometers, Liter)</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Home Terminal</Text>
          <Text style={styles.value}>Zendumo Demo</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Time Zone</Text>
          <Text style={styles.value}>Canada/UAS</Text>
        </View>
      </View>

      {/* Company Info */}
      <Text style={styles.sectionTitle}>Company Information</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Company Name</Text>
          <Text style={styles.value}>Zendo Demo</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Database Name</Text>
          <Text style={styles.value}>Zendo Demo</Text>
        </View>
      </View>

      {/* App Info */}
      <Text style={styles.sectionTitle}>APP Information</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Software Version</Text>
          <Text style={styles.value}>5.7.2025.FG</Text>
        </View>
      </View>

      {renderPasswordModal()}
      {renderFeedbackModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  actionBtn: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  disabledBtn: {
    opacity: 0.7,
  },
  actionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: { fontSize: 15, fontWeight: '600', color: '#000' },
  actionSubtitle: { fontSize: 12, color: '#777', marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginTop: 15,
    marginBottom: 8,
  },
  card: { backgroundColor: '#fff', marginBottom: 15 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  label: { fontSize: 14, color: '#555', fontWeight: '500' },
  value: { fontSize: 14, color: '#333', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
    fontSize: 16,
    height: 100,
  },
  feedbackTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    marginTop: 5,
  },
  typeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedType: {
    backgroundColor: '#007AFF',
  },
  typeBtnText: {
    fontSize: 12,
    color: '#555',
  },
  selectedTypeText: {
    color: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelBtn: {
    backgroundColor: '#f0f0f0',
  },
  submitBtn: {
    backgroundColor: '#007AFF',
  },
  cancelBtnText: {
    textAlign: 'center',
    color: '#555',
    fontWeight: '600',
  },
  submitBtnText: {
    textAlign: 'center',
    color: 'white',
    fontWeight: '600',
  },
});

export default SettingsScreen;