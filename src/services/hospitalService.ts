import {
  EmergencyEncounter,
  EmergencyTriagePriority,
  EmergencyStatus,
  IpdAdmission,
  IpdDoctorRound,
  AdmissionStatus,
  AdmissionType,
  HospitalWard,
  HospitalBed,
  BedStatus,
  NursePatientTask,
  MedicationAdminRecord,
  IntakeOutputRecord,
  ShiftHandoverNote,
  SurgeryBooking,
  SurgeryStatus,
  SurgeryCategory,
  AnaesthesiaRecord,
  RadiologyInvestigation,
  RadiologyModality,
  BloodUnitRecord,
  BloodGroup,
  BloodComponentType,
  BloodIssueRequest,
  BloodDonor,
  PatientBill,
  User
} from '../types';
import { StorageService, STORAGE_KEYS } from './storage';
import { ApiSyncService } from './apiSyncService';
import { AuditService } from './auditService';
import { BillService } from './billService';
import { generateUuid } from '../utils/idGenerator';

// Default hospital wards for realistic out-of-the-box operation
const DEFAULT_WARDS: HospitalWard[] = [
  {
    id: 'ward_icu_01',
    name: 'Intensive Care Unit (ICU)',
    code: 'ICU-FL2',
    floor: 'Floor 2 (Critical Care Wing)',
    type: 'icu',
    totalBeds: 6,
    dailyRate: 4500,
    supervisorName: 'Dr. Debabrata Roy (Critical Care Lead)'
  },
  {
    id: 'ward_ccu_01',
    name: 'Coronary Care Unit (CCU)',
    code: 'CCU-FL2',
    floor: 'Floor 2 (Cardiology Wing)',
    type: 'ccu',
    totalBeds: 4,
    dailyRate: 4200,
    supervisorName: 'Dr. Sanjoy Mukherjee (Cardiologist)'
  },
  {
    id: 'ward_emergency_01',
    name: 'Emergency Observation Unit',
    code: 'EMG-OBS',
    floor: 'Ground Floor (Trauma Center)',
    type: 'emergency',
    totalBeds: 6,
    dailyRate: 1800,
    supervisorName: 'Dr. Ananya Sen (Emergency Registrar)'
  },
  {
    id: 'ward_pvt_01',
    name: 'Executive Deluxe Suite',
    code: 'PVT-DELUXE',
    floor: 'Floor 3 (VIP Wing)',
    type: 'private',
    totalBeds: 6,
    dailyRate: 3500,
    supervisorName: 'Sister Reena Thomas (Ward In-Charge)'
  },
  {
    id: 'ward_gen_male',
    name: 'General Ward (Male)',
    code: 'GEN-MALE',
    floor: 'Floor 1 (Medical Wing)',
    type: 'general',
    totalBeds: 8,
    dailyRate: 1200,
    supervisorName: 'Staff Nurse S. Banerjee'
  },
  {
    id: 'ward_gen_female',
    name: 'General Ward (Female)',
    code: 'GEN-FEMALE',
    floor: 'Floor 1 (Medical Wing)',
    type: 'general',
    totalBeds: 8,
    dailyRate: 1200,
    supervisorName: 'Staff Nurse P. Sengupta'
  }
];

