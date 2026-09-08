import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CardApplicationRequest, HealthCard, Patient, CashDeskVoucher } from '../../types';
import { PortalService } from '../../services/portalService';
import { StorageService } from '../../services/storage';
import { CashDeskVoucherService } from '../../services/cashDeskVoucherService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import { CardRequestSlipModal } from '../portal/CardRequestSlipModal';
import { StaffCardRequestBillSlipModal } from './StaffCardRequestBillSlipModal';
import { StaffCardRequestService } from '../../services/staffCardRequestService';
import { checkUserPermission } from '../../constants/roles';
import {
  CheckCircle2,
  XCircle,
  CreditCard,
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  ShieldCheck,
  Zap,
  MessageSquare,
  QrCode,
  Check,
  Send,
  Calendar,
  AlertTriangle,
  Copy,
  Ticket,
  Lock,
  Building2,
  FileCheck2,
  ShieldAlert,
  Printer,
  HelpCircle,
  Trash2,
  Clock,
  FileText,
  RotateCcw,
  Receipt,
  MessageSquarePlus
} from 'lucide-react';

export interface CardApplicationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: CardApplicationRequest | null;
  onApproved: (card?: HealthCard, patient?: Patient) => void;
  onRejected: () => void;
}

export const CardApplicationReviewModal: React.FC<CardApplicationReviewModalProps> = ({
  isOpen,
  onClose,
  application,
  onApproved,
  onRejected
}) => {
  const { showToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [isBankReconciled, setIsBankReconciled] = useState(false);
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [isBillSlipOpen, setIsBillSlipOpen] = useState(false);
  const company = StorageService.getCompanyProfile();
  const currentUser = StorageService.getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const canApprove = isSuperAdmin || checkUserPermission(currentUser, 'card_request_approve');
  const canReject = isSuperAdmin || checkUserPermission(currentUser, 'card_request_reject');
  const canDelete = isSuperAdmin || checkUserPermission(currentUser, 'card_delete');

  // Find linked Cash Desk Voucher if paid by voucher
  const linkedVoucher = useMemo<CashDeskVoucher | null>(() => {
    if (!application || !application.paymentReference) return null;
    const ref = application.paymentReference.toUpperCase();
    const allVouchers = CashDeskVoucherService.getPublicVouchers();
    return allVouchers.find(v => ref.includes(v.voucherCode.toUpperCase()) || v.voucherCode.toUpperCase() === ref) || null;
  }, [application]);

  if (!application) return null;

  const handleReturnForCorrection = async () => {
    if (!canReject) {
      showToast('error', 'Permission Denied', 'You do not have permission to return requests for correction.');
      return;
    }
    const reason = prompt('Enter specific correction instructions for staff:', 'Please attach clear identity proof or rectify family member details.');
    if (!reason || !reason.trim()) return;

    setIsProcessing(true);
    const res = await StaffCardRequestService.returnForCorrection(
      application.id,
      reason.trim(),
      currentUser?.fullName || 'Super Administrator'
    );
    setIsProcessing(false);

    if (res.success) {
      showToast('info', 'Returned for Correction', `Request ${application.trackingId || application.applicationNo} returned to staff.`);
      onRejected();
      onClose();
    } else {
      showToast('error', 'Error', res.error || 'Failed to return request.');
    }
  };

  const handleAddAdminNote = async () => {
    const note = prompt('Add administrative / audit note to this card request:');
    if (!note || !note.trim()) return;

    setIsProcessing(true);
    const res = await StaffCardRequestService.addAdminNote(
      application.id,
      note.trim(),
      currentUser?.fullName || 'Super Administrator'
    );
    setIsProcessing(false);

    if (res.success) {
      showToast('success', 'Admin Note Added', 'Audit note recorded successfully.');
      if (!application.adminNotes) application.adminNotes = [];
      application.adminNotes.push({
        id: `note_${Date.now()}`,
        note: note.trim(),
        addedBy: currentUser?.fullName || 'Super Administrator',
        addedAt: new Date().toISOString()
      });
    } else {
      showToast('error', 'Error', res.error || 'Failed to add admin note.');
    }
  };

  const isUtrPayment = application.paymentMethod?.toLowerCase().includes('utr') ||
                       application.paymentReference?.toUpperCase().startsWith('UTR:') ||
                       application.paymentMethod?.toLowerCase().includes('upi');

  const isVoucherPayment = application.paymentMethod?.toLowerCase().includes('voucher') ||
                           application.paymentReference?.toUpperCase().startsWith('VCH:') ||
                           !!linkedVoucher;

  const cleanUtrNumber = isUtrPayment
    ? application.paymentReference.replace(/^UTR:\s*/i, '').trim()
    : null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(true);
    showToast('info', 'Copied to Clipboard', text);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handlePaymentStatusChange = (newPayStatus: CardApplicationRequest['paymentStatus']) => {
    if (!canApprove) {
      showToast('error', 'Permission Denied', 'You do not have permission to verify or modify payment status.');
      return;
    }
    const res = PortalService.updateCardApplicationPaymentStatus(
      application.id,
      newPayStatus,
      currentUser?.fullName || 'Super Administrator'
    );
    if (res.success) {
      showToast('info', 'Payment Status Updated', `Payment status updated to ${newPayStatus.toUpperCase()}.`);
    }
  };

  const handleApprove = async () => {
    if (!canApprove) {
      showToast('error', 'Permission Denied', 'You do not have permission to approve card requests.');
      return;
    }
    setIsProcessing(true);
    const res = await PortalService.approveCardApplication(
      application.id,
      currentUser?.fullName || 'Authorized Staff'
    );
    setIsProcessing(false);

    if (res.success) {
      showToast(
        'success',
        'Application Approved! ✅',
        `Request ${application.trackingId || application.applicationNo} has been verified and approved. Physical card is now ready for explicit issuance.`
      );
      onApproved();
      onClose();
    } else {
      showToast('error', 'Approval Error', res.error || 'Failed to approve application.');
    }
  };

  const handleIssueCard = async () => {
    if (!canApprove) {
      showToast('error', 'Permission Denied', 'You do not have permission to issue health cards.');
      return;
    }
    setIsProcessing(true);
    const res = await PortalService.issueHealthCardForApplication(
      application.id,
      currentUser?.fullName || 'Authorized Staff'
    );
    setIsProcessing(false);

    if (res.success && res.card) {
      triggerCelebrationFireworks();
      showToast(
        'success',
        'Official Health Card Minted & Issued! 🚀',
        `Patient ${res.patient?.fullName || application.fullName} active. Health Card ${res.card.cardNumber} successfully issued!`
      );
      onApproved(res.card, res.patient);
      onClose();
    } else {
      showToast('error', 'Issuance Error', res.error || 'Failed to issue card.');
    }
  };

  const handleReject = () => {
    if (!canReject) {
      showToast('error', 'Permission Denied', 'You do not have permission to reject card requests.');
      return;
    }
    const reason = prompt('Please enter rejection reason / remarks:', 'Verification documents incomplete or invalid payment reference.');
    if (!reason) return;

    setIsProcessing(true);
    setTimeout(() => {
      const res = PortalService.rejectCardApplication(
        application.id,
        reason,
        currentUser?.fullName || 'Super Administrator'
      );
      setIsProcessing(false);

      if (res.success) {
        showToast('info', 'Application Rejected', `Application ${application.trackingId || application.applicationNo} marked as rejected.`);
        onRejected();
        onClose();
      } else {
        showToast('error', 'Error', res.error || 'Failed to reject application.');
      }
    }, 600);
  };

  const handleRequestInfo = () => {
    if (!canReject) {
      showToast('error', 'Permission Denied', 'You do not have permission to request additional information.');
      return;
    }
    const note = prompt('Enter missing details or instructions required from applicant:', 'Please upload clear identity proof and valid UTR transaction reference.');
    if (!note) return;

    setIsProcessing(true);
    setTimeout(() => {
      const res = PortalService.requestMoreInformation(
        application.id,
        note,
        currentUser?.fullName || 'Authorized Staff'
      );
      setIsProcessing(false);

      if (res.success) {
        showToast('info', 'Information Requested', `Application ${application.trackingId || application.applicationNo} flagged for additional info.`);
        onRejected();
        onClose();
      } else {
        showToast('error', 'Error', res.error || 'Failed to request information.');
      }
    }, 600);
  };

  const handleDelete = () => {
    if (!canDelete) {
      showToast('error', 'Permission Denied', 'You do not have permission to delete card applications.');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete card application ${application.trackingId || application.applicationNo} for ${application.fullName} from Firestore and all devices?`)) {
      return;
    }

    const res = PortalService.deleteCardApplication(application.id, currentUser?.fullName || 'Authorized Staff');
    if (res.success) {
      showToast('info', 'Application Purged', `Application ${application.trackingId || application.applicationNo} permanently purged.`);
      onRejected();
      onClose();
    } else {
      showToast('error', 'Error', res.error || 'Failed to delete application.');
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Review Online Health Card Application: ${application.applicationNo}`}
        maxWidth="4xl"
      >
      <div className="space-y-6 text-xs">
        {/* Status Header Banner */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          application.status === 'approved'
            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
            : application.status === 'pending_approval'
            ? 'bg-amber-950/80 border-amber-500 text-amber-200'
            : 'bg-rose-950/80 border-rose-500 text-rose-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/20">
              {application.status === 'approved' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : application.status === 'pending_approval' ? (
                <Zap className="w-6 h-6 text-amber-400 animate-pulse" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-400" />
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block">APPLICATION STATUS</span>
              <strong className="text-sm font-black uppercase">
                {application.status === 'approved'
                  ? 'OFFICIAL HEALTH CARD ISSUED & ACTIVE'
                  : application.status === 'pending_approval'
                  ? 'PENDING SUPER ADMIN APPROVAL & MINTING'
                  : 'APPLICATION REJECTED'}
              </strong>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-[10px] text-slate-400 block font-sans">Payment Verified:</span>
            <strong className="text-emerald-400 text-sm font-black">{formatCurrency(application.totalPaidAmount)}</strong>
          </div>
        </div>

        {/* Staff Submitter & Urgency Routing Box */}
        {(application.submittedByStaffName || application.requestSource || application.urgency || application.justificationNotes || application.patientId) && (
          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                  Staff Submitter & Request Routing Metadata
                </span>
              </div>
              <div className="flex items-center gap-2">
                {application.urgency && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase border ${
                    application.urgency === 'emergency'
                      ? 'bg-red-950 text-red-300 border-red-500 animate-pulse'
                      : application.urgency === 'urgent'
                      ? 'bg-amber-950 text-amber-300 border-amber-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    Urgency: {application.urgency}
                  </span>
                )}
                {application.requestSource && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-indigo-900/60 text-indigo-300 border border-indigo-700">
                    Source: {application.requestSource.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-slate-300 font-mono text-[11px]">
              {application.submittedByStaffName && (
                <div>
                  <span className="text-[9.5px] text-slate-400 uppercase block font-sans">Submitted By Staff:</span>
                  <strong className="text-white font-bold">{application.submittedByStaffName} ({application.submittedByStaffRole || 'Staff'})</strong>
                </div>
              )}
              {application.submittedByStaffEmail && (
                <div>
                  <span className="text-[9.5px] text-slate-400 uppercase block font-sans">Staff Email:</span>
                  <strong className="text-slate-300 truncate block">{application.submittedByStaffEmail}</strong>
                </div>
              )}
              {application.billNumber && (
                <div>
                  <span className="text-[9.5px] text-slate-400 uppercase block font-sans">Generated Bill No:</span>
                  <strong className="text-emerald-400 font-bold">{application.billNumber}</strong>
                </div>
              )}
              {application.patientId && (
                <div>
                  <span className="text-[9.5px] text-slate-400 uppercase block font-sans">Existing Patient ID:</span>
                  <strong className="text-teal-400 font-bold">{application.patientId}</strong>
                </div>
              )}
              {application.dispatchPreference && (
                <div>
                  <span className="text-[9.5px] text-slate-400 uppercase block font-sans">Dispatch Preference:</span>
                  <span className="text-slate-200 capitalize font-sans">{application.dispatchPreference.replace(/_/g, ' ')}</span>
                </div>
              )}
            </div>

            {application.justificationNotes && (
              <div className="pt-1.5 border-t border-indigo-900/50">
                <span className="text-[9.5px] text-slate-400 uppercase block font-sans">Staff Justification / Clinical Notes:</span>
                <p className="text-xs text-indigo-200 font-sans italic mt-0.5">{application.justificationNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* Applicant Profile Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left: Photo & Identification */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-center">
            <img
              src={application.photoUrl || '/logo.jpg'}
              alt={application.fullName}
              className="w-24 h-24 rounded-2xl object-cover mx-auto ring-2 ring-teal-500/50 shadow-md"
            />
            <div>
              <strong className="text-sm font-black text-white block">{application.fullName}</strong>
              <span className="text-[11px] text-teal-400 font-mono block">
                {application.gender.toUpperCase()} • {application.age} Y • Blood: {application.bloodGroup}
              </span>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase font-mono bg-amber-950 text-amber-300 border border-amber-500/40">
                {application.membershipName}
              </span>
            </div>
          </div>

          {/* Center & Right: Contact, Postal, Medical */}
          <div className="md:col-span-2 p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Applicant Profile & Contact Details:
            </span>

            <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono text-[11px]">
              <div>
                <span className="text-[9.5px] text-slate-500 uppercase block font-sans">Phone / Mobile:</span>
                <strong className="text-white font-bold">{application.mobile}</strong>
              </div>
              <div>
                <span className="text-[9.5px] text-slate-500 uppercase block font-sans">Email Address:</span>
                <strong className="text-white truncate block">{application.email || 'N/A'}</strong>
              </div>
              <div>
                <span className="text-[9.5px] text-slate-500 uppercase block font-sans">Emergency Contact:</span>
                <span>{application.emergencyContact.name} ({application.emergencyContact.relationship} - {application.emergencyContact.mobile})</span>
              </div>
              <div>
                <span className="text-[9.5px] text-slate-500 uppercase block font-sans">Allergies / Chronic:</span>
                <span className="text-amber-300">{application.medicalInfo.allergies || 'None'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[9.5px] text-slate-500 uppercase block font-sans">Full Residential Address:</span>
                <span className="text-slate-200 font-sans">{application.address.fullAddress}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Transaction & Super Admin Reconciliation Proof Box */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Super Admin Payment & Checkout Reconciliation:
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
              application.paymentStatus === 'paid'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                : 'bg-amber-950 text-amber-300 border-amber-500'
            }`}>
              {application.paymentStatus === 'paid' ? 'PAYMENT VERIFIED & REDEEMED' : 'PENDING BANK UTR RECONCILIATION'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase block font-sans">Plan Fee:</span>
              <strong className="text-white">{formatCurrency(application.membershipPrice)}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase block font-sans">Initial Float Deposit:</span>
              <strong className="text-teal-400">{formatCurrency(application.initialDeposit || 0)}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase block font-sans">Payment Channel:</span>
              <span className="text-slate-200 font-sans truncate block">{application.paymentMethod}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase block font-sans">Total Collected:</span>
              <strong className="text-emerald-400 truncate block">{formatCurrency(application.totalPaidAmount)}</strong>
            </div>
          </div>

          {/* Option 1: Super Admin 12-Digit UTR Bank Settlement Verification */}
          {isUtrPayment && (
            <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-500/50 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-teal-400 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] font-mono font-bold text-teal-400 uppercase block">
                      Submitted Bank UTR / UPI Ref:
                    </span>
                    <strong className="text-sm font-mono font-black text-white tracking-wider">
                      {cleanUtrNumber || application.paymentReference}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(cleanUtrNumber || application.paymentReference)}
                    className="border-teal-500/50 text-teal-300 hover:bg-teal-900 text-xs py-1"
                    leftIcon={copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedRef ? 'Copied UTR' : 'Copy UTR Number'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setIsBankReconciled(!isBankReconciled)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border transition-all flex items-center gap-1.5 ${
                      isBankReconciled
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-teal-400'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isBankReconciled ? 'text-white' : 'text-slate-500'}`} />
                    {isBankReconciled ? 'Bank Verified ✓' : 'Mark Bank Reconciled'}
                  </button>
                </div>
              </div>

              <div className="text-[10.5px] text-slate-300 flex items-center gap-2 pt-1 border-t border-teal-900/60">
                <Building2 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                <span>Reconcile this 12-digit UTR in Hospital Bank Ledger (VPA: 7047108226@okbizaxis) before issuing card.</span>
              </div>
            </div>
          )}

          {/* Option 2: Super Admin Cash Desk Voucher Ledger Verification & Single-Use Lock */}
          {isVoucherPayment && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase block">
                      Hospital Cash Desk Voucher Redeemed:
                    </span>
                    <strong className="text-sm font-mono font-black text-amber-200 tracking-wider">
                      {linkedVoucher ? linkedVoucher.voucherCode : application.paymentReference}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    SINGLE-USE REDEEMED
                  </span>
                  {linkedVoucher && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(linkedVoucher.voucherCode)}
                      className="border-amber-500/50 text-amber-300 hover:bg-amber-900 text-xs py-1"
                      leftIcon={copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    >
                      {copiedRef ? 'Copied' : 'Copy Code'}
                    </Button>
                  )}
                </div>
              </div>

              {linkedVoucher && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10.5px] font-mono pt-1 text-slate-300">
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-400 block font-sans">Face Value:</span>
                    <strong className="text-emerald-400">{formatCurrency(linkedVoucher.amount)}</strong>
                  </div>
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-400 block font-sans">Auth Seal:</span>
                    <strong className="text-amber-300">{linkedVoucher.authSealCode}</strong>
                  </div>
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-400 block font-sans">Category:</span>
                    <strong className="text-white truncate block">{linkedVoucher.categoryName}</strong>
                  </div>
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-400 block font-sans">Redeemed At:</span>
                    <strong className="text-slate-300 truncate block">{formatDate(linkedVoucher.redeemedAt || linkedVoucher.updatedAt)}</strong>
                  </div>
                </div>
              )}

              <div className="text-[10.5px] text-emerald-300 flex items-center gap-2 pt-1 border-t border-amber-900/60 font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Anti-Duplicate Certified: This voucher is debited from hospital cash ledger and locked permanently from reuse.</span>
              </div>
            </div>
          )}
        </div>

        {/* Family Shield Dependents List (if any) */}
        {application.familyMembers && application.familyMembers.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5 font-mono">
                👨‍👩‍👧‍👦 1-Card Family Shield Dependents ({application.familyMembers.length} Members Linked):
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500">
                  Included: {Math.min(application.familyMembers.length, 5)} / 5
                </span>
                {(application.extraFamilyMembersCount || 0) > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-500">
                    Extra: {application.extraFamilyMembersCount} (+{formatCurrency(application.extraFamilyMembersFee || 0)})
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {application.familyMembers.map((fm, idx) => (
                <div key={fm.id || idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-white font-bold block">{fm.fullName}</strong>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {fm.relationship} • {fm.age} yrs • Blood: {fm.bloodGroup || 'Not Tested'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-teal-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {fm.mobile || application.mobile}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Audit & Correction Notes (if any) */}
        {application.adminNotes && application.adminNotes.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5 font-mono">
              <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
              Administrative Notes & Audit Trail:
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {application.adminNotes.map((noteItem, idx) => (
                <div key={noteItem.id || idx} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
                  <span className="text-slate-500 font-sans text-[9.5px]">
                    [{noteItem.addedAt ? new Date(noteItem.addedAt).toLocaleString() : ''}] {noteItem.addedBy}:{' '}
                  </span>
                  {noteItem.note}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Dispatched SMS & Email Credentials Template Preview */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
              Automated Dispatched Patient Credentials (SMS & Email Preview):
            </span>
            <span className="text-[10px] font-mono text-emerald-400">
              Dispatched Instantly Upon Approval
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            {/* SMS Preview */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[9.5px] font-bold text-teal-400 uppercase block font-sans">
                📱 High-Priority Transactional SMS:
              </span>
              <p className="text-[10.5px] text-slate-300 leading-relaxed font-mono">
                Dear {application.fullName}, Welcome to {company.name}! Your Health Card (Tier: {application.membershipName}) is APPROVED & ACTIVE. Your Patient ID is [AUTO-MINTED]. Access your portal at https://labmedix.health/portal. Helpline: {company.helpline || '1800-889-9911'}
              </p>
            </div>

            {/* Email Preview */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[9.5px] font-bold text-purple-400 uppercase block font-sans">
                📧 Branded Welcome Email Notification:
              </span>
              <p className="text-[10.5px] text-slate-300 leading-relaxed font-mono">
                Subject: Official Welcome to {company.name} - Health Card & Patient ID Activated. Details: Plan: {application.membershipName}, Float: ₹{application.initialDeposit || 0}. Ready for cashless OPD & Labs.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls for Super Admin & Staff Review */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close Window
            </Button>
            <Button
              type="button"
              variant="outline"
              leftIcon={<Receipt className="w-4 h-4 text-emerald-400" />}
              onClick={() => setIsBillSlipOpen(true)}
              className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50 font-bold"
            >
              View / Print Bill & Slip
            </Button>
            <Button
              type="button"
              variant="outline"
              leftIcon={<Printer className="w-4 h-4 text-teal-400" />}
              onClick={() => setIsSlipOpen(true)}
            >
              Print Card Slip
            </Button>
            <Button
              type="button"
              variant="outline"
              leftIcon={<MessageSquarePlus className="w-4 h-4 text-amber-400" />}
              onClick={handleAddAdminNote}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-950/50"
            >
              Add Admin Note
            </Button>
          </div>

          {(canApprove || canReject) && application.status !== 'approved' && application.status !== 'issued' && application.status !== 'card_issued' && (
            <div className="flex flex-wrap items-center gap-2">
              {canReject && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-amber-500/50 text-amber-400 hover:bg-amber-950"
                  onClick={handleReturnForCorrection}
                  isLoading={isProcessing}
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                >
                  Return for Correction
                </Button>
              )}
              {canReject && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-blue-500/50 text-blue-400 hover:bg-blue-950"
                  onClick={handleRequestInfo}
                  isLoading={isProcessing}
                  leftIcon={<HelpCircle className="w-4 h-4" />}
                >
                  Request Info
                </Button>
              )}
              {canReject && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-rose-500/50 text-rose-400 hover:bg-rose-950"
                  onClick={handleReject}
                  isLoading={isProcessing}
                  leftIcon={<XCircle className="w-4 h-4" />}
                >
                  Reject Request
                </Button>
              )}
              {canDelete && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-red-600/50 text-red-500 hover:bg-red-950/50"
                  onClick={handleDelete}
                  isLoading={isProcessing}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  title="Permanently expunge application from Firestore and all devices"
                >
                  Delete
                </Button>
              )}
              {canApprove && (
                <Button
                  type="button"
                  variant="primary"
                  className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white font-black shadow-xl"
                  onClick={handleApprove}
                  isLoading={isProcessing}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Approve Application
                </Button>
              )}
            </div>
          )}

          {application.status === 'approved' && !application.approvedCardNumber && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                ✅ Application Approved (Ready for Issuance)
              </span>
              {canApprove && (
                <Button
                  type="button"
                  variant="primary"
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white font-black shadow-xl"
                  onClick={handleIssueCard}
                  isLoading={isProcessing}
                  leftIcon={<CreditCard className="w-4 h-4" />}
                >
                  Issue Physical Health Card
                </Button>
              )}
            </div>
          )}

          {(application.approvedCardNumber || application.status === 'issued' || application.status === 'card_issued') && (
            <span className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Card Issued: {application.approvedCardNumber} [Patient ID: {application.approvedPatientId}]
            </span>
          )}
        </div>
      </div>
    </Modal>

    <StaffCardRequestBillSlipModal
      isOpen={isBillSlipOpen}
      onClose={() => setIsBillSlipOpen(false)}
      application={application}
    />

    <CardRequestSlipModal
      isOpen={isSlipOpen}
      onClose={() => setIsSlipOpen(false)}
      application={application}
    />
    </>
  );
};
