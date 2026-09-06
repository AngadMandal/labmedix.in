import { HealthCard, CardStatus, CardDesignConfig, VerificationResult } from '../types';
import { StorageService } from './storage';
import { AuditService } from './auditService';
import { generateCardNumber, generateVerificationCode, generateCardCvv, generateUuid } from '../utils/idGenerator';
import { maskCardNumber, maskPatientId } from '../utils/formatters';
import { ApiSyncService } from './apiSyncService';

export class CardService {

  private static sanitizeCards(cards: HealthCard[]): HealthCard[] {
    const currentUser = StorageService.getCurrentUser();
    if (currentUser?.role === 'super_admin') return cards;
    
    // Test 3 & 8: Staff calls CVV API -> 403 / Redacted CVV
    return cards.map(c => ({
      ...c,
      cvv: '***',
      verificationCode: '***' // Hide verification code as well
    }));
  }

  private static sanitizeCard(card: HealthCard | undefined): HealthCard | undefined {
    if (!card) return undefined;
    return this.sanitizeCards([card])[0];
  }

  public static getAll(includeDeleted: boolean = false): HealthCard[] {
    const cards = StorageService.getCards();
    if (includeDeleted) return this.sanitizeCards(cards);
    return this.sanitizeCards(cards.filter(c => !c.isDeleted && c.status !== 'deleted'));
  }

  public static getById(id: string): HealthCard | undefined {
    return this.sanitizeCard(StorageService.getCards().find(c => c.id === id));
  }

  public static getByCardNumber(cardNumber: string): HealthCard | undefined {
    return StorageService.getCards().find(c => c.cardNumber.toUpperCase() === cardNumber.trim().toUpperCase());
  }

  public static getByPatientId(patientId: string): HealthCard | undefined {
    return StorageService.getCards().find(c => c.patientId === patientId && c.status !== 'replaced' && !c.isDeleted && c.status !== 'deleted');
  }

  public static getByVerificationCode(code: string): HealthCard | undefined {
    return StorageService.getCards().find(c => c.verificationCode.toUpperCase() === code.trim().toUpperCase());
  }

  public static updateDesign(id: string, designConfig: CardDesignConfig): HealthCard | null {
    const cards = StorageService.getCards();
    const card = cards.find(c => c.id === id);
    if (!card) return null;

    card.designConfig = { ...card.designConfig, ...designConfig };
    card.updatedAt = new Date().toISOString();
    StorageService.saveCards(cards);

    AuditService.log('CARD_DESIGN_UPDATED', 'card', `Updated design for Card ${card.cardNumber}`, card.id);
    return card;
  }

  public static changeStatus(id: string, newStatus: CardStatus, reason: string, userRole?: string): HealthCard | null {
    const cards = StorageService.getCards();
    const card = cards.find(c => c.id === id);
    if (!card) return null;

    const currentUser = StorageService.getCurrentUser();
    const activeRole = userRole || currentUser?.role;

    // Security Gate: Only Super Admin can activate, deactivate, suspend, block, or cancel cards
    if (activeRole !== 'super_admin') {
      throw new Error('SECURITY VIOLATION: Only Super Administrator is authorized to Activate, Deactivate, Block, or Change Health Card Status.');
    }

    const prevStatus = card.status;
    card.status = newStatus;
    card.updatedAt = new Date().toISOString();
    card.statusHistory.unshift({
      id: generateUuid(),
      cardId: card.id,
      date: new Date().toISOString(),
      previousStatus: prevStatus,
      newStatus,
      changedBy: currentUser?.fullName || 'Super Administrator',
      reason: reason || `Status changed from ${prevStatus} to ${newStatus}`
    });
    StorageService.saveCards(cards);
    ApiSyncService.saveDocument('cards', card.id, card).catch(() => {});

    AuditService.log('CARD_STATUS_CHANGED', 'card', `Super Admin changed Card ${card.cardNumber} status: ${prevStatus} -> ${newStatus} (${reason})`, card.id);
    return card;
  }

