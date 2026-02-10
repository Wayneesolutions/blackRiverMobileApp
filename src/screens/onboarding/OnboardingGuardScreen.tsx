import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { apiService } from '../../services/api/apiService';

type OnboardingStatus = 'PENDING_TESTS' | 'IN_PROGRESS' | 'WAITING_FOR_HR_APPROVAL' | 'APPROVED' | 'REJECTED';

interface OnboardingProgress {
  status: OnboardingStatus;
  trainingCompleted: boolean;
  testsCompleted: boolean;
  certificatesUploaded: boolean;
  hrApproved: boolean;
}

const OnboardingGuardScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);

  useEffect(() => {
    fetchOnboardingStatus();
  }, []);

  // Re-check status when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchOnboardingStatus();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const fetchOnboardingStatus = async () => {
    try {
      setLoading(true);
      
      console.log('========================================');
      console.log('📋 FETCHING ONBOARDING STATUS FROM BACKEND');
      console.log('========================================');
      
      // Get user data
      let userDataStr = await AsyncStorage.getItem('user_data');
      if (!userDataStr) {
        userDataStr = await AsyncStorage.getItem('@fleetgo_user_data');
      }
      if (!userDataStr) {
        userDataStr = await AsyncStorage.getItem('userData');
      }
      
      if (!userDataStr) {
        console.log('❌ No user data found');
        setLoading(false);
        return;
      }

      const userData = JSON.parse(userDataStr);
      const driverId = userData._id || userData.id;
      
      if (!driverId) {
        console.log('❌ No driver ID found');
        setLoading(false);
        return;
      }
      
      console.log('✅ Driver ID:', driverId);
      console.log('📋 Calling backend API...');
      
      // Call backend API to get onboarding status
      const response = await apiService.getDriverOnboardingStatus(driverId);
      
      console.log('📋 Backend response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        // Handle nested data structure: response.data.data
        const data = response.data.data || response.data;
        
        console.log('✅ Backend data received:');
        console.log('   - Training completed:', data.trainingCompleted);
        console.log('   - Tests completed:', data.testsCompleted);
        console.log('   - Certificates uploaded:', data.certificatesUploaded);
        console.log('   - HR approval status:', data.hrApprovalStatus);
        console.log('   - Onboarding status:', data.onboardingStatus);
        console.log('   - Required tests:', data.requiredTests);
        
        // Map backend status to local status
        let status: OnboardingStatus = 'IN_PROGRESS';
        if (data.onboardingStatus === 'APPROVED') {
          status = 'APPROVED';
        } else if (data.onboardingStatus === 'REJECTED') {
          status = 'REJECTED';
        } else if (data.onboardingStatus === 'AWAITING_HR_APPROVAL') {
          status = 'WAITING_FOR_HR_APPROVAL';
        } else if (data.onboardingStatus === 'TESTS_PENDING') {
          status = 'IN_PROGRESS';
        } else if (data.onboardingStatus === 'NOT_STARTED') {
          status = 'PENDING_TESTS';
        }
        
        // Check if all tests are approved by HR
        const hrApproved = data.allTestsApprovedByHR || data.hrApprovalStatus === 'APPROVED';
        
        // Update status if all tests are approved
        if (hrApproved && status !== 'APPROVED') {
          status = 'APPROVED';
        }
        
        const progress: OnboardingProgress = {
          status,
          trainingCompleted: data.trainingCompleted || false,
          testsCompleted: data.testsCompleted || false,
          certificatesUploaded: data.certificatesUploaded || false,
          hrApproved: hrApproved,
        };

        setProgress(progress);
        
        console.log('✅ Onboarding status loaded from backend');
        console.log('========================================');
      } else {
        console.error('❌ Failed to get onboarding status:', response.error);
        // Fallback to default state
        setProgress({
          status: 'PENDING_TESTS',
          trainingCompleted: false,
          testsCompleted: false,
          certificatesUploaded: false,
          hrApproved: false,
        });
      }
    } catch (error: any) {
      console.error('========================================');
      console.error('❌ ERROR FETCHING ONBOARDING STATUS');
      console.error('❌ Error:', error);
      console.error('❌ Error message:', error.message);
      console.error('========================================');
      
      // Fallback to default state
      setProgress({
        status: 'PENDING_TESTS',
        trainingCompleted: false,
        testsCompleted: false,
        certificatesUploaded: false,
        hrApproved: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (): number => {
    if (!progress) return 0;
    let completed = 0;
    const total = 3; // Only count required steps: Training, Tests, HR Approval (not certificates)
    
    if (progress.trainingCompleted) completed++;
    if (progress.testsCompleted) completed++;
    if (progress.hrApproved) completed++;
    
    return (completed / total) * 100;
  };

  const getStepStatus = (step: number): 'locked' | 'pending' | 'completed' => {
    if (!progress) return 'locked';
    
    switch (step) {
      case 1: // Training
        return progress.trainingCompleted ? 'completed' : 'pending';
      case 2: // Tests
        if (!progress.trainingCompleted) return 'locked';
        return progress.testsCompleted ? 'completed' : 'pending';
      case 3: // Certificates (optional)
        if (!progress.testsCompleted) return 'locked';
        return progress.certificatesUploaded ? 'completed' : 'pending';
      case 4: // HR Approval
        if (!progress.testsCompleted) return 'locked';
        return progress.hrApproved ? 'completed' : 'pending';
      default:
        return 'locked';
    }
  };

  const handleContinue = () => {
    if (!progress) return;

    // Skip certificates in the main flow - tests lead directly to HR approval
    if (!progress.trainingCompleted) {
      navigation.navigate('TrainingScreen' as never);
    } else if (!progress.testsCompleted) {
      navigation.navigate('TestsScreen' as never);
    } else if (!progress.hrApproved) {
      navigation.navigate('HRApprovalScreen' as never);
    }
  };

  const getNextStep = (): string => {
    if (!progress) return 'Start Onboarding';
    
    // Skip certificates in the main flow
    if (!progress.trainingCompleted) return 'Start Training';
    if (!progress.testsCompleted) return 'Take Tests';
    if (!progress.hrApproved) return 'Check HR Approval';
    return 'Complete';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea3d8" />
          <Text style={styles.loadingText}>Loading onboarding status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!progress) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Failed to load onboarding status</Text>
        </View>
      </SafeAreaView>
    );
  }

    // If approved on initial load, redirect is handled in fetchOnboardingStatus
    // When navigated from dashboard, always show the verification status

  const progressPercent = calculateProgress();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Ionicons name="shield-checkmark" size={32} color="#0ea3d8" />
            <Text style={styles.headerTitle}>Driver Verification</Text>
            <Text style={styles.headerSubtitle}>
              Check your onboarding status and complete required steps
            </Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Onboarding Progress</Text>
            <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          {/* Step 1: Training */}
          <TouchableOpacity
            style={styles.stepCard}
            onPress={() => navigation.navigate('TrainingScreen' as never)}
            disabled={getStepStatus(1) === 'locked'}
          >
            <View style={styles.stepIconContainer}>
              {getStepStatus(1) === 'completed' && (
                <View style={styles.completedIcon}>
                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                </View>
              )}
              {getStepStatus(1) === 'pending' && (
                <View style={styles.pendingIcon}>
                  <Ionicons name="time-outline" size={24} color="#F59E0B" />
                </View>
              )}
              {getStepStatus(1) === 'locked' && (
                <View style={styles.lockedIcon}>
                  <Ionicons name="lock-closed" size={24} color="#9CA3AF" />
                </View>
              )}
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepNumber}>Step 1</Text>
              <Text style={styles.stepTitle}>Watch Training Materials</Text>
              <Text style={styles.stepDescription}>
                Review safety guidelines and training content for TDG, Vehicle Inspection, HOS, and Winter Driving.
              </Text>
              {getStepStatus(1) === 'completed' && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Completed</Text>
                </View>
              )}
              {getStepStatus(1) === 'pending' && (
                <View style={[styles.statusBadge, styles.pendingBadge]}>
                  <Text style={[styles.statusText, styles.pendingText]}>Pending</Text>
                </View>
              )}
              {getStepStatus(1) === 'locked' && (
                <View style={[styles.statusBadge, styles.lockedBadge]}>
                  <Text style={[styles.statusText, styles.lockedText]}>Locked</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Step 2: Tests */}
          <TouchableOpacity
            style={styles.stepCard}
            onPress={() => {
              console.log('📝 Step 2 clicked - Navigating to TestsScreen');
              if (getStepStatus(2) !== 'locked') {
                navigation.navigate('TestsScreen' as never);
              } else {
                Alert.alert('Locked', 'Please complete training first before taking tests.');
              }
            }}
            disabled={getStepStatus(2) === 'locked'}
          >
            <View style={styles.stepIconContainer}>
              {getStepStatus(2) === 'completed' && (
                <View style={styles.completedIcon}>
                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                </View>
              )}
              {getStepStatus(2) === 'pending' && (
                <View style={styles.pendingIcon}>
                  <Ionicons name="time-outline" size={24} color="#F59E0B" />
                </View>
              )}
              {getStepStatus(2) === 'locked' && (
                <View style={styles.lockedIcon}>
                  <Ionicons name="lock-closed" size={24} color="#9CA3AF" />
                </View>
              )}
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepNumber}>Step 2</Text>
              <Text style={styles.stepTitle}>Pass Required Tests</Text>
              <Text style={styles.stepDescription}>
                Complete mandatory safety tests: TDG, Vehicle Inspection, HOS, and Winter Driving (if applicable).
              </Text>
              {getStepStatus(2) === 'completed' && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Completed</Text>
                </View>
              )}
              {getStepStatus(2) === 'pending' && (
                <View style={[styles.statusBadge, styles.pendingBadge]}>
                  <Text style={[styles.statusText, styles.pendingText]}>Pending</Text>
                </View>
              )}
              {getStepStatus(2) === 'locked' && (
                <View style={[styles.statusBadge, styles.lockedBadge]}>
                  <Text style={[styles.statusText, styles.lockedText]}>Locked</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Step 3: Certificates (Optional) */}
          <TouchableOpacity
            style={styles.stepCard}
            onPress={() => navigation.navigate('CertificatesScreen' as never)}
          >
            <View style={styles.stepIconContainer}>
              {getStepStatus(3) === 'completed' && (
                <View style={styles.completedIcon}>
                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                </View>
              )}
              {getStepStatus(3) !== 'completed' && (
                <View style={styles.optionalIcon}>
                  <Ionicons name="document-text-outline" size={24} color="#6B7280" />
                </View>
              )}
            </View>
            <View style={styles.stepContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.stepNumber}>Step 3</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalBadgeText}>Optional</Text>
                </View>
              </View>
              <Text style={styles.stepTitle}>Upload/Verify Certificates</Text>
              <Text style={styles.stepDescription}>
                You can upload additional certificates here for verification (not required for test access).
              </Text>
              {getStepStatus(3) === 'completed' && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Completed</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Step 4: HR Approval */}
          <TouchableOpacity
            style={styles.stepCard}
            onPress={() => navigation.navigate('HRApprovalScreen' as never)}
            disabled={getStepStatus(4) === 'locked'}
          >
            <View style={styles.stepIconContainer}>
              {getStepStatus(4) === 'completed' && (
                <View style={styles.completedIcon}>
                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                </View>
              )}
              {getStepStatus(4) === 'pending' && (
                <View style={styles.pendingIcon}>
                  <Ionicons name="time-outline" size={24} color="#F59E0B" />
                </View>
              )}
              {getStepStatus(4) === 'locked' && (
                <View style={styles.lockedIcon}>
                  <Ionicons name="lock-closed" size={24} color="#9CA3AF" />
                </View>
              )}
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepNumber}>Step 4</Text>
              <Text style={styles.stepTitle}>HR Approval</Text>
              <Text style={styles.stepDescription}>
                Wait for HR to review and approve your documents. You will be notified once approved.
              </Text>
              {getStepStatus(4) === 'completed' && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Approved</Text>
                </View>
              )}
              {getStepStatus(4) === 'pending' && (
                <View style={[styles.statusBadge, styles.pendingBadge]}>
                  <Text style={[styles.statusText, styles.pendingText]}>Pending</Text>
                </View>
              )}
              {getStepStatus(4) === 'locked' && (
                <View style={[styles.statusBadge, styles.lockedBadge]}>
                  <Text style={[styles.statusText, styles.lockedText]}>Locked</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Compliance Message */}
        <View style={styles.complianceBanner}>
          <Ionicons name="information-circle" size={20} color="#0ea3d8" />
          <Text style={styles.complianceText}>
            <Text style={styles.complianceBold}>Required Steps:</Text> Complete training materials and pass all required tests. Certificates are optional and can be uploaded later. HR will review and approve your onboarding.
          </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue Onboarding →</Text>
        </TouchableOpacity>

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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  placeholder: {
    width: 40,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  progressSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0ea3d8',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0ea3d8',
    borderRadius: 4,
  },
  stepsContainer: {
    padding: 16,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepIconContainer: {
    marginRight: 16,
  },
  completedIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  lockedBadge: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  pendingText: {
    color: '#92400E',
  },
  lockedText: {
    color: '#6B7280',
  },
  optionalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionalBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  optionalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  complianceBanner: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea3d8',
  },
  complianceText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  complianceBold: {
    fontWeight: '700',
  },
  continueButton: {
    backgroundColor: '#0ea3d8',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
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
  bottomSpacer: {
    height: 16,
  },
});

export default OnboardingGuardScreen;

