import { doc, writeBatch } from 'firebase/firestore';
import { db } from './firebaseService';
import { StorageService } from './storage';
import { WalletService } from './walletService';
import { EMRService } from './emrService';
import { PatientService } from './patientService';
import { FamilyService } from './familyService';
import { AuditService } from './auditService';
import { ApiSyncService } from './apiSyncService';
import { PatientAppointment, CardApplicationRequest, CardApplicationHistoryItem } from '../types';
import { generateUuid, generateLabOrderId, generateSampleBarcode } from '../utils/idGenerator';
import { BillService } from './billService';
import { DoctorMasterService } from './doctorMasterService';

export interface BloodTestBookingItem {
  testName: string;
  category: string;
  grossPrice: number;
  discountAmount: number;
  netPrice: number;
  fastingRequired: boolean;
}

export interface LabTestResultParameter {
  parameterName: string;
  observedValue: string;
  unit: string;
  referenceRange: string;
  flag: 'normal' | 'low' | 'high' | 'critical';
  critical?: boolean;
}

export interface BloodTestBooking {
  id: string;
  bookingNo: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  cardNo?: string;
  cardTier?: string;
  testName: string;
  category: string;
  items?: BloodTestBookingItem[];
  collectionType: 'home_collection' | 'lab_visit';
  scheduledDate: string;
  scheduledTime: string;
  grossPrice: number;
  discountPercentage: number;
  discountAmount: number;
  netPrice: number;
  paymentStatus: 'paid_wallet' | 'pay_at_lab' | 'paid_counter';
  status: 'confirmed' | 'phlebotomist_assigned' | 'sample_collected' | 'processing' | 'report_ready';
  fastingRequired: boolean;
  assignedPhlebotomist?: string;
  adminNotificationSent?: boolean;
  prescribedByDoctorName?: string;
  encounterNo?: string;
  sampleBarcode?: string;
  sampleTubeType?: string;
  sampleCollectedAt?: string;
  sampleReceivedAt?: string;
  reportReadyAt?: string;
  testResults?: LabTestResultParameter[];
  pathologistNotes?: string;
  pathologistName?: string;
  verifiedBy?: string;
  verifiedDoctorRegistrationNo?: string;
  verifiedAt?: string;
  clinicalNotes?: string;
  billId?: string;
  createdAt: string;
}

export interface PharmacyOrderItem {
  medicineName: string;
  genericComposition: string;
  dosage: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface MedicineOrder {
  id: string;
  orderNo: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  items: PharmacyOrderItem[];
  deliveryMode: 'express_home_delivery' | 'counter_pickup';
  deliveryAddress: string;
  grossTotal: number;
  discountPercentage: number;
  discountAmount: number;
  netTotal: number;
  paymentStatus: 'paid_wallet' | 'cash_on_delivery';
  status: 'order_placed' | 'packed' | 'out_for_delivery' | 'delivered';
  createdAt: string;
}

export interface PatientReceiptData {
  id: string;
  receiptNo: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  cardNo?: string;
  cardTier?: string;
  serviceType: 'Consultation' | 'Pathology' | 'Pharmacy' | 'Wallet Recharge' | 'General';
  serviceDescription: string;
  items?: Array<{ name: string; qty?: number; price: number }>;
  grossAmount: number;
  discountAmount: number;
  discountPercentage?: number;
  netAmount: number;
  paymentMethod: 'Health Wallet (Prepaid Cashless)' | 'UPI' | 'Card' | 'Cash';
  walletOpeningBalance?: number;
  walletClosingBalance?: number;
  date: string;
  status: 'Completed' | 'Pending';
  referenceNo?: string;
}

export class PortalService {
  private static LAB_BOOKINGS_KEY = 'labmedix_portal_lab_bookings_v1';
  private static PHARMACY_ORDERS_KEY = 'labmedix_portal_pharmacy_orders_v1';

  private static getInitialLabBookings(): BloodTestBooking[] {
    return [];
  }

  private static getInitialPharmacyOrders(): MedicineOrder[] {
    return [];
  }

  public static getLabBookings(patientId?: string): BloodTestBooking[] {
    const all = StorageService.getItem<BloodTestBooking[]>(this.LAB_BOOKINGS_KEY, this.getInitialLabBookings());
    if (!patientId) return all;
    return all.filter(b => b.patientId === patientId);
  }

