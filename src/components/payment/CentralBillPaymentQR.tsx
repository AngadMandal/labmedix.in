import React, { useState, useEffect } from 'react';
import { CentralPaymentQREngine, PaymentQRSessionData } from '../../services/centralPaymentQREngine';
import { CompanyProfile } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { QrCode, CheckCircle2, ShieldCheck, RefreshCw, Smartphone, ExternalLink, Zap } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface CentralBillPaymentQRProps {
  billNumber: string;
  billId?: string;
  amountDue: number;
  netPayable?: number;
  paidAmount?: number;
  paymentStatus?: string;
  patientName?: string;
  patientId?: string;
  company: CompanyProfile;
  onPaymentSuccess?: (receiptData: any) => void;
  onOpenVerifyModal?: () => void;
  showInteractiveActions?: boolean;
  className?: string;
}

export const CentralBillPaymentQR: React.FC<CentralBillPaymentQRProps> = ({
  billNumber,
  billId,
  amountDue,
  netPayable = amountDue,
  paidAmount = 0,
  paymentStatus = 'unpaid',
  patientName,
  patientId,
  company,
  onPaymentSuccess,
  onOpenVerifyModal,
  showInteractiveActions = true,
  className = ''
}) => {
  const { showToast } = useToast();
  const [session, setSession] = useState<PaymentQRSessionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [currentDue, setCurrentDue] = useState<number>(amountDue);
  const [currentStatus, setCurrentStatus] = useState<string>(paymentStatus);
  const [timeLeftSec, setTimeLeftSec] = useState<number>(900); // 15 mins default

  const isFullyPaid = currentDue <= 0 || currentStatus === 'paid';

  // Load session or generate server session
  useEffect(() => {
    let isMounted = true;
    setCurrentDue(amountDue);
    setCurrentStatus(paymentStatus);

    if (amountDue > 0 && paymentStatus !== 'paid') {
      setIsLoading(true);
      CentralPaymentQREngine.generateSession({
        id: billId,
        billNumber,
        netPayable,
        paidAmount,
        patientName,
        patientId
      }, company)
        .then((sess) => {
          if (isMounted) {
            setSession(sess);
            if (sess.expiresAt) {
              const diffSec = Math.max(0, Math.floor((new Date(sess.expiresAt).getTime() - Date.now()) / 1000));
              setTimeLeftSec(diffSec);
            }
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [billNumber, billId, amountDue, netPayable, paidAmount, paymentStatus, company]);

  // Session expiry countdown
  useEffect(() => {
    if (isFullyPaid || timeLeftSec <= 0) return;
    const timer = setInterval(() => {
      setTimeLeftSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isFullyPaid, timeLeftSec]);

  // Real-time payment update listener
  useEffect(() => {
    const unsub = CentralPaymentQREngine.subscribe((event) => {
      if (event.type === 'PAYMENT_VERIFIED' && (event.billNumber === billNumber || event.billId === billId)) {
        setCurrentDue(event.remainingDue || 0);
        setCurrentStatus(event.paymentStatus || 'paid');
        if (onPaymentSuccess) {
          onPaymentSuccess(event);
        }
        showToast('success', 'Live Payment Received!', `₹${event.paidAmount} received for ${billNumber}. Status: PAID.`);
      }
    });

    const handleWindowPayment = (e: CustomEvent) => {
      const detail = e.detail;
      if (detail && (detail.billNumber === billNumber || detail.billId === billId)) {
        if (detail.remainingDue !== undefined) {
          setCurrentDue(detail.remainingDue);
        }
        if (detail.paymentStatus) {
          setCurrentStatus(detail.paymentStatus);
        }
      }
    };
    window.addEventListener('labmedix_payment_updated', handleWindowPayment as EventListener);

    return () => {
      unsub();
      window.removeEventListener('labmedix_payment_updated', handleWindowPayment as EventListener);
    };
  }, [billNumber, billId, onPaymentSuccess, showToast]);

  const handleCopyUpiUri = () => {
    if (session?.upiPayload) {
      navigator.clipboard.writeText(session.upiPayload);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      showToast('info', 'UPI URI Copied', 'Direct payment URI copied to clipboard.');
    }
  };

  const handleOpenUpiApp = () => {
    if (session?.upiPayload) {
      window.location.href = session.upiPayload;
      showToast('info', 'Launching UPI App', `Opening UPI payment for ₹${currentDue.toFixed(2)}.`);
    }
  };

  const minutes = Math.floor(timeLeftSec / 60);
  const seconds = timeLeftSec % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  // ==========================================================================
  // CASE A: FULLY PAID BILL (Amount Due = 0) -> Replace QR with PAID Seal
  // ==========================================================================
  if (isFullyPaid) {
    return (
      <div className={`payment-qr-container paid-container border-2 border-emerald-600 bg-emerald-50/90 rounded-xl p-2 text-center relative overflow-hidden ${className}`}>
        <div className="flex flex-col items-center justify-center py-1">
          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm mb-1">
            <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 font-mono">
            PAYMENT STATUS: PAID
          </span>
          <span className="text-[8px] font-bold text-emerald-900 mt-0.5">
            AMOUNT DUE: ₹0.00 (NIL BALANCE)
          </span>
          <div className="text-[7.5px] text-emerald-700 font-mono mt-1 border-t border-emerald-200 pt-0.5 w-full">
            LABMEDIX VERIFIED SETTLEMENT
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // CASE B: ACTIVE BILL PAYMENT QR (High Contrast, Print-Safe Level-H QR)
  // ==========================================================================
  const merchantDisplay = company.upiSettings?.merchantName || company.name || 'LABMEDIX MULTI-SPECIALITY CENTRE';

  return (
    <div className={`payment-qr-container border border-slate-300 bg-white rounded-xl p-1.5 text-center relative ${className}`}>
      {/* Explicit Identification: PAYMENT QR (Separated from Health Card / Lab Verification) */}
      <div className="border-b border-slate-200 pb-1 mb-1">
        <div className="flex items-center justify-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          <strong className="text-[8.5px] font-black text-slate-900 tracking-wider uppercase font-mono">
            PAYMENT QR
          </strong>
        </div>
        <div className="text-[7.5px] text-slate-500 font-semibold uppercase tracking-tight">
          Scan to Pay
        </div>
      </div>

      {/* Scannable Dynamic QR Code Image (Print-safe, 300 DPI, Level-H Error Correction) */}
      <div className="flex justify-center my-0.5">
        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white border border-slate-300 rounded-lg p-1 flex items-center justify-center shadow-sm">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-[7px]">Generating...</span>
            </div>
          ) : session?.qrDataUrl ? (
            <img
              src={session.qrDataUrl}
              alt={`Payment QR for ${billNumber}`}
              className="w-full h-full object-contain select-none"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400">
              <QrCode className="w-6 h-6 text-slate-300" />
              <span className="text-[7px]">QR Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Amount Due Display */}
      <div className="mt-1 leading-tight">
        <div className="text-[10px] font-black text-rose-700 font-mono tracking-tight">
          Amount Due: {formatCurrency(currentDue)}
        </div>
        <div className="text-[7.5px] font-bold text-slate-800 truncate max-w-[38mm] mx-auto uppercase">
          {merchantDisplay}
        </div>
        <div className="text-[6.5px] text-slate-500 font-mono tracking-tighter">
          UPI / Digital Payment
        </div>
      </div>

      {/* Interactive Screen Controls (Hidden on Print) */}
      {showInteractiveActions && (
        <div className="mt-1.5 pt-1 border-t border-slate-200 print:hidden space-y-1">
          <div className="flex items-center justify-between text-[7px] text-slate-500 font-mono px-0.5">
            <span>Session:</span>
            <span className={timeLeftSec < 180 ? 'text-rose-600 font-bold animate-pulse' : 'text-slate-700 font-bold'}>
              {timeFormatted}
            </span>
          </div>

          <div className="flex items-center justify-center gap-1 pt-0.5">
            <button
              type="button"
              onClick={handleOpenUpiApp}
              title="1-Tap Open UPI App (Mobile)"
              className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[7.5px] font-bold border border-blue-200 flex items-center gap-0.5 transition"
            >
              <Smartphone className="w-2.5 h-2.5" />
              <span>Pay App</span>
            </button>

            {onOpenVerifyModal && (
              <button
                type="button"
                onClick={onOpenVerifyModal}
                title="Verify Bank Settlement UTR"
                className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[7.5px] font-bold shadow-sm flex items-center gap-0.5 transition"
              >
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>Verify UTR</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
