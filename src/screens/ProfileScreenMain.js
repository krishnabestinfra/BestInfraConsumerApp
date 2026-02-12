import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from 'expo-image-picker';
import Menu from "../../assets/icons/bars.svg";
import MenuWhite from "../../assets/icons/menuBarWhite.svg";
import Notification from "../../assets/icons/notificationDark.svg";
import CameraIcon from "../../assets/icons/cameraIcon.svg";
import Logo from "../components/global/Logo";
import BackArrowIcon from "../../assets/icons/Back.svg";
import BackArrowIconWhite from "../../assets/icons/BackWhite.svg";
import { COLORS } from "../constants/colors";
import { useTheme } from "../context/ThemeContext";
import { useNotifications } from "../context/NotificationsContext";
import { getUser } from "../utils/storage";
import { apiClient } from "../services/apiClient";
import { API, API_ENDPOINTS } from "../constants/constants";
import { authService } from "../services/authService";

// Skeleton placeholder for loading state
const SkeletonField = ({ width = "70%", height = 14, style }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: "#E5E7EB",
          borderRadius: 4,
          opacity,
        },
        style,
      ]}
    />
  );
};

const ProfileScreenMain = ({ navigation }) => {
  const { isDark, colors: themeColors } = useTheme();
  const scrollViewRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null); // from auth profile (users table)

  // User data state (direct mapping from consumerData API response)
  const [userData, setUserData] = useState({
    name: "",
    mobile: "",
    email: "",
    address: "",
    consumerId: "",
    meterNumber: "",
    connectionType: "",
  });

  // Edit form state
  const [editData, setEditData] = useState({
    name: "",
    mobile: "",
    email: "",
    address: "",
  });

  // Get notification count
  let unreadCount = 0;
  try {
    const { notifications } = useNotifications();
    unreadCount = notifications?.filter(n => !n.is_read)?.length || 0;
  } catch (error) {
    console.log('NotificationsProvider not available');
  }

  // Fetch consumer details directly from /consumers/{identifier} once on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const user = await getUser();
        if (!user?.identifier) {
          setIsLoading(false);
          return;
        }

        // 1) Fetch consumer data for name/address/meter info
        const consumerEndpoint = API_ENDPOINTS.consumers.get(user.identifier);
        console.log("🔍 ProfileScreenMain fetching consumer details from:", consumerEndpoint);
        const consumerResult = await apiClient.request(consumerEndpoint, { method: "GET" });

        let name = "";
        let address = "";
        let consumerId = "";
        let meterNumber = "";
        let connectionType = "Residential";

        if (consumerResult.success && consumerResult.data) {
          const cd = consumerResult.data;
          name = cd.name;
          address = cd.permanentAddress;
          consumerId = cd.uniqueIdentificationNo;
          meterNumber = cd.meterSerialNumber;
          connectionType = cd.connectionType || "Residential";
        } else {
          console.log("⚠️ Profile consumer API did not return data");
        }

        // 2) Fetch auth profile data for email + phone (users table)
        const token = await authService.getValidAccessToken();
        const profileUrl = `${API.AUTH_URL}/profile?token=${token}`;
        console.log("🔍 ProfileScreenMain fetching auth profile from:", profileUrl);
        const profileResult = await apiClient.request(profileUrl, { method: "GET" });

        let email = "";
        let mobile = "";

        if (profileResult.success && profileResult.data?.user) {
          const u = profileResult.data.user;
          setProfileUserId(u.id);
          email = u.email || "";
          mobile = u.phone || "";
        } else {
          console.log("⚠️ Auth profile API did not return user data");
        }

        // Auth profile GET doesn't return phone; use consumer mobileNo as fallback for display
        if (!mobile && consumerResult.success && consumerResult.data?.mobileNo) {
          mobile = consumerResult.data.mobileNo;
        }

        const mapped = {
          name,
          mobile,
          email,
          address,
          consumerId,
          meterNumber,
          connectionType,
        };

        setUserData(mapped);
        setEditData({
          name: mapped.name || "",
          mobile: mapped.mobile || "",
          email: mapped.email || "",
          address: mapped.address || "",
        });
      } catch (error) {
        console.error("❌ Error fetching profile consumer details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Simple safe display helper: if value is null/empty, show "-"
  const safeDisplay = (value) => {
    if (value === null || value === undefined) return "-";
    const str = String(value).trim();
    return str.length ? str : "-";
  };

  const handleEditPress = () => {
    setEditData({
      name: userData.name,
      mobile: userData.mobile,
      email: userData.email,
      address: userData.address,
    });
    setIsEditing(true);
  };

  const handleCancelPress = () => {
    setEditData({
      name: userData.name,
      mobile: userData.mobile,
      email: userData.email,
      address: userData.address,
    });
    setIsEditing(false);
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);

      // Only update phone and email via auth profile API (users table)
      if (!profileUserId) {
        throw new Error("Missing profile user id for update-profile");
      }

      const payload = {
        id: profileUserId,
        phone: editData.mobile,
        email: editData.email,
      };

      const updateUrl = `${API.AUTH_URL}/update-profile`;
      console.log("🔄 Updating profile via:", updateUrl, "payload:", payload);

      const result = await apiClient.request(updateUrl, {
        method: "PUT",
        body: payload,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to update profile");
      }

      // Update local state and re-fetch profile so displayed email/phone stay in sync
      setUserData(prev => ({
        ...prev,
        mobile: editData.mobile,
        email: editData.email,
      }));
      setEditData(prev => ({
        ...prev,
        mobile: editData.mobile,
        email: editData.email,
      }));
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully.");
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your photo library to change profile picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image from library:', error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to the camera to take a profile picture.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const handleChangePhoto = () => {
    Alert.alert(
      "Change Profile Photo",
      "Choose an option",
      [
        { text: "Take Photo", onPress: pickImageFromCamera },
        { text: "Choose from Gallery", onPress: pickImageFromLibrary },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  return (
    <View style={[styles.Container, isDark && { backgroundColor: themeColors.screen }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.TopMenu}>
        <Pressable
          style={({ pressed }) => [
            styles.barsIcon,
            isDark && { backgroundColor: '#1A1F2E' },
            pressed && styles.buttonPressed
          ]}
          onPress={() => navigation.navigate("SideMenu")}
          android_ripple={{ color: 'rgba(0,0,0,0.15)', borderless: false, radius: 27 }}
        >
          {isDark ? (
            <MenuWhite width={18} height={18} />
          ) : (
            <Menu width={18} height={18} fill="#202d59" />
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.logoWrapper,
            pressed && styles.logoPressed
          ]}
          onPress={() => navigation.navigate("PostPaidDashboard")}
          android_ripple={{ color: 'rgba(85,181,108,0.2)', borderless: false, radius: 40 }}
        >
          <Logo variant={isDark ? "white" : "blue"} size="medium" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.bellWrapper,
            pressed && styles.buttonPressed
          ]}
          onPress={() => navigation.navigate("SideMenu")}
          android_ripple={{ color: 'rgba(0,0,0,0.15)', borderless: false, radius: 27 }}
        >
          <View style={[styles.bellIcon, isDark && { backgroundColor: '#1A1F2E' }]}>
            {isDark ? (
              <BackArrowIconWhite width={18} height={18} />
            ) : (
              <BackArrowIcon width={18} height={18} fill="#202d59" />
            )}
          </View>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
      <ScrollView
        ref={scrollViewRef}
        style={[styles.scrollContainer, isDark && { backgroundColor: themeColors.screen }]}
        contentContainerStyle={[styles.scrollContent, isEditing && { paddingBottom: 0 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Profile Photo Section */}
        <View style={styles.profilePhotoSection}>
          {isEditing ? (<>
            <TouchableOpacity
              style={styles.profilePhotoWrapper}
              onPress={handleChangePhoto}
              activeOpacity={0.8}
            >
              <Image
                source={profileImage ? { uri: profileImage } : require("../../assets/images/profile.jpg")}
                style={styles.profilePhoto}
              />
              <View style={styles.cameraIconWrapper}>
                <CameraIcon width={14} height={14} fill="#FFFFFF" />
              </View>
            </TouchableOpacity>
            {/* <Text style={styles.changePhotoText}>Tap to change photo</Text> */}
            </>) : (<><Image
              source={profileImage ? { uri: profileImage } : require("../../assets/images/profile.jpg")}
              style={styles.profilePhoto}
            /></>)}

        </View>

        {/* Main Content Card */}
        <View style={styles.contentCard}>
          {/* Account Information Section */}

          <View>
            <View style={styles.accountInfoSection}>
              <Text style={styles.accountInfoTitle}>Account Information</Text>
            </View>
            <View style={styles.accountInfoContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Consumer ID</Text>
                {isLoading ? (
                  <SkeletonField width="55%" height={14} />
                ) : (
                  <Text style={styles.infoValue}>{safeDisplay(userData.consumerId)}</Text>
                )}
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Meter Number</Text>
                {isLoading ? (
                  <SkeletonField width="50%" height={14} />
                ) : (
                  <Text style={styles.infoValue}>{safeDisplay(userData.meterNumber)}</Text>
                )}
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Connection Type</Text>
                {isLoading ? (
                  <SkeletonField width="45%" height={14} />
                ) : (
                  <Text style={styles.infoValue}>{safeDisplay(userData.connectionType)}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Editable Fields */}
          <View style={styles.fieldsContainer}>
            {/* Full Name - not editable (direct from API) */}
            <View style={styles.fieldWrapper}>
              {isLoading ? (
                <View style={styles.skeletonFieldInner}>
                  <SkeletonField width="65%" height={14} />
                </View>
              ) : (
                <Text style={styles.fieldValue}>{safeDisplay(userData.name)}</Text>
              )}
            </View>

            {/* Mobile Number */}
            <View style={styles.fieldWrapper}>
              {isLoading ? (
                <View style={styles.skeletonFieldInner}>
                  <SkeletonField width="55%" height={14} />
                </View>
              ) : isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editData.mobile}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, mobile: text }))}
                  placeholder="Mobile Number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100)}
                />
              ) : (
                <Text style={styles.fieldValue}>{safeDisplay(userData.mobile)}</Text>
              )}
            </View>

            {/* Email */}
            <View style={styles.fieldWrapper}>
              {isLoading ? (
                <View style={styles.skeletonFieldInner}>
                  <SkeletonField width="70%" height={14} />
                </View>
              ) : isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editData.email}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, email: text }))}
                  placeholder="Email"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100)}
                />
              ) : (
                <Text style={styles.fieldValue}>{safeDisplay(userData.email)}</Text>
              )}
            </View>

            {/* Address (read-only, not editable) */}
            <View style={styles.fieldWrapper}>
              {isLoading ? (
                <View style={[styles.skeletonFieldInner, { flexDirection: "column", gap: 6 }]}>
                  <SkeletonField width="90%" height={14} />
                  <SkeletonField width="75%" height={14} />
                </View>
              ) : (
                <Text style={styles.fieldValue}>{safeDisplay(userData.address)}</Text>
              )}
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {isEditing ? (
              <View style={styles.editButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelPress}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveChanges}
                  activeOpacity={0.8}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.editProfileButton, isLoading && styles.editButtonDisabled]}
                onPress={handleEditPress}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                <Text style={styles.editProfileButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ProfileScreenMain;

const styles = StyleSheet.create({
  Container: {
    flex: 1,
    backgroundColor: "#EEF8F0",
  },
  TopMenu: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 15,
    backgroundColor: "#EEF8F0",
  },
  barsIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 2,
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    padding: 8,
    borderRadius: 40,
  },
  bellWrapper: {
    position: "relative",
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  logoPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  bellIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 2,
  },
  badge: {
    position: "absolute",
    right: -3,
    top: -3,
    backgroundColor: "red",
    width: 22,
    height: 22,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fff",
    zIndex: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Manrope-Regular",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profilePhotoSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  profilePhotoWrapper: {
    position: "relative",
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 60,
  },
  cameraIconWrapper: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: COLORS.secondaryColor,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  changePhotoText: {
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    color: "#6B7280",
    marginTop: 5,
  },
  contentCard: {
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: "hidden",
    gap: 3,
  },
  accountInfoSection: {
    backgroundColor: COLORS.secondaryColor,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    marginHorizontal: 17,
  },
  accountInfoTitle: {
    fontSize: 13,
    fontFamily: "Manrope-SemiBold",
    color: "#FFFFFF",
  },
  accountInfoContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 17,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: "Manrope-Regular",
    color: "#374151",
  },
  infoValue: {
    fontSize: 13,
    fontFamily: "Manrope-Bold",
    color: "#1F2937",
    textAlign: "right",
  },
  fieldsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
  },
  fieldWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    minHeight: 48,
    justifyContent: "center",
  },
  skeletonFieldInner: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  editButtonDisabled: {
    opacity: 0.6,
  },
  fieldValue: {
    fontSize: 14,
    fontFamily: "Manrope-Regular",
    color: "#374151",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    fontSize: 14,
    fontFamily: "Manrope-Regular",
    color: "#1F2937",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addressInput: {
    minHeight: 48,
    textAlignVertical: "top",
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  editProfileButton: {
    backgroundColor: COLORS.secondaryColor,
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: "center",
  },
  editProfileButtonText: {
    fontSize: 16,
    fontFamily: "Manrope-SemiBold",
    color: "#FFFFFF",
  },
  detailsButton: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.secondaryColor,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  detailsButtonText: {
    fontSize: 14,
    fontFamily: "Manrope-SemiBold",
    color: COLORS.secondaryColor,
  },
  editButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: COLORS.secondaryColor,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Manrope-SemiBold",
    color: COLORS.secondaryColor,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.secondaryColor,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Manrope-SemiBold",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Manrope-SemiBold",
    marginBottom: 12,
    color: "#111827",
  },
  modalRow: {
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    color: "#6B7280",
    marginBottom: 2,
  },
  modalValue: {
    fontSize: 14,
    fontFamily: "Manrope-SemiBold",
    color: "#111827",
  },
  modalAddress: {
    lineHeight: 18,
  },
  modalCloseButton: {
    marginTop: 16,
    backgroundColor: COLORS.secondaryColor,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCloseButtonText: {
    fontSize: 14,
    fontFamily: "Manrope-SemiBold",
    color: "#FFFFFF",
  },
});

