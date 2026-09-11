/**
 * useFirestoreLiveData — Central Firestore Real-Time Data Hook
 *
 * Subscribes to all critical Firestore collections via onSnapshot listeners.
 * Falls back to StorageService (localStorage) cache when offline.
 * Tracks connection state: 'connected' | 'reconnecting' | 'offline'
 *
 * One central data path: FIRESTORE → real-time listener → all authorized devices.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../services/firebaseService';
import { StorageService } from '../services/storage';
import { Patient, HealthCard, AuditLog, User } from '../types';

export type FirestoreConnectionState = 'connected' | 'reconnecting' | 'offline';

export interface FirestoreLiveDataResult {
  // Live counts from Firestore
  patientCount: number;
  cardCount: number;
  auditLogCount: number;
  userCount: number;

  // Live data arrays (capped for performance)
  patients: Patient[];
  cards: HealthCard[];
  auditLogs: AuditLog[];
  users: User[];

  // Connection state
  connectionState: FirestoreConnectionState;
  lastSyncTime: string | null;

  // Manual refresh
  refresh: () => void;
  isLoading: boolean;
}

const MAX_AUDIT_LOGS = 500;
const MAX_PATIENTS = 200;
const MAX_CARDS = 200;
const MAX_USERS = 100;

export function useFirestoreLiveData(): FirestoreLiveDataResult {
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const [cards, setCards] = useState<HealthCard[]>(() => StorageService.getCards());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => StorageService.getAuditLogs());
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [connectionState, setConnectionState] = useState<FirestoreConnectionState>('reconnecting');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const unsubsRef = useRef<Unsubscribe[]>([]);
  const mountedRef = useRef(true);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(true);
    const unsubs: Unsubscribe[] = [];

    // ─── Patients ────────────────────────────────────────────────────────────
    try {
      const patientsUnsub = onSnapshot(
        query(collection(db, 'patients'), limit(MAX_PATIENTS)),
        (snap) => {
          if (!mountedRef.current) return;
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
          setPatients(data.length > 0 ? data : StorageService.getPatients());
          setConnectionState('connected');
          setLastSyncTime(new Date().toISOString());
          setIsLoading(false);
        },
        (err) => {
          console.warn('[useFirestoreLiveData] patients listener error:', err);
          if (!mountedRef.current) return;
          setConnectionState('offline');
          setPatients(StorageService.getPatients());
          setIsLoading(false);
        }
      );
      unsubs.push(patientsUnsub);
    } catch (e) {
      setPatients(StorageService.getPatients());
    }

    // ─── Health Cards ─────────────────────────────────────────────────────────
    try {
      const cardsUnsub = onSnapshot(
        query(collection(db, 'cards'), limit(MAX_CARDS)),
        (snap) => {
          if (!mountedRef.current) return;
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as HealthCard));
          setCards(data.length > 0 ? data : StorageService.getCards());
          setLastSyncTime(new Date().toISOString());
        },
        (err) => {
          console.warn('[useFirestoreLiveData] cards listener error:', err);
          if (!mountedRef.current) return;
          setCards(StorageService.getCards());
        }
      );
      unsubs.push(cardsUnsub);
    } catch (e) {
      setCards(StorageService.getCards());
    }

    // ─── Audit Logs ───────────────────────────────────────────────────────────
    try {
      let auditQuery;
      try {
        auditQuery = query(
          collection(db, 'audit_logs'),
          orderBy('timestamp', 'desc'),
          limit(MAX_AUDIT_LOGS)
        );
      } catch {
        auditQuery = query(collection(db, 'audit_logs'), limit(MAX_AUDIT_LOGS));
      }

      const auditUnsub = onSnapshot(
        auditQuery,
        (snap) => {
          if (!mountedRef.current) return;
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
          setAuditLogs(data.length > 0 ? data : StorageService.getAuditLogs());
          setLastSyncTime(new Date().toISOString());
        },
        (err) => {
          console.warn('[useFirestoreLiveData] audit_logs listener error:', err);
          if (!mountedRef.current) return;
          setAuditLogs(StorageService.getAuditLogs());
        }
      );
      unsubs.push(auditUnsub);
    } catch (e) {
      setAuditLogs(StorageService.getAuditLogs());
    }

    // ─── Staff Users ──────────────────────────────────────────────────────────
    try {
      const usersUnsub = onSnapshot(
        query(collection(db, 'users'), limit(MAX_USERS)),
        (snap) => {
          if (!mountedRef.current) return;
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
          setUsers(data.length > 0 ? data : StorageService.getUsers());
          setLastSyncTime(new Date().toISOString());
        },
        (err) => {
          console.warn('[useFirestoreLiveData] users listener error:', err);
          if (!mountedRef.current) return;
          setUsers(StorageService.getUsers());
        }
      );
      unsubs.push(usersUnsub);
    } catch (e) {
      setUsers(StorageService.getUsers());
    }

    // ─── Network status monitoring ────────────────────────────────────────────
    const handleOnline = () => {
      if (!mountedRef.current) return;
      setConnectionState('reconnecting');
      setTimeout(() => {
        if (mountedRef.current) setConnectionState('connected');
      }, 2000);
    };
    const handleOffline = () => {
      if (!mountedRef.current) return;
      setConnectionState('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      setConnectionState('offline');
      setIsLoading(false);
    }

    unsubsRef.current = unsubs;

    return () => {
      mountedRef.current = false;
      unsubs.forEach(u => u());
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshKey]);

  return {
    patientCount: patients.length,
    cardCount: cards.length,
    auditLogCount: auditLogs.length,
    userCount: users.length,
    patients,
    cards,
    auditLogs,
    users,
    connectionState,
    lastSyncTime,
    refresh,
    isLoading,
  };
}