// Default initial beds distributed across wards
const DEFAULT_BEDS: HospitalBed[] = [
  // ICU Beds
  { id: 'bed_icu_101', bedNumber: 'ICU-01', wardId: 'ward_icu_01', wardName: 'Intensive Care Unit (ICU)', status: 'available', type: 'ICU Motorized Bed', dailyRate: 4500, oxygenSupported: true, ventilatorSupported: true },
  { id: 'bed_icu_102', bedNumber: 'ICU-02', wardId: 'ward_icu_01', wardName: 'Intensive Care Unit (ICU)', status: 'available', type: 'ICU Motorized Bed', dailyRate: 4500, oxygenSupported: true, ventilatorSupported: true },
  { id: 'bed_icu_103', bedNumber: 'ICU-03', wardId: 'ward_icu_01', wardName: 'Intensive Care Unit (ICU)', status: 'available', type: 'ICU Motorized Bed', dailyRate: 4500, oxygenSupported: true, ventilatorSupported: true },
  { id: 'bed_icu_104', bedNumber: 'ICU-04', wardId: 'ward_icu_01', wardName: 'Intensive Care Unit (ICU)', status: 'cleaning', type: 'ICU Motorized Bed', dailyRate: 4500, oxygenSupported: true, ventilatorSupported: true },
  { id: 'bed_icu_105', bedNumber: 'ICU-05', wardId: 'ward_icu_01', wardName: 'Intensive Care Unit (ICU)', status: 'available', type: 'ICU Motorized Bed', dailyRate: 4500, oxygenSupported: true, ventilatorSupported: true },
  { id: 'bed_icu_106', bedNumber: 'ICU-06', wardId: 'ward_icu_01', wardName: 'Intensive Care Unit (ICU)', status: 'maintenance', type: 'ICU Motorized Bed', dailyRate: 4500, oxygenSupported: true, ventilatorSupported: true },

  // CCU Beds
  { id: 'bed_ccu_201', bedNumber: 'CCU-01', wardId: 'ward_ccu_01', wardName: 'Coronary Care Unit (CCU)', status: 'available', type: 'Cardiac Monitor Bed', dailyRate: 4200, oxygenSupported: true, ventilatorSupported: true },
  { id: 'bed_ccu_202', bedNumber: 'CCU-02', wardId: 'ward_ccu_01', wardName: 'Coronary Care Unit (CCU)', status: 'available', type: 'Cardiac Monitor Bed', dailyRate: 4200, oxygenSupported: true, ventilatorSupported: true },
  { id: 'bed_ccu_203', bedNumber: 'CCU-03', wardId: 'ward_ccu_01', wardName: 'Coronary Care Unit (CCU)', status: 'available', type: 'Cardiac Monitor Bed', dailyRate: 4200, oxygenSupported: true, ventilatorSupported: true },
  { id: 'bed_ccu_204', bedNumber: 'CCU-04', wardId: 'ward_ccu_01', wardName: 'Coronary Care Unit (CCU)', status: 'available', type: 'Cardiac Monitor Bed', dailyRate: 4200, oxygenSupported: true, ventilatorSupported: true },

  // Emergency Obs Beds
  { id: 'bed_emg_01', bedNumber: 'ER-OBS-01', wardId: 'ward_emergency_01', wardName: 'Emergency Observation Unit', status: 'available', type: 'Crash Cart Bed', dailyRate: 1800, oxygenSupported: true, ventilatorSupported: true },
  { id: 'bed_emg_02', bedNumber: 'ER-OBS-02', wardId: 'ward_emergency_01', wardName: 'Emergency Observation Unit', status: 'available', type: 'Crash Cart Bed', dailyRate: 1800, oxygenSupported: true, ventilatorSupported: true },
  { id: 'bed_emg_03', bedNumber: 'ER-OBS-03', wardId: 'ward_emergency_01', wardName: 'Emergency Observation Unit', status: 'available', type: 'Crash Cart Bed', dailyRate: 1800, oxygenSupported: true, ventilatorSupported: false },
  { id: 'bed_emg_04', bedNumber: 'ER-OBS-04', wardId: 'ward_emergency_01', wardName: 'Emergency Observation Unit', status: 'available', type: 'Crash Cart Bed', dailyRate: 1800, oxygenSupported: true, ventilatorSupported: false },

  // Private Deluxe
  { id: 'bed_pvt_301', bedNumber: 'DELUXE-301', wardId: 'ward_pvt_01', wardName: 'Executive Deluxe Suite', status: 'available', type: 'Electric Remote Bed', dailyRate: 3500, oxygenSupported: true, ventilatorSupported: false },
  { id: 'bed_pvt_302', bedNumber: 'DELUXE-302', wardId: 'ward_pvt_01', wardName: 'Executive Deluxe Suite', status: 'available', type: 'Electric Remote Bed', dailyRate: 3500, oxygenSupported: true, ventilatorSupported: false },
  { id: 'bed_pvt_303', bedNumber: 'DELUXE-303', wardId: 'ward_pvt_01', wardName: 'Executive Deluxe Suite', status: 'available', type: 'Electric Remote Bed', dailyRate: 3500, oxygenSupported: true, ventilatorSupported: false },
  { id: 'bed_pvt_304', bedNumber: 'DELUXE-304', wardId: 'ward_pvt_01', wardName: 'Executive Deluxe Suite', status: 'available', type: 'Electric Remote Bed', dailyRate: 3500, oxygenSupported: true, ventilatorSupported: false },

  // General Male
  { id: 'bed_gm_101', bedNumber: 'GM-01', wardId: 'ward_gen_male', wardName: 'General Ward (Male)', status: 'available', type: 'Standard Hospital Bed', dailyRate: 1200, oxygenSupported: true, ventilatorSupported: false },
  { id: 'bed_gm_102', bedNumber: 'GM-02', wardId: 'ward_gen_male', wardName: 'General Ward (Male)', status: 'available', type: 'Standard Hospital Bed', dailyRate: 1200, oxygenSupported: true, ventilatorSupported: false },
  { id: 'bed_gm_103', bedNumber: 'GM-03', wardId: 'ward_gen_male', wardName: 'General Ward (Male)', status: 'available', type: 'Standard Hospital Bed', dailyRate: 1200, oxygenSupported: true, ventilatorSupported: false },
  { id: 'bed_gm_104', bedNumber: 'GM-04', wardId: 'ward_gen_male', wardName: 'General Ward (Male)', status: 'available', type: 'Standard Hospital Bed', dailyRate: 1200, oxygenSupported: false, ventilatorSupported: false },

  // General Female
  { id: 'bed_gf_201', bedNumber: 'GF-01', wardId: 'ward_gen_female', wardName: 'General Ward (Female)', status: 'available', type: 'Standard Hospital Bed', dailyRate: 1200, oxygenSupported: true, ventilatorSupported: false },
  { id: 'bed_gf_202', bedNumber: 'GF-02', wardId: 'ward_gen_female', wardName: 'General Ward (Female)', status: 'available', type: 'Standard Hospital Bed', dailyRate: 1200, oxygenSupported: true, ventilatorSupported: false },
  { id: 'bed_gf_203', bedNumber: 'GF-03', wardId: 'ward_gen_female', wardName: 'General Ward (Female)', status: 'available', type: 'Standard Hospital Bed', dailyRate: 1200, oxygenSupported: true, ventilatorSupported: false },
  { id: 'bed_gf_204', bedNumber: 'GF-04', wardId: 'ward_gen_female', wardName: 'General Ward (Female)', status: 'available', type: 'Standard Hospital Bed', dailyRate: 1200, oxygenSupported: false, ventilatorSupported: false }
];

// Initial Blood Bank Stock for essential life support
const DEFAULT_BLOOD_UNITS: BloodUnitRecord[] = [
  { id: 'unit_o_pos_1', unitBarcode: 'BB-OP-8821', bloodGroup: 'O+', componentType: 'prbc', volumeMl: 350, collectionDate: '2026-09-01', expiryDate: '2026-10-12', storageLocation: 'Chamber 1 - Rack A1', status: 'in_stock', hivTest: 'negative', hcvTest: 'negative', hbsAgTest: 'negative', vdrlTest: 'negative', malariaTest: 'negative' },
  { id: 'unit_o_pos_2', unitBarcode: 'BB-OP-8822', bloodGroup: 'O+', componentType: 'prbc', volumeMl: 350, collectionDate: '2026-09-03', expiryDate: '2026-10-14', storageLocation: 'Chamber 1 - Rack A2', status: 'in_stock', hivTest: 'negative', hcvTest: 'negative', hbsAgTest: 'negative', vdrlTest: 'negative', malariaTest: 'negative' },
  { id: 'unit_o_neg_1', unitBarcode: 'BB-ON-9901', bloodGroup: 'O-', componentType: 'prbc', volumeMl: 350, collectionDate: '2026-09-05', expiryDate: '2026-10-16', storageLocation: 'Chamber 1 - Rack B1 (Emergency Universal)', status: 'in_stock', hivTest: 'negative', hcvTest: 'negative', hbsAgTest: 'negative', vdrlTest: 'negative', malariaTest: 'negative' },
  { id: 'unit_a_pos_1', unitBarcode: 'BB-AP-4101', bloodGroup: 'A+', componentType: 'prbc', volumeMl: 350, collectionDate: '2026-09-02', expiryDate: '2026-10-13', storageLocation: 'Chamber 2 - Rack A1', status: 'in_stock', hivTest: 'negative', hcvTest: 'negative', hbsAgTest: 'negative', vdrlTest: 'negative', malariaTest: 'negative' },
  { id: 'unit_b_pos_1', unitBarcode: 'BB-BP-5201', bloodGroup: 'B+', componentType: 'prbc', volumeMl: 350, collectionDate: '2026-09-04', expiryDate: '2026-10-15', storageLocation: 'Chamber 2 - Rack B1', status: 'in_stock', hivTest: 'negative', hcvTest: 'negative', hbsAgTest: 'negative', vdrlTest: 'negative', malariaTest: 'negative' },
  { id: 'unit_ab_pos_1', unitBarcode: 'BB-ABP-6301', bloodGroup: 'AB+', componentType: 'ffp', volumeMl: 250, collectionDate: '2026-08-28', expiryDate: '2027-08-28', storageLocation: 'Deep Freezer -25C Rack C1', status: 'in_stock', hivTest: 'negative', hcvTest: 'negative', hbsAgTest: 'negative', vdrlTest: 'negative', malariaTest: 'negative' },
  { id: 'unit_plt_1', unitBarcode: 'BB-PLT-7101', bloodGroup: 'O+', componentType: 'platelet_concentrate', volumeMl: 50, collectionDate: '2026-09-10', expiryDate: '2026-09-15', storageLocation: 'Platelet Agitator 22C', status: 'in_stock', hivTest: 'negative', hcvTest: 'negative', hbsAgTest: 'negative', vdrlTest: 'negative', malariaTest: 'negative' }
];

