import { StyleSheet, Text, View, Dimensions } from "react-native";
import React, {useState} from "react";
import { COLORS } from "../../constants/colors";
import { SkeletonLoader } from "../../utils/loadingManager";
import Button from "../global/Button";


const { width: screenWidth } = Dimensions.get('window');

const COLUMN_WIDTHS = {
  serial: 50,
  default: 1,
};

const Table = ({ 
  data = [], 
  columns = [], 
  showSerial = false, 
  showPriority = false, 
  priorityField = null,   
  priorityMapping = {}, 
  containerStyle = {}, 
  headerStyle = {}, 
  rowStyle = {}, 
  textStyle = {}, 
  statusStyle = {}, 
  onRowPress = null, 
  loading = false, 
  emptyMessage = "No data available", 
  inlinePriority = false, 
  skeletonLines = 4,
  minTableWidth,
}) => {

  const [currentPage, setCurrentPage] = useState(1); 
  const rowsPerPage = 5; 
  const totalPages = Math.ceil(data.length / rowsPerPage); 

  const paginatedData = data.slice(
      (currentPage - 1) * rowsPerPage,
      currentPage * rowsPerPage
    );

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

  const getDefaultColumns = () => {
    if (data.length > 0) {
      const firstItem = data[0];
      const keys = Object.keys(firstItem);
      return keys.map((key) => ({
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

  const getPriorityLevel = (value) => {
    if (!showPriority || !priorityField || !priorityMapping) return null;
    return priorityMapping[value] || null;
  };

  const handleRowPress = (item) => {
    if (onRowPress) {
      onRowPress(item);
    }
  };

  const getColumnAlignmentStyles = (align = "left") => {
    switch (align) {
      case "center":
        return { alignItems: "center", justifyContent: "center" };
      case "right":
        return { alignItems: "flex-end", justifyContent: "center" };
      default:
        return { alignItems: "flex-start", justifyContent: "center" };
    }
  };

  const getTextAlignmentStyle = (align = "left") => {
    switch (align) {
      case "center":
        return { textAlign: "center" };
      case "right":
        return { textAlign: "right" };
      default:
        return { textAlign: "left" };
    }
  };

  const getColumnWrapperStyle = (column, isLastColumn = false) => {
    const dimensionStyle = column.width
      ? { width: column.width, flex: undefined }
      : { flex: column.flex || COLUMN_WIDTHS.default };

    return [
      styles.columnContainer,
      dimensionStyle,
      isLastColumn ? styles.lastColumn : null,
      getColumnAlignmentStyles(column.align),
      column.containerStyle,
    ];
  };

  return (
    <View style={[
      styles.container, 
      minTableWidth ? { minWidth: minTableWidth } : null, 
      containerStyle
    ]}>
      {/* Header Row */}
      <View style={[styles.headerRow, headerStyle]}>
        {showSerial && (
          <View style={[styles.columnContainer, styles.serialColumn]}>
            <Text style={styles.headerText}>S.No</Text>
          </View>
        )}
        {tableColumns.map((column, index) => {
          const isLastColumn = index === tableColumns.length - 1;
          return (
            <View 
              key={column.key} 
              style={getColumnWrapperStyle(column, isLastColumn)}
            >
              <Text 
                style={[
                  styles.headerText, 
                  styles.headerTextResponsive,
                  getTextAlignmentStyle(column.align)
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {column.title}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Body: SkeletonLoader when loading, else data rows */}
      {loading ? (
        <SkeletonLoader
          variant="table"
          lines={skeletonLines}
          columns={tableColumns.length + (showSerial ? 1 : 0)}
        />
      ) : data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : (

          paginatedData.map((item, index) => (
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
                <Text style={[styles.dataText, styles.serialText, textStyle]}>
                  {(currentPage - 1) * rowsPerPage + index + 1}
                </Text>
              </View>
            )}
             {tableColumns.map((column, colIndex) => {
               const value = item[column.key];
               const isPriorityField = priorityField === column.key;
               const priorityLevel = getPriorityLevel(value);
               const hasPriority = isPriorityField && priorityLevel;
               const isLastColumn = colIndex === tableColumns.length - 1;
               
               return (
                 <View 
                   key={column.key} 
                   style={[
                     ...getColumnWrapperStyle(column, isLastColumn),
                     { paddingRight: isLastColumn ? 0 : 6 },
                     hasPriority && styles.priorityCell,
                   ]}
                 >
                   {column.render ? (
                     // Custom render function for action columns (like View button)
                     column.render(item)
                   ) : isPriorityField && hasPriority ? (
                     inlinePriority ? (
                       <View style={styles.inlinePriorityWrapper}>
                         <Text style={[styles.dataText, styles.multiLineText, textStyle]}>
                           {value}
                         </Text>
                         <PriorityTag priority={priorityLevel} />
                       </View>
                     ) : (
                       <>
                        <Text style={[
                          styles.dataText, 
                          styles.multiLineText, 
                          textStyle,
                          getTextAlignmentStyle(column.align)
                        ]}>
                           {value}
                         </Text>
                         <PriorityTag priority={priorityLevel} />
                       </>
                     )
                   ) : (
                    <Text style={[
                      styles.dataText, 
                      styles.multiLineText, 
                      textStyle,
                      getTextAlignmentStyle(column.align)
                    ]}>
                       {value}
                     </Text>
                   )}
                 </View>
               );
             })}
          </View>
        ))
      )}
      {data.length > rowsPerPage && (
        <View style={styles.paginationContainer}>
            <Button 
              title="Previous"
              variant="primary"
              size="small"
              disabled={currentPage===1}
              style={[styles.paginationButton, currentPage === 1 && styles.disabledButton]}
              onPress={() => currentPage > 1 && setCurrentPage(prev => prev - 1)}
            />

          <Text style={styles.paginationText}>
            Page {currentPage} of {totalPages}
          </Text>

            <Button 
              title="Next"
              variant="primary"
              size="small"
              disabled={currentPage===totalPages}
              style={[styles.paginationButton, currentPage===totalPages && styles.disabledButton]}
              onPress={() => currentPage < totalPages && setCurrentPage(prev => prev + 1)}
            />

            {/* <Text 
              style={[
                styles.paginationButton,
                currentPage === totalPages && styles.disabledButton
              ]}
              onPress={() => currentPage < totalPages && setCurrentPage(prev => prev + 1)}
            >
              Next
            </Text> */}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerRow: {
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 5,
    flexDirection: "row",
    paddingHorizontal: 12,
    alignItems: "center",
    minHeight: 42,
    justifyContent: "center",
    paddingVertical: 10,
  },
  columnContainer: {
    paddingRight: 8,
  },
  lastColumn: {
    paddingRight: 0,
  },
  headerText: {
    color: COLORS.secondaryFontColor,
    fontFamily: "Manrope-Medium",
    fontSize: 12,
    textAlign: "left",
    fontWeight: "600",
    // flex: 1,
  },
  headerTextResponsive: {
    fontSize: screenWidth < 400 ? 11 : 13,
    flexShrink: 1,
    numberOfLines: 1,
  },
  dataRow: {
    backgroundColor: "#F8F9FA",
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 2,
    minHeight: 48,
  },
  pressableRow: {
    // Optional styling for pressable rows
  },
  dataText: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Medium",
    fontSize: 10,
    textAlign: "left",
    lineHeight: 14,
  },
  multiLineText: {
    flexWrap: 'wrap',
    flexShrink: 1,
  },
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
  serialColumn: {
    width: 45,
    flex: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 6,
  },
  serialText: {
    textAlign: "center",
    fontWeight: "600",
  },
  inlinePriorityWrapper: {
    flexDirection: "row",
    alignItems: 'center',
  },
  priorityTag: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    position: "absolute",
    right: 30,
    top: 15,
  },
  priorityTagText: {
    fontFamily: "Manrope-Bold",
    fontSize: 10,
    textAlign: "center",
  },
  priorityTagHigh: {
    backgroundColor: "#ff9c9c",
  },
  priorityTagTextHigh: {
    color: "#FFFFFF",
  },
  priorityTagMedium: {
    backgroundColor: "#FF8C00",
  },
  priorityTagTextMedium: {
    color: "#FFFFFF",
  },
  priorityTagLow: {
    backgroundColor: "#28A745",
  },
  priorityTagTextLow: {
    color: "#FFFFFF",
  },
  priorityCell: {
    // Optional styling for priority cells
  },
  priorityText: {
    fontFamily: "Manrope-Medium",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Medium",
    fontSize: 14,
  },
  emptyContainer: {
    backgroundColor: "#F8F9FA",
    height: 300,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
    marginTop: 2,
  },
  emptyText: {
    color: COLORS.color_text_secondary,
    fontFamily: "Manrope-Regular",
    fontSize: 14,
    textAlign: "center",
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  paginationButton: {
    minWidth: 120,
    flex: 0.35,
    marginHorizontal: 20,
    fontFamily: "Manrope-Medium",
    fontSize: 10,
    backgroundColor: COLORS.secondaryColor,
  },
paginationText: {
  fontFamily: "Manrope-Regular",
  fontSize: 10,
  color: COLORS.primaryFontColor,
},
disabledButton: {
  backgroundColor: "#e8eaed",
  color:"#808080"
},

});

export default Table;
