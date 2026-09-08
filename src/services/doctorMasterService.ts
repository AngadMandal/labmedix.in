import { StorageService } from './storage';
import { UserService } from './userService';
import { AuditService } from './auditService';
import { ApiSyncService } from './apiSyncService';
import { generateUuid } from '../utils/idGenerator';
import { User, Role } from '../types';

export interface DoctorCommissionPayoutRecord {
  id: string;
  payoutNo: string;
  doctorId: string;
  doctorName: string;
  amount: number;
  paymentMode: 'Bank Transfer' | 'Cash' | 'Cheque' | 'Health Wallet UPI';
  referenceNo: string;
  paidAt: string;
  paidBy: string;
  notes: string;
}

export interface DoctorMasterItem {
  id: string;
  doctorCode: string;
  name: string;
  qualification: string;
  speciality: string;
  department: string;
  regNumber: string;
  phone: string;
  email: string;
  opdRoom: string;
  avatarUrl: string;
  
  // Staff User Account & Credentials
  username: string;
  pinCode: string;
  linkedUserId?: string;
  
  // Financial Consultation Fees (INR ₹)
  standardFee: number;
  followUpFee: number;
  telemedicineFee: number;
  cardholderDiscountPercent: number;
  totalFeesCollected: number;
  totalConsultationsCompleted: number;

  // Diagnostic Pathology & Blood Test Commission
  bloodCommissionPercent: number;
  totalTestsReferredCount: number;
  totalReferredLabRevenue: number;
  totalCommissionEarned: number;
  totalCommissionPaid: number;
  payableCommissionBalance: number;

  // Status & Timestamps
  status: 'active' | 'on_leave' | 'inactive';
  availableDays: string[];
  opdTiming: string;
  createdAt: string;
  updatedAt: string;
}

const DOCTOR_MASTER_STORAGE_KEY = 'labmedix_doctor_master_records_v1';
const DOCTOR_COMMISSION_PAYOUTS_STORAGE_KEY = 'labmedix_doctor_commission_payouts_v1';

