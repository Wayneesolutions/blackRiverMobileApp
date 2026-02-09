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
import { useNavigation } from '@react-navigation/native';

type TestType = 'TDG' | 'VEHICLE' | 'HOS' | 'WINTER';

interface TestResult {
  id: string;
  testType: TestType;
  score: number;
  passed: boolean;
  attempts: number;
  status: 'not_taken' | 'failed' | 'passed';
  mandatory: boolean;
}

const TestsScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [allTestsPassed, setAllTestsPassed] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      
      // Mock data
      const mockTests: TestResult[] = [
        {
          id: '1',
          testType: 'TDG',
          score: 85,
          passed: true,
          attempts: 1,
          status: 'passed',
          mandatory: true,
        },
        {
          id: '2',
          testType: 'VEHICLE',
          score: 0,
          passed: false,
          attempts: 0,
          status: 'not_taken',
          mandatory: true,
        },
        {
          id: '3',
          testType: 'HOS',
          score: 0,
          passed: false,
          attempts: 0,
          status: 'not_taken',
          mandatory: true,
        },
        {
          id: '4',
          testType: 'WINTER',
          score: 0,
          passed: false,
          attempts: 0,
          status: 'not_taken',
          mandatory: false,
        },
      ];

      setTests(mockTests);
      
      // Check if all mandatory tests passed
      const mandatoryTests = mockTests.filter(t => t.mandatory);
      const allMandatoryPassed = mandatoryTests.every(t => t.status === 'passed');
      setAllTestsPassed(allMandatoryPassed);
    } catch (error) {
      console.error('Error fetching tests:', error);
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
            // TODO: Navigate to actual test screen
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

    navigation.navigate('CertificatesScreen' as never);
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

        {/* Test Cards */}
        {tests.map((test) => (
          <View
            key={test.id}
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
            {allMandatoryPassed ? 'Continue to Certificates →' : 'Go to Trips (Disabled)'}
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

