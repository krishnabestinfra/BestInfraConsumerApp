import React, { useState, useEffect } from "react";
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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from 'expo-image-picker';
import Menu from "../../assets/icons/bars.svg";
import Notification from "../../assets/icons/notificationDark.svg";
import CameraIcon from "../../assets/icons/cameraIcon.svg";
import Logo from "../components/global/Logo";
import { COLORS } from "../constants/colors";
import { useApp } from "../context/AppContext";
import { useNotifications } from "../context/NotificationsContext";
import { getUser, storeUser } from "../utils/storage";

const ProfileScreenMain = ({ navigation }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  // User data state
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

  // Get consumer data from context
  let consumerData = null;
  try {
    const appContext = useApp();
    consumerData = appContext.consumerData;
  } catch (error) {
    console.log('AppProvider not available');
  }

  // Get notification count
  let unreadCount = 0;
  try {
    const { notifications } = useNotifications();
    unreadCount = notifications?.filter(n => !n.is_read)?.length || 0;
  } catch (error) {
    console.log('NotificationsProvider not available');
  }

  // Fetch user data on mount
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const user = await getUser();

      if (user) {
        const data = {
          name: user.name || consumerData?.consumerName || "",
          mobile: user.mobile || user.phone || maskPhoneNumber(consumerData?.mobile) || "",
          email: user.email || consumerData?.email || "",
          address: user.address || consumerData?.address || "",
          consumerId: user.identifier || consumerData?.uid || "",
          meterNumber: consumerData?.meterNumber || "MTR-456789",
          connectionType: consumerData?.connectionType || "Residential",
        };
        setUserData(data);
        setEditData({
          name: data.name,
          mobile: data.mobile,
          email: data.email,
          address: data.address,
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const maskPhoneNumber = (phone) => {
    if (!phone) return "";
    const str = String(phone);
    if (str.length >= 10) {
      return str.slice(0, 5) + "***" + str.slice(-4);
    }
    return str;
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

      // Get current user data
      const currentUser = await getUser();

      // Update user data
      const updatedUser = {
        ...currentUser,
        name: editData.name,
        mobile: editData.mobile,
        email: editData.email,
        address: editData.address,
      };

      // Save to storage
      await storeUser(updatedUser);

      // Update local state
      setUserData(prev => ({
        ...prev,
        name: editData.name,
        mobile: editData.mobile,
        email: editData.email,
        address: editData.address,
      }));

      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePhoto = async () => {
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
      console.error('Error picking image:', error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.Container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.secondaryColor} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.Container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.TopMenu}>
        <Pressable
          style={({ pressed }) => [
            styles.barsIcon,
            pressed && styles.buttonPressed
          ]}
          onPress={() => navigation.navigate("SideMenu")}
          android_ripple={{ color: 'rgba(0,0,0,0.15)', borderless: false, radius: 27 }}
        >
          <Menu width={18} height={18} fill="#202d59" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.logoWrapper,
            pressed && styles.logoPressed
          ]}
          onPress={() => navigation.navigate("PostPaidDashboard")}
          android_ripple={{ color: 'rgba(85,181,108,0.2)', borderless: false, radius: 40 }}
        >
          <Logo variant="blue" size="medium" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.bellWrapper,
            pressed && styles.buttonPressed
          ]}
          onPress={() => navigation.navigate("Profile")}
          android_ripple={{ color: 'rgba(0,0,0,0.15)', borderless: false, radius: 27 }}
        >
          <View style={styles.bellIcon}>
            <Notification width={18} height={18} fill="#202d59" />
          </View>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
                <Text style={styles.infoValue}>{userData.consumerId || "GMR2024567890"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Meter Number</Text>
                <Text style={styles.infoValue}>{userData.meterNumber}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Connection Type</Text>
                <Text style={styles.infoValue}>{userData.connectionType}</Text>
              </View>
            </View>
          </View>

          {/* Editable Fields */}
          <View style={styles.fieldsContainer}>
            {/* Full Name */}
            <View style={styles.fieldWrapper}>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editData.name}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, name: text }))}
                  placeholder="Full Name"
                  placeholderTextColor="#9CA3AF"
                />
              ) : (
                <Text style={styles.fieldValue}>{userData.name || "Full Name"}</Text>
              )}
            </View>

            {/* Mobile Number */}
            <View style={styles.fieldWrapper}>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editData.mobile}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, mobile: text }))}
                  placeholder="Mobile Number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.fieldValue}>{userData.mobile || "Mobile Number"}</Text>
              )}
            </View>

            {/* Email */}
            <View style={styles.fieldWrapper}>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editData.email}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, email: text }))}
                  placeholder="Email"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.fieldValue}>{userData.email || "Email"}</Text>
              )}
            </View>

            {/* Address */}
            <View style={styles.fieldWrapper}>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.addressInput]}
                  value={editData.address}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, address: text }))}
                  placeholder="Address"
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              ) : (
                <Text style={styles.fieldValue}>{userData.address || "Address"}</Text>
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
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={handleEditPress}
                activeOpacity={0.8}
              >
                <Text style={styles.editProfileButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ProfileScreenMain;

const styles = StyleSheet.create({
  Container: {
    flex: 1,
    backgroundColor: "#EEF8F0",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.secondaryColor,
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    marginTop: 12,
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
});

