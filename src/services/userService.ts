import { User, Role } from '../types';
import { StorageService } from './storage';
import { AuditService } from './auditService';
import { generateUuid } from '../utils/idGenerator';
import { firestoreService } from './firestoreService';
import { ApiSyncService } from './apiSyncService';
import { AuthService } from './authService';
import { generateBarcodeDataUrl } from '../utils/barcode';
import { generateQrDataUrl, buildVerificationUrl } from '../utils/qr';

export class UserService {
  public static getAll(): User[] {
    return StorageService.getUsers();
  }

  public static getById(id: string): User | undefined {
    return StorageService.getUsers().find(u => u.id === id);
  }

  public static generateStaffId(): string {
    const users = StorageService.getUsers();
    let maxId = 0;
    users.forEach(u => {
      if (u.staffId) {
        const match = u.staffId.match(/\d+$/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > maxId) {
            maxId = num;
          }
        }
      }
    });
    return `LMDX-STF-${String(maxId + 1).padStart(3, '0')}`;
  }

  public static generateEmployeeNo(staffId?: string): string {
    const baseNum = staffId ? staffId.replace(/\D/g, '').padStart(3, '0') : '';
    if (baseNum) {
      return `LMDX-EMP-${baseNum}`;
    }
    const users = StorageService.getUsers();
    return `LMDX-EMP-${String(users.length + 1).padStart(3, '0')}`;
  }

  public static generateSecurePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = 'Lmdx@';
    for (let i = 0; i < 5; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  public static async createUser(userData: {
    username: string;
    fullName: string;
    email: string;
    password?: string;
    role: Role;
    designation?: string;
    photoUrl?: string;
    bloodGroup?: string;
    pinCode?: string;
    phone?: string;
    workPhone?: string;
    department?: string;
    accessZone?: string;
    nationalId?: string;
    licenseNo?: string;
    employeeNo?: string;
    joiningDate?: string;
    expiryDate?: string;
    emergencyContact?: string;
    emergencyContactName?: string;
    cardThemeWish?: string;
    cardMaterialWish?: string;
    allowedModules?: string[];
    customPermissions?: string[];
  }): Promise<{ user: User; error?: string }> {
    const cleanUsername = (userData.username || '').trim().toLowerCase().replace(/\s+/g, '');
    const cleanEmail = (userData.email || '').trim().toLowerCase().replace(/\s+/g, '');

    // 1. Mandatory Email-Based Authentication Requirements Validation
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return {
        user: null as any,
        error: 'Every staff member must have a valid unique registered email address (e.g. name@labmedix.org). Authentication requires a unique email.'
      };
    }

    const users = StorageService.getUsers();

    // 2. Strict Uniqueness Check for Registered Email Address
    const duplicateEmail = users.find(u => u.email && u.email.trim().toLowerCase() === cleanEmail);
    if (duplicateEmail) {
      return {
        user: null as any,
        error: `Email address '${cleanEmail}' is already assigned to '${duplicateEmail.fullName}' (${duplicateEmail.staffId || duplicateEmail.username}). One staff member must never share or access another account.`
      };
    }

    // Check duplicate username
    const duplicateUsername = users.find(u => u.username && u.username.trim().toLowerCase() === cleanUsername);
    if (duplicateUsername) {
      return {
        user: null as any,
        error: `Staff username '@${cleanUsername}' is already taken. Please choose another username.`
      };
    }

    const staffId = this.generateStaffId();
    const employeeNo = userData.employeeNo?.trim() || this.generateEmployeeNo(staffId);

    // Auto-generate scannable Code128 Barcode and Level 'H' QR Code
    let barcodeDataUrl = '';
    let qrCodeDataUrl = '';
    try {
      barcodeDataUrl = generateBarcodeDataUrl(staffId);
      qrCodeDataUrl = await generateQrDataUrl(buildVerificationUrl(staffId), 260);
    } catch (codeErr) {
      console.warn('Barcode/QR auto generation notice:', codeErr);
    }

    const assignedPassword = userData.password?.trim() || this.generateSecurePassword();

    const newUser: User = {
      id: `usr_${generateUuid().slice(0, 8)}`,
      staffId,
      employeeNo,
      username: cleanUsername,
      fullName: userData.fullName.trim(),
      email: cleanEmail,
      password: assignedPassword,
      role: userData.role,
      companyId: 'LABMEDIX-MAIN-CLINIC',
      designation: userData.designation?.trim() || 'Staff Officer',
      photoUrl: userData.photoUrl?.trim() || undefined,
      bloodGroup: userData.bloodGroup?.trim() || 'O+',
      status: 'active',
      pinCode: userData.pinCode || '1234',
      phone: userData.phone?.trim() || '+91 98300 00000',
      workPhone: userData.workPhone?.trim() || 'EXT-104',
      department: userData.department?.trim() || 'General Operations',
      accessZone: userData.accessZone?.trim() || 'Zone A: Standard Clinical & Ops',
      nationalId: userData.nationalId?.trim() || `UID-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      licenseNo: userData.licenseNo?.trim() || undefined,
      joiningDate: userData.joiningDate || new Date().toISOString().slice(0, 10),
      expiryDate: userData.expiryDate || new Date().toISOString().slice(0, 10),
      emergencyContact: userData.emergencyContact?.trim() || '9830099999',
      emergencyContactName: userData.emergencyContactName?.trim() || 'Immediate Family',
      cardThemeWish: userData.cardThemeWish || 'premium_medical',
      cardMaterialWish: userData.cardMaterialWish || 'gloss',
      barcodeDataUrl: barcodeDataUrl || undefined,
      qrCodeDataUrl: qrCodeDataUrl || undefined,
      emailSent: false,
      createdAt: new Date().toISOString(),
      // Preserve Super Admin granted module access and custom permission overrides
      allowedModules: userData.allowedModules && userData.allowedModules.length > 0 ? userData.allowedModules : [],
      customPermissions: (userData.customPermissions && userData.customPermissions.length > 0 ? userData.customPermissions : []) as any,
    };

    try {
      // 3. Provision Central Firebase Authentication account via secondary app instance
      // (ensures Super Admin session is never signed out while creating staff credentials)
      try {
        const authRes = await AuthService.createStaffAuthAccount(cleanEmail, assignedPassword);
        if (authRes.uid) {
          newUser.uid = authRes.uid;
        }
        if (!authRes.success) {
          console.warn('[UserService] Firebase Auth provisioning notice:', authRes.error);
        } else {
          console.info(`[UserService] Central Firebase Auth account provisioned for ${cleanEmail}`);
        }
      } catch (authErr) {
        console.warn('[UserService] Error during Firebase Auth account provisioning:', authErr);
      }

      // 4. Save to local storage & in-memory cache
      users.push(newUser);
      StorageService.saveUsers(users);

      // 5. Atomic write to Central Cloud Firestore with WAL & multi-device sync broadcast
      await ApiSyncService.saveDocument('users', newUser.id, newUser);
      if (newUser.uid && newUser.uid !== newUser.id) {
        ApiSyncService.saveDocument('users', newUser.uid, newUser).catch(() => {});
      }
      AuditService.log('USER_CREATED', 'users', `Created new staff user: ${newUser.fullName} (${newUser.role}) [ID: ${newUser.staffId}, Email: ${newUser.email}]`, newUser.id);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key: 'labmedix_users_v1' } }));
      }

      return { user: newUser };
    } catch (error: any) {
      console.error('Failed to create user in Firestore', error);
      return { user: newUser, error: error?.message };
    }
  }

  public static async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      // If email is updated, ensure valid and not duplicate
      if (updates.email) {
        const cleanEmail = updates.email.trim().toLowerCase();
        if (!cleanEmail.includes('@')) {
          console.warn('[UserService] Invalid email update rejected:', updates.email);
          return null;
        }
        const users = StorageService.getUsers();
        const conflict = users.find(u => u.id !== id && u.email && u.email.trim().toLowerCase() === cleanEmail);
        if (conflict) {
          console.warn(`[UserService] Duplicate email conflict with ${conflict.fullName}`);
          return null;
        }
        updates.email = cleanEmail;
      }

      // If staffId changed, re-generate barcode & QR
      if (updates.staffId) {
        try {
          updates.barcodeDataUrl = generateBarcodeDataUrl(updates.staffId);
          updates.qrCodeDataUrl = await generateQrDataUrl(buildVerificationUrl(updates.staffId), 260);
        } catch {}
      }

      const users = StorageService.getUsers();
      const userIndex = users.findIndex(u => u.id === id);
      if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updates };
        StorageService.saveUsers(users);
      }

      // Sync full updated user object to Firestore (not just partial updates)
      // so allowedModules and customPermissions are always in sync across devices
      const updatedUser = users[userIndex] || { id, ...updates };
      if (!updatedUser.companyId) {
        updatedUser.companyId = 'LABMEDIX-MAIN-CLINIC';
      }
      await ApiSyncService.saveDocument('users', id, { ...updatedUser, updatedAt: new Date().toISOString() });
      if (updatedUser.uid && updatedUser.uid !== id) {
        ApiSyncService.saveDocument('users', updatedUser.uid, { ...updatedUser, updatedAt: new Date().toISOString() }).catch(() => {});
      }
      AuditService.log('USER_UPDATED', 'users', `Updated staff account [${updatedUser.fullName}] (${updatedUser.email})`, id);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key: 'labmedix_users_v1' } }));
      }

      return users[userIndex] || ({ id, ...updates } as User);
    } catch (error) {
      console.error('Failed to update user in Firestore', error);
      const users = StorageService.getUsers();
      const user = users.find(u => u.id === id);
      return user || ({ id, ...updates } as User);
    }
  }

  public static resetPassword(id: string, newPassword: string, newPin?: string): boolean {
    const users = StorageService.getUsers();
    const user = users.find(u => u.id === id);
    if (!user) return false;

    user.password = newPassword.trim();
    if (newPin) user.pinCode = newPin.trim();
    StorageService.saveUsers(users);

    firestoreService.updateDocument('users', id, {
      password: user.password,
      ...(newPin ? { pinCode: user.pinCode } : {})
    }).catch(err => console.warn('Firestore password reset sync error:', err));

    AuditService.log('USER_PASSWORD_RESET', 'users', `Super Admin reset credentials for ${user.fullName}`, id);
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key: 'labmedix_users_v1' } }));
    }
    return true;
  }

  public static updateSuperAdminPassword(superAdminId: string, newPassword: string): { success: boolean; error?: string } {
    const trimmed = (newPassword || '').trim();
    if (!trimmed || trimmed.length < 8) {
      return { success: false, error: 'Super Admin password must be a strong password of at least 8 characters.' };
    }

    const hasUpper = /[A-Z]/.test(trimmed);
    const hasLower = /[a-z]/.test(trimmed);
    const hasDigitOrSpecial = /[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(trimmed);

    if (!hasUpper || !hasLower || !hasDigitOrSpecial) {
      return { success: false, error: 'Strong password required: Include uppercase, lowercase, and numbers/symbols (e.g. LabMedix@2026#Secure).' };
    }

    const users = StorageService.getUsers();
    const superAdmin = users.find(u => u.id === superAdminId || u.role === 'super_admin');
    if (!superAdmin) {
      return { success: false, error: 'Super Admin account record not found.' };
    }

    superAdmin.password = trimmed;
    StorageService.saveUsers(users);

    // Update active current user session
    const current = StorageService.getCurrentUser();
    if (current) {
      const updatedCurrent = { ...current, password: trimmed };
      StorageService.setCurrentUser(updatedCurrent);
    }

    // Sync across all terminals via Firestore
    firestoreService.updateDocument('users', superAdmin.id, { password: trimmed }).catch(err => console.warn('Firestore superAdmin password sync error:', err));

    AuditService.log('SUPER_ADMIN_PASSWORD_UPDATED', 'auth', `Super Admin (${superAdmin.fullName}) updated their sovereign portal password successfully.`, superAdmin.id);
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key: 'labmedix_users_v1' } }));
    }
    return { success: true };
  }

  public static resetPin(id: string, newPin: string): boolean {
    const users = StorageService.getUsers();
    const user = users.find(u => u.id === id);
    if (!user) return false;

    user.pinCode = newPin;
    StorageService.saveUsers(users);

    firestoreService.updateDocument('users', id, { pinCode: newPin }).catch(err => console.warn('Firestore PIN sync error:', err));

    AuditService.log('USER_PIN_RESET', 'users', `Reset security PIN for ${user.fullName}`, id);
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key: 'labmedix_users_v1' } }));
    }
    return true;
  }

  public static toggleStatus(id: string): User | null {
    const users = StorageService.getUsers();
    const user = users.find(u => u.id === id);
    if (!user) return null;

    user.status = user.status === 'active' ? 'inactive' : 'active';
    StorageService.saveUsers(users);

    firestoreService.updateDocument('users', id, { status: user.status }).catch(err => console.warn('Firestore toggleStatus sync error:', err));

    AuditService.log('USER_STATUS_CHANGED', 'users', `Toggled account status of ${user.fullName} to ${user.status}`, id);
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key: 'labmedix_users_v1' } }));
    }
    return user;
  }

  public static deleteUser(id: string): boolean {
    const users = StorageService.getUsers();
    const user = users.find(u => u.id === id);
    if (!user) return false;

    // Root Super Admin account can never be deleted
    if (user.role === 'super_admin' || user.username === 'superadmin' || id === 'usr_super_admin' || id === 'usr_superadmin_root') {
      console.warn('[UserService] Root Super Admin account cannot be deleted.');
      return false;
    }

    const index = users.findIndex(u => u.id === id);
    if (index === -1) return false;

    const deleted = users.splice(index, 1)[0];
    StorageService.saveUsers(users);

    ApiSyncService.deleteDocument('users', id).catch(err => console.warn('Firestore deleteUser sync error:', err));

    AuditService.log('USER_DELETED', 'users', `Deleted staff account ${deleted.fullName} (${deleted.staffId || deleted.id})`, id);
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key: 'labmedix_users_v1' } }));
    }
    return true;
  }
}