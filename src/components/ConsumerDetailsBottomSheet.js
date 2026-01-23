/**
 * ConsumerDetailsBottomSheet Component
 * 
 * Fixed: static headers/sections always visible, only values use SkeletonLoader while loading
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { API_ENDPOINTS } from '../constants/constants';
import { getToken } from '../utils/storage';
import CloseIcon from "../../assets/icons/cross.svg";
import { SkeletonLoader } from '../utils/loadingManager';

const ConsumerDetailsBottomSheet = ({ 
  visible,
  consumerUid, 
  onClose 
}) => {
  const [consumerData, setConsumerData] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [slideAnim] = useState(new Animated.Value(0));

  const screenHeight = Dimensions.get('window').height;

  // Fetch consumer data when bottom sheet opens
  const fetchConsumerData = useCallback(async () => {
    if (!consumerUid) return;

    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      const API_URL = API_ENDPOINTS.consumers.get(consumerUid);
      
      console.log('🔄 Fetching consumer details from:', API_URL);

      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Consumer details response:', result);

      // Handle nested data structure
      const data = result.data || result;
      setConsumerData(data);

    } catch (err) {
      console.error('❌ Error fetching consumer details:', err);
      setError(err.message || 'Unknown error');
      Alert.alert(
        'Error',
        'Failed to load consumer details. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [consumerUid]);

  // Fetch data when consumerUid changes
  useEffect(() => {
    if (consumerUid && visible) {
      fetchConsumerData();
    } else if (!visible) {
      // setConsumerData(null);
      // setError(null);
    }
  }, [consumerUid, visible, fetchConsumerData]);

  // Handle visibility animation
  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [slideAnim, onClose]);


  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return dateString || 'N/A';
    }
  };

  // Format reading date without seconds
  const formatReadingDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      // Remove seconds from timestamp (format: "23rd Jan 2026 04:45:01 AM" -> "23rd Jan 2026 04:45 AM")
      // Pattern: match "HH:MM:SS" and replace with "HH:MM"
      return dateString.replace(/(\d{1,2}:\d{2}):\d{2}/g, '$1');
    } catch (error) {
      return dateString;
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return typeof value === 'number' ? value.toFixed(2) : value;
  };

  // Convert voltage from centivolts to volts
  const formatVoltage = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      return (value / 100).toFixed(2); // Convert centivolts to volts
    }
    return value;
  };

  // Calculate per-phase power: Power (W) = Voltage (V) × Current (A)
  // This calculates apparent power per phase (VA), which is correct for instantaneous meter readings
  // Note: For real power, we would need power factor: Real Power = V × I × PF
  // The total kW in API is system-level and may be cumulative or measured differently
  const calculatePower = (voltage, current) => {
    if (!voltage || !current || voltage === null || current === null) return 0;
    const voltageInVolts = typeof voltage === 'number' ? voltage / 100 : 0; // Convert centivolts to volts
    const currentInAmps = typeof current === 'number' ? current : 0;
    return voltageInVolts * currentInAmps; // Apparent power per phase in VA (displayed as W)
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        <Animated.View 
          style={[
            styles.bottomSheet, 
            { transform: [{ translateY }] }
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Consumer Details</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <CloseIcon width={18} height={18} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {error && !isLoading ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Failed to load data</Text>
                <TouchableOpacity onPress={fetchConsumerData} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.section}>
                  <View style={styles.infoContainer}>
                    <InfoRow
                      label="Consumer Name"
                      value={
                        isLoading ? (
                          <SkeletonLoader variant="lines" lines={1} style={{ height: 12, width: 120 }} />
                        ) : (
                          consumerData?.name || 'N/A'
                        )
                      }
                    />
                    <InfoRow
                      label="Consumer Number"
                      value={
                        isLoading ? (
                          <SkeletonLoader variant="lines" lines={1} style={{ height: 12, width: 100 }} />
                        ) : (
                          consumerData?.consumerNumber || 'N/A'
                        )
                      }
                    />
                    <InfoRow
                      label="Meter Serial"
                      value={
                        isLoading ? (
                          <SkeletonLoader variant="lines" lines={1} style={{ height: 12, width: 100 }} />
                        ) : (
                          consumerData?.meterSerialNumber || 'N/A'
                        )
                      }
                    />
                    <InfoRow
                      label="UID"
                      value={
                        isLoading ? (
                          <SkeletonLoader variant="lines" lines={1} style={{ height: 12, width: 100 }} />
                        ) : (
                          consumerData?.uniqueIdentificationNo || 'N/A'
                        )
                      }
                    />
                    <InfoRow
                      label="Phase"
                      value={
                        isLoading ? (
                          <SkeletonLoader variant="lines" lines={1} style={{ height: 12, width: 80 }} />
                        ) : (
                          `${consumerData?.meterPhase || 'N/A'} Phase`
                        )
                      }
                    />
                    <InfoRow
                      label="Status"
                      value={
                        isLoading ? (
                          <SkeletonLoader variant="lines" lines={1} style={{ height: 12, width: 80 }} />
                        ) : (
                          consumerData?.occupancyStatus || 'N/A'
                        )
                      }
                    />
                  </View>
                </View>

                <View style={[styles.section, { marginTop: 24 }]}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Instantaneous Meter Readings</Text>

                    {/* Reading Time - always visible */}
                    <View style={styles.timestampContainer}>
                      <Text style={styles.timestampLabel}>Reading Time:</Text>
                      {isLoading || !consumerData?.readingDate ? (
                        <SkeletonLoader
                          variant="text"
                          lines={1}
                          style={{ height: 14, width: 120 }}
                        />
                      ) : (
                        <Text style={styles.timestampValue}>
                          {formatReadingDate(consumerData.readingDate)}
                        </Text>
                      )}
                    </View>
                  </View>
                  {/* Voltage Readings */}
                <View style={styles.readingsContainer}>
                  <Text style={[styles.readingsSubtitle, { marginBottom: 15 }]}>Voltage Readings</Text>
                  <View style={styles.readingsGrid}>
                    <ReadingCard 
                      phase="R-Phase" 
                      value={formatVoltage(consumerData?.rPhaseVoltage)} 
                      unit="V" 
                      color="#E70000"
                      loading={isLoading}
                    />
                    <ReadingCard 
                      phase="Y-Phase" 
                      value={formatVoltage(consumerData?.yPhaseVoltage)} 
                      unit="V" 
                      color="#FFC107"
                      loading={isLoading}
                    />
                    <ReadingCard 
                      phase="B-Phase" 
                      value={formatVoltage(consumerData?.bPhaseVoltage)} 
                      unit="V" 
                      color="#007AFF"
                      loading={isLoading}
                    />
                  </View>

                  {/* Current Readings */}
                  <Text style={[styles.readingsSubtitle, { marginTop: 15, marginBottom: 15 }]}>Current Readings</Text>
                  <View style={styles.readingsGrid}>
                    <ReadingCard 
                      phase="R-Phase" 
                      value={formatValue(consumerData?.rPhaseCurrent)} 
                      unit="A" 
                      color="#E70000"
                      loading={isLoading}
                    />
                    <ReadingCard 
                      phase="Y-Phase" 
                      value={formatValue(consumerData?.yPhaseCurrent)} 
                      unit="A" 
                      color="#FFC107"
                      loading={isLoading}
                    />
                    <ReadingCard 
                      phase="B-Phase" 
                      value={formatValue(consumerData?.bPhaseCurrent)} 
                      unit="A" 
                      color="#007AFF"
                      loading={isLoading}
                    />
                  </View>

                  {/* Power Readings */}
                  <Text style={[styles.readingsSubtitle, { marginTop: 15, marginBottom: 15 }]}>Power Readings</Text>
                  <View style={styles.readingsGrid}>
                    <ReadingCard 
                      phase="R-Phase" 
                      value={formatValue(calculatePower(consumerData?.rPhaseVoltage, consumerData?.rPhaseCurrent))} 
                      unit="W" 
                      color="#E70000"
                      loading={isLoading}
                    />
                    <ReadingCard 
                      phase="Y-Phase" 
                      value={formatValue(calculatePower(consumerData?.yPhaseVoltage, consumerData?.yPhaseCurrent))} 
                      unit="W" 
                      color="#FFC107"
                      loading={isLoading}
                    />
                    <ReadingCard 
                      phase="B-Phase" 
                      value={formatValue(calculatePower(consumerData?.bPhaseVoltage, consumerData?.bPhaseCurrent))} 
                      unit="W" 
                      color="#007AFF"
                      loading={isLoading}
                    />
                  </View>
                </View>
                </View>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <View style={{ flex: 1, alignItems: 'flex-end' }}>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={styles.infoValue}>{value}</Text>
      ) : (
        value
      )}
    </View>
  </View>
);

