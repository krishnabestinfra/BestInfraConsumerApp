import { StyleSheet, Text, View, ScrollView } from "react-native";
import { COLORS } from "../constants/colors";
import React, { useState } from "react";
import Button from "../components/global/Button";
import Table from "../components/global/Table";
import CreateNewTicketModal from "../components/global/CreateNewTicketModal";
import OpenIcon from "../../assets/icons/open.svg";
import ProgressIcon from "../../assets/icons/progress.svg";
import ResolvedIcon from "../../assets/icons/resolved.svg";
import ClosedIcon from "../../assets/icons/closed.svg";
import DashboardHeader from "../components/global/DashboardHeader";


const Tickets = ({ navigation }) => {
  const [showModal, setShowModal] = useState(false);

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const tableData = [
    {
      id: 1,
      ticketId: 298,
      issueType: "Connection Issue",
      status: "Open",

    },
    {
      id: 2,
      ticketId: 286,
      issueType: "Meter Issue",
      status: "Closed",
    },
    {
      id: 3,
      ticketId: 278,
      issueType: "Meter Issue",
      status: "Resolved",
    },
  ];

  return (
    <>
      <ScrollView
        style={styles.Container}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >

        <DashboardHeader navigation={navigation} variant="tickets" />
        <View style={styles.TicketContainer}>
          <Text style={styles.usageText}>Tickets</Text>
          <Button
            title="Create New"
            variant="primary"
            size="small"
            textStyle={styles.forgotText}
            onPress={handleOpenModal}
            // onPress={() => navigation.navigate('TicketDetails')}
          />
        </View>

        <View style={styles.TicketContainerTwo}>
          <View style={styles.TicketBox}>
            <View style={styles.TicketBoxTextContainer}>
              <Text style={styles.TicketBoxtext}>Open Tickets</Text>
              <Text style={styles.TicketBoxNumber}>4</Text>
            </View>
            <View style={styles.TicketBoxIcon}>
              <OpenIcon width={16} height={16} fill="#55B56C" />
            </View>
          </View>
          <View style={styles.TicketBox}>
            <View style={styles.TicketBoxTextContainer}>
              <Text style={styles.TicketBoxtext}>In Progress</Text>
              <Text style={styles.TicketBoxNumber}>4</Text>
            </View>
            <View style={styles.TicketBoxIcon}>
              <ProgressIcon width={16} height={16} fill="#55B56C" />
            </View>
          </View>
          <View style={styles.TicketBox}>
            <View style={styles.TicketBoxTextContainer}>
              <Text style={styles.TicketBoxtext}>Resloved</Text>
              <Text style={styles.TicketBoxNumber}>3</Text>
            </View>
            <View style={styles.TicketBoxIcon}>
              <ResolvedIcon width={16} height={16} fill="#55B56C" />
            </View>
          </View>
          <View style={styles.TicketBox}>
            <View style={styles.TicketBoxTextContainer}>
              <Text style={styles.TicketBoxtext}>Closed</Text>
              <Text style={styles.TicketBoxNumber}>1</Text>
            </View>
            <View style={styles.TicketBoxIcon}>
              <ClosedIcon width={16} height={16} fill="#55B56C" />
            </View>
          </View>
        </View>
        <View style={styles.TicketContainerThree}>
          <Table
            data={tableData}
            loading={false}
            emptyMessage="No ticket data available"
            showSerial={true}
            showPriority={true}
            priorityField="issueType"
            priorityMapping={{
              "Connection Issue": "high",
              "Meter Issue": "medium",
              "Billing Issue": "low",
              "Technical Issue": "high"
            }}
            columns={[
              { key: 'ticketId', title: 'Ticket ID', flex: 1 },
              { key: 'issueType', title: 'Issue Type', flex: 2 },
              { key: 'status', title: 'Status', flex: 1 }
            ]}
          />
        </View>
      </ScrollView>

      {/* Create New Ticket Modal */}
      <CreateNewTicketModal
        visible={showModal}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default Tickets;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  bluecontainer: {
    backgroundColor: "#eef8f0",
    padding: 15,
  },
  TopMenu: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 15,
  },
  barsIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    verticalAlign: "middle",
    justifyContent: "center",
    elevation: 5,
    zIndex: 2,
  },
  logoImage: {},
  logo: {
    width: 80,
    height: 80,
    zIndex: 1,
  },
  bellIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    verticalAlign: "middle",
    justifyContent: "center",
    elevation: 5,
    zIndex: 2,
  },
  ProfileBox: {
    display: "flex",
    justifyContent: "space-between",
    flexDirection: "row",
    marginHorizontal: 4,
  },
  TicketContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(186, 190, 204, 0.4)',
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.secondaryFontColor,

    // iOS shadow
    shadowColor: "rgba(0, 0, 0, 0.02)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,

    // Android shadow
    elevation: 5,
  },
  usageText: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Bold",
    fontSize: 14,
  },
  hiText: {
    color: COLORS.primaryFontColor,
    fontSize: 18,
    fontFamily: "Manrope-Bold",
  },
  stayingText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Regular",
  },
  balanceText: {
    color: COLORS.primaryFontColor,
    marginLeft: 20,
    fontSize: 14,
    fontFamily: "Manrope-Regular",
  },
  amountText: {
    color: COLORS.primaryColor,
    fontSize: 20,
    fontFamily: "Manrope-Bold",
  },

  plusBox: {
    marginLeft: 7,
  },
  amountContainer: {
    backgroundColor: COLORS.primaryColor,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderRadius: 8,
    alignItems: "center",
    paddingHorizontal: 15,
  },
  dueText: {
    color: COLORS.secondaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Medium",
  },
  dateText: {
    color: COLORS.secondaryFontColor,
    fontSize: 10,
    fontFamily: "Manrope-Regular",
  },
  greenBox: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 8,
    justifyContent: "space-between",
    paddingHorizontal: 10,
    alignItems: "center",
    padding: 10,
    marginTop: 3,
  },
  payText: {
    color: COLORS.secondaryFontColor,
    fontSize: 16,
    fontFamily: "Manrope-Bold",
  },
  tostayText: {
    color: COLORS.secondaryFontColor,
    fontSize: 16,
    fontFamily: "Manrope-Bold",
  },
  avoidText: {
    color: COLORS.secondaryFontColor,
    fontSize: 10,
    fontFamily: "Manrope-Regular",
  },
  paynowbox: {
    backgroundColor: COLORS.secondaryFontColor,
    height: 35,
    width: 95,
    borderRadius: 5,
    display: "flex",
    justifyContent: "center",
  },
  paynowText: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    textAlign: "center",
    verticalAlign: "middle",
  },
  iconsContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 25,
  },
  individualBox: {
    alignItems: "center",
    width: 85,
  },
  iconBox: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 35,
    elevation: 1,
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxActive: {
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 35,
    elevation: 1,
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    color: COLORS.primaryFontColor,
    fontSize: 10,
    fontFamily: "Manrope-Regular",
    marginTop: 5,
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
  TicketContainerTwo: {
    flexWrap: "wrap",
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    // marginHorizontal: 20,
    marginTop: 15,
    gap: 15
  },
  TicketBox: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: 'rgba(186, 190, 204, 0.4)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    // marginHorizontal: 20,
    // marginTop: 20,
    backgroundColor: COLORS.secondaryFontColor,
    width: "43%",
    height: 80,

  },
  TicketBoxtext: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Medium",
    fontSize: 12,
  },
  TicketBoxNumber: {
    color: COLORS.secondaryColor,
    fontFamily: "Manrope-Bold",
    fontSize: 20,
  },
  TicketBoxIcon: {
    backgroundColor: '#BBE1C4',
    borderRadius: 50,
    // padding: 10,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  TicketBoxTextContainer: {
    height: "100%",
    display: "flex",
    justifyContent: "space-between",
  },
  TicketContainerThree: {
    marginTop: 15,
  },
});