  public static getLabBookingsByCard(cardNoOrId: string): BloodTestBooking[] {
    const cards = StorageService.getCards();
    const targetCard = cards.find(c => c.cardNumber === cardNoOrId || c.id === cardNoOrId);
    return this.getLabBookings().filter(b => 
      b.cardNo === cardNoOrId || 
      (targetCard && b.patientId === targetCard.patientId)
    );
  }

  public static saveLabBooking(booking: Omit<BloodTestBooking, 'id' | 'bookingNo' | 'createdAt'>): BloodTestBooking {
    const all = this.getLabBookings();
    const cards = StorageService.getCards();
    const patientCard = cards.find(c => c.patientId === booking.patientId && c.status === 'active') || 
                        cards.find(c => c.patientId === booking.patientId);
    const existingOrders = all.map(b => b.bookingNo);
    const bookingNo = generateLabOrderId(existingOrders);

    const newBooking: BloodTestBooking = {
      ...booking,
      cardNo: booking.cardNo || patientCard?.cardNumber,
      id: `lab_bk_${generateUuid().slice(0, 8)}`,
      bookingNo,
      createdAt: new Date().toISOString()
    };

    // Auto-generate official hospital bill for diagnostic order
    const gross = Number(newBooking.grossPrice || newBooking.netPrice || 0);
    const net = Number(newBooking.netPrice || gross);
    const isPaid = newBooking.paymentStatus === 'paid_wallet' || newBooking.paymentStatus === 'paid_counter';
    try {
      if (gross > 0) {
        const bill = BillService.createHospitalBill({
          patientId: newBooking.patientId,
          patientName: newBooking.patientName,
          patientMobile: newBooking.patientPhone,
          healthCardNumber: newBooking.cardNo,
          healthCardId: patientCard?.id,
          billCategory: 'lab_diagnostics',
          items: [
            {
              description: `Diagnostic Lab Requisition: ${newBooking.testName} [Booking: ${bookingNo}]`,
              quantity: 1,
              unitPrice: gross,
              total: gross
            }
          ],
          discountAmount: Number(newBooking.discountAmount || 0),
          paidAmount: isPaid ? net : 0,
          paymentMethod: newBooking.paymentStatus === 'paid_wallet' ? 'wallet' : 'cash',
          notes: `Lab Investigation #${bookingNo} for ${newBooking.patientName}`
        });
        newBooking.billId = bill.id;
      }
    } catch (err) {
      console.error('Failed to create hospital bill for lab booking:', err);
    }

    // Attribute referral commission to prescribing doctor if applicable
    if (newBooking.prescribedByDoctorName && net > 0) {
      DoctorMasterService.attributeConsultationAndReferral(newBooking.prescribedByDoctorName, 0, net);
    }

    all.unshift(newBooking);
    StorageService.setItem(this.LAB_BOOKINGS_KEY, all);
    ApiSyncService.syncLabBookings(all).catch(() => {});
    AuditService.log('LAB_BOOKING_CREATED', 'clinical', `Live Blood Test Order #${newBooking.bookingNo} (${newBooking.testName}) registered for Card: ${newBooking.cardNo || 'N/A'} (${newBooking.patientName})`);
    return newBooking;
  }

  public static bookBloodTest(booking: Omit<BloodTestBooking, 'id' | 'bookingNo' | 'createdAt'>): BloodTestBooking {
    return this.saveLabBooking(booking);
  }

  public static saveLabBookings(bookings: BloodTestBooking[]): void {
    StorageService.setItem(this.LAB_BOOKINGS_KEY, bookings);
    ApiSyncService.syncLabBookings(bookings).catch(() => {});
  }

  public static updateLabBookingStatus(bookingId: string, newStatus: BloodTestBooking['status'], additionalDetails?: Partial<BloodTestBooking>): BloodTestBooking | null {
    const all = this.getLabBookings();
    const index = all.findIndex(b => b.id === bookingId);
    if (index === -1) return null;

    all[index] = {
      ...all[index],
      ...additionalDetails,
      status: newStatus
    };

    StorageService.setItem(this.LAB_BOOKINGS_KEY, all);
    ApiSyncService.syncLabBookings(all).catch(() => {});
    return all[index];
  }

