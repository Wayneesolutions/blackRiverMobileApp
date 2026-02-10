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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../services/api/apiService';

type TestType = 'TDG' | 'VEHICLE' | 'HOS' | 'WINTER';

interface TestResult {
  id: string | null;
  testType: TestType;
  score: number;
  passed: boolean;
  attempts: number;
  status: 'not_taken' | 'failed' | 'passed';
  mandatory: boolean;
  completedAt?: string | null;
  hrApproved?: boolean;
  hrRejected?: boolean;
  hrApprovedBy?: string;
  hrApprovedAt?: string;
  hrRejectionReason?: string;
}

interface DriverFlags {
  handlesHazardousLoads: boolean;
  winterTestRequired: boolean;
}

const TestsScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [allTestsPassed, setAllTestsPassed] = useState(false);
  const [driverFlags, setDriverFlags] = useState<DriverFlags | null>(null);

  useEffect(() => {
    fetchTests();
  }, []);

  // Refresh tests when screen comes into focus (e.g., after submitting a test)
  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 TestsScreen focused - refreshing test data...');
      fetchTests();
    }, [])
  );

  const fetchTests = async () => {
    try {
      setLoading(true);
      
      console.log('📱 Fetching user data from storage...');
      
      // Try multiple storage keys for backward compatibility
      let userDataStr = await AsyncStorage.getItem('user_data');
      if (!userDataStr) {
        userDataStr = await AsyncStorage.getItem('@fleetgo_user_data');
      }
      if (!userDataStr) {
        userDataStr = await AsyncStorage.getItem('userData');
      }
      
      if (!userDataStr) {
        console.log('❌ No user data found in any storage key');
        Alert.alert('Error', 'User data not found. Please login again.');
        return;
      }

      console.log('✅ User data found in storage');
      const userData = JSON.parse(userDataStr);
      const driverId = userData._id || userData.id;
      
      if (!driverId) {
        console.log('❌ No driver ID in user data:', userData);
        Alert.alert('Error', 'Invalid user data. Please login again.');
        return;
      }
      
      console.log('✅ Driver ID:', driverId);
      console.log('========================================');
      console.log('📱 Step 2: Calling API to get test status...');

      // Call the API
      const response = await apiService.getDriverTestStatus(driverId);
      
      console.log('📱 Step 3: Received response from backend');
      console.log('📱 Response success:', response.success);
      console.log('📱 Full response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        // Handle nested data structure: response.data.data
        const data = response.data.data || response.data;
        
        console.log('📱 Extracted data:', JSON.stringify(data, null, 2));
        
        const testsData: TestResult[] = data.tests || [];
        const flags: DriverFlags = data.driverFlags || {
          handlesHazardousLoads: false,
          winterTestRequired: false
        };
        const requiredTests = data.requiredTests || [];

        console.log('✅ Tests loaded from backend:', testsData.length, 'tests');
        console.log('✅ Driver flags:', JSON.stringify(flags, null, 2));
        console.log('✅ Required test types:', requiredTests);
        
        // Log each test
        testsData.forEach((test, index) => {
          console.log(`📝 Test ${index + 1}:`, {
            testType: test.testType,
            status: test.status,
            score: test.score,
            passed: test.passed,
            mandatory: test.mandatory,
            attempts: test.attempts
          });
        });

        setTests(testsData);
        setDriverFlags(flags);
        
        // Check if all mandatory tests passed
        const mandatoryTests = testsData.filter(t => t.mandatory);
        const allMandatoryPassed = mandatoryTests.every(t => t.status === 'passed');
        setAllTestsPassed(allMandatoryPassed);

        console.log('📊 Mandatory tests count:', mandatoryTests.length);
        console.log('📊 All mandatory tests passed:', allMandatoryPassed);
        
        // Save tests completion status to AsyncStorage
        if (allMandatoryPassed) {
          await AsyncStorage.setItem('testsCompleted', 'true');
          console.log('✅ Tests completion status saved to AsyncStorage');
        } else {
          await AsyncStorage.setItem('testsCompleted', 'false');
        }
        
        console.log('========================================');
        console.log('✅ TESTS LOADED SUCCESSFULLY');
        console.log('========================================');
      } else {
        console.error('❌ API returned error:', response.error || response.message);
        Alert.alert('Error', response.error || response.message || 'Failed to load tests');
      }
    } catch (error: any) {
      console.error('========================================');
      console.error('❌ ERROR FETCHING TESTS');
      console.error('❌ Error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('========================================');
      Alert.alert('Error', `Failed to load tests: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = (test: TestResult) => {
    Alert.alert(
      `Start ${getTestTypeLabel(test.testType)} Test`,
      `You are about to start the ${getTestTypeLabel(test.testType)} test.\n\n${test.mandatory ? 'This is a mandatory test.' : 'This is an optional test.'}\n\nAre you ready to begin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Test',
          onPress: () => {
            console.log('🚀 Navigating to TakeTestScreen for test type:', test.testType);
            try {
              navigation.navigate('TakeTestScreen' as never, { testType: test.testType } as never);
            } catch (error) {
              console.error('❌ Navigation error:', error);
              Alert.alert('Error', 'Failed to start test. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleRetakeTest = (test: TestResult) => {
    Alert.alert(
      `Retake ${getTestTypeLabel(test.testType)} Test`,
      `You scored ${test.score}% on your last attempt.\n\nDo you want to retake this test?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retake Test',
          onPress: () => {
            console.log('🚀 Navigating to TakeTestScreen for retake:', test.testType);
            try {
              navigation.navigate('TakeTestScreen' as never, { testType: test.testType } as never);
            } catch (error) {
              console.error('❌ Navigation error:', error);
              Alert.alert('Error', 'Failed to start test. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleViewResults = (test: TestResult) => {
    Alert.alert(
      `${getTestTypeLabel(test.testType)} Results`,
      `Score: ${test.score}%\nStatus: ${test.status === 'passed' ? 'Passed ✅' : 'Failed ❌'}\nAttempts: ${test.attempts}`,
      [
        { text: 'OK' },
        test.status !== 'passed' && {
          text: 'Retake Test',
          onPress: () => handleRetakeTest(test)
        }
      ].filter(Boolean) as any
    );
  };

  const OLD_handleStartTest = (test: TestResult) => {
    Alert.alert(
      `Start ${getTestTypeLabel(test.testType)} Test`,
      `You are about to start the ${getTestTypeLabel(test.testType)} test.\n\n${test.mandatory ? 'This is a mandatory test.' : 'This is an optional test.'}\n\nAre you ready to begin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Test',
          onPress: () => {
            // OLD IMPLEMENTATION
            Alert.alert(
              'Test Screen',
              'The test interface will be implemented here. For now, this is a placeholder.',
              [
                {
                  text: 'Simulate Pass',
                  onPress: () => {
                    setTests(prev =>
                      prev.map(t =>
                        t.id === test.id
                          ? {
                              ...t,
                              score: 85,
                              passed: true,
                              attempts: t.attempts + 1,
                              status: 'passed',
                            }
                          : t
                      )
                    );
                    // Recheck all passed
                    const updated = tests.map(t =>
                      t.id === test.id
                        ? {
                            ...t,
                            score: 85,
                            passed: true,
                            attempts: t.attempts + 1,
                            status: 'passed',
                          }
                        : t
                    );
                    const mandatoryTests = updated.filter(t => t.mandatory);
                    const allMandatoryPassed = mandatoryTests.every(t => t.status === 'passed');
                    setAllTestsPassed(allMandatoryPassed);
                  },
                },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          },
        },
      ]
    );
  };

  const handleContinue = () => {
    if (!allTestsPassed) {
      Alert.alert(
        'Tests Incomplete',
        'You must pass all required safety tests before accessing trips.',
        [{ text: 'OK' }]
      );
      return;
    }

    navigation.navigate('HRApprovalScreen' as never);
  };

  const getTestTypeLabel = (type: TestType) => {
    switch (type) {
      case 'TDG':
        return 'TDG';
      case 'VEHICLE':
        return 'Vehicle Inspection';
      case 'HOS':
        return 'HOS';
      case 'WINTER':
        return 'Winter Driving';
    }
  };

  const getTestTypeColor = (type: TestType) => {
    switch (type) {
      case 'TDG':
        return '#EF4444';
      case 'VEHICLE':
        return '#3B82F6';
      case 'HOS':
        return '#10B981';
      case 'WINTER':
        return '#8B5CF6';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea3d8" />
          <Text style={styles.loadingText}>Loading tests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const mandatoryTests = tests.filter(t => t.mandatory);
  const allMandatoryPassed = mandatoryTests.every(t => t.status === 'passed');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety Tests</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Warning if tests not passed */}
        {!allMandatoryPassed && (
          <View style={styles.warningBanner}>
            <Ionicons name="lock-closed" size={24} color="#EF4444" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Trips Locked 🔒</Text>
              <Text style={styles.warningText}>
                You must pass all required safety tests before accessing trips.
              </Text>
            </View>
          </View>
        )}

        {/* Driver Flags Info */}
        {driverFlags && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color="#0ea3d8" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Your Required Tests</Text>
              <Text style={styles.infoText}>
                Based on your driver profile:
              </Text>
              <View style={styles.flagsList}>
                <Text style={styles.flagItem}>✓ Vehicle Inspection & HOS (Base Tests)</Text>
                {driverFlags.handlesHazardousLoads && (
                  <Text style={styles.flagItem}>✓ TDG Test (Hazardous Loads)</Text>
                )}
                {driverFlags.winterTestRequired && (
                  <Text style={styles.flagItem}>✓ Winter Driving Test (Winter Season)</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Test Cards */}
        {tests.map((test, index) => (
          <View
            key={test.id || test.testType || `test-${index}`}
            style={[
              styles.testCard,
              test.status === 'passed' && styles.testCardPassed,
              test.status === 'failed' && styles.testCardFailed,
            ]}
          >
            <View style={styles.testCardHeader}>
              <View
                style={[
                  styles.testTypeBadge,
                  { backgroundColor: getTestTypeColor(test.testType) + '20' },
                ]}
              >
                <Text
                  style={[styles.testTypeText, { color: getTestTypeColor(test.testType) }]}
                >
                  {getTestTypeLabel(test.testType)} Test
                </Text>
              </View>
              {test.mandatory && (
                <View style={styles.mandatoryBadge}>
                  <Text style={styles.mandatoryText}>Required</Text>
                </View>
              )}
            </View>

            <View style={styles.testStatusRow}>
              <View style={styles.statusContainer}>
                <Text style={styles.statusLabel}>Status:</Text>
                {test.status === 'passed' && (
                  <View style={styles.statusBadgePassed}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.statusTextPassed}>Passed</Text>
                  </View>
                )}
                {test.status === 'failed' && (
                  <View style={styles.statusBadgeFailed}>
                    <Ionicons name="close-circle" size={16} color="#EF4444" />
                    <Text style={styles.statusTextFailed}>Failed</Text>
                  </View>
                )}
                {test.status === 'not_taken' && (
                  <View style={styles.statusBadgeNotTaken}>
                    <Text style={styles.statusTextNotTaken}>Not Taken</Text>
                  </View>
                )}
              </View>
              {test.status !== 'not_taken' && (
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreLabel}>Score:</Text>
                  <Text style={styles.scoreValue}>{test.score}%</Text>
                </View>
              )}
            </View>

            {/* HR Approval Status */}
            {test.status !== 'not_taken' && (
              <View style={styles.hrApprovalContainer}>
                <Text style={styles.hrApprovalLabel}>HR Approval:</Text>
                {test.hrApproved ? (
                  <View style={styles.hrApprovalBadgeApproved}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.hrApprovalTextApproved}>Approved</Text>
                  </View>
                ) : test.hrRejected ? (
                  <View style={styles.hrApprovalBadgeRejected}>
                    <Ionicons name="close-circle" size={14} color="#EF4444" />
                    <Text style={styles.hrApprovalTextRejected}>Rejected</Text>
                    {test.hrRejectionReason && (
                      <Text style={styles.hrRejectionReason}>Reason: {test.hrRejectionReason}</Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.hrApprovalBadgePending}>
                    <Ionicons name="time-outline" size={14} color="#F59E0B" />
                    <Text style={styles.hrApprovalTextPending}>Pending Review</Text>
                  </View>
                )}
              </View>
            )}

            {test.attempts > 0 && (
              <Text style={styles.attemptsText}>Attempts: {test.attempts}</Text>
            )}

            <TouchableOpacity
              style={[
                styles.startButton,
                test.status === 'passed' && styles.startButtonPassed,
              ]}
              onPress={() => handleStartTest(test)}
            >
              {test.status === 'passed' ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.startButtonText}>Test Passed</Text>
                </>
              ) : (
                <>
                  <Ionicons name="play-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.startButtonText}>Start Test</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ))}

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            !allMandatoryPassed && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!allMandatoryPassed}
        >
          <Text style={styles.continueButtonText}>
            {allMandatoryPassed ? 'Continue to HR Approval →' : 'Go to Trips (Disabled)'}
          </Text>
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
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E0F2FE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
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
    color: '#075985',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#075985',
    lineHeight: 20,
    marginBottom: 8,
  },
  flagsList: {
    marginTop: 4,
  },
  flagItem: {
    fontSize: 13,
    color: '#0C4A6E',
    lineHeight: 20,
    marginBottom: 2,
  },
  testCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testCardPassed: {
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  testCardFailed: {
    borderWidth: 2,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  testCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  testTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  testTypeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  mandatoryBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mandatoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  testStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  statusBadgePassed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTextPassed: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  statusBadgeFailed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTextFailed: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  statusBadgeNotTaken: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTextNotTaken: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  attemptsText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  hrApprovalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  hrApprovalLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 8,
    fontWeight: '600',
  },
  hrApprovalBadgeApproved: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hrApprovalTextApproved: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  hrApprovalBadgeRejected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hrApprovalTextRejected: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  hrApprovalBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hrApprovalTextPending: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  hrRejectionReason: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  startButton: {
    backgroundColor: '#0ea3d8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  startButtonPassed: {
    backgroundColor: '#10B981',
  },
  startButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueButton: {
    backgroundColor: '#0ea3d8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonDisabled: {
    backgroundColor: '#9CA3AF',
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

export default TestsScreen;

