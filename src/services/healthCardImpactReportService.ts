import { StorageService } from './storage';
import { PharmacyService } from './pharmacyService';
import { AuditService } from './auditService';
import { HealthCard, Patient, FamilyGroup, PatientBill, PharmacySale, PatientAppointment } from '../types';
import { STORAGE_KEYS } from './storage';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export type ReportPeriodPreset =
  | 'card_start_to_today'
  | 'this_month'
  | 'this_year'
  | 'previous_year'
  | 'custom';

export interface ServiceBenefitItem {
  serviceKey: 'doctor' | 'laboratory' | 'pharmacy' | 'packages' | 'others';
  serviceName: string;
  billsCount: number;
  grossValue: number;
  discount: number;
  beneficiaryPaid: number;
  savings: number;
}

export interface FamilyBeneficiaryItem {
  patientId: string;
  fullName: string;
  relationship: string;
  age?: number;
  gender?: string;
  photoUrl?: string;
  billsCount: number;
  grossValue: number;
  discount: number;
  paidAmount: number;
  savings: number;
}

export interface CardWiseBeneficiaryRecord {
  cardId: string;
  cardNumber: string;
  patientId: string;
  cardholderName: string;
  cardholderPhotoUrl?: string;
  photoAvailable: boolean;
  mobile: string;
  gender: string;
  age: number;
  startDate: string;
  expiryDate: string;
  status: string;
  tier: string;
  familyMembersCount: number;
  familyMembers: FamilyBeneficiaryItem[];
  billsCount: number;
  grossBill: number;
  discount: number;
  netPaid: number;
  savings: number;
  servicesUsed: Array<'doctor' | 'laboratory' | 'pharmacy' | 'packages' | 'others'>;
  serviceBreakdown: Record<string, { uses: number; gross: number; discount: number; paid: number; savings: number }>;
  journey: {
    startDate: string;
    activatedDate?: string;
    servicesUsedCount: number;
    billsCount: number;
    discountReceived: number;
    totalSavings: number;
  };
}

export interface MonthlyImpactPoint {
  monthKey: string; // e.g. "2026-03"
  monthLabel: string; // e.g. "Mar 2026"
  cardsIssued: number;
  beneficiariesAdded: number;
  billsGenerated: number;
  discountProvided: number;
  savingsDelivered: number;
}

export interface NgoImpactSummary {
  totalHealthCards: number;
  activeCards: number;
  totalCardholders: number;
  totalFamilyBeneficiaries: number;
  totalBeneficiaries: number;
  totalBills: number;
  totalBillValue: number;
  totalDiscountProvided: number;
  totalBeneficiarySavings: number;
}

export interface ProgramImpactStatistics {
  beneficiaryReach: number;
  serviceUtilization: number;
  financialBenefit: number;
  beneficiarySavings: number;
  avgSavingsPerBill: number;
  avgSavingsPerBeneficiary: number;
  cardUtilizationPercent: number;
}

export interface HealthCardImpactReportData {
  generatedAt: string;
  startDate: string;
  endDate: string;
  periodPreset: ReportPeriodPreset;
  summary: NgoImpactSummary;
  programStats: ProgramImpactStatistics;
  serviceMatrix: ServiceBenefitItem[];
  monthlyTrends: MonthlyImpactPoint[];
  mostActiveCards: CardWiseBeneficiaryRecord[];
  cardRecords: CardWiseBeneficiaryRecord[];
}

