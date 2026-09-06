import {
  CardDispatchRecord,
  CardDispatchBatch,
  CardPrintStatus,
  CardDispatchStatus,
  CardCourierPartner,
  CardDispatchPriority,
  HealthCard,
  Patient,
  Membership,
  Address
} from '../types';
import { StorageService } from './storage';
import { AuditService } from './auditService';
import { DEFAULT_MEMBERSHIPS } from '../constants/memberships';

export interface DispatchRecommendation {
  id: string;
  type: 'urgent_print' | 'a4_batch_ready' | 'nfc_qc_needed' | 'courier_manifest_ready' | 'delivery_followup' | 'pin_cluster';
  title: string;
  description: string;
  count: number;
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
  recordIds: string[];
  filterParam?: {
    printStatus?: CardPrintStatus;
    dispatchStatus?: CardDispatchStatus;
    priority?: CardDispatchPriority;
    district?: string;
    courier?: CardCourierPartner;
  };
}

export class CardDispatchService {
  private static DEFAULT_KIT_ITEMS = [
    'CR80 High-Gloss PVC Smart Health Card',
    'Emergency QR & Medical NFC Lanyard',
    'Cardholder Welcome & Rights Guidebook',
    'Hospital & Lab Discount Voucher Booklet',
    'Anti-Demagnetization Protective Shield Sleeve'
  ];

