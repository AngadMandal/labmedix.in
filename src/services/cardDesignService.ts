import { CardDesignConfig, CardDesignVersion, CompanyProfile } from '../types';
import { DEFAULT_CARD_DESIGN, DEFAULT_COMPANY_PROFILE } from '../constants/defaults';
import { APPROVED_GOLD_PRIVILEGE_TERMS } from '../constants/cardTerms';
import { StorageService, STORAGE_KEYS } from './storage';
import { AuditService } from './auditService';
import { ApiSyncService } from './apiSyncService';
import { generateUuid } from '../utils/idGenerator';

const CARD_DESIGN_KEY = 'labmedix_central_card_design_v1';
const CARD_VERSIONS_KEY = 'labmedix_central_card_versions_v1';
const CARD_TERMS_KEY = 'labmedix_central_card_terms_v1';

const INITIAL_CARD_CONFIG: CardDesignConfig = {
  ...DEFAULT_CARD_DESIGN,
  cardTitle: 'LABMEDIX HEALTH CARD',
  cardTierTitle: 'GOLD PRIVILEGE',
  cardPrefix: 'LHC-',
  validityDays: 365,
  logoSize: 'md',
  logoPosition: 'left',
  qrPosition: 'bottom-right',
  showBackQrVerification: true,
  activeVersion: 'v1.0',
  cardholderFields: {
    showDob: true,
    showAge: true,
    showBloodGroup: true,
    showPatientId: true,
    showIssueDate: true,
    showValidUntil: true,
    showStatusBadge: true
  }
};

const INITIAL_VERSION: CardDesignVersion = {
  id: 'ver_init_10',
  version: 'v1.0',
  status: 'published',
  publishedAt: '2026-01-01T00:00:00.000Z',
  publishedBy: 'Super Administrator',
  createdAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'Super Administrator',
  changesSummary: 'Initial official LABMEDIX Gold Privilege CR80 PVC card design release.',
  config: INITIAL_CARD_CONFIG,
  termsAndConditions: APPROVED_GOLD_PRIVILEGE_TERMS
};

export class CardDesignService {
  /**
   * Retrieves the single centralized Health Card design configuration
   */
  public static getActiveDesignConfig(): CardDesignConfig {
    try {
      const raw = localStorage.getItem(CARD_DESIGN_KEY);
      if (!raw) {
        localStorage.setItem(CARD_DESIGN_KEY, JSON.stringify(INITIAL_CARD_CONFIG));
        return INITIAL_CARD_CONFIG;
      }
      return { ...INITIAL_CARD_CONFIG, ...JSON.parse(raw) };
    } catch {
      return INITIAL_CARD_CONFIG;
    }
  }

