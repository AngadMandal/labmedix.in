import { LabTechnicianItem } from '../types';
import { StorageService } from './storage';
import { AuditService } from './auditService';
import { ApiSyncService } from './apiSyncService';
import { generateUuid, generateTechnicianCode } from '../utils/idGenerator';

const TECHNICIAN_MASTER_STORAGE_KEY = 'labmedix_technician_master_records_v1';

export class TechnicianMasterService {
  private static getInitialTechnicians(): LabTechnicianItem[] {
    return [
      {
        id: 'tech_debashis',
        technicianCode: 'LT-001',
        name: 'Debashis Mukherjee',
        qualification: 'B.Sc (MLT), DMLT',
        designation: 'Senior Medical Laboratory Technologist',
        department: 'Hematology & Clinical Biochemistry',
        regNumber: 'WB-PMAC-5519',
        phone: '+91 98300 22001',
        email: 'debashis.mlt@labmedix.org',
        signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><path d="M15,42 Q40,12 70,38 T120,24 T165,42 T190,18" fill="none" stroke="%230f766e" stroke-width="2.5" stroke-linecap="round"/></svg>',
        status: 'active',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 'tech_suman',
        technicianCode: 'LT-002',
        name: 'Suman Roy',
        qualification: 'M.Sc (Medical Microbiology), DMLT',
        designation: 'Chief Serology & Microbiology Technologist',
        department: 'Microbiology & Clinical Pathology',
        regNumber: 'WB-PMAC-6624',
        phone: '+91 98300 22002',
        email: 'suman.micro@labmedix.org',
        signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><path d="M12,38 Q35,16 65,34 T115,22 T155,40 T188,20" fill="none" stroke="%230284c7" stroke-width="2.5" stroke-linecap="round"/></svg>',
        status: 'active',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 'tech_ananya',
        technicianCode: 'LT-003',
        name: 'Ananya Ghosh',
        qualification: 'B.Sc (MLT)',
        designation: 'Clinical Pathology Specialist',
        department: 'Clinical Pathology & Histopathology',
        regNumber: 'WB-PMAC-7781',
        phone: '+91 98300 22003',
        email: 'ananya.path@labmedix.org',
        signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><path d="M14,40 Q42,14 68,36 T122,25 T160,38 T185,22" fill="none" stroke="%234338ca" stroke-width="2.5" stroke-linecap="round"/></svg>',
        status: 'active',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z'
      }
    ];
  }

  public static getAllTechnicians(): LabTechnicianItem[] {
    const list = StorageService.getItem<LabTechnicianItem[]>(TECHNICIAN_MASTER_STORAGE_KEY, []);
    if (!list || list.length === 0) {
      const initial = this.getInitialTechnicians();
      StorageService.setItem(TECHNICIAN_MASTER_STORAGE_KEY, initial);
      return initial;
    }
    return list;
  }

  public static getActiveTechnicians(): LabTechnicianItem[] {
    return this.getAllTechnicians().filter(t => t.status === 'active');
  }

  public static getTechnicianById(id: string): LabTechnicianItem | undefined {
    return this.getAllTechnicians().find(t => t.id === id || t.technicianCode === id || t.name.toLowerCase() === id.toLowerCase());
  }

  public static saveTechnicians(technicians: LabTechnicianItem[]): void {
    StorageService.setItem(TECHNICIAN_MASTER_STORAGE_KEY, technicians);
  }

  public static createTechnician(
    input: Omit<LabTechnicianItem, 'id' | 'technicianCode' | 'createdAt' | 'updatedAt'>,
    operatorRole: string = 'super_admin'
  ): { success: boolean; technician?: LabTechnicianItem; error?: string } {
    if (operatorRole !== 'super_admin' && operatorRole !== 'admin' && operatorRole !== 'lab_staff') {
      return { success: false, error: 'Access Denied: Authorized Super Administrator or Lab Admin clearance required.' };
    }

    if (!input.name.trim()) {
      return { success: false, error: 'Technician Name is required.' };
    }

    const currentList = this.getAllTechnicians();
    const newCode = generateTechnicianCode(currentList.map(t => t.technicianCode));
    const newId = `tech_${generateUuid().slice(0, 8)}`;
    const now = new Date().toISOString();

    const newTechnician: LabTechnicianItem = {
      ...input,
      id: newId,
      technicianCode: newCode,
      createdAt: now,
      updatedAt: now
    };

    currentList.push(newTechnician);
    this.saveTechnicians(currentList);
    ApiSyncService.saveDocument('technicians', newTechnician.id, newTechnician).catch(() => {});

    AuditService.log(
      'LAB_TECHNICIAN_CREATED',
      'clinical',
      `Registered Laboratory Technologist ${newTechnician.name} (${newTechnician.technicianCode}, Reg: ${newTechnician.regNumber})`,
      newTechnician.id
    );

    return { success: true, technician: newTechnician };
  }

  public static updateTechnician(
    id: string,
    updates: Partial<LabTechnicianItem>,
    operatorRole: string = 'super_admin'
  ): { success: boolean; technician?: LabTechnicianItem; error?: string } {
    if (operatorRole !== 'super_admin' && operatorRole !== 'admin' && operatorRole !== 'lab_staff') {
      return { success: false, error: 'Access Denied: Authorized Super Administrator or Lab Admin clearance required.' };
    }

    const currentList = this.getAllTechnicians();
    const index = currentList.findIndex(t => t.id === id || t.technicianCode === id);
    if (index === -1) {
      return { success: false, error: 'Technician record not found.' };
    }

    const updated: LabTechnicianItem = {
      ...currentList[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    currentList[index] = updated;
    this.saveTechnicians(currentList);
    ApiSyncService.saveDocument('technicians', updated.id, updated).catch(() => {});

    AuditService.log(
      'LAB_TECHNICIAN_UPDATED',
      'clinical',
      `Updated Laboratory Technologist profile for ${updated.name} (${updated.technicianCode})`,
      updated.id
    );

    return { success: true, technician: updated };
  }

  public static deleteTechnician(
    id: string,
    operatorRole: string = 'super_admin'
  ): { success: boolean; error?: string } {
    if (operatorRole !== 'super_admin') {
      return { success: false, error: 'Access Denied: Only Super Administrator has authority to delete technician records.' };
    }

    const currentList = this.getAllTechnicians();
    const index = currentList.findIndex(t => t.id === id || t.technicianCode === id);
    if (index === -1) {
      return { success: false, error: 'Technician not found.' };
    }

    const removed = currentList.splice(index, 1)[0];
    this.saveTechnicians(currentList);
    ApiSyncService.deleteDocument('technicians', removed.id).catch(() => {});

    AuditService.log(
      'LAB_TECHNICIAN_DELETED',
      'clinical',
      `Super Admin expunged technologist record for ${removed.name} (${removed.technicianCode})`,
      removed.id
    );

    return { success: true };
  }
}
