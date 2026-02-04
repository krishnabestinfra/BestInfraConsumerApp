import { StyleSheet, Text, View, Pressable, ScrollView, Switch, TouchableOpacity } from "react-native";
import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Menu from "../../assets/icons/bars.svg";
import Logo from "../components/global/Logo";
// Import icons - placeholder comments for icons you'll need to add
import ThemeIcon from "../../assets/icons/theme.svg";
import FontSizeIcon from "../../assets/icons/fontIcon.svg";
import LanguageIcon from "../../assets/icons/language.svg";
import HelpIcon from "../../assets/icons/questionMark.svg";
import TermsIcon from "../../assets/icons/info.svg";
// import PrivacyIcon from "../../assets/icons/privacyIcon.svg";
// import VersionIcon from "../../assets/icons/versionIcon.svg";
import ChevronRight from "../../assets/icons/rightArrow.svg";
import BackIcon from "../../assets/icons/Back.svg";

const Settings = ({ navigation }) => {
  const appVersion = "1.0.26";

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [storedDark, storedFont] = await Promise.all([
          AsyncStorage.getItem("settings:darkMode"),
          AsyncStorage.getItem("settings:fontSize"),
        ]);

        if (storedDark !== null) {
          setIsDarkMode(storedDark === "true");
        }

        if (storedFont !== null) {
          const parsed = parseInt(storedFont, 10);
          if ([13, 14, 15].includes(parsed)) {
            setFontSize(parsed);
          }
        }
      } catch (e) {
        // Silent failure; defaults will be used
      }
    };

    loadPreferences();
  }, []);

  const handleToggleDarkMode = async (value) => {
    // Only persist preference; we don't change the actual app theme here
    setIsDarkMode(value);
    try {
      await AsyncStorage.setItem("settings:darkMode", String(value));
    } catch (e) {
      // ignore persistence errors
    }
  };

  const handleFontSizeSelect = async (size) => {
    setFontSize(size);
    try {
      await AsyncStorage.setItem("settings:fontSize", String(size));
    } catch (e) {
      // ignore persistence errors
    }
  };

  const PreferenceItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showChevron = true,
    rightComponent = null,
    chevronDirection = "right",
  }) => (
    <Pressable
      style={styles.settingItem}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
    >
      <View style={styles.settingItemLeft}>
        <View style={styles.iconContainer}>
          {icon}
        </View>
        <View style={styles.textContainer}>
          <Text
            style={styles.settingTitle}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={styles.settingSubtitle}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightComponent ? (
        rightComponent
      ) : (
        showChevron && (
          <View style={styles.chevronContainer}>
            <ChevronRight
              width={24}
              height={24}
              style={
                chevronDirection === "down"
                  ? { transform: [{ rotate: "90deg" }] }
                  : undefined
              }
            />
          </View>
        )
      )}
    </Pressable>
  );

  return (
    <View style={styles.Container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.TopMenu}>
        <Pressable
          style={styles.barsIcon}
          onPress={() => navigation.navigate("SideMenu")}
          android_ripple={{ color: 'rgba(0,0,0,0.15)', borderless: false, radius: 27 }}
        >
          <Menu width={18} height={18} fill={COLORS.brandBlueColor} />
        </Pressable>

        <Pressable onPress={() => navigation.navigate("PostPaidDashboard")}>
          <Logo variant="white" size="medium" />
        </Pressable>

        <Pressable
          style={styles.bellIcon}
          onPress={() => navigation.goBack()}
        >
          <BackIcon width={20} height={20} fill={COLORS.brandBlueColor} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PREFERENCES Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>

          {/* Dark Mode toggle */}
          <PreferenceItem
            icon={
              <View style={styles.iconPlaceholder}>
                <ThemeIcon width={24} height={24} />
              </View>
            }
            title={isDarkMode ? "Dark Mode" : "Light Mode"}
            onPress={() => handleToggleDarkMode(!isDarkMode)}
            showChevron={false}
            rightComponent={
              <Switch
                value={isDarkMode}
                onValueChange={handleToggleDarkMode}
                trackColor={{
                  false: "rgba(148, 163, 184, 0.7)",
                  true: COLORS.secondaryColor,
                }}
                thumbColor="#FFFFFF"
              />
            }
          />

          {/* Font size card with inline chips */}
          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <View style={styles.iconContainer}>
                <View style={styles.iconPlaceholder}>
                  <FontSizeIcon width={24} height={24} />
                </View>
              </View>
              <View style={styles.textContainer}>
                <View style={styles.fontTitleRow}>
                  <Text style={styles.settingTitle}>Font Size</Text>
                  {isFontDropdownOpen && (
                    <View style={styles.fontSizeRow}>
                      {[13, 14, 15].map((size) => {
                        const isActive = size === fontSize;
                        return (
                          <TouchableOpacity
                            key={size}
                            style={[
                              styles.fontChip,
                              isActive && styles.fontChipActive,
                            ]}
                            onPress={() => handleFontSizeSelect(size)}
                            activeOpacity={0.85}
                          >
                            <Text
                              style={[
                                styles.fontChipText,
                                isActive && styles.fontChipTextActive,
                              ]}
                            >
                              {size}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            </View>
            <Pressable
              style={styles.chevronContainer}
              onPress={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
            >
              <ChevronRight
                width={24}
                height={24}
                style={
                  isFontDropdownOpen
                    ? { transform: [{ rotate: "90deg" }] }
                    : undefined
                }
              />
            </Pressable>
          </View>

          <PreferenceItem
            icon={
              <View style={styles.iconPlaceholder}>
                <TermsIcon width={24} height={24} />
              </View>
            }
            title="Terms of Service"
            onPress={() => { }}
          />

          <PreferenceItem
            icon={
              <View style={styles.iconPlaceholder}>
                <TermsIcon width={24} height={24} />
              </View>
            }
            title="Privacy Policy"
            onPress={() => { }}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default Settings;

const styles = StyleSheet.create({
  Container: {
    flex: 1,
    backgroundColor: COLORS.brandBlueColor,
  },
  TopMenu: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 75,
    paddingBottom: 20,
    paddingHorizontal: 30,
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
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollContainer: {
    flex: 1,
    marginTop: 10
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Manrope-SemiBold",
    color: "rgba(255, 255, 255, 0.6)",
    letterSpacing: 1,
    paddingLeft: 4,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPlaceholder: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 16,
    color: COLORS.secondaryFontColor,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    fontSize: 15,
    fontFamily: "Manrope-Medium",
    color: COLORS.secondaryFontColor,
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    color: "rgba(255, 255, 255, 0.5)",
  },
  chevronContainer: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronText: {
    fontSize: 20,
    color: "rgba(255, 255, 255, 0.5)",
    fontWeight: "300",
  },
  fontTitleRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 5,
    flex: 1,
  },
  fontSizeRow: {
    flexDirection: "row",
    gap: 8,
    // marginTop: 8,
  },
  fontChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  fontChipActive: {
    backgroundColor: COLORS.secondaryColor,
  },
  fontChipText: {
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    color: "rgba(255, 255, 255, 0.8)",
  },
  fontChipTextActive: {
    color: "#FFFFFF",
  },
});
