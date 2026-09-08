import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { LaboratoryService, REJECTION_REASONS } from '../../services/laboratoryService';
import { LabOrderRecord, SpecimenRecord, SpecimenRejectionReason } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatDateTime } from '../../utils/formatters';
import {
  Tag,
  CheckCircle2,
  XCircle,
  Search,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  User,
  TestTube,
  Clock,
  FileText
} from 'lucide-react';

export interface SpecimenReceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSpecimenOrOrder?: LabOrderRecord | SpecimenRecord | null;
  onProcessed: () => void;
}

export const SpecimenReceptionModal: React.FC<SpecimenReceptionModalProps> = ({
  isOpen,
  onClose,
  initialSpecimenOrOrder,
  onProcessed
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<LabOrderRecord | null>(null);
  const [selectedSpecimen, setSelectedSpecimen] = useState<SpecimenRecord | null>(null);
  
  // Rejection mode
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<SpecimenRejectionReason>('Gross Hemolysis');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [requestRecollection, setRequestRecollection] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Identifier verification checklist
  const [verifyPatientChecked, setVerifyPatientChecked] = useState(false);
  const [verifyTestChecked, setVerifyTestChecked] = useState(false);
  const [verifyContainerChecked, setVerifyContainerChecked] = useState(false);
  const [verifyBarcodeChecked, setVerifyBarcodeChecked] = useState(false);

  useEffect(() => {
    if (initialSpecimenOrOrder) {
      if ('accessionNumber' in initialSpecimenOrOrder && 'sampleType' in initialSpecimenOrOrder) {
        // It's a SpecimenRecord
        const spec = initialSpecimenOrOrder as SpecimenRecord;
        setSelectedSpecimen(spec);
        const ord = LaboratoryService.getById(spec.labOrderId);
        setSelectedOrder(ord || null);
      } else {
        // It's a LabOrderRecord
        const ord = initialSpecimenOrOrder as LabOrderRecord;
        setSelectedOrder(ord);
        const spec = LaboratoryService.getAllSpecimens().find(s => s.labOrderId === ord.id || s.barcode === ord.sampleBarcode);
        setSelectedSpecimen(spec || null);
      }
    } else {
      setSelectedOrder(null);
      setSelectedSpecimen(null);
    }
    setIsRejecting(false);
    setVerifyPatientChecked(false);
    setVerifyTestChecked(false);
    setVerifyContainerChecked(false);
    setVerifyBarcodeChecked(false);
  }, [initialSpecimenOrOrder, isOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const q = searchQuery.trim();
    const allSpecimens = LaboratoryService.getAllSpecimens();
    const spec = allSpecimens.find(
      s => s.barcode.toLowerCase() === q.toLowerCase() ||
           s.accessionNumber.toLowerCase() === q.toLowerCase() ||
           s.id.toLowerCase() === q.toLowerCase()
    );

    const allOrders = LaboratoryService.getAll();
    const ord = allOrders.find(
      o => o.sampleBarcode?.toLowerCase() === q.toLowerCase() ||
           o.accessionNumber?.toLowerCase() === q.toLowerCase() ||
           o.orderNumber.toLowerCase() === q.toLowerCase() ||
           o.bookingNo?.toLowerCase() === q.toLowerCase() ||
           (spec && o.id === spec.labOrderId)
    );

    if (!ord && !spec) {
      showToast('error', 'Specimen Not Found', `No accessioned specimen found matching "${q}".`);
      return;
    }

    setSelectedOrder(ord || null);
    setSelectedSpecimen(spec || null);
    showToast('info', 'Specimen Located', `Ready for clinical verification and reception.`);
  };

  const handleAccept = () => {
    if (!verifyPatientChecked || !verifyTestChecked || !verifyContainerChecked || !verifyBarcodeChecked) {
      showToast('error', 'Verification Checklist Incomplete', 'Please confirm all specimen safety identifiers before receiving.');
      return;
    }

    if (!selectedOrder && !selectedSpecimen) return;
    setIsSubmitting(true);
    try {
      const staffName = currentUser?.fullName || 'Diagnostic Lab Reception';
      const targetId = selectedSpecimen?.id || selectedOrder?.id || '';
      LaboratoryService.receiveSpecimenInLab(targetId, staffName);

      showToast(
        'success',
        'Specimen Accepted & Routed! 🧪',
        `Specimen received in central lab and routed to ${selectedOrder?.department || 'Department'}.`
      );
      onProcessed();
      onClose();
    } catch (err: any) {
      showToast('error', 'Reception Failed', err.message || 'Could not accept specimen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpecimen && !selectedOrder) return;
    setIsSubmitting(true);
    try {
      const staffName = currentUser?.fullName || 'Laboratory Quality Control';
      const specId = selectedSpecimen?.id || selectedOrder?.specimenId || selectedOrder?.id || '';

      LaboratoryService.rejectSpecimen(specId, {
        reason: rejectionReason,
        notes: rejectionNotes.trim(),
        rejectedBy: staffName,
        requestRecollection
      });

      showToast(
        'warning',
        'Specimen Rejected',
        `Specimen rejected: ${rejectionReason}. ${requestRecollection ? 'Immediate recollection queued.' : ''}`
      );
      onProcessed();
      onClose();
    } catch (err: any) {
      showToast('error', 'Rejection Error', err.message || 'Could not reject specimen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Specimen Reception & Identifier Verification"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Search / Scan Input Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Scan Barcode, Accession # (ACC-2026-...), or Lab Requisition #..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>
          <Button type="submit" variant="primary" size="sm">
            Scan / Check-in
          </Button>
        </form>

        {/* Specimen & Patient Identity Card */}
        {selectedOrder ? (
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Accession Number</span>
                <div className="text-lg font-black text-teal-300 font-mono">
                  {selectedOrder.accessionNumber || selectedSpecimen?.accessionNumber || 'Pending Accession'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase font-mono border ${
                  selectedOrder.priority === 'stat'
                    ? 'bg-rose-950 text-rose-300 border-rose-500/50 animate-pulse'
                    : selectedOrder.priority === 'urgent'
                    ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {selectedOrder.priority}
                </span>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-500/40 font-mono">
                  Barcode: {selectedOrder.sampleBarcode || selectedSpecimen?.barcode || 'N/A'}
                </span>
              </div>
            </div>

            {/* 3-Column Demographics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[10px] flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" /> Patient Info
                </span>
                <strong className="text-white block text-sm">{selectedOrder.patientName}</strong>
                <p className="text-slate-400 text-[11px]">
                  {selectedOrder.patientAge || '—'} yrs • {selectedOrder.patientGender || '—'}
                </p>
                <p className="text-slate-500 font-mono text-[10px]">{selectedOrder.patientPhone || 'No Phone'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[10px] flex items-center gap-1">
                  <TestTube className="w-3 h-3 text-teal-400" /> Test & Department
                </span>
                <strong className="text-teal-300 block text-sm">{selectedOrder.testName}</strong>
                <p className="text-slate-300 text-[11px] font-medium">{selectedOrder.department}</p>
                <p className="text-slate-500 text-[10px]">Req #: {selectedOrder.orderNumber}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[10px] flex items-center gap-1">
                  <Tag className="w-3 h-3 text-purple-400" /> Container & Tube
                </span>
                <strong className="text-purple-300 block text-sm">{selectedOrder.sampleTubeType || 'Standard Tube'}</strong>
                <p className="text-slate-400 text-[11px]">Type: {selectedOrder.specimenType || 'Whole Blood'}</p>
                <p className="text-slate-500 text-[10px]">
                  Collector: {selectedOrder.phlebotomistName || selectedSpecimen?.collectedBy || 'Central Phlebotomy'}
                </p>
              </div>
            </div>

            {/* Rejection Mode View */}
            {isRejecting ? (
              <form onSubmit={handleRejectSubmit} className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/40 space-y-4">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Controlled Specimen Rejection Workflow</span>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="block text-slate-300 font-bold">Rejection Reason *</label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value as SpecimenRejectionReason)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-rose-500/40 text-rose-200 text-xs font-medium focus:outline-none"
                    required
                  >
                    {REJECTION_REASONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="block text-slate-300 font-bold">Clinical QC Notes</label>
                  <textarea
                    rows={2}
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    placeholder="Enter detailed laboratory observations (e.g. gross hemolysis observed after centrifugation)..."
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-300 pt-1">
                  <input
                    type="checkbox"
                    id="recollectionCheck"
                    checked={requestRecollection}
                    onChange={(e) => setRequestRecollection(e.target.checked)}
                    className="rounded border-slate-700 text-teal-600 focus:ring-0"
                  />
                  <label htmlFor="recollectionCheck" className="cursor-pointer font-bold flex items-center gap-1.5 text-teal-300">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Automatically trigger urgent recollection order (Preserves specimen history)</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-500/20">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRejecting(false)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="danger"
                    size="sm"
                    disabled={isSubmitting}
                  >
                    Confirm Rejection
                  </Button>
                </div>
              </form>
            ) : (
              /* Acceptance Verification Checklist */
              <div className="space-y-4 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                  <span className="font-bold text-slate-300 block">Mandatory Specimen Verification Checklist:</span>
                  
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={verifyPatientChecked}
                      onChange={(e) => setVerifyPatientChecked(e.target.checked)}
                      className="rounded border-slate-700 text-teal-600"
                    />
                    <span>1. Patient Identity verified ({selectedOrder.patientName}, Age: {selectedOrder.patientAge})</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={verifyTestChecked}
                      onChange={(e) => setVerifyTestChecked(e.target.checked)}
                      className="rounded border-slate-700 text-teal-600"
                    />
                    <span>2. Requested Investigation matches requisition ({selectedOrder.testName})</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={verifyContainerChecked}
                      onChange={(e) => setVerifyContainerChecked(e.target.checked)}
                      className="rounded border-slate-700 text-teal-600"
                    />
                    <span>3. Appropriate container / vacutainer tube confirmed ({selectedOrder.sampleTubeType})</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={verifyBarcodeChecked}
                      onChange={(e) => setVerifyBarcodeChecked(e.target.checked)}
                      className="rounded border-slate-700 text-teal-600"
                    />
                    <span>4. Specimen tube barcode clearly readable and intact</span>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => setIsRejecting(true)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject Specimen
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleAccept}
                    disabled={isSubmitting || !verifyPatientChecked || !verifyTestChecked || !verifyContainerChecked || !verifyBarcodeChecked}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Accept & Route to Department
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center space-y-2 border border-dashed border-slate-800 rounded-2xl">
            <Tag className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">Scan or search an accessioned specimen to begin laboratory reception.</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
