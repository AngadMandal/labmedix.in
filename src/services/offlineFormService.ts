import { PatientService, CreateFamilyMemberInput, CreatePatientInput } from './patientService';
import { StorageService } from './storage';
import { AuditService } from './auditService';
import { ApiSyncService } from './apiSyncService';
import { VitalsService } from './vitalsService';

export interface OfflinePatientData {
  fullName: string;
  guardianName?: string;
  relationshipWithGuardian?: string;
  dob: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  maritalStatus: string;
  occupation: string;
  bloodGroup: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  governmentIdType: string;
  governmentIdNumber: string;
  
  // Address
  villageArea: string;
  postOffice: string;
  policeStation: string;
  district: string;
  state: string;
  pinCode: string;
  fullAddress: string;

  // Medical background
  allergies?: string;
  chronicConditions?: string;
  isDiabetic?: boolean;
  isHypertensive?: boolean;
  hasHeartDisease?: boolean;
  hasAsthma?: boolean;
  currentMedications?: string;
  emergencyNotes?: string;

  // Baseline Vitals
  vitals?: {
    bpSystolic?: number;
    bpDiastolic?: number;
    pulseRate?: number;
    bloodSugar?: number;
    sugarType?: 'fasting' | 'post_prandial' | 'random';
    spo2?: number;
    temperature?: number;
    weightKg?: number;
    heightCm?: number;
    bmi?: string;
  };

  // Emergency Contact
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactMobile: string;

  // Card & Membership
  membershipId: string;
  cardDesignPreset?: string;
  initialDeposit?: number;

  // Family Members
  familyName?: string;
  familyMembers?: CreateFamilyMemberInput[];

  // Field Camp / Referral Details
  campName?: string;
  campLocation?: string;
  volunteerOrAgentName?: string;
  paymentMode: 'cash' | 'upi' | 'ngo_free_grant' | 'card';
  feeCollected: number;
  referralSource?: string;
  referralDoctorName?: string;
  generalNotes?: string;

  // Media & Extras
  photoBase64?: string;
  signatureBase64?: string;
  audioVoiceMemoBase64?: string;

  // Clinical Triage & Risk Stratification
  triageLevel?: 'normal' | 'moderate' | 'high_risk' | 'emergency';
  triageReasons?: string[];

  // Field Dispensed Medicines
  dispensedMedicines?: Array<{
    id: string;
    name: string;
    dosage: string;
    quantity: number;
    instructions: string;
  }>;
}

export interface OfflineSubmission {
  id: string;
  offlineToken: string;
  createdAt: string;
  data: OfflinePatientData;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  syncedAt?: string;
  syncedPatientId?: string;
  syncedCardNumber?: string;
  syncError?: string;
  deviceFingerprint?: string;
  capturedBy?: string;
}

const STORAGE_KEY_SUBMISSIONS = 'labmedix_offline_submissions';
const STORAGE_KEY_DRAFT = 'labmedix_offline_form_draft';

export class OfflineFormService {
  /** Generate a short user-friendly offline token (e.g. OFF-8K92-B7) */
  public static generateOfflineToken(): string {
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `OFF-${timestamp}-${rand}`;
  }

