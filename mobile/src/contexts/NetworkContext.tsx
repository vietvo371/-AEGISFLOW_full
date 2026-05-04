/**
 * NetworkProvider - Theo dõi trạng thái kết nối mạng
 * Cung cấp context để các component biết trạng thái mạng
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  networkType: string | null;
  isWifi: boolean;
  isCellular: boolean;
  wasOffline: boolean; // Became online just now
  refreshNetworkStatus: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

interface NetworkProviderProps {
  children: ReactNode;
  onNetworkChange?: (isConnected: boolean) => void;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({
  children,
  onNetworkChange,
}) => {
  const [networkState, setNetworkState] = useState<NetInfoState | null>(null);
  const [wasOffline, setWasOffline] = useState(false);

  // Initial check
  useEffect(() => {
    const checkConnection = async () => {
      const state = await NetInfo.fetch();
      setNetworkState(state);
      setWasOffline(!state.isConnected);
    };

    checkConnection();
  }, []);

  // Subscribe to network changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const wasConnected = networkState?.isConnected;
      const isNowConnected = state.isConnected;

      setNetworkState(state);

      // Detect transition from offline to online
      if (!wasConnected && isNowConnected) {
        setWasOffline(true);
        onNetworkChange?.(true);

        // Reset flag after 5 seconds
        setTimeout(() => setWasOffline(false), 5000);
      } else if (wasConnected && !isNowConnected) {
        setWasOffline(false);
        onNetworkChange?.(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [networkState?.isConnected, onNetworkChange]);

  const refreshNetworkStatus = useCallback(async () => {
    try {
      const state = await NetInfo.fetch();
      setNetworkState(state);
    } catch (error) {
      console.error('[NetworkProvider] Error refreshing network status:', error);
    }
  }, []);

  const isConnected = networkState?.isConnected ?? false;
  const isInternetReachable = networkState?.isInternetReachable ?? null;
  const networkType = networkState?.type ?? null;
  const isWifi = networkType === 'wifi';
  const isCellular = networkType === 'cellular';

  return (
    <NetworkContext.Provider
      value={{
        isConnected,
        isInternetReachable,
        networkType,
        isWifi,
        isCellular,
        wasOffline,
        refreshNetworkStatus,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
};

export default NetworkProvider;