  /** Generates Initial Realistic Sample Dispatch Records linked to active cards */
  private static generateInitialDispatches(): CardDispatchRecord[] {
    const patients = StorageService.getPatients();
    const cards = StorageService.getCards();
    const memberships = StorageService.getMemberships();

    if (cards.length === 0 || patients.length === 0) {
      return [];
    }

    const records: CardDispatchRecord[] = [];
    const now = Date.now();

    // Map existing cards to realistic dispatch stages
    cards.slice(0, 15).forEach((card, index) => {
      const patient = patients.find(p => p.id === card.patientId);
      if (!patient) return;

      const membership = memberships.find(m => m.id === card.membershipId) || DEFAULT_MEMBERSHIPS[0];
      const address: Address = patient.address || {
        villageArea: 'Block AC, Sector 1',
        postOffice: 'Salt Lake',
        policeStation: 'Bidhannagar North',
        district: 'Kolkata',
        state: 'West Bengal',
        pinCode: '700064',
        fullAddress: 'Block AC, Sector 1, Salt Lake, Kolkata 700064'
      };

      const dispatchId = `DSP-${new Date().getFullYear()}-${String(index + 101).padStart(5, '0')}`;
      const createdAt = new Date(now - (15 - index) * 86400000).toISOString();

      let printStatus: CardPrintStatus = 'printed';
      let dispatchStatus: CardDispatchStatus = 'in_transit';
      let priority: CardDispatchPriority = index % 4 === 0 ? 'urgent' : index % 3 === 0 ? 'high' : 'standard';
      let courierPartner: CardCourierPartner = index % 3 === 0 ? 'speed_post' : index % 2 === 0 ? 'bluedart' : 'delhivery';
      let consignmentNo = this.generateConsignmentNo(courierPartner, index + 100);

      // Distribute realistically across lifecycle
      if (index === 0 || index === 1) {
        printStatus = 'pending_print';
        dispatchStatus = 'queued';
        priority = 'urgent';
      } else if (index === 2 || index === 3) {
        printStatus = 'printed';
        dispatchStatus = 'queued';
      } else if (index === 4 || index === 5) {
        printStatus = 'qc_passed';
        dispatchStatus = 'packaged';
      } else if (index >= 6 && index <= 9) {
        printStatus = 'qc_passed';
        dispatchStatus = 'in_transit';
      } else if (index >= 10 && index <= 12) {
        printStatus = 'qc_passed';
        dispatchStatus = 'out_for_delivery';
      } else {
        printStatus = 'qc_passed';
        dispatchStatus = 'delivered';
      }

      const record: CardDispatchRecord = {
        id: dispatchId,
        cardId: card.id,
        cardNumber: card.cardNumber,
        patientId: patient.id,
        patientName: patient.fullName,
        patientMobile: patient.mobile,
        patientEmail: patient.email,
        bloodGroup: patient.bloodGroup || 'B+',
        address: address,
        membershipName: membership.name,
        membershipColor: membership.color,
        photoUrl: patient.photoUrl,
        printStatus,
        dispatchStatus,
        priority,
        courierPartner,
        consignmentNo,
        trackingUrl: `https://track.labmedix.org/shipment/${consignmentNo}`,
        printedAt: printStatus !== 'pending_print' ? new Date(now - (12 - index) * 86400000).toISOString() : undefined,
        printedBy: printStatus !== 'pending_print' ? 'Debashis Roy (CR80 Studio Lead)' : undefined,
        printFormat: 'cr80_pvc',
        qcCheckedAt: (printStatus === 'qc_passed' || dispatchStatus === 'in_transit' || dispatchStatus === 'delivered') ? new Date(now - (10 - index) * 86400000).toISOString() : undefined,
        qcCheckedBy: (printStatus === 'qc_passed' || dispatchStatus === 'in_transit' || dispatchStatus === 'delivered') ? 'Dr. Priya Sengupta (Quality Auditor)' : undefined,
        nfcUidVerified: card.nfcUid || '04:E2:89:1A:B5:4C:80',
        barcodeVerified: true,
        packagedAt: dispatchStatus !== 'queued' ? new Date(now - (8 - index) * 86400000).toISOString() : undefined,
        packagedBy: dispatchStatus !== 'queued' ? 'Swapan Mondal (Dispatch Logistics)' : undefined,
        envelopeBarcode: `ENV-${card.cardNumber.replace(/[^0-9]/g, '')}`,
        kitContents: [...this.DEFAULT_KIT_ITEMS],
        dispatchedAt: (dispatchStatus === 'in_transit' || dispatchStatus === 'out_for_delivery' || dispatchStatus === 'delivered') ? new Date(now - (4 - (index % 4)) * 86400000).toISOString() : undefined,
        dispatchedBy: (dispatchStatus === 'in_transit' || dispatchStatus === 'out_for_delivery' || dispatchStatus === 'delivered') ? 'Central Dispatch Office' : undefined,
        deliveryExecutiveName: courierPartner === 'speed_post' ? 'India Post Postal Beat #14' : 'Rahul Karmakar (Field Agent)',
        deliveryExecutivePhone: '+91 98311 44520',
        estimatedDelivery: new Date(now + 2 * 86400000).toISOString().split('T')[0],
        deliveredAt: dispatchStatus === 'delivered' ? new Date(now - 1 * 86400000).toISOString() : undefined,
        deliveredTo: dispatchStatus === 'delivered' ? patient.fullName : undefined,
        deliveredRelationship: dispatchStatus === 'delivered' ? 'Self / Cardholder' : undefined,
        receiverSignatureOrOtp: dispatchStatus === 'delivered' ? 'VERIFIED-OTP-7729' : undefined,
        smsNotificationSent: dispatchStatus !== 'queued',
        whatsappNotificationSent: dispatchStatus !== 'queued',
        lastNotifiedAt: new Date(now - 2 * 86400000).toISOString(),
        timeline: [
          {
            id: `TL-01-${index}`,
            status: 'pending_print',
            title: 'Card Order Created & Queued',
            description: `Health card ${card.cardNumber} queued for CR80 production.`,
            timestamp: createdAt,
            actor: 'System Auto-Engine'
          },
          ...(printStatus !== 'pending_print'
            ? [
                {
                  id: `TL-02-${index}`,
                  status: 'printed' as CardPrintStatus,
                  title: 'CR80 PVC Card Printed & Laminated',
                  description: 'Thermal dye-sublimation dual side printing completed successfully.',
                  timestamp: new Date(now - (12 - index) * 86400000).toISOString(),
                  actor: 'Debashis Roy'
                }
              ]
            : []),
          ...(printStatus === 'qc_passed' || dispatchStatus === 'in_transit' || dispatchStatus === 'delivered'
            ? [
                {
                  id: `TL-03-${index}`,
                  status: 'qc_passed' as CardPrintStatus,
                  title: 'NFC Contactless Chip & Barcode QC Passed',
                  description: `ISO/IEC 14443 Type A contactless UID verified (${card.nfcUid || '04:E2:89:1A:B5:4C:80'}).`,
                  timestamp: new Date(now - (10 - index) * 86400000).toISOString(),
                  actor: 'Dr. Priya Sengupta'
                }
              ]
            : []),
          ...(dispatchStatus === 'in_transit' || dispatchStatus === 'out_for_delivery' || dispatchStatus === 'delivered'
            ? [
                {
                  id: `TL-04-${index}`,
                  status: 'in_transit' as CardDispatchStatus,
                  title: `Handed over to ${courierPartner.toUpperCase()}`,
                  description: `Consignment AWB #${consignmentNo} scanned and in-transit to delivery hub.`,
                  location: 'Kolkata Central Logistics Hub',
                  timestamp: new Date(now - (4 - (index % 4)) * 86400000).toISOString(),
                  actor: 'Central Dispatch Hub'
                }
              ]
            : []),
          ...(dispatchStatus === 'delivered'
            ? [
                {
                  id: `TL-05-${index}`,
                  status: 'delivered' as CardDispatchStatus,
                  title: 'Delivered & Acknowledged',
                  description: `Successfully delivered to ${patient.fullName} via OTP verification.`,
                  timestamp: new Date(now - 1 * 86400000).toISOString(),
                  actor: 'Delivery Agent'
                }
              ]
            : [])
        ],
        notes: priority === 'urgent' ? 'High priority delivery request for urgent clinical consultation.' : 'Standard welcome kit parcel.',
        createdAt,
        updatedAt: new Date().toISOString()
      };

      records.push(record);
    });

    return records;
  }