  public static editCard(
    id: string,
    updates: Partial<HealthCard>,
    userRole: string = 'super_admin'
  ): { success: boolean; card?: HealthCard; error?: string } {
    if (userRole !== 'super_admin') {
      return { success: false, error: 'SECURITY VIOLATION: Only Super Administrator is authorized to edit Health Card details or change Membership Tier assignments.' };
    }

    const cards = StorageService.getCards();
    const card = cards.find(c => c.id === id);
    if (!card) return { success: false, error: 'Health Card not found.' };

    const previousValue = { ...card };
    Object.assign(card, updates, { updatedAt: new Date().toISOString() });
    StorageService.saveCards(cards);
    ApiSyncService.saveDocument('cards', card.id, card).catch(() => {});

    AuditService.log(
      'CARD_EDITED_BY_SUPER_ADMIN',
      'card',
      `Super Admin edited Health Card ${card.cardNumber} (Membership Tier / Details updated)`,
      card.id,
      { previousValue, newValue: card }
    );

    return { success: true, card };
  }

  /**
   * Super-Admin Secure Delete & Archiving Mechanism
   * Issued cards can ONLY be deleted by users with 'super_admin' role.
   * If permanent is true: Completely removes card from storage and unlinks it.
   * If permanent is false (Soft Delete): Marks card as cancelled/deleted with timestamp, revokes cardholder access, and enables a 30-day retention restoration window.
   */
  public static deleteCard(
    id: string,
    reason: string = 'Administrative Card Revocation',
    permanent: boolean = false,
    userRole: string = 'super_admin',
    userName: string = 'Super Administrator'
  ): { success: boolean; error?: string; permanent?: boolean; card?: HealthCard } {
    const cards = StorageService.getCards();
    const cardIndex = cards.findIndex(c => c.id === id);
    if (cardIndex === -1) {
      return { success: false, error: 'Health Card not found in database.' };
    }

    const card = cards[cardIndex];

    // Security Gate: Issued cards can ONLY be deleted by Super Administrator
    const isIssued = card.status === 'active' || card.status === 'expired' || card.status === 'suspended' || card.status === 'replaced';
    if (isIssued && userRole !== 'super_admin') {
      return {
        success: false,
        error: 'Permission Denied: Issued Health Cards are legally binding credentials and can ONLY be deleted or permanently revoked by a Super Administrator.'
      };
    }

    const now = new Date().toISOString();

    if (permanent) {
      // 1. Hard Permanent Delete: Remove completely across all storage records
      cards.splice(cardIndex, 1);
      StorageService.saveCards(cards);

      // Cloud Firestore Permanent Deletion with Zero-Data-Loss WAL Protection
      ApiSyncService.deleteDocument('cards', card.id).catch(() => {});

      // Unlink active healthCardId from Patient Master Record
      const patients = StorageService.getPatients();
      const patient = patients.find(p => p.id === card.patientId || p.healthCardId === card.id);
      if (patient && patient.healthCardId === card.id) {
        patient.healthCardId = undefined;
        patient.updatedAt = now;
        StorageService.savePatients(patients);
      }

      AuditService.log(
        'SUPER_ADMIN_PERMANENT_CARD_PURGED',
        'card',
        `SUPER ADMIN PERMANENT PURGE: Card ${card.cardNumber} (Patient ID: ${card.patientId}) was permanently expunged from all records. Reason: ${reason}`,
        card.id
      );

      return { success: true, permanent: true };
    } else {
      // 2. Soft Delete / Revoke: Mark deleted and revoke all cardholder access with 30-day retention
      const prevStatus = card.status;
      card.isDeleted = true;
      card.status = 'cancelled';
      card.deletedAt = now;
      card.deletedBy = userName;
      card.deleteReason = reason;
      card.updatedAt = now;

      card.statusHistory.unshift({
        id: generateUuid(),
        cardId: card.id,
        date: now,
        previousStatus: prevStatus,
        newStatus: 'cancelled',
        changedBy: userName,
        reason: `[SUPER ADMIN ARCHIVED / REVOKED] ${reason}`
      });

      StorageService.saveCards(cards);
      ApiSyncService.saveDocument('cards', card.id, card).catch(() => {});

      AuditService.log(
        'CARD_REVOKED_ARCHIVED',
        'card',
        `Card ${card.cardNumber} (Patient: ${card.patientId}) revoked and archived by ${userName}. Reason: ${reason}. (30-Day Retention Clock Started)`,
        card.id
      );

      return { success: true, permanent: false, card };
    }
  }

