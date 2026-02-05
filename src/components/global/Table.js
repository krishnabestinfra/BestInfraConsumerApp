import { StyleSheet, Text, View, Dimensions } from "react-native";
import React, { useState } from "react";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonLoader } from "../../utils/loadingManager";
import Button from "../global/Button";
import NoDataIcon from "../../../assets/icons/empty.svg";


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
  rowsPerPage = 5,
}) => {
  const { isDark, colors: themeColors } = useTheme();
  const [currentPage, setCurrentPage] = useState(1); 
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

  const headerRowStyle = isDark ? [styles.headerRow, { backgroundColor: themeColors.accent }] : styles.headerRow;
  const headerTextStyle = isDark ? [styles.headerText, { color: themeColors.textOnPrimary }] : styles.headerText;
  const dataRowStyle = isDark
    ? [styles.dataRow, { backgroundColor: '#1A1F2E' }]
    : styles.dataRow;
  const dataTextStyle = isDark ? [styles.dataText, { color: themeColors.textPrimary }] : styles.dataText;
  const emptyContainerStyle = isDark ? [styles.emptyContainer, { backgroundColor: themeColors.card }] : styles.emptyContainer;
  const emptyIconWrapperStyle = isDark ? [styles.emptyIconWrapper, { backgroundColor: themeColors.card }] : styles.emptyIconWrapper;
  const emptyTitleStyle = isDark ? [styles.emptyTitle, { color: themeColors.textPrimary }] : styles.emptyTitle;
  const emptySubtitleStyle = isDark ? [styles.emptySubtitle, { color: themeColors.textSecondary }] : styles.emptySubtitle;
  const paginationTextStyle = isDark ? [styles.paginationText, { color: themeColors.textPrimary }] : styles.paginationText;

  return (
    <View style={[
      styles.container,
      isDark && { backgroundColor: 'transparent' },
      minTableWidth ? { minWidth: minTableWidth } : null,
      containerStyle
    ]}>
      {/* Header Row */}
      <View style={[headerRowStyle, headerStyle]}>
        {showSerial && (
          <View style={[styles.columnContainer, styles.serialColumn]}>
            <Text style={headerTextStyle}>S.No</Text>
          </View>
        )}
        {tableColumns.map((column, index) => {
          const isLastColumn = index === tableColumns.length - 1;
          return (
            <View 
              key={column.key} 
              style={getColumnWrapperStyle(column, isLastColumn)}
            >
              {column.headerRender ? (
                column.headerRender()
              ) : (
                <Text 
                  style={[
                    headerTextStyle, 
                    styles.headerTextResponsive,
                    getTextAlignmentStyle(column.align)
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {column.title}
                </Text>
              )}
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
        <View style={emptyContainerStyle}>
          <View style={emptyIconWrapperStyle}>
            <NoDataIcon width={28} height={28} fill={isDark ? themeColors.textSecondary : undefined} />
          </View>
          <Text style={emptyTitleStyle}>
            {emptyMessage || "No Data Available"}
          </Text>
          <Text style={emptySubtitleStyle}>
            There are no records available for the
          </Text>
          <Text style={emptySubtitleStyle}>
           selected date and meter. Data may not
          </Text>
          <Text style={emptySubtitleStyle}>
           have been synced yet.
          </Text>
        </View>
      ) : (

          paginatedData.map((item, index) => (
          <View 
            key={item.id || index} 
            style={[
              dataRowStyle,
              rowStyle,
              onRowPress && styles.pressableRow
            ]}
            onTouchEnd={() => handleRowPress(item)}
          >
            {showSerial && (
              <View style={[styles.columnContainer, styles.serialColumn]}>
                <Text style={[dataTextStyle, styles.serialText, textStyle]}>
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
                   style={getColumnWrapperStyle(column, isLastColumn)}
                 >
                   {column.render ? (
                     column.render(item)
                   ) : isPriorityField && hasPriority ? (
                     inlinePriority ? (
                       <View style={styles.inlinePriorityWrapper}>
                         <Text 
                           style={[dataTextStyle, styles.multiLineText, textStyle]}
                           numberOfLines={3}
                         >
                           {value}
                         </Text>
                         <PriorityTag priority={priorityLevel} />
                       </View>
                     ) : (
                       <>
                        <Text 
                          style={[
                            dataTextStyle, 
                            styles.multiLineText, 
                            textStyle,
                            getTextAlignmentStyle(column.align)
                          ]}
                          numberOfLines={3}
                        >
                           {value}
                         </Text>
                         <PriorityTag priority={priorityLevel} />
                       </>
                     )
                   ) : (
                    <Text 
                      style={[
                        dataTextStyle, 
                        styles.multiLineText, 
                        textStyle,
                        getTextAlignmentStyle(column.align)
                      ]}
                      numberOfLines={3}
                    >
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

          <Text style={paginationTextStyle}>
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
    minHeight: 40,
    paddingVertical: 8,
  },
  columnContainer: {
    paddingLeft: 0,
    paddingRight: 12,
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 2,
    minHeight: 40,
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
    paddingRight: 12,
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
    backgroundColor: "#ffffff",
    height: 300,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
    marginTop: 2,
  },
  emptyIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    elevation: 2,
    zIndex: 2,

  },
  emptyTitle: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Bold",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 6,
  },
  emptySubtitle: {
    color: COLORS.color_text_secondary,
    fontFamily: "Manrope-Regular",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 24,
    color: "#6E6E6E",
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
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
