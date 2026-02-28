import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import CloseIcon from "../../../assets/icons/cross.svg";
import SelectDropdown from './SelectDropdown';
import TextArea from './TextArea';
import UploadInput from './UploadInput';
import Button from './Button';
import Input from "../global/Input";
const { width, height } = Dimensions.get("window");

const CreateNewTicketModal = ({ visible, onClose, onSubmit, isDark: isDarkProp }) => {
  const { getScaledFontSize, isDark: isDarkTheme, colors: themeColors } = useTheme();
  const isDark = isDarkProp ?? isDarkTheme;
  const s18 = getScaledFontSize(18);
  const s14 = getScaledFontSize(14);
  // Modal dark: #1A1F2E per design; input boxes: #2C3A3F (dark teal, not blue)
  const modalDarkBg = "#1A1F2E";
  const inputDarkBg = "#2C3A3F";
  const darkInputContainer = isDark
    ? { backgroundColor: inputDarkBg, borderColor: inputDarkBg }
    : undefined;
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [subject, setSubject] = useState('');
  const isFormComplete =
    subject.trim() !== '' &&
    selectedCategory !== '' &&
    description.trim() !== '';

  const categories = [
    'Technical Issue',
    'Billing Issue', 
    'Connection Issue',
    'Meter Issue',
    'General Inquiry'
  ];

  const handleSubmit = () => {
    const ticketData = {
      category: selectedCategory,
      description: description,
      files: uploadedFiles
    };
    
    if (onSubmit) {
      onSubmit(ticketData);
    }
    
    // Reset form
    setSelectedCategory('');
    setDescription('');
    setUploadedFiles([]);
    
    if (onClose) {
      onClose();
    }
  
  };

  const handleCancel = () => {
    // Reset form
    setSelectedCategory('');
    setDescription('');
    setUploadedFiles([]);
    
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalWrapper}>
          <View style={[
            styles.modalContainer,
            isDark && { backgroundColor: modalDarkBg },
          ]}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <CloseIcon width={12} height={12} fill={isDark ? "#FFFFFF" : "#55B56C"} />
            </TouchableOpacity>

            <Text style={[
              styles.modalTitle,
              { fontSize: s18 },
              isDark && { color: "#FFFFFF" },
            ]}>
              Create New Ticket
            </Text>

            <ScrollView
              style={[styles.scrollContent, isDark && { backgroundColor: modalDarkBg }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {/* Category Selection */}
              <SelectDropdown
                placeholder="Select Category"
                value={selectedCategory}
                onSelect={setSelectedCategory}
                options={categories}
                variant="default"
                size="medium"
              />
              <Input
                placeholder="Subject"
                value={subject}
                onChangeText={setSubject}
                containerStyle={darkInputContainer}
                inputStyle={isDark ? { color: themeColors?.textPrimary ?? "#FFFFFF" } : undefined}
              />

              {/* Description */}
              <TextArea
                placeholder="Describe"
                value={description}
                onChangeText={setDescription}
                variant="default"
                size="medium"
                numberOfLines={4}
                maxLength={500}
              />

              {/* File Upload */}
              <UploadInput
                placeholder="No files Selected"
                value={uploadedFiles}
                onChange={setUploadedFiles}
                multiple={true}
                maxFiles={3}
                variant="outlined"
                size="medium"
              />
            </ScrollView>

            {/* Action Buttons */}
            <View style={[styles.buttonContainer, isDark && { backgroundColor: modalDarkBg }]}>
              <Button
                variant="outline"
                title="Cancel"
                onPress={handleCancel}
                style={styles.cancelButton}
              />
              <Button
                variant={isFormComplete ? "primary" : "outline"}
                title="Submit"
                onPress={handleSubmit}
                style={styles.submitButton}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent:"end",
    alignItems:"end",
    position:'relative'

  },
  modalWrapper: {
     position: "absolute", // ✅ required
    top: height / 2 - 300, // (400 modal height / 2)
    left: width / 2 - 200, // (300 modal width / 2)
    justifyContent:"flex-start",
    alignItems:"flex-start",
  },
  modalContainer: {
    width: 400,
    height: 550,
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 5,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },

  modalText: {
    marginTop: 15,
    fontSize: 14,
    color: COLORS.primaryFontColor,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    maxHeight: height * 0.5,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});

export default CreateNewTicketModal;
