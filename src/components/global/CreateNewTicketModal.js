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
import CloseIcon from "../../../assets/icons/cross.svg";
import SelectDropdown from './SelectDropdown';
import TextArea from './TextArea';
import UploadInput from './UploadInput';
import Button from './Button';
import Input from "../global/Input";
const { width, height } = Dimensions.get("window");

const CreateNewTicketModal = ({ visible, onClose, onSubmit }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [subject, setSubject] = useState('');
  const categories = [
    'Technical Issue',
    'Billing Issue', 
    'Connection Issue',
    'Meter Issue',
    'General Inquiry'
  ];

  const handleSubmit = ( navigation ) => {
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
          <View style={styles.modalContainer}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <CloseIcon width={12} height={12} fill="#55B56C" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Create New Ticket</Text>
            
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Category Selection */}
              <SelectDropdown
                placeholder="Select category"
                value={selectedCategory}
                onSelect={setSelectedCategory}
                options={categories}
                variant="default"
                size="medium"
              />
              <Input placeholder="Subject"
              value={subject}
              onChangeText={setSubject}
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
                placeholder="No files selected"
                value={uploadedFiles}
                onChange={setUploadedFiles}
                multiple={true}
                maxFiles={3}
                variant="outlined"
                size="medium"
              />
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <Button
                variant="outline"
                title="Cancel"
                onPress={handleCancel}
                style={styles.cancelButton}
              />
              <Button
                title="Submit"
                // onPress={handleSubmit}
                onPress={() => navigation.navigate('TicketDetails')}
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
  },
  modalWrapper: {
    position: "absolute", // ✅ required
    top: height / 2 - 300, // (400 modal height / 2)
    left: width / 2 - 200, // (300 modal width / 2)
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
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primaryFontColor,
  },
  modalText: {
    marginTop: 15,
    fontSize: 14,
    color: COLORS.primaryFontColor,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
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
