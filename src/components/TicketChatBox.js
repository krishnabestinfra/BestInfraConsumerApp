import React from 'react'
import { View, Text, StyleSheet,Button } from 'react-native'
import { COLORS } from '../constants/colors'
import Input from './global/Input'
// import Button from './global/Button'
import { TouchableOpacity } from 'react-native'
import Send from '../../assets/icons/sendMessage.svg'
const TicketChatBox = () => {
    return (
        <View style={styles.container}>
            <View style={styles.recevier}>
            <View style={styles.recevierContainer}>
                <Text style={styles.receviersChatText}>How may I help you today?</Text>
                <Text style={styles.receviersChatTime}>17/08/2025, 04:04 PM</Text>
            </View>
            </View>
            <View style={styles.sender}>
            <View style={styles.senderContainer}>
                <Text style={styles.senderChatText}>Hi Team</Text>
                <Text style={styles.senderChatTime}>17/08/2025, 04:04 PM</Text>
            </View>
            <View style={styles.senderContainer}>
                <Text style={styles.senderChatText}>Can you check meter data?</Text>
                <Text style={styles.senderChatTime}>17/08/2025, 04:04 PM</Text>
            </View>
            </View>
         

            <View style={styles.inputContainer}>
                <Input placeholder="Your Message" size="medium" style={styles.inputBox}/>
                <View style={styles.buttonContainer}>   
                    <TouchableOpacity style={styles.sendessageButton}>
                        <Send width={18} height={18} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

export default TicketChatBox

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 5,
        backgroundColor: COLORS.secondaryFontColor,
        borderRadius: 5,
        gap: 10,
        height: "72%",
        overflow: "scroll",
        justifyContent: "flex-end",
    },
    inputContainer: {
        marginTop: 10,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        // backgroundColor: "red",
        position: "relative",
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
    recevier:{
        alignItems: "flex-start",
        gap: 10,
    },
    sender:{
        alignItems: "flex-end",
        gap: 10,
    },
    // recevierContainer:{
    //     backgroundColor: '#F8F8F8',
    //     padding: 10,
    //     borderRadius: 5,
    //     width: "53%",
    //     elevation: 1,
    //     gap: 5,
    
    // },
    recevierContainer: {
        backgroundColor: '#F8F8F8',
        padding: 10,
        borderRadius: 5,
        width: "53%",
        gap: 5,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 1,
      },
    receviersChatText:{
        fontFamily: "Manrope-Medium",
        fontSize: 14,
        color: COLORS.primaryFontColor,
    },
    receviersChatTime:{
        fontFamily: "Manrope-Regular",
        fontSize: 9,
        color: COLORS.primaryFontColor,
    },
    senderContainer:{
        backgroundColor: COLORS.secondaryFontColor,
        padding: 10,
        borderRadius: 5,
        width: "53%",
        gap: 5,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 1,
    },
    senderChatText:{
        fontFamily: "Manrope-Medium",
        fontSize: 14,
        color: COLORS.primaryFontColor,
    },
    senderChatTime:{
        fontFamily: "Manrope-Regular",
        fontSize: 9,
        color: COLORS.primaryFontColor,
    }
})