import { DiagnosticReportRecord, LabParameterResult, CompanyProfile } from '../types';
import { BloodTestBooking, PortalService } from './portalService';
import { StorageService } from './storage';
import { AuditService } from './auditService';
import { ApiSyncService } from './apiSyncService';
import { DoctorMasterService } from './doctorMasterService';
import { TechnicianMasterService } from './technicianMasterService';
import { generateUuid, generateDiagnosticReportNumber } from '../utils/idGenerator';

const DIAGNOSTIC_REPORTS_STORAGE_KEY = 'labmedix_diagnostic_reports_v1';

export class DiagnosticReportService {
  public static getAllReports(): DiagnosticReportRecord[] {
    return StorageService.getItem<DiagnosticReportRecord[]>(DIAGNOSTIC_REPORTS_STORAGE_KEY, []);
  }

  public static saveReports(reports: DiagnosticReportRecord[]): void {
    StorageService.setItem(DIAGNOSTIC_REPORTS_STORAGE_KEY, reports);
  }

  public static getReportById(id: string): DiagnosticReportRecord | undefined {
    return this.getAllReports().find(r => r.id === id || r.reportNumber === id);
  }

  public static getReportByReportNumber(reportNumber: string): DiagnosticReportRecord | undefined {
    const clean = reportNumber.trim().toUpperCase();
    return this.getAllReports().find(r => r.reportNumber.toUpperCase() === clean);
  }

  public static getReportByOrderId(orderId: string): DiagnosticReportRecord | undefined {
    return this.getAllReports().find(r => r.orderId === orderId || r.orderNumber === orderId || r.bookingNo === orderId);
  }

  /**
   * Duplicate Report Protection (Requirement 23):
   * If a report already exists for the given order, opens / returns the existing report
   * instead of creating duplicate records.
   */
  public static createOrGetReportForOrder(
    booking: BloodTestBooking,
    technicianId?: string,
    reportingDoctorId?: string
  ): DiagnosticReportRecord {
    const existing = this.getReportByOrderId(booking.id) || this.getReportByOrderId(booking.bookingNo);
    if (existing) {
      // If already finalized or locked, return protected record directly
      if (existing.isLocked) {
        return existing;
      }
    }

    const company: CompanyProfile = StorageService.getCompanyProfile();
    const allTechnicians = TechnicianMasterService.getAllTechnicians();
    const allDoctors = DoctorMasterService.getAllDoctors();

    // Select technician (specified, or first active)
    const technician = technicianId
      ? allTechnicians.find(t => t.id === technicianId || t.name === technicianId)
      : allTechnicians.find(t => t.status === 'active');

    // Select reporting doctor (specified, or matching booking, or first active reporting doctor)
    const doctor = reportingDoctorId
      ? allDoctors.find(d => d.id === reportingDoctorId || d.name === reportingDoctorId)
      : booking.pathologistName
      ? allDoctors.find(d => d.name.toLowerCase().includes(booking.pathologistName!.toLowerCase()))
      : allDoctors.find(d => d.status === 'active' && (d.isReportingDoctor ?? true));

    const now = new Date().toISOString();
    const reports = this.getAllReports();

    if (existing) {
      // Update mutable draft
      existing.parameters = booking.testResults || existing.parameters;
      existing.testName = booking.testName || existing.testName;
      existing.testCategory = booking.category || existing.testCategory;
      existing.sampleBarcode = booking.sampleBarcode || existing.sampleBarcode;
      existing.sampleTubeType = booking.sampleTubeType || existing.sampleTubeType;
      existing.sampleCollectedAt = booking.sampleCollectedAt || existing.sampleCollectedAt;
      existing.sampleReceivedAt = booking.sampleReceivedAt || existing.sampleReceivedAt;
      existing.companySnapshot = company;
      if (technician) {
        existing.technicianId = technician.id;
        existing.technicianName = technician.name;
        existing.technicianQualification = technician.qualification;
        existing.technicianDesignation = technician.designation;
        existing.technicianRegNo = technician.regNumber;
        existing.technicianSignatureUrl = technician.signatureUrl;
      }
      if (doctor) {
        existing.reportingDoctorId = doctor.id;
        existing.reportingDoctorName = doctor.name;
        existing.reportingDoctorQualification = doctor.qualification;
        existing.reportingDoctorDesignation = doctor.designation || `Consultant (${doctor.speciality})`;
        existing.reportingDoctorRegNo = doctor.regNumber;
        existing.reportingDoctorSignatureUrl = doctor.signatureUrl;
        existing.reportingDoctorStampUrl = doctor.stampUrl;
      }
      existing.updatedAt = now;
      this.saveReports(reports);
      return existing;
    }

    // Mint new Report Record
    const existingReportNumbers = reports.map(r => r.reportNumber);
    const reportNumber = generateDiagnosticReportNumber(existingReportNumbers);
    const reportId = `rpt_${generateUuid().slice(0, 8)}`;
    const verificationCode = reportNumber.replace('LMDX-RPT-', 'VER-');
    const qrVerificationUrl = `${window.location.origin}/verify/${reportNumber}`;

    const newReport: DiagnosticReportRecord = {
      id: reportId,
      reportNumber,
      orderId: booking.id,
      orderNumber: booking.bookingNo,
      bookingNo: booking.bookingNo,
      patientId: booking.patientId,
      patientName: booking.patientName,
      patientAge: 45, // default fallback, hydrated from patient
      patientGender: 'male',
      patientPhone: booking.patientPhone,
      cardNo: booking.cardNo,
      membershipTier: booking.cardTier,
      referringDoctorName: booking.prescribedByDoctorName || 'Consultant Physician',
      sampleBarcode: booking.sampleBarcode || `SAMP-${booking.bookingNo}`,
      sampleTubeType: booking.sampleTubeType || 'EDTA Lavender Cap',
      sampleCollectedAt: booking.sampleCollectedAt,
      sampleReceivedAt: booking.sampleReceivedAt,
      testName: booking.testName,
      testCategory: booking.category || 'Biochemistry',
      department: 'Central Clinical Pathology & Diagnostic Biochemistry',
      parameters: booking.testResults || [],
      clinicalImpression: booking.pathologistNotes || 'Analytical values correlated clinically with internal quality control.',
      technicianId: technician?.id,
      technicianName: technician?.name,
      technicianQualification: technician?.qualification,
      technicianDesignation: technician?.designation,
      technicianRegNo: technician?.regNumber,
      technicianSignatureUrl: technician?.signatureUrl,
      reportingDoctorId: doctor?.id,
      reportingDoctorName: doctor?.name,
      reportingDoctorQualification: doctor?.qualification,
      reportingDoctorDesignation: doctor?.designation || `Consultant (${doctor?.speciality || 'Medicine'})`,
      reportingDoctorRegNo: doctor?.regNumber,
      reportingDoctorSignatureUrl: doctor?.signatureUrl,
      reportingDoctorStampUrl: doctor?.stampUrl,
      companySnapshot: company,
      status: 'draft',
      isLocked: false,
      verificationCode,
      verificationHash: `SHA-${Math.abs(Date.now() ^ 0xabcdef).toString(16).toUpperCase()}`,
      qrVerificationUrl,
      createdAt: now,
      updatedAt: now
    };

    reports.unshift(newReport);
    this.saveReports(reports);
    ApiSyncService.saveDocument('diagnosticReports', newReport.id, newReport).catch(() => {});

    return newReport;
  }

