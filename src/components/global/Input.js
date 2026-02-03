import React, { useMemo, useCallback } from 'react';
import { TextInput, View, Text, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../../constants/colors';
import User from '../../../assets/icons/user.svg';

const Input = React.memo(({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  multiline = false,
  numberOfLines = 1,
  editable = true,
  error,
  hasErrorBorder = false,
  variant = 'default', // 'default', 'outlined', 'filled'
  size = 'medium', // 'small', 'medium', 'large'
  leftIcon,
  rightIcon,
  style,
  inputStyle,
  labelStyle,
  errorStyle,
  onFocus,
  onBlur,
  ...props
}) => {
  const getInputContainerStyle = useMemo(() => {
    const baseStyle = [styles.inputContainer, styles[`${variant}Container`], styles[size]];
    
    if (error || hasErrorBorder) {
      baseStyle.push(styles.errorContainer);
    }

    return baseStyle;
  }, [variant, size, error, hasErrorBorder]);

  const getInputStyle = useMemo(() => {
    const baseStyle = [styles.input, styles[`${variant}Input`], styles[`${size}Input`]];
    
    if (multiline) {
      baseStyle.push(styles.multilineInput);
    }

    if (!editable) {
      baseStyle.push(styles.disabledInput);
    }

    return baseStyle;
  }, [variant, size, multiline, editable]);

  const handleChangeText = useCallback((text) => {
    if (onChangeText) {
      onChangeText(text);
    }
  }, [onChangeText]);

  const handleFocus = useCallback((event) => {
    if (onFocus) {
      onFocus(event);
    }
  }, [onFocus]);

  const handleBlur = useCallback((event) => {
    if (onBlur) {
      onBlur(event);
    }
  }, [onBlur]);

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
        </Text>
      )}
      
      <View style={getInputContainerStyle}>        
        <TextInput
          style={[getInputStyle, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor="#6E6E6E"
          value={value}
          onChangeText={handleChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        
        {rightIcon && (
          <View style={styles.rightIcon}>
            {rightIcon}
          </View>
        )}
      </View>
      
      {error && (
        <Text style={[styles.errorText, errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  );
});

Input.displayName = 'Input';

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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    fontFamily: 'Manrope-Regular',
    paddingHorizontal: 10,
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
  // Input styles
  input: {
    flex: 1,
    // paddingHorizontal: 12,
    color: '#6e6e6e',
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    // marginLeft: 10,
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
    paddingTop: 12,
    paddingBottom: 12,
  },
  disabledInput: {
    opacity: 0.6,
  },
  // Icon styles
  leftIcon: {
    paddingLeft: 12,
    paddingRight: 8,
  },
  rightIcon: {
    paddingRight: 12,
    paddingLeft: 8,
  },
  // Error styles
  errorContainer: {
    borderColor: '#FF4444',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Manrope-Regular',
  },
});

export default Input; 