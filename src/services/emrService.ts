import { ClinicalEncounter, PrescribedMedication, OrderedLabTest, ClinicalVitals, PatientAppointment } from '../types';
import { StorageService } from './storage';
import { AuditService } from './auditService';
import { ApiSyncService } from './apiSyncService';
import { generateUuid, generateQueueToken } from '../utils/idGenerator';
import { BillService } from './billService';
import { DoctorMasterService } from './doctorMasterService';

const EMR_STORAGE_KEY = 'labmedix_clinical_encounters';

export interface WaitingQueueItem {
  tokenNo: number;
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  cardTier: string;
  cardTierColor: string;
  status: 'in_consultation' | 'next_up' | 'waiting' | 'completed';
  arrivalTime: string;
  chiefComplaint: string;
  doctorId?: string;
  assignedDoctor: string;
  opdRoom: string;
  appointmentId?: string;
}

export class EMRService {
  private static getInitialEncounters(): ClinicalEncounter[] {
    return [];
  }

  public static getAllEncounters(): ClinicalEncounter[] {
    return StorageService.getItem<ClinicalEncounter[]>(EMR_STORAGE_KEY, this.getInitialEncounters());
  }

  public static getEncountersByPatient(patientId: string): ClinicalEncounter[] {
    return this.getAllEncounters().filter(e => e.patientId === patientId);
  }

  public static getEncountersByCard(cardNoOrId: string): ClinicalEncounter[] {
    const cards = StorageService.getCards();
    const targetCard = cards.find(c => c.cardNumber === cardNoOrId || c.id === cardNoOrId);
    return this.getAllEncounters().filter(e => 
      e.cardNo === cardNoOrId || 
      e.cardId === cardNoOrId || 
      (targetCard && e.patientId === targetCard.patientId)
    );
  }

  public static getEncounterById(id: string): ClinicalEncounter | undefined {
    return this.getAllEncounters().find(e => e.id === id);
  }

  public static saveEncounter(encounterData: Omit<ClinicalEncounter, 'id' | 'createdAt' | 'updatedAt' | 'encounterNo'> & { id?: string; encounterNo?: string }): ClinicalEncounter {
    const encounters = this.getAllEncounters();
    const cards = StorageService.getCards();
    const patientCard = cards.find(c => c.patientId === encounterData.patientId && c.status === 'active') || 
                        cards.find(c => c.patientId === encounterData.patientId);
    const now = new Date().toISOString();

    const securitySeal = encounterData.securitySeal || `SEC-RX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    if (encounterData.id) {
      const idx = encounters.findIndex(e => e.id === encounterData.id);
      if (idx !== -1) {
        const updated: ClinicalEncounter = {
          ...encounters[idx],
          ...encounterData,
          cardNo: encounterData.cardNo || encounters[idx].cardNo || patientCard?.cardNumber,
          cardId: encounterData.cardId || encounters[idx].cardId || patientCard?.id,
          securitySeal: encounters[idx].securitySeal || securitySeal,
          isLiveVerified: true,
          updatedAt: now
        };
        encounters[idx] = updated;
        StorageService.saveEncounters(encounters);
        AuditService.log('EMR_ENCOUNTER_UPDATED', 'clinical', `Updated live clinical encounter & digital Rx ${updated.encounterNo} for Card: ${updated.cardNo || 'N/A'} (Patient: ${updated.patientName})`);
        return updated;
      }
    }

    const newEncounter: ClinicalEncounter = {
      ...encounterData,
      id: `enc_${generateUuid().slice(0, 8)}`,
      encounterNo: encounterData.encounterNo || `ENC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      cardNo: encounterData.cardNo || patientCard?.cardNumber,
      cardId: encounterData.cardId || patientCard?.id,
      securitySeal,
      isLiveVerified: true,
      createdAt: now,
      updatedAt: now
    };

