import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface DashboardItemProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  count?: number;
}

const DashboardItem: React.FC<DashboardItemProps> = ({
  title,
  icon,
  color,
  onPress,
  count,
}) => (
  <TouchableOpacity style={[styles.dashboardItem, { borderLeftColor: color }]} onPress={onPress}>
    <View style={styles.itemContent}>
      <View style={styles.itemHeader}>
        <Ionicons name={icon} size={32} color={color} />
        {count !== undefined && (
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        )}
      </View>
      <Text style={styles.itemTitle}>{title}</Text>
    </View>
  </TouchableOpacity>
);

export default function DashboardScreen() {
  const dashboardItems: DashboardItemProps[] = [
    {
      title: 'Vehicle',
      icon: 'car',
      color: '#6B46C1',
      count: 12,
      onPress: () => console.log('Vehicle pressed'),
    },
    {
      title: 'Trailer',
      icon: 'business',
      color: '#8B5CF6',
      count: 8,
      onPress: () => console.log('Trailer pressed'),
    },
    {
      title: 'SOS',
      icon: 'warning',
      color: '#EF4444',
      onPress: () => console.log('SOS pressed'),
    },
    {
      title: 'Asset Inc',
      icon: 'shield-checkmark',
      color: '#F59E0B',
      count: 3,
      onPress: () => console.log('Asset Inc pressed'),
    },
    {
      title: 'Settings',
      icon: 'settings',
      color: '#6B7280',
      onPress: () => console.log('Settings pressed'),
    },
    {
      title: 'Payroll',
      icon: 'card',
      color: '#10B981',
      onPress: () => console.log('Payroll pressed'),
    },
    {
      title: 'Document',
      icon: 'document-text',
      color: '#3B82F6',
      count: 24,
      onPress: () => console.log('Document pressed'),
    },
    {
      title: 'Load Map',
      icon: 'map',
      color: '#8B5CF6',
      onPress: () => console.log('Load Map pressed'),
    },
    {
      title: 'Roadside Check',
      icon: 'checkmark-circle',
      color: '#059669',
      onPress: () => console.log('Roadside Check pressed'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>John Doe</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications" size={24} color="#FFFFFF" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationCount}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dashboard Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <Text style={styles.sectionSubtitle}>Manage your fleet operations</Text>
        </View>

        <View style={styles.grid}>
          {dashboardItems.map((item, index) => (
            <DashboardItem
              key={index}
              title={item.title}
              icon={item.icon}
              color={item.color}
              count={item.count}
              onPress={item.onPress}
            />
          ))}
        </View>

        {/* Status Cards */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          
          <View style={styles.statusCards}>
            <View style={[styles.statusCard, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="car-sport" size={24} color="#3B82F6" />
              <Text style={styles.statusNumber}>24</Text>
              <Text style={styles.statusLabel}>Active Routes</Text>
            </View>
            
            <View style={[styles.statusCard, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.statusNumber}>18</Text>
              <Text style={styles.statusLabel}>Completed</Text>
            </View>
            
            <View style={[styles.statusCard, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time" size={24} color="#F59E0B" />
              <Text style={styles.statusNumber}>6</Text>
              <Text style={styles.statusLabel}>Pending</Text>
            </View>
          </View>
        </View>
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
    backgroundColor: '#6B46C1',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  welcomeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dashboardItem: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  itemContent: {
    alignItems: 'flex-start',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 12,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  statusCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statusCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statusNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
});