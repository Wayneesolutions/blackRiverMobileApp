// src/screens/search/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

// Type definitions
interface SearchablePage {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: keyof RootStackParamList;
  category: string;
  keywords: string[];
}

interface QuickAction {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: keyof RootStackParamList;
  color: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

// All searchable pages/screens in your app
const searchablePages: SearchablePage[] = [
  {
    id: '1',
    name: 'Dashboard',
    description: 'Main dashboard with trip overview and statistics',
    icon: 'home-outline',
    route: 'MainTabs',
    category: 'Main',
    keywords: ['home', 'main', 'overview', 'stats', 'dashboard']
  },
  {
    id: '2',
    name: 'New Trip',
    description: 'Create and schedule new trips',
    icon: 'add-circle-outline',
    route: 'NewTrip',
    category: 'Trip Management',
    keywords: ['create', 'new', 'trip', 'schedule', 'add']
  },
  {
    id: '3',
    name: 'Vehicle Management',
    description: 'Manage vehicles, inspections, and maintenance',
    icon: 'car-outline',
    route: 'Vehicle',
    category: 'Fleet Management',
    keywords: ['vehicle', 'truck', 'inspection', 'maintenance', 'fleet']
  },
  {
    id: '4',
    name: 'Trailer Management',
    description: 'Manage trailers and attachments',
    icon: 'bicycle-outline',
    route: 'Trailer',
    category: 'Fleet Management',
    keywords: ['trailer', 'attachment', 'equipment']
  },
  {
    id: '5',
    name: 'Hours of Service (HOS)',
    description: 'Track driving hours and compliance',
    icon: 'time-outline',
    route: 'HOS',
    category: 'Compliance',
    keywords: ['hours', 'service', 'driving', 'compliance', 'log', 'duty']
  },
  {
    id: '6',
    name: 'Asset Incidents',
    description: 'Report and manage vehicle incidents',
    icon: 'warning-outline',
    route: 'AssetIncidents',
    category: 'Safety',
    keywords: ['incident', 'accident', 'report', 'safety', 'damage']
  },
  {
    id: '7',
    name: 'Documents',
    description: 'Manage licenses, permits, and documentation',
    icon: 'document-text-outline',
    route: 'Documents',
    category: 'Compliance',
    keywords: ['documents', 'license', 'permit', 'paperwork', 'compliance']
  },
  {
    id: '8',
    name: 'Settings',
    description: 'App settings and preferences',
    icon: 'settings-outline',
    route: 'Settings',
    category: 'Account',
    keywords: ['settings', 'preferences', 'account', 'profile']
  },
  {
    id: '9',
    name: 'Load Map',
    description: 'View routes and navigation maps',
    icon: 'map-outline',
    route: 'LoadMap',
    category: 'Navigation',
    keywords: ['map', 'route', 'navigation', 'gps', 'directions']
  },
  {
    id: '10',
    name: 'Transfer',
    description: 'Manage cargo transfers and handoffs',
    icon: 'swap-horizontal-outline',
    route: 'Transfer',
    category: 'Operations',
    keywords: ['transfer', 'handoff', 'cargo', 'delivery']
  },
  {
    id: '11',
    name: 'Fuel Management',
    description: 'Track fuel consumption and purchases',
    icon: 'flame-outline',
    route: 'Fuel',
    category: 'Operations',
    keywords: ['fuel', 'gas', 'diesel', 'consumption', 'station']
  },
  {
    id: '12',
    name: 'Active Trips',
    description: 'View and manage currently active trips',
    icon: 'play-circle-outline',
    route: 'ActiveTrips',
    category: 'Trip Management',
    keywords: ['active', 'current', 'ongoing', 'trips']
  },
  {
    id: '13',
    name: 'Complete Trips',
    description: 'View completed trip history',
    icon: 'checkmark-circle-outline',
    route: 'CompleteTrips',
    category: 'Trip Management',
    keywords: ['completed', 'finished', 'history', 'past', 'trips']
  },
  {
    id: '14',
    name: 'Pending Trips',
    description: 'View scheduled and pending trips',
    icon: 'time-outline',
    route: 'PendingTrips',
    category: 'Trip Management',
    keywords: ['pending', 'scheduled', 'upcoming', 'waiting', 'trips']
  },
  {
    id: '15',
    name: 'Notifications',
    description: 'View alerts, tasks, and system notifications',
    icon: 'notifications-outline',
    route: 'Notifications',
    category: 'Communication',
    keywords: ['notifications', 'alerts', 'tasks', 'messages', 'updates']
  },
  {
    id: '16',
    name: 'Help & Support',
    description: 'Get help, FAQs, and contact support',
    icon: 'help-circle-outline',
    route: 'Help',
    category: 'Support',
    keywords: ['help', 'support', 'faq', 'assistance', 'contact']
  },
  {
    id: '17',
    name: 'Trip Information',
    description: 'Detailed trip data and analytics',
    icon: 'information-circle-outline',
    route: 'Trips',
    category: 'Trip Management',
    keywords: ['trip', 'information', 'details', 'analytics', 'data']
  }
];

const recentSearches: string[] = [
  'Vehicle inspection',
  'New trip',
  'Fuel stations',
  'HOS logs',
  'Documents'
];

const quickActions: QuickAction[] = [
  {
    id: 'qa1',
    name: 'Start New Trip',
    icon: 'add-circle',
    route: 'NewTrip',
    color: '#906AD1'
  },
  {
    id: 'qa2',
    name: 'Vehicle Check',
    icon: 'car',
    route: 'Vehicle',
    color: '#10B981'
  },
  {
    id: 'qa3',
    name: 'View Map',
    icon: 'map',
    route: 'LoadMap',
    color: '#3B82F6'
  },
  {
    id: 'qa4',
    name: 'Fuel Log',
    icon: 'flame',
    route: 'Fuel',
    color: '#F59E0B'
  }
];

export default function SearchScreen({ navigation }: Props) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredPages, setFilteredPages] = useState<SearchablePage[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [showRecent, setShowRecent] = useState<boolean>(true);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPages([]);
      setShowRecent(true);
      setSearchPerformed(false);
    } else {
      performSearch(searchQuery);
    }
  }, [searchQuery]);

  const performSearch = (query: string) => {
    const searchTerm = query.toLowerCase().trim();
    
    // Enhanced search algorithm
    const filtered = searchablePages.filter(page => {
      // Exact name match gets highest priority
      if (page.name.toLowerCase() === searchTerm) return true;
      
      // Name contains search term
      if (page.name.toLowerCase().includes(searchTerm)) return true;
      
      // Description contains search term
      if (page.description.toLowerCase().includes(searchTerm)) return true;
      
      // Category contains search term
      if (page.category.toLowerCase().includes(searchTerm)) return true;
      
      // Keywords contain search term
      if (page.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))) return true;
      
      // Check for partial word matches
      const words = searchTerm.split(' ');
      return words.every(word => 
        page.name.toLowerCase().includes(word) ||
        page.description.toLowerCase().includes(word) ||
        page.keywords.some(keyword => keyword.toLowerCase().includes(word))
      );
    });

    // Sort results by relevance
    const sortedResults = filtered.sort((a, b) => {
      // Exact name match first
      if (a.name.toLowerCase() === searchTerm) return -1;
      if (b.name.toLowerCase() === searchTerm) return 1;
      
      // Name starts with search term
      if (a.name.toLowerCase().startsWith(searchTerm)) return -1;
      if (b.name.toLowerCase().startsWith(searchTerm)) return 1;
      
      // Name contains search term (closer to beginning is better)
      const aIndex = a.name.toLowerCase().indexOf(searchTerm);
      const bIndex = b.name.toLowerCase().indexOf(searchTerm);
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      return a.name.localeCompare(b.name);
    });

    setFilteredPages(sortedResults);
    setShowRecent(false);
    setSearchPerformed(true);
  };

  const handlePagePress = (page: SearchablePage) => {
    Keyboard.dismiss();
    
    // Add to recent searches if not already there
    if (!recentSearches.includes(page.name)) {
      recentSearches.unshift(page.name);
      if (recentSearches.length > 5) {
        recentSearches.pop();
      }
    }
    
    // Check if we're trying to navigate to a tab screen
    const tabScreens = ['Dashboard', 'NewTrip', 'Vehicle', 'Trailer', 'HOS', 'AssetIncidents', 'Documents', 'Settings', 'LoadMap', 'Transfer', 'Fuel', 'ActiveTrips', 'CompleteTrips', 'PendingTrips'];
    
    if (page.route === 'MainTabs') {
      // Navigate to MainTabs with Dashboard as default
      navigation.navigate('MainTabs', { screen: 'Dashboard' } as any);
    } else if (tabScreens.includes(page.route as string)) {
      // Navigate to MainTabs first, then to the specific screen
      navigation.navigate('MainTabs', { screen: page.route } as any);
    } else {
      // Direct navigation for modal screens
      navigation.navigate(page.route);
    }
  };

  const handleRecentSearch = (query: string) => {
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowRecent(true);
    setSearchPerformed(false);
  };

  const clearRecentSearches = () => {
    recentSearches.splice(0, recentSearches.length);
  };

  const renderSearchResult = ({ item }: { item: SearchablePage }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handlePagePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultIconContainer}>
        <Ionicons name={item.icon} size={24} color="#906AD1" />
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle}>{item.name}</Text>
        <Text style={styles.resultDescription}>{item.description}</Text>
        <Text style={styles.resultCategory}>{item.category}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const renderRecentSearch = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.recentItem}
      onPress={() => handleRecentSearch(item)}
    >
      <Ionicons name="time-outline" size={16} color="#9CA3AF" />
      <Text style={styles.recentText}>{item}</Text>
      <Ionicons name="arrow-up-outline" size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const renderQuickAction = ({ item }: { item: QuickAction }) => (
    <TouchableOpacity
      style={[styles.quickActionItem, { backgroundColor: item.color + '20' }]}
      onPress={() => {
        const page = searchablePages.find(p => p.route === item.route);
        if (page) {
          handlePagePress(page);
        }
      }}
    >
      <Ionicons name={item.icon} size={24} color={item.color} />
      <Text style={[styles.quickActionText, { color: item.color }]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[
          styles.searchBar,
          isSearchFocused && styles.searchBarFocused
        ]}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search pages, features, or help topics..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Search Results */}
        {searchPerformed && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Search Results {filteredPages.length > 0 && `(${filteredPages.length})`}
            </Text>
            {filteredPages.length > 0 ? (
              <FlatList
                data={filteredPages}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={48} color="#9CA3AF" />
                <Text style={styles.noResultsTitle}>No Pages Found</Text>
                <Text style={styles.noResultsText}>
                  No pages match "{searchQuery}". Try different keywords or check spelling.
                </Text>
                <TouchableOpacity 
                  style={styles.showAllButton}
                  onPress={clearSearch}
                >
                  <Text style={styles.showAllButtonText}>Show All Pages</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Quick Actions */}
        {showRecent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <FlatList
              data={quickActions}
              renderItem={renderQuickAction}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={styles.quickActionRow}
            />
          </View>
        )}

        {/* Recent Searches */}
        {showRecent && recentSearches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <TouchableOpacity onPress={clearRecentSearches}>
                <Text style={styles.clearButton}>Clear</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={recentSearches}
              renderItem={renderRecentSearch}
              keyExtractor={(item, index) => index.toString()}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* All Pages (when no search) */}
        {showRecent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Pages</Text>
            {/* Group by category */}
            {['Main', 'Trip Management', 'Fleet Management', 'Compliance', 'Operations', 'Navigation', 'Communication', 'Support', 'Safety', 'Account'].map(category => {
              const categoryPages = searchablePages.filter(page => page.category === category);
              if (categoryPages.length === 0) return null;
              
              return (
                <View key={category} style={styles.categoryContainer}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  {categoryPages.map(page => (
                    <TouchableOpacity
                      key={page.id}
                      style={styles.pageItem}
                      onPress={() => handlePagePress(page)}
                    >
                      <View style={styles.pageIconContainer}>
                        <Ionicons name={page.icon} size={20} color="#906AD1" />
                      </View>
                      <View style={styles.pageContent}>
                        <Text style={styles.pageTitle}>{page.name}</Text>
                        <Text style={styles.pageDescription}>{page.description}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchBarFocused: {
    backgroundColor: '#fff',
    borderColor: '#906AD1',
    shadowColor: '#906AD1',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 8,
    marginRight: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  clearButton: {
    fontSize: 14,
    color: '#906AD1',
    fontWeight: '600',
  },
  
  // Quick Actions
  quickActionRow: {
    justifyContent: 'space-between',
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 4,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Recent Searches
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recentText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    marginLeft: 8,
  },
  
  // Search Results
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  resultDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  resultCategory: {
    fontSize: 11,
    color: '#906AD1',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  
  // Category Pages
  categoryContainer: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#906AD1',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 4,
  },
  pageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  pageIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pageContent: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  pageDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  
  // No Results
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  noResultsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  showAllButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#906AD1',
    borderRadius: 8,
  },
  showAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});