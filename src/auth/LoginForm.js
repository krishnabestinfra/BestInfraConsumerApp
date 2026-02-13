import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import Tick from "../../assets/icons/tick.svg";
import Button from "../components/global/Button";
import Input from "../components/global/Input";
import { useState, useEffect } from "react";
import { z } from 'zod';
import User from '../../assets/icons/user.svg';
import EyeFill from '../../assets/icons/eyeFill.svg';
import EyeBlank from '../../assets/icons/eyeBlank.svg';
import ErrorIcon from '../../assets/icons/Erroricon.svg';

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
  const { getScaledFontSize, isDark, colors: themeColors } = useTheme();
  const s14 = getScaledFontSize(14);
  const sOr = getScaledFontSize(Platform.OS === "ios" ? 14 : 12);
  const iconFill = themeColors.textSecondary;
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [hasAnyInput, setHasAnyInput] = useState(false);

  useEffect(() => {
    const hasIdentifier = email && email.trim().length > 0;
    const hasPassword = password && password.trim().length > 0;
    setHasAnyInput(hasIdentifier && hasPassword);
  }, [email, password]);

  const handleInputChange = (field, value) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
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
      return null;
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
    setTouched({ identifier: true, password: true });
    const formData = { identifier: email, password };

    try {
      loginSchema.parse(formData);
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
    <View style={[styles.Container, isDark && { backgroundColor: 'transparent' }]}>
      <View style={styles.inputBoxes}>
        <Input
          placeholder="UID"
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
              fill={iconFill} 
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
                  <EyeFill width={18} height={18} fill={iconFill} />
                ) : (
                  <EyeBlank width={18} height={18} fill={iconFill} />
                )}
              </View>
            </Pressable>
          }
          disabled={isLoading}
        />
      </View>

      {loginError ? (
        <View style={[styles.errorContainer, isDark && { backgroundColor: themeColors.card, borderColor: themeColors.danger }]}>
          <ErrorIcon width={16} height={16} style={styles.errorIcon} />
          <Text style={[styles.errorText, { fontSize: s14 }, isDark && { color: themeColors.danger }]}>{loginError}</Text>
        </View>
      ) : null}

      <View style={styles.forgetboxContainer}>
        <Pressable
          style={styles.checkboxContainer}
          onPress={() => !isLoading && setChecked(!checked)}
          disabled={isLoading}
        >
          <View style={[styles.checkbox, checked && { backgroundColor: themeColors.accent, borderColor: themeColors.accent }, isDark && !checked && styles.checkboxDark]}>
            {checked && (
              <Tick 
                size={14} 
                fill={themeColors.textOnPrimary} 
              />
            )}
          </View>
          <Text style={[styles.rememberText, { fontSize: s14, color: isDark ? themeColors.textPrimary : themeColors.accent }]}>Remember</Text>
        </Pressable>
        <Button
          title="Forgot Password?"
          variant="ghost"
          size="small"
          onPress={() => !isLoading && navigation.navigate("ForgotPassword")}
          textStyle={[styles.forgotText, { fontSize: s14, color: themeColors.accent }]}
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
        <View style={[styles.straightLine, isDark && { backgroundColor: themeColors.cardBorder }]} />
        <View style={[styles.orContainer, isDark && { backgroundColor: themeColors.card }]}>
          <Text style={[styles.orText, { fontSize: sOr, color: themeColors.textPrimary }]}>OR</Text>
        </View>
        <Pressable
          style={styles.otpButton}
          onPress={() => !isLoading && navigation.navigate("OTPLogin")}
          disabled={isLoading}
        >
          <Text style={[styles.otpText, { fontSize: s14, color: themeColors.textPrimary }]}>Get OTP</Text>
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
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Manrope-Medium",
    marginLeft: 10,
  },
  forgotText: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Manrope-Medium",
  },
  loginButton: {
    marginTop: 20,
  },
  orSection: {
    marginTop: 24,
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
    fontSize: Platform.OS === "ios" ? 14 : 12,
    fontFamily: "Manrope-SemiBold",
    textAlign: "center",
  },
  otpButton: {
    marginTop: 20,
    alignItems: "center",
  },
  otpText: {
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
  checkboxDark: {
    borderColor: "rgba(255,255,255,0.3)",
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
