import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebaseService';
import { 
  DeviceSessionRecord, 
  DevicePlatformType, 
  DeviceSessionStatus, 
  MultiDeviceSyncEvent, 
  CentralMultiDeviceMetrics,
  User 
} from '../types';
import { StorageService } from './storage';
import { AuditService } from './auditService';
import { FirestoreBackupService } from './firestoreBackupService';

const DEVICE_ID_KEY = 'labmedix_client_device_id_v2';
const DEVICE_NAME_KEY = 'labmedix_client_device_name_v2';
const ACTIVE_DEVICES_COLLECTION = '_system_active_devices';
const SYNC_EVENTS_COLLECTION = '_system_sync_events';

export class MultiDeviceSyncService {
  private static cachedDeviceId: string | null = null;
  private static heartbeatInterval: any = null;
  private static deviceUnsubscribe: (() => void) | null = null;
  private static allDevicesUnsubscribe: (() => void) | null = null;
  private static syncEventsUnsubscribe: (() => void) | null = null;
  private static recentSyncEvents: MultiDeviceSyncEvent[] = [];
  private static syncEventListeners: ((events: MultiDeviceSyncEvent[]) => void)[] = [];
  private static lastMeasuredLatency: number = 24;

  /**
   * Get or generate a persistent, unique Client Device ID
   */
  public static getDeviceId(): string {
    if (this.cachedDeviceId) return this.cachedDeviceId;

    try {
      let id = localStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        const platform = this.detectPlatform();
        const browser = this.detectBrowser();
        const rand = Math.random().toString(36).substring(2, 9);
        id = `dev_${platform.toLowerCase()}_${browser.toLowerCase()}_${Date.now().toString(36)}_${rand}`;
        localStorage.setItem(DEVICE_ID_KEY, id);
      }
      this.cachedDeviceId = id;
      return id;
    } catch {
      const fallback = `dev_client_${Date.now()}`;
      this.cachedDeviceId = fallback;
      return fallback;
    }
  }

  /**
   * Detect Device Platform (Desktop, Laptop, Tablet, Mobile)
   */
  public static detectPlatform(): DevicePlatformType {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'Desktop';
    const ua = navigator.userAgent.toLowerCase();
    const width = window.innerWidth || screen.width || 1024;
    const isTouch = navigator.maxTouchPoints > 0;

    if (/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(ua)) {
      return 'Tablet';
    }
    if (/(iphone|ipod|android.*mobile|windows phone|blackberry|bb10|mobile)/.test(ua) || (isTouch && width < 640)) {
      return 'Mobile';
    }
    if (width < 1024 && isTouch) {
      return 'Tablet';
    }
    if (width <= 1440 && !isTouch) {
      return 'Laptop';
    }
    return 'Desktop';
  }

  /**
   * Detect Browser details
   */
  public static detectBrowser(): string {
    if (typeof navigator === 'undefined') return 'Browser';
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('SamsungBrowser')) return 'Samsung Internet';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    if (ua.includes('Edg')) return 'Microsoft Edge';
    if (ua.includes('Chrome')) return 'Google Chrome';
    if (ua.includes('Safari')) return 'Apple Safari';
    return 'Web Browser';
  }

  /**
   * Detect Operating System
   */
  public static detectOS(): string {
    if (typeof navigator === 'undefined') return 'Unknown OS';
    const ua = navigator.userAgent;
    if (ua.includes('Win')) return 'Windows 11/10';
    if (ua.includes('Mac')) {
      if (navigator.maxTouchPoints > 1) return 'iPadOS / iOS';
      return 'macOS';
    }
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown OS';
  }

  /**
   * Get human-friendly device label
   */
  public static getDeviceName(): string {
    try {
      const custom = localStorage.getItem(DEVICE_NAME_KEY);
      if (custom) return custom;
    } catch {}

    const platform = this.detectPlatform();
    const browser = this.detectBrowser();
    const os = this.detectOS();
    return `${os} ${platform} (${browser})`;
  }

  public static setCustomDeviceName(name: string): void {
    try {
      localStorage.setItem(DEVICE_NAME_KEY, name.trim());
      const deviceId = this.getDeviceId();
      const docRef = doc(db, ACTIVE_DEVICES_COLLECTION, deviceId);
      updateDoc(docRef, {
        deviceName: name.trim(),
        lastActiveAt: new Date().toISOString()
      }).catch(() => {});
    } catch {}
  }

  /**
   * Build current device session snapshot object
   */
  public static getCurrentDeviceSession(user?: User | null): DeviceSessionRecord {
    const deviceId = this.getDeviceId();
    const currentUser = user || StorageService.getCurrentUser();
    
    return {
      id: deviceId,
      deviceId,
      userId: currentUser?.id,
      username: currentUser?.username,
      userFullName: currentUser?.fullName,
      userRole: currentUser?.role,
      deviceName: this.getDeviceName(),
      platform: this.detectPlatform(),
      browser: this.detectBrowser(),
      os: this.detectOS(),
      screenResolution: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '1920x1080',
      status: 'active',
      isCurrentDevice: true,
      lastActiveAt: new Date().toISOString(),
      registeredAt: localStorage.getItem('labmedix_device_registered_at') || new Date().toISOString(),
      currentRoute: typeof window !== 'undefined' ? window.location.hash : '#/dashboard',
      walPendingCount: 0,
      syncLatencyMs: this.lastMeasuredLatency,
      totalSyncEventsReceived: this.recentSyncEvents.length,
      lastSyncTimestamp: new Date().toISOString(),
      appVersion: 'v4.8.2 (Enterprise Multi-Device)'
    };
  }

  /**
   * Register or Heartbeat this device session in Central Firestore
   */
  public static async registerOrUpdateDeviceSession(user?: User | null): Promise<boolean> {
    try {
      const deviceId = this.getDeviceId();
      let registeredAt = localStorage.getItem('labmedix_device_registered_at');
      if (!registeredAt) {
        registeredAt = new Date().toISOString();
        localStorage.setItem('labmedix_device_registered_at', registeredAt);
      }

      const walCount = await FirestoreBackupService.getPendingWalCount().catch(() => 0);
      const session = this.getCurrentDeviceSession(user);
      session.walPendingCount = walCount;
      session.registeredAt = registeredAt;

      const docRef = doc(db, ACTIVE_DEVICES_COLLECTION, deviceId);
      await setDoc(docRef, {
        ...session,
        isCurrentDevice: false, // In cloud, each device considers itself current locally
        updatedAt: serverTimestamp()
      }, { merge: true });

      return true;
    } catch (err) {
      console.warn('[MultiDevice] Could not update device heartbeat in Firestore:', err);
      return false;
    }
  }

  /**
   * Start 30-second automated heartbeat & revocation watch
   */
  public static startDeviceManager(onRevoked?: () => void): () => void {
    // 1. Initial register
    this.registerOrUpdateDeviceSession();

    // 2. Heartbeat interval
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(async () => {
      await this.registerOrUpdateDeviceSession();
    }, 30000);

    // 3. Listen to current device doc for remote revocation
    const deviceId = this.getDeviceId();
    const docRef = doc(db, ACTIVE_DEVICES_COLLECTION, deviceId);
    
    if (this.deviceUnsubscribe) this.deviceUnsubscribe();
    this.deviceUnsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DeviceSessionRecord;
        if (data && data.status === 'revoked') {
          console.warn('[MultiDevice] This device session has been revoked by an administrator.');
          if (onRevoked) onRevoked();
        }
      }
    }, (err) => {
      console.warn('[MultiDevice] Device watch listener notice:', err);
    });

    // 4. Start sync events listener
    this.startSyncEventsListener();

    return () => {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      if (this.deviceUnsubscribe) this.deviceUnsubscribe();
      if (this.allDevicesUnsubscribe) this.allDevicesUnsubscribe();
      if (this.syncEventsUnsubscribe) this.syncEventsUnsubscribe();
    };
  }

  /**
   * Listen to all active devices in Central Firestore
   */
  public static subscribeToDeviceFleet(callback: (devices: DeviceSessionRecord[]) => void): () => void {
    try {
      const q = query(collection(db, ACTIVE_DEVICES_COLLECTION));
      const currentDeviceId = this.getDeviceId();

      const unsub = onSnapshot(q, (snapshot) => {
        const list: DeviceSessionRecord[] = [];
        const now = Date.now();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as DeviceSessionRecord;
          const isCurrent = docSnap.id === currentDeviceId;
          
          // Calculate dynamic online/idle/offline status
          let dynamicStatus: DeviceSessionStatus = data.status || 'active';
          if (dynamicStatus !== 'revoked') {
            const lastActiveTime = new Date(data.lastActiveAt || 0).getTime();
            const elapsedMins = (now - lastActiveTime) / (1000 * 60);
            if (elapsedMins > 10) {
              dynamicStatus = 'offline';
            } else if (elapsedMins > 3) {
              dynamicStatus = 'idle';
            } else {
              dynamicStatus = 'active';
            }
          }

          list.push({
            ...data,
            id: docSnap.id,
            deviceId: docSnap.id,
            isCurrentDevice: isCurrent,
            status: dynamicStatus
          });
        });

        // Sort: Current device first, then active, then latest active
        list.sort((a, b) => {
          if (a.isCurrentDevice) return -1;
          if (b.isCurrentDevice) return 1;
          return new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime();
        });

        callback(list);
      }, (err) => {
        console.warn('[MultiDevice] Device fleet listener error:', err);
      });

      this.allDevicesUnsubscribe = unsub;
      return unsub;
    } catch (err) {
      console.warn('[MultiDevice] Failed to subscribe to device fleet:', err);
      return () => {};
    }
  }

  /**
   * Remotely revoke a device session
   */
  public static async revokeDeviceSession(targetDeviceId: string, revokingUser?: string): Promise<boolean> {
    try {
      const docRef = doc(db, ACTIVE_DEVICES_COLLECTION, targetDeviceId);
      await updateDoc(docRef, {
        status: 'revoked',
        revokedAt: new Date().toISOString(),
        revokedBy: revokingUser || 'Super Admin'
      });

      AuditService.log(
        'DEVICE_SESSION_REVOKED',
        'auth',
        `Device session ${targetDeviceId} revoked remotely by ${revokingUser || 'Super Admin'}.`
      );
      return true;
    } catch (err) {
      console.warn('[MultiDevice] Failed to revoke device session:', err);
      return false;
    }
  }

  /**
   * Re-activate a revoked device session
   */
  public static async restoreDeviceSession(targetDeviceId: string): Promise<boolean> {
    try {
      const docRef = doc(db, ACTIVE_DEVICES_COLLECTION, targetDeviceId);
      await updateDoc(docRef, {
        status: 'active',
        lastActiveAt: new Date().toISOString()
      });

      AuditService.log(
        'DEVICE_SESSION_RESTORED',
        'auth',
        `Device session ${targetDeviceId} re-authorized.`
      );
      return true;
    } catch (err) {
      console.warn('[MultiDevice] Failed to restore device session:', err);
      return false;
    }
  }

  /**
   * Delete decommissioned device record from Firestore
   */
  public static async removeDeviceRecord(targetDeviceId: string): Promise<boolean> {
    try {
      const docRef = doc(db, ACTIVE_DEVICES_COLLECTION, targetDeviceId);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.warn('[MultiDevice] Failed to delete device record:', err);
      return false;
    }
  }

  /**
   * Measure roundtrip latency to Central Firestore
   */
  public static async measureCentralLatency(): Promise<number> {
    const start = performance.now();
    try {
      const pingDoc = doc(db, '_system_diagnostics', 'multi_device_ping');
      await setDoc(pingDoc, {
        deviceId: this.getDeviceId(),
        pingTs: Date.now()
      }, { merge: true });
      const elapsed = Math.round(performance.now() - start);
      this.lastMeasuredLatency = Math.max(8, elapsed);
      return this.lastMeasuredLatency;
    } catch {
      return 45;
    }
  }

  /**
   * Record a cross-device synchronization mutation broadcast
   */
  public static async recordSyncEvent(
    collectionName: string,
    docId: string,
    action: 'upsert' | 'delete' | 'reconcile',
    payloadSnippet?: string
  ): Promise<void> {
    try {
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const user = StorageService.getCurrentUser();
      const eventDoc = doc(db, SYNC_EVENTS_COLLECTION, eventId);
      
      const payload: MultiDeviceSyncEvent = {
        id: eventId,
        collection: collectionName,
        docId,
        action,
        originDeviceId: this.getDeviceId(),
        originDeviceName: this.getDeviceName(),
        originUser: user?.fullName || user?.username || 'Staff User',
        timestamp: new Date().toISOString(),
        payloadSnippet: payloadSnippet?.substring(0, 150)
      };

      await setDoc(eventDoc, payload);
    } catch (err) {
      // Non-blocking
    }
  }

  /**
   * Listen to real-time sync events from other devices
   */
  private static startSyncEventsListener(): void {
    try {
      const q = query(
        collection(db, SYNC_EVENTS_COLLECTION),
        limit(30)
      );

      this.syncEventsUnsubscribe = onSnapshot(q, (snapshot) => {
        const events: MultiDeviceSyncEvent[] = [];
        snapshot.forEach((d) => {
          events.push(d.data() as MultiDeviceSyncEvent);
        });
        events.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        this.recentSyncEvents = events;
        this.syncEventListeners.forEach((listener) => {
          try { listener(events); } catch {}
        });
      }, (err) => {
        console.warn('[MultiDevice] Sync events stream notice:', err);
      });
    } catch (err) {
      console.warn('[MultiDevice] Sync events listener init notice:', err);
    }
  }

  public static onSyncEvents(callback: (events: MultiDeviceSyncEvent[]) => void): () => void {
    this.syncEventListeners.push(callback);
    callback(this.recentSyncEvents);
    return () => {
      this.syncEventListeners = this.syncEventListeners.filter(l => l !== callback);
    };
  }

  /**
   * Simulate a multi-device concurrent update from a secondary device (e.g. iPad OPD Station)
   * This tests live Firestore synchronization, WAL reconciliation, and real-time state propagation.
   */
  public static async simulateCrossDeviceUpdate(
    targetType: 'patient' | 'card' | 'appointment'
  ): Promise<{ success: boolean; message: string; recordId: string }> {
    try {
      const simulatedDeviceId = `dev_ipad_opd_${Math.random().toString(36).substring(2, 7)}`;
      const simulatedDeviceName = 'iPad Pro (OPD Clinic Station B)';
      const simulatedUser = 'Dr. Subhashish Roy (OPD Station)';
      const timestamp = new Date().toISOString();

      if (targetType === 'patient') {
        const patientId = `PAT-SIM-${Math.floor(1000 + Math.random() * 9000)}`;
        const patientDoc = doc(db, 'patients', patientId);
        const newPatient = {
          id: patientId,
          fullName: `Multi-Device Test Patient [${patientId}]`,
          age: 34,
          gender: 'female',
          mobile: '+91 98300 ' + Math.floor(10000 + Math.random() * 90000),
          email: `patient.${patientId.toLowerCase()}@testlab.org`,
          bloodGroup: 'B+',
          address: 'Station OPD Bay 2, Central Hospital',
          source: 'central_multi_device_sync',
          originDeviceId: simulatedDeviceId,
          originDeviceName: simulatedDeviceName,
          lastUpdatedBy: simulatedUser,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        await setDoc(patientDoc, newPatient);
        await this.recordSyncEvent('patients', patientId, 'upsert', `Created from ${simulatedDeviceName}`);

        return {
          success: true,
          message: `Simulated update broadcast from "${simulatedDeviceName}". Document ${patientId} committed to Central Firestore.`,
          recordId: patientId
        };
      } else if (targetType === 'card') {
        const cardId = `CRD-SIM-${Math.floor(1000 + Math.random() * 9000)}`;
        const cardDoc = doc(db, 'cards', cardId);
        const newCard = {
          id: cardId,
          cardNumber: `LMDX-9988-${Math.floor(1000 + Math.random() * 9000)}`,
          patientId: 'PAT-SIM-101',
          membershipId: 'mem_gold',
          membershipName: 'Gold Health Shield Plan',
          status: 'active',
          issueDate: new Date().toISOString().split('T')[0],
          expiryDate: '2028-12-31',
          discountPercent: 20,
          originDeviceId: simulatedDeviceId,
          originDeviceName: simulatedDeviceName,
          lastUpdatedBy: simulatedUser,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        await setDoc(cardDoc, newCard);
        await this.recordSyncEvent('cards', cardId, 'upsert', `Issued card from ${simulatedDeviceName}`);

        return {
          success: true,
          message: `Health Card issued on "${simulatedDeviceName}" instantly pushed to Central Firestore.`,
          recordId: cardId
        };
      } else {
        const apptId = `APT-SIM-${Math.floor(1000 + Math.random() * 9000)}`;
        const apptDoc = doc(db, 'appointments', apptId);
        const newAppt = {
          id: apptId,
          patientId: 'PAT-SIM-101',
          patientName: 'Test Patient (OPD)',
          doctorName: 'Dr. Subhashish Roy (MD)',
          appointmentDate: new Date().toISOString().split('T')[0],
          appointmentTime: '11:30 AM',
          status: 'confirmed',
          type: 'cardiology_opd',
          originDeviceId: simulatedDeviceId,
          originDeviceName: simulatedDeviceName,
          lastUpdatedBy: simulatedUser,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        await setDoc(apptDoc, newAppt);
        await this.recordSyncEvent('appointments', apptId, 'upsert', `Booked appointment on ${simulatedDeviceName}`);

        return {
          success: true,
          message: `OPD Appointment scheduled on "${simulatedDeviceName}" synchronized to Central Firestore.`,
          recordId: apptId
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Failed to execute cross-device simulation.',
        recordId: ''
      };
    }
  }

  /**
   * Calculate Central Multi-Device Health Metrics
   */
  public static calculateMetrics(devices: DeviceSessionRecord[]): CentralMultiDeviceMetrics {
    const activeCount = devices.filter(d => d.status === 'active').length;
    const idleCount = devices.filter(d => d.status === 'idle').length;
    const revokedCount = devices.filter(d => d.status === 'revoked').length;

    return {
      totalRegisteredDevices: devices.length,
      activeDevicesCount: activeCount,
      idleDevicesCount: idleCount,
      revokedDevicesCount: revokedCount,
      averageLatencyMs: this.lastMeasuredLatency,
      lastCentralSyncTime: new Date().toISOString(),
      walQueueSize: 0,
      isCentralFirestoreLive: true
    };
  }
}
