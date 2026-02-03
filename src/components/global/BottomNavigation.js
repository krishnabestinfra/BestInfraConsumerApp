import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import HomeIcon from '../../../assets/icons/Home.svg';
import ActiveHomeIcon from '../../../assets/icons/activeHome.svg';
import RechargeIcon from '../../../assets/icons/recharge.svg';
import InvoicesIcon from '../../../assets/icons/invoices.svg';
import TicketsIcon from '../../../assets/icons/tickets.svg';
import UsageIcon from '../../../assets/icons/usage.svg';
import WalletActive from '../../../assets/icons/wallet.svg';
import ActiveTicketsIcon from '../../../assets/icons/ticketsWhite.svg';
import ActiveInvoiceIcon from '../../../assets/icons/activeInvoice.svg';
import ActiveUsageIcon from '../../../assets/icons/activeUsageIcon.svg';

const BottomNavigation = ({ navigation }) => {
  const route = useRoute();

  // Navigation configuration - memoized for performance
  const navigationItems = useMemo(() => [
    {
      key: 'home',
      label: 'Home',
      route: 'PostPaidDashboard',
      icon: HomeIcon,
      activeIcon: ActiveHomeIcon,
      iconSize: { width: 20, height: 20 }
    },
    {
      key: 'payments',
      label: 'Recharge',
      route: 'PostPaidRechargePayments',
      icon: RechargeIcon,
      activeIcon: WalletActive,
      iconSize: { width: 20, height: 20 }
    },
    {
      key: 'invoices',
      label: 'Invoices',
      route: 'Invoices',
      icon: InvoicesIcon,
      activeIcon: ActiveUsageIcon,
      iconSize: { width: 20, height: 20 }
    },
    {
      key: 'tickets',
      label: 'Tickets',
      route: 'Tickets',
      icon: TicketsIcon,
      activeIcon: ActiveTicketsIcon,
      iconSize: { width: 20, height: 20 }
    },
    {
      key: 'usage',
      label: 'Usage',
      route: 'Usage',
      icon: UsageIcon,
      activeIcon: ActiveInvoiceIcon,
      iconSize: { width: 20, height: 20 }
    }
  ], []);

  // Map route names to navigation keys
  const getActiveKey = useCallback(() => {
    const routeName = route.name;
    
    // Direct route matches
    if (routeName === 'PostPaidDashboard' || routeName === 'Dashboard') {
      return 'home';
    }
    if (routeName === 'PostPaidRechargePayments' || routeName === 'Payments') {
      return 'payments';
    }
    if (routeName === 'Invoices' || routeName === 'Reports') {
      return 'invoices';
    }
    if (routeName === 'Tickets' || routeName === 'TicketDetails' || routeName === 'ChatSupport') {
      return 'tickets';
    }
    if (routeName === 'Usage') {
      return 'usage';
    }
    
    // Other pages - no active state
    return null;
  }, [route.name]);

  // Handle navigation press - memoized for performance
  const handleNavigationPress = useCallback((item) => {
    if (item.route && navigation) {
      // Use smooth navigation if available
      if (navigation.navigateSmoothly) {
        navigation.navigateSmoothly(item.route);
      } else {
        navigation.navigate(item.route);
      }
    }
  }, [navigation]);

  // Render individual navigation item - memoized for performance
  const renderNavigationItem = useCallback((item) => {
    const activeKey = getActiveKey();
    const isActive = activeKey === item.key;
    const IconComponent = isActive ? item.activeIcon : item.icon;
    const iconColor = isActive ? COLORS.secondaryFontColor : '#55B56C';
    
    return (
      <Pressable 
        key={item.key}
        style={styles.individualBox}
        onPress={() => handleNavigationPress(item)}
      >
        <View style={[
          styles.iconBox,
          isActive && styles.iconBoxActive
        ]}>
          <IconComponent 
            width={item.iconSize.width} 
            height={item.iconSize.height} 
            fill={iconColor} 
          />
        </View>
        <Text style={[
          styles.iconText,
          isActive && styles.iconTextActive
        ]}>
          {item.label}
        </Text>
      </Pressable>
    );
  }, [getActiveKey, handleNavigationPress]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <View style={styles.iconsContainer}>
          {navigationItems.map(renderNavigationItem)}
        </View>
      </View>
      <View style={styles.graySpacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  container: {
    backgroundColor: COLORS.secondaryFontColor,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    paddingBottom: 0,
    elevation: 1,
  },
  graySpacer: {
    height: Platform.OS === 'ios' ? 40 : 40,
    backgroundColor: '#fff',
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  individualBox: {
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 35,
    elevation: 1,
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconBoxActive: {
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 35,
    elevation: 1,
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: COLORS.primaryFontColor,
    fontSize: 10,
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  iconTextActive: {
    color: COLORS.secondaryColor,
    fontFamily: 'Manrope-SemiBold',
  },
});

export default React.memo(BottomNavigation);
