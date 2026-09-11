import { Patient, HealthCard, Membership, CardStatus } from '../types';
import { StorageService } from './storage';
import { DEFAULT_MEMBERSHIPS } from '../constants/memberships';

export type PatientCardStatusType =
  | 'no_card'
  | 'card_requested'
  | 'pending_approval'
  | 'active'
  | 'expired'
  | 'suspended'
  | 'cancelled';

export interface PatientBenefitStatus {
  hasActiveCard: boolean;
  effectiveStatus: PatientCardStatusType;
  statusLabel: string;
  badgeLabel: string;
  statusColor: 'emerald' | 'amber' | 'rose' | 'slate' | 'orange';
  card?: HealthCard;
  cardNumber?: string;
  planName?: string;
  membership?: Membership;
  isFamilyCovered: boolean;
  primaryCardholder?: Patient;
  discounts: {
    opdDiscount: number;
    labDiscount: number;
    pharmacyDiscount: number;
    ipdDiscount: number;
    homeCollectionDiscount: number;
  };
  policyNote: string;
}

export interface ServiceChargeCalculationInput {
  patientId: string;
  serviceCategory: 'opd' | 'lab' | 'pharmacy' | 'ipd' | 'home_collection' | 'general';
  grossAmount: number;
}

export interface ServiceChargeCalculationResult {
  grossAmount: number;
  discountPct: number;
  discountAmount: number;
  netPayable: number;
  hasActiveCard: boolean;
  status: PatientCardStatusType;
  planName?: string;
  isFamilyCovered: boolean;
  verificationBadge: string;
  ruleExplanation: string;
}

export class CardBenefitService {
  /**
   * Evaluates the authoritative Card Benefit status for any patient.
   * Handles:
   * 1. Direct cardholders
   * 2. Family members covered under a primary cardholder's Family Health Shield
   * 3. Card validity, expiration, and status checks (only 'active' gets benefits)
   * 4. Non-card patients (standard hospital pricing, 0% discount)
   */
  public static getPatientCardBenefitStatus(
    patientId: string,
    cardsOverride?: HealthCard[],
    membershipsOverride?: Membership[]
  ): PatientBenefitStatus {
    const patients = StorageService.getPatients();
    const patient = patients.find(p => p.id === patientId);

    const defaultNoCard: PatientBenefitStatus = {
      hasActiveCard: false,
      effectiveStatus: 'no_card',
      statusLabel: 'No Card (Non-Card Patient)',
      badgeLabel: 'No Card (Standard Pricing)',
      statusColor: 'slate',
      isFamilyCovered: false,
      discounts: {
        opdDiscount: 0,
        labDiscount: 0,
        pharmacyDiscount: 0,
        ipdDiscount: 0,
        homeCollectionDiscount: 0
      },
      policyNote: 'Non-Card Patient: Standard hospital tariffs applicable. No Health Card discounts.'
    };

    if (!patient) {
      return defaultNoCard;
    }

    const cards = cardsOverride || StorageService.getCards();
    const memberships = membershipsOverride || StorageService.getMemberships() || DEFAULT_MEMBERSHIPS;
    const families = StorageService.getFamilies() || [];

    // 1. Direct Card Search
    let card = patient.healthCardId
      ? cards.find(c => c.id === patient.healthCardId && !c.isDeleted)
      : cards.find(c => c.patientId === patient.id && !c.isDeleted && (c.status as string) !== 'replaced');

    let isFamilyCovered = false;
    let primaryCardholder: Patient | undefined = undefined;

    // 2. Family Shield Check if patient has no direct active card
    if (!card || card.status !== 'active') {
      const familyGroup = families.find(f =>
        f.members.some(m => m.patientId === patient.id)
      );

      if (familyGroup && familyGroup.primaryPatientId !== patient.id) {
        const primaryPatient = patients.find(p => p.id === familyGroup.primaryPatientId);
        if (primaryPatient) {
          const primaryCard = cards.find(
            c => (c.id === primaryPatient.healthCardId || c.patientId === primaryPatient.id) &&
                 !c.isDeleted && c.status === 'active'
          );

          if (primaryCard) {
            card = primaryCard;
            isFamilyCovered = true;
            primaryCardholder = primaryPatient;
          }
        }
      }
    }

    // 3. Pending Application / Request Check
    if (!card) {
      const cardApps = StorageService.getItem<any[]>('labmedix_portal_card_applications_v1', []);
      const pendingApp = cardApps.find(
        a => (a.patientId === patient.id || a.mobile === patient.mobile) &&
             ['submitted', 'under_review', 'pending_approval', 'info_required'].includes(a.status)
      );

      if (pendingApp) {
        return {
          hasActiveCard: false,
          effectiveStatus: 'pending_approval',
          statusLabel: 'Card Requested (Pending Approval)',
          badgeLabel: 'Pending Approval',
          statusColor: 'amber',
          isFamilyCovered: false,
          discounts: {
            opdDiscount: 0,
            labDiscount: 0,
            pharmacyDiscount: 0,
            ipdDiscount: 0,
            homeCollectionDiscount: 0
          },
          policyNote: 'Health Card application is under review. Standard hospital pricing applies until approved and activated.'
        };
      }

      return defaultNoCard;
    }

    // 4. Expiration & Status Check
    const isExpired = new Date(card.expiryDate) < new Date();
    let effectiveStatus: PatientCardStatusType = 'active';

    if (card.status === 'suspended') {
      effectiveStatus = 'suspended';
    } else if (card.status === 'cancelled' || (card.status as string) === 'deleted') {
      effectiveStatus = 'cancelled';
    } else if (isExpired || card.status === 'expired') {
      effectiveStatus = 'expired';
    } else if ((card.status as string) === 'inactive' || card.status === 'replaced') {
      effectiveStatus = 'cancelled';
    } else if (card.status === 'active') {
      effectiveStatus = 'active';
    }

    // If card is not officially active, strictly NO benefits
    if (effectiveStatus !== 'active') {
      const statusLabels: Record<string, { label: string; color: 'rose' | 'orange' | 'slate' | 'amber'; note: string }> = {
        expired: {
          label: 'Card Expired',
          color: 'rose',
          note: 'Health Card has expired. Standard hospital pricing applicable until renewal.'
        },
        suspended: {
          label: 'Card Suspended',
          color: 'orange',
          note: 'Health Card is frozen/suspended. Standard pricing applicable.'
        },
        cancelled: {
          label: 'Card Cancelled',
          color: 'slate',
          note: 'Health Card is inactive or cancelled. Standard pricing applicable.'
        }
      };

      const meta = statusLabels[effectiveStatus] || {
        label: 'Card Inactive',
        color: 'slate',
        note: 'Standard hospital pricing applies.'
      };

      return {
        hasActiveCard: false,
        effectiveStatus,
        statusLabel: `${meta.label} (Standard Pricing)`,
        badgeLabel: meta.label,
        statusColor: meta.color,
        card,
        cardNumber: card.cardNumber,
        isFamilyCovered,
        primaryCardholder,
        discounts: {
          opdDiscount: 0,
          labDiscount: 0,
          pharmacyDiscount: 0,
          ipdDiscount: 0,
          homeCollectionDiscount: 0
        },
        policyNote: meta.note
      };
    }

    // 5. Active Card: Resolve Membership Plan & Benefits dynamically
    const membership = memberships.find(m => m.id === card?.membershipId) || memberships[0] || DEFAULT_MEMBERSHIPS[0];

    return {
      hasActiveCard: true,
      effectiveStatus: 'active',
      statusLabel: isFamilyCovered
        ? `Family Shield Active (${membership.name})`
        : `Card Active (${membership.name})`,
      badgeLabel: isFamilyCovered ? 'Family Shield Active' : 'Card Active',
      statusColor: 'emerald',
      card,
      cardNumber: card.cardNumber,
      planName: membership.name,
      membership,
      isFamilyCovered,
      primaryCardholder,
      discounts: {
        opdDiscount: membership.opdDiscount || 20,
        labDiscount: membership.labDiscount || 25,
        pharmacyDiscount: membership.pharmacyDiscount || 15,
        ipdDiscount: membership.ipdDiscount || 10,
        homeCollectionDiscount: membership.homeCollectionDiscount || 50
      },
      policyNote: isFamilyCovered
        ? `Covered under Primary Member ${primaryCardholder?.fullName || 'Head'} with active ${membership.name} benefits.`
        : `Verified Active ${membership.name}. Cardholder eligible for configured cashless discounts.`
    };
  }