  /**
   * Restore an archived/soft-deleted card within the 30-day (1-month) retention window.
   * If the deletion occurred more than 30 days ago, restoration is permanently locked.
   */
  public static restoreCard(
    id: string,
    restoredBy: string = 'Administrator'
  ): { success: boolean; error?: string; card?: HealthCard } {
    const cards = StorageService.getCards();
    const card = cards.find(c => c.id === id);
    if (!card) {
      return { success: false, error: 'Health Card not found.' };
    }

    if (!card.isDeleted && card.status !== 'cancelled' && card.status !== 'deleted') {
      return { success: false, error: 'This card is not in the archived / deleted queue.' };
    }

    // 1-Month (30 Days) Retention Rule Check
    const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
    const deletedTimestamp = card.deletedAt ? new Date(card.deletedAt).getTime() : 0;
    const currentTimestamp = Date.now();

    if (deletedTimestamp && (currentTimestamp - deletedTimestamp > ONE_MONTH_MS)) {
      return {
        success: false,
        error: `Retention Time Limit Exceeded: This Health Card was archived on ${new Date(card.deletedAt!).toLocaleDateString()} (more than 30 days ago). In accordance with data retention compliance, expired deleted credentials cannot be restored or rolled back.`
      };
    }

    const now = new Date().toISOString();
    const prevStatus = card.status;
    card.isDeleted = false;
    card.status = 'active';
    card.deletedAt = undefined;
    card.deletedBy = undefined;
    card.deleteReason = undefined;
    card.updatedAt = now;

    card.statusHistory.unshift({
      id: generateUuid(),
      cardId: card.id,
      date: now,
      previousStatus: prevStatus,
      newStatus: 'active',
      changedBy: restoredBy,
      reason: `Card restored and reactivated by ${restoredBy} within 30-day retention window.`
    });

    StorageService.saveCards(cards);
    ApiSyncService.saveDocument('cards', card.id, card).catch(() => {});

    // Re-link patient active healthCardId
    const patients = StorageService.getPatients();
    const patient = patients.find(p => p.id === card.patientId);
    if (patient) {
      patient.healthCardId = card.id;
      patient.updatedAt = now;
      StorageService.savePatients(patients);
    }

    AuditService.log(
      'CARD_RESTORED',
      'card',
      `Card ${card.cardNumber} (Patient: ${card.patientId}) restored to Active by ${restoredBy}. Cardholder portal access reinstated.`,
      card.id
    );

    return { success: true, card };
  }

  public static renewCard(id: string, additionalMonths = 12, feeCollected = 0): { card: HealthCard; error?: string } {
    const cards = StorageService.getCards();
    const card = cards.find(c => c.id === id);
    if (!card) return { card: null as any, error: 'Card not found' };

    const currentUser = StorageService.getCurrentUser();
    const currentExpiry = new Date(card.expiryDate);
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    baseDate.setMonth(baseDate.getMonth() + additionalMonths);

    const prevExpiry = card.expiryDate;
    card.expiryDate = baseDate.toISOString().split('T')[0];
    card.status = 'active';
    card.isDeleted = false;
    card.renewedCount = (card.renewedCount || 0) + 1;
    card.lastRenewedAt = new Date().toISOString();
    card.updatedAt = new Date().toISOString();

    card.statusHistory.unshift({
      id: generateUuid(),
      cardId: card.id,
      date: new Date().toISOString(),
      previousStatus: card.status,
      newStatus: 'active',
      changedBy: currentUser?.fullName || 'Front Desk',
      reason: `Card renewed for ${additionalMonths} months. Valid until ${card.expiryDate}. (Fee: ₹${feeCollected})`
    });

    StorageService.saveCards(cards);
    ApiSyncService.saveDocument('cards', card.id, card).catch(() => {});
    AuditService.log('CARD_RENEWED', 'card', `Card ${card.cardNumber} renewed until ${card.expiryDate} (Previous: ${prevExpiry})`, card.id);

    return { card };
  }

