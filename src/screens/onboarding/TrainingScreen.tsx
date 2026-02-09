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
type ContentType = 'PDF' | 'IMAGE' | 'VIDEO';

interface TrainingContent {
  id: string;
  name: string;
  type: ContentType;
  testType: TestType;
  viewed: boolean;
}

const TrainingScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [trainingContent, setTrainingContent] = useState<TrainingContent[]>([]);
  const [trainingCompleted, setTrainingCompleted] = useState(false);

  useEffect(() => {
    fetchTrainingContent();
  }, []);

  const fetchTrainingContent = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      
      // Mock data
      const mockContent: TrainingContent[] = [
        { id: '1', name: 'TDG Safety Guidelines 2024', type: 'PDF', testType: 'TDG', viewed: true },
        { id: '2', name: 'TDG Hazardous Materials Chart', type: 'IMAGE', testType: 'TDG', viewed: false },
        { id: '3', name: 'Vehicle Inspection Checklist', type: 'PDF', testType: 'VEHICLE', viewed: true },
        { id: '4', name: 'HOS Regulations Training Video', type: 'VIDEO', testType: 'HOS', viewed: false },
        { id: '5', name: 'Winter Driving Safety Guide', type: 'IMAGE', testType: 'WINTER', viewed: false },
      ];

      setTrainingContent(mockContent);
      
      // Check if all content viewed
      const allViewed = mockContent.every(item => item.viewed);
      setTrainingCompleted(allViewed);
    } catch (error) {
      console.error('Error fetching training content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewContent = (content: TrainingContent) => {
    Alert.alert(
      'View Training Content',
      `Opening ${content.name}\n\nType: ${content.type}\nTest Type: ${content.testType}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Viewed',
          onPress: () => {
            setTrainingContent(prev =>
              prev.map(item =>
                item.id === content.id ? { ...item, viewed: true } : item
              )
            );
            // Check if all viewed
            const updated = trainingContent.map(item =>
              item.id === content.id ? { ...item, viewed: true } : item
            );
            const allViewed = updated.every(item => item.viewed);
            setTrainingCompleted(allViewed);
          },
        },
      ]
    );
  };

  const handleMarkComplete = () => {
    if (!trainingCompleted) {
      Alert.alert(
        'Incomplete Training',
        'Please view all training materials before marking as complete.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Training Complete',
      'You have completed all training materials. You can now proceed to take the tests.',
      [
        { text: 'OK', onPress: () => navigation.navigate('TestsScreen' as never) },
      ]
    );
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

  const getContentIcon = (type: ContentType) => {
    switch (type) {
      case 'PDF':
        return 'document-text';
      case 'VIDEO':
        return 'videocam';
      case 'IMAGE':
        return 'image';
    }
  };

  const groupedContent = trainingContent.reduce((acc, content) => {
    if (!acc[content.testType]) {
      acc[content.testType] = [];
    }
    acc[content.testType].push(content);
    return acc;
  }, {} as Record<TestType, TrainingContent[]>);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea3d8" />
          <Text style={styles.loadingText}>Loading training materials...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Training</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Ionicons name="information-circle" size={24} color="#0ea3d8" />
          <Text style={styles.instructionsText}>
            Review all training materials before proceeding to tests. Mark each item as viewed after reviewing.
          </Text>
        </View>

        {/* Training Content by Type */}
        {(['TDG', 'VEHICLE', 'HOS', 'WINTER'] as TestType[]).map((testType) => {
          const contents = groupedContent[testType] || [];
          if (contents.length === 0) return null;

          return (
            <View key={testType} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.testTypeBadge,
                    { backgroundColor: getTestTypeColor(testType) + '20' },
                  ]}
                >
                  <Text
                    style={[styles.testTypeText, { color: getTestTypeColor(testType) }]}
                  >
                    {getTestTypeLabel(testType)} Training
                  </Text>
                </View>
              </View>

              {contents.map((content) => (
                <TouchableOpacity
                  key={content.id}
                  style={[
                    styles.contentCard,
                    content.viewed && styles.contentCardViewed,
                  ]}
                  onPress={() => handleViewContent(content)}
                >
                  <View style={styles.contentIconContainer}>
                    <Ionicons
                      name={getContentIcon(content.type) as any}
                      size={24}
                      color={getTestTypeColor(content.testType)}
                    />
                  </View>
                  <View style={styles.contentInfo}>
                    <Text style={styles.contentName}>{content.name}</Text>
                    <Text style={styles.contentType}>{content.type}</Text>
                  </View>
                  <View style={styles.contentActions}>
                    {content.viewed ? (
                      <View style={styles.viewedBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.viewedText}>Completed</Text>
                      </View>
                    ) : (
                      <View style={styles.notViewedBadge}>
                        <Text style={styles.notViewedText}>Not Viewed</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.viewButton}
                      onPress={() => handleViewContent(content)}
                    >
                      <Text style={styles.viewButtonText}>View</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        {/* Complete Button */}
        <TouchableOpacity
          style={[
            styles.completeButton,
            !trainingCompleted && styles.completeButtonDisabled,
          ]}
          onPress={handleMarkComplete}
          disabled={!trainingCompleted}
        >
          <Text style={styles.completeButtonText}>Mark Training Complete →</Text>
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
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea3d8',
  },
  instructionsText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  testTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  testTypeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentCardViewed: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  contentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentInfo: {
    flex: 1,
  },
  contentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  contentType: {
    fontSize: 12,
    color: '#6B7280',
  },
  contentActions: {
    alignItems: 'flex-end',
  },
  viewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewedText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  notViewedBadge: {
    marginBottom: 8,
  },
  notViewedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  viewButton: {
    backgroundColor: '#0ea3d8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completeButton: {
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
  completeButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: 16,
  },
});

export default TrainingScreen;

