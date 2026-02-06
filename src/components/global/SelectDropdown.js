import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import DropdownIcon from '../../../assets/icons/dropdownArrow.svg';

const SelectDropdown = ({
  label,
  placeholder = 'Select an option',
  value,
  onSelect,
  options = [],
  error,
  variant = 'default',
  size = 'medium',
  style,
  labelStyle,
  errorStyle,
  disabled = false,
  ...props
}) => {
  const { getScaledFontSize } = useTheme();
  const s14 = getScaledFontSize(14);
  const s12 = getScaledFontSize(12);
  const s16 = getScaledFontSize(16);
  const [isOpen, setIsOpen] = useState(false);
  const handleSelect = (option) => {
    onSelect(option);
    setIsOpen(false);
  };

  const getContainerStyle = () => {
    const baseStyle = [styles.container, styles[`${variant}Container`], styles[size]];
    
    if (error) {
      baseStyle.push(styles.errorContainer);
    }

    if (disabled) {
      baseStyle.push(styles.disabledContainer);
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text, styles[`${size}Text`]];
    
    if (!value) {
      baseStyle.push(styles.placeholderText);
    }

    if (disabled) {
      baseStyle.push(styles.disabledText);
    }

    return baseStyle;
  };

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={[styles.label, { fontSize: s14 }, labelStyle]}>
          {label}
        </Text>
      )}
      
      <View style={styles.dropdownWrapper}>
        <TouchableOpacity
          style={getContainerStyle()}
          onPress={() => !disabled && setIsOpen(!isOpen)}
          activeOpacity={0.7}
          disabled={disabled}
          {...props}
        >
          <Text style={[getTextStyle(), { fontSize: size === 'small' ? s12 : size === 'large' ? s16 : s14 }]}>
            {value || placeholder}
          </Text>
          <DropdownIcon width={16} height={16} />
        </TouchableOpacity>

        {isOpen && options.length > 0 && (
          <View style={styles.dropdownList}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dropdownItem,
                  value === option && styles.selectedItem
                ]}
                onPress={() => handleSelect(option)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dropdownItemText,
                  { fontSize: s14 },
                  value === option && styles.selectedItemText
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      
      {error && (
        <Text style={[styles.errorText, { fontSize: s12 }, errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: COLORS.primaryFontColor,
    marginBottom: 8,
    fontFamily: 'Manrope-Medium',
  },
  dropdownWrapper: {
    position: 'relative',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: 'Manrope-Regular',
  },
  // Variant styles
  defaultContainer: {
    borderWidth: Platform.OS === 'ios' ? 0.4 : 1,
    borderColor: '#F8F8F8',
    backgroundColor: '#F8F8F8',
  },
  outlinedContainer: {
    borderWidth: 1,
    borderColor: '#F8F8F8',
    backgroundColor: 'transparent',
  },
  filledContainer: {
    borderWidth: 0,
    backgroundColor: '#f5f5f5',
  },
  // Size styles
  small: {
    minHeight: 40,
  },
  medium: {
    minHeight: 50,
  },
  large: {
    minHeight: 56,
  },
  // Text styles
  text: {
    flex: 1,
    color: COLORS.primaryFontColor,
    fontFamily: 'Manrope-Regular',
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
  placeholderText: {
    color: '#6E6E6E',
  },
  arrow: {
    fontSize: 12,
    color: '#6E6E6E',
    marginLeft: 8,
    transform: [{ rotate: '0deg' }],
  },
  arrowOpen: {
    transform: [{ rotate: '180deg' }],
  },
  // Dropdown list
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.secondaryFontColor,
    borderWidth: 1,
    borderColor: '#F8F8F8',
    borderRadius: 8,
    marginTop: 4,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedItem: {
    backgroundColor: '#F0F8FF',
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: COLORS.primaryFontColor,
  },
  selectedItemText: {
    color: COLORS.primaryColor,
    fontFamily: 'Manrope-Medium',
  },
  // Disabled styles
  disabledContainer: {
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.6,
  },
  // Error styles
  errorContainer: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Manrope-Regular',
  },
});

export default SelectDropdown;