const ReadingCard = ({ phase, value, unit, color, loading }) => (
  <View style={[
    styles.readingCard, 
    { 
      borderLeftColor: color,
      borderTopColor: '#E2E8F0',
      borderRightColor: '#E2E8F0',
      borderBottomColor: '#E2E8F0'
    }
  ]}>
    <Text style={styles.readingPhase}>{phase}</Text>
    {loading ? (
      <SkeletonLoader variant="lines" lines={1} style={{ height: 18, width: 80, marginTop: 6 }} />
    ) : (
      <Text style={styles.readingValue}>
        {value === 'N/A' || value === undefined || value === null ? 'N/A' : value} <Text style={styles.readingUnit}>{unit}</Text>
      </Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
  },
  handle: {
    width: 48,
    height: 4,
    backgroundColor: COLORS.primaryColor,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginBottom: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primaryFontColor,
  },
  lastReadingText: {
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    marginTop: 2,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primaryFontColor,
    marginBottom: 12,
  },
  timestampContainer: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondaryColor,
  },
  timestampLabel: {
    fontSize: 14,
    fontFamily: 'Manrope',
    color: '#64748B',
    marginBottom: 4,
  },
  timestampValue: {
    fontSize: 15,
    fontFamily: 'Manrope',
    color: COLORS.primaryFontColor,
  },
  readingsSubtitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primaryFontColor,
    marginBottom: 5,
  },
  readingsContainer: {
    marginBottom: 20,
  },
  readingsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap:4,
  },
  readingCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#E2E8F0',
    borderRightColor: '#E2E8F0',
    borderBottomColor: '#E2E8F0',
    marginRight: 1.5,
  },
  readingPhase: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: '#64748B',
    marginBottom: 6,
  },
  readingValue: {
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primaryFontColor,
  },
  readingUnit: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Manrope-Regular',
  },
  isLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  isLoadingText: {
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: COLORS.primaryFontColor,
    marginTop: 12,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Manrope-SemiBold',
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.secondaryColor,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryColor,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.secondaryFontColor,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: '#6B7280',
  },
  infoContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 15,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,

  },
  infoLabel: {
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
    color: '#64748B',
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primaryFontColor,
    flex: 1,
    textAlign: 'right',
  },
});

export default ConsumerDetailsBottomSheet;