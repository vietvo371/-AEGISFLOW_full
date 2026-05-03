import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, TAB_BAR } from '../theme';
import { RootStackParamList, CitizenTabParamList, EmergencyTabParamList } from './types';
import CustomTabBar from '../components/navigation/CustomTabBar';
import { useAuth } from '../contexts/AuthContext';

// Auth flow
import LoadingScreen from '../screens/auth/LoadingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen';
import UpdatePasswordScreen from '../screens/auth/UpdatePasswordScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';
import PhoneVerificationScreen from '../screens/auth/PhoneVerificationScreen';

// Main screens
import HomeScreen from '../screens/main/HomeScreen';
import MapScreen from '../screens/main/MapScreen';
import ReportsScreen from '../screens/main/ReportsScreen';
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
import EmergencyIncidentsScreen from '../screens/emergency/EmergencyIncidentsScreen';
import MissionListScreen from '../screens/emergency/MissionListScreen';
import PriorityRouteScreen from '../screens/emergency/PriorityRouteScreen';
import EmergencyProfileScreen from '../screens/emergency/EmergencyProfileScreen';

// New screens (v2)
import WeatherDetailScreen from '../screens/weather/WeatherDetailScreen';
import ShelterListScreen from '../screens/shelter/ShelterListScreen';
import SensorDetailScreen from '../screens/sensor/SensorDetailScreen';

// Placeholder for screens being developed
const PlaceholderScreen = ({ route }: any) => (
  <View style={styles.placeholder}>
    <Icon name="hammer-wrench" size={48} color={theme.colors.primary} />
    <Text style={styles.placeholderText}>{route.name}</Text>
    <Text style={styles.placeholderSubtext}>Đang phát triển</Text>
  </View>
);

const Stack = createNativeStackNavigator<RootStackParamList>();
const CitizenTab = createBottomTabNavigator<CitizenTabParamList>();
const EmergencyTab = createBottomTabNavigator<EmergencyTabParamList>();

// ============================================================================
// CITIZEN TABS — Home / Map / Report(+) / Alerts / Profile
// ============================================================================
const CitizenTabs = () => {
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
          title: 'Trang chủ',
          tabBarIcon: ({ color }) => <Icon name="home-variant" size={TAB_BAR.iconSize} color={color} />,
        }}
      />
      <CitizenTab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: 'Bản đồ',
          tabBarIcon: ({ color }) => <Icon name="map-marker-outline" size={TAB_BAR.iconSize} color={color} />,
        }}
      />
      <CitizenTab.Screen
        name="CreateReport"
        component={CreateReportScreen}
        options={{
          tabBarIcon: ({ color }) => <Icon name="plus" size={TAB_BAR.iconSize} color={color} />,
          tabBarButton: () => null, // Center FAB handled by CustomTabBar
        }}
      />
      <CitizenTab.Screen
        name="Alerts"
        component={ReportsScreen}
        options={{
          title: 'Cảnh báo',
          tabBarIcon: ({ color }) => <Icon name="bell-outline" size={TAB_BAR.iconSize} color={color} />,
        }}
      />
      <CitizenTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color }) => <Icon name="account-circle" size={TAB_BAR.iconSize} color={color} />,
        }}
      />
    </CitizenTab.Navigator>
  );
};

// ============================================================================
// EMERGENCY TABS — Situation / Incidents / Route / Profile
// ============================================================================
const EmergencyTabs = () => {
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
          title: 'Tình huống',
          tabBarIcon: ({ color }) => <Icon name="map-marker-alert" size={TAB_BAR.iconSize} color={color} />,
        }}
      />
      <EmergencyTab.Screen
        name="Incidents"
        component={MissionListScreen}
        options={{
          title: 'Nhiệm vụ',
          tabBarIcon: ({ color }) => <Icon name="clipboard-list-outline" size={TAB_BAR.iconSize} color={color} />,
        }}
      />
      <EmergencyTab.Screen
        name="PriorityRoute"
        component={PriorityRouteScreen}
        options={{
          title: 'Tuyến đường',
          tabBarIcon: ({ color }) => <Icon name="navigation-variant-outline" size={TAB_BAR.iconSize} color={color} />,
        }}
      />
      <EmergencyTab.Screen
        name="Profile"
        component={EmergencyProfileScreen}
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color }) => <Icon name="account-circle" size={TAB_BAR.iconSize} color={color} />,
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
        animation: 'slide_from_right',
        animationDuration: 300,
        contentStyle: { backgroundColor: theme.colors.white },
      }}
    >
      <Stack.Screen name="Loading" component={LoadingScreen} />

      {/* Auth Group */}
      <Stack.Group>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
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
        <Stack.Screen name="CreateReport" component={CreateReportScreen} />
        <Stack.Screen name="EditReport" component={EditReportScreen} />
        <Stack.Screen name="MyReports" component={MyReportsScreen} />

        {/* Map */}
        <Stack.Screen name="MapReports" component={MapReportsScreen} />
        <Stack.Screen name="MapHeatmap" component={MapHeatmapScreen} />
        <Stack.Screen name="MapClusters" component={MapClustersScreen} />
        <Stack.Screen name="MapRoutes" component={MapRoutesScreen} />

        {/* Notifications */}
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
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
      </Stack.Group>
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: 20,
    gap: 12,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
});

export default MainNavigator;
