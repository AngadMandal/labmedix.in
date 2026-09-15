import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, ShieldCheck, Wifi, WifiOff, Zap } from 'lucide-react';
import { ApiSyncService, SyncHealthMetrics, LiveSyncState } from '../../services/apiSyncService';
import { GoogleDriveService } from '../../services/googleDriveService';
import { getGoogleAccessToken } from '../../services/googleAuth';

export const SyncHealthIndicator: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [syncMetrics, setSyncMetrics] = useState<SyncHealthMetrics>(() => ApiSyncService.getSyncHealthMetrics());
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; latencyMs: number; error?: string } | null>(null);

  const checkHealth = () => {
    setSyncMetrics(ApiSyncService.getSyncHealthMetrics());
    const token = GoogleDriveService.getAccessToken() || getGoogleAccessToken() || localStorage.getItem('labmedix_gdrive_token');
    setIsDriveConnected(!!token);
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    const handleSync = () => checkHealth();
    const handleOnline = () => { setIsOnline(true); checkHealth(); };
    const handleOffline = () => { setIsOnline(false); checkHealth(); };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('labmedix_data_synced', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('labmedix_data_synced', handleSync);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncingNow(true);
    try {
      await ApiSyncService.triggerWorkerExecution();
      checkHealth();
    } catch (e) {
      console.warn('Manual sync trigger error:', e);
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handlePing = async () => {
    setIsPinging(true);
    try {
      const res = await ApiSyncService.pingFirestore();
      setPingResult(res);
      checkHealth();
    } finally {
      setIsPinging(false);
    }
  };

  // Determine explicit 5-State indicator: LIVE | SYNCED | SYNCING | OFFLINE | ERROR
  const liveState: LiveSyncState = !isOnline 
    ? 'OFFLINE'
    : syncMetrics.syncErrorsCount > 5 && syncMetrics.status === 'offline'
    ? 'ERROR'
    : isSyncingNow || syncMetrics.pendingQueueSize > 0
    ? 'SYNCING'
    : syncMetrics.activeListenersCount > 0
    ? 'LIVE'
    : 'SYNCED';

  let statusColor = 'bg-emerald-500';
  let statusLightBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
  let statusLabel = 'LIVE';

  switch (liveState) {
    case 'LIVE':
      statusColor = 'bg-emerald-500';
      statusLightBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      statusLabel = 'LIVE';
      break;
    case 'SYNCED':
      statusColor = 'bg-blue-500';
      statusLightBg = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      statusLabel = 'SYNCED';
      break;
    case 'SYNCING':
      statusColor = 'bg-amber-500 animate-pulse';
      statusLightBg = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      statusLabel = syncMetrics.pendingQueueSize > 0 ? `${syncMetrics.pendingQueueSize} SYNCING` : 'SYNCING...';
      break;
    case 'OFFLINE':
      statusColor = 'bg-orange-500';
      statusLightBg = 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      statusLabel = 'OFFLINE';
      break;
    case 'ERROR':
      statusColor = 'bg-rose-500 animate-pulse';
      statusLightBg = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      statusLabel = 'ERROR';
      break;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black tracking-wide transition-all shadow-xs cursor-pointer ${statusLightBg}`}
        title="Real-time Cloud Synchronization & Telemetry Status"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor}`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusColor}`} />
        </span>
        <span className="font-mono text-[11px] uppercase">{statusLabel}</span>
        <Activity className="w-3.5 h-3.5 opacity-80" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Sync & Cloud Telemetry</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Single Source of Truth: Central PostgreSQL</p>
              </div>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncingNow}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
              title="Force Sync Now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Telemetry Cards Grid */}
          <div className="grid grid-cols-2 gap-2 text-center font-mono">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Active Listeners</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {syncMetrics.activeListenersCount} Tables
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Pending WAL Queue</span>
              <span className={`text-sm font-black ${syncMetrics.pendingQueueSize > 0 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-200'}`}>
                {syncMetrics.pendingQueueSize} writes
              </span>
            </div>
          </div>

          {/* Detailed Connection List */}
          <div className="space-y-2 text-xs">
            {/* 1. Central PostgreSQL Connection */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <WifiOff className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Central PostgreSQL</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                    Authoritative Database
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isOnline ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 border border-rose-300'}`}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {/* 2. Latency Ping Test */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Cloud Ping: {pingResult ? `${pingResult.latencyMs}ms` : 'Not tested'}</span>
              </div>
              <button
                onClick={handlePing}
                disabled={isPinging || !isOnline}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 cursor-pointer"
              >
                {isPinging ? 'Pinging...' : 'Test Ping'}
              </button>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span>Last Sync: {new Date(syncMetrics.lastSyncTime).toLocaleTimeString()}</span>
            <a 
              href="#/backup" 
              onClick={() => setIsOpen(false)} 
              className="text-teal-600 dark:text-teal-400 font-bold hover:underline"
            >
              Backup & Vault ➔
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
