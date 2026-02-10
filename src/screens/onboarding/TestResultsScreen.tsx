import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

type TestType = 'TDG' | 'VEHICLE' | 'HOS' | 'WINTER';

interface Answer {
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
}

interface Question {
  _id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface TestResult {
  score: number;
  passed: boolean;
  attempts: number;
  answers: Answer[];
  questionBank: {
    testName: string;
    testType: TestType;
    passingPercentage: number;
    questions: Question[];
  };
}

const TestResultsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { testResult, testType } = route.params as { testResult: TestResult; testType: TestType };

  const getTestTypeLabel = (type: TestType) => {
    switch (type) {
      case 'TDG':
        return 'TDG (Dangerous Goods)';
      case 'VEHICLE':
        return 'Vehicle Inspection';
      case 'HOS':
        return 'Hours of Service';
      case 'WINTER':
        return 'Winter Driving';
    }
  };

  const getTestTypeColor = (type: TestType) => {
    switch (type) {
      case 'TDG':
        return '#DC2626';
      case 'VEHICLE':
        return '#0ea3d8';
      case 'HOS':
        return '#059669';
      case 'WINTER':
        return '#3B82F6';
    }
  };

  const correctCount = testResult.answers.filter(a => a.isCorrect).length;
  const totalQuestions = testResult.answers.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Test Results</Text>
            <Text style={styles.headerSubtitle}>{getTestTypeLabel(testType)}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Score Card */}
        <View style={[
          styles.scoreCard,
          testResult.passed ? styles.scoreCardPassed : styles.scoreCardFailed
        ]}>
          <View style={styles.scoreIconContainer}>
            {testResult.passed ? (
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            ) : (
              <Ionicons name="close-circle" size={64} color="#EF4444" />
            )}
          </View>
          <Text style={styles.scoreValue}>{testResult.score}%</Text>
          <Text style={styles.scoreLabel}>
            {testResult.passed ? '🎉 Passed!' : '❌ Failed'}
          </Text>
          <Text style={styles.scoreDetails}>
            {correctCount} out of {totalQuestions} questions correct
          </Text>
          <Text style={styles.passingInfo}>
            Passing Score: {testResult.questionBank.passingPercentage}%
          </Text>
        </View>

        {/* Results Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Test Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Test Name:</Text>
            <Text style={styles.summaryValue}>{testResult.questionBank.testName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Attempt:</Text>
            <Text style={styles.summaryValue}>#{testResult.attempts}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Score:</Text>
            <Text style={[styles.summaryValue, { color: testResult.passed ? '#10B981' : '#EF4444' }]}>
              {testResult.score}%
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status:</Text>
            <View style={[
              styles.statusBadge,
              testResult.passed ? styles.statusBadgePassed : styles.statusBadgeFailed
            ]}>
              <Text style={[
                styles.statusText,
                testResult.passed ? styles.statusTextPassed : styles.statusTextFailed
              ]}>
                {testResult.passed ? 'Passed' : 'Failed'}
              </Text>
            </View>
          </View>
        </View>

        {/* Question Review */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewTitle}>Question Review</Text>
          <Text style={styles.reviewSubtitle}>
            Review your answers and see which ones were correct
          </Text>

          {testResult.questionBank.questions.map((question, index) => {
            const answer = testResult.answers.find(a => 
              a.questionId === question._id || a.questionId === index.toString()
            );
            const selectedIndex = answer?.selectedAnswer ?? -1;
            const isCorrect = answer?.isCorrect ?? false;

            return (
              <View key={question._id || index} style={styles.questionReviewCard}>
                <View style={styles.questionHeader}>
                  <Text style={styles.questionNumber}>Question {index + 1}</Text>
                  {isCorrect ? (
                    <View style={styles.correctBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.correctText}>Correct</Text>
                    </View>
                  ) : (
                    <View style={styles.incorrectBadge}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                      <Text style={styles.incorrectText}>Incorrect</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.questionText}>{question.question}</Text>

                <View style={styles.optionsContainer}>
                  {selectedIndex >= 0 && selectedIndex < question.options.length ? (
                    <View style={[
                      styles.optionItem,
                      isCorrect ? styles.optionCorrect : styles.optionIncorrect
                    ]}>
                      <View style={styles.optionIndicator}>
                        {isCorrect ? (
                          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        ) : (
                          <Ionicons name="close-circle" size={20} color="#EF4444" />
                        )}
                      </View>
                      <Text style={[
                        styles.optionText,
                        isCorrect ? styles.optionTextCorrect : styles.optionTextIncorrect
                      ]}>
                        {String.fromCharCode(65 + selectedIndex)}. {question.options[selectedIndex]}
                      </Text>
                      <Text style={isCorrect ? styles.correctLabel : styles.incorrectLabel}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.optionItem}>
                      <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                      <Text style={styles.optionText}>No answer selected</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {testResult.passed ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={() => {
                // Navigate directly to TestsScreen - useFocusEffect will refresh the data
                // This will pop the stack back to TestsScreen and trigger refresh
                navigation.navigate('TestsScreen' as never);
              }}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Continue to Test List</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSecondary]}
                onPress={() => {
                  // Just scroll to review, stay on this screen
                  // This button can be removed or kept for scrolling
                }}
                disabled
              >
                <Text style={styles.actionButtonTextSecondary}>Review Above</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonPrimary]}
                onPress={() => {
                  // Navigate back to take test again
                  navigation.navigate('TakeTestScreen' as never, { testType } as never);
                }}
              >
                <Ionicons name="refresh-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Retake Test</Text>
              </TouchableOpacity>
            </>
          )}
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  scoreCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreCardPassed: {
    backgroundColor: '#D1FAE5',
  },
  scoreCardFailed: {
    backgroundColor: '#FEE2E2',
  },
  scoreIconContainer: {
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  scoreDetails: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 4,
  },
  passingInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgePassed: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeFailed: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextPassed: {
    color: '#065F46',
  },
  statusTextFailed: {
    color: '#991B1B',
  },
  reviewSection: {
    margin: 16,
    marginTop: 0,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  reviewSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  questionReviewCard: {
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
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0ea3d8',
  },
  correctBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  correctText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 4,
  },
  incorrectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  incorrectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
    marginLeft: 4,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  optionCorrect: {
    borderColor: '#10B981',
    backgroundColor: '#D1FAE5',
  },
  optionIncorrect: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  optionIndicator: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
  },
  optionCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  optionTextCorrect: {
    color: '#065F46',
    fontWeight: '600',
  },
  optionTextIncorrect: {
    color: '#991B1B',
    fontWeight: '600',
  },
  correctLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 8,
  },
  incorrectLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#991B1B',
    marginLeft: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    margin: 16,
    marginTop: 0,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonPrimary: {
    backgroundColor: '#0ea3d8',
  },
  actionButtonSecondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  bottomSpacer: {
    height: 20,
  },
});

export default TestResultsScreen;

