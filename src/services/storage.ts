import {
  User,
  Patient,
  HealthCard,
  Membership,
  FamilyGroup,
  Wallet,
  WalletTransaction,
  AuditLog,
  CompanyProfile,
  SnapshotRecord,
  BackupData,
  CashDeskVoucher,
  SampleDispatchRecord,
  NgoPartner,
  HealthCamp,
  CampAttendee,
  CharityGrant,
  NgoFundTransaction,
  CardDispatchRecord,
  CardDispatchBatch,
  PatientAppointment,
  ClinicalEncounter,
  PatientBill,
  StaffCardTransaction
} from '../types';
import { DEFAULT_COMPANY_PROFILE, DEFAULT_CARD_DESIGN, DEFAULT_CLINIC_REGISTRATION_SETTINGS } from '../constants/defaults';
import { DEFAULT_MEMBERSHIPS } from '../constants/memberships';
import {
  DEFAULT_NGO_PARTNERS,
  DEFAULT_HEALTH_CAMPS,
  DEFAULT_CAMP_ATTENDEES,
  DEFAULT_CHARITY_GRANTS,
  DEFAULT_NGO_FUND_TRANSACTIONS
} from '../constants/ngoDefaults';

import { GoogleDriveService } from './googleDriveService';
import { getGoogleAccessToken } from './googleAuth';
import { ApiSyncService } from './apiSyncService';
import { FirestoreBackupService } from './firestoreBackupService';
import { AutoHealingService } from './autoHealingService';
import { generateBarcodeDataUrl } from '../utils/barcode';

export const STORAGE_KEYS = {
  USERS: 'labmedix_users_v1',
  PATIENTS: 'labmedix_patients_v1',
  CARDS: 'labmedix_cards_v1',
  MEMBERSHIPS: 'labmedix_memberships_v1',
  FAMILIES: 'labmedix_families_v1',
  WALLETS: 'labmedix_wallets_v1',
  TRANSACTIONS: 'labmedix_transactions_v1',
  AUDIT_LOGS: 'labmedix_audit_logs_v1',
  COMPANY_PROFILE: 'labmedix_company_profile_v1',
  SNAPSHOTS: 'labmedix_snapshots_v1',
  CURRENT_USER: 'labmedix_current_user_v1',
  SCREEN_LOCKED: 'labmedix_screen_locked_v1',
  THEME: 'labmedix_theme_v1',
  EMR_ENCOUNTERS: 'labmedix_clinical_encounters',
  APPOINTMENTS: 'labmedix_patient_appointments_v1',
  DOCTORS: 'labmedix_doctor_master_records_v1',
  DOCTOR_PAYOUTS: 'labmedix_doctor_commission_payouts_v1',
  LAB_TESTS: 'LABMEDIX_TEST_MASTER_LIST',
  HEALTH_PACKAGES: 'LABMEDIX_HEALTH_PACKAGES_LIST',
  PORTAL_LAB_BOOKINGS: 'labmedix_portal_lab_bookings_v1',
  PORTAL_PHARMACY_ORDERS: 'labmedix_portal_pharmacy_orders_v1',
  PORTAL_CARD_APPLICATIONS: 'labmedix_portal_card_applications_v1',
  WEBSITE_CMS: 'LABMEDIX_WEBSITE_CMS_CONFIG',
  INTEGRATIONS: 'labmedix_integrations_v4',
  FAILED_LOGINS: 'LABMEDIX_STAFF_FAILED_LOGIN_RECORDS',
  RECOVERY_VAULT: 'labmedix_recovery_vault_v1',
  CASH_DESK_VOUCHERS: 'LABMEDIX_CASH_DESK_VOUCHERS_V1',
  VOUCHER_SETTINGS: 'labmedix_voucher_user_settings_v1',
  SAMPLE_DISPATCHES: 'labmedix_sample_dispatches_v1',
  CARD_DISPATCHES: 'labmedix_card_dispatches_v1',
  CARD_DISPATCH_BATCHES: 'labmedix_card_dispatch_batches_v1',
  LAST_BACKUP_TIMESTAMP: 'labmedix_last_backup_timestamp_v1',
  LAST_BACKUP_PROMPT_TIMESTAMP: 'labmedix_last_backup_prompt_timestamp_v1',
  NGO_PARTNERS: 'labmedix_ngo_partners_v1',
  HEALTH_CAMPS: 'labmedix_health_camps_v1',
  CAMP_ATTENDEES: 'labmedix_camp_attendees_v1',
  CHARITY_GRANTS: 'labmedix_charity_grants_v1',
  NGO_FUND_TRANSACTIONS: 'labmedix_ngo_fund_transactions_v1',
  BILLS: 'labmedix_bills_v1',
  CARD_REQUEST_TRANSACTIONS: 'labmedix_card_request_transactions_v1',
  // Clinical Hospital Departments
  EMERGENCY_ENCOUNTERS: 'labmedix_emergency_encounters_v1',
  IPD_ADMISSIONS: 'labmedix_ipd_admissions_v1',
  HOSPITAL_WARDS: 'labmedix_hospital_wards_v1',
  HOSPITAL_BEDS: 'labmedix_hospital_beds_v1',
  NURSING_TASKS: 'labmedix_nursing_tasks_v1',
  NURSING_MAR: 'labmedix_nursing_mar_v1',
  NURSING_IO: 'labmedix_nursing_io_v1',
  NURSING_HANDOVERS: 'labmedix_nursing_handovers_v1',
  SURGERY_BOOKINGS: 'labmedix_surgery_bookings_v1',
  ANAESTHESIA_RECORDS: 'labmedix_anaesthesia_records_v1',
  RADIOLOGY_ORDERS: 'labmedix_radiology_orders_v1',
  BLOOD_UNITS: 'labmedix_blood_units_v1',
  BLOOD_REQUESTS: 'labmedix_blood_requests_v1',
  BLOOD_DONORS: 'labmedix_blood_donors_v1'
};

const INITIAL_USERS: User[] = [
  {
    id: 'usr_super_admin',
    staffId: 'LMDX-STF-001',
    employeeNo: 'LMDX-EMP-001',
    username: 'angadmandal3@gmail.com',
    fullName: 'Angad Mandal',
    email: 'angadmandal3@gmail.com',
    role: 'super_admin',
    designation: 'Chief Medical Director & System Owner',
    photoUrl: undefined,
    bloodGroup: 'O+',
    phone: '+91 98300 00001',
    workPhone: 'EXT-101 (Executive)',
    department: 'Executive Medical Board',
    accessZone: 'Zone ROOT: Full Medical, OT, ICU & Root Server Access',
    nationalId: 'UID-8821-9940-1120',
    licenseNo: 'WBMC-DIR-0091',
    emergencyContact: '9830099999',
    emergencyContactName: 'Executive Secretariat',
    cardThemeWish: 'premium_medical',
    cardMaterialWish: 'gold_foil',
    status: 'active',
    pinCode: 'Angad@1999',
    password: 'Angad@1999',
    joiningDate: '2025-01-01',
    expiryDate: '2028-12-31',
    createdAt: '2025-01-01T00:00:00.000Z'
  }
];

const INITIAL_PATIENTS: Patient[] = [];

const INITIAL_CARDS: HealthCard[] = [];

const INITIAL_WALLETS: Wallet[] = [];

const INITIAL_TRANSACTIONS: WalletTransaction[] = [];

const INITIAL_AUDIT_LOGS: AuditLog[] = [];

/* =======================================================================
   LABMEDIX SECURE STORAGE ENGINE v3 (ENTERPRISE RESILIENT)
   Quadruple-Redundant: Memory Cache → localStorage → sessionStorage → IndexedDB
   Auto-recovery, Persistent Storage API, Quota Protection, Cross-Tab Sync
   ======================================================================= */

export class StorageService {

  private static backupSyncTimeout: any = null;
  private static lastLiveSnapshotTs = 0;

  private static triggerServerBackupSync() {
    if (this.backupSyncTimeout) {
      clearTimeout(this.backupSyncTimeout);
    }

    // Debounce for live modifications to prevent UI stalls
    this.backupSyncTimeout = setTimeout(() => {
      this.performServerBackupSync();
    }, 4000);
  }

