// 

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Button from '../components/global/Button';
import Input from '../components/global/Input';

const screenHeight = Dimensions.get("window").height;

const ResetPassword = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { token, email } = route.params || {};

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      alert("Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const response = await fetch('http://192.168.1.33:3000/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, newPassword }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        alert('Password reset successful');
        navigation.navigate('Login');
      } else {
        alert(data.message);
      }
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  return (
    <View style={styles.Maincontainer}>
      <View style={styles.container}>
        <Text style={styles.emailLabel}>Reset for: {email}</Text>
        <Input
          label="New Password"
          placeholder="Enter new password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={true}
          variant="default"
          size="medium"
          style={styles.inputContainer}
        />
        <Input
          label="Confirm Password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={true}
          variant="default"
          size="medium"
          style={styles.inputContainer}
        />
        <Button
          title="Reset Password"
          onPress={handleReset}
          variant="primary"
          size="large"
          style={styles.button}
        />
      </View>
    </View>
  );
};

export default ResetPassword;

const styles = StyleSheet.create({
   Maincontainer: {
    height:"100%",
    display:"flex",
    justifyContent:"center",
  },
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 40,
    padding: 20,
    borderRadius: 15,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    display:"flex",
    justifyContent:"center",
    alignContent:"center"
  },
  emailLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 10,
  },
  button: {
    marginTop: 12,
  },
});