  public static markSampleCollected(
    bookingId: string,
    details: { barcode?: string; tubeType: string; phlebotomist: string }
  ): BloodTestBooking | null {
    const all = this.getLabBookings();
    const barcode = details.barcode?.trim() || generateSampleBarcode(all.map(b => b.sampleBarcode || ''));
    return this.updateLabBookingStatus(bookingId, 'sample_collected', {
      sampleBarcode: barcode,
      sampleTubeType: details.tubeType,
      assignedPhlebotomist: details.phlebotomist,
      sampleCollectedAt: new Date().toISOString()
    });
  }

  public static receiveSampleInLab(bookingId: string, receivedBy: string = 'Central Laboratory Staff'): BloodTestBooking | null {
    return this.updateLabBookingStatus(bookingId, 'processing', {
      sampleReceivedAt: new Date().toISOString(),
      verifiedBy: receivedBy
    });
  }

  public static updateTestResults(
    bookingId: string,
    testResults: LabTestResultParameter[],
    pathologistNotes?: string,
    pathologistName: string = 'Dr. Kaushik Chatterjee, MD (Pathology)'
  ): BloodTestBooking | null {
    return this.updateLabBookingStatus(bookingId, 'report_ready', {
      testResults,
      pathologistNotes,
      pathologistName,
      reportReadyAt: new Date().toISOString(),
      verifiedBy: pathologistName
    });
  }

  public static createDoctorPrescribedLabBooking(data: {
    patientId: string;
    patientName: string;
    patientPhone?: string;
    cardTier?: string;
    testNames: string[];
    doctorName: string;
    encounterNo: string;
    grossPrice: number;
    discountPercentage: number;
  }): BloodTestBooking {
    const discountAmount = (data.grossPrice * data.discountPercentage) / 100;
    const netPrice = data.grossPrice - discountAmount;
    const primaryTest = data.testNames[0] || 'Pathology Diagnostic Panel';
    const otherCount = data.testNames.length - 1;
    const displayName = otherCount > 0 ? `${primaryTest} + ${otherCount} other test(s)` : primaryTest;

    const booking = this.saveLabBooking({
      patientId: data.patientId,
      patientName: data.patientName,
      patientPhone: data.patientPhone,
      cardTier: data.cardTier || 'Standard Health Card',
      testName: displayName,
      category: 'Doctor Prescribed Investigation',
      collectionType: 'lab_visit',
      scheduledDate: new Date().toISOString().slice(0, 10),
      scheduledTime: '08:00 AM - 12:00 PM (OPD Lab)',
      grossPrice: data.grossPrice,
      discountPercentage: data.discountPercentage,
      discountAmount,
      netPrice,
      paymentStatus: 'pay_at_lab',
      status: 'confirmed',
      fastingRequired: data.testNames.some(t => t.toLowerCase().includes('lipid') || t.toLowerCase().includes('glucose') || t.toLowerCase().includes('fasting')),
      prescribedByDoctorName: data.doctorName,
      encounterNo: data.encounterNo
    });

    AuditService.log(
      'DOCTOR_LAB_REQUISITION_DISPATCHED',
      'portal',
      `Dr. ${data.doctorName} prescribed diagnostic investigation [${displayName}] for patient ${data.patientName} (${data.patientId}). Auto-requisition #${booking.bookingNo} created.`,
      data.patientId
    );

    return booking;
  }

  public static getPharmacyOrders(patientId?: string): MedicineOrder[] {
    const all = StorageService.getItem<MedicineOrder[]>(this.PHARMACY_ORDERS_KEY, this.getInitialPharmacyOrders());
    if (!patientId) return all;
    return all.filter(o => o.patientId === patientId);
  }

  public static getPharmacyOrdersByCard(cardNoOrId: string): MedicineOrder[] {
    const cards = StorageService.getCards();
    const targetCard = cards.find(c => c.cardNumber === cardNoOrId || c.id === cardNoOrId);
    return this.getPharmacyOrders().filter(o => 
      (targetCard && o.patientId === targetCard.patientId)
    );
  }

