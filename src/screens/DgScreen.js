import { StyleSheet, Text, View, Pressable, ScrollView, TouchableOpacity } from "react-native";
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants/colors";
import { useTheme } from "../context/ThemeContext";
import Menu from "../../assets/icons/bars.svg";
import MenuWhite from "../../assets/icons/menuBarWhite.svg";
import Notification from "../../assets/icons/notification.svg";
import NotificationWhite from "../../assets/icons/NotificationWhite.svg";
import BiLogo from "../../assets/icons/Logo.svg";
import Signal from "../../assets/icons/signal.svg";
import Meter from "../../assets/icons/meterWhite.svg";
import Progress from "../../assets/icons/progress.svg";
import Checkmark from "../../assets/icons/checkmark.svg";
import Cross from "../../assets/icons/cross.svg";
import Calendar from "../../assets/icons/calendar.svg";
import Arrow from "../../assets/icons/arrow.svg";
import Button from "../components/global/Button";

const DgScreen = ({ navigation }) => {
  const { isDark, colors: themeColors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [dgData, setDgData] = useState({
    runningStatus: 'ON',
    fuelLevel: 75,
    currentLoad: 45.2,
    runningHoursToday: 8.5,
    runningHoursMonthly: 156.3,
    dieselConsumption: 12.4,
    batteryVoltage: 24.8,
    lastMaintenance: '2024-01-15',
    nextMaintenance: '2024-02-15',
    
    // DG Tariff Information
    currentTariff: 'DG-2024',
    dgTariffRate: 12.50, // ₹ per kWh
    gridTariffRate: 8.75, // ₹ per kWh
    
    // Consumption Data
    dgConsumption: 156.8, // kWh
    gridConsumption: 234.2, // kWh
    totalConsumption: 391.0, // kWh
    
    // DG Amounts
    dgAmount: 1960.00, // ₹
    gridAmount: 2049.25, // ₹
    totalAmount: 4009.25, // ₹
    
    // DG Charges Breakdown
    dgCharges: {
      baseCharge: 1568.00, // ₹
      fuelSurcharge: 196.00, // ₹
      maintenanceCharge: 120.00, // ₹
      flatCharge: 76.00, // ₹
      additionalCharges: 0.00, // ₹
      total: 1960.00 // ₹
    }
  });

  // Dummy data for charts
  const [fuelConsumptionData] = useState([
    { day: 'Mon', consumption: 8.2 },
    { day: 'Tue', consumption: 9.1 },
    { day: 'Wed', consumption: 7.8 },
    { day: 'Thu', consumption: 10.3 },
    { day: 'Fri', consumption: 11.2 },
    { day: 'Sat', consumption: 6.5 },
    { day: 'Sun', consumption: 5.8 }
  ]);

  const [runningHoursData] = useState([
    { day: 'Mon', hours: 6.2 },
    { day: 'Tue', hours: 7.8 },
    { day: 'Wed', hours: 5.5 },
    { day: 'Thu', hours: 8.9 },
    { day: 'Fri', hours: 9.3 },
    { day: 'Sat', hours: 4.1 },
    { day: 'Sun', hours: 3.8 }
  ]);

  // Info Card Component
  const InfoCard = ({ title, value, unit, icon, status, color }) => (
    <View style={styles.infoCard}>
      <View style={styles.infoCardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
        <Text style={styles.infoCardTitle}>{title}</Text>
      </View>
      <View style={styles.infoCardContent}>
        <Text style={styles.infoCardValue}>{value}</Text>
        {unit && <Text style={styles.infoCardUnit}>{unit}</Text>}
        {status && (
          <View style={[styles.statusBadge, { backgroundColor: status === 'ON' ? COLORS.secondaryColor : COLORS.primaryFontColor }]}>
            <Text style={[styles.statusText, { color: COLORS.secondaryFontColor }]}>{status}</Text>
          </View>
        )}
      </View>
    </View>
  );

  // Amount Card Component
  const AmountCard = ({ title, amount, subtitle, icon, color, isHighlighted }) => (
    <View style={[styles.amountCard, isHighlighted && styles.amountCardHighlighted]}>
      <View style={styles.amountCardHeader}>
        <View style={styles.amountCardTitleContainer}>
          {icon}
          <Text style={styles.amountCardTitle}>{title}</Text>
        </View>
        {isHighlighted && <View style={styles.highlightDot} />}
      </View>
      <Text style={[styles.amountValue, { color: color }]}>{amount}</Text>
      {subtitle && <Text style={styles.amountSubtitle}>{subtitle}</Text>}
    </View>
  );

  // Charge Item Component
  const ChargeItem = ({ title, amount, icon, description }) => (
    <View style={styles.chargeItem}>
      <View style={styles.chargeItemLeft}>
        <View style={styles.chargeIconContainer}>
          {icon}
        </View>
        <View style={styles.chargeItemDetails}>
          <Text style={styles.chargeItemTitle}>{title}</Text>
          {description && <Text style={styles.chargeItemDescription}>{description}</Text>}
        </View>
      </View>
      <Text style={styles.chargeItemAmount}>{amount}</Text>
    </View>
  );

  // Chart Card Component
  const ChartCard = ({ title, data, type }) => (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chartContainer}>
        {type === 'bar' ? (
          <View style={styles.barChart}>
            {data.map((item, index) => (
              <View key={index} style={styles.barItem}>
                <View style={[styles.bar, { height: (item.consumption / 12) * 100 }]} />
                <Text style={styles.barLabel}>{item.day}</Text>
                <Text style={styles.barValue}>{item.consumption}L</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.lineChart}>
            {data.map((item, index) => (
              <View key={index} style={styles.lineItem}>
                <View style={[styles.lineDot, { backgroundColor: COLORS.secondaryColor }]} />
                <Text style={styles.lineLabel}>{item.day}</Text>
                <Text style={styles.lineValue}>{item.hours}h</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <>
      <ScrollView
        style={[styles.Container, isDark && { backgroundColor: themeColors.screen }]}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.bluecontainer, isDark && { backgroundColor: themeColors.screen }]}>
          <View style={styles.TopMenu}>
            <Pressable
              style={[styles.barsIcon, isDark && { backgroundColor: '#1A1F2E' }]}
              onPress={() => navigation.navigate("SideMenu")}
            >
              {isDark ? (
                <MenuWhite width={18} height={18} />
              ) : (
                <Menu width={18} height={18} fill="#202d59" />
              )}
            </Pressable>
            <Pressable onPress={() => navigation.navigate("Dashboard")}>
              <BiLogo width={45} height={45} />
            </Pressable>
            <Pressable
              style={[styles.bellIcon, isDark && { backgroundColor: '#1A1F2E' }]}
              onPress={() => navigation.navigate("Profile")}
            >
              {isDark ? (
                <NotificationWhite width={18} height={18} />
              ) : (
                <Notification width={18} height={18} fill="#202d59" />
              )}
            </Pressable>
          </View>
        </View>

         <View style={styles.DgContainer}>
           <View style={styles.dgHeaderLeft}>
             <View style={[styles.statusIndicator, { backgroundColor: dgData.runningStatus === 'ON' ? COLORS.secondaryColor : COLORS.primaryFontColor }]} />
             <Text style={styles.ViewText}>Diesel Generator Status</Text>
           </View>
           <TouchableOpacity style={styles.refreshButton}>
             <Text style={styles.CreateText}>Refresh</Text>
             <Arrow width={12} height={12} />
           </TouchableOpacity>
         </View>


         {/* DG Charges Breakdown */}
         <View style={styles.section}>
           <Text style={styles.sectionTitle}>DG Charges Breakdown</Text>
           <View style={styles.chargesCard}>
             <ChargeItem
               title="Base DG Charge"
               amount={`₹${dgData.dgCharges.baseCharge.toFixed(2)}`}
               icon={<Meter width={16} height={16} color={COLORS.primaryColor} />}
               description={`${dgData.dgConsumption} kWh × ₹${dgData.dgTariffRate}`}
             />
             <ChargeItem
               title="Fuel Surcharge"
               amount={`₹${dgData.dgCharges.fuelSurcharge.toFixed(2)}`}
               icon={<Progress width={16} height={16} color={COLORS.secondaryColor} />}
               description="12.5% of base charge"
             />
             <ChargeItem
               title="Maintenance Charge"
               amount={`₹${dgData.dgCharges.maintenanceCharge.toFixed(2)}`}
               icon={<Checkmark width={16} height={16} color={COLORS.primaryColor} />}
               description="Monthly maintenance"
             />
             <ChargeItem
               title="Flat Charge"
               amount={`₹${dgData.dgCharges.flatCharge.toFixed(2)}`}
               icon={<Calendar width={16} height={16} color={COLORS.secondaryColor} />}
               description="Fixed monthly charge"
             />
             <ChargeItem
               title="Additional Charges"
               amount={`₹${dgData.dgCharges.additionalCharges.toFixed(2)}`}
               icon={<Cross width={16} height={16} color={COLORS.primaryFontColor} />}
               description="Other applicable charges"
             />
             <View style={styles.totalChargesRow}>
               <Text style={styles.totalChargesLabel}>Total DG Charges</Text>
               <Text style={styles.totalChargesAmount}>₹{dgData.dgCharges.total.toFixed(2)}</Text>
             </View>
           </View>
         </View>

        {/* Status Cards Grid */}
        <View style={styles.cardsGrid}>
          <InfoCard
            title="Running Status"
            value={dgData.runningStatus}
            icon={<Signal width={20} height={20} color={dgData.runningStatus === 'ON' ? COLORS.secondaryColor : COLORS.primaryFontColor} />}
            status={dgData.runningStatus}
            color={dgData.runningStatus === 'ON' ? COLORS.secondaryColor : COLORS.primaryFontColor}
          />
        </View>

        {/* Running Hours Cards */}
        <View style={styles.hoursContainer}>
          <View style={styles.hoursCard}>
            <Text style={styles.hoursTitle}>Today's Running Hours</Text>
            <Text style={styles.hoursValue}>{dgData.runningHoursToday}h</Text>
            <Text style={styles.hoursSubtext}>Last updated: 2 min ago</Text>
          </View>
          
          <View style={styles.hoursCard}>
            <Text style={styles.hoursTitle}>Monthly Running Hours</Text>
            <Text style={styles.hoursValue}>{dgData.runningHoursMonthly}h</Text>
            <Text style={styles.hoursSubtext}>This month</Text>
          </View>
        </View>

        {/* Charts Section */}
        <View style={styles.chartsSection}>
          <ChartCard
            title="Fuel Consumption (Last 7 Days)"
            data={fuelConsumptionData}
            type="bar"
          />
          
          <ChartCard
            title="Running Hours Trend (Last 7 Days)"
            data={runningHoursData}
            type="line"
          />
        </View>

        {/* Maintenance Info */}
        <View style={styles.maintenanceContainer}>
          <Text style={styles.sectionTitle}>Maintenance Schedule</Text>
          <View style={styles.maintenanceCard}>
            <View style={styles.maintenanceItem}>
              <Text style={styles.maintenanceLabel}>Last Maintenance</Text>
              <Text style={styles.maintenanceValue}>{dgData.lastMaintenance}</Text>
            </View>
            <View style={styles.maintenanceItem}>
              <Text style={styles.maintenanceLabel}>Next Maintenance</Text>
              <Text style={[styles.maintenanceValue, { color: COLORS.secondaryColor }]}>{dgData.nextMaintenance}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <View style={styles.buttonContainerInner}>
          <Button 
            title="Start/Stop DG"
            variant="outline"
            size="medium"
            style={styles.button}
            textStyle={styles.buttonText}
          />
          <Button 
            title="View Details"
            variant="primary"
            size="medium"
            style={styles.button}
            textStyle={styles.buttonText}
          />
        </View>
      </View>
    </>
  );
};

export default DgScreen;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: COLORS.secondaryFontColor,
  },
  bluecontainer: {
    backgroundColor: "#eef8f0",
    padding: 15,
  },
  TopMenu: {
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
    justifyContent: "center",
    elevation: 5,
  },
  bellIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
   DgContainer: {
     paddingHorizontal: 20,
     paddingVertical: 20,
     backgroundColor: COLORS.secondaryFontColor,
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     borderRadius: 8,
     shadowColor: "rgba(0, 0, 0, 0.02)",
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 1,
     shadowRadius: 4,
     elevation: 5,
     borderBottomWidth: 1,
     borderBottomColor: 'rgba(186, 190, 204, 0.4)',
   },
   dgHeaderLeft: {
     flexDirection: 'row',
     alignItems: 'center',
   },
   statusIndicator: {
     width: 8,
     height: 8,
     borderRadius: 4,
     marginRight: 8,
   },
   refreshButton: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingHorizontal: 12,
     paddingVertical: 6,
     backgroundColor: COLORS.secondaryLightColor,
     borderRadius: 6,
   },
   section: {
     paddingHorizontal: 20,
     marginBottom: 20,
   },
   tariffContainer: {
     flexDirection: 'row',
     gap: 12,
   },
   tariffCard: {
     flex: 1,
     backgroundColor: '#F8FAFC',
     borderRadius: 12,
     padding: 16,
     borderWidth: 1,
     borderColor: '#E2E8F0',
     alignItems: 'center',
   },
   tariffLabel: {
     fontSize: 12,
     fontFamily: 'Manrope-Medium',
     color: COLORS.primaryFontColor,
     marginBottom: 8,
   },
   tariffValue: {
     fontSize: 16,
     fontFamily: 'Manrope-Bold',
     color: COLORS.primaryFontColor,
     marginBottom: 4,
   },
   tariffRate: {
     fontSize: 14,
     fontFamily: 'Manrope-SemiBold',
     color: COLORS.secondaryColor,
   },
   comparisonContainer: {
     flexDirection: 'row',
     gap: 12,
     marginBottom: 12,
   },
   amountCard: {
     flex: 1,
     backgroundColor: '#F8FAFC',
     borderRadius: 12,
     padding: 16,
     borderWidth: 1,
     borderColor: '#E2E8F0',
   },
   amountCardHighlighted: {
     borderColor: COLORS.primaryColor,
     borderWidth: 2,
   },
   amountCardHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     marginBottom: 8,
   },
   amountCardTitleContainer: {
     flexDirection: 'row',
     alignItems: 'center',
   },
   amountCardTitle: {
     fontSize: 12,
     fontFamily: 'Manrope-Medium',
     color: COLORS.primaryFontColor,
     marginLeft: 6,
   },
   highlightDot: {
     width: 6,
     height: 6,
     borderRadius: 3,
     backgroundColor: COLORS.primaryColor,
   },
   amountValue: {
     fontSize: 18,
     fontFamily: 'Manrope-Bold',
     marginBottom: 4,
   },
   amountSubtitle: {
     fontSize: 12,
     fontFamily: 'Manrope-SemiBold',
     color: COLORS.secondaryColor,
   },
   totalCard: {
     backgroundColor: COLORS.primaryColor,
     borderRadius: 12,
     padding: 16,
     alignItems: 'center',
   },
   totalLabel: {
     fontSize: 12,
     fontFamily: 'Manrope-Medium',
     color: COLORS.secondaryFontColor,
     marginBottom: 4,
   },
   totalValue: {
     fontSize: 20,
     fontFamily: 'Manrope-Bold',
     color: COLORS.secondaryFontColor,
     marginBottom: 4,
   },
   totalAmount: {
     fontSize: 16,
     fontFamily: 'Manrope-SemiBold',
     color: COLORS.secondaryFontColor,
   },
   chargesCard: {
     backgroundColor: '#F8FAFC',
     borderRadius: 12,
     padding: 16,
     borderWidth: 1,
     borderColor: '#E2E8F0',
   },
   chargeItem: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     paddingVertical: 12,
     borderBottomWidth: 1,
     borderBottomColor: '#E2E8F0',
   },
   chargeItemLeft: {
     flexDirection: 'row',
     alignItems: 'center',
     flex: 1,
   },
   chargeIconContainer: {
     width: 32,
     height: 32,
     borderRadius: 16,
     backgroundColor: '#F1F5F9',
     alignItems: 'center',
     justifyContent: 'center',
     marginRight: 12,
   },
   chargeItemDetails: {
     flex: 1,
   },
   chargeItemTitle: {
     fontSize: 14,
     fontFamily: 'Manrope-SemiBold',
     color: COLORS.primaryFontColor,
     marginBottom: 2,
   },
   chargeItemDescription: {
     fontSize: 12,
     fontFamily: 'Manrope-Regular',
     color: '#64748B',
   },
   chargeItemAmount: {
     fontSize: 14,
     fontFamily: 'Manrope-Bold',
     color: COLORS.primaryColor,
   },
   totalChargesRow: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     paddingTop: 12,
     borderTopWidth: 1,
     borderTopColor: '#E2E8F0',
     marginTop: 8,
   },
   totalChargesLabel: {
     fontSize: 14,
     fontFamily: 'Manrope-Bold',
     color: COLORS.primaryFontColor,
   },
   totalChargesAmount: {
     fontSize: 16,
     fontFamily: 'Manrope-Bold',
     color: COLORS.primaryColor,
   },
  ViewText: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Bold",
    fontSize: 14,
  },
  CreateText: {
    color: COLORS.secondaryColor,
    fontFamily: "Manrope-Bold",
    fontSize: 12,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 15,
  },
  infoCard: {
    width: '47%',
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 12,
    padding: 16,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(186, 190, 204, 0.2)',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  infoCardTitle: {
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    color: COLORS.primaryFontColor,
    flex: 1,
  },
  infoCardContent: {
    alignItems: 'flex-start',
  },
  infoCardValue: {
    fontSize: 20,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
    marginBottom: 4,
  },
  infoCardUnit: {
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    color: COLORS.primaryFontColor,
    opacity: 0.7,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Manrope-Bold",
  },
  hoursContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 15,
    marginBottom: 20,
  },
  hoursCard: {
    flex: 1,
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 12,
    padding: 16,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(186, 190, 204, 0.2)',
  },
  hoursTitle: {
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    color: COLORS.primaryFontColor,
    marginBottom: 8,
  },
  hoursValue: {
    fontSize: 24,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryColor,
    marginBottom: 4,
  },
  hoursSubtext: {
    fontSize: 10,
    fontFamily: "Manrope-Medium",
    color: COLORS.primaryFontColor,
    opacity: 0.6,
  },
  consumptionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  consumptionCard: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 12,
    padding: 16,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(186, 190, 204, 0.2)',
  },
  consumptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  consumptionTitle: {
    fontSize: 14,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
    marginLeft: 8,
  },
  consumptionValue: {
    fontSize: 28,
    fontFamily: "Manrope-Bold",
    color: COLORS.secondaryColor,
    marginBottom: 4,
  },
  consumptionSubtext: {
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    color: COLORS.primaryFontColor,
    opacity: 0.6,
  },
  chartsSection: {
    paddingHorizontal: 20,
    gap: 20,
    marginBottom: 20,
  },
  chartCard: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 12,
    padding: 16,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(186, 190, 204, 0.2)',
  },
  chartTitle: {
    fontSize: 14,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
    marginBottom: 16,
  },
  chartContainer: {
    height: 120,
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 20,
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 10,
    fontFamily: "Manrope-Medium",
    color: COLORS.primaryFontColor,
    marginBottom: 2,
  },
  barValue: {
    fontSize: 8,
    fontFamily: "Manrope-Medium",
    color: COLORS.primaryFontColor,
    opacity: 0.7,
  },
  lineChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '100%',
  },
  lineItem: {
    alignItems: 'center',
    flex: 1,
  },
  lineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  lineLabel: {
    fontSize: 10,
    fontFamily: "Manrope-Medium",
    color: COLORS.primaryFontColor,
    marginBottom: 2,
  },
  lineValue: {
    fontSize: 8,
    fontFamily: "Manrope-Medium",
    color: COLORS.primaryFontColor,
    opacity: 0.7,
  },
  maintenanceContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
    marginBottom: 12,
  },
  maintenanceCard: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 12,
    padding: 16,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(186, 190, 204, 0.2)',
  },
  maintenanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(186, 190, 204, 0.2)',
  },
  maintenanceLabel: {
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    color: COLORS.primaryFontColor,
  },
  maintenanceValue: {
    fontSize: 12,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: COLORS.secondaryFontColor
  },
  buttonContainerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    width: '48%',
  },
  buttonText: {
    fontFamily: "Manrope-Bold",
  }
});