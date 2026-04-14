import { createNavigationContainerRef, StackActions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// Global navigation ref to allow navigation outside React components (e.g., in interceptors)
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function isReady() {
  return navigationRef.isReady();
}

export function navigate<Name extends keyof RootStackParamList>(
  name: Name,
  params?: RootStackParamList[Name]
) {
  if (navigationRef.isReady()) {
    // @ts-expect-error params are validated by RootStackParamList
    navigationRef.navigate(name as never, params as never);
  }
}

export function resetTo<Name extends keyof RootStackParamList>(
  name: Name,
  params?: RootStackParamList[Name]
) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      StackActions.replace(name as string, params as object | undefined)
    );
  }
}

export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}