  /** Retrieve all offline submissions stored in local storage */
  public static getAllSubmissions(): OfflineSubmission[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error('[OfflineFormService] Error reading offline submissions:', e);
      return [];
    }
  }

  /** Retrieve only pending unsynced submissions */
  public static getPendingSubmissions(): OfflineSubmission[] {
    return this.getAllSubmissions().filter(s => s.syncStatus === 'pending' || s.syncStatus === 'failed');
  }

  /** Save a new offline submission */
  public static saveOfflineSubmission(data: OfflinePatientData, capturedBy?: string): OfflineSubmission {
    const submissions = this.getAllSubmissions();
    const id = `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const offlineToken = this.generateOfflineToken();

    const newSubmission: OfflineSubmission = {
      id,
      offlineToken,
      createdAt: new Date().toISOString(),
      data,
      syncStatus: 'pending',
      deviceFingerprint: typeof navigator !== 'undefined' ? `${navigator.userAgent.slice(0, 50)}` : 'browser',
      capturedBy: capturedBy || StorageService.getCurrentUser()?.fullName || 'Field Health Worker'
    };

    submissions.unshift(newSubmission);
    localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions));

    // Clear saved draft on successful form save
    this.clearDraft();

    // Log offline action in local audit
    AuditService.log(
      'OFFLINE_FORM_SAVED',
      'patient',
      `Saved offline patient registration for ${data.fullName} (Token: ${offlineToken}, Camp: ${data.campName || 'General Field Intake'}).`
    );

    // Broadcast local storage update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('labmedix_offline_queue_changed', { detail: { count: submissions.length } }));
    }

    return newSubmission;
  }

  /** Update an existing submission */
  public static updateSubmission(id: string, updates: Partial<OfflineSubmission>): void {
    const submissions = this.getAllSubmissions();
    const index = submissions.findIndex(s => s.id === id);
    if (index === -1) return;

    submissions[index] = { ...submissions[index], ...updates };
    localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('labmedix_offline_queue_changed', { detail: { count: submissions.length } }));
    }
  }

  /** Delete a single submission from queue */
  public static deleteSubmission(id: string): void {
    const submissions = this.getAllSubmissions().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('labmedix_offline_queue_changed', { detail: { count: submissions.length } }));
    }
  }

  /** Clear all synced submissions */
  public static clearSyncedSubmissions(): void {
    const pendingOnly = this.getAllSubmissions().filter(s => s.syncStatus !== 'synced');
    localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(pendingOnly));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('labmedix_offline_queue_changed', { detail: { count: pendingOnly.length } }));
    }
  }

  /** Convert an offline submission into a live system patient */
  public static async syncSubmissionToLive(id: string): Promise<{ success: boolean; patientId?: string; cardNumber?: string; error?: string }> {
    const submissions = this.getAllSubmissions();
    const submission = submissions.find(s => s.id === id);
    if (!submission) {
      return { success: false, error: 'Submission not found in offline queue' };
    }

    this.updateSubmission(id, { syncStatus: 'syncing', syncError: undefined });

    try {
      const d = submission.data;

      // Compile combined address
      const fullAddressText = d.fullAddress || `${d.villageArea}, PO: ${d.postOffice}, PS: ${d.policeStation}, ${d.district}, ${d.state} - ${d.pinCode}`;

      // Compile medical notes
      const conditionsList: string[] = [];
      if (d.isDiabetic) conditionsList.push('Diabetes Mellitus');
      if (d.isHypertensive) conditionsList.push('Hypertension');
      if (d.hasHeartDisease) conditionsList.push('Cardiac Disease');
      if (d.hasAsthma) conditionsList.push('Asthma/Respiratory');
      if (d.chronicConditions) conditionsList.push(d.chronicConditions);

      const patientInput: CreatePatientInput = {
        fullName: d.fullName.trim(),
        dob: d.dob || new Date().toISOString().split('T')[0],
        age: Number(d.age) || 30,
        gender: d.gender || 'male',
        mobile: d.mobile.trim(),
        whatsapp: d.whatsapp || d.mobile,
        email: d.email || undefined,
        bloodGroup: d.bloodGroup || 'B+',
        photoUrl: d.photoBase64 || '',
        maritalStatus: d.maritalStatus || 'Married',
        occupation: d.occupation || 'Self-Employed / Other',
        governmentIdType: d.governmentIdType || 'Aadhaar Card',
        governmentIdNumber: d.governmentIdNumber || '',
        address: {
          villageArea: d.villageArea || '',
          postOffice: d.postOffice || '',
          policeStation: d.policeStation || '',
          district: d.district || 'Kolkata',
          state: d.state || 'West Bengal',
          pinCode: d.pinCode || '700001',
          fullAddress: fullAddressText
        },
        emergencyContact: {
          name: d.emergencyContactName || d.guardianName || 'Family Member',
          relationship: d.emergencyContactRelationship || d.relationshipWithGuardian || 'Guardian',
          mobile: d.emergencyContactMobile || d.mobile
        },
        medicalInfo: {
          bloodGroup: d.bloodGroup || 'B+',
          allergies: d.allergies || 'None reported',
          chronicConditions: conditionsList.join(', ') || 'None',
          importantNotes: `Offline Registration Token: ${submission.offlineToken}. Camp: ${d.campName || 'General Intake'}. Fee Paid: ₹${d.feeCollected} (${d.paymentMode.toUpperCase()}). ${d.generalNotes || ''}`,
          emergencyNotes: d.emergencyNotes || ''
        },
        referral: {
          source: d.referralSource || (d.campName ? 'Health Camp' : 'Direct Walk-in'),
          name: d.volunteerOrAgentName || d.campName || 'Offline Portal',
          details: `Offline registration captured on ${new Date(submission.createdAt).toLocaleDateString()}`
        },
        vitalsAtReg: d.vitals ? {
          bp: d.vitals.bpSystolic && d.vitals.bpDiastolic ? `${d.vitals.bpSystolic}/${d.vitals.bpDiastolic}` : undefined,
          pulse: d.vitals.pulseRate,
          rbs: d.vitals.bloodSugar ? `${d.vitals.bloodSugar} mg/dL (${d.vitals.sugarType || 'random'})` : undefined,
          spo2: d.vitals.spo2,
          weight: d.vitals.weightKg,
          height: d.vitals.heightCm,
          bmi: d.vitals.bmi ? parseFloat(d.vitals.bmi) : undefined
        } : undefined,
        membershipId: d.membershipId || 'mem_gold',
        initialDeposit: d.initialDeposit || 0,
        cardDesignPreset: d.cardDesignPreset || 'medical_pro_cyan',
        familyName: d.familyName || undefined,
        familyMembers: d.familyMembers && d.familyMembers.length > 0 ? d.familyMembers : undefined,
        issueHealthCard: true
      };

      const result = PatientService.createPatient(patientInput);

      // Save initial vitals if provided
      if (d.vitals && result.patient?.id) {
        try {
          VitalsService.addVitalsRecord(result.patient.id, {
            recordedAt: submission.createdAt,
            bpSystolic: d.vitals.bpSystolic || 120,
            bpDiastolic: d.vitals.bpDiastolic || 80,
            pulseRate: d.vitals.pulseRate || 72,
            bloodSugar: d.vitals.bloodSugar || 100,
            sugarType: d.vitals.sugarType || 'random',
            temperature: d.vitals.temperature || 98.4,
            spo2: d.vitals.spo2 || 99,
            weightKg: d.vitals.weightKg,
            heightCm: d.vitals.heightCm,
            bmi: d.vitals.bmi,
            notes: `Field baseline vitals at ${d.campName || 'Offline Registration'}`,
            recordedBy: d.volunteerOrAgentName || 'Offline Field Worker'
          });
        } catch (vitErr) {
          console.warn('[OfflineFormService] Vitals save warning:', vitErr);
        }
      }

      // Mark as Synced
      this.updateSubmission(id, {
        syncStatus: 'synced',
        syncedAt: new Date().toISOString(),
        syncedPatientId: result.patient.id,
        syncedCardNumber: result.card?.cardNumber,
        syncError: undefined
      });

      AuditService.log(
        'OFFLINE_FORM_SYNCED',
        'patient',
        `Synced offline submission ${submission.offlineToken} to live patient ${result.patient.fullName} (${result.patient.id}${result.card ? `, Card: ${result.card.cardNumber}` : ''}).`
      );

      return {
        success: true,
        patientId: result.patient.id,
        cardNumber: result.card?.cardNumber
      };
    } catch (err: any) {
      console.error('[OfflineFormService] Sync failed for submission:', id, err);
      const errMsg = err?.message || 'Failed to sync offline record into system';
      this.updateSubmission(id, {
        syncStatus: 'failed',
        syncError: errMsg
      });
      return { success: false, error: errMsg };
    }
  }

  /** Sync all pending offline submissions */
  public static async syncAllPending(): Promise<{ total: number; succeeded: number; failed: number }> {
    const pending = this.getPendingSubmissions();
    let succeeded = 0;
    let failed = 0;

    for (const sub of pending) {
      const res = await this.syncSubmissionToLive(sub.id);
      if (res.success) succeeded++;
      else failed++;
    }

    return {
      total: pending.length,
      succeeded,
      failed
    };
  }

  // --- Draft Auto-Saving ---

  public static saveDraft(draftData: Partial<OfflinePatientData>): void {
    try {
      localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify({
        data: draftData,
        savedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('[OfflineFormService] Could not save draft:', e);
    }
  }

  public static getDraft(): { data: Partial<OfflinePatientData>; savedAt: string } | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DRAFT);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  public static clearDraft(): void {
    localStorage.removeItem(STORAGE_KEY_DRAFT);
  }

  // --- Export & Backup ---

  public static exportJSON(): void {
    const submissions = this.getAllSubmissions();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(submissions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `labmedix_offline_forms_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  public static exportCSV(): void {
    const submissions = this.getAllSubmissions();
    if (submissions.length === 0) return;

    const headers = [
      'Offline Token',
      'Created Date',
      'Sync Status',
      'Patient ID (Synced)',
      'Card Number',
      'Full Name',
      'Mobile',
      'Age',
      'Gender',
      'Blood Group',
      'Govt ID Type',
      'Govt ID No',
      'PIN Code',
      'District',
      'Camp Name',
      'Payment Mode',
      'Fee Collected'
    ];

    const rows = submissions.map(s => [
      s.offlineToken,
      new Date(s.createdAt).toLocaleString(),
      s.syncStatus,
      s.syncedPatientId || '-',
      s.syncedCardNumber || '-',
      `"${s.data.fullName.replace(/"/g, '""')}"`,
      s.data.mobile,
      s.data.age,
      s.data.gender,
      s.data.bloodGroup,
      s.data.governmentIdType,
      s.data.governmentIdNumber,
      s.data.pinCode,
      s.data.district,
      `"${(s.data.campName || '').replace(/"/g, '""')}"`,
      s.data.paymentMode,
      s.data.feeCollected
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `labmedix_offline_forms_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // --- Clinical Triage & Risk Stratification ---
  public static calculateTriage(
    vitals?: OfflinePatientData['vitals'],
    conditions?: { isDiabetic?: boolean; isHypertensive?: boolean; hasHeartDisease?: boolean; hasAsthma?: boolean }
  ): { level: 'normal' | 'moderate' | 'high_risk' | 'emergency'; reasons: string[]; color: string; label: string; action: string } {
    const reasons: string[] = [];
    let isEmergency = false;
    let isHighRisk = false;
    let isModerate = false;

    if (vitals) {
      const { bpSystolic = 0, bpDiastolic = 0, spo2 = 0, bloodSugar = 0, temperature = 0, pulseRate = 0 } = vitals;

      // 1. Blood Pressure Evaluation (AHA / ESH criteria)
      if (bpSystolic >= 180 || bpDiastolic >= 120) {
        isEmergency = true;
        reasons.push(`Hypertensive Crisis Alert (BP ${bpSystolic}/${bpDiastolic} mmHg)`);
      } else if (bpSystolic >= 140 || bpDiastolic >= 90) {
        isHighRisk = true;
        reasons.push(`Stage 2 Hypertension (BP ${bpSystolic}/${bpDiastolic} mmHg)`);
      } else if (bpSystolic >= 130 || bpDiastolic >= 80) {
        isModerate = true;
        reasons.push(`Stage 1 Pre-Hypertension (BP ${bpSystolic}/${bpDiastolic} mmHg)`);
      }

      // 2. Oxygen Saturation (SpO2)
      if (spo2 > 0 && spo2 < 90) {
        isEmergency = true;
        reasons.push(`Severe Hypoxia Alert (SpO2 ${spo2}%)`);
      } else if (spo2 >= 90 && spo2 < 94) {
        isHighRisk = true;
        reasons.push(`Moderate Hypoxia (SpO2 ${spo2}%)`);
      }

      // 3. Blood Glucose
      if (bloodSugar >= 350) {
        isEmergency = true;
        reasons.push(`Critical Hyperglycemia Alert (${bloodSugar} mg/dL)`);
      } else if (bloodSugar <= 50 && bloodSugar > 0) {
        isEmergency = true;
        reasons.push(`Hypoglycemia Emergency (${bloodSugar} mg/dL)`);
      } else if (bloodSugar >= 200) {
        isHighRisk = true;
        reasons.push(`High Random Blood Sugar (${bloodSugar} mg/dL)`);
      } else if (bloodSugar > 140) {
        isModerate = true;
        reasons.push(`Elevated Blood Sugar (${bloodSugar} mg/dL)`);
      }

      // 4. Body Temperature
      if (temperature >= 103) {
        isHighRisk = true;
        reasons.push(`High Grade Fever (${temperature}°F)`);
      } else if (temperature >= 100.4) {
        isModerate = true;
        reasons.push(`Fever (${temperature}°F)`);
      }

      // 5. Pulse Rate
      if (pulseRate > 130 || (pulseRate > 0 && pulseRate < 45)) {
        isHighRisk = true;
        reasons.push(`Abnormal Heart Rate (${pulseRate} BPM)`);
      }
    }

    if (conditions) {
      if (conditions.hasHeartDisease) {
        isModerate = true;
        reasons.push('Known Cardiac History');
      }
      if (conditions.isDiabetic && conditions.isHypertensive) {
        isModerate = true;
        reasons.push('Co-morbid Diabetes & Hypertension');
      }
    }

    if (isEmergency) {
      return {
        level: 'emergency',
        reasons,
        color: 'rose',
        label: 'EMERGENCY / CRITICAL TRIAGE',
        action: '🚨 Immediate Medical Officer evaluation & emergency stabilization required.'
      };
    }

    if (isHighRisk) {
      return {
        level: 'high_risk',
        reasons,
        color: 'amber',
        label: 'HIGH RISK / PRIORITY',
        action: '⚠️ Fast-track to Medical Officer & order confirmatory diagnostic panel.'
      };
    }

    if (isModerate) {
      return {
        level: 'moderate',
        reasons,
        color: 'yellow',
        label: 'MODERATE RISK',
        action: 'ℹ️ Routine physician consultation and lifestyle / dietary counseling advised.'
      };
    }

    return {
      level: 'normal',
      reasons: reasons.length > 0 ? reasons : ['Vitals within physiological normal range'],
      color: 'emerald',
      label: 'OPTIMAL / NORMAL',
      action: '✅ Baseline normal. Routine preventive follow-up & wellness health card issued.'
    };
  }

  // --- Duplicate Detection across Offline Queue & Live Local Records ---
  public static findDuplicates(mobile: string, govtIdNumber?: string): {
    found: boolean;
    inOfflineQueue: boolean;
    inLocalDb: boolean;
    matchDetails: string[];
    matchedName?: string;
  } {
    const cleanMobile = (mobile || '').trim();
    const cleanGovtId = (govtIdNumber || '').trim().toLowerCase();
    const matchDetails: string[] = [];
    let matchedName: string | undefined;
    let inOfflineQueue = false;
    let inLocalDb = false;

    if (!cleanMobile && !cleanGovtId) {
      return { found: false, inOfflineQueue: false, inLocalDb: false, matchDetails: [] };
    }

    // Check Offline Queue
    const submissions = this.getAllSubmissions();
    for (const sub of submissions) {
      const subMobile = (sub.data.mobile || '').trim();
      const subGovtId = (sub.data.governmentIdNumber || '').trim().toLowerCase();

      if (cleanMobile && subMobile === cleanMobile) {
        inOfflineQueue = true;
        matchedName = sub.data.fullName;
        matchDetails.push(`Matches offline queue record #${sub.offlineToken} (${sub.data.fullName}) by Mobile ${cleanMobile}`);
      }
      if (cleanGovtId && subGovtId && subGovtId === cleanGovtId) {
        inOfflineQueue = true;
        matchedName = sub.data.fullName;
        matchDetails.push(`Matches offline queue record #${sub.offlineToken} (${sub.data.fullName}) by Govt ID ${govtIdNumber}`);
      }
    }

    // Check Local Patients DB
    const patients = StorageService.getPatients();
    for (const p of patients) {
      const pMobile = (p.mobile || '').trim();
      const pGovtId = (p.governmentIdNumber || '').trim().toLowerCase();

      if (cleanMobile && pMobile === cleanMobile) {
        inLocalDb = true;
        matchedName = matchedName || p.fullName;
        matchDetails.push(`Matches existing registered Patient #${p.id} (${p.fullName}) by Mobile ${cleanMobile}`);
      }
      if (cleanGovtId && pGovtId && pGovtId === cleanGovtId) {
        inLocalDb = true;
        matchedName = matchedName || p.fullName;
        matchDetails.push(`Matches existing registered Patient #${p.id} (${p.fullName}) by Govt ID ${govtIdNumber}`);
      }
    }

    return {
      found: inOfflineQueue || inLocalDb,
      inOfflineQueue,
      inLocalDb,
      matchDetails,
      matchedName
    };
  }

  // --- Batch JSON Importer ---
  public static batchImportSubmissions(jsonString: string): { importedCount: number; skippedCount: number; errors: string[] } {
    const errors: string[] = [];
    let importedCount = 0;
    let skippedCount = 0;

    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        return { importedCount: 0, skippedCount: 0, errors: ['Invalid file format. Expected a JSON array of submissions.'] };
      }

      const existing = this.getAllSubmissions();
      const existingTokens = new Set(existing.map(s => s.offlineToken));
      const existingIds = new Set(existing.map(s => s.id));

      const toAdd: OfflineSubmission[] = [];

      for (const item of parsed) {
        if (!item.data || !item.data.fullName) {
          skippedCount++;
          continue;
        }

        const token = item.offlineToken || this.generateOfflineToken();
        const id = item.id || `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        if (existingTokens.has(token) || existingIds.has(id)) {
          skippedCount++;
          continue;
        }

        const newSub: OfflineSubmission = {
          id,
          offlineToken: token,
          createdAt: item.createdAt || new Date().toISOString(),
          data: item.data,
          syncStatus: item.syncStatus === 'synced' ? 'synced' : 'pending',
          syncedPatientId: item.syncedPatientId,
          syncedCardNumber: item.syncedCardNumber,
          deviceFingerprint: item.deviceFingerprint || 'imported-batch',
          capturedBy: item.capturedBy || 'Imported File'
        };

        toAdd.push(newSub);
        existingTokens.add(token);
        existingIds.add(id);
        importedCount++;
      }

      if (toAdd.length > 0) {
        const combined = [...toAdd, ...existing];
        localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(combined));
        window.dispatchEvent(new CustomEvent('labmedix_offline_queue_changed'));
      }

      return { importedCount, skippedCount, errors };
    } catch (e: any) {
      return { importedCount: 0, skippedCount: 0, errors: [e?.message || 'Failed to parse JSON file'] };
    }
  }

  // --- Clear Queue ---
  public static clearQueue(onlySynced = false): void {
    if (onlySynced) {
      const submissions = this.getAllSubmissions().filter(s => s.syncStatus !== 'synced');
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions));
    } else {
      localStorage.removeItem(STORAGE_KEY_SUBMISSIONS);
    }
    window.dispatchEvent(new CustomEvent('labmedix_offline_queue_changed'));
  }
}
