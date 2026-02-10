import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/colors";
import { useTheme } from "../context/ThemeContext";
import Table from "../components/global/Table";
import Menu from "../../assets/icons/bars.svg";
import MenuWhite from "../../assets/icons/menuBarWhite.svg";
import Notification from "../../assets/icons/notification.svg";
import NotificationWhite from "../../assets/icons/NotificationWhite.svg";
import BiLogo from "../../assets/icons/Logo.svg";
import DropdownIcon from "../../assets/icons/dropDown.svg";
import { API_ENDPOINTS } from "../constants/constants";
import { getUser } from "../utils/storage";
import { authService } from "../services/authService";
import { SkeletonLoader } from '../utils/loadingManager';
import { isDemoUser, getDemoLsDataForDate } from "../constants/demoData";

// Pagination is handled by Table component (5 rows per page)

const ConsumerDataTable = ({ navigation, route }) => {
  const { isDark, colors: themeColors } = useTheme();
  const { date, meterId, viewType: initialViewType, barData, consumerData } = route?.params || {};
  const [lsData, setLsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [meterSerialNumber, setMeterSerialNumber] = useState(null);
  
  // Dropdown states for table columns
  const [energyType, setEnergyType] = useState("kva"); // "kva" or "kw"
  const [measurementType, setMeasurementType] = useState("voltage"); // "voltage" or "current"

  // Fetch LS data from API (or demo data for demo users)
  const fetchLSData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get logged-in user data to extract meterId
      const user = await getUser();
      if (!user) {
        throw new Error('User not found. Please login again.');
      }

      // Get meter serial number (priority: consumerData > route params > user data)
      const serialNumber = consumerData?.meterSerialNumber || 
                          user?.meterSerialNumber || 
                          meterId || 
                          null;
      setMeterSerialNumber(serialNumber);

      // Priority: route params > user data from login
      let finalMeterId = meterId || user?.meterId || user?.meterSerialNumber || null;
      
      // Convert to string if it's a number (API expects string)
      if (finalMeterId) {
        finalMeterId = String(finalMeterId).trim();
      }

      // Validate date format (should be YYYY-MM-DD)
      let formattedDate = date;
      if (date) {
        // Ensure date is in YYYY-MM-DD format
        const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!dateMatch) {
          // Try to parse and reformat if not in correct format
          const parsedDate = new Date(date);
          if (!isNaN(parsedDate.getTime())) {
            const year = parsedDate.getFullYear();
            const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const day = String(parsedDate.getDate()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}`;
          }
        }
      }

      if (!formattedDate || !finalMeterId) {
        console.error('❌ Missing date or meterId');
        console.log('   Date:', date, '-> Formatted:', formattedDate);
        console.log('   MeterId from route:', meterId);
        console.log('   MeterId from user:', user?.meterId);
        console.log('   Final MeterId:', finalMeterId);
        setError('Missing required parameters. Date or Meter ID not found.');
        setIsLoading(false);
        return;
      }

      console.log('🔄 Fetching LS data...');
      console.log('   Date:', formattedDate);
      console.log('   Meter ID:', finalMeterId);
      console.log('   User identifier:', user?.identifier);

      // DEMO MODE: use locally generated LS data instead of API
      if (isDemoUser(user.identifier)) {
        const demo = getDemoLsDataForDate(user.identifier, formattedDate, finalMeterId);
        setLsData(demo.data);
        setMetadata(demo.metadata);
        setIsLoading(false);
        return;
      }

      // Get access token (will auto-refresh if expired)
      const token = await authService.getValidAccessToken();
      if (!token) {
        throw new Error('No access token available. Please login again.');
      }

      console.log('   Bearer Token:', token ? `${token.substring(0, 20)}...` : 'NOT FOUND');

      // Build API URL with formatted date and meterId
      const apiUrl = API_ENDPOINTS.lsdata.consumption(formattedDate, formattedDate, finalMeterId);
      console.log('   API URL:', apiUrl);

      // Make API request with Bearer token
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`, // Bearer token from logged-in user
        },
      });

      console.log('   Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ LS Data received:', {
        success: result.success,
        totalRecords: result.metadata?.totalRecords,
        dataInterval: result.metadata?.dataInterval,
        meterId: result.metadata?.meterId
      });

      if (result.success && result.data && Array.isArray(result.data)) {
        setLsData(result.data);
        setMetadata(result.metadata);
        
        console.log('✅ LS Data loaded successfully');
        console.log('   Total records:', result.data.length);
        console.log('   Meter ID:', result.metadata?.meterId);
        console.log('   Data interval:', result.metadata?.dataInterval);
      } else {
        throw new Error('Invalid response format or no data received');
      }
    } catch (error) {
      console.error('❌ Error fetching LS data:', error);
      console.error('   Error details:', error.message);
      setError(error.message || 'Failed to load data');
      setLsData([]);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  }, [date, meterId]);

  // Fetch data on mount
  useEffect(() => {
    fetchLSData();
  }, [fetchLSData]);

  // Pagination is now handled by Table component

  // Compact Header Dropdown Component
  const HeaderDropdown = ({ value, options, onSelect, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (option) => {
      onSelect(option);
      setIsOpen(false);
    };

    const getDisplayValue = (val) => {
      if (!val) return placeholder;
      // Capitalize first letter
      return val.charAt(0).toUpperCase() + val.slice(1);
    };

    return (
      <View style={styles.headerDropdownWrapper}>
        <TouchableOpacity
          style={styles.headerDropdownButton}
          onPress={() => setIsOpen(!isOpen)}
          activeOpacity={0.7}
        >
          <Text style={styles.headerDropdownText} numberOfLines={1}>
            {getDisplayValue(value) || placeholder}
          </Text>
          <DropdownIcon width={12} height={12} fill={COLORS.secondaryFontColor} />
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.headerDropdownList}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.headerDropdownItem,
                  value === option && styles.headerDropdownItemSelected
                ]}
                onPress={() => handleSelect(option)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.headerDropdownItemText,
                  value === option && styles.headerDropdownItemTextSelected
                ]}>
                  {getDisplayValue(option)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Format timestamp for display - compact format (without seconds)
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      // Parse timestamp like "21st Nov 2025 12:15:00 AM"
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        // If parsing fails, try to remove seconds from string format
        if (typeof timestamp === 'string') {
          return timestamp.replace(/(\d{1,2}:\d{2}):\d{2}/g, '$1');
        }
        return timestamp; // Return as-is if can't parse
      }
      // Compact format: "DD MMM HH:MM AM/PM" (no seconds)
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      // Fallback: try to remove seconds from string
      if (typeof timestamp === 'string') {
        return timestamp.replace(/(\d{1,2}:\d{2}):\d{2}/g, '$1');
      }
      return timestamp;
    }
  };

  // Format voltage/current values
  const formatValue = (value, unit = '') => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      return `${value.toFixed(2)}${unit ? ` ${unit}` : ''}`;
    }
    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  // Format voltage (API may return in centivolts, divide by 100 if > 1000)
  const formatVoltage = (voltageValue) => {
    if (voltageValue === null || voltageValue === undefined) return 'N/A';
    let volts = typeof voltageValue === 'number' ? voltageValue : parseFloat(voltageValue);
    // If value is > 1000, assume it's in centivolts, divide by 100
    if (volts > 1000) {
      volts = volts / 100;
    }
    return formatValue(volts, 'V');
  };

  // Format current (already in Amperes)
  const formatCurrent = (currentValue) => {
    if (currentValue === null || currentValue === undefined) return 'N/A';
    return formatValue(currentValue, 'A');
  };

  // Get average voltage/current for display
  const getAverageVoltage = (voltage) => {
    if (!voltage || typeof voltage !== 'object') return 0;
    const r = voltage.r || 0;
    const y = voltage.y || 0;
    const b = voltage.b || 0;
    return (r + y + b) / 3;
  };

  const getAverageCurrent = (current) => {
    if (!current || typeof current !== 'object') return 0;
    const r = current.r || 0;
    const y = current.y || 0;
    const b = current.b || 0;
    return (r + y + b) / 3;
  };

  // Transform LS data to table format based on dropdown selections
  const getTableData = () => {
    return lsData.map((item, index) => {
      let energyValue = 'N/A';
      let measurementValue = 'N/A';

      // Get energy value (kva or kw)
      if (energyType === 'kva') {
        energyValue = formatValue(item.energies?.kvaImport || 0, '');
      } else if (energyType === 'kw') {
        energyValue = formatValue(item.energies?.kwImport || 0, '');
      }

      // Get measurement value (voltage or current)
      if (measurementType === 'voltage') {
        const avgVoltage = getAverageVoltage(item.voltage);
        measurementValue = formatVoltage(avgVoltage);
      } else if (measurementType === 'current') {
        const avgCurrent = getAverageCurrent(item.current);
        measurementValue = formatCurrent(avgCurrent);
      }

      return {
        id: index + 1,
        timestamp: formatTimestamp(item.timestamp),
        energy: energyValue,
        measurement: measurementValue,
        raw: item
      };
    });
  };

  // Pagination is handled by Table component

  return (
    <View style={[styles.container, isDark && { backgroundColor: themeColors.screen }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={[styles.bluecontainer, isDark && { backgroundColor: themeColors.screen }]}>
        <View style={styles.TopMenu}>
          <Pressable
            style={[styles.barsIcon, isDark && { backgroundColor: '#1A1F2E' }]}
            onPress={() => navigation.navigate("SideMenu")}
          >
            {isDark ? (
              <MenuWhite width={18} height={18} />
            ) : (
              <Menu width={18} height={18} fill="#202d59" />
            )}
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Dashboard")}>
            <BiLogo width={45} height={45} />
          </Pressable>
          <Pressable
            style={[styles.bellIcon, isDark && { backgroundColor: '#1A1F2E' }]}
            onPress={() => navigation.navigate("Profile")}
          >
            {isDark ? (
              <NotificationWhite width={18} height={18} />
            ) : (
              <Notification width={18} height={18} fill="#202d59" />
            )}
          </Pressable>
        </View>
      </View>

      {/* Header Info */}
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>LS Data</Text>
        <View style={styles.metadataContainer}>
          {/* Row 1: Date (left) | Meter SL NO (right, green) */}
          <View style={styles.metadataRow}>
            <View style={styles.metadataLeft}>
              {date && (
                <Text style={styles.metadataText}>
                  Date: {(() => {
                    try {
                      // Parse YYYY-MM-DD format
                      const dateParts = date.split('-');
                      if (dateParts.length === 3) {
                        const year = parseInt(dateParts[0]);
                        const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
                        const day = parseInt(dateParts[2]);
                        const dateObj = new Date(year, month, day);
                        return dateObj.toLocaleDateString('en-IN', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        });
                      }
                      // Fallback to direct parsing
                      return new Date(date).toLocaleDateString('en-IN', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                      });
                    } catch (e) {
                      return date; // Return as-is if parsing fails
                    }
                  })()}
                </Text>
              )}
            </View>
              <View style={styles.metadataRight}>
                <Text style={styles.meterSerialText}>
                  Meter SL No: {meterSerialNumber || consumerData?.meterSerialNumber || metadata?.meterSerialNumber || meterId || 'N/A'}
                </Text>
              </View>
          </View>

          {/* Row 2: Total Records (left) | Intervals (right) */}
          {metadata && (
            <View style={styles.metadataRow}>
              <View style={styles.metadataLeft}>
                <Text style={styles.metadataText}>
                  Total Records: {metadata.totalRecords || 0}
                </Text>
              </View>
              <View style={styles.metadataRight}>
                <Text style={styles.metadataText}>
                  Intervals: {metadata.dataInterval ? (() => {
                    // Extract number from "15min" or similar formats
                    const intervalValue = String(metadata.dataInterval).replace(/[^0-9]/g, '');
                    return intervalValue ? `${intervalValue} Minutes` : 'N/A';
                  })() : 'N/A'}
                </Text>
              </View>
            </View>
          )}
          
          {!metadata && date && (
            <Text style={styles.metadataText}>
              Loading data for selected date...
            </Text>
          )}
        </View>
      </View>

      {/* Table Section */}
      <View style={styles.tableSection}>
        {isLoading ? (
          <SkeletonLoader variant="table" style={{ marginVertical: 20 }} lines={10} columns={3} />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchLSData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : lsData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No LS data available for the selected date</Text>
          </View>
        ) : (
            <Table
              data={getTableData()}
              loading={false}
              emptyMessage="No LS data available"
              showSerial={true}
              showPriority={false}
              containerStyle={styles.table}
              rowsPerPage={10}
              columns={[
                { 
                  key: 'timestamp', 
                  title: 'Timestamp', 
                  flex: 2,
                  align: 'left'
                },
                { 
                  key: 'energy', 
                  title: energyType === 'kva' ? 'kva' : 'kw',
                  flex: 1.5,
                  align: 'right',
                  headerRender: () => (
                    <HeaderDropdown
                      value={energyType}
                      options={['kva', 'kw']}
                      onSelect={setEnergyType}
                      placeholder="kva/kw"
                    />
                  )
                },
                { 
                  key: 'measurement', 
                  title: measurementType === 'voltage' ? 'Voltage' : 'Current',
                  flex: 1.5,
                  align: 'right',
                  headerRender: () => (
                    <HeaderDropdown
                      value={measurementType}
                      options={['voltage', 'current']}
                      onSelect={setMeasurementType}
                      placeholder="voltage/current"
                    />
                  )
                }
              ]}
            />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondaryFontColor,
  },
  bluecontainer: {
    backgroundColor: "#eef8f0",
    padding: 15,
  },
  TopMenu: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 15,
  },
  barsIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  bellIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  headerInfo: {
    padding: 20,
    backgroundColor: COLORS.secondaryFontColor,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primaryFontColor,
    marginBottom: 10,
  },
  metadataContainer: {
    marginTop: 5,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  metadataLeft: {
    flex: 1,
  },
  metadataRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  metadataText: {
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    color: COLORS.primaryFontColor,
    opacity: 0.7,
  },
  meterSerialText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.secondaryColor,
    opacity: 1,
  },
  tableSection: {
    flex: 1,
  },
  table: {
    flex: 1,
    paddingHorizontal: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Manrope-SemiBold',
    color: '#EF4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primaryColor,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.secondaryFontColor,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Manrope-Regular',
    color: COLORS.primaryFontColor,
    opacity: 0.7,
    textAlign: 'center',
  },
  headerDropdownWrapper: {
    position: 'relative',
    width: '100%',
    zIndex: 10,
  },
  headerDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    minHeight: 26,
    gap: 4,
  },
  headerDropdownText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.secondaryFontColor,
    flex: 1,
  },
  headerDropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.secondaryFontColor,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    marginTop: 4,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 120,
  },
  headerDropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerDropdownItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  headerDropdownItemText: {
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    color: COLORS.primaryFontColor,
  },
  headerDropdownItemTextSelected: {
    color: COLORS.primaryColor,
    fontFamily: 'Manrope-SemiBold',
  },
});

export default ConsumerDataTable;

