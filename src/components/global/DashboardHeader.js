import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Image } from 'react-native';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import Hand from '../../../assets/icons/hand.svg';
import Arrow from '../../../assets/icons/arrow.svg';
import Plus from '../../../assets/icons/plus.svg';
import Menu from '../../../assets/icons/bars.svg';
import MenuWhite from '../../../assets/icons/menuBarWhite.svg';
import Notification from '../../../assets/icons/notification.svg';
import NotificationWhite from '../../../assets/icons/NotificationWhite.svg';
import BackIcon from '../../../assets/icons/Back.svg';
import BackIconWhite from '../../../assets/icons/BackWhite.svg';
import { getUser, getConsumerDisplayName, cleanupStoredUserData } from '../../utils/storage';
import { getCachedConsumerData, backgroundSyncConsumerData } from '../../utils/cacheManager';
import { cacheManager } from '../../utils/cacheManager';
import { useLoading } from '../../utils/loadingManager';
import { useNotifications } from '../../context/NotificationsContext';
import Logo from './Logo';
import AnimatedRings from './AnimatedRings';

const DashboardHeader = React.memo(({ 
  navigation, 
  showRings = true,
  variant = 'default', // 'default', 'payments', 'tickets', 'usage', 'invoices'
  showBalance = true, // Control balance section visibility
  consumerData = null, // API consumer data
  isLoading = false, // Loading state
  rightIcon = 'notification', // 'notification' | 'back' - back icon for Terms/Privacy screens
  showProfileSection = true, // Hide greeting/balance for legal pages
}) => {
  const { isDark, colors: themeColors, getScaledFontSize } = useTheme();
  const [userName, setUserName] = useState('');
  const scaledHi = getScaledFontSize(18);
  const scaledStaying = getScaledFontSize(14);
  const scaledAmount = getScaledFontSize(20);
  const scaledBadge = getScaledFontSize(10);
  const [cachedConsumerData, setCachedConsumerData] = useState(null);
  const { isLoading: isUserLoading, setLoading: setUserLoading } = useLoading('user_loading', true);

    const getGreeting = () => {
    const hour = new Date().getHours(); // 0-23
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  
  // Helper function to format amount
  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return "₹0.00";
    return `₹${Math.abs(amount).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };
  
  // Get notification data from context
  const { unreadCount, isLoading: isNotificationsLoading } = useNotifications();


  useEffect(() => {
    const loadUser = async () => {
      try {
        setUserLoading(true);
        // Clean up any stored UIDs in user data
        await cleanupStoredUserData();
        const user = await getUser();
        
        if (user && user.identifier) {
          // Check preloaded data first (ultra-fast)
          const preloadedData = await cacheManager.getCachedData('consumer_data', user.identifier);
          if (preloadedData.success) {
            setCachedConsumerData(preloadedData.data);
            setUserName(preloadedData.data.name || user.name || 'Consumer');
            setUserLoading(false, 50); // Minimum 50ms loading time
            console.log('⚡ DashboardHeader: Using preloaded data');
          } else {
            // Try cached data
            const cachedResult = await getCachedConsumerData(user.identifier);
            if (cachedResult.success) {
              setCachedConsumerData(cachedResult.data);
              setUserName(cachedResult.data.name || user.name || 'Consumer');
              setUserLoading(false, 100);
              console.log('⚡ DashboardHeader: Using cached data');
            } else if (user.name) {
              setUserName(user.name);
              setUserLoading(false, 50);
            }
          }
          
          // Background sync to get fresh data
          backgroundSyncConsumerData(user.identifier).then((result) => {
            if (result.success) {
              setCachedConsumerData(result.data);
              setUserName(result.data.name || user.name || 'Consumer');
            }
          }).catch(error => {
            console.error('Background sync failed:', error);
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setUserLoading(false, 50);
      }
    };
    loadUser();
  }, [setUserLoading]);

  // Refresh user data when consumerData changes
  useEffect(() => {
    if (consumerData && consumerData.name) {
      setUserName(consumerData.name);
    }
  }, [consumerData]);

  // Get the display name with proper fallback logic - memoized for performance
  const getDisplayName = useCallback(() => {
    // Use cached data first, then API data, then stored name
    const dataSource = cachedConsumerData || consumerData;
    return getConsumerDisplayName(dataSource, userName, isLoading || isUserLoading);
  }, [cachedConsumerData, consumerData, userName, isLoading, isUserLoading]);

  const headerBg = isDark ? themeColors.headerBg : undefined;
  const iconFill = isDark ? '#FFFFFF' : '#202d59';
  const iconWrapperBg = isDark ? '#1A1F2E' : undefined;
  const handFill = isDark ? themeColors.accent : '#55B56C';
  const hiStyle = [styles.hiText, { fontSize: scaledHi }, isDark && { color: themeColors.textPrimary }];
  const stayingStyle = [styles.stayingText, { fontSize: scaledStaying }, isDark && { color: themeColors.textSecondary }];
  const balanceStyle = [styles.balanceText, { fontSize: scaledStaying }, isDark && { color: themeColors.textSecondary }];
  const amountStyle = [styles.amountText, { fontSize: scaledAmount }, isDark && { color: themeColors.textPrimary }];
  const plusFill = isDark ? themeColors.accent : '#55B56C';

  const MenuIcon = isDark ? MenuWhite : Menu;
  const NotificationIcon = isDark ? NotificationWhite : Notification;

  return (
    <View style={[styles.bluecontainer, headerBg && { backgroundColor: headerBg }]}>
      <View style={styles.TopMenu}>
        <Pressable
          style={[styles.barsIcon, iconWrapperBg && { backgroundColor: iconWrapperBg }]}
          onPress={() => navigation.navigate('SideMenu')}
        >
          <MenuIcon width={18} height={18} fill={isDark ? undefined : iconFill} />
        </Pressable>
        
        <Pressable style={styles.logoWrapper} onPress={() => navigation.navigate('PostPaidDashboard')}>
          {showRings && <AnimatedRings />}
          <View style={styles.logoOnTop}>
            <Logo variant={isDark ? 'white' : 'blue'} size="medium" />
          </View>
        </Pressable>
        
        <Pressable
          style={styles.bellWrapper}
          onPress={() => rightIcon === 'back' ? navigation.goBack() : navigation.navigate('Profile')}
        >
          <View style={[styles.bellIcon, iconWrapperBg && { backgroundColor: iconWrapperBg }]}>
            {rightIcon === 'back' ? (
              isDark ? (
                <BackIconWhite width={20} height={20} />
              ) : (
                <BackIcon width={20} height={20} fill={iconFill} />
              )
            ) : (
              <NotificationIcon width={18} height={18} fill={isDark ? undefined : iconFill} />
            )}
          </View>
          {rightIcon !== 'back' && unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={[styles.badgeText, { fontSize: scaledBadge }]}>{unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>
      
      {showProfileSection && (
      <View style={styles.ProfileBox}>
        <View>
          <View style={styles.greetingContainer}>
            <Text style={hiStyle}>
              Hi, {getGreeting()}{" "}
            </Text>
            <Hand width={30} height={30} fill={handFill} />
          </View>
          <Text style={stayingStyle}>Staying efficient today?</Text>
        </View>

        {showBalance && (
          <View>
            <Text style={balanceStyle}>Balance</Text>
            <View style={styles.balanceContainer}>
              <Text style={amountStyle}>
                {isLoading ? "Loading..." : formatAmount((cachedConsumerData || consumerData)?.totalOutstanding)}
              </Text>
              <View style={styles.plusBox}>
                <Plus width={20} height={20} fill={plusFill} />
              </View>
            </View>
          </View>
        )}

      </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  bluecontainer: {
    backgroundColor: '#eef8f0',
    padding: 16,
    zIndex: 0,
  },
  TopMenu: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 15,
  },
  barsIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 60,
    height: 60,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    zIndex: 2,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoOnTop: {
    zIndex: 1,
  },
  bellIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    zIndex: 2,
  },

  bellWrapper: {
  position: 'relative',
},
badge: {
  position: 'absolute',
  right: -3,
  top: -3,
  backgroundColor: 'red',
  width: 22,
  height: 22,
  borderRadius: 15,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#fff',
  zIndex: 2,
},
badgeText: {
  color: '#fff',
  fontSize: 10,
  fontFamily:'Manrope-Regular'
},

  ProfileBox: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    marginHorizontal: 4,
  },
  gmrLogo: {
    width: 60,
    height: 60,
    marginBottom: 8,
    marginLeft: 10,
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hiText: {
    color: COLORS.primaryFontColor,
    fontSize: 18,
    fontFamily: 'Manrope-Bold',
  },
  stayingText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
  },
  balanceText: {
    color: COLORS.primaryFontColor,
    marginLeft: 20,
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    justifyContent: 'center',
  },
  amountText: {
    color: COLORS.primaryColor,
    fontSize: 20,
    fontFamily: 'Manrope-Bold',
  },
  plusBox: {
    marginLeft: 7,
  },
});

DashboardHeader.displayName = 'DashboardHeader';

export default DashboardHeader;
