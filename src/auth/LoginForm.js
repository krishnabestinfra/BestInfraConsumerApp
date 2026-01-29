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
import { z } from 'zod';
import User from '../../assets/icons/user.svg';
import EyeFill from '../../assets/icons/eyeFill.svg';
import EyeBlank from '../../assets/icons/eyeBlank.svg';
import ErrorIcon from '../../assets/icons/Erroricon.svg';
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
  isLoading = false,
  loginError,
  setLoginError,
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

    // Clear any global login error when the user changes input
    if (loginError) {
      setLoginError("");
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
          hasErrorBorder={!!loginError || !!(touched.identifier && errors.identifier)}
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
          hasErrorBorder={!!loginError || !!(touched.password && errors.password)}
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

      {loginError ? (
        <View style={styles.errorContainer}>
          <ErrorIcon width={16} height={16} style={styles.errorIcon} />
          <Text style={styles.errorText}>{loginError}</Text>
        </View>
      ) : null}

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

      <View style={styles.orSection}>
        <View style={styles.straightLine} />
        <View style={styles.orContainer}>
          <Text style={styles.orText}>OR</Text>
        </View>
        <Pressable
          style={styles.otpButton}
          onPress={() => !isLoading && navigation.navigate("OTPLogin")}
          disabled={isLoading}
        >
          <Text style={styles.otpText}>Get OTP</Text>
        </Pressable>
      </View>
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
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF7474",
    backgroundColor: "#FFFFFF",
  },
  errorIcon: {
    marginRight: 10,
  },
  errorText: {
    flex: 1,
    color: "#FF7474",
    fontSize: 14,
    fontFamily: "Manrope-Regular",
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
  orSection: {
    marginTop: 24,
    paddingVertical: 50,
  },
  straightLine: {
    width: "40%",
    backgroundColor: "#e9eaee",
    marginTop: 24,
    height: 2,
    alignSelf: "center",
  },
  orContainer: {
    backgroundColor: "#e9eaee",
    width: 32,
    height: 32,
    borderRadius: 35,
    alignSelf: "center",
    justifyContent: "center",
    zIndex: 9,
    marginTop: -18,
  },
  orText: {
    color: COLORS.primaryFontColor,
    fontSize: Platform.OS === "ios" ? 14 : 12,
    fontFamily: "Manrope-SemiBold",
    textAlign: "center",
  },
  otpButton: {
    marginTop: 20,
    alignItems: "center",
  },
  otpText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Medium",
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
