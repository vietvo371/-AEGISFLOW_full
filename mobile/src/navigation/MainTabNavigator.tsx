import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, TAB_BAR } from '../theme';
import { RootStackParamList, CitizenTabParamList, EmergencyTabParamList } from './types';
import CustomTabBar from '../components/navigation/CustomTabBar';
import { useTranslation } from '../hooks/useTranslation';

// Auth flow
import LoadingScreen from '../screens/auth/LoadingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen';
import UpdatePasswordScreen from '../screens/auth/UpdatePasswordScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';
import PhoneVerificationScreen from '../screens/auth/PhoneVerificationScreen';

// Main screens
import HomeScreen from '../screens/main/HomeScreen';
import MapScreen from '../screens/main/MapScreen';
import AlertsScreen from '../screens/main/AlertsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Reports Module
import ReportDetailScreen from '../screens/reports/ReportDetailScreen';
import CreateReportScreen from '../screens/reports/CreateReportScreen';
import EditReportScreen from '../screens/reports/EditReportScreen';
import MyReportsScreen from '../screens/reports/MyReportsScreen';

// Emergency Module
import IncidentDetailScreen from '../screens/emergency/IncidentDetailScreen';

// Notifications
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import NotificationSettingsScreen from '../screens/notifications/NotificationSettingsScreen';

// Map Module
import MapReportsScreen from '../screens/map/MapReportsScreen';
import MapHeatmapScreen from '../screens/map/MapHeatmapScreen';
import MapClustersScreen from '../screens/map/MapClustersScreen';
import MapRoutesScreen from '../screens/map/MapRoutesScreen';

// Profile Module
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import ChangePasswordLoggedInScreen from '../screens/profile/ChangePasswordLoggedInScreen';

// Settings
import LanguageSettingsScreen from '../screens/settings/LanguageSettingsScreen';
import HelpCenterScreen from '../screens/settings/HelpCenterScreen';
import AboutScreen from '../screens/settings/AboutScreen';

// Emergency Module
import MissionListScreen from '../screens/emergency/MissionListScreen';
import PriorityRouteScreen from '../screens/emergency/PriorityRouteScreen';
import EmergencyProfileScreen from '../screens/emergency/EmergencyProfileScreen';

// Alerts & Rescue
import AlertDetailScreen from '../screens/alerts/AlertDetailScreen';
import RescueRequestScreen from '../screens/rescue/RescueRequestScreen';
import MyRescueRequestsScreen from '../screens/rescue/MyRescueRequestsScreen';
import RescueRequestDetailScreen from '../screens/rescue/RescueRequestDetailScreen';

// New screens (v2)
import WeatherDetailScreen from '../screens/weather/WeatherDetailScreen';
import ShelterListScreen from '../screens/shelter/ShelterListScreen';
import SensorDetailScreen from '../screens/sensor/SensorDetailScreen';



const Stack = createNativeStackNavigator<RootStackParamList>();
const CitizenTab = createBottomTabNavigator<CitizenTabParamList>();
const EmergencyTab = createBottomTabNavigator<EmergencyTabParamList>();

// ============================================================================
// CITIZEN TABS — Home / Map / SOS / Shelters / Profile
// Layout giống web: Home | Map | SOS (đỏ FAB) | Shelters | Profile
// ============================================================================
const CitizenTabs = () => {
  const { t } = useTranslation();
  const tabScreenOptions = {
    headerShown: false,
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.textSecondary,
  };

  return (
    <CitizenTab.Navigator
      screenOptions={tabScreenOptions}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <CitizenTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <Icon name="home-variant" size={TAB_BAR.iconSize} color={color} />,
        }}
      />
      <CitizenTab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: t('tabs.map'),
          tabBarIcon: ({ color }) => <Icon name="map-marker-outline" size={TAB_BAR.iconSize} color={color} />,
        }}
      />
      <CitizenTab.Screen
        name="SOS"
        component={RescueRequestScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <CitizenTab.Screen
        name="Shelters"
        component={ShelterListScreen}
        options={{
          title: t('tabs.shelters'),
          tabBarIcon: ({ color }) => <Icon name="home-heart" size={TAB_BAR.iconSize} color={color} />,
        }}
      />
      <CitizenTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => <Icon name="account-circle" size={TAB_BAR.iconSize} color={color} />,
        }}
      />
      <CitizenTab.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{
          title: t('reports.reportDetail', 'Chi tiết phản ánh'),
        }}
      />
      <CitizenTab.Screen
        name="CreateReport"
        component={CreateReportScreen}
        options={{
          title: t('reports.createReport', 'Tạo phản ánh mới'),
        }}
      />
      <CitizenTab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: t('profile.notifications', 'Thông báo'),
        }}
      />
      <CitizenTab.Screen
        name="EditReport"
        component={EditReportScreen}
        options={{
          title: t('reports.editReport', 'Chỉnh sửa phản ánh'),
        }}
      />
      <CitizenTab.Screen
        name="MyReports"
        component={MyReportsScreen}
        options={{
          title: t('reports.myReports', 'Báo cáo của tôi'),
        }}
      />
    </CitizenTab.Navigator>
  );
};

