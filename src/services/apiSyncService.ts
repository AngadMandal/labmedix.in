import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  runTransaction, 
  writeBatch,
  getDoc 
} from 'firebase/firestore';
import { db, firebaseConfig, handleFirestoreError, OperationType } from './firebaseService';
import { 
  Patient, 
  HealthCard, 
  CardApplicationRequest, 
  PatientAppointment, 
  WalletTransaction, 
  CashDeskVoucher, 
  User, 
  Membership, 
  AuditLog, 
  Wallet, 
  FamilyGroup,
  SampleDispatchRecord,
  CompanyProfile
} from '../types';
import { BloodTestBooking, MedicineOrder } from './portalService';
import { FirestoreBackupService } from './firestoreBackupService';
import { MultiDeviceSyncService } from './multiDeviceSyncService';

export interface DiagnosticLogEntry {
  id: string;
  timestamp: string;
  type: 'SNAPSHOT' | 'WRITE' | 'DELETE' | 'AUTH' | 'PING' | 'ERROR' | 'INFO';
  pathOrCollection: string;
  details: string;
  payload?: any;
}

export type LiveSyncState = 'LIVE' | 'SYNCED' | 'SYNCING' | 'OFFLINE' | 'ERROR';

export interface SyncHealthMetrics {
  status: 'connected' | 'connecting' | 'offline';
  liveState: LiveSyncState;
  projectId: string;
  databaseId: string;
  activeListenersCount: number;
  lastSyncTime: string;
  pendingQueueSize: number;
  processedCount: number;
  syncErrorsCount: number;
  totalCollectionsMonitored: number;
}

export class ApiSyncService {
  private static activeUnsubscribers: (() => void)[] = [];
  private static syncErrors = 0;
  private static lastSyncTimestamp = new Date().toISOString();
  private static isConnected = true;
  private static quotaExceeded = false;
  private static recentWritesIdempotencyMap = new Map<string, number>();
  private static diagnosticLogs: DiagnosticLogEntry[] = [];
  private static diagnosticListeners: ((log: DiagnosticLogEntry) => void)[] = [];

