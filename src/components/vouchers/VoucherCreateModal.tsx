import React, { useState } from 'react';
import { CashDeskVoucher, VoucherCategory, Patient } from '../../types';
import { CashDeskVoucherService, VOUCHER_CATEGORIES } from '../../services/cashDeskVoucherService';
import { PatientService } from '../../services/patientService';
import { DoctorMasterService, DoctorMasterItem } from '../../services/doctorMasterService';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { formatCurrency } from '../../utils/formatters';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import { useToast } from '../../context/ToastContext';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Plus,
  Layers,
  Flame,
  Stethoscope,
  FlaskConical,
  Pill,
  CreditCard,
  Coins,
  Dice5,
  Lock,
  Calendar,
  Building2,
  User,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface VoucherCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (voucher: CashDeskVoucher | CashDeskVoucher[]) => void;
}

export const VoucherCreateModal: React.FC<VoucherCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'single_auto' | 'batch_fleet' | 'emergency_quick'>('single_auto');

  // Single Voucher Form State
  const [category, setCategory] = useState<VoucherCategory>('opd_consultation');
  const [amount, setAmount] = useState<number>(500);
  const [bearerType, setBearerType] = useState<'specific_patient' | 'cash_desk_bearer'>('cash_desk_bearer');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [validityDays, setValidityDays] = useState<number>(30);
  const [pinLength, setPinLength] = useState<6 | 8>(6);
  const [departmentRestriction, setDepartmentRestriction] = useState<string>('');
  const [doctorRestrictionName, setDoctorRestrictionName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Recommended Standard Voucher Templates
  const STANDARD_TEMPLATES = [
    {
      name: 'OPD Doctor Consultation Fee',
      bengali: 'ডাক্তার ওপিডি কনসালটেশন',
      category: 'opd_consultation' as VoucherCategory,
      amount: 500,
      validityDays: 30,
      notes: 'Standard OPD specialist doctor consultation voucher',
      department: ''
    },
    {
      name: 'Diagnostic & Pathology Investigations',
      bengali: 'ল্যাব ও প্যাথলজি টেস্ট',
      category: 'diagnostic_lab' as VoucherCategory,
      amount: 1000,
      validityDays: 45,
      notes: 'Standard pathology, biochemistry & imaging test voucher',
      department: 'Pathology & Diagnostic Laboratory'
    },
    {
      name: 'Smart Health Card Wallet Top-up',
      bengali: 'স্মার্ট কার্ড ওয়ালেট টপ-আপ',
      category: 'health_card_topup' as VoucherCategory,
      amount: 1500,
      validityDays: 90,
      notes: 'Direct prepaid float into patient digital health wallet',
      department: ''
    },
    {
      name: 'Universal Cash Desk Credit Voucher',
      bengali: 'ইউনিভার্সাল ক্যাশ ডেস্ক ভাউচার',
      category: 'all_purpose_cash' as VoucherCategory,
      amount: 2000,
      validityDays: 60,
      notes: 'Universal tender accepted across all hospital billing counters',
      department: ''
    },
    {
      name: 'Pharmacy & Surgical Supplies',
      bengali: 'ফার্মেসি ও মেডিসিন ভাউচার',
      category: 'pharmacy_meds' as VoucherCategory,
      amount: 750,
      validityDays: 30,
      notes: 'Prescription medicines and surgical consumables discount',
      department: 'In-House Hospital Pharmacy'
    },
    {
      name: 'Emergency Ward / IPD Float',
      bengali: 'জরুরি বিভাগ / আইপিডি ফ্লোট',
      category: 'emergency_float' as VoucherCategory,
      amount: 2500,
      validityDays: 7,
      notes: 'Hospital emergency desk float credit for fast-track admissions',
      department: 'Emergency Casualty & Triage Desk'
    }
  ];

  const handleApplyTemplate = (tpl: typeof STANDARD_TEMPLATES[0]) => {
    setCategory(tpl.category);
    setAmount(tpl.amount);
    setValidityDays(tpl.validityDays);
    setDepartmentRestriction(tpl.department || '');
    setNotes(tpl.notes);
    showToast('info', 'Template Applied', `Applied recommended template: ${tpl.name} (₹${tpl.amount})`);
  };

  // Batch Fleet Form State
  const [batchCount, setBatchCount] = useState<number>(10);
  const [batchDenomination, setBatchDenomination] = useState<number>(500);

  // Emergency Float State
  const [emergencyAmount, setEmergencyAmount] = useState<number>(2000);
  const [emergencyDesk, setEmergencyDesk] = useState<string>('Emergency Casualty & Triage Desk');

  const [isProcessing, setIsProcessing] = useState(false);

  const patients = PatientService.getAll();
  const doctors: DoctorMasterItem[] = DoctorMasterService.getAllDoctors();
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Preset Amounts
  const quickAmounts = [250, 500, 1000, 1500, 2000, 5000, 10000];

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      showToast('error', 'Invalid Amount', 'Voucher amount must be greater than zero.');
      return;
    }

    if (bearerType === 'specific_patient' && !selectedPatientId) {
      showToast('error', 'Patient Required', 'Please select a registered patient for personalized voucher.');
      return;
    }

    setIsProcessing(true);

    const res = CashDeskVoucherService.createSingleVoucher({
      amount,
      category,
      validityDays,
      bearerType,
      patientId: bearerType === 'specific_patient' ? selectedPatient?.id : undefined,
      patientName: bearerType === 'specific_patient' ? selectedPatient?.fullName : undefined,
      patientPhone: bearerType === 'specific_patient' ? selectedPatient?.mobile : undefined,
      departmentRestriction: departmentRestriction || undefined,
      doctorRestrictionName: doctorRestrictionName || undefined,
      notes: notes.trim() || undefined,
      pinLength
    });

    setIsProcessing(false);

    if (res.error || !res.voucher) {
      showToast('error', 'Creation Failed', res.error || 'Failed to generate voucher.');
      return;
    }

    triggerCelebrationFireworks();
    showToast(
      'success',
      'Voucher Generated',
      `Voucher ${res.voucher.voucherCode} (₹${res.voucher.amount}) successfully issued with Cryptographic PIN!`
    );
    onSuccess(res.voucher);
    onClose();
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (batchDenomination <= 0 || batchCount <= 0) {
      showToast('error', 'Invalid Batch Params', 'Please provide valid batch count and amount.');
      return;
    }

    setIsProcessing(true);

    const res = CashDeskVoucherService.createBatchVouchers({
      count: batchCount,
      amount: batchDenomination,
      category,
      validityDays,
      bearerType: 'cash_desk_bearer',
      departmentRestriction: departmentRestriction || undefined,
      notes: notes.trim() || `Automated Super Admin Batch of ${batchCount} Vouchers`,
      pinLength
    });

    setIsProcessing(false);

    if (res.error || !res.vouchers || res.vouchers.length === 0) {
      showToast('error', 'Batch Failed', res.error || 'Failed to generate batch.');
      return;
    }

    triggerCelebrationFireworks();
    showToast(
      'success',
      'Fleet Batch Generated',
      `Batch ${res.batchId} created: ${res.count} Vouchers (Total Float: ₹${res.totalAmount}) generated!`
    );
    onSuccess(res.vouchers);
    onClose();
  };

  const handleEmergencyDispense = () => {
    setIsProcessing(true);
    const res = CashDeskVoucherService.autoDispenseEmergencyFloat(emergencyAmount, emergencyDesk);
    setIsProcessing(false);

    if (res.error || !res.voucher) {
      showToast('error', 'Dispense Failed', res.error || 'Failed to dispense emergency float.');
      return;
    }

    triggerCelebrationFireworks();
    showToast('success', 'Emergency Float Active', `Emergency Float ${res.voucher.voucherCode} (₹${res.voucher.amount}) Dispensed!`);
    onSuccess(res.voucher);
    onClose();
  };

  const getCategoryIcon = (catKey: VoucherCategory) => {
    switch (catKey) {
      case 'opd_consultation': return <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      case 'diagnostic_lab': return <FlaskConical className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'pharmacy_meds': return <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'emergency_float': return <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'health_card_topup': return <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      default: return <Coins className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Super Admin — Hospital Cash Desk Voucher Generator"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Mode Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setMode('single_auto')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              mode === 'single_auto'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Instant Single Voucher</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('batch_fleet')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              mode === 'batch_fleet'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Automatic Batch Fleet</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('emergency_quick')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              mode === 'emergency_quick'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Emergency Dispenser</span>
          </button>
        </div>

        {/* ================= MODE 1: SINGLE AUTO VOUCHER ================= */}
        {mode === 'single_auto' && (
          <form onSubmit={handleSingleSubmit} className="space-y-5">
            {/* Recommended Standard Templates Quick Apply Bar */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-teal-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Recommended Standard Hospital Voucher Templates (1-Click Apply)</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Official Hospital Defaults</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STANDARD_TEMPLATES.map(tpl => {
                  const isMatch = category === tpl.category && amount === tpl.amount;
                  return (
                    <button
                      key={tpl.name}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className={`p-2.5 rounded-xl border text-left transition-all text-xs ${
                        isMatch
                          ? 'bg-amber-500/20 border-amber-500 ring-1 ring-amber-500/40 text-amber-900 dark:text-amber-200'
                          : 'bg-white/80 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-400 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold truncate text-[11px]">{tpl.name}</span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 ml-1">₹{tpl.amount}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{tpl.bengali}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Grid Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Select Hospital Voucher Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {(Object.keys(VOUCHER_CATEGORIES) as VoucherCategory[]).map(catKey => {
                  const cfg = VOUCHER_CATEGORIES[catKey];
                  const isSelected = category === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => {
                        setCategory(catKey);
                        setValidityDays(cfg.defaultValidityDays);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all relative ${
                        isSelected
                          ? `bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20`
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700">
                          {getCategoryIcon(catKey)}
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {cfg.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-teal-700 dark:text-teal-400 font-medium truncate">
                        {cfg.bengaliName}
                      </p>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Denomination & Quick Preset Buttons */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Voucher Tender Amount (₹ INR)
                </label>
                <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                  {formatCurrency(amount)}
                </span>
              </div>

              <input
                type="number"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                min={50}
                step={50}
                className="w-full px-4 py-2.5 rounded-xl font-mono text-lg font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                required
              />

              <div className="flex flex-wrap gap-1.5">
                {quickAmounts.map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors ${
                      amount === val
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    ₹{val}
                  </button>
                ))}
              </div>
            </div>

            {/* Bearer Type & Recipient Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bearer Assignment
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBearerType('specific_patient')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                      bearerType === 'specific_patient'
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    👤 Registered Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => setBearerType('cash_desk_bearer')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                      bearerType === 'cash_desk_bearer'
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    🏢 Cash Desk Bearer
                  </button>
                </div>
              </div>

              {bearerType === 'specific_patient' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Patient Beneficiary
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={e => setSelectedPatientId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none dark:text-white"
                    required={bearerType === 'specific_patient'}
                  >
                    <option value="">-- Choose Registered Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.id}) — {p.mobile}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department Float Assignment
                  </label>
                  <input
                    type="text"
                    value={departmentRestriction}
                    onChange={e => setDepartmentRestriction(e.target.value)}
                    placeholder="e.g. Central OPD Billing / Casualty Desk"
                    className="w-full px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Cryptographic Security PIN & Validity Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cryptographic PIN Entropy Length
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPinLength(6)}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                      pinLength === 6
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-800 dark:text-teal-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    🔒 6-Digit (192-bit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPinLength(8)}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                      pinLength === 8
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-800 dark:text-teal-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    🛡️ 8-Digit (256-bit)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Voucher Validity Duration
                </label>
                <select
                  value={validityDays}
                  onChange={e => setValidityDays(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none dark:text-white"
                >
                  <option value={7}>7 Days (Casualty / Emergency)</option>
                  <option value={15}>15 Days</option>
                  <option value={30}>30 Days (Standard 1 Month)</option>
                  <option value={60}>60 Days (2 Months)</option>
                  <option value={90}>90 Days (Quarterly Float)</option>
                  <option value={180}>180 Days (Half Year)</option>
                  <option value={365}>365 Days (1 Full Year)</option>
                </select>
              </div>
            </div>

            {/* Optional Doctor Restriction & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Doctor Restriction (Optional)
                </label>
                <select
                  value={doctorRestrictionName}
                  onChange={e => setDoctorRestrictionName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none dark:text-white"
                >
                  <option value="">Any Licensed Doctor / Department</option>
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.name}>
                      {doc.name} ({doc.department || doc.speciality})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Hospital Endorsement Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Executive privilege, health camp waiver"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none dark:text-white"
                />
              </div>
            </div>

            {/* Modal Submit */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isProcessing}
                leftIcon={isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              >
                {isProcessing ? 'Generating Cryptographic PIN...' : `Issue ${formatCurrency(amount)} Cash Voucher`}
              </Button>
            </div>
          </form>
        )}

        {/* ================= MODE 2: AUTOMATIC BATCH FLEET GENERATOR ================= */}
        {mode === 'batch_fleet' && (
          <form onSubmit={handleBatchSubmit} className="space-y-5">
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-950 dark:text-indigo-200 space-y-1.5">
              <h4 className="font-bold flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
                <Layers className="w-4 h-4" />
                <span>Bulk Sequential Fleet Generator</span>
              </h4>
              <p className="leading-relaxed">
                Super Admin bulk issuance creates sequential serial codes (e.g. <code>LMDX-CSH-2026-00010</code> to <code>00020</code>) with individual high-entropy cryptographic PINs and tamper-proof security seals.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Batch Quantity (Number of Vouchers)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 25, 50].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setBatchCount(cnt)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        batchCount === cnt
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {cnt} Pcs
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Denomination per Voucher (₹ INR)
                </label>
                <input
                  type="number"
                  value={batchDenomination}
                  onChange={e => setBatchDenomination(Number(e.target.value))}
                  min={100}
                  step={50}
                  className="w-full px-3 py-2 rounded-xl font-mono text-sm font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as VoucherCategory)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none dark:text-white"
                >
                  {(Object.keys(VOUCHER_CATEGORIES) as VoucherCategory[]).map(cat => (
                    <option key={cat} value={cat}>
                      {VOUCHER_CATEGORIES[cat].name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Validity Period
                </label>
                <select
                  value={validityDays}
                  onChange={e => setValidityDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none dark:text-white"
                >
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days</option>
                  <option value={180}>180 Days</option>
                  <option value={365}>1 Year</option>
                </select>
              </div>
            </div>

            {/* Total Float Summary */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Batch Float Commitment</span>
                <span className="text-xl font-black font-mono text-emerald-400">
                  {formatCurrency(batchCount * batchDenomination)}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
                {batchCount} Vouchers @ {formatCurrency(batchDenomination)}
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isProcessing}
                leftIcon={isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
              >
                {isProcessing ? 'Generating Batch Fleet...' : `Generate Batch of ${batchCount} Vouchers`}
              </Button>
            </div>
          </form>
        )}

        {/* ================= MODE 3: EMERGENCY FLOAT DISPENSER ================= */}
        {mode === 'emergency_quick' && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-950 dark:text-rose-200 space-y-1.5">
              <h4 className="font-bold flex items-center gap-2 text-rose-800 dark:text-rose-300">
                <Flame className="w-4 h-4" />
                <span>1-Click Casualty Emergency Desk Float Auto-Dispenser</span>
              </h4>
              <p className="leading-relaxed">
                Immediately issues high-priority cash desk float for trauma triage, blood transfusion deposits, or critical medicine float without patient pre-selection.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Float Amount
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1000, 2000, 5000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setEmergencyAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        emergencyAmount === amt
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Emergency Counter
                </label>
                <input
                  type="text"
                  value={emergencyDesk}
                  onChange={e => setEmergencyDesk(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleEmergencyDispense}
                disabled={isProcessing}
                leftIcon={isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
              >
                {isProcessing ? 'Dispensing Float...' : `Dispense Emergency ${formatCurrency(emergencyAmount)} Float`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
