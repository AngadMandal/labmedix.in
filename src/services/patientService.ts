import { Patient, HealthCard, Wallet, FamilyGroup } from '../types';
import { StorageService } from './storage';
import { AuditService } from './auditService';
import { ApiSyncService } from './apiSyncService';
import { generatePatientId, generateCardNumber, generateVerificationCode, generateCardCvv, generateUuid, generateFamilyId } from '../utils/idGenerator';
import { DEFAULT_CARD_DESIGN } from '../constants/defaults';

export interface CreateFamilyMemberInput {
  fullName: string;
  relationship: string;
  dob?: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  bloodGroup: string;
  mobile?: string;
  photoUrl?: string;
  allergies?: string;
  chronicConditions?: string;
  issueCard: boolean; // Checkbox to issue separate Health Card for this member
}

export interface CreatePatientInput {
  fullName: string;
  dob: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  mobile: string;
  whatsapp?: string;
  email?: string;
  bloodGroup: string;
  photoUrl: string;
  portalPassword?: string;
  address: {
    villageArea: string;
    postOffice: string;
    policeStation: string;
    district: string;
    state: string;
    pinCode: string;
    fullAddress: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    mobile: string;
  };
  medicalInfo: {
    allergies?: string;
    importantNotes?: string;
    chronicConditions?: string;
    emergencyNotes?: string;
    bloodGroup: string;
  };
  maritalStatus?: string;
  occupation?: string;
  governmentIdType?: string;
  governmentIdNumber?: string;
  referral?: {
    source: string;
    name?: string;
    details?: string;
    contact?: string;
    cardNo?: string;
    doctorId?: string;
    notes?: string;
  };
  vitalsAtReg?: {
    bp?: string;
    pulse?: number;
    rbs?: string;
    spo2?: number;
    weight?: number;
    height?: number;
    bmi?: number;
  };
  membershipId: string;
  initialDeposit?: number;
  cardDesignPreset?: string;
  cardMaterial?: string;
  familyName?: string;
  familyMembers?: CreateFamilyMemberInput[];
}

export interface CreatePatientResult {
  patient: Patient;
  card: HealthCard;
  wallet: Wallet;
  familyGroup?: FamilyGroup;
  issuedFamilyCards: Array<{
    patient: Patient;
    card?: HealthCard;
    relationship: string;
  }>;
}

export class PatientService {
  public static getAll(includeDeleted = false): Patient[] {
    const patients = StorageService.getPatients();
    if (includeDeleted) return patients;
    return patients.filter(p => !p.isDeleted);
  }

  public static getById(id: string): Patient | undefined {
    return StorageService.getPatients().find(p => p.id === id);
  }

  public static getByCardNumber(cardNumber: string): Patient | undefined {
    const cards = StorageService.getCards();
    const card = cards.find(c => c.cardNumber.toUpperCase() === cardNumber.trim().toUpperCase());
    if (!card) return undefined;
    return this.getById(card.patientId);
  }