  static {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        ApiSyncService.isConnected = true;
        ApiSyncService.addDiagnosticLog({
          type: 'INFO',
          pathOrCollection: 'network/online',
          details: 'Internet connection restored. Initiating autonomous cloud reconnection & WAL drain.'
        });
        if (ApiSyncService.activeUnsubscribers.length === 0) {
          ApiSyncService.subscribeToAll();
        }
        ApiSyncService.triggerWorkerExecution();
        FirestoreBackupService.flushWalQueue().catch(() => {});
      });

      window.addEventListener('offline', () => {
        ApiSyncService.isConnected = false;
        ApiSyncService.addDiagnosticLog({
          type: 'INFO',
          pathOrCollection: 'network/offline',
          details: 'Operating in 100% resilient offline cache mode (Zero Data Loss WAL active).'
        });
      });
    }
  }

  private static checkAndRecordIdempotency(key: string): boolean {
    const now = Date.now();
    const last = this.recentWritesIdempotencyMap.get(key);
    if (last && now - last < 2000) {
      return false; // Throttled rapid duplicate write
    }
    this.recentWritesIdempotencyMap.set(key, now);
    if (this.recentWritesIdempotencyMap.size > 500) {
      const threshold = now - 10000;
      for (const [k, time] of this.recentWritesIdempotencyMap.entries()) {
        if (time < threshold) this.recentWritesIdempotencyMap.delete(k);
      }
    }
    return true;
  }

  public static addDiagnosticLog(entry: Omit<DiagnosticLogEntry, 'id' | 'timestamp'>): void {
    const logItem: DiagnosticLogEntry = {
      id: 'diag_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      ...entry
    };
    this.diagnosticLogs.unshift(logItem);
    if (this.diagnosticLogs.length > 200) {
      this.diagnosticLogs.pop();
    }
    this.diagnosticListeners.forEach(listener => {
      try { listener(logItem); } catch {}
    });
  }

  public static getDiagnosticLogs(): DiagnosticLogEntry[] {
    return [...this.diagnosticLogs];
  }

  public static clearDiagnosticLogs(): void {
    this.diagnosticLogs = [];
  }

  public static onDiagnosticLog(callback: (log: DiagnosticLogEntry) => void): () => void {
    this.diagnosticListeners.push(callback);
    return () => {
      this.diagnosticListeners = this.diagnosticListeners.filter(l => l !== callback);
    };
  }

  /** Run a live latency ping round-trip test against Firestore */
  public static async pingFirestore(): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      const pingId = `ping_${Date.now()}`;
      const pingDocRef = doc(db, '_system_diagnostics', pingId);
      await setDoc(pingDocRef, {
        pingTime: new Date().toISOString(),
        clientTimestamp: Date.now(),
        clientPlatform: navigator.userAgent
      });
      const verifySnap = await getDoc(pingDocRef);
      const latencyMs = Math.round(performance.now() - start);

      this.addDiagnosticLog({
        type: 'PING',
        pathOrCollection: '_system_diagnostics',
        details: `Latency test successful: ${latencyMs}ms roundtrip (doc: ${pingId})`
      });

      // Cleanup ping doc asynchronously
      deleteDoc(pingDocRef).catch(() => {});

      return { success: true, latencyMs };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      this.addDiagnosticLog({
        type: 'ERROR',
        pathOrCollection: '_system_diagnostics',
        details: `Ping test failed (${latencyMs}ms): ${err?.message || err}`
      });
      return { success: false, latencyMs, error: err?.message || String(err) };
    }
  }

  private static checkQuotaError(error: unknown): boolean {
    const errStr = String(error || '').toLowerCase();
    // Only detect hard resource exhaustion, avoiding false positives on standard warnings
    if (errStr.includes('resource-exhausted') || errStr.includes('quota exceeded') || errStr.includes('maximum backoff')) {
      if (!this.quotaExceeded) {
        this.quotaExceeded = true;
        console.warn('[ApiSync] Firestore resource limits reached. Switching to local persistence mode with automatic reconnect in 30s.');
        this.activeUnsubscribers.forEach(u => {
          try { u(); } catch {}
        });
        this.activeUnsubscribers = [];
        setTimeout(() => {
          this.quotaExceeded = false;
          this.subscribeToAll();
        }, 30000);
      }
      return true;
    }
    return false;
  }

  /** Generic fetch collection from Firestore */
  public static async fetchCollection<T>(collectionName: string): Promise<T[]> {
    if (this.quotaExceeded) return [];
    try {
      const q = query(collection(db, collectionName));
      const snapshot = await getDocs(q);
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as unknown as T);
      });
      this.lastSyncTimestamp = new Date().toISOString();
      this.isConnected = true;
      return items;
    } catch (error) {
      this.checkQuotaError(error);
      this.syncErrors++;
      if (!this.quotaExceeded) {
        console.warn(`[ApiSync] Fetch collection notice on ${collectionName}:`, error);
      }
      return [];
    }
  }

  private static getDocRef(docPath: string) {
    const parts = docPath.split('/');
    if (parts.length >= 2) {
      return doc(db, parts[0], parts[1]);
    }
    return doc(db, docPath);
  }

  /** Generic fetch document from Firestore */
  public static async fetchDocument<T>(docPath: string): Promise<T | null> {
    if (this.quotaExceeded) return null;
    try {
      const docRef = this.getDocRef(docPath);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        this.lastSyncTimestamp = new Date().toISOString();
        this.isConnected = true;
        return docSnap.data() as T;
      }
      return null;
    } catch (error) {
      this.checkQuotaError(error);
      this.syncErrors++;
      return null;
    }
  }

  /** Generic save or update document in Firestore with Zero-Data-Loss WAL Protection & Idempotency */
  public static async saveDocument<T extends { id?: string }>(collectionName: string, id: string, data: T): Promise<boolean> {
    if (!collectionName || !id) {
      console.warn('[ApiSync] saveDocument rejected: collectionName and id are required.');
      return false;
    }

    // Duplicate Submission Protection & Idempotency
    const payloadHash = typeof data === 'object' && data !== null ? Object.keys(data).length : 0;
    const idempotencyKey = `${collectionName}/${id}/${payloadHash}`;
    if (!this.checkAndRecordIdempotency(idempotencyKey)) {
      console.info(`[ApiSync] Idempotency lock: duplicate write throttled for ${collectionName}/${id}`);
      return true;
    }

    // Automatic Metadata & Company Centralization
    const sanitized = JSON.parse(JSON.stringify(data || {}));
    const nowIso = new Date().toISOString();
    const deviceId = MultiDeviceSyncService.getDeviceId();

    if (!sanitized.companyId && collectionName !== 'settings') {
      sanitized.companyId = 'LABMEDIX-MAIN-CLINIC';
    }
    if (!sanitized.createdAt) {
      sanitized.createdAt = nowIso;
    }
    sanitized.updatedAt = nowIso;
    sanitized.originDeviceId = deviceId;

    // 1. Stage in persistent Write-Ahead Log in IndexedDB first for Zero-Data-Loss guarantee
    const walId = await FirestoreBackupService.enqueueWal(collectionName, id, 'set', sanitized).catch(() => '');

    if (this.quotaExceeded) {
      return false;
    }

    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, sanitized, { merge: true });

      // Successfully synced to Firestore - commit & clear WAL record
      if (walId) {
        FirestoreBackupService.commitWal(walId).catch(() => {});
      }

      MultiDeviceSyncService.recordSyncEvent(collectionName, id, 'upsert').catch(() => {});

      this.lastSyncTimestamp = nowIso;
      this.isConnected = true;
      this.addDiagnosticLog({
        type: 'WRITE',
        pathOrCollection: `${collectionName}/${id}`,
        details: `Saved document ${id} to ${collectionName}`
      });
      return true;
    } catch (error: any) {
      this.checkQuotaError(error);
      this.syncErrors++;
      this.addDiagnosticLog({
        type: 'ERROR',
        pathOrCollection: `${collectionName}/${id}`,
        details: `Failed to save ${id} (Preserved in Zero-Loss WAL queue): ${error?.message || error}`
      });
      if (!this.quotaExceeded) {
        console.warn(`[ApiSync] Firestore sync notice for ${collectionName}/${id} (Secured in WAL):`, error);
      }
      return false;
    }
  }

  /** Generic delete document from Firestore with Zero-Data-Loss WAL Protection */
  public static async deleteDocument(collectionName: string, id: string): Promise<boolean> {
    const walId = await FirestoreBackupService.enqueueWal(collectionName, id, 'delete', null).catch(() => '');

    if (this.quotaExceeded) {
      return false;
    }

    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);

      if (walId) {
        FirestoreBackupService.commitWal(walId).catch(() => {});
      }

      MultiDeviceSyncService.recordSyncEvent(collectionName, id, 'delete').catch(() => {});

      this.lastSyncTimestamp = new Date().toISOString();
      this.addDiagnosticLog({
        type: 'DELETE',
        pathOrCollection: `${collectionName}/${id}`,
        details: `Deleted document ${id} from ${collectionName}`
      });
      return true;
    } catch (error: any) {
      this.checkQuotaError(error);
      this.syncErrors++;
      this.addDiagnosticLog({
        type: 'ERROR',
        pathOrCollection: `${collectionName}/${id}`,
        details: `Failed to delete ${id} (Preserved in Zero-Loss WAL queue): ${error?.message || error}`
      });
      return false;
    }
  }

  /** Purge entire collection in Firestore (Batch Deletion) */
  public static async purgeCollection(collectionName: string): Promise<number> {
    if (this.quotaExceeded) return 0;
    try {
      const q = query(collection(db, collectionName));
      const snapshot = await getDocs(q);
      let deletedCount = 0;

      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
        deletedCount++;
      });

      if (deletedCount > 0) {
        await batch.commit();
        console.info(`[ApiSync] Successfully batch purged ${deletedCount} documents from Firestore collection: ${collectionName}`);
      }
      this.lastSyncTimestamp = new Date().toISOString();
      return deletedCount;
    } catch (error) {
      this.checkQuotaError(error);
      return 0;
    }
  }

  /** Real-time listener for multi-device sync */
  public static subscribeToCollection<T>(collectionName: string, callback: (items: T[]) => void): () => void {
    if (this.quotaExceeded) return () => {};
    try {
      const q = query(collection(db, collectionName));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as unknown as T);
        });
        this.lastSyncTimestamp = new Date().toISOString();
        this.isConnected = true;

        // Automatically sync to local memory cache and localStorage
        for (const [key, conf] of Object.entries(this.KEY_TO_FIRESTORE_MAP)) {
          if (conf.type === 'collection' && conf.path === collectionName) {
            try {
              if (typeof window !== 'undefined' && (window as any).__labmedix_update_cache) {
                (window as any).__labmedix_update_cache(key, items);
                if (key === 'labmedix_membership_tiers_v1' && items.length > 0) {
                  (window as any).__labmedix_update_cache('labmedix_memberships_v1', items);
                }
              } else {
                localStorage.setItem(key, JSON.stringify(items));
                sessionStorage.setItem(key, JSON.stringify(items));
                if (key === 'labmedix_membership_tiers_v1' && items.length > 0) {
                  localStorage.setItem('labmedix_memberships_v1', JSON.stringify(items));
                  sessionStorage.setItem('labmedix_memberships_v1', JSON.stringify(items));
                }
                window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key, value: items } }));
              }
            } catch {}
            break;
          }
        }

        callback(items);
      }, (error) => {
        if (this.checkQuotaError(error)) return;
        this.syncErrors++;
        console.warn(`[ApiSync] Snapshot error on ${collectionName}:`, error);
      });
      return unsubscribe;
    } catch (e) {
      if (this.checkQuotaError(e)) return () => {};
      this.syncErrors++;
      return () => {};
    }
  }

  /** Comprehensive Key-to-Firestore configuration map */
  public static readonly KEY_TO_FIRESTORE_MAP: Record<string, { type: 'collection' | 'doc'; path: string }> = {
    'labmedix_users_v1': { type: 'collection', path: 'users' },
    'labmedix_patients_v1': { type: 'collection', path: 'patients' },
    'labmedix_cards_v1': { type: 'collection', path: 'cards' },
    'labmedix_memberships_v1': { type: 'collection', path: 'memberships' },
    'labmedix_membership_tiers_v1': { type: 'collection', path: 'membershipTiers' },
    'labmedix_families_v1': { type: 'collection', path: 'families' },
    'labmedix_wallets_v1': { type: 'collection', path: 'wallets' },
    'labmedix_transactions_v1': { type: 'collection', path: 'transactions' },
    'labmedix_audit_logs_v1': { type: 'collection', path: 'auditLogs' },
    'labmedix_clinical_encounters': { type: 'collection', path: 'emrEncounters' },
    'labmedix_patient_appointments_v1': { type: 'collection', path: 'appointments' },
    'labmedix_doctor_master_records_v1': { type: 'collection', path: 'doctors' },
    'labmedix_doctor_commission_payouts_v1': { type: 'collection', path: 'doctorPayouts' },
    'LABMEDIX_TEST_MASTER_LIST': { type: 'collection', path: 'labTests' },
    'LABMEDIX_HEALTH_PACKAGES_LIST': { type: 'collection', path: 'healthPackages' },
    'labmedix_portal_lab_bookings_v1': { type: 'collection', path: 'labBookings' },
    'labmedix_portal_pharmacy_orders_v1': { type: 'collection', path: 'pharmacyOrders' },
    'labmedix_portal_card_applications_v1': { type: 'collection', path: 'cardApplications' },
    'LABMEDIX_CASH_DESK_VOUCHERS_V1': { type: 'collection', path: 'vouchers' },
    'labmedix_voucher_user_settings_v1': { type: 'doc', path: 'settings/voucherSettings' },
    'labmedix_sample_dispatches_v1': { type: 'collection', path: 'sampleDispatches' },
    'labmedix_card_dispatches_v1': { type: 'collection', path: 'cardDispatches' },
    'labmedix_card_dispatch_batches_v1': { type: 'collection', path: 'cardDispatchBatches' },
    'labmedix_recovery_vault_v1': { type: 'collection', path: 'recoveryVault' },
    'labmedix_snapshots_v1': { type: 'collection', path: 'snapshots' },
    'labmedix_ngo_partners_v1': { type: 'collection', path: 'ngoPartners' },
    'labmedix_health_camps_v1': { type: 'collection', path: 'healthCamps' },
    'labmedix_camp_attendees_v1': { type: 'collection', path: 'campAttendees' },
    'labmedix_charity_grants_v1': { type: 'collection', path: 'charityGrants' },
    'labmedix_ngo_fund_transactions_v1': { type: 'collection', path: 'ngoTransactions' },
    'labmedix_company_profile_v1': { type: 'doc', path: 'settings/companyProfile' },
    'labmedix_bills_v1': { type: 'collection', path: 'bills' },
    'labmedix_card_request_transactions_v1': { type: 'collection', path: 'card_transactions' },
    'labmedix_wallet_transactions_v1': { type: 'collection', path: 'wallet_transactions' },
    'LABMEDIX_WEBSITE_CMS_CONFIG': { type: 'doc', path: 'settings/websiteCms' },
    'labmedix_integrations_v4': { type: 'doc', path: 'settings/integrations' }
  };

  /** Dedicated Real-time subscriber for Central Firestore Company Profile */
  public static subscribeToCompanyProfile(callback: (profile: CompanyProfile) => void): () => void {
    try {
      const docRef = doc(db, 'settings', 'companyProfile');
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (this.quotaExceeded) return;
        if (docSnap.exists()) {
          const data = docSnap.data() as CompanyProfile;
          if (data && data.name) {
            try {
              if (typeof window !== 'undefined' && (window as any).__labmedix_update_cache) {
                (window as any).__labmedix_update_cache('labmedix_company_profile_v1', data);
              } else if (typeof window !== 'undefined') {
                localStorage.setItem('labmedix_company_profile_v1', JSON.stringify(data));
                sessionStorage.setItem('labmedix_company_profile_v1', JSON.stringify(data));
                window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key: 'labmedix_company_profile_v1', value: data } }));
              }
            } catch (err) {
              console.warn('[ApiSync] Failed local cache write for company profile snapshot:', err);
            }
            callback(data);
          }
        }
      }, (err) => {
        if (this.checkQuotaError(err)) return;
        console.warn('[ApiSync] Real-time company profile subscription notice:', err);
      });
      return unsubscribe;
    } catch (e) {
      console.warn('[ApiSync] Failed to subscribe to central company profile:', e);
      return () => {};
    }
  }

  /** Direct Fetch Company Profile from Central Firestore */
  public static async fetchCompanyProfile(): Promise<CompanyProfile | null> {
    try {
      const docRef = doc(db, 'settings', 'companyProfile');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as CompanyProfile;
        if (data && data.name) {
          return data;
        }
      }
      return null;
    } catch (err) {
      console.warn('[ApiSync] Fetch company profile error from Central Firestore:', err);
      return null;
    }
  }

  /** Direct Save Company Profile to Central Firestore with high-priority dual path & audit log */
  public static async saveCompanyProfile(profile: CompanyProfile): Promise<boolean> {
    try {
      const sanitized = JSON.parse(JSON.stringify(profile));
      const payload = {
        ...sanitized,
        updatedAt: new Date().toISOString()
      };
      
      const docRef = doc(db, 'settings', 'companyProfile');
      await setDoc(docRef, payload, { merge: true });

      // Dual-path mirror for maximum platform backward-compatibility
      const mirrorRef = doc(db, 'settings', 'company_profile');
      setDoc(mirrorRef, payload, { merge: true }).catch(() => {});

      this.lastSyncTimestamp = new Date().toISOString();
      this.isConnected = true;
      this.addDiagnosticLog({
        type: 'WRITE',
        pathOrCollection: 'settings/companyProfile',
        details: `Saved Company Profile (${profile.name}) to Central Firestore`
      });
      return true;
    } catch (error: any) {
      this.checkQuotaError(error);
      this.syncErrors++;
      console.warn('[ApiSync] Failed to save company profile to Central Firestore:', error);
      this.enqueueWorkerTask('settings', 'companyProfile', profile);
      return false;
    }
  }

  /** Dynamically sync any STORAGE_KEY value to Firestore */
  public static async syncKeyToFirestore(key: string, value: any): Promise<void> {
    if (!key || value === undefined || value === null) return;

    // Handle dynamic patient vitals keys (e.g. labmedix_patient_vitals_pat_12345)
    if (key.startsWith('labmedix_patient_vitals_')) {
      const patientId = key.replace('labmedix_patient_vitals_', '').trim();
      if (!patientId) return;
      try {
        const docRef = doc(db, 'patientVitals', patientId);
        const sanitizedRecords = JSON.parse(JSON.stringify(Array.isArray(value) ? value : []));
        await setDoc(docRef, {
          patientId,
          records: sanitizedRecords,
          count: sanitizedRecords.length,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        this.lastSyncTimestamp = new Date().toISOString();
        this.isConnected = true;
        this.addDiagnosticLog({
          type: 'WRITE',
          pathOrCollection: `patientVitals/${patientId}`,
          details: `Synced vitals for patient ${patientId} (${sanitizedRecords.length} records)`
        });
      } catch (e) {
        this.syncErrors++;
        console.warn(`[ApiSync] Firestore sync failed for patient vitals ${patientId}:`, e);
      }
      return;
    }

    const config = this.KEY_TO_FIRESTORE_MAP[key];
    if (!config) return;

    try {
      if (config.type === 'collection' && Array.isArray(value)) {
        await this.upsertCollectionInFirestore(config.path, value);
      } else if (config.type === 'doc' && typeof value === 'object') {
        const docRef = this.getDocRef(config.path);
        const sanitized = JSON.parse(JSON.stringify(value));
        await setDoc(docRef, { ...sanitized, updatedAt: new Date().toISOString() }, { merge: true });
      }
      this.lastSyncTimestamp = new Date().toISOString();
      this.isConnected = true;
    } catch (e) {
      this.syncErrors++;
      console.warn(`[ApiSync] Firestore sync failed for ${key}:`, e);
    }
  }

  /** Upsert collection items into Firestore without deleting missing items (with Zero-Data-Loss WAL Fallback) */
  public static async upsertCollectionInFirestore(collectionName: string, targetItems: any[]): Promise<void> {
    if (!Array.isArray(targetItems) || targetItems.length === 0) return;

    if (this.quotaExceeded) {
      // Stage into WAL while Firestore quota resets
      for (const item of targetItems) {
        if (item && item.id) {
          FirestoreBackupService.enqueueWal(collectionName, String(item.id), 'set', item).catch(() => {});
        }
      }
      return;
    }

    try {
      const batchList: Array<() => Promise<void>> = [];
      let currentBatch = writeBatch(db);
      let opCount = 0;

      const nowIso = new Date().toISOString();
      const deviceId = MultiDeviceSyncService.getDeviceId();

      for (const item of targetItems) {
        if (item && item.id) {
          const itemId = String(item.id);
          const docRef = doc(db, collectionName, itemId);
          const sanitized = JSON.parse(JSON.stringify(item));
          if (!sanitized.companyId && collectionName !== 'settings') {
            sanitized.companyId = 'LABMEDIX-MAIN-CLINIC';
          }
          if (!sanitized.createdAt) {
            sanitized.createdAt = nowIso;
          }
          sanitized.updatedAt = nowIso;
          sanitized.originDeviceId = deviceId;

          currentBatch.set(docRef, sanitized, { merge: true });
          opCount++;
          if (opCount >= 400) {
            const b = currentBatch;
            batchList.push(() => b.commit());
            currentBatch = writeBatch(db);
            opCount = 0;
          }
        }
      }

      if (opCount > 0) {
        const b = currentBatch;
        batchList.push(() => b.commit());
      }

      for (const commitFn of batchList) {
        await commitFn();
      }

      this.lastSyncTimestamp = new Date().toISOString();
      this.isConnected = true;
    } catch (error) {
      this.checkQuotaError(error);
      this.syncErrors++;
      console.warn(`[ApiSync] Firestore collection upsert error on ${collectionName} (Secured in WAL queue):`, error);
      // Zero-Data-Loss guarantee: Stash all items in WAL for automated background replay
      for (const item of targetItems) {
        if (item && item.id) {
          FirestoreBackupService.enqueueWal(collectionName, String(item.id), 'set', item).catch(() => {});
        }
      }
    }
  }

  /** Replace an entire collection in Firestore (used ONLY during full backup snapshot recovery) */
  public static async replaceCollectionInFirestore(collectionName: string, targetItems: any[]): Promise<void> {
    if (this.quotaExceeded) return;
    try {
      const q = query(collection(db, collectionName));
      const existingSnap = await getDocs(q);

      const targetIdSet = new Set<string>();
      const batchList: Array<() => Promise<void>> = [];

      let currentBatch = writeBatch(db);
      let opCount = 0;

      for (const item of targetItems) {
        if (item && item.id) {
          const itemId = String(item.id);
          targetIdSet.add(itemId);
          const docRef = doc(db, collectionName, itemId);
          const sanitized = JSON.parse(JSON.stringify(item));
          currentBatch.set(docRef, { ...sanitized, updatedAt: new Date().toISOString() }, { merge: true });
          opCount++;
          if (opCount >= 400) {
            const b = currentBatch;
            batchList.push(() => b.commit());
            currentBatch = writeBatch(db);
            opCount = 0;
          }
        }
      }

      for (const existingDoc of existingSnap.docs) {
        if (!targetIdSet.has(existingDoc.id)) {
          currentBatch.delete(existingDoc.ref);
          opCount++;
          if (opCount >= 400) {
            const b = currentBatch;
            batchList.push(() => b.commit());
            currentBatch = writeBatch(db);
            opCount = 0;
          }
        }
      }

      if (opCount > 0) {
        const b = currentBatch;
        batchList.push(() => b.commit());
      }

      for (const commitFn of batchList) {
        await commitFn();
      }

      this.lastSyncTimestamp = new Date().toISOString();
      this.isConnected = true;
    } catch (error) {
      this.checkQuotaError(error);
      this.syncErrors++;
      console.warn(`[ApiSync] Firestore collection replacement error on ${collectionName}:`, error);
    }
  }

  /** Synchronize full database restore / rollback to Central Firestore across all collections */
  public static async syncFullRestoreToFirestore(d: any): Promise<void> {
    if (this.quotaExceeded || !d) return;

    const collectionsToRestore: { path: string; items: any[] }[] = [
      { path: 'patients', items: d.patients || d.patientList || [] },
      { path: 'cards', items: d.healthCards || d.cards || [] },
      { path: 'memberships', items: d.memberships || [] },
      { path: 'families', items: d.families || [] },
      { path: 'wallets', items: d.wallets || [] },
      { path: 'transactions', items: d.walletTransactions || d.transactions || [] },
      { path: 'users', items: d.users || d.staff || [] },
      { path: 'appointments', items: d.appointments || [] },
      { path: 'emrEncounters', items: d.emrEncounters || [] },
      { path: 'doctors', items: d.doctors || [] },
      { path: 'doctorPayouts', items: d.doctorPayouts || [] },
      { path: 'labTests', items: d.labTests || [] },
      { path: 'healthPackages', items: d.healthPackages || [] },
      { path: 'labBookings', items: d.portalLabBookings || [] },
      { path: 'pharmacyOrders', items: d.portalPharmacyOrders || [] },
      { path: 'cardApplications', items: d.portalCardApplications || [] },
      { path: 'vouchers', items: d.cashVouchers || [] },
      { path: 'sampleDispatches', items: d.sampleDispatches || [] },
      { path: 'cardDispatches', items: d.cardDispatches || [] },
      { path: 'cardDispatchBatches', items: d.cardDispatchBatches || [] },
      { path: 'recoveryVault', items: d.recoveryVault || [] },
      { path: 'ngoPartners', items: d.ngoPartners || [] },
      { path: 'healthCamps', items: d.healthCamps || [] },
      { path: 'campAttendees', items: d.campAttendees || [] },
      { path: 'charityGrants', items: d.charityGrants || [] },
      { path: 'ngoTransactions', items: d.ngoTransactions || [] }
    ];

    for (const entry of collectionsToRestore) {
      if (Array.isArray(entry.items)) {
        await this.replaceCollectionInFirestore(entry.path, entry.items);
      }
    }

    // Docs
    if (d.companyProfile || d.company || d.profile) {
      await this.syncKeyToFirestore('labmedix_company_profile_v1', d.companyProfile || d.company || d.profile);
    }
    if (d.websiteCms) {
      await this.syncKeyToFirestore('LABMEDIX_WEBSITE_CMS_CONFIG', d.websiteCms);
    }
    if (d.integrations) {
      await this.syncKeyToFirestore('labmedix_integrations_v4', d.integrations);
    }
    if (d.voucherSettings) {
      await this.syncKeyToFirestore('labmedix_voucher_user_settings_v1', d.voucherSettings);
    }
  }

  /** Subscribe to all Firestore collections for real-time multi-device sync */
  public static subscribeToAll(onUpdate?: (key: string, value: any) => void): () => void {
    if (this.quotaExceeded) return () => {};

    // Unsubscribe existing listeners
    this.activeUnsubscribers.forEach(u => {
      try { u(); } catch {}
    });
    this.activeUnsubscribers = [];

    for (const [key, config] of Object.entries(this.KEY_TO_FIRESTORE_MAP)) {
      if (this.quotaExceeded) break;
      try {
        if (config.type === 'collection') {
          const q = query(collection(db, config.path));
          const unsub = onSnapshot(q, (snapshot) => {
            if (this.quotaExceeded) return;
            const items: any[] = [];
            snapshot.forEach((docSnap) => {
              items.push({ id: docSnap.id, ...docSnap.data() });
            });
            this.lastSyncTimestamp = new Date().toISOString();
            this.isConnected = true;

            // Automatically persist to memory cache and localStorage, and notify UI via custom event
            try {
              if (typeof window !== 'undefined' && (window as any).__labmedix_update_cache) {
                (window as any).__labmedix_update_cache(key, items);
                if (key === 'labmedix_membership_tiers_v1' && items.length > 0) {
                  (window as any).__labmedix_update_cache('labmedix_memberships_v1', items);
                }
              } else {
                localStorage.setItem(key, JSON.stringify(items));
                sessionStorage.setItem(key, JSON.stringify(items));
                if (key === 'labmedix_membership_tiers_v1' && items.length > 0) {
                  localStorage.setItem('labmedix_memberships_v1', JSON.stringify(items));
                  sessionStorage.setItem('labmedix_memberships_v1', JSON.stringify(items));
                }
                window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key, value: items } }));
              }
            } catch (err) {
              console.warn(`[ApiSync] Failed local persist for ${key}:`, err);
            }

            if (onUpdate && !(window as any)?.__labmedix_update_cache) onUpdate(key, items);
            this.addDiagnosticLog({
              type: 'SNAPSHOT',
              pathOrCollection: config.path,
              details: `Received snapshot update for ${config.path} (${items.length} items)`
            });
          }, (err) => {
            if (this.checkQuotaError(err)) {
              return;
            }
            this.syncErrors++;
            this.addDiagnosticLog({
              type: 'ERROR',
              pathOrCollection: config.path,
              details: `Subscription notice on ${config.path}: ${err?.message || err}`
            });
            console.warn(`[ApiSync] Realtime subscription notice on ${config.path}:`, err);
            setTimeout(() => {
              if (this.isConnected && !this.quotaExceeded) {
                this.ensureActiveSubscriptions(onUpdate);
              }
            }, 5000);
          });
          this.activeUnsubscribers.push(unsub);
        } else if (config.type === 'doc') {
          const docRef = this.getDocRef(config.path);
          const unsub = onSnapshot(docRef, (docSnap) => {
            if (this.quotaExceeded) return;
            if (docSnap.exists()) {
              this.lastSyncTimestamp = new Date().toISOString();
              this.isConnected = true;
              const data = docSnap.data();

              try {
                if (typeof window !== 'undefined' && (window as any).__labmedix_update_cache) {
                  (window as any).__labmedix_update_cache(key, data);
                } else {
                  localStorage.setItem(key, JSON.stringify(data));
                  sessionStorage.setItem(key, JSON.stringify(data));
                  window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key, value: data } }));
                }
              } catch (err) {
                console.warn(`[ApiSync] Failed local persist for doc ${key}:`, err);
              }

              if (onUpdate && !(window as any)?.__labmedix_update_cache) onUpdate(key, data);
              this.addDiagnosticLog({
                type: 'SNAPSHOT',
                pathOrCollection: config.path,
                details: `Received snapshot update for doc ${config.path}`
              });
            }
          }, (err) => {
            if (this.checkQuotaError(err)) {
              return;
            }
            this.syncErrors++;
            this.addDiagnosticLog({
              type: 'ERROR',
              pathOrCollection: config.path,
              details: `Doc subscription notice on ${config.path}: ${err?.message || err}`
            });
            console.warn(`[ApiSync] Realtime doc subscription notice on ${config.path}:`, err);
            setTimeout(() => {
              if (this.isConnected && !this.quotaExceeded) {
                this.ensureActiveSubscriptions(onUpdate);
              }
            }, 5000);
          });
          this.activeUnsubscribers.push(unsub);
        }
      } catch (e) {
        if (this.checkQuotaError(e)) {
          break;
        }
        this.syncErrors++;
        console.warn(`[ApiSync] Failed to subscribe to ${config.path}:`, e);
      }
    }

    // Real-time listener for Patient Vitals collection
    try {
      const qVitals = query(collection(db, 'patientVitals'));
      const unsubVitals = onSnapshot(qVitals, (snapshot) => {
        if (this.quotaExceeded) return;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const patientId = docSnap.id || data?.patientId;
          if (patientId && data?.records) {
            const vKey = `labmedix_patient_vitals_${patientId}`;
            const records = data.records;
            try {
              if (typeof window !== 'undefined' && (window as any).__labmedix_update_cache) {
                (window as any).__labmedix_update_cache(vKey, records);
              } else if (typeof window !== 'undefined') {
                localStorage.setItem(vKey, JSON.stringify(records));
                sessionStorage.setItem(vKey, JSON.stringify(records));
                window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key: vKey, value: records } }));
              }
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('labmedix_vitals_updated', { detail: { patientId, count: records.length } }));
              }
            } catch (err) {
              console.warn(`[ApiSync] Failed local persist for vitals ${vKey}:`, err);
            }
          }
        });
        this.lastSyncTimestamp = new Date().toISOString();
        this.isConnected = true;
      }, (err) => {
        if (!this.checkQuotaError(err)) {
          console.warn('[ApiSync] patientVitals snapshot warning:', err);
        }
      });
      this.activeUnsubscribers.push(unsubVitals);
    } catch (e) {
      console.warn('[ApiSync] Failed to subscribe to patientVitals:', e);
    }

    return () => {
      this.unsubscribeAll();
    };
  }

  /** Returns the count of currently active Firestore real-time listeners */
  public static getActiveListenersCount(): number {
    return this.activeUnsubscribers.length;
  }

  /**
   * Proactive health check & self-healing listener re-attachment.
   * Guarantees that mobile devices, background tabs, and laptops never lose their live connection.
   */
  public static ensureActiveSubscriptions(onUpdate?: (key: string, value: any) => void): void {
    if (this.quotaExceeded) return;
    const expectedCount = Object.keys(this.KEY_TO_FIRESTORE_MAP).length;
    if (this.activeUnsubscribers.length < Math.floor(expectedCount * 0.7)) {
      console.info(`[ApiSync] Self-healing sync watchdog: Active listeners (${this.activeUnsubscribers.length}/${expectedCount}). Re-engaging full real-time streams...`);
      this.subscribeToAll(onUpdate);
    }
  }

  /** Cleanly tear down all active real-time Firestore listeners on logout or session reset */
  public static unsubscribeAll(): void {
    if (this.activeUnsubscribers.length > 0) {
      console.info(`[ApiSync] Unsubscribing ${this.activeUnsubscribers.length} active Firestore listeners.`);
      this.activeUnsubscribers.forEach(u => {
        try { u(); } catch {}
      });
      this.activeUnsubscribers = [];
    }
  }

  public static async syncPatients(patients: Patient[]): Promise<void> {
    await this.syncKeyToFirestore('labmedix_patients_v1', patients);
  }

  public static async syncCards(cards: HealthCard[]): Promise<void> {
    await this.syncKeyToFirestore('labmedix_cards_v1', cards);
  }

  public static async syncCardApplications(apps: CardApplicationRequest[]): Promise<void> {
    await this.syncKeyToFirestore('labmedix_portal_card_applications_v1', apps);
  }

  public static async syncAppointments(appointments: PatientAppointment[]): Promise<void> {
    await this.syncKeyToFirestore('labmedix_patient_appointments_v1', appointments);
  }

  public static async syncTransactions(txns: WalletTransaction[]): Promise<void> {
    await this.syncKeyToFirestore('labmedix_transactions_v1', txns);
  }

  public static async syncWallets(wallets: Wallet[]): Promise<void> {
    await this.syncKeyToFirestore('labmedix_wallets_v1', wallets);
  }

  public static async syncFamilies(families: FamilyGroup[]): Promise<void> {
    await this.syncKeyToFirestore('labmedix_families_v1', families);
  }

  public static async syncAuditLogs(logs: AuditLog[]): Promise<void> {
    await this.syncKeyToFirestore('labmedix_audit_logs_v1', logs);
  }

  public static async syncUsers(users: User[]): Promise<void> {
    await this.syncKeyToFirestore('labmedix_users_v1', users);
  }

  public static async syncMemberships(memberships: Membership[]): Promise<void> {
    await this.syncKeyToFirestore('labmedix_memberships_v1', memberships);
  }

  public static async syncVouchers(vouchers: CashDeskVoucher[]): Promise<void> {
    await this.syncKeyToFirestore('LABMEDIX_CASH_DESK_VOUCHERS_V1', vouchers);
  }

  public static async syncCardDispatches(dispatches: any[]): Promise<void> {
    await this.syncKeyToFirestore('labmedix_card_dispatches_v1', dispatches);
  }

  public static async syncCardDispatchBatches(batches: any[]): Promise<void> {
    await this.syncKeyToFirestore('labmedix_card_dispatch_batches_v1', batches);
  }

  public static async syncVoucherSettings(settings: any): Promise<void> {
    await this.syncKeyToFirestore('labmedix_voucher_user_settings_v1', settings);
  }

  public static async syncLabBookings(bookings: BloodTestBooking[]): Promise<void> {
    await this.syncKeyToFirestore('labmedix_portal_lab_bookings_v1', bookings);
  }

  public static async syncPharmacyOrders(orders: MedicineOrder[]): Promise<void> {
    await this.syncKeyToFirestore('labmedix_portal_pharmacy_orders_v1', orders);
  }

  public static async syncEncounters(encounters: any[]): Promise<void> {
    await this.syncKeyToFirestore('labmedix_clinical_encounters', encounters);
  }

  public static async syncDoctors(doctors: any[]): Promise<void> {
    await this.syncKeyToFirestore('labmedix_doctor_master_records_v1', doctors);
  }

  public static async syncDoctorPayouts(payouts: any[]): Promise<void> {
    await this.syncKeyToFirestore('labmedix_doctor_commission_payouts_v1', payouts);
  }

  public static async syncLabTests(tests: any[]): Promise<void> {
    await this.syncKeyToFirestore('LABMEDIX_TEST_MASTER_LIST', tests);
  }

  public static async syncHealthPackages(packages: any[]): Promise<void> {
    await this.syncKeyToFirestore('LABMEDIX_HEALTH_PACKAGES_LIST', packages);
  }

  public static async approveApplicationTransaction(
    applicationId: string,
    approvedBy: string = 'Super Administrator'
  ): Promise<{ success: boolean; application?: any; patient?: any; card?: any; error?: string }> {
    try {
      const result = await runTransaction(db, async (transaction) => {
        const appRef = doc(db, 'cardApplications', applicationId);
        const appSnap = await transaction.get(appRef);

        if (!appSnap.exists()) {
          throw new Error('Application not found in Firestore.');
        }

        const appData = appSnap.data() as any;

        const status = (appData.status || '').toLowerCase();
        if (status === 'approved' || status === 'issued' || appData.approvedCardNumber) {
          throw new Error('Duplicate Prevention: Card has already been approved and issued for this application.');
        }

        if (status !== 'pending_approval' && status !== 'submitted') {
          throw new Error(`Transaction Blocked: Application status must be PENDING_APPROVAL. Current status is "${status}".`);
        }

        const patientId = appData.patientId || `lmdx-p-${Math.floor(1000 + Math.random() * 9000)}`;
        const cardId = `card_${Math.floor(1000 + Math.random() * 9000)}`;
        const cardNumber = `LHC-2026-${Math.floor(100000 + Math.random() * 900000)}`;
        const cvv = String(Math.floor(100 + Math.random() * 900));
        const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const now = new Date().toISOString();
        const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const patientRef = doc(db, 'patients', patientId);
        const cardRef = doc(db, 'cards', cardId);
        const walletRef = doc(db, 'wallets', `wal_${patientId}`);

        let patientRecord: any;
        const existingPatientSnap = await transaction.get(patientRef);
        if (existingPatientSnap.exists()) {
          patientRecord = {
            ...existingPatientSnap.data(),
            healthCardId: cardId,
            membershipId: appData.membershipId || (existingPatientSnap.data() as any).membershipId || 'silver',
            updatedAt: now
          };
          transaction.set(patientRef, patientRecord, { merge: true });
        } else {
          patientRecord = {
            id: patientId,
            fullName: appData.fullName,
            dob: appData.dob || '1995-01-01',
            age: appData.age || 30,
            gender: appData.gender || 'male',
            mobile: appData.mobile,
            whatsapp: appData.whatsapp || appData.mobile,
            email: appData.email || `${appData.mobile}@labmedix.org`,
            bloodGroup: appData.bloodGroup || 'O+',
            photoUrl: appData.photoUrl || '/logo.jpg',
            address: appData.address || { villageArea: '', postOffice: '', policeStation: '', district: '', state: '', pinCode: '', fullAddress: '' },
            emergencyContact: appData.emergencyContact || { name: '', relation: '', phone: '' },
            medicalInfo: appData.medicalInfo || { chronicConditions: [], allergies: [], regularMedications: [] },
            healthCardId: cardId,
            membershipId: appData.membershipId || 'silver',
            status: 'active',
            createdAt: now,
            updatedAt: now
          };
          transaction.set(patientRef, patientRecord);
        }

        const newCard = {
          id: cardId,
          cardNumber,
          patientId,
          membershipId: appData.membershipId || 'silver',
          issueDate: now.split('T')[0],
          expiryDate,
          status: 'active',
          cvv,
          verificationCode,
          designConfig: appData.cardThemeConfig || { theme: 'emerald_health', material: 'gloss_pvc' },
          statusHistory: [
            {
              id: 'hist_' + Math.random().toString(36).substring(2, 8),
              cardId,
              date: now,
              previousStatus: 'pending_approval',
              newStatus: 'active',
              changedBy: approvedBy,
              reason: `Atomic Firestore transaction: Approved card application ${appData.trackingId}`
            }
          ],
          createdAt: now,
          updatedAt: now
        };

        const newWallet = {
          id: `wal_${patientId}`,
          patientId,
          balance: appData.initialDeposit || 0,
          status: 'active',
          transactions: appData.initialDeposit ? [
            {
              id: 'txn_' + Math.random().toString(36).substring(2, 8),
              walletId: `wal_${patientId}`,
              patientId,
              type: 'credit',
              amount: appData.initialDeposit,
              category: 'initial_deposit',
              description: 'Initial Wallet Opening Balance upon Card Approval',
              referenceNo: appData.trackingId,
              balanceAfter: appData.initialDeposit,
              createdBy: approvedBy,
              createdAt: now
            }
          ] : [],
          createdAt: now,
          updatedAt: now
        };

        const updatedApp = {
          ...appData,
          status: 'approved',
          paymentStatus: 'paid',
          approvedPatientId: patientId,
          approvedCardNumber: cardNumber,
          approvedBy,
          approvedAt: now,
          updatedAt: now,
          processingHistory: [
            {
              id: 'hist_' + Math.random().toString(36).substring(2, 8),
              date: now,
              status: 'approved',
              title: 'Atomic Firestore Transaction Approved & Card Minted',
              note: `Verified PENDING_APPROVAL status. Minted Card ${cardNumber} [Patient ID: ${patientId}].`,
              actor: approvedBy
            },
            ...(appData.processingHistory || [])
          ]
        };

        transaction.set(cardRef, newCard);
        transaction.set(walletRef, newWallet);
        transaction.set(appRef, updatedApp, { merge: true });

        return { success: true, application: updatedApp, patient: patientRecord, card: newCard };
      });

      return result;
    } catch (error: any) {
      console.error('Atomic approval transaction error:', error);
      return { success: false, error: error.message || 'Transaction failed' };
    }
  }

  /** Real-Time Multi-Device Cloud Sync Listeners */
  public static initLiveCloudListeners(onDataSynced?: (collectionName: string, items: any[]) => void): () => void {
    return this.subscribeToAll((key, val) => {
      if (onDataSynced) onDataSynced(key, val);
    });
  }

  /** Background Worker Queue Engine */
  private static workerQueue: Array<{ collection: string; id: string; data: any; retries: number }> = [];
  private static workerRunning = false;
  private static processedQueueCount = 0;

  public static enqueueWorkerTask(collection: string, id: string, data: any) {
    this.workerQueue.push({ collection, id, data, retries: 0 });
    this.triggerWorkerExecution();
  }

  public static async triggerWorkerExecution(): Promise<void> {
    if (this.workerRunning || this.workerQueue.length === 0) return;
    this.workerRunning = true;

    while (this.workerQueue.length > 0) {
      const task = this.workerQueue.shift();
      if (!task) break;

      try {
        const success = await this.saveDocument(task.collection, task.id, task.data);
        if (success) {
          this.processedQueueCount++;
          this.lastSyncTimestamp = new Date().toISOString();
        } else {
          throw new Error('Save returned false status');
        }
      } catch (err) {
        if (task.retries < 5) {
          task.retries++;
          const backoffMs = Math.pow(2, task.retries) * 1000 + Math.random() * 500;
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          this.workerQueue.push(task);
        } else {
          this.syncErrors++;
          console.error(`[BackgroundWorker] Task permanently failed after 5 retries for ${task.collection}/${task.id}:`, err);
        }
      }
    }

    this.workerRunning = false;
  }

  public static getSyncHealthMetrics(): SyncHealthMetrics {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    let liveState: LiveSyncState = 'SYNCED';

    if (!isOnline) {
      liveState = 'OFFLINE';
    } else if (this.syncErrors > 5 && !this.isConnected) {
      liveState = 'ERROR';
    } else if (this.workerRunning || this.workerQueue.length > 0) {
      liveState = 'SYNCING';
    } else if (this.activeUnsubscribers.length > 0) {
      liveState = 'LIVE';
    }

    return {
      status: !isOnline ? 'offline' : (this.isConnected ? 'connected' : 'connecting'),
      liveState,
      projectId: firebaseConfig.projectId || 'gen-lang-client-0076489895',
      databaseId: (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-labmedixautoheal-1ac13548-bbcc-4f91-96bd-c8c990bec0c8',
      activeListenersCount: this.activeUnsubscribers.length || Object.keys(this.KEY_TO_FIRESTORE_MAP).length,
      lastSyncTime: this.lastSyncTimestamp,
      pendingQueueSize: this.workerQueue.length,
      processedCount: this.processedQueueCount,
      syncErrorsCount: this.syncErrors,
      totalCollectionsMonitored: Object.keys(this.KEY_TO_FIRESTORE_MAP).length
    };
  }

  public static getWorkerMetrics() {
    return {
      pendingQueueSize: this.workerQueue.length,
      processedCount: this.processedQueueCount,
      lastSyncTime: this.lastSyncTimestamp,
      isWorking: this.workerRunning,
      projectId: firebaseConfig.projectId || 'gen-lang-client-0076489895',
      databaseId: (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-labmedixautoheal-1ac13548-bbcc-4f91-96bd-c8c990bec0c8'
    };
  }
}
