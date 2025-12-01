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
import Table from "../components/global/Table";
import Menu from "../../assets/icons/bars.svg";
import Notification from "../../assets/icons/notification.svg";
import BiLogo from "../../assets/icons/Logo.svg";
import { API_ENDPOINTS } from "../constants/constants";
import { getUser } from "../utils/storage";
import { authService } from "../services/authService";
import { SkeletonLoader } from '../utils/loadingManager';

// Pagination is handled by Table component (5 rows per page)

const ConsumerDataTable = ({ navigation, route }) => {
  const { date, meterId, viewType: initialViewType, barData } = route?.params || {};
  const [lsData, setLsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);

  // Fetch LS data from API
  const fetchLSData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get logged-in user data to extract meterId
      const user = await getUser();
      if (!user) {
        throw new Error('User not found. Please login again.');
      }

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

  // Format timestamp for display - compact format
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      // Parse timestamp like "21st Nov 2025 12:15:00 AM"
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return timestamp; // Return as-is if can't parse
      }
      // Compact format: "DD MMM HH:MM AM/PM"
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timestamp;
    }
  };

  // Format voltage/current values
  const formatValue = (value, unit = '') => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      return `${value.toFixed(2)} ${unit}`.trim();
    }
    return `${value} ${unit}`.trim();
  };

  // Transform LS data to table format - only SNO, Timestamp, V-R, V-Y, V-B
  const getTableData = () => {
    // Return all data, let Table component handle pagination
    return lsData.map((item, index) => ({
      id: index + 1,
      timestamp: formatTimestamp(item.timestamp),
      voltageR: formatValue(item.voltage?.r, item.voltage?.unit),
      voltageY: formatValue(item.voltage?.y, item.voltage?.unit),
      voltageB: formatValue(item.voltage?.b, item.voltage?.unit),
      raw: item
    }));
  };

  // Pagination is handled by Table component

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.bluecontainer}>
        <View style={styles.TopMenu}>
          <Pressable
            style={styles.barsIcon}
            onPress={() => navigation.navigate("SideMenu")}
          >
            <Menu width={18} height={18} fill="#202d59" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Dashboard")}>
            <BiLogo width={45} height={45} />
          </Pressable>
          <Pressable
            style={styles.bellIcon}
            onPress={() => navigation.navigate("Profile")}
          >
            <Notification width={18} height={18} fill="#202d59" />
          </Pressable>
        </View>
      </View>

      {/* Header Info */}
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>LS Data - 15 Minute Intervals</Text>
        <View style={styles.metadataContainer}>
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
          {metadata && (
            <Text style={styles.metadataText}>
              Meter ID: {metadata.meterId} | Total Records: {metadata.totalRecords} | Interval: {metadata.dataInterval}
            </Text>
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
          <SkeletonLoader variant="table" style={{ marginVertical: 20 }} lines={10} columns={5} />
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
              columns={[
                { 
                  key: 'timestamp', 
                  title: 'Timestamp', 
                  flex: 2,
                  align: 'left'
                },
                { 
                  key: 'voltageR', 
                  title: 'V-R', 
                  flex: 1,
                  align: 'right'
                },
                { 
                  key: 'voltageY', 
                  title: 'V-Y', 
                  flex: 1,
                  align: 'right'
                },
                { 
                  key: 'voltageB', 
                  title: 'V-B', 
                  flex: 1,
                  align: 'right'
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
  metadataText: {
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    color: COLORS.primaryFontColor,
    opacity: 0.7,
    marginTop: 2,
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
});

export default ConsumerDataTable;

