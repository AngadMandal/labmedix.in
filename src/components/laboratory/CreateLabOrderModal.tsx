import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { StorageService } from '../../services/storage';
import { CatalogService, LabTestItem } from '../../services/catalogService';
import { LaboratoryService } from '../../services/laboratoryService';
import { PortalService, BloodTestBooking } from '../../services/portalService';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  TestTube,
  Search,
  User,
  CreditCard,
  CheckCircle2,
  DollarSign,
  FileText,
  AlertCircle
} from 'lucide-react';

export interface CreateLabOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: BloodTestBooking) => void;
}

export const CreateLabOrderModal: React.FC<CreateLabOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const patients = useMemo(() => StorageService.getPatients().filter(p => !p.isDeleted), []);
  const cards = useMemo(() => StorageService.getCards(), []);
  const tests = useMemo(() => CatalogService.getTests(), []);

  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [testSearch, setTestSearch] = useState('');
  const [selectedTestId, setSelectedTestId] = useState('');
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [prescribedByDoctor, setPrescribedByDoctor] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'wallet'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected Patient
  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const patientCard = selectedPatient
    ? (selectedPatient.healthCardId ? cards.find(c => c.id === selectedPatient.healthCardId) : cards.find(c => c.patientId === selectedPatient.id))
    : null;

  // Selected Test
  const selectedTest = tests.find(t => t.id === selectedTestId);

  // Filtered Patients
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients.slice(0, 10);
    const q = patientSearch.toLowerCase().trim();
    return patients
      .filter(p => p.fullName.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.mobile.includes(q))
      .slice(0, 10);
  }, [patients, patientSearch]);

  // Filtered Tests
  const filteredTests = useMemo(() => {
    if (!testSearch.trim()) return tests.slice(0, 15);
    const q = testSearch.toLowerCase().trim();
    return tests
      .filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
      .slice(0, 15);
  }, [tests, testSearch]);

  // Pricing calculation
  const mrp = selectedTest?.mrp || 0;
  const discountPct = patientCard ? 25 : 0;
  const discountAmount = Math.round((mrp * discountPct) / 100);
  const netPayable = Math.max(0, mrp - discountAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      showToast('error', 'Patient Required', 'Please select a registered patient.');
      return;
    }
    if (!selectedTest) {
      showToast('error', 'Test Required', 'Please select an investigation from the catalog.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create order in LaboratoryService (generates PatientBill, financial ledger, and order record)
      const labOrder = LaboratoryService.createOrder({
        patientId: selectedPatient.id,
        testId: selectedTest.id,
        testName: selectedTest.name,
        department: selectedTest.department,
        category: selectedTest.category,
        priority,
        clinicalNotes: clinicalNotes.trim(),
        prescribedByDoctorName: prescribedByDoctor.trim() || 'Walk-in Consultation',
        mrp,
        isPaid: true,
        paymentMethod,
        currentUser: currentUser as any
      });

      // 2. Also register in PortalService for cross-portal visibility
      const booking = PortalService.bookBloodTest({
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        patientPhone: selectedPatient.mobile,
        cardNo: patientCard?.cardNumber,
        cardTier: patientCard?.membershipId,
        testName: selectedTest.name,
        category: selectedTest.category || 'Diagnostics',
        collectionType: 'lab_visit',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: 'Immediate (Walk-in)',
        grossPrice: mrp,
        discountPercentage: discountPct,
        discountAmount,
        netPrice: netPayable,
        paymentStatus: 'paid_counter',
        status: 'confirmed',
        fastingRequired: !!selectedTest.fastingRequired,
        prescribedByDoctorName: prescribedByDoctor.trim() || 'Walk-in Consultation',
        clinicalNotes: clinicalNotes.trim() || undefined
      });

      // Synchronize bookingNo with the sequential lab order number
      booking.bookingNo = labOrder.orderNumber;
      booking.id = labOrder.id;
      const bookings = PortalService.getLabBookings();
      const idx = bookings.findIndex(b => b.id === booking.id);
      if (idx >= 0) bookings[idx] = booking;
      PortalService.saveLabBookings(bookings);

      showToast('success', 'Lab Order Booked! 🧪', `Requisition ${labOrder.orderNumber} created with bill recorded.`);
      onOrderCreated(booking);
      onClose();
    } catch (err: any) {
      showToast('error', 'Order Error', err.message || 'Could not create lab order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Laboratory Requisition & Billing"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Select Patient */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            1. Select Patient
          </label>

          {!selectedPatient ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Search by Patient Name, ID (LMDX-...), or Mobile..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="max-h-44 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-2xl bg-slate-900">
                {filteredPatients.map((p) => {
                  const hasCard = p.healthCardId || cards.some(c => c.patientId === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setPatientSearch('');
                      }}
                      className="w-full p-2.5 text-left hover:bg-slate-800/60 transition flex items-center justify-between text-xs"
                    >
                      <div>
                        <strong className="text-white font-bold">{p.fullName}</strong>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {p.id} • {p.mobile} • {p.age} Y/{p.gender.toUpperCase()}
                        </div>
                      </div>
                      {hasCard && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-500/40">
                          Smart Cardholder
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-sm font-bold text-white block">{selectedPatient.fullName}</strong>
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedPatient.id} • {selectedPatient.mobile} • Blood: {selectedPatient.bloodGroup}
                  </span>
                  {patientCard && (
                    <span className="ml-2 text-[10px] font-bold text-teal-300 font-mono">
                      [Card: {patientCard.cardNumber}]
                    </span>
                  )}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedPatientId('')}>
                Change
              </Button>
            </div>
          )}
        </div>

        {/* Step 2: Select Test from Catalog */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            2. Select Diagnostic Test / Investigation
          </label>

          {!selectedTest ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  placeholder="Search test name (CBC, LFT, Lipid, Thyroid, Glucose, Urine...)..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-2xl bg-slate-900">
                {filteredTests.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTestId(t.id);
                      setTestSearch('');
                    }}
                    className="w-full p-2.5 text-left hover:bg-slate-800/60 transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <strong className="text-white font-bold">{t.name}</strong>
                      <div className="text-[10px] text-slate-400">
                        {t.code} • {t.department} • Specimen: {t.specimen}
                      </div>
                    </div>
                    <span className="font-bold text-teal-400 font-mono text-sm">
                      {formatCurrency(t.mrp)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                  <TestTube className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-sm font-bold text-white block">{selectedTest.name}</strong>
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedTest.code} • {selectedTest.department} • {selectedTest.specimen}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-black text-white text-base">{formatCurrency(selectedTest.mrp)}</span>
                <Button size="sm" variant="ghost" onClick={() => setSelectedTestId('')}>
                  Change
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Priority & Prescribing Doctor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">
              Clinical Order Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-teal-500"
            >
              <option value="routine">Routine (Standard Turnaround)</option>
              <option value="urgent">Urgent (Priority Processing)</option>
              <option value="stat">STAT / Emergency (Immediate)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">
              Prescribing Doctor / Referral
            </label>
            <input
              type="text"
              value={prescribedByDoctor}
              onChange={(e) => setPrescribedByDoctor(e.target.value)}
              placeholder="e.g. Dr. Kaushik Chatterjee, MD or Walk-in"
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-teal-500"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-slate-300">
              Clinical Notes / Indications
            </label>
            <input
              type="text"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="e.g. Persistent fever, pre-operative screening, routine checkup..."
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-teal-500"
            />
          </div>
        </div>

        {/* Step 4: Pricing & Payment Summary */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Investigation Standard MRP:</span>
            <span className="font-mono text-white font-bold">{formatCurrency(mrp)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-xs text-emerald-400">
              <span>Cardholder Discount ({discountPct}%):</span>
              <span className="font-mono font-bold">- {formatCurrency(discountAmount)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-sm font-bold text-white">Net Bill Payable:</span>
            <span className="text-lg font-black text-teal-400 font-mono">{formatCurrency(netPayable)}</span>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">Payment Collection Method:</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:border-teal-500"
            >
              <option value="cash">Cash Counter</option>
              <option value="upi">Instant UPI / QR</option>
              <option value="wallet">Cashless Patient Wallet</option>
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold shadow-lg"
            isLoading={isSubmitting}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Create Order & Print Bill ({formatCurrency(netPayable)})
          </Button>
        </div>
      </form>
    </Modal>
  );
};
