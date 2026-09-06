import { initializeApp, getApps } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  memoryLocalCache,
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import configFile from '../../firebase-applet-config.json';

export const databaseId = (configFile as any).firestoreDatabaseId || "ai-studio-labmedixautoheal-1ac13548-bbcc-4f91-96bd-c8c990bec0c8";

const config = {
  ...configFile,
  apiKey: configFile.apiKey || "AIzaSyBNaCHTH6cWJ1AdygG42bKugjtHNRg05ys",
  authDomain: configFile.authDomain || "gen-lang-client-0076489895.firebaseapp.com",
  projectId: configFile.projectId || "gen-lang-client-0076489895",
  firestoreDatabaseId: databaseId,
  storageBucket: configFile.storageBucket || "gen-lang-client-0076489895.firebasestorage.app",
  messagingSenderId: configFile.messagingSenderId || "451271134982",
  appId: configFile.appId || "1:451271134982:web:defaee0de0069f4732d887"
};

export const firebaseConfig = config;

const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
export const auth = getAuth(app);

/**
 * Detect mobile or low-storage environment.
 * Firestore's persistentLocalCache writes to localStorage —
 * on mobile where localStorage is near-full this causes QuotaExceededError
 * and a hard INTERNAL ASSERTION FAILED crash (ID: b815).
 * Solution: use memoryLocalCache on mobile/low-storage devices.
 */
function shouldUseMemoryCache(): boolean {
  try {
    if (typeof navigator === 'undefined' || typeof localStorage === 'undefined') return true;
    const ua = navigator.userAgent || '';
    if (/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(ua)) return true;
    // Test if localStorage is already full
    const testKey = '__lmdx_quota_check__';
    localStorage.setItem(testKey, new Array(1024).join('x')); // 1KB test write
    localStorage.removeItem(testKey);
    return false;
  } catch {
    return true; // already full or blocked
  }
}

let firestoreDb;
try {
  if (shouldUseMemoryCache()) {
    // Memory-only: no localStorage writes, safe on all devices and quota conditions
    firestoreDb = initializeFirestore(app, {
      localCache: memoryLocalCache()
    }, databaseId);
  } else {
    // Full persistent cache for desktop/tablet with sufficient storage
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, databaseId);
  }
} catch {
  // Final fallback: plain Firestore with named database
  firestoreDb = getFirestore(app, databaseId);
}

export const db = firestoreDb;

setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase setPersistence warning:', err);
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Don't re-throw for transient network errors, just log them
  if (!errInfo.error.includes('unavailable')) {
      throw new Error(JSON.stringify(errInfo));
  }
}

async function testConnection() {
  try {
    const docRef = doc(db, '_system_health', 'heartbeat');
    await getDocFromServer(docRef).catch(() => {});
  } catch (error) {
    // Silent catch
  }
}

testConnection();