  /**
   * Smart Card Benefit Engine: Calculates net pricing for any clinical/hospital service.
   * Ensures non-card or invalid cards automatically receive 0% discount and standard charges.
   */
  public static calculateServiceCharge(input: ServiceChargeCalculationInput): ServiceChargeCalculationResult {
    const { patientId, serviceCategory, grossAmount } = input;
    const benefitStatus = this.getPatientCardBenefitStatus(patientId);

    const gross = Math.max(0, grossAmount || 0);

    if (!benefitStatus.hasActiveCard || !benefitStatus.membership) {
      return {
        grossAmount: gross,
        discountPct: 0,
        discountAmount: 0,
        netPayable: gross,
        hasActiveCard: false,
        status: benefitStatus.effectiveStatus,
        isFamilyCovered: false,
        verificationBadge: benefitStatus.statusLabel,
        ruleExplanation: benefitStatus.policyNote
      };
    }

    // Determine category discount percentage dynamically from active plan
    let discountPct = 0;
    switch (serviceCategory) {
      case 'opd':
        discountPct = benefitStatus.discounts.opdDiscount;
        break;
      case 'lab':
        discountPct = benefitStatus.discounts.labDiscount;
        break;
      case 'pharmacy':
        discountPct = benefitStatus.discounts.pharmacyDiscount;
        break;
      case 'ipd':
        discountPct = benefitStatus.discounts.ipdDiscount;
        break;
      case 'home_collection':
        discountPct = benefitStatus.discounts.homeCollectionDiscount;
        break;
      case 'general':
      default:
        discountPct = benefitStatus.discounts.opdDiscount;
        break;
    }

    const discountAmount = Math.round((gross * discountPct) / 100);
    const netPayable = Math.max(0, gross - discountAmount);

    return {
      grossAmount: gross,
      discountPct,
      discountAmount,
      netPayable,
      hasActiveCard: true,
      status: 'active',
      planName: benefitStatus.membership.name,
      isFamilyCovered: benefitStatus.isFamilyCovered,
      verificationBadge: `${benefitStatus.membership.name} (${discountPct}% OFF)`,
      ruleExplanation: `${discountPct}% discount applied for ${serviceCategory.toUpperCase()} under ${benefitStatus.membership.name}.`
    };
  }
}
