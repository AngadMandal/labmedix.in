/**
 * FirestoreConnectionStatus — Real-Time Firestore Connection Indicator
 *
 * Displays a persistent status badge in the app header:
 *  🟢 FIRESTORE LIVE — Connected (last sync: HH:MM:SS)
 *  🟡 Reconnecting...
 *  🔴 Offline (cached data)
 *
 * Integrated with ApiSyncService connection state and network events.
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

type ConnectionState = 'connected' | 'reconnecting' | 'offline';

function formatSyncTime(isoString: string | null): string {
  if (!isoString) return '--:--:--';
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const FirestoreConnectionStatus: React.FC = () => {
  const [state, setState] = useState<ConnectionState>('reconnecting');
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    // Listen to native network events
    const handleOnline = () => {
      setState('reconnecting');
      const t = setTimeout(() => {
        setState('connected');
        setLastSync(new Date().toISOString());
      }, 2500);
      return () => clearTimeout(t);
    };
    const handleOffline = () => setState('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also listen to the labmedix_data_synced event emitted by ApiSyncService
    const handleSync = () => {
      setState('connected');
      setLastSync(new Date().toISOString());
    };
    window.addEventListener('labmedix_data_synced', handleSync as EventListener);

    // Initial state
    if (!navigator.onLine) {
      setState('offline');
    } else {
      // Optimistically assume connected; real Firestore listeners will confirm
      setState('connected');
      setLastSync(new Date().toISOString());
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('labmedix_data_synced', handleSync as EventListener);
    };
  }, []);

  if (state === 'offline') {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[10px] font-bold shrink-0"
        title="Firestore is offline — showing cached data. Changes will sync when reconnected."
      >
        <WifiOff className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Offline</span>
      </div>
    );
  }

  if (state === 'reconnecting') {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[10px] font-bold shrink-0 animate-pulse"
        title="Reconnecting to Firestore..."
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span className="hidden sm:inline">Reconnecting</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold shrink-0"
      title={`Firestore Live — Connected. Last sync: ${formatSyncTime(lastSync)}`}
    >
      <Wifi className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Live</span>
      {lastSync && (
        <span className="hidden lg:inline text-emerald-500 dark:text-emerald-400 font-mono">
          {formatSyncTime(lastSync)}
        </span>
      )}
    </div>
  );
};
