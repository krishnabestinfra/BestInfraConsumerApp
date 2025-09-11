import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { COLORS } from '../../constants/colors';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

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

    if (disabled) {
      baseStyle.push(styles.disabledText);
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
      
      <TouchableOpacity
        style={getContainerStyle()}
        onPress={handleUpload}
        activeOpacity={0.7}
        disabled={disabled}
        {...props}
      >
        <View style={styles.content}>
          <View style={styles.textContainer}>
            <Text style={getTextStyle()}>
              {value.length > 0 
                ? `${value.length} file${value.length > 1 ? 's' : ''} selected`
                : placeholder
              }
            </Text>
            {value.length > 0 && (
              <Text style={styles.fileNames}>
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
            <Text style={styles.browseButtonText}>Browse</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Selected files preview */}
      {value.length > 0 && (
        <View style={styles.filesPreview}>
          {value.map((file, index) => (
            <View key={index} style={styles.fileItem}>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name || `File ${index + 1}`}
                </Text>
                {file.size && (
                  <Text style={styles.fileSize}>
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
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      
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
    paddingVertical: 16,
    borderStyle: 'dashed',
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
    minHeight: 60,
  },
  medium: {
    minHeight: 80,
  },
  large: {
    minHeight: 100,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  text: {
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
    fontSize:20,
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
    fontSize: 17,
    fontWeight:"700",
    fontFamily: 'Manrope-Medium',
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
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: COLORS.secondaryFontColor,
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
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
