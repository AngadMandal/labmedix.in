import { CompanyProfile, CompanyLogoMetadata } from '../types';
import { StorageService } from './storage';
import { AuditService } from './auditService';
import { ApiSyncService } from './apiSyncService';

export interface CompanyValidationItem {
  id: string;
  field: string;
  label: string;
  isCritical: boolean;
  isConfigured: boolean;
  recommendation: string;
}

export interface CompanyValidationReport {
  status: 'complete' | 'warning' | 'incomplete';
  score: number;
  totalChecks: number;
  passedChecks: number;
  criticalMissingCount: number;
  items: CompanyValidationItem[];
}

export class CompanySettingsService {
  /**
   * Run automatic system validation on company profile
   * Ensures official documents never render with missing identity, broken logo, or empty headers.
   */
  public static validateCompanyProfile(profile: Partial<CompanyProfile>): CompanyValidationReport {
    const p = profile || {};
    const items: CompanyValidationItem[] = [
      {
        id: 'name',
        field: 'name',
        label: 'Company Brand Name',
        isCritical: true,
        isConfigured: Boolean(p.name && p.name.trim().length >= 3),
        recommendation: 'Specify your hospital or clinical brand name (e.g. LABMEDIX).'
      },
      {
        id: 'legalName',
        field: 'legalName',
        label: 'Legal Registered Entity Name',
        isCritical: false,
        isConfigured: Boolean(p.legalName && p.legalName.trim().length >= 3),
        recommendation: 'Add formal entity name (e.g. LABMEDIX HEALTHCARE PVT. LTD.) for official invoices.'
      },
      {
        id: 'logoUrl',
        field: 'logoUrl',
        label: 'Authoritative Company Logo',
        isCritical: true,
        isConfigured: Boolean(p.logoUrl && p.logoUrl.trim().length > 0),
        recommendation: 'Upload an official high-resolution or transparent emblem for all document headers.'
      },
      {
        id: 'address',
        field: 'address',
        label: 'Physical Address & Location',
        isCritical: true,
        isConfigured: Boolean(p.address && p.address.trim().length >= 5),
        recommendation: 'Provide complete street or institutional address for hospital bills and reports.'
      },
      {
        id: 'pinCode',
        field: 'pinCode',
        label: 'Postal PIN Code',
        isCritical: true,
        isConfigured: Boolean(p.pinCode && p.pinCode.trim().length === 6),
        recommendation: 'Enter valid 6-digit postal code.'
      },
      {
        id: 'phone',
        field: 'phone',
        label: 'Primary Phone Number',
        isCritical: true,
        isConfigured: Boolean(p.phone && p.phone.trim().length >= 8),
        recommendation: 'Provide customer/patient telephone or mobile contact.'
      },
      {
        id: 'helpline',
        field: 'helpline',
        label: '24x7 Emergency Helpline',
        isCritical: false,
        isConfigured: Boolean(p.helpline && p.helpline.trim().length >= 8),
        recommendation: 'Add round-the-clock emergency line printed on Health Cards and Report footers.'
      },
      {
        id: 'email',
        field: 'email',
        label: 'Official Contact Email',
        isCritical: false,
        isConfigured: Boolean(p.email && p.email.includes('@')),
        recommendation: 'Specify institutional support email address.'
      },
      {
        id: 'website',
        field: 'website',
        label: 'Official Website / QR Link',
        isCritical: false,
        isConfigured: Boolean(p.website && p.website.startsWith('http')),
        recommendation: 'Provide web address for digital verification and card validation portals.'
      },
      {
        id: 'registrationNo',
        field: 'registrationNo',
        label: 'Clinical Establishment Reg No',
        isCritical: true,
        isConfigured: Boolean(p.registrationNo && p.registrationNo.trim().length >= 4),
        recommendation: 'Enter Clinical Establishment / State Health Department license number.'
      },
      {
        id: 'gstin',
        field: 'gstin',
        label: 'GSTIN / Tax Registration',
        isCritical: false,
        isConfigured: Boolean(p.gstin && p.gstin.trim().length >= 10),
        recommendation: 'Provide 15-digit GSTIN for tax invoices and pharmacy billing.'
      },
      {
        id: 'clinicalLicenseNo',
        field: 'clinicalLicenseNo',
        label: 'Drug License / Clinical License',
        isCritical: false,
        isConfigured: Boolean(p.clinicalLicenseNo && p.clinicalLicenseNo.trim().length >= 4),
        recommendation: 'Enter pharmacy drug license numbers (e.g. 20B / 21B).'
      },
      {
        id: 'cardFooterNotice',
        field: 'cardFooterNotice',
        label: 'Health Card Terms & Footer Notice',
        isCritical: false,
        isConfigured: Boolean(p.cardFooterNotice && p.cardFooterNotice.trim().length >= 10),
        recommendation: 'Define concise cardholder privileges and conditions on physical cards.'
      }
    ];

    const totalChecks = items.length;
    const passedChecks = items.filter(i => i.isConfigured).length;
    const criticalMissing = items.filter(i => i.isCritical && !i.isConfigured);
    const score = Math.round((passedChecks / totalChecks) * 100);

    let status: 'complete' | 'warning' | 'incomplete';
    if (criticalMissing.length > 0 || score < 60) {
      status = 'incomplete';
    } else if (score < 90) {
      status = 'warning';
    } else {
      status = 'complete';
    }

    return {
      status,
      score,
      totalChecks,
      passedChecks,
      criticalMissingCount: criticalMissing.length,
      items
    };
  }