export class DoctorMasterService {
  private static getInitialDoctors(): DoctorMasterItem[] {
    return [
      {
        id: 'doc_subhashish',
        doctorCode: 'DR-001',
        name: 'Dr. Subhashish Roy',
        qualification: 'MBBS, MD (Internal Medicine)',
        speciality: 'General & Internal Medicine',
        department: 'Department of Medicine',
        regNumber: 'WBMC-68421',
        phone: '+91 98300 11001',
        email: 'dr.subhashish@labmedix.org',
        opdRoom: 'Room 101 (Main OPD)',
        avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
        username: 'dr.subhashish',
        pinCode: '1234',
        standardFee: 600,
        followUpFee: 400,
        telemedicineFee: 500,
        cardholderDiscountPercent: 20,
        totalFeesCollected: 0,
        totalConsultationsCompleted: 0,
        bloodCommissionPercent: 20,
        totalTestsReferredCount: 0,
        totalReferredLabRevenue: 0,
        totalCommissionEarned: 0,
        totalCommissionPaid: 0,
        payableCommissionBalance: 0,
        status: 'active',
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        opdTiming: '10:00 AM - 02:00 PM',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 'doc_priya',
        doctorCode: 'DR-002',
        name: 'Dr. Priya Sengupta',
        qualification: 'MBBS, DCH, MD (Pediatrics)',
        speciality: 'Pediatrics & Neonatology',
        department: 'Child Health Care',
        regNumber: 'WBMC-77312',
        phone: '+91 98300 11002',
        email: 'dr.priya@labmedix.org',
        opdRoom: 'Room 102 (Child Care Wing)',
        avatarUrl: 'https://images.unsplash.com/photo-1594824813590-48f8a9e01140?w=400&auto=format&fit=crop&q=80',
        username: 'dr.priya',
        pinCode: '1234',
        standardFee: 700,
        followUpFee: 450,
        telemedicineFee: 600,
        cardholderDiscountPercent: 25,
        totalFeesCollected: 0,
        totalConsultationsCompleted: 0,
        bloodCommissionPercent: 20,
        totalTestsReferredCount: 0,
        totalReferredLabRevenue: 0,
        totalCommissionEarned: 0,
        totalCommissionPaid: 0,
        payableCommissionBalance: 0,
        status: 'active',
        availableDays: ['Mon', 'Tue', 'Wed', 'Fri', 'Sat'],
        opdTiming: '11:00 AM - 03:00 PM',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 'doc_anita',
        doctorCode: 'DR-003',
        name: 'Dr. Anita Sen',
        qualification: 'MBBS, MS, DGO (Obstetrics & Gynae)',
        speciality: 'Obstetrics & Gynecology',
        department: 'Women Health & Maternal Care',
        regNumber: 'WBMC-59204',
        phone: '+91 98300 11003',
        email: 'dr.anita@labmedix.org',
        opdRoom: 'Room 103 (Women Wellness)',
        avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
        username: 'dr.anita',
        pinCode: '1234',
        standardFee: 800,
        followUpFee: 500,
        telemedicineFee: 700,
        cardholderDiscountPercent: 20,
        totalFeesCollected: 0,
        totalConsultationsCompleted: 0,
        bloodCommissionPercent: 25,
        totalTestsReferredCount: 0,
        totalReferredLabRevenue: 0,
        totalCommissionEarned: 0,
        totalCommissionPaid: 0,
        payableCommissionBalance: 0,
        status: 'active',
        availableDays: ['Mon', 'Wed', 'Thu', 'Fri'],
        opdTiming: '09:30 AM - 01:30 PM',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 'doc_amit',
        doctorCode: 'DR-004',
        name: 'Dr. Amit Patel',
        qualification: 'MBBS, MD, DM (Cardiology)',
        speciality: 'Cardiology & Cardiac Science',
        department: 'Cardiovascular Health',
        regNumber: 'WBMC-88120',
        phone: '+91 98300 11004',
        email: 'dr.amit@labmedix.org',
        opdRoom: 'Room 104 (Cardiac Suite)',
        avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
        username: 'dr.amit',
        pinCode: '1234',
        standardFee: 1000,
        followUpFee: 600,
        telemedicineFee: 850,
        cardholderDiscountPercent: 15,
        totalFeesCollected: 0,
        totalConsultationsCompleted: 0,
        bloodCommissionPercent: 20,
        totalTestsReferredCount: 0,
        totalReferredLabRevenue: 0,
        totalCommissionEarned: 0,
        totalCommissionPaid: 0,
        payableCommissionBalance: 0,
        status: 'active',
        availableDays: ['Tue', 'Wed', 'Thu', 'Sat'],
        opdTiming: '02:00 PM - 06:00 PM',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 'doc_rajesh',
        doctorCode: 'DR-005',
        name: 'Dr. Rajesh Sharma',
        qualification: 'MBBS, MS (Orthopedics)',
        speciality: 'Orthopedics & Joint Replacement',
        department: 'Bone & Joint Care',
        regNumber: 'WBMC-62409',
        phone: '+91 98300 11005',
        email: 'dr.rajesh@labmedix.org',
        opdRoom: 'Room 105 (Ortho Clinic)',
        avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
        username: 'dr.rajesh',
        pinCode: '1234',
        standardFee: 750,
        followUpFee: 500,
        telemedicineFee: 650,
        cardholderDiscountPercent: 20,
        totalFeesCollected: 0,
        totalConsultationsCompleted: 0,
        bloodCommissionPercent: 20,
        totalTestsReferredCount: 0,
        totalReferredLabRevenue: 0,
        totalCommissionEarned: 0,
        totalCommissionPaid: 0,
        payableCommissionBalance: 0,
        status: 'active',
        availableDays: ['Mon', 'Tue', 'Thu', 'Fri', 'Sat'],
        opdTiming: '12:00 PM - 04:00 PM',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z'
      }
    ];
  }

