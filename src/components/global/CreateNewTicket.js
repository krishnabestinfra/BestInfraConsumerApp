import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from "react-native";
import { COLORS } from "../../constants/colors";
import SelectDropdown from "./SelectDropdown";
import TextArea from "./TextArea";
import UploadInput from "./UploadInput";
import Button from "./Button";
import Input from "./Input";
import CloseIcon from "../../../assets/icons/cross.svg";
import { useNavigation } from "@react-navigation/native";



const CreateNewTicket = ({ onSubmit, onClose, title = "Create New Ticket"  }) => {
    const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const categories = [
    "Technical Issue",
    "Billing Issue",
    "Connection Issue",
    "Meter Issue",
    "General Inquiry",
  ];

  const handleSubmit = (navigation) => {
    const ticketData = {
      category: selectedCategory,
      subject,
      description,
      files: uploadedFiles,
    };

    if (onSubmit) onSubmit(ticketData);

    setSelectedCategory("");
    setSubject("");
    setDescription("");
    setUploadedFiles([]);
  };

    const handleCancel = (navigate) => {
    // Reset form
    setSelectedCategory('');
    setDescription('');
    setUploadedFiles([]);
    
    if (onClose) {
      onClose();
    }
  };

  return (
    <View style = {styles.NewTicketContainer}>
      <View style ={styles.header}>
            <Text style={styles.NewticketTitle}>{title}</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton}>
            <CloseIcon width={16} height={16} fill="#55B56C" />
          </TouchableOpacity>
        )}
      </View>
    <ScrollView
      style={styles.formContainer}
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <SelectDropdown
        placeholder="Select category"
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
      />

      <TextArea
        placeholder="Describe"
        value={description}
        onChangeText={setDescription}
        variant="default"
        size="medium"
        numberOfLines={4}
        maxLength={500}
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
         variant="outline"
         title="Cancel"
           onPress={() => {
            handleCancel();
            navigation.navigate("Tickets");
           }}
          style={styles.cancelButton}/>
        <Button
          title="Submit"
            onPress={() => {
            handleSubmit();
            navigation.navigate("TicketDetails");
           }}

           style={styles.button}
        />
      </View>
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({

    NewTicketContainer:{
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 8,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    marginHorizontal: 15,
    },
    header: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 20,
  paddingTop: 10,
  marginBottom: 10,
} ,
  
closeButton: {
  borderRadius: 15,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 20,
  paddingVertical:10,
},

  formContainer: {
    backgroundColor: COLORS.secondaryFontColor,
    marginHorizontal: 20,
    marginTop: 20,
  },
    NewticketTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primaryFontColor,
    paddingHorizontal: 20,
    paddingVertical:10,
  },
 
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 20,
    gap: 12,
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
  },

});

export default CreateNewTicket;
