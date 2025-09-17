import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions, 
} from "react-native";
import { COLORS } from "../constants/colors";
import Input from "./global/Input";
import Send from "../../assets/icons/sendMessage.svg";

const TicketChatBox = () => {
  const messages = [
    {
      type: "receiver",
      text: "How may I help you today?",
      time: "17/08/2025, 04:04 PM",
    },
    { type: "sender", text: "Hi Team", time: "17/08/2025, 04:04 PM" },
    {
      type: "sender",
      text: "Can you check meter data?",
      time: "17/08/2025, 04:04 PM",
    },
        {
      type: "sender",
      text: "Can you check meter data?",
      time: "17/08/2025, 04:04 PM",
    },
        {
      type: "sender",
      text: "Can you check meter data?",
      time: "17/08/2025, 04:04 PM",
    },
    {
      type: "receiver",
      text: "How may I help you today?",
      time: "17/08/2025, 04:04 PM",
    },
    { type: "sender", text: "Hi Team", time: "17/08/2025, 04:04 PM" },
    {
      type: "sender",
      text: "Can you check meter data?",
      time: "17/08/2025, 04:04 PM",
    },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1}} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.container]}> 
          {/* Messages */}
          <View style={{ flex: 1}}>{/* New View wrapping ScrollView */}
            <ScrollView
              style={[styles.messageScrollView]} 
              contentContainerStyle={styles.messageScrollContent}
              showsVerticalScrollIndicator={false}
              automaticallyAdjustKeyboardInsets={true} 
            >
              <View style={[styles.chatContainer]}> 
                {messages.map((msg, i) => (
                  <View
                    key={i}
                    style={[
                      msg.type === "receiver" ? styles.recevier : styles.sender,
                      { marginBottom: 8 }, 
                    ]}
                  >
                    <View
                      style={
                        msg.type === "receiver"
                          ? styles.recevierContainer
                          : styles.senderContainer
                      }
                    >
                      <Text
                        style={
                          msg.type === "receiver"
                            ? styles.receviersChatText
                            : styles.senderChatText
                        }
                      >
                        {msg.text}
                      </Text>
                      <Text
                        style={
                          msg.type === "receiver"
                            ? styles.receviersChatTime
                            : styles.senderChatTime
                        }
                      >
                        {msg.time}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>{/* End of new View */}

          {/* Input Box */}
          <View style={[styles.inputContainer]}>
            <Input
              placeholder="Your Message"
              size="medium"
              style={styles.inputBox}
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.sendessageButton}>
                <Send width={18} height={18} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default TicketChatBox;

const styles = StyleSheet.create({
  chatContainer: {

  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 5,
    backgroundColor: COLORS.secondaryFontColor, 
    borderRadius: 5,
    flex: 1, 
    flexDirection: "column", 
    justifyContent: "space-between", 
  },
  messageScrollView: {
    flex: 1, 
  },
  messageScrollContent: {
    paddingBottom: 20, 
  },
  inputContainer: {
    marginTop: 10,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 5,

  },
  inputBox: {
    flex: 1, 
  },
  buttonContainer: {
    position: "absolute",
    right: 12,
    top: 7,
  },
  sendessageButton: {
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 50,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  recevier: {
    alignItems: "flex-start",
    gap: 10,
  },
  sender: {
    alignItems: "flex-end",
    gap: 10,
  },

  recevierContainer: {
    backgroundColor: "#F8F8F8",
    padding: 10,
    borderRadius: 5,
    width: "53%",
    gap: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 1,
  },
  receviersChatText: {
    fontFamily: "Manrope-Medium",
    fontSize: 14,
    color: COLORS.primaryFontColor,
  },
  receviersChatTime: {
    fontFamily: "Manrope-Regular",
    fontSize: 9,
    color: COLORS.primaryFontColor,
  },
  senderContainer: {
    backgroundColor: COLORS.secondaryFontColor,
    padding: 10,
    borderRadius: 5,
    width: "53%",
    gap: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 1,
  },
  senderChatText: {
    fontFamily: "Manrope-Medium",
    fontSize: 14,
    color: COLORS.primaryFontColor,
  },
  senderChatTime: {
    fontFamily: "Manrope-Regular",
    fontSize: 9,
    color: COLORS.primaryFontColor,
  },
});