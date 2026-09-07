import { FamilyGroup, FamilyMemberLink, Patient, HealthCard } from '../types';
import { StorageService } from './storage';
import { PatientService } from './patientService';
import { AuditService } from './auditService';
import { generateFamilyId } from '../utils/idGenerator';

export class FamilyService {
  public static getAll(): FamilyGroup[] {
    return StorageService.getFamilies();
  }

  public static getById(id: string): FamilyGroup | undefined {
    return StorageService.getFamilies().find(f => f.id === id);
  }

  public static getByPatientId(patientId: string): FamilyGroup | undefined {
    return StorageService.getFamilies().find(f => 
      f.primaryPatientId === patientId || f.members.some(m => m.patientId === patientId)
    );
  }

  public static createFamily(familyName: string, primaryPatientId: string): FamilyGroup {
    const families = StorageService.getFamilies();
    const id = generateFamilyId(families.map(f => f.id));
    const now = new Date().toISOString();

    const newFamily: FamilyGroup = {
      id,
      familyName,
      primaryPatientId,
      members: [
        {
          patientId: primaryPatientId,
          relationship: 'Primary Member (Head)',
          isPrimary: true
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    families.push(newFamily);
    StorageService.saveFamilies(families);

    // Update primary patient
    const patients = StorageService.getPatients();
    const primary = patients.find(p => p.id === primaryPatientId);
    if (primary) {
      primary.familyId = id;
      primary.isFamilyHead = true;
      StorageService.savePatients(patients);
    }

    AuditService.log('FAMILY_CREATED', 'family', `Created Family Health Group ${familyName} (ID: ${id})`, id);
    return newFamily;
  }

  public static updateFamily(familyId: string, updates: { familyName?: string; primaryPatientId?: string }): FamilyGroup | null {
    const families = StorageService.getFamilies();
    const family = families.find(f => f.id === familyId);
    if (!family) return null;

    if (updates.familyName) {
      family.familyName = updates.familyName.trim();
    }

    if (updates.primaryPatientId && updates.primaryPatientId !== family.primaryPatientId) {
      const oldPrimaryId = family.primaryPatientId;
      family.primaryPatientId = updates.primaryPatientId;

      // Update isPrimary flags in members list
      family.members.forEach(m => {
        if (m.patientId === updates.primaryPatientId) {
          m.isPrimary = true;
          m.relationship = 'Primary Member (Head)';
        } else if (m.patientId === oldPrimaryId) {
          m.isPrimary = false;
          m.relationship = 'Spouse / Member';
        }
      });

      // Update patients storage
      const patients = StorageService.getPatients();
      const oldPrimary = patients.find(p => p.id === oldPrimaryId);
      if (oldPrimary) oldPrimary.isFamilyHead = false;

      const newPrimary = patients.find(p => p.id === updates.primaryPatientId);
      if (newPrimary) {
        newPrimary.familyId = familyId;
        newPrimary.isFamilyHead = true;
      }
      StorageService.savePatients(patients);
    }

    family.updatedAt = new Date().toISOString();
    StorageService.saveFamilies(families);

    AuditService.log('FAMILY_UPDATED', 'family', `Updated Family Health Group ${family.familyName}`, familyId);
    return family;
  }

  public static addMember(familyId: string, patientId: string, relationship: string): FamilyGroup | null {
    const families = StorageService.getFamilies();
    const family = families.find(f => f.id === familyId);
    if (!family) return null;

    if (family.members.some(m => m.patientId === patientId)) {
      return family;
    }

    family.members.push({
      patientId,
      relationship,
      isPrimary: false
    });
    family.updatedAt = new Date().toISOString();
    StorageService.saveFamilies(families);

    // Update patient
    const patients = StorageService.getPatients();
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      patient.familyId = familyId;
      patient.isFamilyHead = false;
      StorageService.savePatients(patients);
    }

    AuditService.log('FAMILY_MEMBER_ADDED', 'family', `Added patient ${patientId} as ${relationship} to family ${family.familyName}`, familyId);
    return family;
  }

  /**
   * Fast Auto-Register & Link Dependent directly into Family Shield
   */
  public static registerAndLinkDependent(
    familyId: string,
    data: {
      fullName: string;
      relationship: string;
      gender: 'male' | 'female' | 'other';
      age: number;
      bloodGroup: string;
      mobile?: string;
      photoUrl?: string;
    }
  ): { patient: Patient; card: HealthCard; family: FamilyGroup } | null {
    const families = StorageService.getFamilies();
    const family = families.find(f => f.id === familyId);
    if (!family) return null;

    const patients = StorageService.getPatients();
    const primaryHead = patients.find(p => p.id === family.primaryPatientId);
    const primaryCard = StorageService.getCards().find(c => c.patientId === primaryHead?.id);
    const membershipId = primaryCard?.membershipId || StorageService.getMemberships()[0]?.id || 'mem_gold';

    // Calculate approximate DOB from Age
    const birthYear = new Date().getFullYear() - (data.age || 25);
    const dob = `${birthYear}-01-01`;

    // Create Patient via PatientService (auto-generates Patient ID, Health Card, and Wallet)
    const result = PatientService.createPatient({
      fullName: data.fullName.trim(),
      dob,
      age: data.age || 25,
      gender: data.gender || 'female',
      mobile: data.mobile?.trim() || primaryHead?.mobile || '+91 98000 00000',
      bloodGroup: data.bloodGroup || 'Unknown / Not Known',
      photoUrl: data.photoUrl || '/logo.jpg',
      address: primaryHead?.address || {
        villageArea: 'Kolkata Central',
        postOffice: 'Kolkata',
        policeStation: 'Behala',
        district: 'Kolkata',
        state: 'West Bengal',
        pinCode: '700034',
        fullAddress: 'Kolkata, West Bengal'
      },
      emergencyContact: {
        name: primaryHead?.fullName || 'Primary Cardholder',
        relationship: 'Head of Family',
        mobile: primaryHead?.mobile || '+91 98000 00000'
      },
      medicalInfo: {
        bloodGroup: data.bloodGroup || 'Unknown / Not Known',
        allergies: 'None recorded',
        importantNotes: `Covered under ${family.familyName} Family Shield`
      },
      membershipId,
      issueHealthCard: true
    });

    // Link into Family
    this.addMember(familyId, result.patient.id, data.relationship);

    AuditService.log('DEPENDENT_REGISTERED_AND_LINKED', 'family', `Auto-registered and linked dependent ${result.patient.fullName} (${result.patient.id}) to ${family.familyName}`, familyId);

    const updatedFamily = StorageService.getFamilies().find(f => f.id === familyId)!;
    return {
      patient: result.patient,
      card: result.card!,
      family: updatedFamily
    };
  }

  public static updateMember(familyId: string, patientId: string, relationship: string): FamilyGroup | null {
    const families = StorageService.getFamilies();
    const family = families.find(f => f.id === familyId);
    if (!family) return null;

    const member = family.members.find(m => m.patientId === patientId);
    if (!member) return null;

    member.relationship = relationship;
    family.updatedAt = new Date().toISOString();
    StorageService.saveFamilies(families);

    AuditService.log('FAMILY_MEMBER_UPDATED', 'family', `Updated relationship of patient ${patientId} to "${relationship}" in family ${family.familyName}`, familyId);
    return family;
  }

  public static removeMember(familyId: string, patientId: string): FamilyGroup | null {
    const families = StorageService.getFamilies();
    const family = families.find(f => f.id === familyId);
    if (!family) return null;

    if (family.primaryPatientId === patientId) {
      return null;
    }

    family.members = family.members.filter(m => m.patientId !== patientId);
    family.updatedAt = new Date().toISOString();
    StorageService.saveFamilies(families);

    const patients = StorageService.getPatients();
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      delete patient.familyId;
      delete patient.isFamilyHead;
      StorageService.savePatients(patients);
    }

    AuditService.log('FAMILY_MEMBER_REMOVED', 'family', `Removed patient ${patientId} from family ${family.familyName}`, familyId);
    return family;
  }

  public static deleteFamily(familyId: string): boolean {
    const families = StorageService.getFamilies();
    const index = families.findIndex(f => f.id === familyId);
    if (index === -1) return false;

    const deleted = families.splice(index, 1)[0];
    StorageService.saveFamilies(families);

    // Unlink all patients
    const patients = StorageService.getPatients();
    patients.forEach(p => {
      if (p.familyId === familyId) {
        delete p.familyId;
        delete p.isFamilyHead;
      }
    });
    StorageService.savePatients(patients);

    AuditService.log('FAMILY_DELETED', 'family', `Deleted Family Health Group ${deleted.familyName}`, familyId);
    return true;
  }
}