  public static savePharmacyOrder(order: Omit<MedicineOrder, 'id' | 'orderNo' | 'createdAt'>): MedicineOrder {
    const all = this.getPharmacyOrders();
    const cards = StorageService.getCards();
    const patientCard = cards.find(c => c.patientId === order.patientId && c.status === 'active') || 
                        cards.find(c => c.patientId === order.patientId);

    const newOrder: MedicineOrder = {
      ...order,
      id: `phm_ord_${generateUuid().slice(0, 8)}`,
      orderNo: `MED-2026-${String(Math.floor(1000 + Math.random() * 9000))}`,
      createdAt: new Date().toISOString()
    };

    all.unshift(newOrder);
    StorageService.setItem(this.PHARMACY_ORDERS_KEY, all);
    ApiSyncService.syncPharmacyOrders(all).catch(() => {});
    AuditService.log('PHARMACY_ORDER_CREATED', 'clinical', `Live Pharmacy Medicine Order #${newOrder.orderNo} (${newOrder.items.length} items) registered for Card: ${patientCard?.cardNumber || 'N/A'} (${newOrder.patientName})`);
    return newOrder;
  }

  public static updatePharmacyOrderStatus(orderId: string, newStatus: MedicineOrder['status']): MedicineOrder | null {
    const all = this.getPharmacyOrders();
    const index = all.findIndex(o => o.id === orderId);
    if (index === -1) return null;

    all[index] = {
      ...all[index],
      status: newStatus
    };

    StorageService.setItem(this.PHARMACY_ORDERS_KEY, all);
    ApiSyncService.syncPharmacyOrders(all).catch(() => {});
    return all[index];
  }

  /**
   * Compiles Unified Patient Medical & Billing History across Wallets, OPD, Labs, Pharmacy, and Prescriptions
   */
  public static getUnifiedHistory(patientId: string) {
    const appointments = EMRService.getAllAppointments().filter(a => a.patientId === patientId);
    const encounters = EMRService.getAllEncounters().filter(e => e.patientId === patientId);
    const labBookings = this.getLabBookings(patientId);
    const pharmacyOrders = this.getPharmacyOrders(patientId);
    const walletTransactions = WalletService.getTransactions(patientId);

    return {
      appointments,
      encounters,
      labBookings,
      pharmacyOrders,
      walletTransactions
    };
  }

  // ==========================================
  // ONLINE HEALTH CARD SELF-SERVICE APPLICATION & SUPER ADMIN APPROVAL WORKFLOW
  // ==========================================
  private static CARD_APPLICATIONS_KEY = 'labmedix_portal_card_applications_v1';

  private static getInitialCardApplications(): CardApplicationRequest[] {
    return [];
  }

  public static getCardApplications(status?: CardApplicationRequest['status']): CardApplicationRequest[] {
    const all = StorageService.getItem<CardApplicationRequest[]>(this.CARD_APPLICATIONS_KEY, this.getInitialCardApplications());
    if (!status) return all;
    return all.filter(a => a.status === status);
  }

  public static saveCardApplication(data: Omit<CardApplicationRequest, 'id' | 'applicationNo' | 'trackingId' | 'status' | 'createdAt' | 'updatedAt'>): CardApplicationRequest {
    const all = this.getCardApplications();
    const reqSeq = String(Math.floor(100000 + Math.random() * 900000));
    const trackingId = `LMX-REQ-2026-${reqSeq}`;
    const appNo = trackingId;
    const now = new Date().toISOString();

    const initialHistory: CardApplicationHistoryItem[] = [
      {
        id: generateUuid(),
        date: now,
        status: 'submitted',
        title: 'Request Submitted',
        note: `Card Creation Request submitted for ${data.fullName} (${data.membershipName}).`,
        actor: 'Applicant'
      }
    ];

    const newApp: CardApplicationRequest = {
      ...data,
      id: `app_req_${generateUuid().slice(0, 8)}`,
      applicationNo: appNo,
      trackingId,
      status: 'pending_approval',
      paymentStatus: data.paymentStatus || 'pending_verification',
      processingHistory: initialHistory,
      createdAt: now,
      updatedAt: now
    };

    all.unshift(newApp);
    StorageService.setItem(this.CARD_APPLICATIONS_KEY, all);
    ApiSyncService.saveDocument('cardApplications', newApp.id, newApp).catch(() => {});
    ApiSyncService.syncCardApplications(all).catch(() => {});

    AuditService.log(
      'CARD_APPLICATION_SUBMITTED',
      'patient',
      `New Health Card Request submitted for ${newApp.fullName} (${newApp.membershipName}) [Tracking ID: ${newApp.trackingId}, Source: ${newApp.requestSource || 'staff_portal'}]`,
      newApp.id
    );

    return newApp;
  }