export class HealthCardImpactReportService {
  /**
   * Resolves start and end ISO dates for the given preset
   */
  public static resolveDateRange(
    preset: ReportPeriodPreset,
    customStart?: string,
    customEnd?: string,
    earliestCardDate?: string
  ): { startDate: string; endDate: string } {
    const today = new Date();
    const todayIso = today.toISOString().split('T')[0];

    switch (preset) {
      case 'card_start_to_today': {
        const start = earliestCardDate || `${today.getFullYear()}-01-01`;
        return { startDate: start.split('T')[0], endDate: todayIso };
      }
      case 'this_month': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .split('T')[0];
        return { startDate: firstDay, endDate: todayIso };
      }
      case 'this_year': {
        const firstDayYear = `${today.getFullYear()}-01-01`;
        return { startDate: firstDayYear, endDate: todayIso };
      }
      case 'previous_year': {
        const prevYear = today.getFullYear() - 1;
        return {
          startDate: `${prevYear}-01-01`,
          endDate: `${prevYear}-12-31`,
        };
      }
      case 'custom': {
        return {
          startDate: customStart || `${today.getFullYear()}-01-01`,
          endDate: customEnd || todayIso,
        };
      }
      default:
        return { startDate: `${today.getFullYear()}-01-01`, endDate: todayIso };
    }
  }

  /**
   * Generates the comprehensive Health Card Impact & Beneficiary Report
   */
  public static generateReport(params: {
    preset: ReportPeriodPreset;
    startDate?: string;
    endDate?: string;
  }): HealthCardImpactReportData {
    // 1. Fetch live centralized data
    const allCards = StorageService.getCards().filter(c => !c.isDeleted && c.status !== 'deleted');
    const allPatients = StorageService.getPatients().filter(p => !p.isDeleted);
    const allFamilies = StorageService.getFamilies();
    const allBills = StorageService.getBills();
    const allPharmacySales = PharmacyService.getSales();
    const allAppointments = StorageService.getItem<PatientAppointment[]>(STORAGE_KEYS.APPOINTMENTS, []);

    // Determine earliest card date
    let earliestCardDate = allCards.reduce((earliest, c) => {
      const d = c.issueDate || c.createdAt;
      if (!d) return earliest;
      const dateStr = d.split('T')[0];
      return !earliest || dateStr < earliest ? dateStr : earliest;
    }, '');

    if (!earliestCardDate) {
      earliestCardDate = `${new Date().getFullYear()}-01-01`;
    }

    // Resolve date range
    const { startDate, endDate } = this.resolveDateRange(
      params.preset,
      params.startDate,
      params.endDate,
      earliestCardDate
    );

    // Filter cards issued within period (or active in period)
    const cardsInScope = allCards.filter(c => {
      const issue = (c.issueDate || c.createdAt || '').split('T')[0];
      if (params.preset === 'card_start_to_today') return true;
      return issue <= endDate;
    });

    // Create lookup maps
    const patientMap = new Map<string, Patient>();
    allPatients.forEach(p => patientMap.set(p.id, p));

    const familyByPrimaryMap = new Map<string, FamilyGroup>();
    allFamilies.forEach(f => {
      familyByPrimaryMap.set(f.primaryPatientId, f);
    });

    // Build Card-wise Beneficiary Records
    const cardRecords: CardWiseBeneficiaryRecord[] = [];
    const uniqueCardholderIds = new Set<string>();
    const uniqueFamilyMemberIds = new Set<string>();

    let grandGrossValue = 0;
    let grandDiscountProvided = 0;
    let grandNetPaid = 0;
    let grandTotalBillsCount = 0;

    // Service Matrix Accumulator
    const serviceTotals: Record<
      'doctor' | 'laboratory' | 'pharmacy' | 'packages' | 'others',
      { billsCount: number; grossValue: number; discount: number; paid: number; savings: number }
    > = {
      doctor: { billsCount: 0, grossValue: 0, discount: 0, paid: 0, savings: 0 },
      laboratory: { billsCount: 0, grossValue: 0, discount: 0, paid: 0, savings: 0 },
      pharmacy: { billsCount: 0, grossValue: 0, discount: 0, paid: 0, savings: 0 },
      packages: { billsCount: 0, grossValue: 0, discount: 0, paid: 0, savings: 0 },
      others: { billsCount: 0, grossValue: 0, discount: 0, paid: 0, savings: 0 },
    };

    // Monthly Trend Map
    const monthlyMap = new Map<string, {
      cards: number;
      beneficiaries: number;
      bills: number;
      discount: number;
      savings: number;
    }>();

    // Helper to get or create month bucket
    const getMonthBucket = (isoDate: string) => {
      const ym = isoDate.substring(0, 7); // e.g. "2026-03"
      if (!monthlyMap.has(ym)) {
        monthlyMap.set(ym, { cards: 0, beneficiaries: 0, bills: 0, discount: 0, savings: 0 });
      }
      return monthlyMap.get(ym)!;
    };

    // Populate monthly cards issued
    cardsInScope.forEach(c => {
      const d = (c.issueDate || c.createdAt || '').split('T')[0];
      if (d >= startDate && d <= endDate) {
        const bucket = getMonthBucket(d);
        bucket.cards += 1;
        bucket.beneficiaries += 1;
      }
    });

    // Process each card
    cardsInScope.forEach(card => {
      const primaryPatient = patientMap.get(card.patientId);
      const cardholderName = primaryPatient?.fullName || 'Registered Patient';
      const rawPhoto = primaryPatient?.photoUrl?.trim();
      const photoAvailable = Boolean(rawPhoto && rawPhoto.length > 10 && !rawPhoto.includes('undefined'));
      const cardholderPhotoUrl = photoAvailable ? rawPhoto : undefined;
      const cardStart = (card.issueDate || card.createdAt || '').split('T')[0];

      if (primaryPatient) {
        uniqueCardholderIds.add(primaryPatient.id);
      }

      // Family members
      const familyGroup = familyByPrimaryMap.get(card.patientId);
      const familyMembers: FamilyBeneficiaryItem[] = [];
      const familyPatientIds = new Set<string>();

      if (familyGroup?.members) {
        familyGroup.members.forEach(m => {
          if (!m.isPrimary && m.patientId !== card.patientId) {
            familyPatientIds.add(m.patientId);
            uniqueFamilyMemberIds.add(m.patientId);
            const famPatient = patientMap.get(m.patientId);
            const famPhotoRaw = famPatient?.photoUrl?.trim();
            familyMembers.push({
              patientId: m.patientId,
              fullName: famPatient?.fullName || `Family Member (${m.relationship})`,
              relationship: m.relationship || 'Dependent',
              age: famPatient?.age,
              gender: famPatient?.gender,
              photoUrl: Boolean(famPhotoRaw && famPhotoRaw.length > 10) ? famPhotoRaw : undefined,
              billsCount: 0,
              grossValue: 0,
              discount: 0,
              paidAmount: 0,
              savings: 0,
            });
          }
        });
      }

      // Card-specific service accumulation
      const cardServiceMap: Record<
        'doctor' | 'laboratory' | 'pharmacy' | 'packages' | 'others',
        { uses: number; gross: number; discount: number; paid: number; savings: number }
      > = {
        doctor: { uses: 0, gross: 0, discount: 0, paid: 0, savings: 0 },
        laboratory: { uses: 0, gross: 0, discount: 0, paid: 0, savings: 0 },
        pharmacy: { uses: 0, gross: 0, discount: 0, paid: 0, savings: 0 },
        packages: { uses: 0, gross: 0, discount: 0, paid: 0, savings: 0 },
        others: { uses: 0, gross: 0, discount: 0, paid: 0, savings: 0 },
      };

      let cardGrossBill = 0;
      let cardDiscount = 0;
      let cardNetPaid = 0;
      let cardBillsCount = 0;

      // 1. Check PatientBills
      allBills.forEach(bill => {
        // Exclude cancelled / draft bills
        if (bill.paymentStatus === 'waived' && bill.netPayable === 0 && bill.discountAmount === 0) return;
        // Verify date
        const billDate = (bill.date || bill.createdAt || '').split('T')[0];
        if (billDate < startDate || billDate > endDate) return;

        // Check if bill belongs to this card or primary patient or family member
        const isDirectCard = bill.healthCardId === card.id || (bill.healthCardNumber && bill.healthCardNumber.trim().toUpperCase() === card.cardNumber.trim().toUpperCase());
        const isPrimaryPat = bill.patientId === card.patientId;
        const isFamMember = familyPatientIds.has(bill.patientId);

        if (isDirectCard || isPrimaryPat || isFamMember) {
          const billGross = (bill.netPayable || 0) + (bill.discountAmount || 0);
          const billDisc = bill.discountAmount || 0;
          const billPaid = bill.paidAmount || bill.netPayable || 0;

          cardGrossBill += billGross;
          cardDiscount += billDisc;
          cardNetPaid += billPaid;
          cardBillsCount += 1;

          grandGrossValue += billGross;
          grandDiscountProvided += billDisc;
          grandNetPaid += billPaid;
          grandTotalBillsCount += 1;

          // Categorize bill service
          let cat: 'doctor' | 'laboratory' | 'pharmacy' | 'packages' | 'others' = 'others';
          if (bill.billCategory === 'opd_consultation') cat = 'doctor';
          else if (bill.billCategory === 'lab_diagnostics') cat = 'laboratory';
          else if (bill.billCategory === 'pharmacy_dispensing') cat = 'pharmacy';
          else if (bill.billCategory === 'card_enrollment' || bill.membershipName?.toLowerCase().includes('package')) cat = 'packages';

          cardServiceMap[cat].uses += 1;
          cardServiceMap[cat].gross += billGross;
          cardServiceMap[cat].discount += billDisc;
          cardServiceMap[cat].paid += billPaid;
          cardServiceMap[cat].savings += billDisc;

          serviceTotals[cat].billsCount += 1;
          serviceTotals[cat].grossValue += billGross;
          serviceTotals[cat].discount += billDisc;
          serviceTotals[cat].paid += billPaid;
          serviceTotals[cat].savings += billDisc;

          // Update family member record if linked
          if (isFamMember) {
            const famRec = familyMembers.find(f => f.patientId === bill.patientId);
            if (famRec) {
              famRec.billsCount += 1;
              famRec.grossValue += billGross;
              famRec.discount += billDisc;
              famRec.paidAmount += billPaid;
              famRec.savings += billDisc;
            }
          }

          // Update monthly bucket
          const bBucket = getMonthBucket(billDate);
          bBucket.bills += 1;
          bBucket.discount += billDisc;
          bBucket.savings += billDisc;
        }
      });

      // 2. Check PharmacySales (Retail pharmacy sales tagged with card)
      allPharmacySales.forEach(sale => {
        if (sale.status === 'cancelled') return;
        const saleDate = (sale.saleDate || '').split('T')[0];
        if (saleDate < startDate || saleDate > endDate) return;

        const matchesCardNo = sale.patientCardNo && sale.patientCardNo.trim().toUpperCase() === card.cardNumber.trim().toUpperCase();
        const matchesPatId = sale.patientId === card.patientId || sale.customerId === card.patientId;
        const isFamMember = sale.patientId ? familyPatientIds.has(sale.patientId) : false;

        if (matchesCardNo || matchesPatId || isFamMember) {
          const saleGross = sale.subtotal || sale.netTotal + (sale.discountAmount || 0);
          const saleDisc = (sale.healthCardDiscount || sale.discountAmount || 0);
          const salePaid = sale.paidAmount || sale.netTotal || 0;

          cardGrossBill += saleGross;
          cardDiscount += saleDisc;
          cardNetPaid += salePaid;
          cardBillsCount += 1;

          grandGrossValue += saleGross;
          grandDiscountProvided += saleDisc;
          grandNetPaid += salePaid;
          grandTotalBillsCount += 1;

          cardServiceMap.pharmacy.uses += 1;
          cardServiceMap.pharmacy.gross += saleGross;
          cardServiceMap.pharmacy.discount += saleDisc;
          cardServiceMap.pharmacy.paid += salePaid;
          cardServiceMap.pharmacy.savings += saleDisc;

          serviceTotals.pharmacy.billsCount += 1;
          serviceTotals.pharmacy.grossValue += saleGross;
          serviceTotals.pharmacy.discount += saleDisc;
          serviceTotals.pharmacy.paid += salePaid;
          serviceTotals.pharmacy.savings += saleDisc;

          // Update monthly bucket
          const sBucket = getMonthBucket(saleDate);
          sBucket.bills += 1;
          sBucket.discount += saleDisc;
          sBucket.savings += saleDisc;
        }
      });

      // 3. Completed Appointments
      allAppointments.forEach(appt => {
        if (appt.status !== 'completed') return;
        const apptDate = (appt.doctorConfirmedDate || appt.patientWishDate || appt.createdAt || '').split('T')[0];
        if (apptDate < startDate || apptDate > endDate) return;

        const isApptCard = (appt.cardNo && appt.cardNo.trim().toUpperCase() === card.cardNumber.trim().toUpperCase()) || appt.cardId === card.id;
        const isApptPat = appt.patientId === card.patientId;

        if (isApptCard || isApptPat) {
          // If free benefit or card discount applied
          if (appt.walletDebitStatus === 'free_card_benefit' || appt.cardTier) {
            const fee = appt.consultationFee || 500;
            // Check if not already counted via billId
            if (!appt.billId) {
              cardGrossBill += fee;
              cardDiscount += fee; // 100% free card benefit
              cardBillsCount += 1;

              grandGrossValue += fee;
              grandDiscountProvided += fee;
              grandTotalBillsCount += 1;

              cardServiceMap.doctor.uses += 1;
              cardServiceMap.doctor.gross += fee;
              cardServiceMap.doctor.discount += fee;
              cardServiceMap.doctor.savings += fee;

              serviceTotals.doctor.billsCount += 1;
              serviceTotals.doctor.grossValue += fee;
              serviceTotals.doctor.discount += fee;
              serviceTotals.doctor.savings += fee;
            }
          }
        }
      });

      // Active services used list
      const servicesUsedList: Array<'doctor' | 'laboratory' | 'pharmacy' | 'packages' | 'others'> = [];
      (Object.keys(cardServiceMap) as Array<'doctor' | 'laboratory' | 'pharmacy' | 'packages' | 'others'>).forEach(k => {
        if (cardServiceMap[k].uses > 0) {
          servicesUsedList.push(k);
        }
      });

      cardRecords.push({
        cardId: card.id,
        cardNumber: card.cardNumber,
        patientId: card.patientId,
        cardholderName,
        cardholderPhotoUrl,
        photoAvailable,
        mobile: primaryPatient?.mobile || '—',
        gender: primaryPatient?.gender || '—',
        age: primaryPatient?.age || 0,
        startDate: cardStart,
        expiryDate: (card.expiryDate || '').split('T')[0] || '—',
        status: card.status,
        tier: (card.tier || 'standard').toUpperCase(),
        familyMembersCount: familyMembers.length,
        familyMembers,
        billsCount: cardBillsCount,
        grossBill: Math.round(cardGrossBill),
        discount: Math.round(cardDiscount),
        netPaid: Math.round(cardNetPaid),
        savings: Math.round(cardDiscount),
        servicesUsed: servicesUsedList,
        serviceBreakdown: cardServiceMap,
        journey: {
          startDate: cardStart,
          activatedDate: cardStart,
          servicesUsedCount: servicesUsedList.length,
          billsCount: cardBillsCount,
          discountReceived: Math.round(cardDiscount),
          totalSavings: Math.round(cardDiscount),
        },
      });
    });

    // Sort cards by highest utilization by default
    cardRecords.sort((a, b) => b.billsCount - a.billsCount || b.savings - a.savings);

    // Build Most Active Health Cards (Top 5)
    const mostActiveCards = [...cardRecords]
      .filter(c => c.billsCount > 0 || c.savings > 0)
      .slice(0, 5);

    // Construct Monthly Trends list
    const sortedMonthKeys = Array.from(monthlyMap.keys()).sort();
    const monthlyTrends: MonthlyImpactPoint[] = sortedMonthKeys.map(ym => {
      const val = monthlyMap.get(ym)!;
      const [y, m] = ym.split('-');
      const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      const monthLabel = dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return {
        monthKey: ym,
        monthLabel,
        cardsIssued: val.cards,
        beneficiariesAdded: val.beneficiaries,
        billsGenerated: val.bills,
        discountProvided: Math.round(val.discount),
        savingsDelivered: Math.round(val.savings),
      };
    });

    // Summary calculations
    const totalHealthCards = cardsInScope.length;
    const activeCards = cardsInScope.filter(c => c.status === 'active').length;
    const totalCardholders = uniqueCardholderIds.size;
    const totalFamilyBeneficiaries = uniqueFamilyMemberIds.size;
    const totalBeneficiaries = totalCardholders + totalFamilyBeneficiaries;

    const summary: NgoImpactSummary = {
      totalHealthCards,
      activeCards,
      totalCardholders,
      totalFamilyBeneficiaries,
      totalBeneficiaries,
      totalBills: grandTotalBillsCount,
      totalBillValue: Math.round(grandGrossValue),
      totalDiscountProvided: Math.round(grandDiscountProvided),
      totalBeneficiarySavings: Math.round(grandDiscountProvided),
    };

    // Program Statistics
    const totalServicesUsed = Object.values(serviceTotals).reduce((acc, s) => acc + s.billsCount, 0);
    const activeCardsWithUsage = cardRecords.filter(c => c.billsCount > 0).length;
    const cardUtilizationPercent = activeCards > 0 ? Math.round((activeCardsWithUsage / activeCards) * 100) : 0;
    const avgSavingsPerBill = grandTotalBillsCount > 0 ? Math.round(grandDiscountProvided / grandTotalBillsCount) : 0;
    const avgSavingsPerBeneficiary = totalBeneficiaries > 0 ? Math.round(grandDiscountProvided / totalBeneficiaries) : 0;

    const programStats: ProgramImpactStatistics = {
      beneficiaryReach: totalBeneficiaries,
      serviceUtilization: totalServicesUsed,
      financialBenefit: Math.round(grandDiscountProvided),
      beneficiarySavings: Math.round(grandDiscountProvided),
      avgSavingsPerBill,
      avgSavingsPerBeneficiary,
      cardUtilizationPercent,
    };

    // Service Matrix list
    const serviceMatrix: ServiceBenefitItem[] = [
      {
        serviceKey: 'doctor',
        serviceName: 'Doctor Consultation (OPD / Tele)',
        billsCount: serviceTotals.doctor.billsCount,
        grossValue: Math.round(serviceTotals.doctor.grossValue),
        discount: Math.round(serviceTotals.doctor.discount),
        beneficiaryPaid: Math.round(serviceTotals.doctor.paid),
        savings: Math.round(serviceTotals.doctor.savings),
      },
      {
        serviceKey: 'laboratory',
        serviceName: 'Laboratory / Diagnostics',
        billsCount: serviceTotals.laboratory.billsCount,
        grossValue: Math.round(serviceTotals.laboratory.grossValue),
        discount: Math.round(serviceTotals.laboratory.discount),
        beneficiaryPaid: Math.round(serviceTotals.laboratory.paid),
        savings: Math.round(serviceTotals.laboratory.savings),
      },
      {
        serviceKey: 'pharmacy',
        serviceName: 'Pharmacy Dispensing',
        billsCount: serviceTotals.pharmacy.billsCount,
        grossValue: Math.round(serviceTotals.pharmacy.grossValue),
        discount: Math.round(serviceTotals.pharmacy.discount),
        beneficiaryPaid: Math.round(serviceTotals.pharmacy.paid),
        savings: Math.round(serviceTotals.pharmacy.savings),
      },
      {
        serviceKey: 'packages',
        serviceName: 'Health Packages & Health Shield',
        billsCount: serviceTotals.packages.billsCount,
        grossValue: Math.round(serviceTotals.packages.grossValue),
        discount: Math.round(serviceTotals.packages.discount),
        beneficiaryPaid: Math.round(serviceTotals.packages.paid),
        savings: Math.round(serviceTotals.packages.savings),
      },
      {
        serviceKey: 'others',
        serviceName: 'Other Services & General Billing',
        billsCount: serviceTotals.others.billsCount,
        grossValue: Math.round(serviceTotals.others.grossValue),
        discount: Math.round(serviceTotals.others.discount),
        beneficiaryPaid: Math.round(serviceTotals.others.paid),
        savings: Math.round(serviceTotals.others.savings),
      },
    ];

    // Cryptographic audit log for generation
    AuditService.log(
      'SUPER_ADMIN_NGO_REPORT_GENERATED',
      'security',
      `Super Admin generated Health Card Impact Report for period: ${startDate} to ${endDate}. Total Cards: ${totalHealthCards}, Total Beneficiaries: ${totalBeneficiaries}, Total Savings: ₹${grandDiscountProvided.toLocaleString('en-IN')}`
    );

    return {
      generatedAt: new Date().toISOString(),
      startDate,
      endDate,
      periodPreset: params.preset,
      summary,
      programStats,
      serviceMatrix,
      monthlyTrends,
      mostActiveCards,
      cardRecords,
    };
  }

  /**
   * Generates CSV / Excel content with UTF-8 BOM (\uFEFF)
   */
  public static exportToExcelCsv(report: HealthCardImpactReportData): string {
    const BOM = '\uFEFF';
    const lines: string[] = [];

    lines.push(`"LABMEDIX - HEALTH CARD IMPACT & BENEFICIARY REPORT (NGO / CSR / MANAGEMENT)"`);
    lines.push(`"Reporting Period:","${report.startDate} to ${report.endDate}"`);
    lines.push(`"Generated On:","${new Date(report.generatedAt).toLocaleString('en-IN')}"`);
    lines.push(``);

    // Summary
    lines.push(`"PROGRAM IMPACT SUMMARY"`);
    lines.push(`"Total Health Cards","${report.summary.totalHealthCards}"`);
    lines.push(`"Active Cards","${report.summary.activeCards}"`);
    lines.push(`"Total Cardholders","${report.summary.totalCardholders}"`);
    lines.push(`"Total Family Beneficiaries","${report.summary.totalFamilyBeneficiaries}"`);
    lines.push(`"Total Beneficiaries","${report.summary.totalBeneficiaries}"`);
    lines.push(`"Total Finalized Bills","${report.summary.totalBills}"`);
    lines.push(`"Total Gross Billing (INR)","${report.summary.totalBillValue}"`);
    lines.push(`"Total Discount Provided (INR)","${report.summary.totalDiscountProvided}"`);
    lines.push(`"Total Beneficiary Savings (INR)","${report.summary.totalBeneficiarySavings}"`);
    lines.push(``);

    // Service Breakdown
    lines.push(`"SERVICE-WISE BENEFIT MATRIX"`);
    lines.push(`"Service","Bills / Uses","Gross Value (INR)","Discount Provided (INR)","Beneficiary Paid (INR)","Total Savings (INR)"`);
    report.serviceMatrix.forEach(s => {
      lines.push(`"${s.serviceName}","${s.billsCount}","${s.grossValue}","${s.discount}","${s.beneficiaryPaid}","${s.savings}"`);
    });
    lines.push(``);

    // Card-wise table
    lines.push(`"CARD-WISE BENEFICIARY DETAILED TABLE"`);
    lines.push(`"Card Number","Cardholder Name","Patient ID","Mobile","Gender","Age","Start Date","Expiry Date","Status","Tier","Family Members Count","Total Bills","Gross Bill (INR)","Discount (INR)","Net Paid (INR)","Total Savings (INR)","Services Used"`);

    report.cardRecords.forEach(c => {
      lines.push(
        `"${c.cardNumber}","${c.cardholderName}","${c.patientId}","${c.mobile}","${c.gender}","${c.age}","${c.startDate}","${c.expiryDate}","${c.status}","${c.tier}","${c.familyMembersCount}","${c.billsCount}","${c.grossBill}","${c.discount}","${c.netPaid}","${c.savings}","${c.servicesUsed.join(', ')}"`
      );
    });

    // Audit log
    AuditService.log(
      'SUPER_ADMIN_NGO_REPORT_EXPORTED',
      'security',
      `Super Admin exported NGO Impact Report to Excel/CSV for period ${report.startDate} to ${report.endDate}.`
    );

    return BOM + lines.join('\r\n');
  }

  /**
   * Downloads CSV file to client
   */
  public static downloadExcel(report: HealthCardImpactReportData): void {
    const csvData = this.exportToExcelCsv(report);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LabMedix_HealthCard_NGO_Impact_${report.startDate}_to_${report.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Triggers clean browser print with proper styles
   */
  public static printReport(): void {
    window.print();
  }

  /**
   * Exports full multi-page executive A4 PDF using jsPDF + html2canvas
   */
  public static async exportPdf(elementId: string, filename: string): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Report element with ID '${elementId}' not found for PDF export.`);
    }

    // Capture DOM element using html2canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Remaining pages
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);

    AuditService.log(
      'SUPER_ADMIN_NGO_REPORT_EXPORTED',
      'security',
      `Super Admin generated and downloaded A4 Executive NGO Impact PDF (${filename}).`
    );
  }
}
