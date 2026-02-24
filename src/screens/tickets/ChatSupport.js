import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { Easing } from "react-native-reanimated";
import Menu from "../../../assets/icons/bars.svg";
import MenuWhite from "../../../assets/icons/menuBarWhite.svg";
import Notification from "../../../assets/icons/notification.svg";
import NotificationWhite from "../../../assets/icons/NotificationWhite.svg";
import CrossIcon from "../../../assets/icons/crossWhite.svg";
import SendIcon from "../../../assets/icons/messageSend.svg";
import Logo from "../../components/global/Logo";
import BottomNavigation from "../../components/global/BottomNavigation";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import { getUser } from "../../utils/storage";
import ChatIcon from "../../../assets/icons/chatIcon.svg";

const RING_COUNT = 20;
const RING_DELAY = 800;
const ANIMATION_DURATION = 5000;
const GAP_ABOVE_BOTTOM = 10;
const BOTTOM_NAV_HEIGHT = 112;

const Ring = ({ index, progress }) => {
  const ringStyle = useAnimatedStyle(() => {
    const delay = index * RING_DELAY;
    const localProgress =
      Math.max(0, progress.value - delay) / ANIMATION_DURATION;
    const clamped = Math.min(localProgress, 1);

    return {
      opacity: interpolate(clamped, [0, 0.1, 1], [0, 0.6, 0]),
      transform: [
        {
          scale: interpolate(clamped, [0, 1], [0.4, 4]),
        },
      ],
    };
  });

  return <Animated.View style={[styles.ring, ringStyle]} />;
};

const ChatSupport = ({ navigation, route }) => {
  const { isDark, colors: themeColors } = useTheme();
  const progress = useSharedValue(0);
  const scrollViewRef = useRef(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const { ticketId, ticketData } = route?.params || {};

  const loopAnimation = () => {
    progress.value = 0;
    progress.value = withTiming(
      RING_DELAY * (RING_COUNT - 1) + ANIMATION_DURATION,
      {
        duration: RING_DELAY * (RING_COUNT - 1) + ANIMATION_DURATION,
        easing: Easing.inOut(Easing.ease),
      },
      () => runOnJS(loopAnimation)()
    );
  };

  useEffect(() => {
    loopAnimation();
  }, []);

  // Scroll to bottom on initial load
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  const handleSendMessage = () => {
    if (message.trim() === "") return;

    const now = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).toLowerCase();

    const newMessage = {
      id: messages.length + 1,
      sender: "user",
      text: message.trim(),
      time: now,
    };

    const name = ticketData?.name ?? ticketData?.customerName ?? "—";
    const phone = ticketData?.phone ?? ticketData?.customerPhone ?? "—";
    const email = ticketData?.email ?? ticketData?.customerEmail ?? "—";
    const contactReply =
      "Thank you for your message. For assistance, please contact:\n\nName: " +
      name +
      "\nPhone: " +
      phone +
      "\nEmail: " +
      email;

    const replyMessage = {
      id: messages.length + 2,
      sender: "support",
      senderName: "Support Team",
      text: contactReply,
      time: now,
    };

    setMessages([...messages, newMessage, replyMessage]);
    setMessage("");
    Keyboard.dismiss();

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const keyExtractor = useCallback((item) => String(item.id), []);
  const renderItem = useCallback(({ item: msg }) => {
    const isSupport = msg.sender === "support";
    return (
      <View
        style={[
          styles.messageWrapper,
          isSupport ? styles.supportMessageWrapper : styles.userMessageWrapper,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isSupport ? styles.supportBubble : styles.userBubble,
          ]}
        >
          {isSupport && msg.senderName && (
            <Text style={styles.senderName}>{msg.senderName}</Text>
          )}
          <Text style={[
            styles.messageText,
            isSupport ? styles.supportMessageText : styles.userMessageText,
          ]}>
            {msg.text}
          </Text>
          <Text style={[
            styles.messageTime,
            isSupport ? styles.supportMessageTime : styles.userMessageTime,
          ]}>
            {msg.time}
          </Text>
        </View>
      </View>
    );
  }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);
  const onContentSizeChange = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: false });
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark && { backgroundColor: themeColors.screen }]}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      keyboardVerticalOffset={GAP_ABOVE_BOTTOM}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={[styles.headerButton, isDark && { backgroundColor: '#1A1F2E' }]}
          onPress={() => navigation.navigate("SideMenu")}
        >
          {isDark ? (
            <MenuWhite width={18} height={18} />
          ) : (
            <Menu width={18} height={18} fill="#202d59" />
          )}
        </Pressable>

        <View style={styles.logoWrapper}>
          {Array.from({ length: RING_COUNT }).map((_, index) => (
            <Ring key={index} index={index} progress={progress} />
          ))}
          <Logo variant={isDark ? "white" : "blue"} size="medium" />
        </View>

        <Pressable
          style={[styles.headerButton, isDark && { backgroundColor: '#1A1F2E' }]}
          onPress={() => navigation.navigate("Notifications")}
        >
          {isDark ? (
            <NotificationWhite width={18} height={18} />
          ) : (
            <Notification width={18} height={18} fill="#202d59" />
          )}
        </Pressable>
      </View>

      {/* Chat Support Header Bar */}
      <View style={styles.chatHeader}>
        <View style={styles.chatHeaderLeft}>
          <View style={styles.chatIconWrapper}>
            <ChatIcon width={20} height={20} fill="#FFFFFF" />
          </View>
          <Text style={styles.chatHeaderTitle}>Chat Support</Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <CrossIcon width={24} height={24} fill="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.chatAreaWrap}>
        <View style={[styles.whiteContainer, isDark && { backgroundColor: themeColors.screen }]}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onLayout={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: false });
              }, 100);
            }}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.map(renderMessage)}
          </ScrollView>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Your Message"
                placeholderTextColor="#9CA3AF"
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendMessage}
                activeOpacity={0.7}
              >
                <SendIcon width={22} height={22} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={[styles.chatBottomGap, { height: BOTTOM_NAV_HEIGHT + GAP_ABOVE_BOTTOM }]} />
      </View>

      <BottomNavigation navigation={navigation} />

    </KeyboardAvoidingView>
  );
};

