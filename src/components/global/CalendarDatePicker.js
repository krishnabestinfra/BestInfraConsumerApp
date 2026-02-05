import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { COLORS, colors } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import CalendarArrowLeft from '../../../assets/icons/Calender arrowleft.svg';
import CalendarArrowRight from '../../../assets/icons/CalenderarrowRight.svg';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarDatePicker = ({
  visible,
  onClose,
  value,
  onChange,
}) => {
  const { getScaledFontSize } = useTheme();
  const s18 = getScaledFontSize(18);
  const s16 = getScaledFontSize(16);
  const s12 = getScaledFontSize(12);
  const s14 = getScaledFontSize(14);
  const initialDate = value || new Date();
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const getToday = () => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  };

  const isPastDate = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return d.getTime() < getToday().getTime();
  };

  const getCalendarDays = () => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // Leading days from previous month (to complete first row)
    for (let i = 0; i < firstDay; i++) {
      const day = daysInPrevMonth - firstDay + i + 1;
      days.push({ day, isCurrentMonth: false, date: new Date(viewYear, viewMonth - 1, day), disabled: true });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      days.push({ day: d, isCurrentMonth: true, date, disabled: isPastDate(date) });
    }

    // Trailing days from next month - only enough to complete the last row
    const totalSoFar = days.length;
    const trailingCount = totalSoFar % 7 === 0 ? 0 : 7 - (totalSoFar % 7);
    for (let d = 1; d <= trailingCount; d++) {
      days.push({ day: d, isCurrentMonth: false, date: new Date(viewYear, viewMonth + 1, d), disabled: true });
    }

    return days;
  };

  const isSelected = (date) => {
    return selectedDate &&
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    if (onChange) onChange(date);
    onClose();
  };

  const calendarDays = getCalendarDays();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { fontSize: s18 }]}>Select Date</Text>

          <View style={styles.monthNav}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={handlePrevMonth}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <CalendarArrowLeft width={16} height={16} fill={colors.color_text_secondary} />
            </TouchableOpacity>
            <Text style={[styles.monthYear, { fontSize: s16 }]}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity
              style={styles.navButton}
              onPress={handleNextMonth}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <CalendarArrowRight width={16} height={16} fill={colors.color_text_secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.dayHeaders}>
            {DAY_HEADERS.map((d) => (
              <Text key={d} style={[styles.dayHeaderText, { fontSize: s12 }]}>{d}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map(({ day, isCurrentMonth, date, disabled }, index) => {
              const selected = isSelected(date);
              const weekend = isCurrentMonth && !disabled && isWeekend(date);
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    selected && !disabled && styles.dayCellSelected,
                    disabled && styles.dayCellDisabled,
                  ]}
                  onPress={() => !disabled && handleDateSelect(date)}
                  activeOpacity={disabled ? 1 : 0.7}
                  disabled={disabled}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { fontSize: s14 },
                      !isCurrentMonth && styles.dayTextOtherMonth,
                      selected && !disabled && styles.dayTextSelected,
                      isCurrentMonth && !selected && weekend && styles.dayTextWeekend,
                      disabled && styles.dayTextDisabled,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const CELL_SIZE = 45;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    width: 7 * CELL_SIZE + 40,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Manrope-Bold',
    color: '#000000',
    marginBottom: 16,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYear: {
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: '#000000',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dayHeaderText: {
    width: CELL_SIZE,
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    color: '#000000',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 7 * CELL_SIZE,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayCellSelected: {
    backgroundColor: 'rgba(22, 59, 124, 1)',
    borderRadius: 8,
  },
  dayText: {
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: '#000000',
  },
  dayTextOtherMonth: {
    color: '#B0B0B0',
  },
  dayCellDisabled: {
    opacity: 0.5,
  },
  dayTextDisabled: {
    color: '#B0B0B0',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'Manrope-SemiBold',
  },
  dayTextWeekend: {
    color: '#DC272C',
  },
});

export default CalendarDatePicker;
