import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

type OnboardingStatus = 'PENDING_TESTS' | 'IN_PROGRESS' | 'WAITING_FOR_HR_APPROVAL' | 'APPROVED' | 'REJECTED';

const HRApprovalScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<OnboardingStatus>('WAITING_FOR_HR_APPROVAL');
  const [submittedDate, setSubmittedDate] = useState<string>('');

  useEffect(() => {
    fetchApprovalStatus();
  }, []);

  const fetchApprovalStatus = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await apiService.getDriverOnboardingStatus();
      
      // Mock data
      const mockStatus: OnboardingStatus = 'WAITING_FOR_HR_APPROVAL';
      const mockDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      
      setStatus(mockStatus);
      setSubmittedDate(mockDate);
    } catch (error) {
      console.error('Error fetching approval status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchApprovalStatus();
  };

  const handleLogout = () => {
    // TODO: Implement logout
    navigation.navigate('Login' as never);
  };

  if (loading && !submittedDate) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea3d8" />
          <Text style={styles.loadingText}>Loading approval status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isApproved = status === 'APPROVED';
  const isRejected = status === 'REJECTED';
  const isPending = status === 'WAITING_FOR_HR_APPROVAL';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HR Approval</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          {isApproved && (
            <>
              <View style={styles.approvedIconContainer}>
                <Ionicons name="checkmark-circle" size={64} color="#10B981" />
              </View>
              <Text style={styles.statusTitle}>Approved! ✅</Text>
              <Text style={styles.statusMessage}>
                Congratulations! Your onboarding has been approved by HR. You can now access all features of the app.
              </Text>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => {
                  // Navigate to dashboard - app is now unlocked
                  navigation.navigate('MainTabs' as never, { screen: 'Dashboard' } as never);
                }}
              >
                <Text style={styles.continueButtonText}>Go to Dashboard →</Text>
              </TouchableOpacity>
            </>
          )}

          {isRejected && (
            <>
              <View style={styles.rejectedIconContainer}>
                <Ionicons name="close-circle" size={64} color="#EF4444" />
              </View>
              <Text style={styles.statusTitle}>Rejected ❌</Text>
              <Text style={styles.statusMessage}>
                Your onboarding has been rejected. Please contact HR for more information about what needs to be corrected.
              </Text>
              <View style={styles.contactInfo}>
                <Ionicons name="mail-outline" size={20} color="#6B7280" />
                <Text style={styles.contactText}>Contact HR for assistance</Text>
              </View>
            </>
          )}

          {isPending && (
            <>
              <View style={styles.pendingIconContainer}>
                <Ionicons name="time-outline" size={64} color="#F59E0B" />
              </View>
              <Text style={styles.statusTitle}>Pending HR Approval ⏳</Text>
              <Text style={styles.statusMessage}>
                Your documents are under review. You will be notified once approved.
              </Text>
              {submittedDate && (
                <View style={styles.submittedInfo}>
                  <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                  <Text style={styles.submittedText}>
                    Submitted: {new Date(submittedDate).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Information Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#0ea3d8" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>What happens next?</Text>
            <Text style={styles.infoText}>
              {isPending && 'HR will review your submitted documents and test results. This process typically takes 1-2 business days.'}
              {isApproved && 'You now have full access to the app. You can view trips, track mileage, and manage your documents.'}
              {isRejected && 'Please review the requirements and resubmit your documents. Contact HR if you need clarification.'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Ionicons name="refresh" size={20} color="#0ea3d8" />
            <Text style={styles.refreshButtonText}>Refresh Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  approvedIconContainer: {
    marginBottom: 16,
  },
  rejectedIconContainer: {
    marginBottom: 16,
  },
  pendingIconContainer: {
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  submittedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  submittedText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  contactText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  continueButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea3d8',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  actionsContainer: {
    gap: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0ea3d8',
  },
  refreshButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#0ea3d8',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  logoutButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  bottomSpacer: {
    height: 16,
  },
});

export default HRApprovalScreen;

