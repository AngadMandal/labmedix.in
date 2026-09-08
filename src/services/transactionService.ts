import { CentralTransaction, StaffCardTransaction } from '../types';
import { StorageService } from './storage';
import { ApiSyncService } from './apiSyncService';
import { AuditService } from './auditService';
import { generateTransactionId } from '../utils/idGenerator';

const CENTRAL_TRANSACTIONS_STORAGE_KEY = 'labmedix_central_transactions_v1';

export class TransactionService {
  public static getAll(): CentralTransaction[] {
    const list = StorageService.getItem<CentralTransaction[]>(CENTRAL_TRANSACTIONS_STORAGE_KEY, []);
    // Also include any legacy card transactions seamlessly
    const legacyCardTxns = StorageService.getCardRequestTransactions();
    const existingIds = new Set(list.map(t => t.id || t.transactionId));

    legacyCardTxns.forEach(ct => {
      const id = ct.transactionId || ct.id;
      if (!existingIds.has(id)) {
        list.push({
          id,
          transactionId: id,
          billNumber: ct.billNumber || `BILL-${id}`,
          billId: ct.billId,
          patientId: ct.patientId,
          patientName: ct.patientName,
          patientMobile: ct.patientMobile,
          service: `Smart Health Card (${ct.membershipName || 'Plan'})`,
          module: 'cards',
          amount: ct.amount || ct.baseAmount || 0,
          discount: ct.discountAmount || 0,
          paid: ct.paidAmount || 0,
          due: ct.dueAmount || 0,
          paymentMethod: ct.paymentMethod || 'cash',
          paymentStatus: (ct.paymentStatus as any) || 'paid',
          staffId: ct.staffUserId || 'usr_staff',
          staffName: ct.staffName || 'Authorized Staff',
          staffRole: ct.staffRole || 'reception',
          date: ct.createdAt || new Date().toISOString(),
          createdAt: ct.createdAt || new Date().toISOString(),
          notes: ct.notes
        });
        existingIds.add(id);
      }
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  }

  public static saveAll(transactions: CentralTransaction[]): void {
    StorageService.setItem(CENTRAL_TRANSACTIONS_STORAGE_KEY, transactions);
  }

  public static async recordTransaction(
    input: Omit<CentralTransaction, 'id' | 'transactionId' | 'createdAt'> & { id?: string; transactionId?: string }
  ): Promise<CentralTransaction> {
    const all = this.getAll();
    const now = new Date().toISOString();
    const txnId = input.transactionId || input.id || generateTransactionId(all);

    const gross = Number(input.amount || 0);
    const discount = Number(input.discount || 0);
    const tax = Number(input.tax || 0);
    const net = Math.max(0, gross - discount + tax);
    const paid = Number(input.paid || 0);
    const due = Math.max(0, net - paid);

    let paymentStatus: CentralTransaction['paymentStatus'] = input.paymentStatus || 'paid';
    if (paid >= net && net > 0) {
      paymentStatus = 'paid';
    } else if (paid > 0 && due > 0) {
      paymentStatus = 'partial_due';
    } else if (paid === 0 && due > 0) {
      paymentStatus = 'unpaid_due';
    } else if (net === 0) {
      paymentStatus = 'waived';
    }

    const newRecord: CentralTransaction = {
      ...input,
      id: txnId,
      transactionId: txnId,
      amount: gross,
      discount,
      tax,
      paid,
      due,
      paymentStatus,
      date: input.date || now,
      createdAt: now,
      updatedAt: now
    };

    all.unshift(newRecord);
    this.saveAll(all);

    // Sync directly to Central Firestore
    try {
      await ApiSyncService.saveDocument('transactions', txnId, newRecord);
    } catch (err) {
      console.warn('[TransactionService] Firestore sync notice:', err);
    }

    // Automatically record in institutional cryptographic audit log
    AuditService.log(
      'FINANCIAL_TRANSACTION_RECORDED',
      'wallet',
      `Transaction ${txnId} for ₹${paid} recorded for ${newRecord.patientName} (${newRecord.service}) by ${newRecord.staffName}. Due: ₹${due}.`,
      txnId,
      {
        billNumber: newRecord.billNumber,
        service: newRecord.service,
        amount: gross,
        paid,
        due,
        module: newRecord.module,
        paymentMethod: newRecord.paymentMethod
      },
      'financial'
    );

    return newRecord;
  }

  public static async recordPaymentOnDue(
    transactionId: string,
    additionalPaid: number,
    staffName: string = 'Authorized Staff'
  ): Promise<CentralTransaction | null> {
    const all = this.getAll();
    const txn = all.find(t => t.id === transactionId || t.transactionId === transactionId);
    if (!txn) return null;

    const addPaid = Math.max(0, Number(additionalPaid) || 0);
    txn.paid = (txn.paid || 0) + addPaid;
    txn.due = Math.max(0, (txn.due || 0) - addPaid);
    txn.paymentStatus = txn.due === 0 ? 'paid' : 'partial_due';
    txn.updatedAt = new Date().toISOString();

    this.saveAll(all);
    try {
      await ApiSyncService.saveDocument('transactions', txn.id, txn);
    } catch {}

    AuditService.log(
      'PAYMENT_DUE_COLLECTED',
      'wallet',
      `Payment of ₹${addPaid} received against Due on Txn ${txn.id} for ${txn.patientName}. Remaining Due: ₹${txn.due}`,
      txn.id,
      { transactionId: txn.id, additionalPaid: addPaid, remainingDue: txn.due, collectedBy: staffName },
      'financial'
    );

    return txn;
  }

  public static getByPatient(patientId: string): CentralTransaction[] {
    return this.getAll().filter(t => t.patientId === patientId);
  }

  public static getMetrics(): {
    totalTransactions: number;
    totalGrossRevenue: number;
    totalCollectedPaid: number;
    totalOutstandingDue: number;
    totalDiscounts: number;
    todayPaidAmount: number;
  } {
    const all = this.getAll();
    const todayStr = new Date().toISOString().slice(0, 10);

    let totalGrossRevenue = 0;
    let totalCollectedPaid = 0;
    let totalOutstandingDue = 0;
    let totalDiscounts = 0;
    let todayPaidAmount = 0;

    all.forEach(t => {
      totalGrossRevenue += Number(t.amount || 0);
      totalCollectedPaid += Number(t.paid || 0);
      totalOutstandingDue += Number(t.due || 0);
      totalDiscounts += Number(t.discount || 0);

      const txnDate = (t.date || t.createdAt || '').slice(0, 10);
      if (txnDate === todayStr) {
        todayPaidAmount += Number(t.paid || 0);
      }
    });

    return {
      totalTransactions: all.length,
      totalGrossRevenue,
      totalCollectedPaid,
      totalOutstandingDue,
      totalDiscounts,
      todayPaidAmount
    };
  }
}
