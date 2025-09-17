import { StyleSheet, Text, View, Dimensions } from "react-native";
import React from "react";
import { COLORS } from "../../constants/colors";

const { width: screenWidth } = Dimensions.get('window');

const COLUMN_WIDTHS = {
  serial: 50,
  default: 1,
};


const Table = ({ 
  data = [], 
  columns = [], // Dynamic column configuration
  showSerial = false, // Show S.No column (renamed for clarity)
  showPriority = false, // Show priority tags
  priorityField = null, // Field to check for priority
  priorityMapping = {}, // Mapping of values to priority levels
  containerStyle = {},
  headerStyle = {},
  rowStyle = {},
  textStyle = {},
  statusStyle = {},
  onRowPress = null,
  loading = false,
  emptyMessage = "No data available",
  inlinePriority = false,
}) => {
  // Priority Tag Component with different levels
  const PriorityTag = ({ priority, text }) => {
    const getPriorityStyle = (priority) => {
      switch (priority?.toLowerCase()) {
        case 'high':
          return styles.priorityTagHigh;
        case 'medium':
          return styles.priorityTagMedium;
        case 'low':
          return styles.priorityTagLow;
        default:
          return styles.priorityTagHigh;
      }
    };

    const getPriorityTextStyle = (priority) => {
      switch (priority?.toLowerCase()) {
        case 'high':
          return styles.priorityTagTextHigh;
        case 'medium':
          return styles.priorityTagTextMedium;
        case 'low':
          return styles.priorityTagTextLow;
        default:
          return styles.priorityTagTextHigh;
      }
    };

    return (
      <View style={[styles.priorityTag, getPriorityStyle(priority)]}>
        <Text style={[styles.priorityTagText, getPriorityTextStyle(priority)]}>
          {text || priority}
        </Text>
      </View>
    );
  };

  // Get default columns if none provided
  const getDefaultColumns = () => {
    if (data.length > 0) {
      const firstItem = data[0];
      const keys = Object.keys(firstItem);
      
      return keys.map((key, index) => ({
        key: key,
        title: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          flex: COLUMN_WIDTHS.default,

      }));
    }
    return [
      { key: 'eventName', title: 'Event Name', flex: 1 },
      { key: 'occurredOn', title: 'Occurred On', flex: 1 },
      { key: 'status', title: 'Status', flex: 1 }
    ];
  };

  const tableColumns = columns.length > 0 ? columns : getDefaultColumns();

  // Calculate priority level for a value
  const getPriorityLevel = (value) => {
    if (!showPriority || !priorityField || !priorityMapping) return null;
    return priorityMapping[value] || null;
  };

  // Render loading state
  if (loading) {
    return (
      <View style={[styles.container, containerStyle]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Render empty state
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, containerStyle]}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      </View>
    );
  }

  // Handle row press
  const handleRowPress = (item) => {
    if (onRowPress) {
      onRowPress(item);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Header Row */}
      <View style={[styles.headerRow, headerStyle]}>
        {showSerial && (
          // <Text style={[styles.headerText, styles.serialColumn]}>S.No</Text>
          <View style={[styles.columnContainer, styles.serialColumn]}>
          <Text style={styles.headerText}>S.No</Text>
        </View>

        )}
        {tableColumns.map((column, index) => (
          <View 
            key={column.key} 
            style={[
              { flex: column.flex || 1, paddingRight: 8 },
              index === tableColumns.length - 1 && { paddingRight: 0 }
            ]}
          >
            <Text 
              style={[
                styles.headerText, 
                styles.headerTextResponsive
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {column.title}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Data Rows */}
      {data.map((item, index) => (
        <View 
          key={item.id || index} 
          style={[
            styles.dataRow, 
            rowStyle,
            onRowPress && styles.pressableRow
          ]}
          onTouchEnd={() => handleRowPress(item)}
        >
          {showSerial && (
            <View style={[styles.columnContainer, styles.serialColumn]}>
              <Text style={[styles.dataText, textStyle]}>{index + 1}</Text>
            </View>
          )}
          {tableColumns.map((column, colIndex) => {
            const value = item[column.key];
            const isPriorityField = priorityField === column.key;
            const priorityLevel = getPriorityLevel(value);
            const hasPriority = isPriorityField && priorityLevel;
            
            return (
              <View 
                key={column.key} 
                style={[
                  { flex: column.flex || 1, paddingRight: 8 },
                  colIndex === tableColumns.length - 1 && { paddingRight: 0 },
                  hasPriority && styles.priorityCell
                ]}
              >
              {isPriorityField && hasPriority ? (
                inlinePriority ? (
                  <View style={styles.inlinePriorityWrapper}>
                    <Text style={[styles.dataText, textStyle]}>{value}</Text>
                    <PriorityTag priority={priorityLevel} />
                  </View>
                ) : (
                  <>
                    <Text style={[styles.dataText, textStyle]}>{value}</Text>
                    <PriorityTag priority={priorityLevel} />
                  </>
                )
              ) : (
                <Text style={[styles.dataText, textStyle]}>{value}</Text>
              )}

              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  // Header Row Styling
  headerRow: {
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 5,
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    minHeight: 48,
  },

  columnContainer: {
  paddingRight: 8,
},

  headerText: {
    color: COLORS.secondaryFontColor,
    fontFamily: "Manrope-SemiBold",
    fontSize: 13,
    textAlign: "left",
    fontWeight: "600",
    flex: 1,
  },
  headerTextResponsive: {
    fontSize: screenWidth < 400 ? 11 : 13,
    flexShrink: 1,
    numberOfLines: 1,
  },
  // Data Row Styling
  dataRow: {
    backgroundColor: "#F8F9FA",
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 2,
    minHeight: 48,
  },
  pressableRow: {
    // Add pressable styling if needed
  },
  dataText: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Regular",
    fontSize: 12,
    textAlign: "left",
    lineHeight: 16,
    flex: 1,
    marginRight:4,
  },

  // Status Text Styling
  statusText: {
    fontFamily: "Manrope-Medium",
    fontSize: 12,
    textAlign: "left",
  },
  statusActive: {
    color: COLORS.secondaryColor,
    fontFamily: "Manrope-Medium",
    fontWeight: "600",
  },
  statusInactive: {
    color: COLORS.primaryFontColor,
    fontWeight: "400",
  },
  // Serial Number Column
  serialColumn: {
    width: 50,
    textAlign: 'center',
    flex: 0,
  },
  // Priority Tag Base Styles

    inlinePriorityWrapper: {
    flexDirection: "row",
    // alignItems: "center",
    // backgroundColor:"red",
    height:23
  },

  priorityTag: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    // marginTop: 4,
    // alignSelf: 'flex-start',
    position:"absolute",
    right:30,
    top:15
  },
  priorityTagText: {
    fontFamily: "Manrope-Bold",
    fontSize: 10,
    textAlign: 'center',
  },
  // High Priority (Red)
  priorityTagHigh: {
    backgroundColor: '#ff9c9c',
  },
  priorityTagTextHigh: {
    color: '#FFFFFF',
  },
  // Medium Priority (Orange)
  priorityTagMedium: {
    backgroundColor: '#FF8C00',
  },
  priorityTagTextMedium: {
    color: '#FFFFFF',
  },
  // Low Priority (Green)
  priorityTagLow: {
    backgroundColor: '#28A745',
  },
  priorityTagTextLow: {
    color: '#FFFFFF',
  },
  priorityCell: {
    // backgroundColor: '#FFF5F5',
  },
  priorityText: {
    // color: '#FF4444',
    fontFamily: "Manrope-Medium",
  },
  // Loading and Empty States
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Medium",
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.color_text_secondary,
    fontFamily: "Manrope-Regular",
    fontSize: 14,
    textAlign: 'center',
  },
});

export default Table;