  public static getAllDoctors(): DoctorMasterItem[] {
    const list = StorageService.getItem<DoctorMasterItem[]>(DOCTOR_MASTER_STORAGE_KEY, []);
    if (!list || list.length === 0) {
      const initial = this.getInitialDoctors();
      StorageService.saveDoctors(initial);
      return initial;
    }
    return list;
  }

  public static getAll(): DoctorMasterItem[] {
    return this.getAllDoctors();
  }

  public static saveDoctors(doctors: DoctorMasterItem[]): void {
    StorageService.saveDoctors(doctors);
  }

  public static getDoctorById(id: string): DoctorMasterItem | undefined {
    return this.getAllDoctors().find(d => d.id === id || d.doctorCode === id || d.username === id);
  }

  // ==========================================
  // CREATE / REGISTER DOCTOR WITH AUTO USER ID & PASS
  // ==========================================
  public static createDoctor(
    doctorData: Omit<DoctorMasterItem, 'id' | 'doctorCode' | 'createdAt' | 'updatedAt' | 'totalFeesCollected' | 'totalConsultationsCompleted' | 'totalTestsReferredCount' | 'totalReferredLabRevenue' | 'totalCommissionEarned' | 'totalCommissionPaid' | 'payableCommissionBalance'>,
    operatorRole: string = 'super_admin'
  ): { success: boolean; doctor?: DoctorMasterItem; error?: string } {
    if (operatorRole !== 'super_admin') {
      return { success: false, error: 'Access Denied: Only Super Administrator has authority to add new physicians to Doctor Master.' };
    }

    const doctors = this.getAllDoctors();
    const cleanUsername = doctorData.username.trim().toLowerCase().replace(/\s+/g, '.');

    if (doctors.some(d => d.username.toLowerCase() === cleanUsername)) {
      return { success: false, error: `Doctor username @${cleanUsername} is already registered in the medical directory.` };
    }

    const newCode = `DR-${String(doctors.length + 1).padStart(3, '0')}`;
    const newId = `doc_${generateUuid().slice(0, 8)}`;

    const newDoctor: DoctorMasterItem = {
      ...doctorData,
      id: newId,
      doctorCode: newCode,
      username: cleanUsername,
      pinCode: doctorData.pinCode || '1234',
      totalFeesCollected: 0,
      totalConsultationsCompleted: 0,
      totalTestsReferredCount: 0,
      totalReferredLabRevenue: 0,
      totalCommissionEarned: 0,
      totalCommissionPaid: 0,
      payableCommissionBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Auto-create / sync staff operational account in UserService
    const existingUsers = StorageService.getUsers();
    if (!existingUsers.some(u => u.username.toLowerCase() === cleanUsername)) {
      const newStaffUser: User = {
        id: `usr_${newId}`,
        username: cleanUsername,
        fullName: doctorData.name,
        email: doctorData.email,
        phone: doctorData.phone,
        role: 'doctor',
        status: doctorData.status === 'active' ? 'active' : 'inactive',
        pinCode: doctorData.pinCode || '1234',
        staffId: newCode,
        department: doctorData.department,
        designation: `Consultant (${doctorData.speciality})`,
        accessZone: 'Zone D: Clinical & Doctor Consultation Rooms',
        bloodGroup: 'O+',
        photoUrl: doctorData.avatarUrl,
        createdAt: new Date().toISOString(),
        customPermissions: ['patient_read', 'card_read', 'wallet_read', 'emr_read', 'emr_create', 'emr_edit', 'emr_prescribe'],
        allowedModules: ['dashboard', 'patients', 'emr', 'cards', 'wallet']
      };
      existingUsers.push(newStaffUser);
      StorageService.saveUsers(existingUsers);
    }

    doctors.push(newDoctor);
    this.saveDoctors(doctors);
    ApiSyncService.saveDocument('doctors', newDoctor.id, newDoctor).catch(() => {});

    AuditService.log(
      'DOCTOR_MASTER_CREATED',
      'users',
      `Super Admin registered physician ${newDoctor.name} (${newDoctor.doctorCode}) with auto-credential @${cleanUsername}.`,
      newDoctor.id
    );

    return { success: true, doctor: newDoctor };
  }

  // ==========================================
  // UPDATE DOCTOR MASTER & FINANCIAL COMMISSION (SUPER ADMIN)
  // ==========================================
  public static updateDoctor(
    id: string,
    updates: Partial<DoctorMasterItem>,
    operatorRole: string = 'super_admin'
  ): { success: boolean; doctor?: DoctorMasterItem; error?: string } {
    if (operatorRole !== 'super_admin') {
      return { success: false, error: 'Access Denied: Only Super Administrator can modify Doctor Master profile and commission parameters.' };
    }

    const doctors = this.getAllDoctors();
    const index = doctors.findIndex(d => d.id === id || d.doctorCode === id);
    if (index === -1) return { success: false, error: 'Doctor record not found.' };

    const current = doctors[index];
    const updated: DoctorMasterItem = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Re-calculate payable balance
    updated.payableCommissionBalance = Math.max(0, updated.totalCommissionEarned - updated.totalCommissionPaid);

    doctors[index] = updated;
    this.saveDoctors(doctors);
    ApiSyncService.saveDocument('doctors', updated.id, updated).catch(() => {});

    // Sync updated PIN / password & name with staff account
    const users = StorageService.getUsers();
    const staffUser = users.find(u => u.username.toLowerCase() === current.username.toLowerCase());
    if (staffUser) {
      if (updates.name) staffUser.fullName = updates.name;
      if (updates.email) staffUser.email = updates.email;
      if (updates.phone) staffUser.phone = updates.phone;
      if (updates.pinCode) staffUser.pinCode = updates.pinCode;
      if (updates.status) staffUser.status = updates.status === 'active' ? 'active' : 'inactive';
      StorageService.saveUsers(users);
    }

    AuditService.log(
      'DOCTOR_MASTER_UPDATED',
      'users',
      `Super Admin updated physician ${updated.name} (${updated.doctorCode}). Commission Rate: ${updated.bloodCommissionPercent}%, Consultation: ₹${updated.standardFee}.`,
      updated.id
    );

    return { success: true, doctor: updated };
  }

  // ==========================================
  // RESET DOCTOR PASSWORD / PIN (SUPER ADMIN ONLY)
  // ==========================================
  public static resetDoctorPin(id: string, newPin: string, operatorRole: string = 'super_admin'): { success: boolean; error?: string } {
    if (operatorRole !== 'super_admin') {
      return { success: false, error: 'Super Admin clearance required to reset doctor security PINs.' };
    }

    return this.updateDoctor(id, { pinCode: newPin }, operatorRole);
  }

  // ==========================================
  // ATTRIBUTE CONSULTATION & BLOOD REFERRAL COMMISSION
  // ==========================================
  public static attributeConsultationAndReferral(
    doctorId: string,
    consultationFeeCharged: number,
    referredLabTestsGrossTotal: number
  ): void {
    const doctors = this.getAllDoctors();
    const doc = doctors.find(d => d.id === doctorId || d.name === doctorId || d.doctorCode === doctorId);
    if (!doc) return;

    doc.totalConsultationsCompleted += 1;
    doc.totalFeesCollected += consultationFeeCharged;

    if (referredLabTestsGrossTotal > 0) {
      const commissionEarned = Math.round((referredLabTestsGrossTotal * (doc.bloodCommissionPercent || 20)) / 100);
      doc.totalTestsReferredCount += 1;
      doc.totalReferredLabRevenue += referredLabTestsGrossTotal;
      doc.totalCommissionEarned += commissionEarned;
      doc.payableCommissionBalance = Math.max(0, doc.totalCommissionEarned - doc.totalCommissionPaid);
    }

    doc.updatedAt = new Date().toISOString();
    this.saveDoctors(doctors);
    ApiSyncService.saveDocument('doctors', doc.id, doc).catch(() => {});
  }

  // ==========================================
  // COMMISSION PAYOUT DISBURSEMENT (SUPER ADMIN)
  // ==========================================
  public static getPayoutHistory(): DoctorCommissionPayoutRecord[] {
    return StorageService.getItem<DoctorCommissionPayoutRecord[]>(DOCTOR_COMMISSION_PAYOUTS_STORAGE_KEY, []);
  }

  public static disburseCommissionPayout(
    doctorId: string,
    amount: number,
    paymentMode: 'Bank Transfer' | 'Cash' | 'Cheque' | 'Health Wallet UPI',
    referenceNo: string,
    notes: string,
    operatorRole: string = 'super_admin'
  ): { success: boolean; payout?: DoctorCommissionPayoutRecord; error?: string } {
    if (operatorRole !== 'super_admin') {
      return { success: false, error: 'Super Admin clearance required to disburse doctor referral commissions.' };
    }

    const doctors = this.getAllDoctors();
    const doc = doctors.find(d => d.id === doctorId || d.doctorCode === doctorId);
    if (!doc) return { success: false, error: 'Doctor record not found.' };

    if (amount <= 0 || amount > doc.payableCommissionBalance) {
      return { success: false, error: `Invalid payout amount. Current payable balance is ₹${doc.payableCommissionBalance}.` };
    }

    doc.totalCommissionPaid += amount;
    doc.payableCommissionBalance = Math.max(0, doc.totalCommissionEarned - doc.totalCommissionPaid);
    doc.updatedAt = new Date().toISOString();
    this.saveDoctors(doctors);

    const payouts = this.getPayoutHistory();
    const newPayout: DoctorCommissionPayoutRecord = {
      id: `pay_${generateUuid().slice(0, 8)}`,
      payoutNo: `PAY-DOC-${String(payouts.length + 1).padStart(4, '0')}`,
      doctorId: doc.id,
      doctorName: doc.name,
      amount,
      paymentMode,
      referenceNo: referenceNo || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      paidAt: new Date().toISOString(),
      paidBy: 'Super Administrator',
      notes: notes || `Diagnostic blood & pathology referral commission settlement for ${doc.name}.`
    };

    payouts.unshift(newPayout);
    StorageService.saveDoctorPayouts(payouts);

    AuditService.log(
      'DOCTOR_COMMISSION_DISBURSED',
      'wallet',
      `Super Admin disbursed ₹${amount} referral commission to ${doc.name} (${newPayout.payoutNo}) via ${paymentMode}.`,
      doc.id
    );

    return { success: true, payout: newPayout };
  }

  // ==========================================
  // DELETE DOCTOR MASTER RECORD (SUPER ADMIN)
  // ==========================================
  public static deleteDoctor(id: string, operatorRole: string = 'super_admin'): { success: boolean; error?: string } {
    if (operatorRole !== 'super_admin') {
      return { success: false, error: 'Super Admin clearance required to delete doctor records.' };
    }

    const doctors = this.getAllDoctors();
    const index = doctors.findIndex(d => d.id === id || d.doctorCode === id);
    if (index === -1) return { success: false, error: 'Doctor not found.' };

    const removed = doctors.splice(index, 1)[0];
    this.saveDoctors(doctors);

    // Delete in Firestore and record in WAL
    ApiSyncService.deleteDocument('doctors', removed.id).catch(() => {});

    // If linked staff user exists, clean up user account as well
    if (removed.linkedUserId) {
      UserService.deleteUser(removed.linkedUserId);
    }

    AuditService.log(
      'DOCTOR_MASTER_DELETED',
      'users',
      `Super Admin expunged physician ${removed.name} (${removed.doctorCode}) from system records.`,
      removed.id
    );

    return { success: true };
  }
}
