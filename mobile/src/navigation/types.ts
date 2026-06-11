import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavigatorScreenParams } from '@react-navigation/native';

// Citizen role tabs - Web-like layout
export type CitizenTabParamList = {
  Home: undefined;
  Map: {
    shelterRoute?: {
      id: number;
      name: string;
      address?: string;
      latitude: number;
      longitude: number;
    };
  } | undefined;
  SOS: undefined; // FAB button - đỏ
  Shelters: undefined;
  Profile: undefined;
};

// Emergency role tabs
export type EmergencyTabParamList = {
  SituationMap: undefined;
  Incidents: undefined;
  PriorityRoute: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Loading: undefined;
  Login: { email?: string } | undefined;
  Register: undefined;
  ForgotPassword: undefined;
  OTPVerification: {
    identifier: string;
    type: 'phone' | 'email';
    flow?: 'register' | 'login' | 'forgot';
  };

  // Role-based tab navigators
  CitizenTabs: NavigatorScreenParams<CitizenTabParamList>;
  EmergencyTabs: NavigatorScreenParams<EmergencyTabParamList>;

  // Auth
  ChangePassword: undefined;
  UpdatePassword: { token: string };
  EmailVerification: undefined;
  PhoneVerification: undefined;

  // Incidents (shared)
  IncidentDetail: { id: number; isRescue?: boolean };
  ReportDetail: { id: number };
  CreateReport: { isRescue?: boolean } | undefined;
  EditReport: { id: number };
  MyReports: undefined;

  // Map
  MapReports: undefined;
  MapHeatmap: undefined;
  MapClusters: undefined;
  MapRoutes: undefined;

  // Notifications
  Notifications: undefined;
  NotificationSettings: undefined;

  // Profile
  UserProfile: { userId: number };
  ChangePasswordLoggedIn: undefined;

  // Settings
  LanguageSettings: undefined;
  HelpCenter: undefined;
  About: undefined;

  // Alerts
  Alerts: { alertId?: number } | undefined;
  AlertDetail: { id: number };

  // Rescue
  RescueRequest: undefined;
  MyRescueRequests: undefined;
  RescueRequestDetail: { id: number };

  // New screens (v2)
  WeatherDetail: undefined;
  ShelterList: undefined;
  SensorDetail: { sensorId?: number };
};

export type StackScreen<T extends keyof RootStackParamList> = React.FC<NativeStackScreenProps<RootStackParamList, T>>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
