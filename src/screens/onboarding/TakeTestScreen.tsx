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
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiService } from '../../services/api/apiService';

type TestType = 'TDG' | 'VEHICLE' | 'HOS' | 'WINTER';

interface Question {
  _id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface QuestionBank {
  _id: string;
  testName: string;
  testType: TestType;
  passingPercentage: number;
  questions: Question[];
}

interface UserAnswer {
  questionId: string;
  selectedAnswer: number;
}

const TakeTestScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { testType } = route.params as { testType: TestType };

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questionBank, setQuestionBank] = useState<QuestionBank | null>(null);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      
      console.log('========================================');
      console.log('📝 Fetching questions for test type:', testType);
      
      // Fetch question bank from backend
      const response = await apiService.getQuestionBank(testType);
      
      console.log('📝 Full response:', JSON.stringify(response, null, 2));
      console.log('📝 Response success:', response.success);
      console.log('📝 Response data type:', Array.isArray(response.data) ? 'Array' : typeof response.data);
      
      if (response.success) {
        // Handle nested data structure
        let questionBanksArray = response.data;
        
        // Check if data is wrapped
        if (response.data?.data) {
          questionBanksArray = response.data.data;
          console.log('📝 Data was wrapped, extracted inner data');
        }
        
        console.log('📝 Question banks array:', questionBanksArray);
        console.log('📝 Is array:', Array.isArray(questionBanksArray));
        console.log('📝 Array length:', Array.isArray(questionBanksArray) ? questionBanksArray.length : 'Not an array');
        
        if (Array.isArray(questionBanksArray) && questionBanksArray.length > 0) {
          const data = questionBanksArray[0];
          console.log('📝 First question bank:', JSON.stringify(data, null, 2));
          
          if (data && data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
            setQuestionBank(data);
            console.log('✅ Loaded', data.questions.length, 'questions');
            console.log('✅ Question bank set successfully');
          } else {
            console.error('❌ No questions in question bank:', data);
            Alert.alert(
              'No Questions Available',
              `No questions have been added for the ${getTestTypeLabel(testType)} test.\n\nPlease contact HR to add questions for this test.`
            );
            navigation.goBack();
          }
        } else {
          console.error('❌ No question banks found for test type:', testType);
          Alert.alert(
            'Test Not Available',
            `The ${getTestTypeLabel(testType)} test has not been set up yet.\n\nPlease contact HR to create this test.`
          );
          navigation.goBack();
        }
      } else {
        console.error('❌ API returned error:', response.error || response.message);
        Alert.alert('Error', response.error || 'Failed to load test questions. Please try again.');
        navigation.goBack();
      }
      console.log('========================================');
    } catch (error: any) {
      console.error('❌ Error fetching questions:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      Alert.alert('Error', `Failed to load test: ${error.message}`);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionId: string, optionIndex: number) => {
    console.log('📝 Selected answer:', { questionId, optionIndex });
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, optionIndex);
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (!questionBank) return;
    
    if (currentQuestionIndex < questionBank.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!questionBank) return;

    // Check if all questions are answered
    const unansweredCount = questionBank.questions.length - answers.size;
    
    if (unansweredCount > 0) {
      Alert.alert(
        'Incomplete Test',
        `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? 's' : ''}. Do you want to submit anyway?`,
        [
          { text: 'Continue Testing', style: 'cancel' },
          { text: 'Submit', onPress: submitTest, style: 'destructive' }
        ]
      );
      return;
    }

    submitTest();
  };

  const submitTest = async () => {
    if (!questionBank) return;

    try {
      setSubmitting(true);
      
      console.log('========================================');
      console.log('📤 Submitting test answers');
      console.log('📝 Test type:', testType);
      console.log('📝 Question bank ID:', questionBank._id);
      console.log('📝 Total answers:', answers.size);
      
      // Get user data
      let userDataStr = await AsyncStorage.getItem('user_data');
      if (!userDataStr) {
        userDataStr = await AsyncStorage.getItem('@fleetgo_user_data');
      }
      
      if (!userDataStr) {
        Alert.alert('Error', 'User data not found. Please login again.');
        return;
      }

      const userData = JSON.parse(userDataStr);
      const driverId = userData._id || userData.id;

      // Format answers for submission
      const formattedAnswers: UserAnswer[] = questionBank.questions.map((q, index) => ({
        questionId: q._id || index.toString(),
        selectedAnswer: answers.get(q._id || index.toString()) ?? -1
      }));

      console.log('📤 Formatted answers:', formattedAnswers);

      // Submit to backend
      const response = await apiService.submitTestResult({
        driverId,
        testType,
        questionBankId: questionBank._id,
        answers: formattedAnswers
      });

      console.log('📤 Submit response:', response);
      console.log('========================================');

      if (response.success && response.data) {
        const { score, passed } = response.data;
        
        // Save test completion to AsyncStorage
        const allTests = await AsyncStorage.getItem('completedTests');
        const completedTests = allTests ? JSON.parse(allTests) : [];
        if (!completedTests.includes(testType)) {
          completedTests.push(testType);
          await AsyncStorage.setItem('completedTests', JSON.stringify(completedTests));
        }

        Alert.alert(
          passed ? '🎉 Congratulations!' : '📝 Test Complete',
          `You scored ${score}%\n\n${
            passed
              ? `You passed the ${getTestTypeLabel(testType)} test!`
              : `You need ${questionBank.passingPercentage}% to pass. You can retake the test.`
          }`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to submit test. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error submitting test:', error);
      Alert.alert('Error', 'Failed to submit test. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea3d8" />
          <Text style={styles.loadingText}>Loading test...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!questionBank || questionBank.questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>No questions available</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = questionBank.questions[currentQuestionIndex];
  const selectedAnswer = answers.get(currentQuestion._id || currentQuestionIndex.toString());
  const progress = ((currentQuestionIndex + 1) / questionBank.questions.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{getTestTypeLabel(testType)}</Text>
          <Text style={styles.headerSubtitle}>{questionBank.testName}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            Question {currentQuestionIndex + 1} of {questionBank.questions.length}
          </Text>
          <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: getTestTypeColor(testType) }]} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>Question {currentQuestionIndex + 1}</Text>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected
                ]}
                onPress={() => handleSelectAnswer(currentQuestion._id || currentQuestionIndex.toString(), index)}
              >
                <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}>
                  {isSelected && <View style={styles.optionRadioInner} />}
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {String.fromCharCode(65 + index)}. {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonSecondary, currentQuestionIndex === 0 && styles.navButtonDisabled]}
            onPress={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            <Ionicons name="chevron-back" size={20} color={currentQuestionIndex === 0 ? '#9CA3AF' : '#1F2937'} />
            <Text style={[styles.navButtonText, currentQuestionIndex === 0 && styles.navButtonTextDisabled]}>
              Previous
            </Text>
          </TouchableOpacity>

          {currentQuestionIndex < questionBank.questions.length - 1 ? (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonPrimary]}
              onPress={handleNext}
            >
              <Text style={styles.navButtonTextPrimary}>Next</Text>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonSubmit, submitting && styles.navButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.navButtonTextPrimary}>Submit Test</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Test Info */}
        <View style={styles.testInfo}>
          <View style={styles.testInfoRow}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#059669" />
            <Text style={styles.testInfoText}>
              Passing Score: {questionBank.passingPercentage}%
            </Text>
          </View>
          <View style={styles.testInfoRow}>
            <Ionicons name="document-text-outline" size={20} color="#0ea3d8" />
            <Text style={styles.testInfoText}>
              Answered: {answers.size} / {questionBank.questions.length}
            </Text>
          </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
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
  progressSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0ea3d8',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0ea3d8',
    marginBottom: 12,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 24,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  optionCardSelected: {
    borderColor: '#0ea3d8',
    backgroundColor: '#EFF6FF',
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioSelected: {
    borderColor: '#0ea3d8',
  },
  optionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0ea3d8',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  optionTextSelected: {
    color: '#1F2937',
    fontWeight: '600',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  navButtonSecondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  navButtonPrimary: {
    backgroundColor: '#0ea3d8',
  },
  navButtonSubmit: {
    backgroundColor: '#059669',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 4,
  },
  navButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 4,
  },
  navButtonTextDisabled: {
    color: '#9CA3AF',
  },
  testInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  testInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  testInfoText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  button: {
    backgroundColor: '#0ea3d8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 20,
  },
});

export default TakeTestScreen;