  public static async approveCardApplication(
    applicationId: string,
    approvedBy: string = 'Super Administrator'
  ): Promise<{ success: boolean; application?: CardApplicationRequest; patient?: any; card?: any; error?: string }> {
    try {
      const all = this.getCardApplications();
      const app = all.find(a => a.id === applicationId || a.trackingId === applicationId);
      if (!app) {
        return { success: false, error: 'Application not found in storage.' };
      }
      if (app.status === 'approved') {
        return { success: true, application: app, error: 'Application is already approved and ready for issuance.' };
      }

      const now = new Date().toISOString();
      const patientId = app.patientId || `lmdx-p-${Math.floor(1000 + Math.random() * 9000)}`;

      let patientRecord: any;
      const patients = StorageService.getPatients();
      const existingPatient = app.patientId ? patients.find(p => p.id === app.patientId) : null;

      if (existingPatient) {
        existingPatient.membershipId = app.membershipId || existingPatient.membershipId || 'silver';
        existingPatient.updatedAt = now;
        patientRecord = existingPatient;
        StorageService.savePatients(patients);
        ApiSyncService.saveDocument('patients', patientRecord.id, patientRecord).catch(() => {});
      } else {
        const newPatient = {
          id: patientId,
          walletId: `wal_${patientId}`,
          fullName: app.fullName,
          dob: app.dob || '1995-01-01',
          age: app.age || 30,
          gender: app.gender || 'male',
          mobile: app.mobile,
          whatsapp: app.whatsapp || app.mobile,
          email: app.email || `${app.mobile}@labmedix.org`,
          bloodGroup: app.bloodGroup || 'Unknown',
          photoUrl: app.photoUrl || '/logo.jpg',
          address: app.address || { villageArea: '', postOffice: '', policeStation: '', district: '', state: '', pinCode: '', fullAddress: '' },
          emergencyContact: app.emergencyContact || { name: '', relation: '', phone: '' },
          medicalInfo: app.medicalInfo || { chronicConditions: '', allergies: '', importantNotes: '', bloodGroup: app.bloodGroup || 'Unknown' },
          membershipId: app.membershipId || 'silver',
          status: 'active' as const,
          isDeleted: false,
          createdBy: approvedBy,
          createdAt: now,
          updatedAt: now
        };
        patientRecord = newPatient;
        patients.unshift(newPatient as any);
        StorageService.savePatients(patients);
        ApiSyncService.saveDocument('patients', newPatient.id, newPatient).catch(() => {});
      }

      app.status = 'approved';
      app.approvedBy = approvedBy;
      app.approvedAt = now;
      app.approvedPatientId = patientRecord.id;
      app.updatedAt = now;

      if (!app.processingHistory) app.processingHistory = [];
      app.processingHistory.unshift({
        id: generateUuid(),
        date: now,
        status: 'approved',
        title: 'Health Card Request Approved',
        note: `Application reviewed and approved by ${approvedBy}. Ready for card issuance.`,
        actor: approvedBy
      });

      StorageService.setItem(this.CARD_APPLICATIONS_KEY, all);
      await ApiSyncService.saveDocument('cardApplications', app.id, app);

      AuditService.log(
        'CARD_APPLICATION_APPROVED',
        'card',
        `Super Admin ${approvedBy} approved Health Card Request #${app.applicationNo || app.trackingId} for ${app.fullName} [Patient ID: ${patientRecord.id}]. Ready for issuance.`,
        app.id
      );

      return { success: true, application: app, patient: patientRecord };
    } catch (e: any) {
      console.error('Approve card application error:', e);
      return { success: false, error: e?.message || 'Transaction error during card application approval.' };
    }
  }

