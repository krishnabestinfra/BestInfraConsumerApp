import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/AntDesign';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import CalendarIcon from '../../../assets/icons/calendarBrand.svg';
import CrossIcon from '../../../assets/icons/cross.svg';

const DatePicker = ({
  placeholder = "Select Date",
  value,
  onChange,
  style,
  containerStyle,
  textStyle,
  iconColor = COLORS.secondaryColor,
  iconSize = 20,
  disabled = false,
  minimumDate,
  maximumDate,
  dateFormat = 'dd/mm/yyyy', // 'dd/mm/yyyy' or 'dd-mm-yyyy'
  mode = 'date', // 'date' = full date (day+month+year), 'month' = year+month only
}) => {
  const { getScaledFontSize } = useTheme();
  const s14 = getScaledFontSize(14);
  const s18 = getScaledFontSize(18);
  const s16 = getScaledFontSize(16);
  const s12 = getScaledFontSize(12);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value || new Date());
  const isMonthMode = mode === 'month';

  const formatDate = (date) => {
    if (!date) return '';
    if (isMonthMode) {
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${month}-${year}`;
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const separator = dateFormat.includes('-') ? '-' : '/';
    return `${day}${separator}${month}${separator}${year}`;
  };

  const handlePress = () => {
    if (!disabled) {
      setShowPicker(true);
    }
  };

  const handleDateSelect = (day, month, year) => {
    const newDate = isMonthMode
      ? new Date(year, month - 1, 1)
      : new Date(year, month - 1, day);
    setSelectedDate(newDate);
    if (onChange) {
      onChange(newDate);
    }
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
  };

  const generateDays = (year, month) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [];
  const baseYear = new Date().getFullYear();
  for (let year = baseYear - 10; year <= baseYear + 10; year++) {
    years.push(year);
  }

  const currentDate = selectedDate || new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        style={[styles.inputContainer, style]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.text,
          { fontSize: s14 },
          textStyle,
          !value && styles.placeholderText,
          disabled && styles.disabledText
        ]}>
          {value ? formatDate(value) : placeholder}
        </Text>
        
        <View style={styles.iconContainer}>
          {/* <Icon
            name="calendar"
            size={iconSize}
            color={disabled ? COLORS.color_text_secondary : iconColor}
          /> */}
          <CalendarIcon width={18} height={18} fill={disabled ? COLORS.color_text_secondary : iconColor} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: s18 }]}>
                {isMonthMode ? 'Select Year & Month' : 'Select Date'}
              </Text>
              <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                <CrossIcon width={18} height={18} fill={COLORS.primaryFontColor} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.pickerContainer}
              contentContainerStyle={styles.pickerContent}
            >
              {/* Year Picker */}
              <View style={styles.pickerSection}>
                <Text style={[styles.pickerLabel, { fontSize: s16 }]}>Year</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.yearContainer}>
                    {years.map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.yearButton,
                          year === currentYear && styles.selectedButton
                        ]}
                        onPress={() => setSelectedDate(new Date(year, currentMonth - 1, isMonthMode ? 1 : currentDay))}
                      >
                        <Text style={[
                          styles.yearText,
                          { fontSize: s14 },
                          year === currentYear && styles.selectedText
                        ]}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Month Picker */}
              <View style={[styles.pickerSection, !isMonthMode && styles.pickerSectionSpaced]}>
                <Text style={[styles.pickerLabel, { fontSize: s16 }]}>Month</Text>
                <View style={styles.monthGrid}>
                  {months.map((month, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.monthButton,
                        (index + 1) === currentMonth && styles.selectedButton
                      ]}
                      onPress={() => setSelectedDate(new Date(currentYear, index, isMonthMode ? 1 : currentDay))}
                    >
                      <Text style={[
                        styles.monthText,
                        { fontSize: s12 },
                        (index + 1) === currentMonth && styles.selectedText
                      ]}>
                        {month.substring(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Day Picker - hidden in month mode */}
              {!isMonthMode && (
                <View style={[styles.pickerSection, styles.daySection]}>
                  <Text style={[styles.pickerLabel, { fontSize: s16 }]}>Day</Text>
                  <View style={styles.dayGrid}>
                    {generateDays(currentYear, currentMonth).map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayButton,
                          day === currentDay && styles.selectedButton
                        ]}
                        onPress={() => setSelectedDate(new Date(currentYear, currentMonth - 1, day))}
                      >
                        <Text style={[
                          styles.dayText,
                          { fontSize: s14 },
                          day === currentDay && styles.selectedText
                        ]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={[styles.cancelButtonText, { fontSize: s14 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButton} 
                onPress={() => handleDateSelect(isMonthMode ? 1 : currentDay, currentMonth, currentYear)}
              >
                <Text style={[styles.confirmButtonText, { fontSize: s14 }]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: COLORS.primaryFontColor,
  },
  placeholderText: {
    color: COLORS.color_text_secondary,
  },
  disabledText: {
    color: COLORS.color_text_secondary,
  },
  iconContainer: {
    // marginLeft: 12,
    padding: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primaryFontColor,
  },
  closeButton: {
    padding: 4,
  },
  pickerContainer: {
    maxHeight: 400,
  },
  pickerContent: {
    padding: 20,
    paddingBottom: 32,
    gap: 20,
  },
  pickerSection: {
    gap: 10,
  },
  pickerSectionSpaced: {
    marginBottom: 4,
  },
  daySection: {
    marginBottom: 8,
  },
  pickerLabel: {
    fontSize: 16,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.primaryFontColor,
  },
  yearContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  yearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    minWidth: 60,
    alignItems: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F8F8F8',
    minWidth: 60,
    alignItems: 'center',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedButton: {
    backgroundColor: COLORS.secondaryColor,
  },
  yearText: {
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: COLORS.primaryFontColor,
  },
  monthText: {
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    color: COLORS.primaryFontColor,
  },
  dayText: {
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: COLORS.primaryFontColor,
  },
  selectedText: {
    color: COLORS.secondaryFontColor,
    fontFamily: 'Manrope-SemiBold',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: COLORS.secondaryColor,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.primaryFontColor,
  },
  confirmButtonText: {
    fontSize: 14,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.secondaryFontColor,
  },
});

export default DatePicker;