  public static generateConsignmentNo(courier: CardCourierPartner, seed: number = Date.now()): string {
    const num = Math.floor(10000000 + (seed % 89999999));
    switch (courier) {
      case 'speed_post':
        return `EK${num}IN`;
      case 'bluedart':
        return `BD${num}`;
      case 'delhivery':
        return `DL${num}`;
      case 'dtdc':
        return `DT${num}`;
      case 'executive_hand':
        return `HND-${new Date().getFullYear()}-${num.toString().substring(0, 5)}`;
      case 'counter_pickup':
        return `CTR-${num.toString().substring(0, 6)}`;
      case 'ngo_camp':
        return `CMP-${num.toString().substring(0, 6)}`;
      default:
        return `LMDX-AWB-${num}`;
    }
  }

  public static getAll(): CardDispatchRecord[] {
    let records = StorageService.getCardDispatches();
    if (!records || records.length === 0) {
      records = this.generateInitialDispatches();
      if (records.length > 0) {
        StorageService.saveCardDispatches(records);
      }
    }
    return records;
  }

  public static getById(id: string): CardDispatchRecord | undefined {
    return this.getAll().find(r => r.id === id);
  }

  public static getByCardId(cardId: string): CardDispatchRecord | undefined {
    return this.getAll().find(r => r.cardId === cardId);
  }

  public static getByConsignmentNo(consignmentNo: string): CardDispatchRecord | undefined {
    return this.getAll().find(r => r.consignmentNo.toUpperCase() === consignmentNo.trim().toUpperCase());
  }