// ============================================================================
// EMERGENCY TABS — Situation / Incidents / Route / Profile
// ============================================================================
const EmergencyTabs = () => {
  const { t } = useTranslation();
  const tabScreenOptions = {
    headerShown: false,
    tabBarActiveTintColor: '#EF4444', // Red for emergency
    tabBarInactiveTintColor: theme.colors.textSecondary,
  };

  return (
    <EmergencyTab.Navigator
      screenOptions={tabScreenOptions}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <EmergencyTab.Screen
        name="SituationMap"
        component={MapScreen}
        options={{
          title: t('tabs.situation'),
          tabBarIcon: ({ color }) => <Icon name="map-marker-alert" size={TAB_BAR.iconSize} color={color} />,
        }}
      />
      <EmergencyTab.Screen
        name="Incidents"
        component={MissionListScreen}
        options={{
          title: t('tabs.missions'),
          tabBarIcon: ({ color }) => <Icon name="clipboard-list-outline" size={TAB_BAR.iconSize} color={color} />,
        }}
      />
      <EmergencyTab.Screen
        name="PriorityRoute"
        component={PriorityRouteScreen}
        options={{
          title: t('tabs.routes'),
          tabBarIcon: ({ color }) => <Icon name="navigation-variant-outline" size={TAB_BAR.iconSize} color={color} />,
        }}
      />
      <EmergencyTab.Screen
        name="Profile"
        component={EmergencyProfileScreen}
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => <Icon name="account-circle" size={TAB_BAR.iconSize} color={color} />,
        }}
      />
      <EmergencyTab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Thông báo',
        }}
      />
    </EmergencyTab.Navigator>
  );
};

// ============================================================================
// ROOT NAVIGATOR — Role-based tab routing
// ============================================================================
const MainNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Loading"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.white },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen name="Loading" component={LoadingScreen} />

      {/* Auth Group */}
      <Stack.Group>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      </Stack.Group>

      {/* Role-based Tab Groups */}
      <Stack.Group>
        <Stack.Screen name="CitizenTabs" component={CitizenTabs} />
        <Stack.Screen name="EmergencyTabs" component={EmergencyTabs} />
      </Stack.Group>

      {/* Shared Screens */}
      <Stack.Group>
        {/* Auth */}
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen as any} />
        <Stack.Screen name="UpdatePassword" component={UpdatePasswordScreen} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />

        {/* Incidents — dùng IncidentDetailScreen riêng biệt */}
        <Stack.Screen name="IncidentDetail" component={IncidentDetailScreen} />

        {/* Map */}
        <Stack.Screen name="MapReports" component={MapReportsScreen} />
        <Stack.Screen name="MapHeatmap" component={MapHeatmapScreen} />
        <Stack.Screen name="MapClusters" component={MapClustersScreen} />
        <Stack.Screen name="MapRoutes" component={MapRoutesScreen} />

        {/* Notifications */}
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />

        {/* Profile & Settings */}
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="ChangePasswordLoggedIn" component={ChangePasswordLoggedInScreen} />
        <Stack.Screen name="LanguageSettings" component={LanguageSettingsScreen} />
        <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
        <Stack.Screen name="About" component={AboutScreen} />

        {/* New v2 Screens */}
        <Stack.Screen name="WeatherDetail" component={WeatherDetailScreen} />
        <Stack.Screen name="ShelterList" component={ShelterListScreen} />
        <Stack.Screen name="SensorDetail" component={SensorDetailScreen} />

        {/* Alerts & Rescue */}
        <Stack.Screen name="Alerts" component={AlertsScreen} />
        <Stack.Screen name="AlertDetail" component={AlertDetailScreen} />
        <Stack.Screen name="RescueRequest" component={RescueRequestScreen} />
        <Stack.Screen name="MyRescueRequests" component={MyRescueRequestsScreen} />
        <Stack.Screen name="RescueRequestDetail" component={RescueRequestDetailScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
};



export default MainNavigator;
