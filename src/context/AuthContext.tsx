import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Role, Permission } from '../types';
import { AuthService } from '../services/authService';
import { StorageService } from '../services/storage';
import { ApiSyncService } from '../services/apiSyncService';
import { AuditService } from '../services/auditService';
import { MultiDeviceSyncService } from '../services/multiDeviceSyncService';
import { checkUserPermission, checkUserModuleAccess, SystemModuleKey } from '../constants/roles';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseService';
import { firestoreService } from '../services/firestoreService';

// Dynamic Session Timeout from Company Profile (default 15 minutes)
const getIdleTimeouts = () => {
  try {
    const profile = StorageService.getCompanyProfile();
    const mins = profile.sessionTimeoutMinutes || 15;
    const timeout = mins * 60 * 1000;
    return {
      timeoutMs: timeout,
      warningMs: Math.max(0, timeout - 60000),
      mins
    };
  } catch {
    return { timeoutMs: 15 * 60 * 1000, warningMs: 14 * 60 * 1000, mins: 15 };
  }
};
const LAST_ACTIVITY_KEY = 'labmedix_last_active_ts';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isLocked: boolean;
  isIdleWarningOpen: boolean;
  idleSecondsRemaining: number;
  /** Login with username/id or directly with validated User object */
  login: (userOrUsername: string | User) => { success: boolean; error?: string };
  logout: () => Promise<void>;
  extendSession: () => void;
  lockScreen: () => void;
  unlockScreen: (pin: string) => boolean;
  can: (permission: Permission) => boolean;
  hasModuleAccess: (moduleKey: SystemModuleKey) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => StorageService.getCurrentUser());
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(() => StorageService.isScreenLocked());
  const [isIdleWarningOpen, setIsIdleWarningOpen] = useState<boolean>(false);
  const [idleSecondsRemaining, setIdleSecondsRemaining] = useState<number>(60);

  const lastActivityRef = useRef<number>(Date.now());
  const idleCheckIntervalRef = useRef<any>(null);

  // Initialize and register activity
  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {}
    if (isIdleWarningOpen) {
      setIsIdleWarningOpen(false);
    }
  }, [isIdleWarningOpen]);

  useEffect(() => {
    StorageService.initializeDatabase();
    let user = StorageService.getCurrentUser();
    if (!user) {
      try {
        const storedLocked = localStorage.getItem('labmedix_auth_locked_user');
        if (storedLocked) {
          user = JSON.parse(storedLocked);
          if (user) StorageService.setCurrentUser(user);
        }
      } catch {}
    }
    if (user) {
      setCurrentUser(user);
      recordActivity();
      try {
        localStorage.setItem('labmedix_auth_locked_user', JSON.stringify(user));
      } catch {}
    }

    // ⚡ Start Central Multi-Device Manager & Heartbeat
    const stopDeviceManager = MultiDeviceSyncService.startDeviceManager(() => {
      // Remote session revocation triggered by administrator
      console.warn('[MultiDevice] Remote revocation triggered.');
      AuthService.logout();
      try {
        localStorage.removeItem('labmedix_auth_locked_user');
        localStorage.removeItem('labmedix_google_auth_locked');
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      } catch {}
      setCurrentUser(null);
      setIsIdleWarningOpen(false);
      window.dispatchEvent(new CustomEvent('labmedix_device_revoked', {
        detail: { message: 'This device session has been revoked by an administrator.' }
      }));
    });

    // 🔄 Cross-tab session sync listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'labmedix_current_user_v1' || e.key === 'labmedix_auth_locked_user') {
        const updatedUser = StorageService.getCurrentUser();
        setCurrentUser(updatedUser);
      }
      if (e.key === 'labmedix_screen_locked_v1') {
        setIsLocked(StorageService.isScreenLocked());
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // ⚡ Listen to Central Firebase Auth State
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      setIsAuthLoading(false);
      if (fbUser && fbUser.email) {
        try {
          const userDocSnap = await getDoc(doc(db, 'users', fbUser.uid));
          let liveUser: User | null = null;
          if (userDocSnap.exists()) {
            liveUser = { id: userDocSnap.id, ...userDocSnap.data() } as User;
          } else {
            const remoteUsers = await firestoreService.getCollection<User>('users');
            const found = remoteUsers.find(u => u.email?.trim().toLowerCase() === fbUser.email?.trim().toLowerCase());
            if (found) {
              liveUser = found;
              // Mirror to /users/{fbUser.uid} so future lookups by UID are instantaneous
              ApiSyncService.saveDocument('users', fbUser.uid, { ...found, uid: fbUser.uid }).catch(() => {});
            }
          }

          if (liveUser) {
            liveUser.uid = fbUser.uid;
            if (liveUser.status !== 'active') {
              console.warn('[AuthContext] Deactivated user in Firebase Auth session. Signing out.');
              await signOut(auth);
              ApiSyncService.unsubscribeAll();
              StorageService.clearUserSessionCache();
              setCurrentUser(null);
              return;
            }
            setCurrentUser(liveUser);
            StorageService.setCurrentUser(liveUser);
            ApiSyncService.subscribeToAll();
          } else {
            const users = StorageService.getUsers();
            const matched = users.find(u => u.email?.toLowerCase() === fbUser.email?.toLowerCase());
            if (matched && matched.status === 'active') {
              matched.uid = fbUser.uid;
              setCurrentUser(matched);
              StorageService.setCurrentUser(matched);
              ApiSyncService.subscribeToAll();
            }
          }
        } catch (e) {
          console.warn('[AuthContext] Auth state sync notice:', e);
        }
      } else {
        // Firebase Auth is signed out completely
        // If there is any stale session in memoryCache / localStorage, clear it!
        const staleUser = StorageService.getCurrentUser();
        if (staleUser) {
          console.info('[AuthContext] No active Firebase Auth session. Wiping stale local session.');
          ApiSyncService.unsubscribeAll();
          StorageService.clearUserSessionCache();
          setCurrentUser(null);
        }
      }
    });

    // 🌐 Ensure real-time multi-device listeners are running
    const unsubAllSync = ApiSyncService.subscribeToAll();

    return () => {
      stopDeviceManager();
      unsubAuth();
      unsubAllSync();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [recordActivity]);

  // ─────────────────────────────────────────────────────────────
  // REAL-TIME USER PERMISSION & DEACTIVATION LISTENER
  // When Super Admin updates permissions or deactivates an account in Firestore,
  // the staff session immediately updates or terminates in real time.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;

    const userDocRef = doc(db, 'users', currentUser.id);
    const unsubUser = onSnapshot(userDocRef, (docSnap) => {
      if (!docSnap.exists()) {
        console.warn('[AuthContext] Account removed from Central Firestore. Revoking session.');
        logout();
        window.dispatchEvent(new CustomEvent('labmedix_account_deactivated', {
          detail: { message: 'Your staff account record has been removed by Super Administrator.' }
        }));
        return;
      }

      const liveUserData = { id: docSnap.id, ...docSnap.data() } as User;

      // If Super Admin deactivated this user account:
      if (liveUserData.status === 'inactive') {
        console.warn('[AuthContext] Account deactivated by Super Administrator. Revoking session.');
        logout();
        window.dispatchEvent(new CustomEvent('labmedix_account_deactivated', {
          detail: { message: 'Your staff account has been deactivated by Super Administrator.' }
        }));
        return;
      }

      // Live Role, Permissions, Company, and Module updates
      setCurrentUser((prev) => {
        if (!prev) return liveUserData;
        const permsChanged = JSON.stringify(prev.customPermissions) !== JSON.stringify(liveUserData.customPermissions);
        const modsChanged = JSON.stringify(prev.allowedModules) !== JSON.stringify(liveUserData.allowedModules);
        const roleChanged = prev.role !== liveUserData.role;
        const nameChanged = prev.fullName !== liveUserData.fullName;
        const companyChanged = prev.companyId !== liveUserData.companyId;

        if (permsChanged || modsChanged || roleChanged || nameChanged || companyChanged) {
          console.info('[AuthContext] Real-time permissions/roles synced from Central Firestore.');
          const merged = { ...prev, ...liveUserData };
          StorageService.setCurrentUser(merged);
          return merged;
        }
        return prev;
      });
    }, (err) => {
      console.warn('[AuthContext] User document subscription notice:', err);
    });

    return () => {
      unsubUser();
    };
  }, [currentUser?.id]);

  // ─────────────────────────────────────────────────────────────
  // 15-MINUTE SECURE IDLE TIMER ENGINE
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) {
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
      }
      setIsIdleWarningOpen(false);
      return;
    }

    // Activity event listeners with throttle
    let lastThrottledTime = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastThrottledTime > 2000) {
        // throttle every 2 seconds
        lastThrottledTime = now;
        recordActivity();
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'wheel'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Check inactivity every 2 seconds
    idleCheckIntervalRef.current = setInterval(() => {
      const { timeoutMs, warningMs, mins } = getIdleTimeouts();
      const now = Date.now();
      let storedLast = now;
      try {
        const storedStr = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (storedStr) {
          storedLast = parseInt(storedStr, 10) || now;
        }
      } catch {}

      const effectiveLastActivity = Math.max(lastActivityRef.current, storedLast);
      const elapsed = now - effectiveLastActivity;

      if (elapsed >= timeoutMs) {
        // Inactivity limit reached: Automatic logout for sensitive clinical data security compliance
        clearInterval(idleCheckIntervalRef.current);
        AuditService.log(
          'AUTOMATIC_SESSION_TIMEOUT_LOGOUT',
          'security',
          `Automated Session Logout: User ${currentUser.username} (${currentUser.fullName}) was inactive for ${mins} minutes. Session terminated to secure sensitive patient records.`,
          currentUser.id
        );
        logout();
        setIsIdleWarningOpen(false);
      } else if (elapsed >= warningMs) {
        // 60-second warning state
        const remainingSeconds = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
        setIdleSecondsRemaining(remainingSeconds);
        setIsIdleWarningOpen(true);
      } else {
        if (isIdleWarningOpen) {
          setIsIdleWarningOpen(false);
        }
      }
    }, 2000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
      }
    };
  }, [currentUser, recordActivity, isIdleWarningOpen]);

  const extendSession = () => {
    recordActivity();
    setIsIdleWarningOpen(false);
    AuditService.log(
      'SESSION_EXTENDED',
      'security',
      `Session extended by ${currentUser?.fullName || 'User'}`,
      currentUser?.id
    );
  };

  // ─────────────────────────────────────────────────────────────
  // USER LOGIN (Supports direct User object or username/staffId)
  // ─────────────────────────────────────────────────────────────
  const login = (userOrUsername: string | User) => {
    if (typeof userOrUsername === 'object' && userOrUsername !== null) {
      AuthService.finalizeLogin(userOrUsername);
      setCurrentUser(userOrUsername);
      setIsLocked(false);
      StorageService.setScreenLocked(false);
      try {
        localStorage.setItem('labmedix_auth_locked_user', JSON.stringify(userOrUsername));
      } catch {}
      recordActivity();
      MultiDeviceSyncService.registerOrUpdateDeviceSession(userOrUsername).catch(() => {});
      return { success: true };
    }
    const res = AuthService.loginWithUsername(userOrUsername);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      setIsLocked(false);
      StorageService.setScreenLocked(false);
      try {
        localStorage.setItem('labmedix_auth_locked_user', JSON.stringify(res.user));
      } catch {}
      recordActivity();
      MultiDeviceSyncService.registerOrUpdateDeviceSession(res.user).catch(() => {});
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  // ─────────────────────────────────────────────────────────────
  // LOGOUT — central Firebase and multi-device session revocation
  // ─────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('[AuthContext] Firebase signOut warning:', err);
    }
    // Cleanly tear down all real-time Firestore listeners
    ApiSyncService.unsubscribeAll();
    // Wipe all cached user business records, memoryCache, and session storage
    StorageService.clearUserSessionCache();
    await AuthService.logout(); // clears localStorage session + audit log
    try {
      localStorage.removeItem('labmedix_auth_locked_user');
      localStorage.removeItem('labmedix_google_auth_locked');
      localStorage.removeItem(LAST_ACTIVITY_KEY);
    } catch {}
    setCurrentUser(null);
    setIsIdleWarningOpen(false);
    MultiDeviceSyncService.registerOrUpdateDeviceSession(null).catch(() => {});
  };

  // ─────────────────────────────────────────────────────────────
  // Screen Lock (local only)
  // ─────────────────────────────────────────────────────────────
  const lockScreen = () => {
    setIsLocked(true);
    StorageService.setScreenLocked(true);
  };

  const unlockScreen = (pin: string) => {
    const valid = AuthService.verifyPin(pin);
    if (valid) {
      setIsLocked(false);
      StorageService.setScreenLocked(false);
      recordActivity();
      return true;
    }
    return false;
  };

  const can = (permission: Permission): boolean => {
    return checkUserPermission(currentUser, permission);
  };

  const hasModuleAccess = (moduleKey: SystemModuleKey): boolean => {
    return checkUserModuleAccess(currentUser, moduleKey);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isAuthLoading,
        isLocked,
        isIdleWarningOpen,
        idleSecondsRemaining,
        login,
        logout,
        extendSession,
        lockScreen,
        unlockScreen,
        can,
        hasModuleAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};