  /**
   * Updates the single centralized design configuration
   */
  public static updateActiveDesignConfig(
    updates: Partial<CardDesignConfig>,
    modifiedBy: string = 'Super Administrator'
  ): CardDesignConfig {
    const current = this.getActiveDesignConfig();
    const updated: CardDesignConfig = {
      ...current,
      ...updates,
      cardholderFields: {
        ...current.cardholderFields,
        ...(updates.cardholderFields || {})
      }
    };

    localStorage.setItem(CARD_DESIGN_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key: CARD_DESIGN_KEY } }));
    ApiSyncService.saveDocument('card_design_configs', 'active_config', updated).catch(() => {});

    AuditService.log(
      'HEALTH_CARD_DESIGN_UPDATED',
      'card',
      `Super Admin updated central Health Card configuration (Preset: ${updated.preset}, Tier: ${updated.cardTierTitle || 'GOLD PRIVILEGE'})`,
      undefined,
      { preset: updated.preset, modifiedBy },
      'info'
    );

    return updated;
  }

  /**
   * Retrieves all design versions for version control
   */
  public static getDesignVersions(): CardDesignVersion[] {
    try {
      const raw = localStorage.getItem(CARD_VERSIONS_KEY);
      if (!raw) {
        localStorage.setItem(CARD_VERSIONS_KEY, JSON.stringify([INITIAL_VERSION]));
        return [INITIAL_VERSION];
      }
      return JSON.parse(raw);
    } catch {
      return [INITIAL_VERSION];
    }
  }

  /**
   * Creates a new design version draft
   */
  public static createDraftVersion(
    versionName: string,
    changesSummary: string,
    config: CardDesignConfig,
    terms: string[],
    author: string = 'Super Administrator'
  ): CardDesignVersion {
    const versions = this.getDesignVersions();
    const newVersion: CardDesignVersion = {
      id: `ver_${generateUuid().slice(0, 8)}`,
      version: versionName,
      status: 'draft',
      createdAt: new Date().toISOString(),
      createdBy: author,
      changesSummary,
      config,
      termsAndConditions: terms
    };

    versions.unshift(newVersion);
    localStorage.setItem(CARD_VERSIONS_KEY, JSON.stringify(versions));
    window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key: CARD_VERSIONS_KEY } }));

    AuditService.log(
      'HEALTH_CARD_VERSION_DRAFTED',
      'card',
      `Drafted new Health Card design version ${versionName} by ${author}`,
      newVersion.id,
      { version: versionName }
    );

    return newVersion;
  }

  /**
   * Publishes a design version, making it the live active card template
   */
  public static publishVersion(
    versionId: string,
    publisher: string = 'Super Administrator'
  ): CardDesignVersion {
    const versions = this.getDesignVersions();
    const targetIdx = versions.findIndex(v => v.id === versionId);
    if (targetIdx === -1) throw new Error('Version not found');

    // Archive previous published versions
    versions.forEach((v, i) => {
      if (v.status === 'published' && i !== targetIdx) {
        v.status = 'archived';
      }
    });

    // Mark target as published
    versions[targetIdx].status = 'published';
    versions[targetIdx].publishedAt = new Date().toISOString();
    versions[targetIdx].publishedBy = publisher;

    localStorage.setItem(CARD_VERSIONS_KEY, JSON.stringify(versions));

    // Update active design config and terms
    const publishedConfig: CardDesignConfig = {
      ...versions[targetIdx].config,
      activeVersion: versions[targetIdx].version
    };
    this.updateActiveDesignConfig(publishedConfig, publisher);
    this.saveApprovedTerms(versions[targetIdx].termsAndConditions, publisher);

    AuditService.log(
      'HEALTH_CARD_VERSION_PUBLISHED',
      'card',
      `Published Health Card design version ${versions[targetIdx].version} as live hospital standard.`,
      versions[targetIdx].id,
      { version: versions[targetIdx].version, publisher },
      'security'
    );

    return versions[targetIdx];
  }

  /**
   * Retrieves the 15 approved Terms & Conditions for the Gold Privilege card
   */
  public static getApprovedTerms(): string[] {
    try {
      const raw = localStorage.getItem(CARD_TERMS_KEY);
      if (!raw) {
        localStorage.setItem(CARD_TERMS_KEY, JSON.stringify(APPROVED_GOLD_PRIVILEGE_TERMS));
        return APPROVED_GOLD_PRIVILEGE_TERMS;
      }
      return JSON.parse(raw);
    } catch {
      return APPROVED_GOLD_PRIVILEGE_TERMS;
    }
  }

  /**
   * Saves updated Terms & Conditions centrally
   */
  public static saveApprovedTerms(terms: string[], modifiedBy: string = 'Super Administrator'): string[] {
    localStorage.setItem(CARD_TERMS_KEY, JSON.stringify(terms));
    window.dispatchEvent(new CustomEvent('labmedix_data_synced', { detail: { key: CARD_TERMS_KEY } }));

    AuditService.log(
      'HEALTH_CARD_TERMS_UPDATED',
      'card',
      `Super Admin updated the 15-point Health Card Terms & Conditions.`,
      undefined,
      { count: terms.length, modifiedBy }
    );

    return terms;
  }
}
