import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../services/api/apiService';

type TestType = 'TDG' | 'VEHICLE' | 'HOS' | 'WINTER';
type ContentType = 'PDF' | 'IMAGE' | 'VIDEO';

interface TrainingContent {
  id: string;
  name: string;
  type: ContentType;
  testType: TestType;
  viewed: boolean;
  fileUrl?: string;
  fileName?: string;
  description?: string;
}

const TrainingScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [trainingContent, setTrainingContent] = useState<TrainingContent[]>([]);
  const [trainingCompleted, setTrainingCompleted] = useState(false);
  const [viewedContent, setViewedContent] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTrainingContent();
    loadViewedContent();
  }, []);

  const loadViewedContent = async () => {
    try {
      const viewed = await AsyncStorage.getItem('viewedTrainingContent');
      if (viewed) {
        setViewedContent(new Set(JSON.parse(viewed)));
      }
    } catch (error) {
      console.error('Error loading viewed content:', error);
    }
  };

  const saveViewedContent = async (contentId: string) => {
    try {
      const newViewed = new Set(viewedContent);
      newViewed.add(contentId);
      setViewedContent(newViewed);
      await AsyncStorage.setItem('viewedTrainingContent', JSON.stringify(Array.from(newViewed)));
    } catch (error) {
      console.error('Error saving viewed content:', error);
    }
  };

  const fetchTrainingContent = async () => {
    try {
      setLoading(true);
      
      console.log('📱 Fetching training content...');
      
      // Call the API to get training content
      const response = await apiService.getTrainingContent();
      
      console.log('📱 Training content response:', response);

      // Handle nested response structure from apiService
      const trainingData = response.data?.data || response.data;
      
      console.log('📱 Training data:', trainingData);

      if (response.success && trainingData && Array.isArray(trainingData) && trainingData.length > 0) {
        const content: TrainingContent[] = trainingData.map((item: any) => ({
          id: item._id,
          name: item.name,
          type: item.type as ContentType,
          testType: item.testType as TestType,
          viewed: false, // Will be updated from viewedContent
          fileUrl: item.fileUrl,
          fileName: item.fileName,
          description: item.description
        }));

        console.log('📱 Training content loaded:', content.length, 'items');
        
        setTrainingContent(content);
        
        // Load viewed status from AsyncStorage
        const viewed = await AsyncStorage.getItem('viewedTrainingContent');
        if (viewed) {
          const viewedSet = new Set(JSON.parse(viewed));
          setViewedContent(viewedSet);
          
          // Check if all content viewed
          const allViewed = content.every(item => viewedSet.has(item.id));
          setTrainingCompleted(allViewed);
        }
      } else {
        console.log('📱 No training content available - trainingData:', trainingData);
        // Don't show alert, just show empty state in UI
        setTrainingContent([]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching training content:', error);
      Alert.alert('Error', 'Failed to load training materials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewContent = async (content: TrainingContent) => {
    try {
      console.log('========================================');
      console.log('📱 Opening content:', content.name);
      console.log('📱 Content type:', content.type);
      console.log('📱 Content ID:', content.id);
      console.log('📱 Direct file URL:', content.fileUrl);
      console.log('========================================');

      // Get signed URL for the content
      console.log('📱 Requesting signed URL...');
      const response = await apiService.getTrainingContentSignedUrl(content.id, 'inline');
      
      console.log('📱 Signed URL response:', JSON.stringify(response, null, 2));
      console.log('📱 Response success:', response.success);
      console.log('📱 Response URL:', response.url);
      console.log('📱 Response data:', response.data);
      
      // Handle nested response structure
      const signedUrl = response.url || response.data?.url;
      
      console.log('📱 Extracted signed URL:', signedUrl);
      
      if (response.success && signedUrl) {
        console.log('📱 Checking if URL can be opened...');
        console.log('📱 URL to open:', signedUrl);
        
        const supported = await Linking.canOpenURL(signedUrl);
        console.log('📱 URL supported:', supported);
        
        if (supported) {
          console.log('📱 Opening URL...');
          await Linking.openURL(signedUrl);
          console.log('✅ URL opened successfully');
          
          // Mark as viewed after opening
          await saveViewedContent(content.id);
          
          // Update local state
          setTrainingContent(prev =>
            prev.map(item =>
              item.id === content.id ? { ...item, viewed: true } : item
            )
          );
          
          // Check if all viewed
          const newViewed = new Set(viewedContent);
          newViewed.add(content.id);
          const allViewed = trainingContent.every(item => newViewed.has(item.id));
          setTrainingCompleted(allViewed);
          
          Alert.alert('Success', 'Training material opened. It has been marked as viewed.');
        } else {
          console.log('❌ URL not supported by device');
          Alert.alert('Error', `Cannot open this file type: ${content.type}\n\nURL: ${signedUrl}`);
        }
      } else {
        console.log('⚠️ Signed URL request failed, trying fallback...');
        console.log('📱 Fallback URL:', content.fileUrl);
        
        // Fallback to direct URL if signed URL fails
        if (content.fileUrl) {
          console.log('📱 Using direct URL as fallback');
          const supported = await Linking.canOpenURL(content.fileUrl);
          console.log('📱 Direct URL supported:', supported);
          
          if (supported) {
            console.log('📱 Opening direct URL...');
            await Linking.openURL(content.fileUrl);
            await saveViewedContent(content.id);
            console.log('✅ Direct URL opened successfully');
          } else {
            console.log('❌ Direct URL not supported');
            Alert.alert('Error', `Cannot open URL: ${content.fileUrl}`);
          }
        } else {
          console.log('❌ No URL available to open');
          Alert.alert('Error', 'Unable to open this training material - no URL available');
        }
      }
      console.log('========================================');
    } catch (error: any) {
      console.error('❌ Error opening content:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      Alert.alert('Error', `Failed to open training material: ${error.message}`);
    }
  };

  const handleMarkComplete = async () => {
    console.log('========================================');
    console.log('📝 Mark Training Complete clicked');
    console.log('📝 Training completed:', trainingCompleted);
    console.log('📝 Total content:', trainingContent.length);
    console.log('📝 Viewed content:', viewedContent.size);
    console.log('========================================');
    
    if (!trainingCompleted) {
      Alert.alert(
        'Incomplete Training',
        'Please view all training materials before marking as complete.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      console.log('📚 Calling backend API to mark training complete...');
      
      // Call backend API to mark training as complete
      const response = await apiService.markTrainingComplete();
      
      console.log('📚 Backend response:', response);
      
      if (response.success) {
        // Save to AsyncStorage for local reference
        await AsyncStorage.setItem('trainingCompleted', 'true');
        console.log('✅ Training marked as complete on backend and locally');
        
        Alert.alert(
          'Training Complete!',
          'Great job! You have completed all training materials. You can now take the required tests.',
          [
            { 
              text: 'Take Tests Now', 
              onPress: () => {
                console.log('📝 Navigating to TestsScreen...');
                try {
                  navigation.navigate('TestsScreen' as never);
                  console.log('✅ Navigation successful');
                } catch (error) {
                  console.error('❌ Navigation error:', error);
                }
              } 
            },
            {
              text: 'Later',
              style: 'cancel',
              onPress: () => {
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        console.error('❌ Failed to mark training complete:', response.error);
        Alert.alert('Error', response.error || 'Failed to mark training as complete. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error marking training complete:', error);
      Alert.alert('Error', 'Failed to save training completion status. Please try again.');
    }
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
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea3d8" />
          <Text style={styles.loadingText}>Loading training materials...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Training</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Ionicons name="information-circle" size={24} color="#0ea3d8" />
          <Text style={styles.instructionsText}>
            Review all training materials before proceeding to tests. Tap on any material to view it.
          </Text>
        </View>

        {/* Empty State */}
        {trainingContent.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No Training Materials Yet</Text>
            <Text style={styles.emptyStateText}>
              Training materials will appear here once uploaded by HR. Please check back later or contact your administrator.
            </Text>
          </View>
        )}

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

              {contents.map((content) => {
                const isViewed = viewedContent.has(content.id);
                return (
                  <TouchableOpacity
                    key={content.id}
                    style={[
                      styles.contentCard,
                      isViewed && styles.contentCardViewed,
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
                      {content.description && (
                        <Text style={styles.contentDescription} numberOfLines={2}>
                          {content.description}
                        </Text>
                      )}
                    </View>
                    <View style={styles.contentActions}>
                      {isViewed ? (
                        <View style={styles.viewedBadge}>
                          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                          <Text style={styles.viewedText}>Viewed</Text>
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
                        <Text style={styles.viewButtonText}>
                          {content.type === 'VIDEO' ? 'Play' : 'View'}
                        </Text>
                        <Ionicons 
                          name={content.type === 'VIDEO' ? 'play-circle' : 'open-outline'} 
                          size={16} 
                          color="#FFFFFF" 
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
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
    paddingBottom: Platform.OS === 'android' ? 80 : 32,
    paddingTop: Platform.OS === 'android' ? 8 : 0,
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
  contentDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 16,
  },
});

export default TrainingScreen;

