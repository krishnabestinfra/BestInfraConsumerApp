import React from 'react';
import { TextInput, View, Text, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

const TextArea = ({
  label,
  placeholder = 'Enter description...',
  value,
  onChangeText,
  error,
  variant = 'default',
  size = 'medium',
  numberOfLines = 4,
  maxLength,
  style,
  inputStyle,
  labelStyle,
  errorStyle,
  editable = true,
  onFocus,
  onBlur,
  ...props
}) => {
  const { getScaledFontSize } = useTheme();
  const s14 = getScaledFontSize(14);
  const s12 = getScaledFontSize(12);
  const s16 = getScaledFontSize(16);
  const getInputContainerStyle = () => {
    const baseStyle = [styles.inputContainer, styles[`${variant}Container`], styles[size]];
    
    if (error) {
      baseStyle.push(styles.errorContainer);
    }

    if (!editable) {
      baseStyle.push(styles.disabledContainer);
    }

    return baseStyle;
  };

  const getInputStyle = () => {
    const baseStyle = [styles.input, styles[`${variant}Input`], styles[`${size}Input`], styles.multilineInput];
    
    if (!editable) {
      baseStyle.push(styles.disabledInput);
    }

    return baseStyle;
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { fontSize: s14 }, labelStyle]}>
          {label}
        </Text>
      )}
      
      <View style={getInputContainerStyle()}>        
        <TextInput
          style={[getInputStyle(), { fontSize: size === 'small' ? s12 : size === 'large' ? s16 : s14 }, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor="#6E6E6E"
          value={value}
          onChangeText={onChangeText}
          multiline={true}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={editable}
          onFocus={onFocus}
          onBlur={onBlur}
          textAlignVertical="top"
          {...props}
        />
      </View>
      
      {maxLength && (
        <Text style={[styles.characterCount, { fontSize: s12 }]}>
          {value ? value.length : 0}/{maxLength}
        </Text>
      )}
      
      {error && (
        <Text style={[styles.errorText, { fontSize: s12 }, errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: COLORS.primaryFontColor,
    marginBottom: 8,
    fontFamily: 'Manrope-Medium',
  },
  inputContainer: {
    borderRadius: 8,
    fontFamily: 'Manrope-Regular',
    paddingHorizontal: 12,
    paddingVertical: 12,
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
    minHeight: 80,
  },
  medium: {
    minHeight: 100,
  },
  large: {
    minHeight: 120,
  },
  // Input styles
  input: {
    color: COLORS.primaryFontColor,
    fontFamily: 'Manrope-Regular',
    textAlignVertical: 'top',
  },
  defaultInput: {
    // Default styling
  },
  outlinedInput: {
    // Outlined styling
  },
  filledInput: {
    // Filled styling
  },
  smallInput: {
    fontSize: 12,
  },
  mediumInput: {
    fontSize: 14,
  },
  largeInput: {
    fontSize: 16,
  },
  multilineInput: {
    textAlignVertical: 'top',
    paddingTop: 0,
    paddingBottom: 0,
  },
  disabledInput: {
    opacity: 0.6,
  },
  // Disabled styles
  disabledContainer: {
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
  // Character count
  characterCount: {
    fontSize: 12,
    color: '#6E6E6E',
    textAlign: 'right',
    marginTop: 4,
    fontFamily: 'Manrope-Regular',
  },
});

export default TextArea;