  /**
   * Finalize & Lock Diagnostic Report (Requirement 9 & 10):
   * Validates completeness, locks against silent modifications,
   * assigns official Report Number, updates order status, and logs audit.
   */
  public static finalizeAndLockReport(
    orderId: string,
    details: {
      technicianId?: string;
      reportingDoctorId?: string;
      clinicalImpression?: string;
      customParameters?: LabParameterResult[];
    }
  ): { success: boolean; report?: DiagnosticReportRecord; error?: string } {
    const bookings = PortalService.getLabBookings();
    const booking = bookings.find(b => b.id === orderId || b.bookingNo === orderId);
    if (!booking) {
      return { success: false, error: `Lab order with ID ${orderId} not found in database.` };
    }

    const report = this.createOrGetReportForOrder(booking, details.technicianId, details.reportingDoctorId);
    if (report.isLocked) {
      return { success: true, report };
    }

    const parameters = details.customParameters || report.parameters;
    if (!parameters || parameters.length === 0 || parameters.every(p => !p.observedValue?.trim())) {
      return { success: false, error: 'Cannot finalize report without entered analytical findings.' };
    }

    // Validate Doctor and Technician assignment
    const allDoctors = DoctorMasterService.getAllDoctors();
    const doctor = details.reportingDoctorId
      ? allDoctors.find(d => d.id === details.reportingDoctorId)
      : DoctorMasterService.getAllReportingDoctors()[0];

    const allTechnicians = TechnicianMasterService.getAllTechnicians();
    const technician = details.technicianId
      ? allTechnicians.find(t => t.id === details.technicianId)
      : TechnicianMasterService.getActiveTechnicians()[0];

    if (!doctor) {
      return { success: false, error: 'Cannot finalize report: No authorized reporting doctor is configured in Doctor Master.' };
    }

    if (!technician) {
      return { success: false, error: 'Cannot finalize report: No authorized laboratory technician is configured in Technician Master.' };
    }

    const now = new Date().toISOString();
    const company = StorageService.getCompanyProfile();

    report.parameters = parameters;
    report.clinicalImpression = details.clinicalImpression || report.clinicalImpression || 'Parameters analyzed by automated diagnostic calibrators. Please correlate clinically.';
    report.technicianId = technician.id;
    report.technicianName = technician.name;
    report.technicianQualification = technician.qualification;
    report.technicianDesignation = technician.designation;
    report.technicianRegNo = technician.regNumber;
    report.technicianSignatureUrl = technician.signatureUrl;
    report.reportingDoctorId = doctor.id;
    report.reportingDoctorName = doctor.name;
    report.reportingDoctorQualification = doctor.qualification;
    report.reportingDoctorDesignation = doctor.designation || `Consultant (${doctor.speciality})`;
    report.reportingDoctorRegNo = doctor.regNumber;
    report.reportingDoctorSignatureUrl = doctor.signatureUrl;
    report.reportingDoctorStampUrl = doctor.stampUrl;
    report.companySnapshot = company;
    report.status = 'finalized';
    report.isLocked = true;
    report.lockedAt = now;
    report.finalizedAt = now;
    report.updatedAt = now;

    // Save updated report in registry
    const reports = this.getAllReports();
    const idx = reports.findIndex(r => r.id === report.id);
    if (idx !== -1) reports[idx] = report;
    else reports.unshift(report);
    this.saveReports(reports);
    ApiSyncService.saveDocument('diagnosticReports', report.id, report).catch(() => {});

    // Synchronize status back to PortalService & LaboratoryService
    booking.status = 'report_ready';
    booking.reportReadyAt = now;
    booking.verifiedBy = doctor.name;
    booking.pathologistName = doctor.name;
    booking.verifiedDoctorRegistrationNo = doctor.regNumber;
    booking.verifiedAt = now;
    booking.pathologistNotes = report.clinicalImpression;
    booking.testResults = parameters;
    PortalService.saveLabBookings(bookings);
    ApiSyncService.saveDocument('labBookings', booking.id, booking).catch(() => {});

    AuditService.log(
      'DIAGNOSTIC_REPORT_FINALIZED_AND_LOCKED',
      'clinical',
      `Official Report ${report.reportNumber} finalized and locked for ${booking.patientName}. Reporting: ${doctor.name} (${doctor.regNumber}), Tech: ${technician.name}.`,
      report.id
    );

    return { success: true, report };
  }

