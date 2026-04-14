import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavigatorScreenParams } from '@react-navigation/native';

// Citizen role tabs
export type CitizenTabParamList = {
  Home: undefined;
  Map: undefined;
  CreateReport: undefined;
  Alerts: undefined;
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
  Onboarding: undefined;
  Login: undefined;
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
};

export type StackScreen<T extends keyof RootStackParamList> = React.FC<NativeStackScreenProps<RootStackParamList, T>>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