export default ChatSupport;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF8F0",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 75,
    paddingBottom: 20,
    paddingHorizontal: 30,
  },
  headerButton: {
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
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ring: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: "#BABECC66",
    opacity: 0.2,
  },
  chatHeader: {
    backgroundColor: COLORS.secondaryColor,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 30,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
    gap: 10,
  chatHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  chatIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  chatIconText: {
    fontSize: 16,
  },
  chatHeaderTitle: {
    marginLeft: 10,
    fontSize: 16,
    fontFamily: "Manrope-SemiBold",
    color: "#FFFFFF",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chatBottomGap: {
    height: 106,
    marginBottom: 106, 
  },
  chatAreaWrap: {
    flex: 1,
  },
  whiteContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 30,
    borderRadius: 5,
    overflow: "hidden",
    zIndex: 1,
    elevation: 2,
  },
  chatBottomGap: {
    backgroundColor: "transparent",
  },
  messagesContainer: {
    flex: 1,
    paddingTop: 10,
  },
  messagesContent: {
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  messageWrapper: {
    maxWidth: "85%",
    marginBottom: 16,
  },
  supportMessageWrapper: {
    alignSelf: "flex-start",
  },
  userMessageWrapper: {
    alignSelf: "flex-end",
  },
  messageBubble: {
    borderRadius: 12,
    padding: 14,
  },
  supportBubble: {
    backgroundColor: "#F3F4F6",
    borderTopRightRadius: 10 ,
    borderTopLeftRadius: 0 ,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  userBubble: {
    backgroundColor: "#F3F8FF",
    borderTopRightRadius: 0 ,
    borderTopLeftRadius: 10 ,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  senderName: {
    fontSize: 13,
    fontFamily: "Manrope-SemiBold",
    color: COLORS.secondaryColor,
    marginBottom: 6,
  },
  messageText: {
    fontSize: 14,
    fontFamily: "Manrope-Regular",
    lineHeight: 20,
  },
  supportMessageText: {
    color: COLORS.primaryFontColor,
  },
  userMessageText: {
    color: COLORS.primaryFontColor,
  },
  messageTime: {
    fontSize: 11,
    fontFamily: "Manrope-Regular",
    marginTop: 8,
  },
  supportMessageTime: {
    color: "#9CA3AF",
  },
  userMessageTime: {
    color: "#9CA3AF",
    textAlign: "right",
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 16 + GAP_ABOVE_BOTTOM,
    backgroundColor: "#FFFFFF",
    zIndex: 2,
    elevation: 3,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:"#F8F8F8",
    borderRadius: 5,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 5,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Manrope-Regular",
    color: COLORS.primaryFontColor,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondaryColor,
    alignItems: "center",
    justifyContent: "center",
  },
});
 