  /**
   * Controlled Report Amendment (Requirement 10):
   * Amends a finalized report, preserving history of previous findings.
   */
  public static amendReport(
    reportNumberOrId: string,
    details: {
      amendedBy: string;
      reason: string;
      updatedParameters: LabParameterResult[];
      updatedImpression?: string;
    }
  ): { success: boolean; report?: DiagnosticReportRecord; error?: string } {
    if (!details.reason.trim()) {
      return { success: false, error: 'Amendment reason is strictly required for legal clinical audit trail.' };
    }

    const reports = this.getAllReports();
    const report = reports.find(r => r.id === reportNumberOrId || r.reportNumber === reportNumberOrId);
    if (!report) {
      return { success: false, error: 'Report not found for amendment.' };
    }

    const now = new Date().toISOString();

    // Preserve previous parameters in amendmentHistory
    if (!report.amendmentHistory) {
      report.amendmentHistory = [];
    }
    report.amendmentHistory.push({
      amendedAt: now,
      amendedBy: details.amendedBy,
      reason: details.reason.trim(),
      previousParameters: JSON.parse(JSON.stringify(report.parameters))
    });

    report.parameters = details.updatedParameters;
    if (details.updatedImpression) {
      report.clinicalImpression = details.updatedImpression;
    }
    report.status = 'amended';
    report.updatedAt = now;

    this.saveReports(reports);
    ApiSyncService.saveDocument('diagnosticReports', report.id, report).catch(() => {});

    // Also update labBookings record
    const bookings = PortalService.getLabBookings();
    const b = bookings.find(b => b.id === report.orderId || b.bookingNo === report.bookingNo);
    if (b) {
      b.testResults = details.updatedParameters;
      if (details.updatedImpression) b.pathologistNotes = details.updatedImpression;
      PortalService.saveLabBookings(bookings);
      ApiSyncService.saveDocument('labBookings', b.id, b).catch(() => {});
    }

    AuditService.log(
      'DIAGNOSTIC_REPORT_AMENDED',
      'clinical',
      `Controlled amendment on Report ${report.reportNumber} by ${details.amendedBy}. Reason: ${details.reason}`,
      report.id
    );

    return { success: true, report };
  }
}