  /**
   * Explicit, Authorized Health Card Issuance
   * Mints unique Card Number, CVV, and NFC payload, transitions status to card_issued
   */
  public static async issueHealthCardForApplication(
    applicationId: string,
    issuedBy: string = 'Super Administrator',
    customDesign?: any
  ): Promise<{ success: boolean; application?: CardApplicationRequest; card?: any; patient?: any; error?: string }> {
    try {
      const all = this.getCardApplications();
      const app = all.find(a => a.id === applicationId || a.trackingId === applicationId);
      if (!app) {
        return { success: false, error: 'Card request application not found.' };
      }
      if (app.status === 'card_issued' && app.approvedCardNumber) {
        const cards = StorageService.getCards();
        const existing = cards.find(c => c.cardNumber === app.approvedCardNumber);
        return { success: true, application: app, card: existing };
      }

      const now = new Date().toISOString();
      const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const cardId = `card_${Math.floor(100000 + Math.random() * 900000)}`;
      const cardNumber = `LHC-2026-${Math.floor(100000 + Math.random() * 900000)}`;

      const patients = StorageService.getPatients();
      const patientId = app.approvedPatientId || app.patientId;
      const patientRecord = patientId ? patients.find(p => p.id === patientId) : null;

      if (patientRecord) {
        patientRecord.healthCardId = cardId;
        patientRecord.updatedAt = now;
        StorageService.savePatients(patients);
        ApiSyncService.saveDocument('patients', patientRecord.id, patientRecord).catch(() => {});
      }

      const newCard = {
        id: cardId,
        cardNumber,
        patientId: patientRecord?.id || patientId || 'UNKNOWN',
        membershipId: app.membershipId || 'silver',
        issueDate: now.slice(0, 10),
        expiryDate,
        cvv: String(Math.floor(100 + Math.random() * 900)),
        verificationCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        status: 'active' as const,
        designConfig: customDesign || {
          preset: 'emerald_health',
          material: 'gloss',
          primaryColor: '#059669',
          accentColor: '#10b981',
          backgroundColor: '#064e3b',
          textColor: '#ffffff',
          showChip: true,
          showContactless: true,
          showEmergencyBadge: true,
          showBarcode: true,
          showSignatureStrip: true
        },
        statusHistory: [{ id: generateUuid(), cardId, date: now, previousStatus: 'active' as const, newStatus: 'active' as const, changedBy: issuedBy, reason: `Card issued by ${issuedBy}` }],
        renewedCount: 0,
        createdAt: now,
        updatedAt: now
      };

      app.status = 'card_issued';
      app.approvedCardNumber = cardNumber;
      app.updatedAt = now;

      if (!app.processingHistory) app.processingHistory = [];
      app.processingHistory.unshift({
        id: generateUuid(),
        date: now,
        status: 'card_issued',
        title: 'Official Health Card Minted & Issued',
        note: `Health Card #${cardNumber} minted and activated by ${issuedBy}.`,
        actor: issuedBy
      });

      const cards = StorageService.getCards();
      cards.unshift(newCard as any);
      StorageService.saveCards(cards);
      StorageService.setItem(this.CARD_APPLICATIONS_KEY, all);

      // Multi-device Firestore atomic batch commit
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'cardApplications', app.id), JSON.parse(JSON.stringify(app)), { merge: true });
        batch.set(doc(db, 'cards', newCard.id), JSON.parse(JSON.stringify(newCard)), { merge: true });
        if (patientRecord) {
          batch.set(doc(db, 'patients', patientRecord.id), JSON.parse(JSON.stringify(patientRecord)), { merge: true });
        }
        await batch.commit();
      } catch (batchErr) {
        console.warn('[PortalService] Batch commit notice (falling back to queue):', batchErr);
        ApiSyncService.saveDocument('cardApplications', app.id, app).catch(() => {});
        ApiSyncService.saveDocument('cards', newCard.id, newCard).catch(() => {});
        if (patientRecord) {
          ApiSyncService.saveDocument('patients', patientRecord.id, patientRecord).catch(() => {});
        }
      }

      AuditService.log(
        'HEALTH_CARD_ISSUED',
        'card',
        `Official Health Card #${cardNumber} issued for ${app.fullName} [Patient: ${patientRecord?.id || 'N/A'}] by ${issuedBy}.`,
        newCard.id
      );

