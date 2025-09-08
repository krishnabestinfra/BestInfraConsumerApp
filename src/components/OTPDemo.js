import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { COLORS } from '../constants/colors';
import OTPInput from './global/OTPInput';
import Button from './global/Button';

const OTPDemo = () => {
  const [otp4, setOtp4] = useState('');
  const [otp6, setOtp6] = useState('');
  const [otpWithError, setOtpWithError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOTP4Change = (value) => {
    setOtp4(value);
  };

  const handleOTP4Complete = (value) => {
    Alert.alert('OTP Complete', `4-digit OTP: ${value}`);
  };

  const handleOTP6Change = (value) => {
    setOtp6(value);
  };

  const handleOTP6Complete = (value) => {
    Alert.alert('OTP Complete', `6-digit OTP: ${value}`);
  };

  const handleOTPWithErrorChange = (value) => {
    setOtpWithError(value);
  };

  const handleOTPWithErrorComplete = (value) => {
    if (value === '123456') {
      Alert.alert('Success', 'OTP verified successfully!');
    } else {
      Alert.alert('Error', 'Invalid OTP. Please try again.');
    }
  };

  const simulateVerification = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      if (otp6 === '123456') {
        Alert.alert('Success', 'OTP verified successfully!');
      } else {
        Alert.alert('Error', 'Invalid OTP. Please try again.');
      }
    }, 2000);
  };

  const clearAll = () => {
    setOtp4('');
    setOtp6('');
    setOtpWithError('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>OTP Input Demo</Text>
      
      {/* 4-digit OTP */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4-Digit OTP</Text>
        <OTPInput
          length={4}
          value={otp4}
          onChange={handleOTP4Change}
          onComplete={handleOTP4Complete}
          label="Enter 4-digit code"
        />
        <Text style={styles.valueText}>Current value: {otp4 || 'Empty'}</Text>
      </View>

      {/* 6-digit OTP */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6-Digit OTP (Default)</Text>
        <OTPInput
          length={6}
          value={otp6}
          onChange={handleOTP6Change}
          onComplete={handleOTP6Complete}
          label="Enter verification code"
        />
        <Text style={styles.valueText}>Current value: {otp6 || 'Empty'}</Text>
      </View>

      {/* OTP with Error State */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>OTP with Error State</Text>
        <OTPInput
          length={6}
          value={otpWithError}
          onChange={handleOTPWithErrorChange}
          onComplete={handleOTPWithErrorComplete}
          label="Enter OTP (try 123456)"
          error={otpWithError.length === 6 && otpWithError !== '123456' ? 'Invalid OTP' : null}
        />
        <Text style={styles.valueText}>Current value: {otpWithError || 'Empty'}</Text>
      </View>

      {/* Disabled State */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Disabled State</Text>
        <OTPInput
          length={6}
          value="123456"
          onChange={() => {}}
          disabled={true}
          label="Disabled OTP input"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          title="Verify OTP"
          variant="primary"
          size="medium"
          onPress={simulateVerification}
          loading={isLoading}
          disabled={otp6.length !== 6 || isLoading}
          style={styles.button}
        />
        
        <Button
          title="Clear All"
          variant="outline"
          size="medium"
          onPress={clearAll}
          style={styles.button}
        />
      </View>

      {/* Usage Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>Usage Instructions:</Text>
        <Text style={styles.instructionText}>• Tap any box to focus and start typing</Text>
        <Text style={styles.instructionText}>• Use backspace to go to previous box</Text>
        <Text style={styles.instructionText}>• Long press to paste OTP from clipboard</Text>
        <Text style={styles.instructionText}>• Auto-focus moves to next box after typing</Text>
        <Text style={styles.instructionText}>• onComplete fires when all digits are entered</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primaryFontColor,
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.primaryFontColor,
    marginBottom: 15,
  },
  valueText: {
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    color: COLORS.color_text_secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  button: {
    flex: 0.45,
  },
  instructionsContainer: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondaryColor,
  },
  instructionsTitle: {
    fontSize: 14,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.primaryFontColor,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    color: COLORS.color_text_secondary,
    marginBottom: 4,
  },
});

export default OTPDemo;
