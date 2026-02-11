import React, { useState, useEffect } from 'react';
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

const dateToKey = (d) => d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();

const normalizeDate = (d) => d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;

const CalendarDatePicker = ({
  visible,
  onClose,
  value,
  onChange,
  allowRangeSelection = false,
}) => {
  const { getScaledFontSize } = useTheme();
  const s18 = getScaledFontSize(18);
  const s16 = getScaledFontSize(16);
  const s12 = getScaledFontSize(12);
  const s14 = getScaledFontSize(14);

  const valueStart = value && (value.startDate || (value.getTime ? value : null));
  const valueEnd = value && (value.endDate || (value.getTime ? value : null));
  const initialStart = normalizeDate(valueStart || new Date());
  const initialEnd = normalizeDate(valueEnd || initialStart);

  const [viewMonth, setViewMonth] = useState(initialStart.getMonth());
  const [viewYear, setViewYear] = useState(initialStart.getFullYear());
  const [selectedDate, setSelectedDate] = useState(initialStart);
  const [rangeStart, setRangeStart] = useState(allowRangeSelection ? initialStart : null);
  const [rangeEnd, setRangeEnd] = useState(allowRangeSelection ? initialEnd : null);

  useEffect(() => {
    if (visible) {
      const start = normalizeDate(valueStart || new Date());
      const end = normalizeDate(valueEnd || start);
      setViewMonth(start.getMonth());
      setViewYear(start.getFullYear());
      setSelectedDate(start);
      if (allowRangeSelection) {
        setRangeStart(value ? start : null);
        setRangeEnd(value ? end : null);
      } else {
        setRangeStart(null);
        setRangeEnd(null);
      }
    }
  }, [visible, allowRangeSelection, value]);

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

  // Disable today and future dates; enable only dates before today (for consumption history)
  const isTodayOrFuture = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return d.getTime() >= getToday().getTime();
  };

  const getCalendarDays = () => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // Leading days from previous month (to complete first row) - enable if before today
    for (let i = 0; i < firstDay; i++) {
      const day = daysInPrevMonth - firstDay + i + 1;
      const date = new Date(viewYear, viewMonth - 1, day);
      days.push({ day, isCurrentMonth: false, date, disabled: isTodayOrFuture(date) });
    }

    // Current month days - disable today and future
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      days.push({ day: d, isCurrentMonth: true, date, disabled: isTodayOrFuture(date) });
    }

    // Trailing days from next month - disable (always today or future)
    const totalSoFar = days.length;
    const trailingCount = totalSoFar % 7 === 0 ? 0 : 7 - (totalSoFar % 7);
    for (let d = 1; d <= trailingCount; d++) {
      const date = new Date(viewYear, viewMonth + 1, d);
      days.push({ day: d, isCurrentMonth: false, date, disabled: isTodayOrFuture(date) });
    }

    return days;
  };

  const isSelected = (date) => {
    if (allowRangeSelection && rangeStart && rangeEnd) {
      const key = dateToKey(date);
      return key >= dateToKey(rangeStart) && key <= dateToKey(rangeEnd);
    }
    return selectedDate &&
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  const isRangeStart = (date) => {
    return allowRangeSelection && rangeStart && dateToKey(date) === dateToKey(rangeStart);
  };

  const isRangeEnd = (date) => {
    return allowRangeSelection && rangeEnd && dateToKey(date) === dateToKey(rangeEnd);
  };

  const isSingleDayRange = () => {
    return allowRangeSelection && rangeStart && rangeEnd && dateToKey(rangeStart) === dateToKey(rangeEnd);
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const handleDateSelect = (date) => {
    if (!allowRangeSelection) {
      setSelectedDate(date);
      if (onChange) onChange(date);
      onClose();
      return;
    }
    if (rangeStart === null) {
      setRangeStart(date);
      setRangeEnd(date);
      setSelectedDate(date);
      return;
    }
    const startKey = dateToKey(rangeStart);
    const dateKey = dateToKey(date);
    if (dateKey < startKey) {
      setRangeStart(date);
      setRangeEnd(date);
      setSelectedDate(date);
      return;
    }
    setRangeEnd(date);
    if (onChange) onChange({ startDate: rangeStart, endDate: date });
    onClose();
  };

  const isInRangeMiddle = (date) => {
    return allowRangeSelection && rangeStart && rangeEnd && isSelected(date) && !isRangeStart(date) && !isRangeEnd(date);
  };

  const getDayCellStyle = (date) => {
    const selected = isSelected(date);
    const rangeStartDay = isRangeStart(date);
    const rangeEndDay = isRangeEnd(date);
    const single = allowRangeSelection && selected && rangeStartDay && rangeEndDay;
    if (!selected) return [];
    // Range styling:
    // - Start/end: solid highlight
    // - Middle: light "shadowish" highlight
    if (allowRangeSelection) {
      if (single) {
        return [styles.dayCellSelected, styles.dayCellSelectedSingle];
      }
      if (rangeStartDay) {
        return [styles.dayCellSelected, styles.dayCellRangeStart];
      }
      if (rangeEndDay) {
        return [styles.dayCellSelected, styles.dayCellRangeEnd];
      }
      if (isInRangeMiddle(date)) {
        return [styles.dayCellRangeMiddle];
      }
    }
    return [styles.dayCellSelected];
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
              const inRangeMiddle = isInRangeMiddle(date);
              const extraSelectedStyles = getDayCellStyle(date);
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    selected && !disabled && (extraSelectedStyles.length ? extraSelectedStyles : styles.dayCellSelected),
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
                      selected && !disabled && (inRangeMiddle ? styles.dayTextRangeMiddle : styles.dayTextSelected),
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
  dayCellSelectedSingle: {
    borderRadius: 8,
  },
  dayCellRangeStart: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  dayCellRangeEnd: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  dayCellRangeMiddle: {
    backgroundColor: 'rgba(22, 59, 124, 0.16)',
    borderRadius: 0,
    shadowColor: 'rgba(22, 59, 124, 0.35)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
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
  dayTextRangeMiddle: {
    color: 'rgba(22, 59, 124, 0.95)',
    fontFamily: 'Manrope-Medium',
  },
  dayTextWeekend: {
    color: '#DC272C',
  },
});

export default CalendarDatePicker;
