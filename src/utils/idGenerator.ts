/**
 * Safe Sequence & ID Generators for LABMEDIX
 */

export function generatePatientId(existingIds: string[]): string {
  const currentYear = new Date().getFullYear();
  const prefix = `LMDX-${currentYear}-`;
  
  let maxSeq = 0;
  existingIds.forEach(id => {
    if (id && id.startsWith(prefix)) {
      const parts = id.split('-');
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const paddedSeq = String(nextSeq).padStart(6, '0');
  return `${prefix}${paddedSeq}`;
}

export function generateCardNumber(existingCardNumbers: string[]): string {
  const currentYear = new Date().getFullYear();
  const prefix = `LHC-${currentYear}-`;
  
  let maxSeq = 0;
  existingCardNumbers.forEach(numStr => {
    if (numStr && numStr.startsWith(prefix)) {
      const parts = numStr.split('-');
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const paddedSeq = String(nextSeq).padStart(6, '0');
  return `${prefix}${paddedSeq}`;
}

export function generateFamilyId(existingFamilyIds: string[]): string {
  const currentYear = new Date().getFullYear();
  const prefix = `FAM-${currentYear}-`;
  
  let maxSeq = 0;
  existingFamilyIds.forEach(id => {
    if (id && id.startsWith(prefix)) {
      const parts = id.split('-');
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const paddedSeq = String(nextSeq).padStart(6, '0');
  return `${prefix}${paddedSeq}`;
}

export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) {
    p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VER-${p1}-${p2}`;
}

export function generateCardCvv(): string {
  return String(Math.floor(100 + Math.random() * 900));
}

export function generateTransactionReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TXN-${timestamp}-${random}`;
}

export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function generateNfcUid(): string {
  const bytes = ['04'];
  for (let i = 0; i < 6; i++) {
    bytes.push(Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase());
  }
  return bytes.join(':');
}

export function generateStaffId(existingIds: string[]): string {
  let maxSeq = 0;
  existingIds.forEach(id => {
    if (id) {
      const match = id.match(/LMDX-STF-(\d+)/i) || id.match(/STF-(\d+)/i) || id.match(/\d+$/);
      if (match) {
        const num = parseInt(match[1] || match[0], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });
  return `LMDX-STF-${String(maxSeq + 1).padStart(3, '0')}`;
}

export function generateCardRequestId(existingIds: string[]): string {
  const currentYear = new Date().getFullYear();
  const prefix = `LMDX-REQ-${currentYear}-`;
  let maxSeq = 0;
  existingIds.forEach(id => {
    if (id && id.startsWith(prefix)) {
      const parts = id.split('-');
      if (parts.length === 4) {
        const num = parseInt(parts[3], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });
  return `${prefix}${String(maxSeq + 1).padStart(6, '0')}`;
}

export function generateBillNumber(existingBills?: Array<{ billNumber?: string } | string>): string {
  const currentYear = new Date().getFullYear();
  const prefix = `BILL-${currentYear}-`;
  let maxSeq = 0;
  if (existingBills && Array.isArray(existingBills)) {
    existingBills.forEach(b => {
      const bNum = typeof b === 'string' ? b : b?.billNumber;
      if (bNum && bNum.startsWith(prefix)) {
        const numPart = parseInt(bNum.replace(prefix, ''), 10);
        if (!isNaN(numPart) && numPart > maxSeq) {
          maxSeq = numPart;
        }
      }
    });
  }
  return `${prefix}${String(maxSeq + 1).padStart(6, '0')}`;
}

export function generateTransactionId(existingTxns?: Array<{ id?: string; transactionId?: string } | string>): string {
  const currentYear = new Date().getFullYear();
  const prefix = `TXN-${currentYear}-`;
  let maxSeq = 0;
  if (existingTxns && Array.isArray(existingTxns)) {
    existingTxns.forEach(t => {
      const tId = typeof t === 'string' ? t : (t?.transactionId || t?.id);
      if (tId && tId.startsWith(prefix)) {
        const numPart = parseInt(tId.replace(prefix, ''), 10);
        if (!isNaN(numPart) && numPart > maxSeq) {
          maxSeq = numPart;
        }
      }
    });
  }
  if (maxSeq === 0) {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}${randomSuffix}`;
  }
  return `${prefix}${String(maxSeq + 1).padStart(6, '0')}`;
}

export function generateLabOrderId(existingOrders?: Array<{ id?: string; orderNumber?: string } | string>): string {
  const currentYear = new Date().getFullYear();
  const prefix = `LMDX-LAB-${currentYear}-`;
  let maxSeq = 0;
  if (existingOrders && Array.isArray(existingOrders)) {
    existingOrders.forEach(o => {
      const oNum = typeof o === 'string' ? o : (o?.orderNumber || o?.id);
      if (oNum && oNum.startsWith(prefix)) {
        const numPart = parseInt(oNum.replace(prefix, ''), 10);
        if (!isNaN(numPart) && numPart > maxSeq) {
          maxSeq = numPart;
        }
      }
    });
  }
  return `${prefix}${String(maxSeq + 1).padStart(6, '0')}`;
}

export function generateSampleBarcode(existingBarcodes?: string[]): string {
  const currentYear = new Date().getFullYear();
  const prefix = `LMX-SMP-${currentYear}-`;
  let maxSeq = 0;
  if (existingBarcodes && Array.isArray(existingBarcodes)) {
    existingBarcodes.forEach(b => {
      if (b && b.startsWith(prefix)) {
        const num = parseInt(b.replace(prefix, ''), 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });
  }
  if (maxSeq === 0) {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}${randomSuffix}`;
  }
  return `${prefix}${String(maxSeq + 1).padStart(6, '0')}`;
}

export function generateQueueToken(existingTokens?: Array<{ tokenNumber?: string } | string>): string {
  let maxNum = 0;
  if (existingTokens && Array.isArray(existingTokens)) {
    existingTokens.forEach(t => {
      const tokStr = typeof t === 'string' ? t : t?.tokenNumber;
      if (tokStr) {
        const match = tokStr.match(/\d+/);
        if (match) {
          const n = parseInt(match[0], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    });
  }
  return `T-${String(maxNum + 1).padStart(3, '0')}`;
}

export function generateDiagnosticReportNumber(existingReports?: string[]): string {
  const currentYear = new Date().getFullYear();
  const prefix = `LMDX-RPT-${currentYear}-`;
  let maxSeq = 0;
  if (existingReports && Array.isArray(existingReports)) {
    existingReports.forEach(r => {
      if (r && r.startsWith(prefix)) {
        const num = parseInt(r.replace(prefix, ''), 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });
  }
  if (maxSeq === 0) {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}${randomSuffix}`;
  }
  return `${prefix}${String(maxSeq + 1).padStart(6, '0')}`;
}

export function generateTechnicianCode(existingCodes?: string[]): string {
  let maxNum = 0;
  if (existingCodes && Array.isArray(existingCodes)) {
    existingCodes.forEach(code => {
      if (code && code.startsWith('LT-')) {
        const num = parseInt(code.replace('LT-', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
  }
  return `LT-${String(maxNum + 1).padStart(3, '0')}`;
}