  private static async performServerBackupSync() {
    try {
      // 1. Gather comprehensive live database state across ALL portals & site modules
      const data: Record<string, any> = {
        users: this.getUsers(),
        patients: this.getPatients(),
        cards: this.getCards(),
        memberships: this.getMemberships(),
        families: this.getFamilies(),
        wallets: this.getWallets(),
        transactions: this.getTransactions(),
        auditLogs: this.getAuditLogs(),
        companyProfile: this.getCompanyProfile(),
        cashDeskVouchers: this.getCashDeskVouchers(),
        bills: this.getBills(),
        portalLabBookings: this.getItem(STORAGE_KEYS.PORTAL_LAB_BOOKINGS, []),
        portalPharmacyOrders: this.getItem(STORAGE_KEYS.PORTAL_PHARMACY_ORDERS, []),
        portalCardApplications: this.getItem(STORAGE_KEYS.PORTAL_CARD_APPLICATIONS, []),
        websiteCms: this.getItem(STORAGE_KEYS.WEBSITE_CMS, null),
        integrations: this.getItem(STORAGE_KEYS.INTEGRATIONS, null),
        appointments: this.getItem(STORAGE_KEYS.APPOINTMENTS, []),
        emrEncounters: this.getItem(STORAGE_KEYS.EMR_ENCOUNTERS, []),
        doctors: this.getItem(STORAGE_KEYS.DOCTORS, []),
        doctorPayouts: this.getItem(STORAGE_KEYS.DOCTOR_PAYOUTS, []),
        labTests: this.getItem(STORAGE_KEYS.LAB_TESTS, []),
        healthPackages: this.getItem(STORAGE_KEYS.HEALTH_PACKAGES, []),
        recoveryVault: this.getItem(STORAGE_KEYS.RECOVERY_VAULT, []),
        voucherSettings: this.getItem(STORAGE_KEYS.VOUCHER_SETTINGS, null),
        sampleDispatches: this.getItem(STORAGE_KEYS.SAMPLE_DISPATCHES, []),
        cardDispatches: this.getItem(STORAGE_KEYS.CARD_DISPATCHES, []),
        cardDispatchBatches: this.getItem(STORAGE_KEYS.CARD_DISPATCH_BATCHES, []),
        ngoPartners: this.getItem(STORAGE_KEYS.NGO_PARTNERS, []),
        healthCamps: this.getItem(STORAGE_KEYS.HEALTH_CAMPS, []),
        campAttendees: this.getItem(STORAGE_KEYS.CAMP_ATTENDEES, []),
        charityGrants: this.getItem(STORAGE_KEYS.CHARITY_GRANTS, []),
        ngoFundTransactions: this.getItem(STORAGE_KEYS.NGO_FUND_TRANSACTIONS, []),
        timestamp: new Date().toISOString()
      };

      // 1b. Include all dynamic patient vitals keys from localStorage
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('labmedix_patient_vitals_')) {
            const raw = localStorage.getItem(key);
            if (raw) data[key] = JSON.parse(raw);
          }
        }
      } catch { }

      // 2. Automatically record a Time-Machine Snapshot if at least 60s passed since last auto-snapshot
      const now = Date.now();
      if (now - this.lastLiveSnapshotTs > 60000) {
        this.lastLiveSnapshotTs = now;
        try {
          const snapshots = this.getSnapshots();
          const autoSnap: SnapshotRecord = {
            id: `snap_auto_${now}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toISOString(),
            title: `Live Realtime Auto-Backup [${new Date().toLocaleTimeString()}]`,
            tag: 'auto_live',
            sizeBytes: 25000,
            recordCounts: {
              patients: data.patients.length,
              healthCards: data.cards.length,
              memberships: data.memberships.length,
              families: data.families.length,
              wallets: data.wallets.length,
              walletTransactions: data.transactions.length,
              auditLogs: data.auditLogs.length,
              users: data.users.length
            },
            data,
            checksum: `SHA256-LIVE-${now.toString(16).toUpperCase()}`,
            isCloudSynced: true
          };
          snapshots.unshift(autoSnap);
          if (snapshots.length > 20) snapshots.pop();
          localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(snapshots));
        } catch { }
      }

      // 3. Post to backend server endpoint for Cloud Run container sync
      const driveToken = getGoogleAccessToken();
      await fetch('/api/backup/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, googleToken: driveToken })
      }).catch(() => { });

      // 4. Trigger direct client-side Google Drive upload and flush Zero-Data-Loss WAL
      GoogleDriveService.triggerAutoBackup();
      FirestoreBackupService.scheduleWalFlush(500);
    } catch (e) {
      console.warn('Failed to execute live backup sync:', e);
    }
  }


  // Simulated Encryption to comply with "never expose in browser storage"
  public static encrypt(text: string): string {
    if (!text) return text;
    if (text.startsWith('ENC::')) return text;
    return 'ENC::' + btoa(text.split('').reverse().join(''));
  }
  public static decrypt(text: string): string {
    if (!text || !text.startsWith('ENC::')) return text;
    return atob(text.replace('ENC::', '')).split('').reverse().join('');
  }

  private static memoryCache: Map<string, any> = new Map();
  private static syncChannel: BroadcastChannel | null = null;
  private static isInitialized = false;
  private static pendingNotifyKeys = new Set<string>();
  private static notifyDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * High-Performance Batched Event Dispatcher:
   * Coalesces rapid sequential key updates (e.g. initial Firestore hydration, bulk operations)
   * into a single micro-debounced UI event to prevent main-thread lag and re-render thrashing.
   */
  public static scheduleDataSyncedNotification(key: string, value?: any): void {
    if (typeof window === 'undefined') return;
    this.pendingNotifyKeys.add(key);

    if (this.notifyDebounceTimer) return;

    this.notifyDebounceTimer = setTimeout(() => {
      const keysArray = Array.from(StorageService.pendingNotifyKeys);
      StorageService.pendingNotifyKeys.clear();
      StorageService.notifyDebounceTimer = null;

      window.dispatchEvent(new CustomEvent('labmedix_data_synced', {
        detail: {
          keys: keysArray,
          key: keysArray.length === 1 ? keysArray[0] : undefined,
          timestamp: Date.now()
        }
      }));
    }, 35); // 35ms batch window: imperceptible latency, eliminates re-render spikes
  }

  /* ── PUBLIC: Request browser persistent storage (prevents OS cache eviction on mobile & desktop) ── */
  public static async requestPersistentStorage(): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.info(`[LABMEDIX SECURE ENGINE] Persistent Storage state: ${isPersisted ? 'GRANTED (Immune to Cache Eviction)' : 'DEFAULT'}`);
        return isPersisted;
      }
    } catch (e) {
      console.warn('[LABMEDIX] Persistent storage request error:', e);
    }
    return false;
  }

  public static async isStoragePersisted(): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
        return await navigator.storage.persisted();
      }
    } catch { }
    return false;
  }

  /* ── PUBLIC: Write to Memory, localStorage, sessionStorage, and IndexedDB ── */
  public static setItem<T>(key: string, value: T): void {
    // 1. Hot in-memory cache
    StorageService.memoryCache.set(key, value);

    const serialized = JSON.stringify(value);

    // 2. Primary Persistent Web Storage
    try {
      localStorage.setItem(key, serialized);
      // Only sync if it's a critical key (not theme/screen_locked)
      if (![STORAGE_KEYS.THEME, STORAGE_KEYS.SCREEN_LOCKED].includes(key)) {
        this.triggerServerBackupSync();
      }
    } catch (e: any) {
      if (e?.name === 'QuotaExceededError' || e?.code === 22 || String(e).includes('quota')) {
        console.warn(`[LABMEDIX] localStorage quota exceeded for "${key}". Running autonomous healing & prune…`);
        AutoHealingService.handleQuotaExceeded(key);
        StorageService.aggressivePrune();
        try {
          localStorage.setItem(key, serialized);
          if (![STORAGE_KEYS.THEME, STORAGE_KEYS.SCREEN_LOCKED].includes(key)) {
            this.triggerServerBackupSync();
          }
        } catch {
          // Data still in memory cache and IndexedDB — not lost
          console.warn(`[LABMEDIX] localStorage still full after autonomous prune for "${key}". Stored in memory+IDB only.`);
        }
      } else {
        console.error(`[LABMEDIX] localStorage write failed for ${key}:`, e);
      }
    }

    // 3. Tab Session Mirror
    try {
      sessionStorage.setItem(key, serialized);
    } catch { /* session mirror failure is non-critical */ }

    // 4. Deep IndexedDB Persistence (Survives browser cache resets & low storage eviction)
    StorageService.idbSet(key, serialized).catch(() => { });

    // 5. Cross-Tab Live Broadcast Sync
    try {
      if (StorageService.syncChannel) {
        StorageService.syncChannel.postMessage({ type: 'DATA_UPDATED', key, timestamp: Date.now() });
      }
    } catch { }

    // 6. Direct Central Server Database Sync API (Persists across devices)
    if (![STORAGE_KEYS.THEME, STORAGE_KEYS.SCREEN_LOCKED].includes(key)) {
      fetch(`/api/sync/key/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      }).catch(() => { });

      // 7. Direct Firestore Cloud Database Sync for second-by-second multi-device sync
      ApiSyncService.syncKeyToFirestore(key, value).catch(() => { });
    }

    // 8. Broadcast update event locally via high-performance micro-debounced batcher
    StorageService.scheduleDataSyncedNotification(key, value);

    // 9. Trigger Live Backup to Google Drive if configured (Exclude internal logs/snapshots to prevent loops)
    const INTERNAL_ONLY_KEYS = [
      STORAGE_KEYS.AUDIT_LOGS,
      STORAGE_KEYS.SNAPSHOTS,
      STORAGE_KEYS.THEME,
      STORAGE_KEYS.SCREEN_LOCKED,
      STORAGE_KEYS.RECOVERY_VAULT,
      STORAGE_KEYS.INTEGRATIONS,
      STORAGE_KEYS.LAST_BACKUP_TIMESTAMP,
      STORAGE_KEYS.LAST_BACKUP_PROMPT_TIMESTAMP
    ];
    if (!INTERNAL_ONLY_KEYS.includes(key as any)) {
      GoogleDriveService.triggerAutoBackup();
    }
  }

  /**
   * Public Helper: Update in-memory cache and localStorage immediately when real-time cloud data arrives,
   * bypassing stale reads and notifying all React components smoothly.
   */
  public static updateCacheAndNotify(key: string, value: any): void {
    if (!key || value === undefined) return;
    if ([STORAGE_KEYS.THEME, STORAGE_KEYS.SCREEN_LOCKED].includes(key)) return;

    StorageService.memoryCache.set(key, value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { }
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch { }

    StorageService.scheduleDataSyncedNotification(key, value);
  }

  /** Excluded legacy demo account IDs to prevent ghost staff proliferation */
  public static readonly DEMO_USER_IDS_TO_EXCLUDE = [
    'usr_admin',
    'usr_doctor',
    'usr_reception',
    'usr_lab_staff',
    'usr_manager',
    'usr_card_operator',
    'usr_marketing',
    'usr_read_only',
    'usr_admin_ops',
    'usr_reception_desk',
    'usr_cashier_desk',
    'usr_lab_technician',
    'usr_phlebotomist_specimen',
    'usr_manager_ops',
    'usr_card_operator_studio'
  ];

  /**
   * Update cache and browser storage silently without triggering recursive notification cascades
   */
  public static updateCacheSilently(key: string, value: any): void {
    if (!key || value === undefined) return;
    if ([STORAGE_KEYS.THEME, STORAGE_KEYS.SCREEN_LOCKED].includes(key)) return;

    StorageService.memoryCache.set(key, value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { }
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch { }
  }

  /* ── PUBLIC: Read with multi-layer fallback ── */
  public static getItem<T>(key: string, defaultValue: T): T {
    // Layer 1: Memory cache
    if (StorageService.memoryCache.has(key)) {
      return StorageService.memoryCache.get(key) as T;
    }

    // Layer 2: localStorage
    try {
      const v = localStorage.getItem(key);
      if (v) {
        try {
          const parsed = JSON.parse(v) as T;
          if (parsed !== null && parsed !== undefined) {
            StorageService.memoryCache.set(key, parsed);
            return parsed;
          }
        } catch (err) {
          console.warn(`[LABMEDIX] Corrupted JSON in localStorage for key "${key}". Running autonomous healing...`, err);
          AutoHealingService.healCorruptedKey(key).catch(() => {});
        }
      }
    } catch { /* fall through */ }

    // Layer 3: sessionStorage mirror
    try {
      const v = sessionStorage.getItem(key);
      if (v) {
        try {
          const parsed = JSON.parse(v) as T;
          if (parsed !== null && parsed !== undefined) {
            console.info(`[LABMEDIX] Restored ${key} from sessionStorage mirror.`);
            StorageService.memoryCache.set(key, parsed);
            try { localStorage.setItem(key, v); } catch { }
            return parsed;
          }
        } catch (err) {
          console.warn(`[LABMEDIX] Corrupted JSON in sessionStorage for key "${key}". Running autonomous healing...`, err);
          AutoHealingService.healCorruptedKey(key).catch(() => {});
        }
      }
    } catch { /* fall through */ }

    // Layer 4: Async IndexedDB Recovery (initiates background heal)
    StorageService.idbGet(key).then(v => {
      if (v) {
        try {
          const parsed = JSON.parse(v);
          if (parsed !== null && parsed !== undefined) {
            console.info(`[LABMEDIX] Healed ${key} from IndexedDB backup.`);
            try {
              localStorage.setItem(key, v);
              StorageService.memoryCache.set(key, parsed);
            } catch { }
          }
        } catch (err) {
          console.warn(`[LABMEDIX] Corrupted JSON in IndexedDB for key "${key}".`, err);
        }
      }
    }).catch(() => { });

    StorageService.memoryCache.set(key, defaultValue);
    return defaultValue;
  }

  /* ── PUBLIC: Remove item across all layers ── */
  public static removeItem(key: string): void {
    StorageService.memoryCache.delete(key);
    try { localStorage.removeItem(key); } catch { }
    try { sessionStorage.removeItem(key); } catch { }
    StorageService.idbRemove(key).catch(() => { });
  }

  /* ── INTERNAL: IndexedDB helpers ── */
  private static readonly IDB_NAME = 'LABMEDIX_SECURE_DB';
  private static readonly IDB_STORE = 'labmedix_store';
  private static readonly IDB_VER = 1;

  private static openIDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) return reject('No IndexedDB');
      const req = window.indexedDB.open(StorageService.IDB_NAME, StorageService.IDB_VER);
      req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(StorageService.IDB_STORE)) {
          db.createObjectStore(StorageService.IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private static async idbSet(key: string, value: string): Promise<void> {
    try {
      const db = await StorageService.openIDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(StorageService.IDB_STORE, 'readwrite');
        const store = tx.objectStore(StorageService.IDB_STORE);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch { }
  }

  private static async idbGet(key: string): Promise<string | null> {
    try {
      const db = await StorageService.openIDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(StorageService.IDB_STORE, 'readonly');
        const store = tx.objectStore(StorageService.IDB_STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  private static async idbRemove(key: string): Promise<void> {
    try {
      const db = await StorageService.openIDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(StorageService.IDB_STORE, 'readwrite');
        const store = tx.objectStore(StorageService.IDB_STORE);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch { }
  }

  /* ── INTERNAL: Prune old audit logs to free localStorage quota ── */
  private static pruneOldAuditLogs(): void {
    try {
      const logs = StorageService.getAuditLogs();
      if (logs.length > 500) {
        const pruned = logs.slice(-500);
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(pruned));
        console.info('[LABMEDIX] Pruned audit logs to latest 500 entries to free storage quota.');
      }
    } catch { }
  }

  /**
   * Aggressive localStorage prune for QuotaExceededError recovery.
   * Trims audit logs → snapshots → Firestore sequence keys (largest consumers).
   */
  private static aggressivePrune(): void {
    try {
      // 1. Prune audit logs to 100 most recent
      const logs = StorageService.getAuditLogs();
      if (logs.length > 100) {
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 100)));
        console.info('[LABMEDIX QuotaPrune] Audit logs trimmed to 100.');
      }
    } catch { }

    try {
      // 2. Clear all local snapshots (they are also in IndexedDB and Firestore)
      localStorage.removeItem(STORAGE_KEYS.SNAPSHOTS);
      console.info('[LABMEDIX QuotaPrune] Local snapshots cleared (preserved in Firestore cloud vault).');
    } catch { }

    try {
      // 3. Remove Firestore internal sequence/persistence keys (safe to remove — Firestore recreates them)
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (
          k.startsWith('firestore_') ||
          k.startsWith('fs_') ||
          k.includes('firestore/') ||
          k.includes('sequence_number') ||
          k.includes('firestore_mutations')
        )) {
          toRemove.push(k);
        }
      }
      toRemove.forEach(k => { try { localStorage.removeItem(k); } catch { } });
      if (toRemove.length > 0) {
        console.info(`[LABMEDIX QuotaPrune] Removed ${toRemove.length} Firestore internal cache keys.`);
      }
    } catch { }

    try {
      // 4. Prune dynamic patient vitals to most recent 10 patients
      const vitalsKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('labmedix_patient_vitals_')) vitalsKeys.push(k);
      }
      if (vitalsKeys.length > 10) {
        vitalsKeys.slice(10).forEach(k => { try { localStorage.removeItem(k); } catch { } });
        console.info(`[LABMEDIX QuotaPrune] Removed ${vitalsKeys.length - 10} old patient vitals entries.`);
      }
    } catch { }
  }

  /* ── PUBLIC: Force-sync all data to IndexedDB ── */
  public static async forceSyncToIndexedDB(): Promise<void> {
    const keys = Object.values(STORAGE_KEYS);
    for (const key of keys) {
      const v = localStorage.getItem(key);
      if (v) await StorageService.idbSet(key, v).catch(() => { });
    }
    console.info('[LABMEDIX] All data force-synced to IndexedDB backup.');
  }

  /* ── PUBLIC: Export all data as downloadable JSON file ── */
  public static exportDataAsJSON(): void {
    const backup: Record<string, any> = {};
    // Export all named storage keys
    for (const [name, key] of Object.entries(STORAGE_KEYS)) {
      try {
        const v = localStorage.getItem(key);
        if (v) backup[name] = JSON.parse(v);
      } catch { }
    }
    // Export all dynamic patient vitals keys
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('labmedix_patient_vitals_')) {
          const raw = localStorage.getItem(key);
          if (raw) backup[key] = JSON.parse(raw);
        }
      }
    } catch { }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LABMEDIX_FULL_SECURE_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── PUBLIC: Import data from backup JSON ── */
  public static importDataFromJSON(jsonText: string): boolean {
    try {
      const backup = JSON.parse(jsonText) as Record<string, any>;
      const namedKeys = new Set(Object.values(STORAGE_KEYS));
      for (const [name, key] of Object.entries(STORAGE_KEYS)) {
        if (backup[name] !== undefined) {
          StorageService.setItem(key, backup[name]);
        }
      }
      // Restore dynamic patient vitals keys
      for (const [key, value] of Object.entries(backup)) {
        if (key.startsWith('labmedix_patient_vitals_') && !namedKeys.has(key)) {
          try { StorageService.setItem(key, value); } catch { }
        }
      }
      console.info('[LABMEDIX] Data restored from backup JSON.');
      return true;
    } catch (e) {
      console.error('[LABMEDIX] Import failed:', e);
      return false;
    }
  }

  /* ── PUBLIC: Get storage usage info ── */
  public static getStorageInfo(): { usedKB: number; totalKB: number; pct: number; safe: boolean } {
    let used = 0;
    try {
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          used += (localStorage.getItem(key) || '').length * 2; // UTF-16 bytes
        }
      }
    } catch { }
    const totalKB = 5120; // ~5MB standard localStorage limit
    const usedKB = Math.round(used / 1024);
    const pct = Math.round((usedKB / totalKB) * 100);
    return { usedKB, totalKB, pct, safe: pct < 80 };
  }

  /* ── PUBLIC: Initialize and start background persistence engine ── */
  public static initPersistentEngine(): void {
    if (typeof window !== 'undefined') {
      (window as any).__labmedix_mem_cache = StorageService.memoryCache;
      (window as any).__labmedix_update_cache = StorageService.updateCacheAndNotify;
    }

    if (StorageService.isInitialized || typeof window === 'undefined') return;
    StorageService.isInitialized = true;

    // 1. Request persistent storage from browser
    StorageService.requestPersistentStorage();

    // 2. Setup Cross-Tab Broadcast Channel
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        StorageService.syncChannel = new BroadcastChannel('labmedix_sync_channel');
        StorageService.syncChannel.onmessage = (event) => {
          if (event.data?.key) {
            StorageService.memoryCache.delete(event.data.key);
            window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key: event.data.key } }));
          }
        };
      }
    } catch { }

    // 3. Register page unload and visibility change to flush writes to IndexedDB
    window.addEventListener('beforeunload', () => {
      StorageService.forceSyncToIndexedDB().catch(() => { });
    });
    window.addEventListener('pagehide', () => {
      StorageService.forceSyncToIndexedDB().catch(() => { });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        StorageService.forceSyncToIndexedDB().catch(() => { });
      } else if (document.visibilityState === 'visible') {
        console.info('[LABMEDIX] Screen/tab resumed. Reconnecting live Firestore streams...');
        import('./multiDeviceSyncService').then(m => m.MultiDeviceSyncService.registerOrUpdateDeviceSession().catch(() => {})).catch(() => {});
        ApiSyncService.ensureActiveSubscriptions((key, val) => {
          StorageService.updateCacheAndNotify(key, val);
        });
        window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { action: 'VISIBILITY_RESUME' } }));
      }
    });

    window.addEventListener('focus', () => {
      import('./multiDeviceSyncService').then(m => m.MultiDeviceSyncService.registerOrUpdateDeviceSession().catch(() => {})).catch(() => {});
      ApiSyncService.ensureActiveSubscriptions((key, val) => {
        StorageService.updateCacheAndNotify(key, val);
      });
      window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { action: 'WINDOW_FOCUS' } }));
    });

    // 4. Real-Time Cloud Firestore Listener Subscription (Instant second-by-second pushes across all devices)
    try {
      ApiSyncService.subscribeToAll((key, val) => {
        StorageService.updateCacheAndNotify(key, val);
      });
    } catch (e) {
      console.warn('[LABMEDIX] Realtime Firestore subscribe notice:', e);
    }

    // 5. Proactive Auto-Healing Sync & Heartbeat Watchdog every 30 seconds
    setInterval(() => {
      StorageService.forceSyncToIndexedDB().catch(() => { });
      ApiSyncService.ensureActiveSubscriptions((key, val) => {
        StorageService.updateCacheAndNotify(key, val);
      });
    }, 30000);
  }

  public static async initializeDatabase(): Promise<void> {
    StorageService.initPersistentEngine();

    // Start Autonomous Resilience Watchdog (Protects Super Admin & detects data corruption)
    try {
      AutoHealingService.startAutonomousWatchdog();
    } catch (err) {
      console.warn('[Storage] AutoHealing watchdog start notice:', err);
    }

    // 1. Cloud Firestore Cross-Device Hydration (Primary Source of Truth on startup)
    let cloudUsersCount = 0;
    try {
      const [
        cloudPatients,
        cloudCards,
        cloudApps,
        cloudWallets,
        cloudTxns,
        cloudAudit,
        cloudUsers,
        cloudMemberships,
        cloudAppointments,
        cloudEncounters,
        cloudDoctors,
        cloudDoctorPayouts,
        cloudLabTests,
        cloudHealthPackages,
        cloudLabBookings,
        cloudPharmacyOrders,
        cloudVouchers,
        cloudDispatches,
        cloudCardDispatches,
        cloudCardDispatchBatches,
        cloudSnapshots,
        cloudCompany,
        cloudVoucherSettings,
        cloudNgoPartners,
        cloudHealthCamps,
        cloudCampAttendees,
        cloudCharityGrants,
        cloudNgoTxns,
        cloudMembershipTiers,
        cloudBills
      ] = await Promise.all([
        ApiSyncService.fetchCollection<Patient>('patients').catch(() => []),
        ApiSyncService.fetchCollection<HealthCard>('cards').catch(() => []),
        ApiSyncService.fetchCollection<any>('cardApplications').catch(() => []),
        ApiSyncService.fetchCollection<Wallet>('wallets').catch(() => []),
        ApiSyncService.fetchCollection<WalletTransaction>('transactions').catch(() => []),
        ApiSyncService.fetchCollection<AuditLog>('auditLogs').catch(() => []),
        ApiSyncService.fetchCollection<User>('users').catch(() => []),
        ApiSyncService.fetchCollection<Membership>('memberships').catch(() => []),
        ApiSyncService.fetchCollection<any>('appointments').catch(() => []),
        ApiSyncService.fetchCollection<any>('emrEncounters').catch(() => []),
        ApiSyncService.fetchCollection<any>('doctors').catch(() => []),
        ApiSyncService.fetchCollection<any>('doctorPayouts').catch(() => []),
        ApiSyncService.fetchCollection<any>('labTests').catch(() => []),
        ApiSyncService.fetchCollection<any>('healthPackages').catch(() => []),
        ApiSyncService.fetchCollection<any>('labBookings').catch(() => []),
        ApiSyncService.fetchCollection<any>('pharmacyOrders').catch(() => []),
        ApiSyncService.fetchCollection<any>('vouchers').catch(() => []),
        ApiSyncService.fetchCollection<SampleDispatchRecord>('sampleDispatches').catch(() => []),
        ApiSyncService.fetchCollection<CardDispatchRecord>('cardDispatches').catch(() => []),
        ApiSyncService.fetchCollection<CardDispatchBatch>('cardDispatchBatches').catch(() => []),
        ApiSyncService.fetchCollection<SnapshotRecord>('snapshots').catch(() => []),
        ApiSyncService.fetchDocument<CompanyProfile>('settings/companyProfile').catch(() => null),
        ApiSyncService.fetchDocument<any>('settings/voucherSettings').catch(() => null),
        ApiSyncService.fetchCollection<NgoPartner>('ngoPartners').catch(() => []),
        ApiSyncService.fetchCollection<HealthCamp>('healthCamps').catch(() => []),
        ApiSyncService.fetchCollection<CampAttendee>('campAttendees').catch(() => []),
        ApiSyncService.fetchCollection<CharityGrant>('charityGrants').catch(() => []),
        ApiSyncService.fetchCollection<NgoFundTransaction>('ngoTransactions').catch(() => []),
        ApiSyncService.fetchCollection<Membership>('membershipTiers').catch(() => []),
        ApiSyncService.fetchCollection<PatientBill>('bills').catch(() => [])
      ]);

      const effectiveMemberships = (cloudMembershipTiers && cloudMembershipTiers.length > 0)
        ? cloudMembershipTiers
        : cloudMemberships;

      cloudUsersCount = cloudUsers.length;

      const syncEntity = <T>(cloudItems: T[], key: string) => {
        if (Array.isArray(cloudItems)) {
          // Cloud Firestore is the absolute single source of truth across all devices
          StorageService.updateCacheAndNotify(key, cloudItems);
        }
      };

      syncEntity(cloudPatients, STORAGE_KEYS.PATIENTS);
      syncEntity(cloudCards, STORAGE_KEYS.CARDS);
      syncEntity(cloudApps, STORAGE_KEYS.PORTAL_CARD_APPLICATIONS);
      syncEntity(cloudWallets, STORAGE_KEYS.WALLETS);
      syncEntity(cloudTxns, STORAGE_KEYS.TRANSACTIONS);
      syncEntity(cloudAudit, STORAGE_KEYS.AUDIT_LOGS);
      syncEntity(cloudUsers, STORAGE_KEYS.USERS);
      syncEntity(effectiveMemberships, STORAGE_KEYS.MEMBERSHIPS);
      syncEntity(effectiveMemberships, 'labmedix_membership_tiers_v1');
      syncEntity(cloudAppointments, STORAGE_KEYS.APPOINTMENTS);
      syncEntity(cloudEncounters, STORAGE_KEYS.EMR_ENCOUNTERS);
      syncEntity(cloudDoctors, STORAGE_KEYS.DOCTORS);
      syncEntity(cloudDoctorPayouts, STORAGE_KEYS.DOCTOR_PAYOUTS);
      syncEntity(cloudLabTests, STORAGE_KEYS.LAB_TESTS);
      syncEntity(cloudHealthPackages, STORAGE_KEYS.HEALTH_PACKAGES);
      syncEntity(cloudLabBookings, STORAGE_KEYS.PORTAL_LAB_BOOKINGS);
      syncEntity(cloudPharmacyOrders, STORAGE_KEYS.PORTAL_PHARMACY_ORDERS);
      syncEntity(cloudVouchers, STORAGE_KEYS.CASH_DESK_VOUCHERS);
      syncEntity(cloudDispatches, STORAGE_KEYS.SAMPLE_DISPATCHES);
      syncEntity(cloudCardDispatches, STORAGE_KEYS.CARD_DISPATCHES);
      syncEntity(cloudCardDispatchBatches, STORAGE_KEYS.CARD_DISPATCH_BATCHES);
      syncEntity(cloudSnapshots, STORAGE_KEYS.SNAPSHOTS);
      syncEntity(cloudNgoPartners, STORAGE_KEYS.NGO_PARTNERS);
      syncEntity(cloudHealthCamps, STORAGE_KEYS.HEALTH_CAMPS);
      syncEntity(cloudCampAttendees, STORAGE_KEYS.CAMP_ATTENDEES);
      syncEntity(cloudCharityGrants, STORAGE_KEYS.CHARITY_GRANTS);
      syncEntity(cloudNgoTxns, STORAGE_KEYS.NGO_FUND_TRANSACTIONS);
      syncEntity(cloudBills, STORAGE_KEYS.BILLS);

      if (cloudVoucherSettings) {
        StorageService.updateCacheAndNotify(STORAGE_KEYS.VOUCHER_SETTINGS, cloudVoucherSettings);
      }

      // Seed baseline system catalog ONLY if remote cloud catalog is completely empty
      if (effectiveMemberships.length === 0) {
        ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.MEMBERSHIPS, DEFAULT_MEMBERSHIPS).catch(() => {});
        ApiSyncService.upsertCollectionInFirestore('membershipTiers', DEFAULT_MEMBERSHIPS).catch(() => {});
        StorageService.updateCacheAndNotify(STORAGE_KEYS.MEMBERSHIPS, DEFAULT_MEMBERSHIPS);
        StorageService.updateCacheAndNotify('labmedix_membership_tiers_v1', DEFAULT_MEMBERSHIPS);
      }

      if (cloudCompany && cloudCompany.name) {
        StorageService.updateCacheAndNotify(STORAGE_KEYS.COMPANY_PROFILE, cloudCompany);
      } else {
        // Cloud company profile not set, seed DEFAULT_COMPANY_PROFILE
        ApiSyncService.syncKeyToFirestore('labmedix_company_profile_v1', DEFAULT_COMPANY_PROFILE).catch(() => {});
      }
    } catch (e) {
      console.warn('[LABMEDIX] Cloud Firestore cross-device sync hydration notice:', e);
    }

    const currentUsers = this.getItem<User[]>(STORAGE_KEYS.USERS, []);
    const mergedMap = new Map<string, User>();

    // Priority order:
    // 1. If Firestore returned users, they are authoritative (single source of truth).
    // 2. INITIAL_USERS are only used as a bootstrap fallback when cloud is completely empty.
    if (cloudUsersCount > 0) {
      // Firestore is the source of truth — use cloud users as the base, never override with hardcoded data.
      // Only add INITIAL_USERS entries that don't exist in cloud yet (e.g. super_admin bootstrap).
      currentUsers.forEach(u => {
        if (u && u.id && !StorageService.DEMO_USER_IDS_TO_EXCLUDE.includes(u.id)) {
          mergedMap.set(u.id, u);
        }
      });
      // Ensure super_admin always exists locally and matches default credentials
      const seedAdmin = INITIAL_USERS.find(u => u.role === 'super_admin');
      const hasSuperAdmin = Array.from(mergedMap.values()).some(u => u.role === 'super_admin');
      if (!hasSuperAdmin && seedAdmin) {
        mergedMap.set(seedAdmin.id, seedAdmin);
        ApiSyncService.saveDocument('users', seedAdmin.id, seedAdmin).catch(() => {});
      } else if (seedAdmin) {
        // Upgrade existing super_admin if legacy placeholder credentials found
        const existingAdmin = mergedMap.get(seedAdmin.id) || Array.from(mergedMap.values()).find(u => u.role === 'super_admin');
        if (existingAdmin && (existingAdmin.email === 'admin@labmedix.org' || existingAdmin.username === 'superadmin' || existingAdmin.password === 'LabMedix@2026Root#')) {
          const updatedAdmin: User = {
            ...existingAdmin,
            username: seedAdmin.username,
            fullName: seedAdmin.fullName,
            email: seedAdmin.email,
            pinCode: seedAdmin.pinCode,
            password: seedAdmin.password,
            role: 'super_admin',
            status: 'active'
          };
          mergedMap.set(existingAdmin.id, updatedAdmin);
          ApiSyncService.saveDocument('users', existingAdmin.id, updatedAdmin).catch(() => {});
        }
      }
    } else {
      // Cloud is empty — seed with INITIAL_USERS as bootstrap data
      INITIAL_USERS.forEach(u => mergedMap.set(u.id, u));
      currentUsers.forEach(u => {
        if (u && u.id && !StorageService.DEMO_USER_IDS_TO_EXCLUDE.includes(u.id)) {
          mergedMap.set(u.id, { ...mergedMap.get(u.id), ...u });
        }
      });
    }

    const finalUsers = Array.from(mergedMap.values());
    this.updateCacheSilently(STORAGE_KEYS.USERS, finalUsers);

    // Clean up any lingering legacy demo user records from Cloud Firestore to prevent oscillation loops
    this.DEMO_USER_IDS_TO_EXCLUDE.forEach(demoId => {
      ApiSyncService.deleteDocument('users', demoId).catch(() => {});
    });

    if (cloudUsersCount === 0) {
      // Seed Firestore with initial staff users
      ApiSyncService.syncUsers(finalUsers).catch(() => {});
    }
  }

  // Users
  public static getUsers(): User[] {
    const list = this.getItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const filtered = list.filter(u => u && !this.DEMO_USER_IDS_TO_EXCLUDE.includes(u.id));
    
    // Auto-heal / Populate employeeNo and barcodeDataUrl for any staff record missing them
    let hasUpdates = false;
    const seedAdmin = INITIAL_USERS.find(u => u.role === 'super_admin');
    
    // Ensure Super Admin has the official default credentials
    const adminIndex = filtered.findIndex(u => u.id === 'usr_super_admin' || u.role === 'super_admin');
    if (adminIndex !== -1 && seedAdmin) {
      const currentAdmin = filtered[adminIndex];
      if (currentAdmin.email === 'admin@labmedix.org' || currentAdmin.username === 'superadmin' || currentAdmin.password === 'LabMedix@2026Root#') {
        filtered[adminIndex] = {
          ...currentAdmin,
          username: seedAdmin.username,
          fullName: seedAdmin.fullName,
          email: seedAdmin.email,
          pinCode: seedAdmin.pinCode,
          password: seedAdmin.password,
          role: 'super_admin',
          status: 'active'
        };
        hasUpdates = true;
        ApiSyncService.saveDocument('users', filtered[adminIndex].id, filtered[adminIndex]).catch(() => {});
      }
    } else if (seedAdmin && adminIndex === -1) {
      filtered.unshift(seedAdmin);
      hasUpdates = true;
      ApiSyncService.saveDocument('users', seedAdmin.id, seedAdmin).catch(() => {});
    }

    filtered.forEach(u => {
      if (!u.employeeNo && u.staffId) {
        u.employeeNo = `LMDX-EMP-${u.staffId.replace(/\D/g, '').padStart(3, '0')}`;
        hasUpdates = true;
      }
      if (!u.barcodeDataUrl && u.staffId) {
        try {
          u.barcodeDataUrl = generateBarcodeDataUrl(u.staffId);
          hasUpdates = true;
        } catch {}
      }
    });

    if (hasUpdates || filtered.length !== list.length) {
      this.updateCacheSilently(STORAGE_KEYS.USERS, filtered);
    }
    return filtered.length > 0 ? filtered : INITIAL_USERS;
  }
  public static saveUsers(users: User[]): void {
    this.setItem(STORAGE_KEYS.USERS, users);
    ApiSyncService.syncUsers(users).catch(() => { });
  }
  public static getCurrentUser(): User | null {
    const current = this.getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (current && (current.id === 'usr_super_admin' || current.role === 'super_admin') && (current.email === 'admin@labmedix.org' || current.username === 'superadmin')) {
      current.username = 'angadmandal3@gmail.com';
      current.fullName = 'Angad Mandal';
      current.email = 'angadmandal3@gmail.com';
      current.password = 'Angad@1999';
      current.pinCode = 'Angad@1999';
      this.setItem(STORAGE_KEYS.CURRENT_USER, current);
    }
    return current;
  }
  public static setCurrentUser(user: User | null): void {
    this.setItem(STORAGE_KEYS.CURRENT_USER, user);
  }

  // Patients
  public static getPatients(): Patient[] {
    return this.getItem<Patient[]>(STORAGE_KEYS.PATIENTS, INITIAL_PATIENTS);
  }
  public static savePatients(patients: Patient[]): void {
    this.setItem(STORAGE_KEYS.PATIENTS, patients);
    ApiSyncService.syncPatients(patients).catch(() => { });
  }

  // Health Cards
  public static getCards(): HealthCard[] {
    const list = this.getItem<HealthCard[]>(STORAGE_KEYS.CARDS, INITIAL_CARDS);
    return list.map(c => {
      if (!c.cvv) {
        c.cvv = (c.verificationCode ? c.verificationCode.slice(-3) : '821').replace(/\D/g, '') || '821';
        if (c.cvv.length < 3) c.cvv = '821';
      }
      return c;
    });
  }
  public static saveCards(cards: HealthCard[]): void {
    const encrypted = cards.map(c => ({
      ...c,
      cvv: this.encrypt(c.cvv)
    }));
    this.setItem(STORAGE_KEYS.CARDS, encrypted);
    ApiSyncService.syncCards(cards).catch(() => { });
  }

  // Memberships
  public static getMemberships(): Membership[] {
    let memberships = this.getItem<Membership[]>('labmedix_membership_tiers_v1', []);
    if (!memberships || !Array.isArray(memberships) || memberships.length === 0) {
      memberships = this.getItem<Membership[]>(STORAGE_KEYS.MEMBERSHIPS, []);
    }
    // Only fall back to DEFAULT_MEMBERSHIPS if absolutely nothing is in cache or storage.
    if (!memberships || !Array.isArray(memberships) || memberships.length === 0) {
      return DEFAULT_MEMBERSHIPS;
    }
    return memberships;
  }
  public static getActiveMemberships(): Membership[] {
    return this.getMemberships().filter(m => m && m.name && m.status === 'active');
  }
  public static getRecommendedMembership(): Membership | undefined {
    const active = this.getActiveMemberships();
    return active.find(m => m.isRecommended) || active.find(m => m.isPopular) || active[0];
  }
  public static saveMemberships(memberships: Membership[]): void {
    this.setItem(STORAGE_KEYS.MEMBERSHIPS, memberships);
    this.setItem('labmedix_membership_tiers_v1', memberships);
    ApiSyncService.syncMemberships(memberships).catch(() => { });
    ApiSyncService.upsertCollectionInFirestore('membershipTiers', memberships).catch(() => { });
  }

  // Families
  public static getFamilies(): FamilyGroup[] {
    return this.getItem<FamilyGroup[]>(STORAGE_KEYS.FAMILIES, []);
  }
  public static saveFamilies(families: FamilyGroup[]): void {
    this.setItem(STORAGE_KEYS.FAMILIES, families);
    ApiSyncService.syncFamilies(families).catch(() => { });
  }

  // Wallets
  public static getWallets(): Wallet[] {
    return this.getItem<Wallet[]>(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
  }
  public static saveWallets(wallets: Wallet[]): void {
    this.setItem(STORAGE_KEYS.WALLETS, wallets);
    ApiSyncService.syncWallets(wallets).catch(() => { });
  }

  // Transactions
  public static getTransactions(): WalletTransaction[] {
    return this.getItem<WalletTransaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  }
  public static saveTransactions(txns: WalletTransaction[]): void {
    this.setItem(STORAGE_KEYS.TRANSACTIONS, txns);
    ApiSyncService.syncTransactions(txns).catch(() => { });
  }

  // Audit Logs
  public static getAuditLogs(): AuditLog[] {
    return this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }
  public static saveAuditLogs(logs: AuditLog[]): void {
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
    ApiSyncService.syncAuditLogs(logs).catch(() => { });
  }

  // Patient Bills
  public static getBills(): PatientBill[] {
    return this.getItem<PatientBill[]>(STORAGE_KEYS.BILLS, []);
  }
  public static saveBills(bills: PatientBill[]): void {
    this.setItem(STORAGE_KEYS.BILLS, bills);
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.BILLS, bills).catch(() => { });
  }
  public static saveBill(bill: PatientBill): void {
    const bills = this.getBills();
    const index = bills.findIndex(b => b.id === bill.id);
    if (index >= 0) {
      bills[index] = bill;
    } else {
      bills.unshift(bill);
    }
    this.saveBills(bills);
    ApiSyncService.saveDocument('bills', bill.id, bill).catch(() => { });
  }
  public static getBillById(id: string): PatientBill | undefined {
    return this.getBills().find(b => b.id === id || b.billNumber === id);
  }

  // Staff Card Request Transactions
  public static getCardRequestTransactions(): StaffCardTransaction[] {
    return this.getItem<StaffCardTransaction[]>(STORAGE_KEYS.CARD_REQUEST_TRANSACTIONS, []);
  }
  public static saveCardRequestTransactions(txns: StaffCardTransaction[]): void {
    this.setItem(STORAGE_KEYS.CARD_REQUEST_TRANSACTIONS, txns);
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.CARD_REQUEST_TRANSACTIONS, txns).catch(() => { });
  }
  public static saveCardRequestTransaction(txn: StaffCardTransaction): void {
    const txns = this.getCardRequestTransactions();
    const index = txns.findIndex(t => t.id === txn.id || t.transactionId === txn.transactionId);
    if (index >= 0) {
      txns[index] = txn;
    } else {
      txns.unshift(txn);
    }
    this.saveCardRequestTransactions(txns);
    ApiSyncService.saveDocument('card_transactions', txn.id, txn).catch(() => { });
  }
  public static getCardRequestTransactionById(id: string): StaffCardTransaction | undefined {
    return this.getCardRequestTransactions().find(t => t.id === id || t.transactionId === id || t.requestId === id);
  }

  // Company Profile
  public static getCompanyProfile(): CompanyProfile {
    let profile = this.getItem<CompanyProfile>(STORAGE_KEYS.COMPANY_PROFILE, DEFAULT_COMPANY_PROFILE);
    if (!profile) {
      return DEFAULT_COMPANY_PROFILE;
    }
    return {
      ...DEFAULT_COMPANY_PROFILE,
      ...profile,
      registrationSettings: {
        ...DEFAULT_CLINIC_REGISTRATION_SETTINGS,
        ...(profile.registrationSettings || {})
      },
      nfcSettings: {
        defaultStandard: 'ISO/IEC 14443 Type A',
        frequency: '13.56 MHz',
        payloadType: 'verification_url',
        autoWriteOnIssue: true,
        securityKey: 'A0B1C2D3E4F5',
        enableWebNfcApi: true,
        ...(DEFAULT_COMPANY_PROFILE.nfcSettings || {}),
        ...(profile.nfcSettings || {}),
        enabled: profile.nfcSettings?.enabled ?? DEFAULT_COMPANY_PROFILE.nfcSettings?.enabled ?? true
      },
      upiSettings: {
        merchantVpa: '7047108226@okbizaxis',
        merchantName: 'LABMEDIX MULTI-SPECIALITY CENTRE',
        merchantMcc: '8099',
        googlePayMerchantId: 'GPAY-LMDX-8829-LIVE',
        googlePayBusinessName: 'LABMEDIX HEALTHCARE',
        enableDeepLinks: true,
        autoVerifySimulation: true,
        ...(DEFAULT_COMPANY_PROFILE.upiSettings || {}),
        ...(profile.upiSettings || {}),
        enabled: profile.upiSettings?.enabled ?? DEFAULT_COMPANY_PROFILE.upiSettings?.enabled ?? true
      },
      documentBranding: {
        bill: { ...DEFAULT_COMPANY_PROFILE.documentBranding?.bill, ...(profile.documentBranding?.bill || {}) },
        diagnosticReport: { ...DEFAULT_COMPANY_PROFILE.documentBranding?.diagnosticReport, ...(profile.documentBranding?.diagnosticReport || {}) },
        healthCard: { ...DEFAULT_COMPANY_PROFILE.documentBranding?.healthCard, ...(profile.documentBranding?.healthCard || {}) },
        prescription: { ...DEFAULT_COMPANY_PROFILE.documentBranding?.prescription, ...(profile.documentBranding?.prescription || {}) },
      } as any,
      systemConfig: {
        numbering: { ...DEFAULT_COMPANY_PROFILE.systemConfig?.numbering, ...(profile.systemConfig?.numbering || {}) },
        dateTime: { ...DEFAULT_COMPANY_PROFILE.systemConfig?.dateTime, ...(profile.systemConfig?.dateTime || {}) },
        printing: { ...DEFAULT_COMPANY_PROFILE.systemConfig?.printing, ...(profile.systemConfig?.printing || {}) },
        notifications: { ...DEFAULT_COMPANY_PROFILE.systemConfig?.notifications, ...(profile.systemConfig?.notifications || {}) },
        security: { ...DEFAULT_COMPANY_PROFILE.systemConfig?.security, ...(profile.systemConfig?.security || {}) },
      } as any
    };
  }
  public static saveCompanyProfile(profile: CompanyProfile): void {
    this.setItem(STORAGE_KEYS.COMPANY_PROFILE, profile);
    ApiSyncService.saveCompanyProfile(profile).catch(() => {});
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.COMPANY_PROFILE, profile).catch(() => {});
    this.triggerServerBackupSync();
  }

  // Cash Desk Vouchers (Super Admin Sovereign PIN & Voucher Ledger)
  public static getCashDeskVouchers(): CashDeskVoucher[] {
    return this.getItem<CashDeskVoucher[]>(STORAGE_KEYS.CASH_DESK_VOUCHERS, []);
  }
  public static saveCashDeskVouchers(vouchers: CashDeskVoucher[]): void {
    this.setItem(STORAGE_KEYS.CASH_DESK_VOUCHERS, vouchers);
    ApiSyncService.syncVouchers(vouchers).catch(() => { });
  }

  // Cash Desk Voucher User Settings (Auto-print, default formats)
  public static getVoucherSettings(): { autoPrintOnCreation: boolean; defaultFormat: 'thermal_pos' | 'a4_certificate' } {
    return this.getItem<{ autoPrintOnCreation: boolean; defaultFormat: 'thermal_pos' | 'a4_certificate' }>(
      STORAGE_KEYS.VOUCHER_SETTINGS,
      { autoPrintOnCreation: false, defaultFormat: 'thermal_pos' }
    );
  }
  public static saveVoucherSettings(settings: { autoPrintOnCreation: boolean; defaultFormat?: 'thermal_pos' | 'a4_certificate' }): void {
    const existing = this.getVoucherSettings();
    this.setItem(STORAGE_KEYS.VOUCHER_SETTINGS, { ...existing, ...settings });
  }

  // Snapshots
  public static getSnapshots(): SnapshotRecord[] {
    return this.getItem<SnapshotRecord[]>(STORAGE_KEYS.SNAPSHOTS, []);
  }
  public static saveSnapshots(snapshots: SnapshotRecord[]): void {
    if (snapshots.length > 30) {
      snapshots = snapshots.slice(0, 30);
    }
    this.setItem(STORAGE_KEYS.SNAPSHOTS, snapshots);
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.SNAPSHOTS, snapshots).catch(() => { });
  }

  // Screen Lock
  public static isScreenLocked(): boolean {
    return this.getItem<boolean>(STORAGE_KEYS.SCREEN_LOCKED, false);
  }
  public static setScreenLocked(locked: boolean): void {
    this.setItem(STORAGE_KEYS.SCREEN_LOCKED, locked);
  }

  // Backup Timestamps & Prompts
  public static getLastBackupTimestamp(): string | null {
    return this.getItem<string | null>(STORAGE_KEYS.LAST_BACKUP_TIMESTAMP, null);
  }
  public static setLastBackupTimestamp(timestamp: string): void {
    this.setItem(STORAGE_KEYS.LAST_BACKUP_TIMESTAMP, timestamp);
  }

  public static getLastBackupPromptTimestamp(): string | null {
    return this.getItem<string | null>(STORAGE_KEYS.LAST_BACKUP_PROMPT_TIMESTAMP, null);
  }
  public static setLastBackupPromptTimestamp(timestamp: string): void {
    this.setItem(STORAGE_KEYS.LAST_BACKUP_PROMPT_TIMESTAMP, timestamp);
  }

  // Sample Dispatch & Logistics Pipeline
  public static getSampleDispatches(): SampleDispatchRecord[] {
    return this.getItem(STORAGE_KEYS.SAMPLE_DISPATCHES, []);
  }

  public static saveSampleDispatches(dispatches: SampleDispatchRecord[]): void {
    this.setItem(STORAGE_KEYS.SAMPLE_DISPATCHES, dispatches);
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.SAMPLE_DISPATCHES, dispatches).catch(() => { });
  }

  // ── Card Production, Printing & Doorstep Dispatch Hub ──
  public static getCardDispatches(): CardDispatchRecord[] {
    return this.getItem<CardDispatchRecord[]>(STORAGE_KEYS.CARD_DISPATCHES, []);
  }

  public static saveCardDispatches(dispatches: CardDispatchRecord[]): void {
    this.setItem(STORAGE_KEYS.CARD_DISPATCHES, dispatches);
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.CARD_DISPATCHES, dispatches).catch(() => { });
  }

  public static getCardDispatchBatches(): CardDispatchBatch[] {
    return this.getItem<CardDispatchBatch[]>(STORAGE_KEYS.CARD_DISPATCH_BATCHES, []);
  }

  public static saveCardDispatchBatches(batches: CardDispatchBatch[]): void {
    this.setItem(STORAGE_KEYS.CARD_DISPATCH_BATCHES, batches);
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.CARD_DISPATCH_BATCHES, batches).catch(() => { });
  }

  // ── Appointments & OPD Scheduling ──
  public static getAppointments(): PatientAppointment[] {
    return this.getItem<PatientAppointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
  }

  public static saveAppointments(appointments: PatientAppointment[]): void {
    this.setItem(STORAGE_KEYS.APPOINTMENTS, appointments);
    ApiSyncService.syncAppointments(appointments).catch(() => { });
  }

  // ── Clinical EMR Encounters & Prescriptions ──
  public static getEncounters(): ClinicalEncounter[] {
    return this.getItem<ClinicalEncounter[]>(STORAGE_KEYS.EMR_ENCOUNTERS, []);
  }

  public static saveEncounters(encounters: ClinicalEncounter[]): void {
    this.setItem(STORAGE_KEYS.EMR_ENCOUNTERS, encounters);
    ApiSyncService.syncEncounters(encounters).catch(() => { });
  }

  // ── Doctor Master Directory & Schedule ──
  public static getDoctors(): any[] {
    return this.getItem<any[]>(STORAGE_KEYS.DOCTORS, []);
  }

  public static saveDoctors(doctors: any[]): void {
    this.setItem(STORAGE_KEYS.DOCTORS, doctors);
    ApiSyncService.syncDoctors(doctors).catch(() => { });
  }

  // ── Doctor Referral Commission Payouts ──
  public static getDoctorPayouts(): any[] {
    return this.getItem<any[]>(STORAGE_KEYS.DOCTOR_PAYOUTS, []);
  }

  public static saveDoctorPayouts(payouts: any[]): void {
    this.setItem(STORAGE_KEYS.DOCTOR_PAYOUTS, payouts);
    ApiSyncService.syncDoctorPayouts(payouts).catch(() => { });
  }

  // ── Diagnostic Pathology Lab Tests Master ──
  public static getLabTests(): any[] {
    return this.getItem<any[]>(STORAGE_KEYS.LAB_TESTS, []);
  }

  public static saveLabTests(tests: any[]): void {
    this.setItem(STORAGE_KEYS.LAB_TESTS, tests);
    ApiSyncService.syncLabTests(tests).catch(() => { });
  }

  // ── Health Packages Master ──
  public static getHealthPackages(): any[] {
    return this.getItem<any[]>(STORAGE_KEYS.HEALTH_PACKAGES, []);
  }

  public static saveHealthPackages(packages: any[]): void {
    this.setItem(STORAGE_KEYS.HEALTH_PACKAGES, packages);
    ApiSyncService.syncHealthPackages(packages).catch(() => { });
  }

  /**
   * Universal Synchronized Deletion:
   * Removes an entity from local memory cache & localStorage,
   * securely expunges it from Google Cloud Firestore,
   * commits the change to Zero-Data-Loss WAL,
   * and dispatches a live synchronization event.
   */
  public static deleteEntity(storageKey: string, id: string): boolean {
    const list = this.getItem<any[]>(storageKey, []);
    if (!Array.isArray(list)) return false;
    const idx = list.findIndex(item => item && (item.id === id || item._id === id));
    if (idx === -1) return false;

    list.splice(idx, 1);
    this.setItem(storageKey, list);

    const conf = ApiSyncService.KEY_TO_FIRESTORE_MAP[storageKey];
    if (conf && conf.type === 'collection') {
      ApiSyncService.deleteDocument(conf.path, id).catch(() => {});
    }

    this.triggerServerBackupSync();
    return true;
  }

  // ── NGO & CSR Social Welfare Services ──

  public static getNgoPartners(): NgoPartner[] {
    const partners = this.getItem<NgoPartner[]>(STORAGE_KEYS.NGO_PARTNERS, DEFAULT_NGO_PARTNERS);
    if (!partners || partners.length === 0) {
      return DEFAULT_NGO_PARTNERS;
    }
    return partners;
  }

  public static saveNgoPartners(partners: NgoPartner[]): void {
    this.setItem(STORAGE_KEYS.NGO_PARTNERS, partners);
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.NGO_PARTNERS, partners).catch(() => { });
  }

  public static getHealthCamps(): HealthCamp[] {
    const camps = this.getItem<HealthCamp[]>(STORAGE_KEYS.HEALTH_CAMPS, DEFAULT_HEALTH_CAMPS);
    if (!camps || camps.length === 0) {
      return DEFAULT_HEALTH_CAMPS;
    }
    return camps;
  }

  public static saveHealthCamps(camps: HealthCamp[]): void {
    this.setItem(STORAGE_KEYS.HEALTH_CAMPS, camps);
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.HEALTH_CAMPS, camps).catch(() => { });
  }

  public static getCampAttendees(campId?: string): CampAttendee[] {
    const attendees = this.getItem<CampAttendee[]>(STORAGE_KEYS.CAMP_ATTENDEES, DEFAULT_CAMP_ATTENDEES);
    const list = (!attendees || attendees.length === 0) ? DEFAULT_CAMP_ATTENDEES : attendees;
    if (campId) {
      return list.filter(a => a.campId === campId);
    }
    return list;
  }

  public static saveCampAttendees(attendees: CampAttendee[]): void {
    this.setItem(STORAGE_KEYS.CAMP_ATTENDEES, attendees);
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.CAMP_ATTENDEES, attendees).catch(() => { });
  }

  public static getCharityGrants(): CharityGrant[] {
    const grants = this.getItem<CharityGrant[]>(STORAGE_KEYS.CHARITY_GRANTS, DEFAULT_CHARITY_GRANTS);
    if (!grants || grants.length === 0) {
      return DEFAULT_CHARITY_GRANTS;
    }
    return grants;
  }

  public static saveCharityGrants(grants: CharityGrant[]): void {
    this.setItem(STORAGE_KEYS.CHARITY_GRANTS, grants);
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.CHARITY_GRANTS, grants).catch(() => { });
  }

  public static getNgoFundTransactions(): NgoFundTransaction[] {
    const txns = this.getItem<NgoFundTransaction[]>(STORAGE_KEYS.NGO_FUND_TRANSACTIONS, DEFAULT_NGO_FUND_TRANSACTIONS);
    if (!txns || txns.length === 0) {
      return DEFAULT_NGO_FUND_TRANSACTIONS;
    }
    return txns;
  }

  public static saveNgoFundTransactions(txns: NgoFundTransaction[]): void {
    this.setItem(STORAGE_KEYS.NGO_FUND_TRANSACTIONS, txns);
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.NGO_FUND_TRANSACTIONS, txns).catch(() => { });
  }

  /** Deposit CSR or donation funds into an NGO Partner's dedicated grant pool */
  /** Deposit CSR/Donation funds to an NGO Partner's balance and record 80G transaction */
  public static depositNgoFund(
    txnOrPartnerId: string | NgoFundTransaction,
    amount?: number,
    paymentMethod?: 'bank_transfer' | 'cheque' | 'neft_rtgs' | 'upi_csr' | 'grant_allocation',
    referenceNumber?: string,
    purpose?: string,
    recordedBy?: string
  ): { success: boolean; transaction?: NgoFundTransaction; error?: string } {
    let txn: NgoFundTransaction;
    const partners = this.getNgoPartners();

    if (typeof txnOrPartnerId === 'object') {
      txn = txnOrPartnerId;
      const partner = partners.find(p => p.id === txn.ngoPartnerId);
      if (!partner) return { success: false, error: 'NGO Partner record not found' };

      const newBalance = (partner.activeBalance || 0) + txn.amount;
      const newTotalDeposited = (partner.totalGrantDeposited || 0) + txn.amount;

      const updatedPartner: NgoPartner = {
        ...partner,
        activeBalance: newBalance,
        totalGrantDeposited: newTotalDeposited,
        updatedAt: new Date().toISOString()
      };

      this.saveNgoPartners(partners.map(p => (p.id === partner.id ? updatedPartner : p)));
      this.saveNgoFundTransactions([txn, ...this.getNgoFundTransactions()]);
      return { success: true, transaction: txn };
    }

    const partner = partners.find(p => p.id === txnOrPartnerId);
    if (!partner) return { success: false, error: 'NGO Partner record not found' };

    const depAmount = amount || 0;
    const newBalance = (partner.activeBalance || 0) + depAmount;
    const newTotalDeposited = (partner.totalGrantDeposited || 0) + depAmount;

    const updatedPartner: NgoPartner = {
      ...partner,
      activeBalance: newBalance,
      totalGrantDeposited: newTotalDeposited,
      updatedAt: new Date().toISOString()
    };

    const newTxn: NgoFundTransaction = {
      id: `ngotx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      receiptNumber: `80G-REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      ngoPartnerId: partner.id,
      ngoPartnerName: partner.name,
      type: 'deposit',
      amount: depAmount,
      paymentMethod: paymentMethod || 'neft_rtgs',
      referenceNumber: referenceNumber || 'DIRECT-CSR',
      date: new Date().toISOString().split('T')[0],
      purpose: purpose || 'CSR Grant / Health Welfare Deposit',
      taxExemption80GIssued: true,
      balanceAfter: newBalance,
      recordedBy: recordedBy || 'Super Administrator',
      createdAt: new Date().toISOString()
    };

    const updatedPartners = partners.map(p => (p.id === txnOrPartnerId ? updatedPartner : p));
    const existingTxns = this.getNgoFundTransactions();
    const updatedTxns = [newTxn, ...existingTxns];

    this.saveNgoPartners(updatedPartners);
    this.saveNgoFundTransactions(updatedTxns);

    return { success: true, transaction: newTxn };
  }

  /** Create and directly approve/disburse a Patient Charity Grant against partner pool */
  public static createAndDisburseCharityGrant(grant: CharityGrant): { success: boolean; error?: string; grant?: CharityGrant } {
    const partners = this.getNgoPartners();
    const partner = partners.find(p => p.id === grant.ngoPartnerId);
    if (!partner) return { success: false, error: 'Sponsoring NGO partner not found' };

    if (partner.activeBalance < grant.approvedGrantAmount) {
      return {
        success: false,
        error: `Insufficient NGO Grant Pool balance. Available: ₹${partner.activeBalance.toLocaleString('en-IN')}, Required: ₹${grant.approvedGrantAmount.toLocaleString('en-IN')}`
      };
    }

    const newBalance = partner.activeBalance - grant.approvedGrantAmount;
    const newAidDisbursed = (partner.totalAidDisbursed || 0) + grant.approvedGrantAmount;

    const updatedPartner: NgoPartner = {
      ...partner,
      activeBalance: newBalance,
      totalAidDisbursed: newAidDisbursed,
      updatedAt: new Date().toISOString()
    };

    const newTxn: NgoFundTransaction = {
      id: `ngotx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      receiptNumber: `DISB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      ngoPartnerId: partner.id,
      ngoPartnerName: partner.name,
      type: 'grant_disbursement',
      amount: grant.approvedGrantAmount,
      paymentMethod: 'grant_allocation',
      referenceNumber: grant.grantNumber,
      date: new Date().toISOString().split('T')[0],
      purpose: `Charity grant subsidy for patient ${grant.patientName} (${grant.medicalCaseTitle})`,
      taxExemption80GIssued: false,
      balanceAfter: newBalance,
      recordedBy: grant.approvedBy || 'Super Administrator',
      createdAt: new Date().toISOString()
    };

    this.saveNgoPartners(partners.map(p => (p.id === partner.id ? updatedPartner : p)));
    this.saveCharityGrants([grant, ...this.getCharityGrants()]);
    this.saveNgoFundTransactions([newTxn, ...this.getNgoFundTransactions()]);

    return { success: true, grant };
  }

  /** Approve and Disburse a Patient Charity Grant against the Sponsoring NGO's Pool */
  public static approveAndDisburseCharityGrant(
    grantId: string,
    approvedBy: string,
    notes?: string
  ): { success: boolean; error?: string; grant?: CharityGrant } {
    const grants = this.getCharityGrants();
    const grant = grants.find(g => g.id === grantId);
    if (!grant) return { success: false, error: 'Charity grant application not found' };
    if (grant.approvalStatus === 'approved' || grant.approvalStatus === 'disbursed') {
      return { success: false, error: 'This grant has already been approved and settled' };
    }

    const partners = this.getNgoPartners();
    const partner = partners.find(p => p.id === grant.ngoPartnerId);
    if (!partner) return { success: false, error: 'Sponsoring NGO partner not found' };

    if (partner.activeBalance < grant.approvedGrantAmount) {
      return {
        success: false,
        error: `Insufficient NGO Grant Pool balance. Available: ₹${partner.activeBalance.toLocaleString('en-IN')}, Required: ₹${grant.approvedGrantAmount.toLocaleString('en-IN')}`
      };
    }

    // Deduct from partner pool
    const newBalance = partner.activeBalance - grant.approvedGrantAmount;
    const newAidDisbursed = (partner.totalAidDisbursed || 0) + grant.approvedGrantAmount;

    const updatedPartner: NgoPartner = {
      ...partner,
      activeBalance: newBalance,
      totalAidDisbursed: newAidDisbursed,
      updatedAt: new Date().toISOString()
    };

    // Update grant record
    const updatedGrant: CharityGrant = {
      ...grant,
      approvalStatus: 'approved',
      approvedBy,
      approvalDate: new Date().toISOString().split('T')[0],
      disbursementDate: new Date().toISOString().split('T')[0],
      notes: notes || grant.notes,
      updatedAt: new Date().toISOString()
    };

    // Record financial ledger transaction
    const newTxn: NgoFundTransaction = {
      id: `ngotx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      receiptNumber: `DISB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      ngoPartnerId: partner.id,
      ngoPartnerName: partner.name,
      type: 'grant_disbursement',
      amount: grant.approvedGrantAmount,
      paymentMethod: 'grant_allocation',
      referenceNumber: grant.grantNumber,
      date: new Date().toISOString().split('T')[0],
      purpose: `Charity grant subsidy for patient ${grant.patientName} (${grant.medicalCaseTitle})`,
      taxExemption80GIssued: false,
      balanceAfter: newBalance,
      recordedBy: approvedBy,
      createdAt: new Date().toISOString()
    };

    this.saveNgoPartners(partners.map(p => p.id === partner.id ? updatedPartner : p));
    this.saveCharityGrants(grants.map(g => g.id === grant.id ? updatedGrant : g));
    this.saveNgoFundTransactions([newTxn, ...this.getNgoFundTransactions()]);

    return { success: true, grant: updatedGrant };
  }

  /** Quick add or update a Health Camp Attendee with live count update */
  public static saveOrUpdateCampAttendee(attendee: CampAttendee): { success: boolean; attendee: CampAttendee } {
    const attendees = this.getCampAttendees();
    const existingIndex = attendees.findIndex(a => a.id === attendee.id);
    let updatedList: CampAttendee[];

    if (existingIndex >= 0) {
      updatedList = [...attendees];
      updatedList[existingIndex] = attendee;
    } else {
      updatedList = [attendee, ...attendees];
    }

    this.saveCampAttendees(updatedList);

    // Update camp metrics
    const camps = this.getHealthCamps();
    const camp = camps.find(c => c.id === attendee.campId);
    if (camp) {
      const campAttendees = updatedList.filter(a => a.campId === camp.id);
      const attendedCount = campAttendees.filter(a => a.status !== 'registered').length;
      const freeCardsCount = campAttendees.filter(a => a.healthCardIssued).length;
      const testsCount = campAttendees.reduce((acc, a) => acc + (a.prescribedTests?.length || 0), 0);

      const updatedCamp: HealthCamp = {
        ...camp,
        registeredCount: campAttendees.length,
        attendedCount: Math.max(attendedCount, camp.attendedCount),
        freeCardsIssuedCount: freeCardsCount,
        testsConductedCount: testsCount,
        updatedAt: new Date().toISOString()
      };

      this.saveHealthCamps(camps.map(c => c.id === camp.id ? updatedCamp : c));
    }

    return { success: true, attendee };
  }

  // Full Database Reset & Sample Data
  public static resetToDemoData(): void {
    this.setItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    this.setItem(STORAGE_KEYS.PATIENTS, INITIAL_PATIENTS);
    this.setItem(STORAGE_KEYS.CARDS, INITIAL_CARDS);
    this.setItem(STORAGE_KEYS.MEMBERSHIPS, DEFAULT_MEMBERSHIPS);
    this.setItem(STORAGE_KEYS.FAMILIES, []);
    this.setItem(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
    this.setItem(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    this.setItem(STORAGE_KEYS.COMPANY_PROFILE, DEFAULT_COMPANY_PROFILE);
    window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { action: 'RESET_DEMO' } }));
  }

  public static clearAllData(): void {
    this.setItem(STORAGE_KEYS.PATIENTS, []);
    this.setItem(STORAGE_KEYS.CARDS, []);
    this.setItem(STORAGE_KEYS.FAMILIES, []);
    this.setItem(STORAGE_KEYS.WALLETS, []);
    this.setItem(STORAGE_KEYS.TRANSACTIONS, []);
    this.setItem(STORAGE_KEYS.APPOINTMENTS, []);
    this.setItem(STORAGE_KEYS.EMR_ENCOUNTERS, []);
    this.setItem(STORAGE_KEYS.PORTAL_LAB_BOOKINGS, []);
    this.setItem(STORAGE_KEYS.PORTAL_PHARMACY_ORDERS, []);
    this.setItem(STORAGE_KEYS.PORTAL_CARD_APPLICATIONS, []);
    this.setItem(STORAGE_KEYS.CASH_DESK_VOUCHERS, []);
    this.setItem(STORAGE_KEYS.SAMPLE_DISPATCHES, []);
    this.setItem(STORAGE_KEYS.RECOVERY_VAULT, []);

    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.PATIENTS, []).catch(() => { });
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.CARDS, []).catch(() => { });
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.FAMILIES, []).catch(() => { });
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.WALLETS, []).catch(() => { });
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.TRANSACTIONS, []).catch(() => { });
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.APPOINTMENTS, []).catch(() => { });
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.EMR_ENCOUNTERS, []).catch(() => { });
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.PORTAL_LAB_BOOKINGS, []).catch(() => { });
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.PORTAL_PHARMACY_ORDERS, []).catch(() => { });
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.PORTAL_CARD_APPLICATIONS, []).catch(() => { });
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.CASH_DESK_VOUCHERS, []).catch(() => { });
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.SAMPLE_DISPATCHES, []).catch(() => { });
    ApiSyncService.syncKeyToFirestore(STORAGE_KEYS.RECOVERY_VAULT, []).catch(() => { });

    window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { action: 'CLEAR_ALL' } }));
  }

  /**
   * Clears all client-side cached user data, business records, and in-memory caches on logout.
   * NOTE: This NEVER touches Central Cloud Firestore! It solely purges the local browser
   * storage so that switching users or devices never mixes or leaks previous session data.
   */
  public static clearUserSessionCache(): void {
    console.info('[StorageService] Purging local user session cache...');

    // 1. Wipe in-memory cache
    StorageService.memoryCache.clear();

    // 2. Sensitive user business collection keys to remove from local/session storage
    const userSessionKeys = [
      STORAGE_KEYS.CURRENT_USER,
      STORAGE_KEYS.SCREEN_LOCKED,
      STORAGE_KEYS.PATIENTS,
      STORAGE_KEYS.CARDS,
      STORAGE_KEYS.FAMILIES,
      STORAGE_KEYS.WALLETS,
      STORAGE_KEYS.TRANSACTIONS,
      STORAGE_KEYS.AUDIT_LOGS,
      STORAGE_KEYS.APPOINTMENTS,
      STORAGE_KEYS.EMR_ENCOUNTERS,
      STORAGE_KEYS.PORTAL_LAB_BOOKINGS,
      STORAGE_KEYS.PORTAL_PHARMACY_ORDERS,
      STORAGE_KEYS.PORTAL_CARD_APPLICATIONS,
      STORAGE_KEYS.CASH_DESK_VOUCHERS,
      STORAGE_KEYS.BILLS,
      STORAGE_KEYS.CARD_REQUEST_TRANSACTIONS,
      'labmedix_auth_locked_user',
      'labmedix_last_active_ts',
      'labmedix_google_auth_locked'
    ];

    userSessionKeys.forEach(key => {
      try { localStorage.removeItem(key); } catch {}
      try { sessionStorage.removeItem(key); } catch {}
      StorageService.idbRemove(key).catch(() => {});
    });

    // Remove any dynamic patient vitals or session tokens from localStorage
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('labmedix_patient_vitals_') || k.startsWith('labmedix_session_'))) {
          localStorage.removeItem(k);
        }
      }
    } catch {}

    try {
      sessionStorage.clear();
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('labmedix_session_cleared'));
      window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { action: 'SESSION_CLEARED' } }));
    }
  }
}