  public static createPatient(input: CreatePatientInput): CreatePatientResult {
    if (!input || !input.fullName || !input.fullName.trim()) {
      throw new Error('Patient Full Name is required for registration.');
    }
    if (!input.mobile || !input.mobile.trim()) {
      throw new Error('Patient Mobile Number is required for registration.');
    }

    const patients = StorageService.getPatients() || [];

    // Duplicate check: Prevent double-click registration within 10 seconds
    const tenSecondsAgo = Date.now() - 10000;
    const cleanMobileDigits = input.mobile.replace(/\D/g, '');
    const existingDuplicate = patients.find(p => 
      p.fullName.trim().toLowerCase() === input.fullName.trim().toLowerCase() && 
      p.mobile.replace(/\D/g, '') === cleanMobileDigits &&
      new Date(p.createdAt).getTime() > tenSecondsAgo
    );
    if (existingDuplicate) {
      throw new Error(`Duplicate Registration Blocked: Patient '${input.fullName}' was already registered just now with ID ${existingDuplicate.id}.`);
    }

    const cards = StorageService.getCards() || [];
    const wallets = StorageService.getWallets() || [];
    const memberships = StorageService.getMemberships() || [];
    const families = StorageService.getFamilies() || [];
    const currentUser = StorageService.getCurrentUser();

    // 1. Generate Next Patient ID safely
    const usedPatientIds = new Set(patients.map(p => p.id));
    const patientId = generatePatientId(Array.from(usedPatientIds));
    usedPatientIds.add(patientId);

    // 2. Setup Wallet for Primary Patient
    const walletId = `wal_${generateUuid().slice(0, 8)}`;
    const depositAmount = input.initialDeposit || 0;
    const newWallet: Wallet = {
      id: walletId,
      patientId,
      balance: depositAmount,
      totalCredits: depositAmount,
      totalDebits: 0,
      status: 'active',
      companyId: 'LABMEDIX-MAIN-CLINIC',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    wallets.push(newWallet);
    StorageService.saveWallets(wallets);

    if (depositAmount > 0) {
      const txns = StorageService.getTransactions() || [];
      txns.unshift({
        id: `txn_${generateUuid().slice(0, 8)}`,
        walletId,
        patientId,
        type: 'credit',
        amount: depositAmount,
        openingBalance: 0,
        closingBalance: depositAmount,
        referenceNo: `INIT-${Date.now().toString(36).toUpperCase()}`,
        notes: 'Initial Wallet Balance Deposit during registration',
        date: new Date().toISOString(),
        createdBy: currentUser?.fullName || 'Super Administrator'
      });
      StorageService.saveTransactions(txns);
    }

    // 3. Create Health Card for Primary Patient with foolproof membership fallback
    const defaultMembership = {
      id: 'mem_gold',
      name: 'Gold Health Shield',
      slug: 'gold',
      validityMonths: 12,
      opdDiscount: 20,
      labDiscount: 25,
      pharmacyDiscount: 15,
      homeCollectionDiscount: 50,
      price: 999,
      status: 'active'
    };
    const selectedMembership = memberships.find(m => m.id === input.membershipId) || memberships[0] || defaultMembership;
    
    const usedCardNumbers = new Set(cards.map(c => c.cardNumber));
    const cardNumber = generateCardNumber(Array.from(usedCardNumbers));
    usedCardNumbers.add(cardNumber);

    const cardId = `card_${generateUuid().slice(0, 8)}`;
    const now = new Date();
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + (selectedMembership.validityMonths || 12));

    const primaryPreset = input.cardDesignPreset || (
      selectedMembership.slug === 'platinum' ? 'platinum_elite' :
      selectedMembership.slug === 'gold' ? 'royal_gold' :
      selectedMembership.slug === 'silver' ? 'emerald_health' : 'executive_navy'
    );

    const initialStatus = 'active';

    const newCard: HealthCard = {
      id: cardId,
      cardNumber,
      patientId,
      membershipId: selectedMembership.id,
      issueDate: now.toISOString().split('T')[0],
      expiryDate: expiry.toISOString().split('T')[0],
      status: initialStatus,
      isDemo: false,
      cvv: generateCardCvv(),
      verificationCode: generateVerificationCode(),
      designConfig: {
        ...DEFAULT_CARD_DESIGN,
        preset: primaryPreset as any,
        material: (input.cardMaterial as any) || 'metallic'
      },
      statusHistory: [
        {
          id: generateUuid(),
          cardId,
          date: now.toISOString(),
          previousStatus: 'active',
          newStatus: initialStatus,
          changedBy: currentUser?.fullName || 'Super Administrator',
          reason: `Initial card generation for ${selectedMembership.name}`
        }
      ],
      renewedCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    cards.push(newCard);

    // 4. Multi-Family Setup if Family Members are provided
    let familyGroup: FamilyGroup | undefined;
    const issuedFamilyCards: Array<{
      patient: Patient;
      card?: HealthCard;
      relationship: string;
    }> = [];

    const hasFamily = Boolean(input.familyMembers && input.familyMembers.length > 0);
    let familyId: string | undefined;

    if (hasFamily) {
      familyId = generateFamilyId(families.map(f => f.id));
      const familyName = input.familyName?.trim() || `${input.fullName.trim()}'s Family Shield`;
      familyGroup = {
        id: familyId,
        familyName,
        primaryPatientId: patientId,
        members: [
          {
            patientId,
            relationship: 'Primary Member (Head)',
            isPrimary: true
          }
        ],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
    }

    // 5. Create Primary Patient Record
    const newPatient: Patient = {
      id: patientId,
      fullName: input.fullName.trim(),
      dob: input.dob,
      age: input.age,
      gender: input.gender,
      mobile: input.mobile.trim(),
      whatsapp: input.whatsapp?.trim() || input.mobile.trim(),
      email: input.email?.trim() || '',
      bloodGroup: input.bloodGroup,
      photoUrl: input.photoUrl || '/logo.jpg',
      address: input.address,
      emergencyContact: input.emergencyContact,
      medicalInfo: input.medicalInfo,
      portalPassword: input.portalPassword,
      maritalStatus: input.maritalStatus,
      occupation: input.occupation,
      governmentIdType: input.governmentIdType,
      governmentIdNumber: input.governmentIdNumber,
      referral: input.referral,
      vitalsAtReg: input.vitalsAtReg,
      familyId,
      isFamilyHead: hasFamily ? true : undefined,
      healthCardId: cardId,
      walletId,
      isDemo: false,
      isDeleted: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      createdBy: currentUser?.fullName || 'Front Desk'
    };
    patients.unshift(newPatient);

    // 6. Process & Register Family Members (with Optional Card Issuance)
    if (hasFamily && familyGroup && input.familyMembers) {
      input.familyMembers.forEach((member, index) => {
        if (!member.fullName?.trim()) return;

        const memberPatientId = generatePatientId(Array.from(usedPatientIds));
        usedPatientIds.add(memberPatientId);

        // Member wallet
        const memberWalletId = `wal_${generateUuid().slice(0, 8)}`;
        const memberWallet: Wallet = {
          id: memberWalletId,
          patientId: memberPatientId,
          balance: 0,
          totalCredits: 0,
          totalDebits: 0,
          status: 'active',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        };
        wallets.push(memberWallet);

        let memberCard: HealthCard | undefined;
        let memberCardId: string | undefined;

        // If checkbox `issueCard` is true, issue individual Health Card
        if (member.issueCard) {
          const memberCardNumber = generateCardNumber(Array.from(usedCardNumbers));
          usedCardNumbers.add(memberCardNumber);
          memberCardId = `card_${generateUuid().slice(0, 8)}`;

          memberCard = {
            id: memberCardId,
            cardNumber: memberCardNumber,
            patientId: memberPatientId,
            membershipId: selectedMembership.id,
            issueDate: now.toISOString().split('T')[0],
            expiryDate: expiry.toISOString().split('T')[0],
            status: 'active',
            cvv: generateCardCvv(),
            verificationCode: generateVerificationCode(),
            designConfig: {
              ...DEFAULT_CARD_DESIGN,
              preset: primaryPreset as any,
              material: (input.cardMaterial as any) || 'gloss',
              showFamilyBadge: true
            },
            statusHistory: [
              {
                id: generateUuid(),
                cardId: memberCardId,
                date: now.toISOString(),
                previousStatus: 'active',
                newStatus: 'active',
                changedBy: currentUser?.fullName || 'System',
                reason: `Issued family health card under ${familyGroup?.familyName}`
              }
            ],
            renewedCount: 0,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          };
          cards.push(memberCard);
        }

        // Calculate approximate DOB if not provided
        let memberDob = member.dob;
        if (!memberDob) {
          const birthYear = new Date().getFullYear() - (member.age || 20);
          memberDob = `${birthYear}-01-01`;
        }

        const memberPatient: Patient = {
          id: memberPatientId,
          fullName: member.fullName.trim(),
          dob: memberDob,
          age: member.age || 20,
          gender: member.gender || 'male',
          mobile: member.mobile?.trim() || input.mobile.trim(),
          whatsapp: member.mobile?.trim() || input.whatsapp?.trim() || input.mobile.trim(),
          email: '',
          bloodGroup: member.bloodGroup || 'B+',
          photoUrl: member.photoUrl || '/logo.jpg',
          address: input.address,
          emergencyContact: {
            name: input.fullName.trim(),
            relationship: 'Head of Family',
            mobile: input.mobile.trim()
          },
          medicalInfo: {
            allergies: member.allergies || 'None',
            chronicConditions: member.chronicConditions || 'None',
            importantNotes: `Covered under ${familyGroup?.familyName}`,
            bloodGroup: member.bloodGroup || 'B+'
          },
          familyId,
          isFamilyHead: false,
          healthCardId: memberCardId,
          walletId: memberWalletId,
          isDeleted: false,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          createdBy: currentUser?.fullName || 'Front Desk'
        };

        patients.unshift(memberPatient);

        // Add to family group members list
        familyGroup?.members.push({
          patientId: memberPatientId,
          relationship: member.relationship || 'Dependent',
          isPrimary: false
        });

        issuedFamilyCards.push({
          patient: memberPatient,
          card: memberCard,
          relationship: member.relationship || 'Dependent'
        });
      });

      families.push(familyGroup);
      StorageService.saveFamilies(families);
    }

    // Save Cards, Wallets, and Patients locally
    StorageService.saveCards(cards);
    StorageService.saveWallets(wallets);
    StorageService.savePatients(patients);

    // Direct atomic sync to Central Firestore for instant multi-device reflection
    ApiSyncService.saveDocument('patients', newPatient.id, newPatient).catch(() => {});
    ApiSyncService.saveDocument('cards', newCard.id, newCard).catch(() => {});
    ApiSyncService.saveDocument('wallets', newWallet.id, newWallet).catch(() => {});
    if (familyGroup) {
      ApiSyncService.saveDocument('families', familyGroup.id, familyGroup).catch(() => {});
    }
    issuedFamilyCards.forEach(item => {
      if (item.patient) ApiSyncService.saveDocument('patients', item.patient.id, item.patient).catch(() => {});
      if (item.card) ApiSyncService.saveDocument('cards', item.card.id, item.card).catch(() => {});
    });

    const refNote = input.referral?.source && input.referral.source !== 'none' 
      ? ` | Referred by: ${input.referral.source.toUpperCase()} (${input.referral.name || input.referral.details || 'N/A'})`
      : '';
    const famNote = hasFamily ? ` | Family Shield: ${familyGroup?.familyName} (+${issuedFamilyCards.length} members)` : '';

    AuditService.log(
      'PATIENT_REGISTERED',
      'patient',
      `Registered patient ${newPatient.fullName} (ID: ${patientId}, Card: ${cardNumber}, Membership: ${selectedMembership.name})${refNote}${famNote}`,
      patientId
    );

    return {
      patient: newPatient,
      card: newCard,
      wallet: newWallet,
      familyGroup,
      issuedFamilyCards
    };
  }

  public static updatePatient(id: string, updates: Partial<Patient>): Patient | null {
    const patients = StorageService.getPatients();
    const index = patients.findIndex(p => p.id === id);
    if (index === -1) return null;

    const updated = {
      ...patients[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    patients[index] = updated;
    StorageService.savePatients(patients);
    ApiSyncService.saveDocument('patients', id, updated).catch(() => {});

    AuditService.log('PATIENT_UPDATED', 'patient', `Updated details for ${updated.fullName}`, id);
    return updated;
  }

  public static softDelete(id: string): boolean {
    const patients = StorageService.getPatients();
    const index = patients.findIndex(p => p.id === id);
    if (index === -1) return false;

    const currentUser = StorageService.getCurrentUser();
    patients[index].isDeleted = true;
    patients[index].deletedAt = new Date().toISOString();
    patients[index].deletedBy = currentUser?.fullName || 'Admin';
    StorageService.savePatients(patients);
    ApiSyncService.saveDocument('patients', id, patients[index]).catch(() => {});

    AuditService.log('PATIENT_DELETED', 'patient', `Soft deleted patient ${patients[index].fullName}`, id);
    return true;
  }

  public static restore(id: string): boolean {
    const patients = StorageService.getPatients();
    const index = patients.findIndex(p => p.id === id);
    if (index === -1) return false;

    patients[index].isDeleted = false;
    delete patients[index].deletedAt;
    delete patients[index].deletedBy;
    StorageService.savePatients(patients);
    ApiSyncService.saveDocument('patients', id, patients[index]).catch(() => {});

    AuditService.log('PATIENT_RESTORED', 'patient', `Restored soft-deleted patient ${patients[index].fullName}`, id);
    return true;
  }

  public static permanentDelete(id: string): boolean {
    const patients = StorageService.getPatients();
    const index = patients.findIndex(p => p.id === id);
    if (index === -1) return false;

    const patient = patients.splice(index, 1)[0];
    StorageService.savePatients(patients);

    // Hard delete in Firestore and record in WAL
    ApiSyncService.deleteDocument('patients', id).catch(() => {});

    AuditService.log('PATIENT_PERMANENTLY_PURGED', 'patient', `Permanently purged patient ${patient.fullName} (ID: ${id}) from all records`, id);
    return true;
  }
}