/**
 * ConsumerDetailsBottomSheet Component
 * 
 * Simple bottom sheet using React Native Modal and Animated
 * Displays consumer information and instantaneous meter readings
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { GLOBAL_API_URL } from '../constants/constants';
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
      const API_URL = `http://${GLOBAL_API_URL}:4256/api/consumers/${consumerUid}`;
      
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

    } catch (error) {
      console.error('❌ Error fetching consumer details:', error);
      setError(error.message);
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
    }
  }, [consumerUid, visible, fetchConsumerData]);

  // Handle visibility changes
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

  // Handle close
  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [slideAnim, onClose]);

  // Format date/time
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

  // Format voltage/current values
  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return typeof value === 'number' ? value.toFixed(2) : value;
  };

  // Render instantaneous readings section
  const renderInstantaneousReadings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Instantaneous Meter Readings</Text>
      
      {/* Voltage Readings */}
      <View style={styles.readingsContainer}>
        <Text style={styles.readingsSubtitle}>Voltage Readings</Text>
        <View style={styles.readingsGrid}>
          <ReadingCard 
            phase="R-Phase" 
            value={formatValue(consumerData?.rPhaseVoltage) || 0} 
            unit="V" 
            color="#FF6B6B"
            loading={isLoading}
          />
          <ReadingCard 
            phase="Y-Phase" 
            value={formatValue(consumerData?.yPhaseVoltage) || 0} 
            unit="V" 
            color="#4ECDC4"
            loading={isLoading}
          />
          <ReadingCard 
            phase="B-Phase" 
            value={formatValue(consumerData?.bPhaseVoltage) || 0} 
            unit="V" 
            color="#45B7D1"
            loading={isLoading}
          />
        </View>
      </View>

      {/* Current Readings */}
      <View style={styles.readingsContainer}>
        <Text style={styles.readingsSubtitle}>Current Readings</Text>
        <View style={styles.readingsGrid}>
          <ReadingCard 
            phase="R-Phase" 
            value={formatValue(consumerData?.rPhaseCurrent)} 
            unit="A" 
            color="#FF6B6B"
            loading={isLoading}
          />
          <ReadingCard 
            phase="Y-Phase" 
            value={formatValue(consumerData?.yPhaseCurrent)} 
            unit="A" 
            color="#4ECDC4"
            loading={isLoading}
          />
          <ReadingCard 
            phase="B-Phase" 
            value={formatValue(consumerData?.bPhaseCurrent)} 
            unit="A" 
            color="#45B7D1"
            loading={isLoading}
          />
        </View>
      </View>
    </View>
  );

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
            <Text style={styles.headerTitle}>Consumer Details</Text>
            <TouchableOpacity onPress={handleClose}>
              <CloseIcon width={18} height={18} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instantaneous Meter Readings</Text>

              <Text style={styles.readingsSubtitle}>Voltage Readings</Text>
              <View style={styles.readingsGrid}>
                <ReadingCard loading={true} color="#FF6B6B" />
                <ReadingCard loading={true} color="#4ECDC4" />
                <ReadingCard loading={true} color="#45B7D1" />
              </View>

              <Text style={[styles.readingsSubtitle, { marginTop: 20 }]}>Current Readings</Text>
              <View style={styles.readingsGrid}>
                <ReadingCard loading={true} color="#FF6B6B" />
                <ReadingCard loading={true} color="#4ECDC4" />
                <ReadingCard loading={true} color="#45B7D1" />
              </View>
            </View>
           ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Failed to load data</Text>
                <TouchableOpacity onPress={fetchConsumerData} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : consumerData ? (
              <>
                {renderInstantaneousReadings()}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No data available</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ReadingCard component for displaying phase readings
const ReadingCard = ({ phase, value, unit, color, loading }) => (
  <View style={[styles.readingCard, { borderLeftColor: color }]}>
    {loading ? (
      <SkeletonLoader variant="card" lines={1} />
    ) : (
      <>
        <Text style={styles.readingPhase}>{phase}</Text>
        <Text style={styles.readingValue}>
          {value} <Text style={styles.readingUnit}>{unit}</Text>
        </Text>
      </>
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
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primaryFontColor,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primaryFontColor,
    marginBottom: 12,
  },
  readingsSubtitle: {
    fontSize: 16,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.primaryFontColor,
    marginBottom: 12,
  },
  readingsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  readingCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    paddingVertical: 40,
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
});

export default ConsumerDetailsBottomSheet;