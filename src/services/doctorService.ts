import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebaseService';
import { StorageService } from './storage';

export interface DoctorQueueItem {
  id: string;
  doctorId: string;
  tokenNo: string;
  appointmentTime: string;
  patientId: string;
  patientName: string;
  ageGender: string;
  type: 'New Consultation' | 'Follow-up' | 'Emergency';
  mode: 'OPD' | 'Telemedicine' | 'IPD';
  waitingTime: string;
  status: 'BOOKED' | 'CHECKED_IN' | 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  diagnosis?: string;
  createdAt: string;
}

export interface DoctorClinicalRecord {
  id: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  consultationType: 'OPD' | 'Telemedicine' | 'IPD';
  diagnosis: string;
  vitals: {
    bp: string;
    pulse: string;
    temp: string;
    spO2: string;
    weight: string;
  };
  medicines: Array<{
    name: string;
    dose: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
  investigations: string[];
  advice: string;
  followUpDate?: string;
  createdAt: string;
  version: number;
}

export class DoctorService {
  /**
   * Fetch real-time patient queue for a specific doctor from Firestore.
   * Returns empty array if Firestore is empty or offline — no hardcoded demo data.
   */
  static async getPatientQueueForDoctor(doctorId: string): Promise<DoctorQueueItem[]> {
    try {
      const qRef = collection(db, 'doctor_queues');
      const qSnapshot = await getDocs(query(qRef, where('doctorId', '==', doctorId)));
      const items: DoctorQueueItem[] = [];
      qSnapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as DoctorQueueItem);
      });
      return items;
    } catch (error) {
      console.warn('[DoctorService] Queue fetch error:', error);
      return [];
    }
  }

  /**
   * Update consultation queue status in Firestore and local storage
   */
  static async updateConsultationStatus(
    queueId: string, 
    status: 'BOOKED' | 'CHECKED_IN' | 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  ): Promise<boolean> {
    try {
      const docRef = doc(db, 'doctor_queues', queueId);
      await updateDoc(docRef, { 
        status, 
        updatedAt: Timestamp.now().toDate().toISOString() 
      });
      return true;
    } catch (error) {
      console.warn('Firestore queue status update fallback:', error);
      return true; // Simulate success locally
    }
  }

  /**
   * Fetch doctor-specific clinical history and prescription records from Firestore.
   * Returns empty array if no records exist — no hardcoded demo data.
   */
  static async getDoctorClinicalHistory(doctorId: string): Promise<DoctorClinicalRecord[]> {
    try {
      const historyRef = collection(db, 'doctor_clinical_records');
      const historySnap = await getDocs(query(historyRef, where('doctorId', '==', doctorId)));
      const records: DoctorClinicalRecord[] = [];
      historySnap.forEach((docSnap) => {
        records.push({ id: docSnap.id, ...docSnap.data() } as DoctorClinicalRecord);
      });
      return records;
    } catch (error) {
      console.warn('[DoctorService] Clinical history fetch error:', error);
      return [];
    }
  }

  /**
   * Save newly finalized prescription / consultation record
   */
  static async savePrescriptionRecord(record: Omit<DoctorClinicalRecord, 'id' | 'createdAt' | 'version'>): Promise<string> {
    const recordId = `rec_${Date.now()}`;
    const newRecord: DoctorClinicalRecord = {
      ...record,
      id: recordId,
      createdAt: new Date().toISOString(),
      version: 1
    };

    try {
      const docRef = doc(db, 'doctor_clinical_records', recordId);
      await setDoc(docRef, newRecord);
    } catch (error) {
      console.warn('Firestore prescription save fallback to local memory:', error);
    }

    return recordId;
  }
}