  public static replaceCard(oldCardId: string, reason: string, fee = 100): { oldCard: HealthCard; newCard: HealthCard } | null {
    const cards = StorageService.getCards();
    const oldCard = cards.find(c => c.id === oldCardId);
    if (!oldCard) return null;

    const currentUser = StorageService.getCurrentUser();
    const now = new Date().toISOString();

    // Mark old card as replaced
    oldCard.status = 'replaced';
    oldCard.replacementReason = reason;
    oldCard.updatedAt = now;

    // Generate new card
    const existingCardNumbers = cards.map(c => c.cardNumber);
    const newCardNumber = generateCardNumber(existingCardNumbers);
    const newCardId = `card_${generateUuid().slice(0, 8)}`;

    const newCard: HealthCard = {
      id: newCardId,
      cardNumber: newCardNumber,
      patientId: oldCard.patientId,
      membershipId: oldCard.membershipId,
      issueDate: now.split('T')[0],
      expiryDate: oldCard.expiryDate,
      status: 'active',
      cvv: generateCardCvv(),
      verificationCode: generateVerificationCode(),
      designConfig: { ...oldCard.designConfig },
      replacesCardId: oldCard.id,
      renewedCount: oldCard.renewedCount || 0,
      statusHistory: [
        {
          id: generateUuid(),
          cardId: newCardId,
          date: now,
          previousStatus: 'active',
          newStatus: 'active',
          changedBy: currentUser?.fullName || 'Operator',
          reason: `Replaced card ${oldCard.cardNumber}. Reason: ${reason}`
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    oldCard.replacedByCardId = newCardId;
    oldCard.statusHistory.unshift({
      id: generateUuid(),
      cardId: oldCard.id,
      date: now,
      previousStatus: 'active',
      newStatus: 'replaced',
      changedBy: currentUser?.fullName || 'Operator',
      reason: `Card replaced by ${newCardNumber}. Reason: ${reason}`
    });

    cards.unshift(newCard);
    StorageService.saveCards(cards);
    ApiSyncService.saveDocument('cards', newCard.id, newCard).catch(() => {});
    ApiSyncService.saveDocument('cards', oldCard.id, oldCard).catch(() => {});

    // Update patient's active healthCardId
    const patients = StorageService.getPatients();
    const patient = patients.find(p => p.id === oldCard.patientId);
    if (patient) {
      patient.healthCardId = newCardId;
      patient.updatedAt = now;
      StorageService.savePatients(patients);
    }

    AuditService.log('CARD_REPLACED', 'card', `Replaced ${oldCard.cardNumber} with ${newCardNumber}. Reason: ${reason}`, newCardId);

    return { oldCard, newCard };
  }

  public static verifyCard(verificationCode: string): VerificationResult {
    const company = StorageService.getCompanyProfile();

    if (!verificationCode) {
      return {
        verified: false,
        cardStatus: 'not_found',
        message: 'No verification key provided.',
        verificationCode: '',
        company
      };
    }

    // Clean up input in case a full verification URL was scanned or pasted
    let cleanCode = verificationCode.trim();
    if (cleanCode.includes('/verify/')) {
      cleanCode = cleanCode.split('/verify/').pop()?.split('?')[0] || cleanCode;
    }
    cleanCode = cleanCode.replace(/[^a-zA-Z0-9\-_:]/g, '').toUpperCase();

    const nowIso = new Date().toISOString();

    // 1. Check Staff Employee Passes first
    const users = StorageService.getUsers();
    const staff = users.find(
      u =>
        (u.staffId && u.staffId.toUpperCase() === cleanCode) ||
        u.id.toUpperCase() === cleanCode ||
        u.username.toUpperCase() === cleanCode ||
        (u.email && u.email.toUpperCase() === cleanCode) ||
        cleanCode.includes(u.username.toUpperCase())
    );

    if (staff) {
      const isStaffActive = staff.status === 'active';
      return {
        verified: isStaffActive,
        type: 'staff_pass',
        cardStatus: isStaffActive ? 'active' : 'suspended',
        message: isStaffActive
          ? 'Official & Certified LABMEDIX Healthcare Staff Digital Credential'
          : 'This Staff Account has been deactivated. Facility access is restricted.',
        verificationCode: staff.staffId || staff.id,
        staff: {
          id: staff.id,
          staffId: staff.staffId || `LMDX-STF-${staff.id.slice(-3).toUpperCase()}`,
          fullName: staff.fullName,
          username: staff.username,
          role: staff.role,
          designation: staff.designation || 'Staff Officer',
          department: staff.department || 'Operations',
          accessZone: staff.accessZone || 'Zone A: Standard Clinical Access',
          nationalId: staff.nationalId,
          licenseNo: staff.licenseNo,
          bloodGroup: staff.bloodGroup,
          photoUrl: staff.photoUrl,
          status: staff.status,
          email: staff.email,
          phone: staff.phone,
          workPhone: staff.workPhone,
          emergencyContact: staff.emergencyContact,
          emergencyContactName: staff.emergencyContactName,
          joiningDate: staff.joiningDate || staff.createdAt,
          cardThemeWish: staff.cardThemeWish,
          cardMaterialWish: staff.cardMaterialWish
        },
        issueDate: staff.joiningDate || staff.createdAt,
        expiryDate: staff.expiryDate || '2028-12-31T23:59:59.000Z',
        company
      };
    }

    // 2. Check Patient Health Cards (by verificationCode, cardNumber, cardId, or patientId)
    const cards = StorageService.getCards();
    const patients = StorageService.getPatients();

    let card = cards.find(
      c =>
        c.verificationCode.toUpperCase() === cleanCode ||
        c.cardNumber.toUpperCase().replace(/\s+/g, '') === cleanCode.replace(/\s+/g, '') ||
        c.id.toUpperCase() === cleanCode
    );

    // If not found by card direct identifier, check if code is patientId
    if (!card) {
      const matchedPatient = patients.find(p => p.id.toUpperCase() === cleanCode);
      if (matchedPatient && matchedPatient.healthCardId) {
        card = cards.find(c => c.id === matchedPatient.healthCardId);
      }
    }

    if (!card) {
      return {
        verified: false,
        cardStatus: 'not_found',
        message: 'No active LABMEDIX Health Card or Staff Pass found for this QR code / verification key.',
        verificationCode: cleanCode,
        company
      };
    }

    const patient = patients.find(p => p.id === card?.patientId);
    const memberships = StorageService.getMemberships();
    const membership = memberships.find(m => m.id === card?.membershipId);

    // If card is deleted or patient is deleted -> access is completely restricted
    if (card.isDeleted || card.status === 'cancelled' || card.status === 'deleted' || patient?.isDeleted) {
      return {
        verified: false,
        type: 'health_card',
        cardStatus: 'cancelled',
        message: 'This Health Card has been revoked / archived by Hospital Administration. Cardholder access and cashless benefits are permanently restricted.',
        verificationCode: card.verificationCode,
        card,
        company
      };
    }

    const isExpired = new Date(card.expiryDate) < new Date();
    const effectiveStatus: CardStatus = isExpired && card.status === 'active' ? 'expired' : card.status;

    let msg = 'Valid & Certified LABMEDIX Digital Health Card';
    if (effectiveStatus === 'expired') msg = 'Health Card has expired. Renewal required for cashless OPD/Lab discounts.';
    if (effectiveStatus === 'suspended') msg = 'Health Card is currently frozen / suspended. Please contact LABMEDIX Helpdesk.';
    if (effectiveStatus === 'replaced') msg = 'This Health Card has been replaced with a newer credential.';
    if (effectiveStatus === 'lost') msg = 'Health Card is flagged as lost.';

    return {
      verified: effectiveStatus === 'active',
      type: 'health_card',
      cardStatus: effectiveStatus,
      message: msg,
      verificationCode: card.verificationCode,
      card,
      patient: patient ? {
        fullName: patient.fullName,
        maskedPatientId: maskPatientId(patient.id),
        maskedCardNumber: maskCardNumber(card.cardNumber),
        bloodGroup: patient.bloodGroup,
        gender: patient.gender,
        age: patient.age,
        photoUrl: patient.photoUrl
      } : undefined,
      membership: membership ? {
        name: membership.name,
        color: membership.color,
        opdDiscount: membership.opdDiscount,
        labDiscount: membership.labDiscount,
        pharmacyDiscount: membership.pharmacyDiscount,
        homeCollectionDiscount: membership.homeCollectionDiscount,
        specialBenefits: membership.specialBenefits
      } : undefined,
      issueDate: card.issueDate,
      expiryDate: card.expiryDate,
      company
    };
  }
}