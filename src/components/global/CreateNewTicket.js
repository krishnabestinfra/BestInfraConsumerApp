import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
} from "react-native";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import SelectDropdown from "./SelectDropdown";
import TextArea from "./TextArea";
import UploadInput from "./UploadInput";
import Button from "./Button";
import Input from "./Input";
import CloseIcon from "../../../assets/icons/cross.svg";

const CreateNewTicket = ({
  onSubmit,
  onClose,
  title = "Create New Ticket",
}) => {
  const { getScaledFontSize, isDark, colors: themeColors } = useTheme();
  const s18 = getScaledFontSize(18);
  const modalDarkBg = "#1A1F2E";
  const inputDarkBg = "#2C3A3F";
  const darkInputContainer = isDark
    ? { backgroundColor: inputDarkBg, borderColor: inputDarkBg }
    : undefined;
  const [selectedCategory, setSelectedCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormComplete =
    subject.trim() !== "" &&
    selectedCategory !== "" &&
    priority !== "" &&
    description.trim() !== "";

  // Display labels for dropdown; values are sent in the POST as ticket category/type
  const categories = useMemo(
    () => [
      { label: "Bug Report", value: "BUG_REPORT" },
      { label: "Feature Request", value: "FEATURE_REQUEST" },
      { label: "Technical Issue", value: "TECHNICAL_ISSUE" },
      { label: "Billing Issue", value: "BILLING_ISSUE" },
      { label: "General Inquiry", value: "GENERAL_INQUIRY" },
      { label: "Complaint", value: "COMPLAINT" },
      { label: "Suggestion", value: "SUGGESTION" },
      { label: "Other", value: "OTHER" },
    ],
    []
  );
  const priorities = useMemo(() => ["Low", "Medium", "High"], []);

  const handleSubmit = async () => {
    const ticketData = {
      subject,
      category: selectedCategory,
      description,
      priority: priority || "HIGH",
      files: uploadedFiles,
    };

    if (!onSubmit) return;
    setIsSubmitting(true);
    try {
      const success = await onSubmit(ticketData);
      if (success) {
        setSelectedCategory("");
        setSubject("");
        setDescription("");
        setPriority("");
        setUploadedFiles([]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedCategory("");
    setSubject("");
    setDescription("");
    setPriority("");
    setUploadedFiles([]);

    if (onClose) {
      onClose();
    }
  };

  return (
    <View style={[
      styles.NewTicketContainer,
      isDark && { backgroundColor: modalDarkBg },
    ]}>
      <View style={styles.header}>
        <Text style={[
          styles.NewticketTitle,
          { fontSize: s18 },
          isDark && { color: "#FFFFFF" },
        ]}>
          {title}
        </Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <CloseIcon width={16} height={16} fill={isDark ? "#FFFFFF" : undefined} />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        style={[styles.formContainer, isDark && { backgroundColor: modalDarkBg }]}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Input
          placeholder="Subject"
          value={subject}
          onChangeText={setSubject}
          containerStyle={darkInputContainer}
          inputStyle={isDark ? { color: themeColors?.textPrimary ?? "#FFFFFF" } : undefined}
        />

        <SelectDropdown
          placeholder="Select category"
          value={selectedCategory}
          onSelect={setSelectedCategory}
          options={categories}
          variant="default"
          size="medium"
        />

        <SelectDropdown
          placeholder="Priority"
          value={priority}
          onSelect={setPriority}
          options={priorities}
          variant="default"
          size="medium"
        />

        <TextArea
          placeholder="Describe"
          value={description}
          onChangeText={setDescription}
          variant="default"
          size="medium"
          numberOfLines={4}
          maxLength={1000}
        />

        <UploadInput
          placeholder="No files selected"
          value={uploadedFiles}
          onChange={setUploadedFiles}
          multiple={true}
          maxFiles={3}
          variant="outlined"
          size="medium"
        />

        <View style={styles.buttonRow}>
          <Button
            variant={isSubmitting || isFormComplete ? "primary" : "outline"}
            title="Submit"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={[styles.button, !isFormComplete && !isSubmitting && styles.submitButton]}
          />
        </View>
      </ScrollView>
    </View>

  );
};

const styles = StyleSheet.create({
  NewTicketContainer: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 8,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 100,
    flexDirection: "column",
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 20
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    // marginBottom: 10,
  },

  closeButton: {
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  formContainer: {
    backgroundColor: COLORS.secondaryFontColor,
    marginHorizontal: 20,
    marginTop: 20,
  },
  NewticketTitle: {
    fontSize: 18,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  button: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: "transparent",
  },
  cancelButton: {
    flex: 1,
  },
});

CreateNewTicket.displayName = "CreateNewTicket";

export default React.memo(CreateNewTicket);
