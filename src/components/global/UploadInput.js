import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import UploadClipIcon from '../../../assets/icons/uploadClip.svg';
import CloseIcon from '../../../assets/icons/cross.svg';

const UploadInput = ({
  label,
  placeholder = 'No files selected',
  value = [],
  onChange,
  error,
  variant = 'default',
  size = 'medium',
  multiple = false,
  accept = 'image/*',
  maxFiles = 5,
  style,
  labelStyle,
  errorStyle,
  disabled = false,
  ...props
}) => {
  const { getScaledFontSize, isDark, colors: themeColors } = useTheme();
  const s9 = getScaledFontSize(9);
  const s10 = getScaledFontSize(10);
  const s12 = getScaledFontSize(12);
  const s14 = getScaledFontSize(14);
  const s16 = getScaledFontSize(16);

const handleUpload = async () => {
  if (disabled) return;

  const hasPermission = await requestPermissions();
  if (!hasPermission) return;

  Alert.alert(
    'Upload Image',
    'Choose an option',
    [
      { text: 'Take a Photo', onPress: () => openCamera() },
      { text: 'Choose from Library', onPress: () => openImageLibrary() },
      { text: 'Cancel', style: 'cancel' }
    ]
  );
};


  const removeFile = (index) => {
    if (disabled) return;
    
    const newFiles = value.filter((_, i) => i !== index);
    onChange(newFiles);
  };

  const requestPermissions = async () => {
  if (disabled) return false;

  const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
  const libraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (cameraStatus.status !== 'granted' || libraryStatus.status !== 'granted') {
    alert('Permissions for camera and library are required.');
    return false;
  }
  return true;
};

const openCamera = async () => {
  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      handleSelectedFiles(result.assets);
    }
  } catch (error) {
    console.log('Error opening camera:', error);
    alert('An error occurred while accessing the camera.');
  }
};

const openImageLibrary = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: multiple,
      quality: 1,
    });

    if (!result.canceled) {
      handleSelectedFiles(result.assets);
    }
  } catch (error) {
    console.log('Error opening library:', error);
    alert('An error occurred while accessing the library.');
  }
};

const handleSelectedFiles = (assets) => {
  let selectedFiles = assets.map(asset => ({
    uri: asset.uri,
    name: asset.fileName || asset.uri.split('/').pop(),
    type: asset.type || 'image/jpeg',
    size: asset.fileSize || 0,
  }));

  if (!multiple) {
    selectedFiles = selectedFiles.slice(0, 1);
  }

  if (value.length + selectedFiles.length > maxFiles) {
    alert(`You can upload up to ${maxFiles} files.`);
    selectedFiles = selectedFiles.slice(0, maxFiles - value.length);
  }

  onChange([...value, ...selectedFiles]);
};


  const getContainerStyle = () => {
    const baseStyle = [styles.inputContainer, styles[`${variant}Container`], styles[size]];
    if (isDark) {
      baseStyle.push({
        backgroundColor: "#2C3A3F",
        borderColor: COLORS.secondaryColor,
      });
    }
    if (error) {
      baseStyle.push(styles.errorContainer);
    }
    if (disabled) {
      baseStyle.push(styles.disabledContainer);
    }
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text, styles[`${size}Text`]];
    if (value.length === 0) {
      baseStyle.push(styles.placeholderText);
    }
    if (isDark) {
      baseStyle.push({ color: themeColors?.textPrimary ?? "#FFFFFF" });
    }
    if (disabled) {
      baseStyle.push(styles.disabledText);
    }

    return baseStyle;
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { fontSize: s14 }, labelStyle]}>
          {label}
        </Text>
      )}
      
      <TouchableOpacity
        style={getContainerStyle()}
        onPress={handleUpload}
        activeOpacity={0.7}
        disabled={disabled}
        {...props}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <UploadClipIcon width={20} height={20} fill={isDark ? "#FFFFFF" : "#6B7280"} stroke={isDark ? "#FFFFFF" : "#6B7280"} />
          </View>
          
          <View style={styles.textContainer}>
<Text style={[getTextStyle(), { fontSize: size === 'large' ? s16 : size === 'small' ? s12 : s14 }]}>
            {value.length > 0 
                ? `${value.length} file${value.length > 1 ? 's' : ''} selected`
                : placeholder
              }
            </Text>
            {value.length > 0 && (
              <Text style={[styles.fileNames, { fontSize: s12 }]}>
                {value.map((file, index) => file.name || `File ${index + 1}`).join(', ')}
              </Text>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.browseButton}
            onPress={handleUpload}
            activeOpacity={0.7}
            disabled={disabled}
          >
            <Text style={[styles.browseButtonText, { fontSize: s16 }]}>Browse</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Selected files preview */}
      {value.length > 0 && (
        <View style={styles.filesPreview}>
          {value.map((file, index) => (
            <View key={index} style={styles.fileItem}>
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { fontSize: s14 }]} numberOfLines={1}>
                  {file.name || `File ${index + 1}`}
                </Text>
                {file.size && (
                  <Text style={[styles.fileSize, { fontSize: s12 }]}>
                    {(file.size / 1024).toFixed(1)} KB
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFile(index)}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <CloseIcon width={14} height={14} fill={COLORS.primaryFontColor} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      
      {error && (
        <Text style={[styles.errorText, { fontSize: s12 }, errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: COLORS.primaryFontColor,
    marginBottom: 8,
    fontFamily: 'Manrope-Medium',
  },
  inputContainer: {
    borderRadius: 8,
    fontFamily: 'Manrope-Regular',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderStyle: 'dashed',
    // backgroundColor:"red"
  },
  // Variant styles
  defaultContainer: {
    borderWidth: Platform.OS === 'ios' ? 0.4 : 1,
    borderColor: '#F8F8F8',
    backgroundColor: '#F8F8F8',
  },
  outlinedContainer: {
    borderWidth: 2,
    borderColor: '#c3f7cfff',
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
    minHeight: 60,
  },
  large: {
    minHeight: 80,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  text: {
    fontSize: 9,
    color: COLORS.primaryFontColor,
    fontFamily: 'Manrope-Regular',
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
  placeholderText: {
    color: '#6E6E6E',
    fontSize:14,
  },
  fileNames: {
    fontSize: 12,
    color: '#6E6E6E',
    marginTop: 2,
    fontFamily: 'Manrope-Regular',
  },
  browseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    // backgroundColor: COLORS.primaryColor,
  },
  browseButtonText: {
    color: COLORS.secondaryColor,
    fontSize: 14,
    // fontWeight:"600",
    fontFamily: 'Manrope-Bold',
  },
  // Files preview
  filesPreview: {
    marginTop: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 6,
    marginBottom: 4,
  },
  fileInfo: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 12,
    color: COLORS.primaryFontColor,
    fontFamily: 'Manrope-Medium',
  },
  fileSize: {
    fontSize: 10,
    color: '#6E6E6E',
    marginTop: 2,
    fontFamily: 'Manrope-Regular',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Disabled styles
  disabledContainer: {
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.6,
  },
  // Error styles
  errorContainer: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Manrope-Regular',
  },
});

export default UploadInput;