      return { success: true, application: app, card: newCard, patient: patientRecord };
    } catch (e: any) {
      console.error('Issue card error:', e);
      return { success: false, error: e?.message || 'Error during health card issuance.' };
    }
  }

  public static rejectCardApplication(
    applicationId: string,
    reason: string = 'Verification failed',
    rejectedBy: string = 'Super Administrator'
  ): { success: boolean; application?: CardApplicationRequest; error?: string } {
    const all = this.getCardApplications();
    const app = all.find(a => a.id === applicationId || a.trackingId === applicationId);
    if (!app) return { success: false, error: 'Application not found.' };

    const now = new Date().toISOString();
    app.status = 'rejected';
    app.rejectionReason = reason;
    app.approvedBy = rejectedBy;
    app.updatedAt = now;

    if (!app.processingHistory) app.processingHistory = [];
    app.processingHistory.unshift({
      id: generateUuid(),
      date: now,
      status: 'rejected',
      title: 'Request Rejected',
      note: `Application rejected by ${rejectedBy}. Reason: ${reason}`,
      actor: rejectedBy
    });

    StorageService.setItem(this.CARD_APPLICATIONS_KEY, all);
    ApiSyncService.saveDocument('cardApplications', app.id, app).catch(() => {});
    ApiSyncService.syncCardApplications(all).catch(() => {});

    AuditService.log(
      'CARD_APPLICATION_REJECTED',
      'card',
      `Card application ${app.trackingId || app.applicationNo} for ${app.fullName} was rejected. Reason: ${reason}`,
      app.id
    );

    return { success: true, application: app };
  }

  public static requestMoreInformation(
    applicationId: string,
    note: string,
    requestedBy: string = 'Super Administrator'
  ): { success: boolean; application?: CardApplicationRequest; error?: string } {
    const all = this.getCardApplications();
    const app = all.find(a => a.id === applicationId || a.trackingId === applicationId);
    if (!app) return { success: false, error: 'Application not found.' };

    const now = new Date().toISOString();
    app.status = 'info_required';
    app.infoRequiredNote = note;
    app.updatedAt = now;

    if (!app.processingHistory) app.processingHistory = [];
    app.processingHistory.unshift({
      id: generateUuid(),
      date: now,
      status: 'info_required',
      title: 'Additional Information Required',
      note: `Super Admin requested missing details: ${note}`,
      actor: requestedBy
    });

    StorageService.setItem(this.CARD_APPLICATIONS_KEY, all);
    ApiSyncService.saveDocument('cardApplications', app.id, app).catch(() => {});
    ApiSyncService.syncCardApplications(all).catch(() => {});

    AuditService.log(
      'CARD_APPLICATION_INFO_REQUESTED',
      'card',
      `Super Admin requested additional information for card application ${app.trackingId || app.applicationNo}. Note: ${note}`,
      app.id
    );

    return { success: true, application: app };
  }

  public static updateCardApplicationPaymentStatus(
    applicationId: string,
    paymentStatus: CardApplicationRequest['paymentStatus'],
    actor: string = 'Super Administrator'
  ): { success: boolean; application?: CardApplicationRequest; error?: string } {
    const all = this.getCardApplications();
    const app = all.find(a => a.id === applicationId || a.trackingId === applicationId);
    if (!app) return { success: false, error: 'Application not found.' };

    const prev = app.paymentStatus;
    const now = new Date().toISOString();
    app.paymentStatus = paymentStatus;
    app.updatedAt = now;

    if (!app.processingHistory) app.processingHistory = [];
    app.processingHistory.unshift({
      id: generateUuid(),
      date: now,
      status: app.status,
      title: 'Payment Status Updated',
      note: `Payment status updated from ${prev.toUpperCase()} to ${paymentStatus.toUpperCase()} by ${actor}.`,
      actor
    });

    StorageService.setItem(this.CARD_APPLICATIONS_KEY, all);
    ApiSyncService.saveDocument('cardApplications', app.id, app).catch(() => {});
    ApiSyncService.syncCardApplications(all).catch(() => {});

    AuditService.log(
      'CARD_APPLICATION_PAYMENT_STATUS_UPDATED',
      'card',
      `Payment status updated for card application ${app.trackingId || app.applicationNo}: ${prev} -> ${paymentStatus}`,
      app.id
    );

    return { success: true, application: app };
  }

  public static deleteCardApplication(
    applicationId: string,
    actor: string = 'Super Administrator'
  ): { success: boolean; error?: string } {
    const all = this.getCardApplications();
    const idx = all.findIndex(a => a.id === applicationId || a.trackingId === applicationId);
    if (idx === -1) return { success: false, error: 'Application not found.' };

    const removed = all.splice(idx, 1)[0];
    StorageService.setItem(this.CARD_APPLICATIONS_KEY, all);

    // Hard delete in Firestore and record in WAL
    ApiSyncService.deleteDocument('cardApplications', removed.id).catch(() => {});

    AuditService.log(
      'CARD_APPLICATION_DELETED',
      'card',
      `Card application ${removed.trackingId || removed.applicationNo} for ${removed.fullName} was purged by ${actor}.`,
      removed.id
    );

    return { success: true };
  }
}
