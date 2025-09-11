import React, { useState, useRef, useEffect } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { COLORS } from '../../constants/colors';

const OTPInput = ({
  length = 6,
  onChange,
  onComplete,
  autoFocus = true,
  value = '',
  error,
  disabled = false,
  style,
  inputStyle,
  errorStyle,
  label,
  labelStyle,
  ...props
}) => {
  const [otp, setOtp] = useState(value.split('').slice(0, length));
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRefs = useRef([]);

  // Initialize input refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Handle external value changes
  useEffect(() => {
    if (value !== otp.join('')) {
      const newOtp = value.split('').slice(0, length);
      setOtp(newOtp);
    }
  }, [value, length]);

  // Auto-focus first input
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [autoFocus]);

  const handleTextChange = (text, index) => {
    // Only allow single digit
    const digit = text.replace(/[^0-9]/g, '').slice(0, 1);
    
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Call onChange with the new OTP
    const otpString = newOtp.join('');
    onChange?.(otpString);

    // Auto-focus next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if OTP is complete
    if (otpString.length === length && !otpString.includes('')) {
      onComplete?.(otpString);
    }
  };

  const handleKeyPress = (key, index) => {
    if (key === 'Backspace') {
      // If current input is empty, move to previous input
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
        onChange?.(newOtp.join(''));
      }
    }
  };

  const handleFocus = (index) => {
    setFocusedIndex(index);
  };

  const handleBlur = () => {
    setFocusedIndex(-1);
  };

  const handlePaste = async (index) => {
    try {
      // Get clipboard content
      const clipboardContent = await import('@react-native-clipboard/clipboard').then(
        (clipboard) => clipboard.default.getString()
      );
      
      if (clipboardContent) {
        // Extract only digits from clipboard
        const digits = clipboardContent.replace(/[^0-9]/g, '').slice(0, length);
        
        if (digits.length > 0) {
          const newOtp = [...otp];
          for (let i = 0; i < digits.length && i < length; i++) {
            newOtp[i] = digits[i];
          }
          setOtp(newOtp);
          
          const otpString = newOtp.join('');
          onChange?.(otpString);
          
          // Focus the next empty input or last input
          const nextEmptyIndex = newOtp.findIndex((digit, idx) => !digit && idx >= index);
          const targetIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : length - 1;
          inputRefs.current[targetIndex]?.focus();
          
          // Check if OTP is complete
          if (otpString.length === length && !otpString.includes('')) {
            onComplete?.(otpString);
          }
        }
      }
    } catch (error) {
      console.error('Clipboard access not available', error);
    }
  };

  const getInputContainerStyle = (index) => {
    const baseStyle = [styles.inputContainer];
    
    if (focusedIndex === index) {
      baseStyle.push(styles.focusedContainer);
    }
    
    if (error) {
      baseStyle.push(styles.errorContainer);
    }
    
    if (disabled) {
      baseStyle.push(styles.disabledContainer);
    }
    
    if (otp[index]) {
      baseStyle.push(styles.filledContainer);
    }

    return baseStyle;
  };

  const getInputStyle = (index) => {
    const baseStyle = [styles.input];
    
    if (disabled) {
      baseStyle.push(styles.disabledInput);
    }

    return baseStyle;
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
        </Text>
      )}
      
      <View style={styles.otpContainer}>
        {Array.from({ length }, (_, index) => (
          <Pressable
            key={index}
            onPress={() => !disabled && inputRefs.current[index]?.focus()}
            style={getInputContainerStyle(index)}
          >
            <TextInput
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[getInputStyle(index), inputStyle]}
              value={otp[index] || ''}
              onChangeText={(text) => handleTextChange(text, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              onFocus={() => handleFocus(index)}
              onBlur={handleBlur}
              onLongPress={() => handlePaste(index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!disabled}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              {...props}
            />
          </Pressable>
        ))}
      </View>
      
      {error && (
        <Text style={[styles.errorText, errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // marginBottom: 5,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  inputContainer: {
    width: 48,
    height: 48,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#F8F8F8',
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusedContainer: {
    backgroundColor: '#F8F8F8',
  },
  filledContainer: {
    // borderColor: COLORS.color_positive,
    // backgroundColor: '#f0f9ff',
  },
  errorContainer: {
    borderColor: COLORS.color_danger,
    backgroundColor: '#fef2f2',
  },
  disabledContainer: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    opacity: 0.6,
  },
  input: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    color: COLORS.secondaryColor,
    textAlign: 'center',
    width: 45,
    padding: 0,
  },
  disabledInput: {
    color: '#94a3b8',
  },
  errorText: {
    color: COLORS.color_danger,
    fontSize: 12,
    marginTop: 8,
    fontFamily: 'Manrope-Regular',
    textAlign: 'center',
  },
});

export default OTPInput;