  /**
   * Process and validate uploaded logo file
   */
  public static async processLogoFile(file: File): Promise<{
    success: boolean;
    dataUrl?: string;
    metadata?: CompanyLogoMetadata;
    error?: string;
  }> {
    // 1. Allowed MIME types: PNG, JPEG, SVG, WEBP
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return {
        success: false,
        error: `Unsupported file type (${file.type || 'unknown'}). Please upload a PNG, JPG, JPEG, SVG, or WEBP image.`
      };
    }

    // 2. Max size 2.5MB
    const MAX_SIZE_BYTES = 2.5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return {
        success: false,
        error: `Logo file size exceeds 2.5MB limit (Current: ${(file.size / (1024 * 1024)).toFixed(2)}MB). Please upload an optimized image.`
      };
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) {
          resolve({ success: false, error: 'Failed to read image data.' });
          return;
        }

        // Measure image dimensions
        const img = new Image();
        img.onload = () => {
          const currentUser = StorageService.getCurrentUser();
          const metadata: CompanyLogoMetadata = {
            url: dataUrl,
            fileType: file.type,
            fileSize: file.size,
            dimensions: { width: img.naturalWidth, height: img.naturalHeight },
            uploadedAt: new Date().toISOString(),
            uploadedBy: currentUser?.fullName || 'Super Administrator',
            isActive: true
          };
          resolve({
            success: true,
            dataUrl,
            metadata
          });
        };
        img.onerror = () => {
          // If SVG or image element fails to decode dimensions, still allow dataUrl
          const currentUser = StorageService.getCurrentUser();
          resolve({
            success: true,
            dataUrl,
            metadata: {
              url: dataUrl,
              fileType: file.type,
              fileSize: file.size,
              uploadedAt: new Date().toISOString(),
              uploadedBy: currentUser?.fullName || 'Super Administrator',
              isActive: true
            }
          });
        };
        img.src = dataUrl;
      };
      reader.onerror = () => resolve({ success: false, error: 'File read error.' });
      reader.readAsDataURL(file);
    });
  }

  /**
   * Save updated company profile, sync to PostgreSQL, and log cryptographic audit trail
   */
  public static async saveCompanyConfiguration(
    updatedProfile: CompanyProfile,
    previousProfile?: CompanyProfile
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const prev = previousProfile || StorageService.getCompanyProfile();
      const currentUser = StorageService.getCurrentUser();
      const now = new Date().toISOString();

      // Compute validation status
      const validation = this.validateCompanyProfile(updatedProfile);
      const finalProfile: CompanyProfile = {
        ...updatedProfile,
        validationStatus: validation.status,
        lockedAt: now,
        lockedBy: currentUser?.fullName || 'Super Administrator'
      };

      // 1. Save locally and sync to PostgreSQL
      StorageService.saveCompanyProfile(finalProfile);

      // 2. Identify modified fields for institutional audit logging
      const changedKeys: string[] = [];
      const keysToCompare: Array<keyof CompanyProfile> = [
        'name', 'legalName', 'tagline', 'logoUrl', 'address', 'phone', 'helpline',
        'whatsapp', 'email', 'website', 'registrationNo', 'gstin', 'clinicalLicenseNo'
      ];

      keysToCompare.forEach(k => {
        if (prev[k] !== finalProfile[k]) {
          changedKeys.push(`${String(k)}: "${prev[k] || ''}" → "${finalProfile[k] || ''}"`);
        }
      });

      // 3. Cryptographic audit log entry
      AuditService.log(
        'COMPANY_SETTINGS_UPDATED',
        'settings',
        `Super Admin updated Company Settings & Brand Identity. Status: ${validation.status.toUpperCase()} (${validation.score}% complete). Modified: [${changedKeys.slice(0, 4).join('; ')}${changedKeys.length > 4 ? '...' : ''}]`,
        currentUser?.id,
        {
          operator: currentUser?.fullName || 'Super Administrator',
          previousName: prev.name,
          newName: finalProfile.name,
          logoChanged: prev.logoUrl !== finalProfile.logoUrl,
          validationScore: validation.score,
          status: validation.status,
          timestamp: now
        },
        'security'
      );

      // 4. Multi-device reactive broadcast
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('labmedix_data_synced', {
          detail: { key: 'labmedix_company_profile_v1', action: 'COMPANY_SETTINGS_SAVED' }
        }));
      }

      return { success: true };
    } catch (err: any) {
      console.error('[CompanySettingsService] Save error:', err);
      return { success: false, error: err?.message || 'Failed to persist company settings.' };
    }
  }
}