  /**
   * Automatically synchronizes all active health cards from storage
   * into the card dispatch pipeline if not already queued.
   */
  public static syncAllActiveCards(): { added: number; total: number } {
    const cards = StorageService.getCards().filter(c => !c.isDeleted && c.status !== 'deleted');
    const patients = StorageService.getPatients();
    const memberships = StorageService.getMemberships();
    const existing = this.getAll();
    const existingCardIds = new Set(existing.map(r => r.cardId));

    let addedCount = 0;
    const newRecords: CardDispatchRecord[] = [];

    cards.forEach((card, idx) => {
      if (existingCardIds.has(card.id)) return;

      const patient = patients.find(p => p.id === card.patientId);
      if (!patient) return;

      const membership = memberships.find(m => m.id === card.membershipId) || DEFAULT_MEMBERSHIPS[0];
      const address: Address = patient.address || {
        villageArea: 'Sector 5',
        postOffice: 'Salt Lake',
        policeStation: 'Electronic Complex',
        district: 'Kolkata',
        state: 'West Bengal',
        pinCode: '700091',
        fullAddress: 'Salt Lake Sector 5, Kolkata, West Bengal 700091'
      };

      const dispatchId = `DSP-${new Date().getFullYear()}-${String(existing.length + addedCount + 101).padStart(5, '0')}`;
      const courierPartner: CardCourierPartner = 'speed_post';
      const consignmentNo = this.generateConsignmentNo(courierPartner, Date.now() + idx);

      const record: CardDispatchRecord = {
        id: dispatchId,
        cardId: card.id,
        cardNumber: card.cardNumber,
        patientId: patient.id,
        patientName: patient.fullName,
        patientMobile: patient.mobile,
        patientEmail: patient.email,
        bloodGroup: patient.bloodGroup || 'A+',
        address,
        membershipName: membership.name,
        membershipColor: membership.color,
        photoUrl: patient.photoUrl,
        printStatus: 'pending_print',
        dispatchStatus: 'queued',
        priority: patient.age >= 60 ? 'urgent' : 'standard',
        courierPartner,
        consignmentNo,
        trackingUrl: `https://track.labmedix.org/shipment/${consignmentNo}`,
        kitContents: [...this.DEFAULT_KIT_ITEMS],
        smsNotificationSent: false,
        whatsappNotificationSent: false,
        timeline: [
          {
            id: `TL-NEW-${Date.now()}-${idx}`,
            status: 'pending_print',
            title: 'Enrolled & Card Dispatch Record Created',
            description: `Health Card ${card.cardNumber} added to production queue.`,
            timestamp: new Date().toISOString(),
            actor: 'Auto Dispatch Sync'
          }
        ],
        notes: patient.age >= 60 ? 'Senior Citizen Priority Dispatch' : 'New Health Card Production Order',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      newRecords.push(record);
      addedCount++;
    });

    if (newRecords.length > 0) {
      const updated = [...newRecords, ...existing];
      StorageService.saveCardDispatches(updated);
      AuditService.log('CARD_DISPATCH_SYNCED', 'card_dispatch', `Synchronized ${addedCount} cards into dispatch queue`, 'SYSTEM');
    }

    return { added: addedCount, total: existing.length + addedCount };
  }

  public static createDispatch(payload: Partial<CardDispatchRecord> & { cardId: string; patientId: string }): CardDispatchRecord {
    const existing = this.getAll();
    const patient = StorageService.getPatients().find(p => p.id === payload.patientId);
    const card = StorageService.getCards().find(c => c.id === payload.cardId);
    const memberships = StorageService.getMemberships();
    const membership = memberships.find(m => m.id === card?.membershipId) || DEFAULT_MEMBERSHIPS[0];

    const dispatchId = payload.id || `DSP-${new Date().getFullYear()}-${String(existing.length + 101).padStart(5, '0')}`;
    const courier = payload.courierPartner || 'speed_post';
    const consignmentNo = payload.consignmentNo || this.generateConsignmentNo(courier);

    const record: CardDispatchRecord = {
      id: dispatchId,
      cardId: payload.cardId,
      cardNumber: card?.cardNumber || payload.cardNumber || 'LHC-2026-UNKNOWN',
      patientId: payload.patientId,
      patientName: patient?.fullName || payload.patientName || 'Unknown Patient',
      patientMobile: patient?.mobile || payload.patientMobile || '',
      patientEmail: patient?.email || payload.patientEmail,
      bloodGroup: patient?.bloodGroup || payload.bloodGroup || 'O+',
      address: payload.address || patient?.address || {
        villageArea: '',
        postOffice: '',
        policeStation: '',
        district: 'Kolkata',
        state: 'West Bengal',
        pinCode: '700001',
        fullAddress: 'Kolkata, West Bengal'
      },
      membershipName: membership.name,
      membershipColor: membership.color,
      photoUrl: patient?.photoUrl || payload.photoUrl,
      printStatus: payload.printStatus || 'pending_print',
      dispatchStatus: payload.dispatchStatus || 'queued',
      priority: payload.priority || 'standard',
      courierPartner: courier,
      consignmentNo,
      trackingUrl: payload.trackingUrl || `https://track.labmedix.org/shipment/${consignmentNo}`,
      kitContents: payload.kitContents || [...this.DEFAULT_KIT_ITEMS],
      smsNotificationSent: false,
      whatsappNotificationSent: false,
      timeline: [
        {
          id: `TL-${Date.now()}`,
          status: payload.printStatus || 'pending_print',
          title: 'Dispatch Order Created',
          description: `Card queued for production and dispatch.`,
          timestamp: new Date().toISOString(),
          actor: 'Operator'
        }
      ],
      notes: payload.notes || 'Created via Card Dispatch Hub',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [record, ...existing];
    StorageService.saveCardDispatches(updated);
    AuditService.log('CARD_DISPATCH_CREATED', 'card_dispatch', `Created dispatch record ${record.id} for card ${record.cardNumber}`, record.id);
    return record;
  }

  public static updateDispatch(id: string, partial: Partial<CardDispatchRecord>): CardDispatchRecord | null {
    const list = this.getAll();
    const index = list.findIndex(r => r.id === id);
    if (index === -1) return null;

    const current = list[index];
    const updated: CardDispatchRecord = {
      ...current,
      ...partial,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    StorageService.saveCardDispatches(list);
    return updated;
  }

  /**
   * Update Print Milestone (CR80 Print / Laminate)
   */
  public static markAsPrinted(id: string, operatorName: string = 'CR80 Production Desk', format: 'cr80_pvc' | 'a4_laminated' = 'cr80_pvc'): CardDispatchRecord | null {
    const record = this.getById(id);
    if (!record) return null;

    const now = new Date().toISOString();
    const newTimeline = [
      ...record.timeline,
      {
        id: `TL-PRINT-${Date.now()}`,
        status: 'printed' as CardPrintStatus,
        title: `Card Printed (${format === 'cr80_pvc' ? 'CR80 Dual-Side PVC' : 'A4 Sheet'})`,
        description: `Successfully printed with high resolution thermal substrate.`,
        timestamp: now,
        actor: operatorName
      }
    ];

    return this.updateDispatch(id, {
      printStatus: 'printed',
      printedAt: now,
      printedBy: operatorName,
      printFormat: format,
      timeline: newTimeline
    });
  }

  /**
   * Quality Check Verification (Contactless Chip + Barcode)
   */
  public static markQcPassed(id: string, officerName: string, nfcUid?: string, notes?: string): CardDispatchRecord | null {
    const record = this.getById(id);
    if (!record) return null;

    const now = new Date().toISOString();
    const newTimeline = [
      ...record.timeline,
      {
        id: `TL-QC-${Date.now()}`,
        status: 'qc_passed' as CardPrintStatus,
        title: 'QC Verification & Contactless NFC Passed',
        description: `Quality inspection approved. NFC UID: ${nfcUid || 'Verified'}.`,
        timestamp: now,
        actor: officerName
      }
    ];

    return this.updateDispatch(id, {
      printStatus: 'qc_passed',
      qcCheckedAt: now,
      qcCheckedBy: officerName,
      nfcUidVerified: nfcUid || record.nfcUidVerified || '04:E2:89:1A:B5:4C:80',
      barcodeVerified: true,
      qcNotes: notes,
      timeline: newTimeline
    });
  }

  /**
   * Package Card with Welcome Kit & Protective Envelope
   */
  public static packageCard(id: string, officerName: string, envelopeBarcode?: string, kitContents?: string[]): CardDispatchRecord | null {
    const record = this.getById(id);
    if (!record) return null;

    const now = new Date().toISOString();
    const envBarcode = envelopeBarcode || `ENV-${record.cardNumber.replace(/[^0-9]/g, '')}`;
    const newTimeline = [
      ...record.timeline,
      {
        id: `TL-PKG-${Date.now()}`,
        status: 'packaged' as CardDispatchStatus,
        title: 'Packaged in Tamper-Proof Envelope',
        description: `Welcome kit enclosed with envelope barcode ${envBarcode}.`,
        timestamp: now,
        actor: officerName
      }
    ];

    return this.updateDispatch(id, {
      dispatchStatus: 'packaged',
      packagedAt: now,
      packagedBy: officerName,
      envelopeBarcode: envBarcode,
      kitContents: kitContents || record.kitContents,
      timeline: newTimeline
    });
  }

  /**
   * Dispatch & Handover to Courier Partner
   */
  public static handoverToCourier(
    id: string,
    courierPartner: CardCourierPartner,
    consignmentNo: string,
    officerName: string = 'Logistics Officer',
    deliveryExecutiveName?: string,
    deliveryExecutivePhone?: string
  ): CardDispatchRecord | null {
    const record = this.getById(id);
    if (!record) return null;

    const now = new Date().toISOString();
    const newTimeline = [
      ...record.timeline,
      {
        id: `TL-DSP-${Date.now()}`,
        status: 'in_transit' as CardDispatchStatus,
        title: `Dispatched via ${courierPartner.toUpperCase()}`,
        description: `Handed over with Consignment / AWB #${consignmentNo}.`,
        location: 'Central Dispatch Hub',
        timestamp: now,
        actor: officerName
      }
    ];

    return this.updateDispatch(id, {
      dispatchStatus: 'in_transit',
      courierPartner,
      consignmentNo,
      trackingUrl: `https://track.labmedix.org/shipment/${consignmentNo}`,
      dispatchedAt: now,
      dispatchedBy: officerName,
      deliveryExecutiveName: deliveryExecutiveName || record.deliveryExecutiveName,
      deliveryExecutivePhone: deliveryExecutivePhone || record.deliveryExecutivePhone,
      timeline: newTimeline
    });
  }

  /**
   * Mark Delivered & Capture Acknowledgment
   */
  public static markDelivered(
    id: string,
    deliveredTo: string,
    relationship: string = 'Self',
    receiverSignatureOrOtp: string = 'OTP-VERIFIED'
  ): CardDispatchRecord | null {
    const record = this.getById(id);
    if (!record) return null;

    const now = new Date().toISOString();
    const newTimeline = [
      ...record.timeline,
      {
        id: `TL-DELIV-${Date.now()}`,
        status: 'delivered' as CardDispatchStatus,
        title: 'Delivered & Doorstep Acknowledgment Confirmed',
        description: `Delivered to ${deliveredTo} (${relationship}). Proof: ${receiverSignatureOrOtp}`,
        timestamp: now,
        actor: 'Delivery Executive'
      }
    ];

    return this.updateDispatch(id, {
      dispatchStatus: 'delivered',
      deliveredAt: now,
      deliveredTo,
      deliveredRelationship: relationship,
      receiverSignatureOrOtp,
      timeline: newTimeline
    });
  }

  /**
   * Mark Returned with Reason
   */
  public static markReturned(id: string, returnReason: string): CardDispatchRecord | null {
    const record = this.getById(id);
    if (!record) return null;

    const now = new Date().toISOString();
    const newTimeline = [
      ...record.timeline,
      {
        id: `TL-RET-${Date.now()}`,
        status: 'returned' as CardDispatchStatus,
        title: 'Shipment Returned / Undelivered',
        description: `Reason: ${returnReason}. Requires address re-verification.`,
        timestamp: now,
        actor: 'Courier Return Hub'
      }
    ];

    return this.updateDispatch(id, {
      dispatchStatus: 'returned',
      returnedAt: now,
      returnReason,
      timeline: newTimeline
    });
  }

  /**
   * Batch Print Update (Update multiple records to printed)
   */
  public static batchMarkAsPrinted(recordIds: string[], operatorName: string, format: 'cr80_pvc' | 'a4_laminated' = 'a4_laminated'): number {
    let count = 0;
    recordIds.forEach(id => {
      const res = this.markAsPrinted(id, operatorName, format);
      if (res) count++;
    });
    AuditService.log('CARD_BATCH_PRINTED', 'card_dispatch', `Batch printed ${count} cards (${format})`, 'BATCH');
    return count;
  }

  /**
   * Create Courier Dispatch Batch Manifest
   */
  public static createBatchManifest(
    batchName: string,
    courierPartner: CardCourierPartner,
    recordIds: string[],
    officerName: string = 'Dispatch Manager',
    pickupPerson?: string,
    pickupPhone?: string
  ): CardDispatchBatch {
    const batches = StorageService.getCardDispatchBatches();
    const batchId = `BATCH-${new Date().getFullYear()}-${String(batches.length + 1).padStart(3, '0')}`;
    const manifestNumber = `MNF-${new Date().getFullYear()}-${courierPartner.toUpperCase().substring(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const batch: CardDispatchBatch = {
      id: batchId,
      batchName,
      manifestNumber,
      courierPartner,
      courierPickupPerson: pickupPerson || 'Courier Pickup Associate',
      courierPickupPhone: pickupPhone || '+91 98300 11223',
      recordIds,
      totalCards: recordIds.length,
      status: 'handed_over',
      handoverTime: new Date().toISOString(),
      handoverOfficer: officerName,
      createdAt: new Date().toISOString(),
      notes: `Batch manifest for ${recordIds.length} card parcels.`
    };

    // Update all constituent records to in_transit
    recordIds.forEach(id => {
      const rec = this.getById(id);
      if (rec) {
        this.handoverToCourier(id, courierPartner, rec.consignmentNo, officerName, pickupPerson, pickupPhone);
        this.updateDispatch(id, { batchId });
      }
    });

    const updatedBatches = [batch, ...batches];
    StorageService.saveCardDispatchBatches(updatedBatches);
    AuditService.log('CARD_DISPATCH_BATCH_CREATED', 'card_dispatch', `Created dispatch manifest ${batch.manifestNumber} with ${batch.totalCards} cards`, batch.id);

    return batch;
  }

  /**
   * Smart AI & Operations Recommendation Engine
   * Evaluates card queue and outputs actionable high-yield recommendations.
   */
  public static getRecommendedActions(): DispatchRecommendation[] {
    const dispatches = this.getAll();
    const recommendations: DispatchRecommendation[] = [];

    // 1. Urgent Pending Print Cards
    const urgentPendingPrint = dispatches.filter(d => d.printStatus === 'pending_print' && (d.priority === 'urgent' || d.priority === 'high'));
    if (urgentPendingPrint.length > 0) {
      recommendations.push({
        id: 'rec-urgent-print',
        type: 'urgent_print',
        title: `${urgentPendingPrint.length} Urgent / High-Priority Cards Need Printing`,
        description: 'Priority cards (including Senior Citizens & Emergency Cases) are awaiting CR80 thermal dye sublimation.',
        count: urgentPendingPrint.length,
        priority: 'high',
        actionLabel: 'Launch Batch Print Queue',
        recordIds: urgentPendingPrint.map(r => r.id),
        filterParam: { printStatus: 'pending_print', priority: 'urgent' }
      });
    }

    // 2. A4 8-Card Sheet Ready for Batch Printing
    const allPendingPrint = dispatches.filter(d => d.printStatus === 'pending_print');
    if (allPendingPrint.length >= 4) {
      recommendations.push({
        id: 'rec-a4-batch',
        type: 'a4_batch_ready',
        title: `${allPendingPrint.length} Cards Ready for A4 Multi-Card Lamination`,
        description: 'Consolidate multiple cards onto an A4 multi-card sheet for efficient batch lamination and cutting.',
        count: allPendingPrint.length,
        priority: 'high',
        actionLabel: 'Open A4 Print Sheet',
        recordIds: allPendingPrint.map(r => r.id),
        filterParam: { printStatus: 'pending_print' }
      });
    }

    // 3. Contactless NFC & Barcode QC Needed
    const printedNeedingQc = dispatches.filter(d => d.printStatus === 'printed');
    if (printedNeedingQc.length > 0) {
      recommendations.push({
        id: 'rec-qc-needed',
        type: 'nfc_qc_needed',
        title: `${printedNeedingQc.length} Printed Cards Awaiting NFC Chip Inspection`,
        description: 'Verify 13.56 MHz RFID / NFC contactless chip payload and 2D barcode alignment prior to packaging.',
        count: printedNeedingQc.length,
        priority: 'medium',
        actionLabel: 'Start Batch QC Scanner',
        recordIds: printedNeedingQc.map(r => r.id),
        filterParam: { printStatus: 'printed' }
      });
    }

    // 4. Packaged Parcels Ready for Courier Handover
    const packagedReady = dispatches.filter(d => d.dispatchStatus === 'packaged');
    if (packagedReady.length > 0) {
      recommendations.push({
        id: 'rec-courier-manifest',
        type: 'courier_manifest_ready',
        title: `${packagedReady.length} Packaged Cards Ready for Courier Manifest`,
        description: 'Parcels sealed with welcome kits. Generate official handover run-sheet and dispatch tracking stickers.',
        count: packagedReady.length,
        priority: 'high',
        actionLabel: 'Create Handover Manifest',
        recordIds: packagedReady.map(r => r.id),
        filterParam: { dispatchStatus: 'packaged' }
      });
    }

    // 4b. India Post Speed Post Labels & Envelope Stickers Ready
    const speedPostQueue = dispatches.filter(d => d.courierPartner === 'speed_post' && d.dispatchStatus !== 'delivered' && d.dispatchStatus !== 'returned');
    if (speedPostQueue.length > 0) {
      recommendations.push({
        id: 'rec-speed-post-labels',
        type: 'courier_manifest_ready',
        title: `${speedPostQueue.length} India Post Speed Post Labels (AWB) Ready to Print`,
        description: 'High-contrast AWB consignment labels with barcode (EK...IN), routing PIN codes, and scannable QR delivery proof.',
        count: speedPostQueue.length,
        priority: 'high',
        actionLabel: 'Print Speed Post Labels',
        recordIds: speedPostQueue.map(r => r.id),
        filterParam: { courier: 'speed_post' }
      });
    }

    // 5. Postal Pin Code Clusters for Bulk Delivery
    const districtGroups: Record<string, CardDispatchRecord[]> = {};
    dispatches.filter(d => d.dispatchStatus === 'queued' || d.dispatchStatus === 'packaged').forEach(d => {
      const dist = d.address?.district || 'Kolkata';
      if (!districtGroups[dist]) districtGroups[dist] = [];
      districtGroups[dist].push(d);
    });

    Object.entries(districtGroups).forEach(([district, items]) => {
      if (items.length >= 3) {
        recommendations.push({
          id: `rec-dist-${district.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'pin_cluster',
          title: `Route Optimization: ${items.length} Pending Cards for ${district}`,
          description: `Grouped delivery run recommended for PIN codes in ${district} to minimize logistics turnaround.`,
          count: items.length,
          priority: 'medium',
          actionLabel: `View ${district} Parcels`,
          recordIds: items.map(r => r.id),
          filterParam: { district }
        });
      }
    });

    // 6. Returned / Undelivered Alert
    const returnedParcels = dispatches.filter(d => d.dispatchStatus === 'returned');
    if (returnedParcels.length > 0) {
      recommendations.push({
        id: 'rec-returned-alert',
        type: 'delivery_followup',
        title: `${returnedParcels.length} Returned Cards Require Patient Re-Verification`,
        description: 'Parcels returned due to incorrect address or recipient absence. Contact patient to update destination.',
        count: returnedParcels.length,
        priority: 'high',
        actionLabel: 'Review Returned Shipments',
        recordIds: returnedParcels.map(r => r.id),
        filterParam: { dispatchStatus: 'returned' }
      });
    }

    return recommendations;
  }
}
