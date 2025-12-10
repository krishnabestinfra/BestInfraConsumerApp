import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { COLORS } from "../constants/colors";
import Tick from "../../assets/icons/tick.svg";
import Button from "../components/global/Button";
import Input from "../components/global/Input";
import { useState, useEffect } from "react";
import Icon from 'react-native-vector-icons/AntDesign';
import { z } from 'zod';
import User from '../../assets/icons/user.svg';
import EyeFill from '../../assets/icons/eyeFill.svg';
import EyeBlank from '../../assets/icons/eyeBlank.svg';
// Zod schema for login validation
const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, "Identifier must be at least 3 characters")
    .max(50, "Identifier must not exceed 50 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Identifier must contain only letters, numbers, and underscores"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(100, "Password must not exceed 100 characters")
});

const LoginForm = ({
  email,
  setEmail,
  password,
  setPassword,
  checked,
  setChecked,
  handleLogin,
  navigation,
  isLoading = false
}) => {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [hasAnyInput, setHasAnyInput] = useState(false);

  // Demo credentials available for testing:
  // Username: demo, test, admin, user, or BI25GMRA001-BI25GMRA020
  // Password: demo123, test123, admin123, user123, or demo123 respectively

  // Check if any input is entered
  useEffect(() => {
    const hasIdentifier = email && email.trim().length > 0;
    const hasPassword = password && password.trim().length > 0;
    setHasAnyInput(hasIdentifier || hasPassword);
  }, [email, password]);

  const handleInputChange = (field, value) => {
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    
    switch (field) {
      case 'identifier':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        break;
    }
  };

  const validateField = (field, value) => {
    try {
      if (field === 'identifier') {
        loginSchema.shape.identifier.parse(value);
      } else if (field === 'password') {
        loginSchema.shape.password.parse(value);
      }
      return null; // No error
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0].message;
      }
      return "Invalid input";
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    let value;
    switch (field) {
      case 'identifier':
        value = email;
        break;
      case 'password':
        value = password;
        break;
      default:
        return;
    }
    
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const handleLoginWithValidation = async () => {
    // Mark all fields as touched
    setTouched({ identifier: true, password: true });
    
    // Validate entire form using Zod
    const formData = { identifier: email, password };
    
    try {
      loginSchema.parse(formData);
      // Validation passed, proceed with login
      await handleLogin();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = {};
        error.errors.forEach(err => {
          newErrors[err.path[0]] = err.message;
        });
        setErrors(newErrors);
      }
    }
  };


  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View style={styles.Container}>
      <View style={styles.inputBoxes}>
        <Input
          placeholder="User Name"
          value={email}
          onChangeText={(value) => handleInputChange('identifier', value)}
          onBlur={() => handleBlur('identifier')}
          autoCapitalize="none"
          keyboardType="default"
          variant="default"
          size="medium"
          style={styles.inputContainer}
          error={touched.identifier ? errors.identifier : null}
          rightIcon={
            <User 
              width={20} 
              height={20} 
              fill={COLORS.color_text_secondary} 
              style={styles.userIcon}
            />
          }
          disabled={isLoading}
        />
        
        <Input
          placeholder="Password"
          value={password}
          onChangeText={(value) => handleInputChange('password', value)}
          onBlur={() => handleBlur('password')}
          secureTextEntry={!showPassword}
          variant="default"
          size="medium"
          style={styles.inputContainer}
          error={touched.password ? errors.password : null}
          rightIcon={
            <Pressable onPress={togglePasswordVisibility} disabled={isLoading}>
              <View style={styles.eyeIconContainer}>
                {showPassword ? (
                  <EyeFill width={18} height={18} fill={COLORS.color_text_secondary} />
                ) : (
                  <EyeBlank width={18} height={18} fill={COLORS.color_text_secondary} />
                )}
              </View>
            </Pressable>
          }
          disabled={isLoading}
        />
      </View>

      <View style={styles.forgetboxContainer}>
        <Pressable
          style={styles.checkboxContainer}
          onPress={() => !isLoading && setChecked(!checked)}
          disabled={isLoading}
        >
          <View style={[styles.checkbox, checked && styles.checked]}>
            {checked && (
              <Tick 
                size={14} 
                fill={COLORS.surfaceColor} 
              />
            )}
          </View>
          <Text style={styles.rememberText}>Remember</Text>
        </Pressable>
        <Button
          title="Forgot Password?"
          variant="ghost"
          size="small"
          onPress={() => !isLoading && navigation.navigate("ForgotPassword")}
          textStyle={styles.forgotText}
          disabled={isLoading}
        />
      </View>

      <Button 
        title={isLoading ? "Logging in..." : "Login Now"}
        variant={hasAnyInput ? "primary" : "outline"}
        size="medium"
        style={styles.loginButton} 
        onPress={handleLoginWithValidation}
        loading={isLoading}
        disabled={isLoading || !hasAnyInput}
      />

    </View>
  );
};

export default LoginForm;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: "#fff",
    zIndex: 1,
  },
  inputBoxes: {
    marginTop: 30,
  },
  inputContainer: {
    marginBottom: 15,
  },
  forgetboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    fontFamily: "Manrope-Medium",
  },
  rememberText: {
    color: COLORS.secondaryColor,
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Manrope-Medium",
    marginLeft: 10,
  },
  forgotText: {
    color: COLORS.secondaryColor,
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Manrope-Medium",
  },
  loginButton: {
    marginTop: 20,
  },
  dummyButton: {
    marginTop: 10,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  checked: {
    backgroundColor: COLORS.secondaryColor,
    borderColor: COLORS.secondaryColor,
  },
  eyeIconContainer: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  userIcon:{
    marginRight: 8,
  }
});