    encounters.unshift(newEncounter);
    StorageService.saveEncounters(encounters);
    AuditService.log('EMR_ENCOUNTER_CREATED', 'clinical', `Created live authentic doctor prescription & EMR encounter ${newEncounter.encounterNo} [Seal: ${securitySeal}] for Card: ${newEncounter.cardNo || 'N/A'} (Patient: ${newEncounter.patientName})`);
    return newEncounter;
  }

  public static deleteEncounter(id: string): boolean {
    const encounters = this.getAllEncounters();
    const filtered = encounters.filter(e => e.id !== id);
    if (filtered.length === encounters.length) return false;
    StorageService.saveEncounters(filtered);
    ApiSyncService.deleteDocument('emrEncounters', id).catch(() => {});
    AuditService.log('EMR_ENCOUNTER_DELETED', 'patient', `Deleted EMR record ${id}`);
    return true;
  }

  // Live Doctor-Specific Waiting Queue with Real Tokens
  public static getWaitingQueue(doctorIdentifier?: string): WaitingQueueItem[] {
    const appointments = this.getAllAppointments();
    const patients = StorageService.getPatients();
    const cards = StorageService.getCards();
    const memberships = StorageService.getMemberships();

    const targetDoc = (doctorIdentifier || 'dr. subhashish roy').toLowerCase();

    // Doctor profile metadata dictionary
    const doctorMetadata: Record<string, { name: string; speciality: string; opdRoom: string; defaultComplaint: string }> = {
      sen: { name: 'Dr. Anita Sen', speciality: 'Sr. Gynaecologist & Obstetrician', opdRoom: 'Gynae OPD Room #105', defaultComplaint: 'Routine Ante-Natal ANC 24 weeks follow-up & Ultrasound review' },
      anita: { name: 'Dr. Anita Sen', speciality: 'Sr. Gynaecologist & Obstetrician', opdRoom: 'Gynae OPD Room #105', defaultComplaint: 'Routine Ante-Natal ANC 24 weeks follow-up & Ultrasound review' },
      das: { name: 'Dr. Pritam Das', speciality: 'Sr. Orthopaedic Surgeon', opdRoom: 'Ortho OPD Room #106', defaultComplaint: 'Severe osteoarthritis bilateral knee pain & joint mobility evaluation' },
      pritam: { name: 'Dr. Pritam Das', speciality: 'Sr. Orthopaedic Surgeon', opdRoom: 'Ortho OPD Room #106', defaultComplaint: 'Severe osteoarthritis bilateral knee pain & joint mobility evaluation' },
      chatterjee: { name: 'Dr. Kaushik Chatterjee, MD', speciality: 'Sr. Consultant Pathologist & Physician', opdRoom: 'Diagnostic & Medicine Room #102', defaultComplaint: 'Post-viral asthenia, fever workup & metabolic panel review' },
      roy: { name: 'Dr. Subhashish Roy', speciality: 'Sr. Consultant Cardiologist & Medical Director', opdRoom: 'Cardiology OPD Room #104', defaultComplaint: 'Chest pain on exertion, Hypertension & 12-Lead ECG review' }
    };

    let docMeta = doctorMetadata.roy;
    for (const key of Object.keys(doctorMetadata)) {
      if (targetDoc.includes(key)) {
        docMeta = doctorMetadata[key];
        break;
      }
    }

    // 1. Find all appointments booked specifically for this doctor
    const doctorApts = appointments.filter(a => {
      const aDocName = (a.doctorName || '').toLowerCase();
      const aDocId = (a.doctorId || '').toLowerCase();
      return (
        aDocName.includes(targetDoc) ||
        targetDoc.includes(aDocName) ||
        aDocId.includes(targetDoc) ||
        targetDoc.includes(aDocId) ||
        (targetDoc.includes('sen') && (aDocName.includes('anita') || aDocName.includes('sen'))) ||
        (targetDoc.includes('das') && (aDocName.includes('pritam') || aDocName.includes('das'))) ||
        (targetDoc.includes('roy') && (aDocName.includes('subhashish') || aDocName.includes('roy')))
      );
    });

    const queueList: WaitingQueueItem[] = [];

    // Map booked appointments to queue items
    doctorApts.forEach((apt, idx) => {
      const p = patients.find(pt => pt.id === apt.patientId) || {
        id: apt.patientId,
        fullName: apt.patientName,
        age: 45,
        gender: 'female',
        medicalInfo: { bloodGroup: 'B+' }
      };

      const card = cards.find(c => c.patientId === apt.patientId && c.status === 'active');
      const mem = card ? memberships.find(m => m.id === card.membershipId) : null;

      const statuses: ('in_consultation' | 'next_up' | 'waiting')[] =
        idx === 0 ? ['in_consultation'] : idx === 1 ? ['next_up'] : ['waiting'];

      queueList.push({
        tokenNo: 101 + idx,
        patientId: apt.patientId,
        patientName: apt.patientName,
        age: p.age || 45,
        gender: p.gender || 'male',
        bloodGroup: p.medicalInfo?.bloodGroup || 'B+',
        cardTier: apt.cardTier || mem?.name || 'Gold Privilege Card',
        cardTierColor: apt.cardTierColor || mem?.color || '#F59E0B',
        status: (apt.status === 'in_consultation' ? 'in_consultation' : statuses[0]) as any,
        arrivalTime: `Today, 10:${String(15 + idx * 15).padStart(2, '0')} AM`,
        chiefComplaint: apt.chiefComplaint || docMeta.defaultComplaint,
        doctorId: apt.doctorId,
        assignedDoctor: `${docMeta.name} (${docMeta.speciality})`,
        opdRoom: docMeta.opdRoom,
        appointmentId: apt.id
      });
    });

    // Return pure live waiting queue based only on real appointments
    return queueList;
  }

  // Patient Appointments & Doctor Wish Telemedicine Hub
  private static APPOINTMENTS_STORAGE_KEY = 'labmedix_patient_appointments_v1';

  private static getInitialAppointments(): PatientAppointment[] {
    return [];
  }

  public static getAllAppointments(): PatientAppointment[] {
    return StorageService.getItem<PatientAppointment[]>(this.APPOINTMENTS_STORAGE_KEY, this.getInitialAppointments());
  }

  public static getAppointmentsByPatient(patientId: string): PatientAppointment[] {
    return this.getAllAppointments().filter(a => a.patientId === patientId);
  }

  public static getAppointmentsByCard(cardNoOrId: string): PatientAppointment[] {
    const cards = StorageService.getCards();
    const targetCard = cards.find(c => c.cardNumber === cardNoOrId || c.id === cardNoOrId);
    return this.getAllAppointments().filter(a => 
      a.cardNo === cardNoOrId || 
      a.cardId === cardNoOrId || 
      (targetCard && a.patientId === targetCard.patientId)
    );
  }

  public static saveAppointment(appointmentData: Partial<PatientAppointment> & { patientId: string; patientName: string }): PatientAppointment {
    const appointments = this.getAllAppointments();
    const cards = StorageService.getCards();
    const memberships = StorageService.getMemberships();
    const patientCard = cards.find(c => c.patientId === appointmentData.patientId && c.status === 'active') || 
                        cards.find(c => c.patientId === appointmentData.patientId);
    const mem = patientCard ? memberships.find(m => m.id === patientCard.membershipId) : null;
    const now = new Date().toISOString();

    const securitySeal = appointmentData.securitySeal || `SEC-APT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    if (appointmentData.id) {
      const idx = appointments.findIndex(a => a.id === appointmentData.id);
      if (idx !== -1) {
        const updated: PatientAppointment = {
          ...appointments[idx],
          ...appointmentData,
          cardNo: appointmentData.cardNo || appointments[idx].cardNo || patientCard?.cardNumber,
          cardId: appointmentData.cardId || appointments[idx].cardId || patientCard?.id,
          securitySeal: appointments[idx].securitySeal || securitySeal,
          isLiveVerified: true,
          updatedAt: now
        };
        appointments[idx] = updated;
        StorageService.saveAppointments(appointments);
        AuditService.log('APPOINTMENT_UPDATED', 'clinical', `Updated live appointment ${updated.appointmentNo} for Card: ${updated.cardNo || 'N/A'} (${updated.patientName})`);
        return updated;
      }
    }

    const existingTokens = appointments.map(a => a.queueToken || a.appointmentNo || '');
    const queueToken = appointmentData.queueToken || generateQueueToken(existingTokens);
    const appointmentNo = appointmentData.appointmentNo || queueToken;

    const newApt: PatientAppointment = {
      id: `apt_${generateUuid().slice(0, 8)}`,
      appointmentNo,
      queueToken,
      patientId: appointmentData.patientId,
      patientName: appointmentData.patientName,
      patientPhone: appointmentData.patientPhone || '+91 98300 00000',
      cardNo: appointmentData.cardNo || patientCard?.cardNumber,
      cardId: appointmentData.cardId || patientCard?.id,
      securitySeal,
      isLiveVerified: true,
      cardTier: appointmentData.cardTier || mem?.name || 'Gold Cardholder',
      cardTierColor: appointmentData.cardTierColor || mem?.color || '#0D9488',
      doctorId: appointmentData.doctorId || 'doc_1',
      doctorName: appointmentData.doctorName || 'Dr. Subhashish Roy',
      doctorSpeciality: appointmentData.doctorSpeciality || 'Sr. Consultant Cardiologist',
      department: appointmentData.department || 'Cardiology OPD',
      consultationMode: appointmentData.consultationMode || 'physical_opd',
      patientWishDate: appointmentData.patientWishDate || new Date().toISOString().slice(0, 10),
      patientWishSlot: appointmentData.patientWishSlot || 'Morning OPD (09:00 AM - 01:00 PM)',
      patientWishTime: appointmentData.patientWishTime || '10:30 AM',
      doctorConfirmedDate: appointmentData.doctorConfirmedDate,
      doctorConfirmedSlot: appointmentData.doctorConfirmedSlot,
      doctorConfirmedTime: appointmentData.doctorConfirmedTime,
      doctorNotes: appointmentData.doctorNotes,
      chiefComplaint: appointmentData.chiefComplaint || 'Clinical Consultation',
      status: appointmentData.status || 'pending_doctor_approval',
      telemedicineRoomUrl: appointmentData.telemedicineRoomUrl || `https://telemed.labmedix.org/room/telemed-${generateUuid().slice(0, 6)}`,
      consultationFee: appointmentData.consultationFee || 650,
      walletDebitStatus: appointmentData.walletDebitStatus || 'paid',
      createdAt: now,
      updatedAt: now
    };

    appointments.unshift(newApt);
    StorageService.saveAppointments(appointments);
    ApiSyncService.saveDocument('appointments', newApt.id, newApt).catch(() => {});
    AuditService.log('APPOINTMENT_CREATED', 'clinical', `Scheduled live doctor consultation ${newApt.appointmentNo} (Queue: ${queueToken}) [Seal: ${securitySeal}] for Card: ${newApt.cardNo || 'N/A'} (${newApt.patientName})`);
    return newApt;
  }

  public static confirmAppointmentByDoctor(id: string, confirmedSlot: string, confirmedTime: string, notes?: string): PatientAppointment | null {
    const appointments = this.getAllAppointments();
    const apt = appointments.find(a => a.id === id);
    if (!apt) return null;

    apt.status = 'doctor_confirmed';
    apt.doctorConfirmedSlot = confirmedSlot;
    apt.doctorConfirmedTime = confirmedTime;
    apt.doctorConfirmedDate = apt.patientWishDate;
    apt.doctorNotes = notes || 'Doctor Slot Confirmed & Approved.';
    apt.updatedAt = new Date().toISOString();

    StorageService.saveAppointments(appointments);
    AuditService.log('APPOINTMENT_CONFIRMED', 'patient', `Doctor confirmed appointment ${apt.appointmentNo} for ${apt.patientName}`);
    return apt;
  }

  public static updateAppointmentStatus(id: string, status: PatientAppointment['status']): PatientAppointment | null {
    const appointments = this.getAllAppointments();
    const apt = appointments.find(a => a.id === id || a.appointmentNo === id);
    if (!apt) return null;

    apt.status = status;
    apt.updatedAt = new Date().toISOString();

    // When consultation is completed, auto-generate official hospital bill & attribute revenue to doctor
    if (status === 'completed' && !apt.billId) {
      try {
        const fee = Number(apt.consultationFee || 0);
        if (fee > 0) {
          const bill = BillService.createHospitalBill({
            patientId: apt.patientId,
            patientName: apt.patientName,
            patientMobile: apt.patientPhone,
            healthCardNumber: apt.cardNo,
            healthCardId: apt.cardId,
            billCategory: 'opd_consultation',
            items: [
              {
                description: `OPD Consultation: ${apt.doctorName} (${apt.department}) [Token: ${apt.queueToken || apt.appointmentNo}]`,
                quantity: 1,
                unitPrice: fee,
                total: fee
              }
            ],
            paidAmount: apt.walletDebitStatus === 'pending' ? 0 : fee,
            paymentMethod: apt.walletDebitStatus === 'free_card_benefit' ? 'wallet' : 'cash',
            notes: `OPD Consultation Token ${apt.queueToken || apt.appointmentNo} completed. Complaint: ${apt.chiefComplaint}`
          });
          apt.billId = bill.id;
        }

        // Attribute consultation to Doctor Master metrics & commission
        DoctorMasterService.attributeConsultationAndReferral(apt.doctorId, fee, 0);
      } catch (err) {
        console.error('Failed to auto-generate bill for completed appointment:', err);
      }
    }

    StorageService.saveAppointments(appointments);
    ApiSyncService.saveDocument('appointments', apt.id, apt).catch(() => {});
    AuditService.log('APPOINTMENT_UPDATED', 'clinical', `Updated appointment ${apt.appointmentNo} status to ${status}`);
    return apt;
  }

  public static deleteAppointment(id: string): boolean {
    const appointments = this.getAllAppointments();
    const idx = appointments.findIndex(a => a.id === id || a.appointmentNo === id);
    if (idx === -1) return false;

    const removed = appointments.splice(idx, 1)[0];
    StorageService.saveAppointments(appointments);
    ApiSyncService.deleteDocument('appointments', removed.id).catch(() => {});

    AuditService.log('APPOINTMENT_DELETED', 'clinical', `Cancelled and deleted appointment ${removed.appointmentNo} for ${removed.patientName}`);
    return true;
  }
}
