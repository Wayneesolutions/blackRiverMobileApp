import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { crashReporter, CrashLog } from '../../utils/crashReporter';

const CrashLogsScreen: React.FC = () => {
  const [crashLogs, setCrashLogs] = useState<CrashLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<CrashLog | null>(null);

  useEffect(() => {
    loadCrashLogs();
  }, []);

  const loadCrashLogs = async () => {
    try {
      setLoading(true);
      const logs = await crashReporter.getCrashLogs();
      // Filter out any corrupted or invalid logs
      const validLogs = (logs || []).filter((log: any) => {
        return log && 
               typeof log === 'object' && 
               log.timestamp && 
               log.error && 
               typeof log.error === 'object' &&
               log.platform;
      });
      setCrashLogs(validLogs);
    } catch (error) {
      console.error('Failed to load crash logs:', error);
      Alert.alert('Error', 'Failed to load crash logs');
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Clear Crash Logs',
      'Are you sure you want to delete all crash logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await crashReporter.clearCrashLogs();
            setCrashLogs([]);
            Alert.alert('Success', 'Crash logs cleared');
          },
        },
      ]
    );
  };

  const handleExportLogs = async () => {
    try {
      const logsText = await crashReporter.getCrashLogsAsText();
      const exportData = await crashReporter.exportCrashLogs();

      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Share.share({
          message: exportData,
          title: 'Crash Logs Export',
        });
      } else {
        // For web, copy to clipboard or download
        Alert.alert('Export', `Logs exported:\n\n${logsText.substring(0, 500)}...`);
      }
    } catch (error) {
      console.error('Failed to export logs:', error);
      Alert.alert('Error', 'Failed to export crash logs');
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading crash logs...</Text>
      </View>
    );
  }

  if (crashLogs.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="bug-outline" size={64} color="#F59E0B" />
          <Text style={styles.emptyText}>No Crash Logs Saved</Text>
          <Text style={styles.emptySubtext}>
            If the app is crashing, logs may not be saved in time.
          </Text>
          <Text style={[styles.emptySubtext, { marginTop: 16, fontSize: 12, color: '#666' }]}>
            Native crashes terminate the app before logs can be saved.
          </Text>
          <Text style={[styles.emptySubtext, { marginTop: 8, fontSize: 12, color: '#666' }]}>
            Check console logs with:
          </Text>
          <Text style={[styles.emptySubtext, { marginTop: 4, fontSize: 11, color: '#999', fontFamily: 'monospace' }]}>
            • Remote Debugging (Chrome DevTools)
          </Text>
          <Text style={[styles.emptySubtext, { marginTop: 4, fontSize: 11, color: '#999', fontFamily: 'monospace' }]}>
            • ADB Logcat (adb logcat)
          </Text>
          <TouchableOpacity 
            style={styles.testButton}
            onPress={async () => {
              // Test if crash reporter works
              const testError = new Error('TEST: Crash reporter is working');
              crashReporter.logCrashSync(testError, 'CrashLogsScreen', { test: true });
              await crashReporter.logCrash(testError, 'CrashLogsScreen', { test: true });
              Alert.alert('Test Complete', 'Test crash log saved. Refresh to see it.');
              loadCrashLogs();
            }}
          >
            <Text style={styles.testButtonText}>Test Crash Reporter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Crash Logs ({crashLogs.length})</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleExportLogs}
          >
            <Ionicons name="share-outline" size={20} color="#8B5CF6" />
            <Text style={styles.actionButtonText}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.clearButton]}
            onPress={handleClearLogs}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={[styles.actionButtonText, styles.clearButtonText]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.logsList}>
        {crashLogs.map((log, index) => (
          <TouchableOpacity
            key={index}
            style={styles.logCard}
            onPress={() => setSelectedLog(log)}
          >
            <View style={styles.logHeader}>
              <View style={styles.logIconContainer}>
                <Ionicons name="bug" size={20} color="#EF4444" />
              </View>
              <View style={styles.logInfo}>
                <Text style={styles.logComponent}>{log?.component || 'Unknown'}</Text>
                <Text style={styles.logTime}>{log?.timestamp ? formatDate(log.timestamp) : 'Unknown time'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
            <Text style={styles.logMessage} numberOfLines={2}>
              {log?.error?.message || 'No error message available'}
            </Text>
            <Text style={styles.logPlatform}>Platform: {log?.platform || 'Unknown'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedLog && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Crash Details</Text>
              <TouchableOpacity onPress={() => setSelectedLog(null)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Time:</Text>
                <Text style={styles.detailValue}>{selectedLog?.timestamp ? formatDate(selectedLog.timestamp) : 'Unknown'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Component:</Text>
                <Text style={styles.detailValue}>{selectedLog?.component || 'Unknown'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Platform:</Text>
                <Text style={styles.detailValue}>{selectedLog?.platform || 'Unknown'}</Text>
              </View>
              {selectedLog?.error && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Error Name:</Text>
                    <Text style={styles.detailValue}>{selectedLog.error?.name || 'Unknown'}</Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Error Message:</Text>
                    <Text style={styles.detailValue}>{selectedLog.error?.message || 'No error message available'}</Text>
                  </View>
                  {selectedLog.error?.stack && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Stack Trace:</Text>
                      <ScrollView style={styles.stackTrace}>
                        <Text style={styles.stackTraceText}>{selectedLog.error.stack}</Text>
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
              {!selectedLog?.error && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Error:</Text>
                  <Text style={styles.detailValue}>Error information is missing or corrupted</Text>
                </View>
              )}
              {selectedLog?.additionalData && Object.keys(selectedLog.additionalData).length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Additional Data:</Text>
                  <Text style={styles.detailValue}>
                    {JSON.stringify(selectedLog.additionalData, null, 2)}
                  </Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setSelectedLog(null)}
              >
                <Text style={styles.closeModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  clearButton: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B5CF6',
  },
  clearButtonText: {
    color: '#EF4444',
  },
  logsList: {
    flex: 1,
    padding: 16,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logInfo: {
    flex: 1,
  },
  logComponent: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  logTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  logMessage: {
    fontSize: 14,
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  logPlatform: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },
  stackTrace: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  stackTraceText: {
    fontSize: 12,
    color: '#111827',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },
  testButton: {
    marginTop: 20,
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  closeModalButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CrashLogsScreen;