export class HospitalService {
  // Helper to load/save in StorageService
  private static loadList<T>(key: string, fallback: T[] = []): T[] {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(`Error reading ${key}:`, e);
    }
    return fallback;
  }

  private static saveList<T>(key: string, list: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key } }));
    } catch (e) {
      console.error(`Error saving ${key}:`, e);
    }
  }

  // ============================================================================
  // 1. EMERGENCY & CASUALTY DEPARTMENT
  // ============================================================================

  public static getEmergencyEncounters(): EmergencyEncounter[] {
    return this.loadList<EmergencyEncounter>(STORAGE_KEYS.EMERGENCY_ENCOUNTERS, []);
  }

  public static createEmergencyEncounter(input: {
    patientId: string;
    uhid?: string;
    patientName: string;
    age: number;
    gender: string;
    contactNumber: string;
    arrivalMode: 'ambulance' | 'walk_in' | 'wheelchair' | 'stretcher';
    chiefComplaint: string;
    priority: EmergencyTriagePriority;
    vitals: EmergencyEncounter['vitals'];
    attendingDoctorId?: string;
    attendingDoctorName?: string;
    triageNotes: string;
    currentUser?: User | null;
  }): EmergencyEncounter {
    const encounters = this.getEmergencyEncounters();
    const count = encounters.length + 1;
    const year = new Date().getFullYear();
    const encounterNumber = `ER-${year}-${count.toString().padStart(5, '0')}`;

    const newEncounter: EmergencyEncounter = {
      id: `er_${generateUuid().slice(0, 8)}`,
      encounterNumber,
      patientId: input.patientId,
      uhid: input.uhid,
      patientName: input.patientName,
      age: input.age,
      gender: input.gender,
      contactNumber: input.contactNumber,
      arrivalMode: input.arrivalMode,
      chiefComplaint: input.chiefComplaint,
      priority: input.priority,
      vitals: input.vitals,
      attendingDoctorId: input.attendingDoctorId,
      attendingDoctorName: input.attendingDoctorName,
      triageNotes: input.triageNotes,
      status: 'triaged',
      totalEstimatedCharges: input.priority === 'red' ? 2500 : input.priority === 'yellow' ? 1800 : 1200,
      arrivedAt: new Date().toISOString()
    };

    encounters.unshift(newEncounter);
    this.saveList(STORAGE_KEYS.EMERGENCY_ENCOUNTERS, encounters);
    ApiSyncService.saveDocument('emergency_encounters', newEncounter.id, newEncounter).catch(() => {});

    AuditService.log(
      'EMERGENCY_ENCOUNTER_TRIAGED',
      'emergency',
      `Triage ${newEncounter.encounterNumber} for ${newEncounter.patientName} (Priority: ${newEncounter.priority.toUpperCase()})`,
      newEncounter.id,
      { priority: newEncounter.priority, arrivalMode: newEncounter.arrivalMode },
      newEncounter.priority === 'red' ? 'critical' : 'warning'
    );

    return newEncounter;
  }

  public static updateEmergencyEncounter(id: string, updates: Partial<EmergencyEncounter>): EmergencyEncounter {
    const list = this.getEmergencyEncounters();
    const index = list.findIndex(e => e.id === id);
    if (index === -1) throw new Error(`Emergency encounter not found: ${id}`);

    const updated = { ...list[index], ...updates };
    list[index] = updated;
    this.saveList(STORAGE_KEYS.EMERGENCY_ENCOUNTERS, list);
    ApiSyncService.saveDocument('emergency_encounters', updated.id, updated).catch(() => {});
    return updated;
  }

  public static addEmergencyMedication(id: string, medication: {
    medicineName: string;
    dose: string;
    route: string;
  }): EmergencyEncounter {
    const list = this.getEmergencyEncounters();
    const encounter = list.find(e => e.id === id);
    if (!encounter) throw new Error('Encounter not found');

    const meds = encounter.medicationsAdministered || [];
    meds.push({
      ...medication,
      administeredAt: new Date().toISOString()
    });

    return this.updateEmergencyEncounter(id, {
      medicationsAdministered: meds,
      status: 'under_treatment'
    });
  }

  public static convertEmergencyToIpd(emergencyId: string, params: {
    wardId: string;
    bedNumber: string;
    attendingDoctorId: string;
    attendingDoctorName: string;
    department: string;
    admittingDiagnosis: string;
    currentUser?: User | null;
  }): { emergency: EmergencyEncounter; admission: IpdAdmission } {
    const emergency = this.getEmergencyEncounters().find(e => e.id === emergencyId);
    if (!emergency) throw new Error('Emergency encounter not found');

    const ward = this.getWards().find(w => w.id === params.wardId);
    if (!ward) throw new Error('Ward not found');

    const admission = this.createAdmission({
      patientId: emergency.patientId,
      patientName: emergency.patientName,
      uhid: emergency.uhid || emergency.patientId,
      age: emergency.age,
      gender: emergency.gender,
      contactNumber: emergency.contactNumber,
      admissionType: 'emergency',
      wardId: ward.id,
      wardName: ward.name,
      bedNumber: params.bedNumber,
      attendingDoctorId: params.attendingDoctorId,
      attendingDoctorName: params.attendingDoctorName,
      department: params.department,
      admittingDiagnosis: params.admittingDiagnosis || emergency.chiefComplaint,
      dailyRoomRate: ward.dailyRate,
      advancePaid: 0,
      totalCharges: emergency.totalEstimatedCharges + ward.dailyRate,
      currentUser: params.currentUser
    });

    const updatedEmergency = this.updateEmergencyEncounter(emergencyId, {
      status: 'admitted_ipd',
      convertedToIpdAdmissionId: admission.id,
      dischargedAt: new Date().toISOString()
    });

    return { emergency: updatedEmergency, admission };
  }

  public static billEmergencyEncounter(encounterId: string, currentUser?: User | null): PatientBill {
    const encounter = this.getEmergencyEncounters().find(e => e.id === encounterId);
    if (!encounter) throw new Error('Encounter not found');
    if (encounter.isBilled && encounter.billId) {
      const existing = StorageService.getBills().find(b => b.id === encounter.billId);
      if (existing) return existing;
    }

    const bill = BillService.createHospitalBill({
      patientId: encounter.patientId,
      patientName: encounter.patientName,
      patientMobile: encounter.contactNumber,
      billCategory: 'emergency',
      membershipName: 'Emergency & Trauma Care',
      paidAmount: encounter.totalEstimatedCharges,
      paymentMethod: 'cash',
      notes: `Emergency casualty charges for ${encounter.encounterNumber}. Priority: ${encounter.priority.toUpperCase()}`,
      items: [
        { description: `ER Triage & Resuscitation Fee (${encounter.encounterNumber})`, quantity: 1, unitPrice: encounter.totalEstimatedCharges, total: encounter.totalEstimatedCharges }
      ],
      currentUser
    });

    this.updateEmergencyEncounter(encounterId, {
      isBilled: true,
      billId: bill.id
    });

    return bill;
  }

  // ============================================================================
  // 2. INPATIENT DEPARTMENT (IPD) & ADMISSIONS
  // ============================================================================

  public static getAdmissions(): IpdAdmission[] {
    return this.loadList<IpdAdmission>(STORAGE_KEYS.IPD_ADMISSIONS, []);
  }

  public static createAdmission(input: {
    patientId: string;
    patientName: string;
    uhid: string;
    age: number;
    gender: string;
    bloodGroup?: string;
    contactNumber: string;
    admissionType: AdmissionType;
    wardId: string;
    wardName: string;
    bedNumber: string;
    attendingDoctorId: string;
    attendingDoctorName: string;
    department: string;
    admittingDiagnosis: string;
    dailyRoomRate: number;
    advancePaid?: number;
    totalCharges?: number;
    currentUser?: User | null;
  }): IpdAdmission {
    const admissions = this.getAdmissions();
    const count = admissions.length + 1;
    const year = new Date().getFullYear();
    const admissionNumber = `IPD-${year}-${count.toString().padStart(5, '0')}`;

    const newAdmission: IpdAdmission = {
      id: `ipd_${generateUuid().slice(0, 8)}`,
      admissionNumber,
      patientId: input.patientId,
      patientName: input.patientName,
      uhid: input.uhid,
      age: input.age,
      gender: input.gender,
      bloodGroup: input.bloodGroup,
      contactNumber: input.contactNumber,
      admissionDate: new Date().toISOString(),
      admissionType: input.admissionType,
      wardId: input.wardId,
      wardName: input.wardName,
      bedNumber: input.bedNumber,
      attendingDoctorId: input.attendingDoctorId,
      attendingDoctorName: input.attendingDoctorName,
      department: input.department,
      admittingDiagnosis: input.admittingDiagnosis,
      status: 'admitted',
      rounds: [],
      dailyRoomRate: input.dailyRoomRate,
      advancePaid: input.advancePaid || 0,
      totalCharges: (input.totalCharges || 0) + input.dailyRoomRate
    };

    admissions.unshift(newAdmission);
    this.saveList(STORAGE_KEYS.IPD_ADMISSIONS, admissions);
    ApiSyncService.saveDocument('ipd_admissions', newAdmission.id, newAdmission).catch(() => {});

    // Update bed status to occupied
    this.assignBedToPatient(input.wardId, input.bedNumber, newAdmission.id, newAdmission.patientId, newAdmission.patientName);

    AuditService.log(
      'IPD_PATIENT_ADMITTED',
      'ipd',
      `Admitted ${newAdmission.patientName} to ${newAdmission.wardName} (Bed: ${newAdmission.bedNumber})`,
      newAdmission.id,
      { admissionNumber: newAdmission.admissionNumber, ward: newAdmission.wardName, bed: newAdmission.bedNumber },
      'info'
    );

    return newAdmission;
  }

  public static addDoctorRound(admissionId: string, round: {
    doctorId: string;
    doctorName: string;
    clinicalNotes: string;
    treatmentAdvice: string;
    vitalsRecorded?: Record<string, any>;
  }): IpdAdmission {
    const list = this.getAdmissions();
    const index = list.findIndex(a => a.id === admissionId);
    if (index === -1) throw new Error('Admission not found');

    const rounds = list[index].rounds || [];
    const newRound: IpdDoctorRound = {
      id: `rnd_${generateUuid().slice(0, 8)}`,
      admissionId,
      doctorId: round.doctorId,
      doctorName: round.doctorName,
      timestamp: new Date().toISOString(),
      clinicalNotes: round.clinicalNotes,
      treatmentAdvice: round.treatmentAdvice,
      vitalsRecorded: round.vitalsRecorded
    };
    rounds.unshift(newRound);

    list[index].rounds = rounds;
    this.saveList(STORAGE_KEYS.IPD_ADMISSIONS, list);
    ApiSyncService.saveDocument('ipd_admissions', list[index].id, list[index]).catch(() => {});
    return list[index];
  }

  public static dischargePatient(admissionId: string, summary: {
    diagnosis: string;
    hospitalCourse: string;
    conditionAtDischarge: string;
    medicationsOnDischarge: string;
    followUpAdvice: string;
    signedByDoctor: string;
  }): IpdAdmission {
    const list = this.getAdmissions();
    const index = list.findIndex(a => a.id === admissionId);
    if (index === -1) throw new Error('Admission not found');

    const admission = list[index];
    admission.status = 'discharged';
    admission.actualDischargeDate = new Date().toISOString();
    admission.dischargeSummary = summary;

    list[index] = admission;
    this.saveList(STORAGE_KEYS.IPD_ADMISSIONS, list);
    ApiSyncService.saveDocument('ipd_admissions', admission.id, admission).catch(() => {});

    // Free the bed and mark it for cleaning
    this.freeBed(admission.wardId, admission.bedNumber);

    AuditService.log(
      'IPD_PATIENT_DISCHARGED',
      'ipd',
      `Discharged ${admission.patientName} from ${admission.wardName} (${admission.admissionNumber})`,
      admission.id,
      undefined,
      'info'
    );

    return admission;
  }

  public static generateFinalIpdBill(admissionId: string, currentUser?: User | null): PatientBill {
    const admission = this.getAdmissions().find(a => a.id === admissionId);
    if (!admission) throw new Error('Admission record not found');

    if (admission.isFinalBilled && admission.finalBillId) {
      const existing = StorageService.getBills().find(b => b.id === admission.finalBillId);
      if (existing) return existing;
    }

    // Calculate room days
    const admTime = new Date(admission.admissionDate).getTime();
    const disTime = admission.actualDischargeDate ? new Date(admission.actualDischargeDate).getTime() : Date.now();
    const days = Math.max(1, Math.ceil((disTime - admTime) / (1000 * 60 * 60 * 24)));
    const roomCharges = days * admission.dailyRoomRate;
    const nursingCharges = days * 500;
    const totalPayable = roomCharges + nursingCharges;

    const bill = BillService.createHospitalBill({
      patientId: admission.patientId,
      patientName: admission.patientName,
      patientMobile: admission.contactNumber,
      billCategory: 'ipd',
      membershipName: `IPD Inpatient Stay (${admission.wardName})`,
      paidAmount: totalPayable,
      paymentMethod: 'cash',
      notes: `Final settlement for Inpatient Admission ${admission.admissionNumber}. Ward: ${admission.wardName}, Bed: ${admission.bedNumber}`,
      items: [
        { description: `Ward Stay: ${admission.wardName} (${days} days @ ₹${admission.dailyRoomRate}/day)`, quantity: days, unitPrice: admission.dailyRoomRate, total: roomCharges },
        { description: `Round-the-clock Nursing Care & Monitoring (${days} days)`, quantity: days, unitPrice: 500, total: nursingCharges }
      ],
      currentUser
    });

    const list = this.getAdmissions();
    const idx = list.findIndex(a => a.id === admissionId);
    if (idx !== -1) {
      list[idx].isFinalBilled = true;
      list[idx].finalBillId = bill.id;
      list[idx].totalCharges = totalPayable;
      this.saveList(STORAGE_KEYS.IPD_ADMISSIONS, list);
    }

    return bill;
  }

  // ============================================================================
  // 3. WARD & BED MANAGEMENT
  // ============================================================================

  public static getWards(): HospitalWard[] {
    return this.loadList<HospitalWard>(STORAGE_KEYS.HOSPITAL_WARDS, DEFAULT_WARDS);
  }

  public static getBeds(wardId?: string): HospitalBed[] {
    const all = this.loadList<HospitalBed>(STORAGE_KEYS.HOSPITAL_BEDS, DEFAULT_BEDS);
    if (wardId && wardId !== 'all') {
      return all.filter(b => b.wardId === wardId);
    }
    return all;
  }

  public static updateBedStatus(bedId: string, status: BedStatus): HospitalBed {
    const beds = this.getBeds();
    const idx = beds.findIndex(b => b.id === bedId);
    if (idx === -1) throw new Error('Bed not found');

    beds[idx].status = status;
    if (status === 'available' || status === 'cleaning' || status === 'maintenance') {
      beds[idx].currentAdmissionId = undefined;
      beds[idx].currentPatientId = undefined;
      beds[idx].currentPatientName = undefined;
      beds[idx].occupiedSince = undefined;
    }
    this.saveList(STORAGE_KEYS.HOSPITAL_BEDS, beds);
    return beds[idx];
  }

  public static assignBedToPatient(wardId: string, bedNumber: string, admissionId: string, patientId: string, patientName: string): void {
    const beds = this.getBeds();
    const idx = beds.findIndex(b => (b.wardId === wardId || b.wardName.includes(wardId)) && b.bedNumber === bedNumber);
    if (idx !== -1) {
      beds[idx].status = 'occupied';
      beds[idx].currentAdmissionId = admissionId;
      beds[idx].currentPatientId = patientId;
      beds[idx].currentPatientName = patientName;
      beds[idx].occupiedSince = new Date().toISOString();
      this.saveList(STORAGE_KEYS.HOSPITAL_BEDS, beds);
    }
  }

  public static freeBed(wardId: string, bedNumber: string): void {
    const beds = this.getBeds();
    const idx = beds.findIndex(b => (b.wardId === wardId || b.wardName.includes(wardId)) && b.bedNumber === bedNumber);
    if (idx !== -1) {
      beds[idx].status = 'cleaning';
      beds[idx].currentAdmissionId = undefined;
      beds[idx].currentPatientId = undefined;
      beds[idx].currentPatientName = undefined;
      beds[idx].occupiedSince = undefined;
      this.saveList(STORAGE_KEYS.HOSPITAL_BEDS, beds);
    }
  }

  public static transferBed(admissionId: string, targetWardId: string, targetBedNumber: string): void {
    const admissions = this.getAdmissions();
    const adm = admissions.find(a => a.id === admissionId);
    if (!adm) throw new Error('Admission not found');

    const targetWard = this.getWards().find(w => w.id === targetWardId);
    if (!targetWard) throw new Error('Target ward not found');

    // Free current bed
    this.freeBed(adm.wardId, adm.bedNumber);

    // Update admission record
    adm.wardId = targetWard.id;
    adm.wardName = targetWard.name;
    adm.bedNumber = targetBedNumber;
    adm.dailyRoomRate = targetWard.dailyRate;
    this.saveList(STORAGE_KEYS.IPD_ADMISSIONS, admissions);

    // Assign new bed
    this.assignBedToPatient(targetWard.id, targetBedNumber, adm.id, adm.patientId, adm.patientName);

    AuditService.log(
      'BED_TRANSFER_COMPLETED',
      'ward',
      `Transferred ${adm.patientName} to ${targetWard.name} Bed ${targetBedNumber}`,
      adm.id,
      undefined,
      'info'
    );
  }

  // ============================================================================
  // 4. NURSING STATION & CARE PLANS
  // ============================================================================

  public static getNurseTasks(admissionId?: string): NursePatientTask[] {
    const all = this.loadList<NursePatientTask>(STORAGE_KEYS.NURSING_TASKS, []);
    if (admissionId) return all.filter(t => t.admissionId === admissionId);
    return all;
  }

  public static createNurseTask(input: Omit<NursePatientTask, 'id' | 'isCompleted'>): NursePatientTask {
    const tasks = this.getNurseTasks();
    const newTask: NursePatientTask = {
      ...input,
      id: `tsk_${generateUuid().slice(0, 8)}`,
      isCompleted: false
    };
    tasks.unshift(newTask);
    this.saveList(STORAGE_KEYS.NURSING_TASKS, tasks);
    return newTask;
  }

  public static toggleNurseTask(taskId: string): void {
    const tasks = this.getNurseTasks();
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      tasks[idx].isCompleted = !tasks[idx].isCompleted;
      tasks[idx].completedAt = tasks[idx].isCompleted ? new Date().toISOString() : undefined;
      this.saveList(STORAGE_KEYS.NURSING_TASKS, tasks);
    }
  }

  public static getMarRecords(admissionId?: string): MedicationAdminRecord[] {
    const all = this.loadList<MedicationAdminRecord>(STORAGE_KEYS.NURSING_MAR, []);
    if (admissionId) return all.filter(m => m.admissionId === admissionId);
    return all;
  }

  public static addMarRecord(input: Omit<MedicationAdminRecord, 'id' | 'status'>): MedicationAdminRecord {
    const list = this.getMarRecords();
    const newRecord: MedicationAdminRecord = {
      ...input,
      id: `mar_${generateUuid().slice(0, 8)}`,
      status: 'scheduled'
    };
    list.unshift(newRecord);
    this.saveList(STORAGE_KEYS.NURSING_MAR, list);
    return newRecord;
  }

  public static administerMedication(recordId: string, nurseName: string, remarks?: string): void {
    const list = this.getMarRecords();
    const idx = list.findIndex(r => r.id === recordId);
    if (idx !== -1) {
      list[idx].status = 'given';
      list[idx].administeredTime = new Date().toISOString();
      list[idx].administeredByNurse = nurseName;
      list[idx].remarks = remarks;
      this.saveList(STORAGE_KEYS.NURSING_MAR, list);

      AuditService.log(
        'MEDICATION_ADMINISTERED',
        'nursing',
        `Administered ${list[idx].medicineName} (${list[idx].dosage}) to ${list[idx].patientName} by Nurse ${nurseName}`,
        recordId,
        undefined,
        'info'
      );
    }
  }

  public static getIntakeOutputRecords(admissionId?: string): IntakeOutputRecord[] {
    const all = this.loadList<IntakeOutputRecord>(STORAGE_KEYS.NURSING_IO, []);
    if (admissionId) return all.filter(r => r.admissionId === admissionId);
    return all;
  }

  public static recordIntakeOutput(input: Omit<IntakeOutputRecord, 'id' | 'balanceNetMl'>): IntakeOutputRecord {
    const list = this.getIntakeOutputRecords();
    const totalIntake = input.intakeOralMl + input.intakeIvMl;
    const totalOutput = input.outputUrineMl + input.outputDrainsMl + input.outputVomitusMl;
    const balance = totalIntake - totalOutput;

    const newRecord: IntakeOutputRecord = {
      ...input,
      id: `io_${generateUuid().slice(0, 8)}`,
      balanceNetMl: balance
    };
    list.unshift(newRecord);
    this.saveList(STORAGE_KEYS.NURSING_IO, list);
    return newRecord;
  }

  public static getHandovers(): ShiftHandoverNote[] {
    return this.loadList<ShiftHandoverNote>(STORAGE_KEYS.NURSING_HANDOVERS, []);
  }

  public static createHandover(input: Omit<ShiftHandoverNote, 'id' | 'createdAt'>): ShiftHandoverNote {
    const list = this.getHandovers();
    const newNote: ShiftHandoverNote = {
      ...input,
      id: `hnd_${generateUuid().slice(0, 8)}`,
      createdAt: new Date().toISOString()
    };
    list.unshift(newNote);
    this.saveList(STORAGE_KEYS.NURSING_HANDOVERS, list);
    return newNote;
  }

  // ============================================================================
  // 5. OPERATION THEATRE (OT) & SURGERY
  // ============================================================================

  public static getSurgeries(): SurgeryBooking[] {
    return this.loadList<SurgeryBooking>(STORAGE_KEYS.SURGERY_BOOKINGS, []);
  }

  public static scheduleSurgery(input: {
    otNumber: string;
    patientId: string;
    patientName: string;
    uhid?: string;
    admissionId?: string;
    procedureName: string;
    category: SurgeryCategory;
    leadSurgeonId: string;
    leadSurgeonName: string;
    anaesthetistId?: string;
    anaesthetistName?: string;
    scheduledDate: string;
    scheduledStartTime: string;
    scheduledDurationMinutes: number;
    theatreCharges?: number;
    surgeonCharges?: number;
    anaesthesiaCharges?: number;
  }): SurgeryBooking {
    const list = this.getSurgeries();
    const theatre = input.theatreCharges || 8500;
    const surgeon = input.surgeonCharges || 15000;
    const anaesthesia = input.anaesthesiaCharges || 5000;
    const total = theatre + surgeon + anaesthesia;

    const newBooking: SurgeryBooking = {
      ...input,
      id: `surg_${generateUuid().slice(0, 8)}`,
      status: 'scheduled',
      whoChecklistCompleted: false,
      theatreCharges: theatre,
      surgeonCharges: surgeon,
      anaesthesiaCharges: anaesthesia,
      totalCharges: total
    };

    list.unshift(newBooking);
    this.saveList(STORAGE_KEYS.SURGERY_BOOKINGS, list);
    ApiSyncService.saveDocument('surgery_bookings', newBooking.id, newBooking).catch(() => {});

    AuditService.log(
      'SURGERY_SCHEDULED',
      'ot',
      `Scheduled ${newBooking.procedureName} for ${newBooking.patientName} in ${newBooking.otNumber} (Lead Surgeon: ${newBooking.leadSurgeonName})`,
      newBooking.id,
      undefined,
      'info'
    );

    return newBooking;
  }

  public static updateSurgeryStatus(id: string, status: SurgeryStatus, notes?: { intraOp?: string; postOp?: string }): SurgeryBooking {
    const list = this.getSurgeries();
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Surgery not found');

    list[idx].status = status;
    if (notes?.intraOp) list[idx].intraOpNotes = notes.intraOp;
    if (notes?.postOp) list[idx].postOpInstructions = notes.postOp;

    this.saveList(STORAGE_KEYS.SURGERY_BOOKINGS, list);
    ApiSyncService.saveDocument('surgery_bookings', list[idx].id, list[idx]).catch(() => {});
    return list[idx];
  }

  public static completeWhoChecklist(surgeryId: string): void {
    const list = this.getSurgeries();
    const idx = list.findIndex(s => s.id === surgeryId);
    if (idx !== -1) {
      list[idx].whoChecklistCompleted = true;
      this.saveList(STORAGE_KEYS.SURGERY_BOOKINGS, list);
      AuditService.log(
        'WHO_SURGICAL_CHECKLIST_VERIFIED',
        'ot',
        `WHO Safe Surgery Checklist signed off for ${list[idx].procedureName} (${list[idx].patientName})`,
        surgeryId,
        undefined,
        'security'
      );
    }
  }

  public static billSurgery(surgeryId: string, currentUser?: User | null): PatientBill {
    const surgery = this.getSurgeries().find(s => s.id === surgeryId);
    if (!surgery) throw new Error('Surgery not found');

    if (surgery.isBilled && surgery.billId) {
      const existing = StorageService.getBills().find(b => b.id === surgery.billId);
      if (existing) return existing;
    }

    const bill = BillService.createHospitalBill({
      patientId: surgery.patientId,
      patientName: surgery.patientName,
      billCategory: 'ot_surgery',
      membershipName: `OT Surgical Package: ${surgery.procedureName}`,
      paidAmount: surgery.totalCharges,
      paymentMethod: 'cash',
      notes: `Surgical procedure ${surgery.procedureName} conducted in ${surgery.otNumber}. Surgeon: ${surgery.leadSurgeonName}`,
      items: [
        { description: `OT Theatre Facility & Consumables (${surgery.otNumber})`, quantity: 1, unitPrice: surgery.theatreCharges, total: surgery.theatreCharges },
        { description: `Surgeon Professional Fee (${surgery.leadSurgeonName})`, quantity: 1, unitPrice: surgery.surgeonCharges, total: surgery.surgeonCharges },
        { description: `Anaesthetist Fee & Gas Services (${surgery.anaesthetistName || 'Anaesthesia Dept'})`, quantity: 1, unitPrice: surgery.anaesthesiaCharges, total: surgery.anaesthesiaCharges }
      ],
      currentUser
    });

    const list = this.getSurgeries();
    const idx = list.findIndex(s => s.id === surgeryId);
    if (idx !== -1) {
      list[idx].isBilled = true;
      list[idx].billId = bill.id;
      this.saveList(STORAGE_KEYS.SURGERY_BOOKINGS, list);
    }

    return bill;
  }

  // ============================================================================
  // 6. ANAESTHESIA & PRE-OPERATIVE CHECKUP (PAC)
  // ============================================================================

  public static getAnaesthesiaRecords(): AnaesthesiaRecord[] {
    return this.loadList<AnaesthesiaRecord>(STORAGE_KEYS.ANAESTHESIA_RECORDS, []);
  }

  public static getAnaesthesiaBySurgery(surgeryId: string): AnaesthesiaRecord | undefined {
    return this.getAnaesthesiaRecords().find(a => a.surgeryId === surgeryId);
  }

  public static saveAnaesthesiaRecord(input: Omit<AnaesthesiaRecord, 'id'>): AnaesthesiaRecord {
    const list = this.getAnaesthesiaRecords();
    const existingIdx = list.findIndex(a => a.surgeryId === input.surgeryId);

    const record: AnaesthesiaRecord = {
      ...input,
      id: existingIdx !== -1 ? list[existingIdx].id : `pac_${generateUuid().slice(0, 8)}`
    };

    if (existingIdx !== -1) {
      list[existingIdx] = record;
    } else {
      list.unshift(record);
    }

    this.saveList(STORAGE_KEYS.ANAESTHESIA_RECORDS, list);
    ApiSyncService.saveDocument('anaesthesia_records', record.id, record).catch(() => {});

    AuditService.log(
      'ANAESTHESIA_PAC_RECORDED',
      'anaesthesia',
      `PAC Evaluation completed for ${record.patientName} (${record.asaGrade}, Mallampati: ${record.mallampatiScore})`,
      record.id,
      undefined,
      'info'
    );

    return record;
  }

  public static updateAldreteScore(id: string, score: number, recoveryNotes?: string): AnaesthesiaRecord {
    const list = this.getAnaesthesiaRecords();
    const idx = list.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('PAC record not found');

    list[idx].aldreteRecoveryScore = score;
    if (recoveryNotes) list[idx].recoveryNotes = recoveryNotes;

    this.saveList(STORAGE_KEYS.ANAESTHESIA_RECORDS, list);
    return list[idx];
  }

  // ============================================================================
  // 7. RADIOLOGY & IMAGING
  // ============================================================================

  public static getRadiologyOrders(): RadiologyInvestigation[] {
    return this.loadList<RadiologyInvestigation>(STORAGE_KEYS.RADIOLOGY_ORDERS, []);
  }

  public static createRadiologyOrder(input: {
    patientId: string;
    patientName: string;
    uhid?: string;
    referringDoctor?: string;
    modality: RadiologyModality;
    studyName: string;
    bodyPart: string;
    clinicalIndication: string;
    cost?: number;
  }): RadiologyInvestigation {
    const list = this.getRadiologyOrders();
    const count = list.length + 1;
    const year = new Date().getFullYear();
    const modalityCode = input.modality.slice(0, 3).toUpperCase();
    const accessionNumber = `RAD-${modalityCode}-${year}-${count.toString().padStart(5, '0')}`;

    const defaultCosts: Record<RadiologyModality, number> = {
      x_ray: 650,
      ultrasound: 1400,
      ct_scan: 4500,
      mri: 7500,
      mammography: 2200,
      dexa: 1800,
      ecg: 350
    };

    const newOrder: RadiologyInvestigation = {
      ...input,
      id: `rad_${generateUuid().slice(0, 8)}`,
      accessionNumber,
      orderedAt: new Date().toISOString(),
      status: 'ordered',
      cost: input.cost || defaultCosts[input.modality] || 1000
    };

    list.unshift(newOrder);
    this.saveList(STORAGE_KEYS.RADIOLOGY_ORDERS, list);
    ApiSyncService.saveDocument('radiology_orders', newOrder.id, newOrder).catch(() => {});

    AuditService.log(
      'RADIOLOGY_ORDER_CREATED',
      'radiology',
      `Ordered ${newOrder.modality.toUpperCase()} (${newOrder.studyName}) for ${newOrder.patientName}`,
      newOrder.id,
      undefined,
      'info'
    );

    return newOrder;
  }

  public static completeRadiologyScan(id: string, technicianName: string): RadiologyInvestigation {
    const list = this.getRadiologyOrders();
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Radiology investigation not found');

    list[idx].status = 'technician_completed';
    list[idx].technicianName = technicianName;
    list[idx].technicianCompletedAt = new Date().toISOString();

    this.saveList(STORAGE_KEYS.RADIOLOGY_ORDERS, list);
    return list[idx];
  }

  public static submitRadiologyReport(id: string, report: {
    radiologistName: string;
    findings: string;
    impression: string;
    recommendations?: string;
  }): RadiologyInvestigation {
    const list = this.getRadiologyOrders();
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Radiology investigation not found');

    list[idx].status = 'verified';
    list[idx].radiologistName = report.radiologistName;
    list[idx].radiologistFindings = report.findings;
    list[idx].impression = report.impression;
    list[idx].recommendations = report.recommendations;
    list[idx].verifiedAt = new Date().toISOString();

    this.saveList(STORAGE_KEYS.RADIOLOGY_ORDERS, list);
    ApiSyncService.saveDocument('radiology_orders', list[idx].id, list[idx]).catch(() => {});

    AuditService.log(
      'RADIOLOGY_REPORT_VERIFIED',
      'radiology',
      `Verified Diagnostic Imaging Report for ${list[idx].accessionNumber} (${list[idx].studyName}) by ${report.radiologistName}`,
      id,
      undefined,
      'info'
    );

    return list[idx];
  }

  public static billRadiologyOrder(orderId: string, currentUser?: User | null): PatientBill {
    const order = this.getRadiologyOrders().find(r => r.id === orderId);
    if (!order) throw new Error('Radiology order not found');

    if (order.isBilled && order.billId) {
      const existing = StorageService.getBills().find(b => b.id === order.billId);
      if (existing) return existing;
    }

    const bill = BillService.createHospitalBill({
      patientId: order.patientId,
      patientName: order.patientName,
      billCategory: 'radiology',
      membershipName: `Diagnostic Imaging: ${order.studyName}`,
      paidAmount: order.cost,
      paymentMethod: 'cash',
      notes: `Radiology study ${order.studyName} (${order.accessionNumber})`,
      items: [
        { description: `${order.modality.toUpperCase()} - ${order.studyName} (${order.bodyPart})`, quantity: 1, unitPrice: order.cost, total: order.cost }
      ],
      currentUser
    });

    const list = this.getRadiologyOrders();
    const idx = list.findIndex(r => r.id === orderId);
    if (idx !== -1) {
      list[idx].isBilled = true;
      list[idx].billId = bill.id;
      this.saveList(STORAGE_KEYS.RADIOLOGY_ORDERS, list);
    }

    return bill;
  }

  // ============================================================================
  // 8. BLOOD BANK MANAGEMENT & TRANSFUSION
  // ============================================================================

  public static getBloodUnits(group?: BloodGroup, component?: BloodComponentType): BloodUnitRecord[] {
    let units = this.loadList<BloodUnitRecord>(STORAGE_KEYS.BLOOD_UNITS, DEFAULT_BLOOD_UNITS);
    if (group && group !== ('all' as any)) {
      units = units.filter(u => u.bloodGroup === group);
    }
    if (component && component !== ('all' as any)) {
      units = units.filter(u => u.componentType === component);
    }
    return units;
  }

  public static registerBloodUnit(input: Omit<BloodUnitRecord, 'id' | 'unitBarcode' | 'status'>): BloodUnitRecord {
    const list = this.getBloodUnits();
    const count = list.length + 1;
    const barcode = `BB-${input.bloodGroup.replace('+', 'P').replace('-', 'N')}-${count.toString().padStart(4, '0')}`;

    const newUnit: BloodUnitRecord = {
      ...input,
      id: `bb_${generateUuid().slice(0, 8)}`,
      unitBarcode: barcode,
      status: 'in_stock'
    };

    list.unshift(newUnit);
    this.saveList(STORAGE_KEYS.BLOOD_UNITS, list);
    ApiSyncService.saveDocument('blood_units', newUnit.id, newUnit).catch(() => {});

    AuditService.log(
      'BLOOD_UNIT_ACCESSIONED',
      'blood_bank',
      `Registered blood unit ${newUnit.unitBarcode} (${newUnit.bloodGroup} ${newUnit.componentType})`,
      newUnit.id,
      undefined,
      'info'
    );

    return newUnit;
  }

  public static getBloodRequests(): BloodIssueRequest[] {
    return this.loadList<BloodIssueRequest>(STORAGE_KEYS.BLOOD_REQUESTS, []);
  }

  public static createBloodRequest(input: {
    patientId: string;
    patientName: string;
    wardOrOt: string;
    bloodGroup: BloodGroup;
    componentRequired: BloodComponentType;
    unitsRequested: number;
    urgency: 'routine' | 'urgent' | 'emergency_crash';
    requisitionDoctor: string;
  }): BloodIssueRequest {
    const list = this.getBloodRequests();
    const count = list.length + 1;
    const year = new Date().getFullYear();
    const requestNumber = `BREQ-${year}-${count.toString().padStart(5, '0')}`;

    const newReq: BloodIssueRequest = {
      ...input,
      id: `req_${generateUuid().slice(0, 8)}`,
      requestNumber,
      requestedAt: new Date().toISOString(),
      crossMatchCompatibility: 'pending',
      requestStatus: 'requested'
    };

    list.unshift(newReq);
    this.saveList(STORAGE_KEYS.BLOOD_REQUESTS, list);
    ApiSyncService.saveDocument('blood_requests', newReq.id, newReq).catch(() => {});

    AuditService.log(
      'BLOOD_REQUISITION_RECEIVED',
      'blood_bank',
      `Received ${newReq.urgency.toUpperCase()} blood request ${newReq.requestNumber} for ${newReq.patientName} (${newReq.unitsRequested} units of ${newReq.bloodGroup})`,
      newReq.id,
      undefined,
      newReq.urgency === 'emergency_crash' ? 'critical' : 'warning'
    );

    return newReq;
  }

  public static crossMatchAndIssue(requestId: string, unitBarcodes: string[]): {
    request: BloodIssueRequest;
    issuedUnits: BloodUnitRecord[];
  } {
    const requests = this.getBloodRequests();
    const reqIdx = requests.findIndex(r => r.id === requestId);
    if (reqIdx === -1) throw new Error('Requisition not found');

    const allUnits = this.getBloodUnits();
    const issuedUnits: BloodUnitRecord[] = [];

    unitBarcodes.forEach(code => {
      const uIdx = allUnits.findIndex(u => u.unitBarcode === code);
      if (uIdx !== -1) {
        allUnits[uIdx].status = 'issued';
        allUnits[uIdx].issuedToPatientId = requests[reqIdx].patientId;
        allUnits[uIdx].issuedToPatientName = requests[reqIdx].patientName;
        allUnits[uIdx].issuedAt = new Date().toISOString();
        issuedUnits.push(allUnits[uIdx]);
      }
    });

    requests[reqIdx].requestStatus = 'issued';
    requests[reqIdx].crossMatchCompatibility = 'compatible';
    requests[reqIdx].assignedUnitBarcodes = unitBarcodes;

    this.saveList(STORAGE_KEYS.BLOOD_REQUESTS, requests);
    this.saveList(STORAGE_KEYS.BLOOD_UNITS, allUnits);

    AuditService.log(
      'BLOOD_UNITS_ISSUED',
      'blood_bank',
      `Cross-matched and issued ${unitBarcodes.length} blood units to ${requests[reqIdx].patientName} in ${requests[reqIdx].wardOrOt}`,
      requests[reqIdx].id,
      { barcodes: unitBarcodes },
      'security'
    );

    return { request: requests[reqIdx], issuedUnits };
  }

  public static getBloodDonors(): BloodDonor[] {
    return this.loadList<BloodDonor>(STORAGE_KEYS.BLOOD_DONORS, []);
  }

  public static registerDonor(input: Omit<BloodDonor, 'id' | 'donorRegNumber'>): BloodDonor {
    const list = this.getBloodDonors();
    const count = list.length + 1;
    const donorRegNumber = `DNR-${count.toString().padStart(5, '0')}`;

    const newDonor: BloodDonor = {
      ...input,
      id: `dnr_${generateUuid().slice(0, 8)}`,
      donorRegNumber
    };

    list.unshift(newDonor);
    this.saveList(STORAGE_KEYS.BLOOD_DONORS, list);
    ApiSyncService.saveDocument('blood_donors', newDonor.id, newDonor).catch(() => {});

    AuditService.log(
      'BLOOD_DONOR_REGISTERED',
      'blood_bank',
      `Registered voluntary donor ${newDonor.fullName} (${newDonor.bloodGroup})`,
      newDonor.id,
      undefined,
      'info'
    );

    return newDonor;
  }
}
