/**
 * OfflineDataContext - Quản lý dữ liệu offline
 * Cung cấp data từ cache khi offline
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import NetInfo from '@react-native-community/netinfo';
import OfflineStorage from '../services/OfflineStorage';
import {
  OfflineQueueItem,
} from '../services/OfflineStorage';

interface OfflineDataContextType {
  // Network state
  isOnline: boolean;
  isSyncing: boolean;

  // Cached data
  alerts: any[] | null;
  incidents: any[] | null;
  shelters: any[] | null;
  sensors: any[] | null;
  reports: any[] | null;
  weather: any | null;

  // Cache actions
  cacheAlerts: (alerts: any[]) => Promise<void>;
  cacheIncidents: (incidents: any[]) => Promise<void>;
  cacheShelters: (shelters: any[]) => Promise<void>;
  cacheSensors: (sensors: any[]) => Promise<void>;
  cacheReports: (reports: any[]) => Promise<void>;
  cacheWeather: (weather: any) => Promise<void>;

  // Clear cache
  clearCache: () => Promise<void>;

  // Sync status
  lastSyncTime: number | null;
  pendingActionsCount: number;
  syncNow: () => Promise<void>;

  // Offline queue
  addPendingAction: (
    endpoint: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    payload: any,
    type: 'create' | 'update' | 'delete'
  ) => Promise<void>;
  processQueue: () => Promise<void>;
}

const OfflineDataContext = createContext<OfflineDataContextType | undefined>(undefined);

interface OfflineDataProviderProps {
  children: ReactNode;
  onSyncComplete?: () => void;
}

export const OfflineDataProvider: React.FC<OfflineDataProviderProps> = ({
  children,
  onSyncComplete,
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Cached data state
  const [alerts, setAlerts] = useState<any[] | null>(null);
  const [incidents, setIncidents] = useState<any[] | null>(null);
  const [shelters, setShelters] = useState<any[] | null>(null);
  const [sensors, setSensors] = useState<any[] | null>(null);
  const [reports, setReports] = useState<any[] | null>(null);
  const [weather, setWeather] = useState<any | null>(null);

  // Sync status
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);

  // Load cached data on mount
  useEffect(() => {
    loadCachedData();
    loadPendingCount();
  }, []);

  // Monitor network state
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);

      // Auto-sync when coming online
      if (online && pendingActionsCount > 0) {
        processQueue();
      }
    });

    return () => unsubscribe();
  }, [pendingActionsCount]);

  // Load cached data from storage
  const loadCachedData = async () => {
    try {
      const [
        cachedAlerts,
        cachedIncidents,
        cachedShelters,
        cachedSensors,
        cachedReports,
        cachedWeather,
        syncTime,
      ] = await Promise.all([
        OfflineStorage.getAlerts(),
        OfflineStorage.getIncidents(),
        OfflineStorage.getShelters(),
        OfflineStorage.getSensors(),
        OfflineStorage.getReports(),
        OfflineStorage.getWeather(),
        OfflineStorage.getLastSyncTime(),
      ]);

      if (cachedAlerts) setAlerts(cachedAlerts);
      if (cachedIncidents) setIncidents(cachedIncidents);
      if (cachedShelters) setShelters(cachedShelters);
      if (cachedSensors) setSensors(cachedSensors);
      if (cachedReports) setReports(cachedReports);
      if (cachedWeather) setWeather(cachedWeather);
      if (syncTime) setLastSyncTime(syncTime);
    } catch (error) {
      console.error('[OfflineData] Error loading cached data:', error);
    }
  };

  // Load pending actions count
  const loadPendingCount = async () => {
    try {
      const count = await OfflineStorage.getQueueSize();
      setPendingActionsCount(count);
    } catch (error) {
      console.error('[OfflineData] Error loading pending count:', error);
    }
  };

  // ============================================================================
  // CACHE ACTIONS
  // ============================================================================

  const cacheAlerts = useCallback(async (data: any[]) => {
    await OfflineStorage.saveAlerts(data);
    setAlerts(data);
  }, []);

  const cacheIncidents = useCallback(async (data: any[]) => {
    await OfflineStorage.saveIncidents(data);
    setIncidents(data);
  }, []);

  const cacheShelters = useCallback(async (data: any[]) => {
    await OfflineStorage.saveShelters(data);
    setShelters(data);
  }, []);

  const cacheSensors = useCallback(async (data: any[]) => {
    await OfflineStorage.saveSensors(data);
    setSensors(data);
  }, []);

  const cacheReports = useCallback(async (data: any[]) => {
    await OfflineStorage.saveReports(data);
    setReports(data);
  }, []);

  const cacheWeather = useCallback(async (data: any) => {
    await OfflineStorage.saveWeather(data);
    setWeather(data);
  }, []);

  // Clear all cached data
  const clearCache = useCallback(async () => {
    await OfflineStorage.clearAll();
    setAlerts(null);
    setIncidents(null);
    setShelters(null);
    setSensors(null);
    setReports(null);
    setWeather(null);
    setLastSyncTime(null);
  }, []);

  // ============================================================================
  // SYNC ACTIONS
  // ============================================================================

  // Sync now - fetch fresh data from server
  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      // Update sync time
      await OfflineStorage.updateLastSyncTime();
      setLastSyncTime(Date.now());

      // Process pending queue first
      await processQueue();

      // Then refresh cached data
      // Note: Actual API calls should be done by components using this context
      await loadCachedData();

      onSyncComplete?.();
    } catch (error) {
      console.error('[OfflineData] Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, onSyncComplete]);

  // ============================================================================
  // OFFLINE QUEUE
  // ============================================================================

  // Add pending action to queue
  const addPendingAction = useCallback(
    async (
      endpoint: string,
      method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      payload: any,
      type: 'create' | 'update' | 'delete'
    ) => {
      await OfflineStorage.addToQueue({
        endpoint,
        method,
        payload,
        type,
      });
      await loadPendingCount();
    },
    []
  );

  // Process pending queue
  const processQueue = useCallback(async () => {
    if (!isOnline) return;

    let processed = 0;
    let failed = 0;

    while (true) {
      const item = await OfflineStorage.shiftQueue();
      if (!item) break; // Queue is empty

      try {
        // Process the item (simulated - actual implementation would use API)
        await processQueueItem(item);
        processed++;
      } catch (error) {
        console.error('[OfflineData] Failed to process queue item:', error);

        // Re-add to queue if under retry limit
        const retryCount = await OfflineStorage.incrementRetryCount(item.id);
        if (retryCount < 3) {
          await OfflineStorage.addToQueue(item);
        } else {
          failed++;
        }
      }

      await loadPendingCount();
    }

    if (processed > 0 || failed > 0) {
      console.log(`[OfflineData] Queue processed: ${processed} success, ${failed} failed`);
    }
  }, [isOnline]);

  return (
    <OfflineDataContext.Provider
      value={{
        isOnline,
        isSyncing,
        alerts,
        incidents,
        shelters,
        sensors,
        reports,
        weather,
        cacheAlerts,
        cacheIncidents,
        cacheShelters,
        cacheSensors,
        cacheReports,
        cacheWeather,
        clearCache,
        lastSyncTime,
        pendingActionsCount,
        syncNow,
        addPendingAction,
        processQueue,
      }}
    >
      {children}
    </OfflineDataContext.Provider>
  );
};

export const useOfflineData = (): OfflineDataContextType => {
  const context = useContext(OfflineDataContext);
  if (!context) {
    throw new Error('useOfflineData must be used within OfflineDataProvider');
  }
  return context;
};

// Helper function to process a single queue item
async function processQueueItem(item: OfflineQueueItem): Promise<void> {
  // This is a placeholder - actual implementation would make API calls
  console.log(`[OfflineData] Processing: ${item.method} ${item.endpoint}`);
  // In real implementation:
  // const response = await api.request({
  //   method: item.method,
  //   url: item.endpoint,
  //   data: item.payload,
  // });
  // if (!response.ok) throw new Error('Request failed');
}

export default OfflineDataProvider;
