import React, { useState, useEffect, useRef } from 'react';
import { LabTechnicianItem } from '../../types';
import { TechnicianMasterService } from '../../services/technicianMasterService';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useToast } from '../../context/ToastContext';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import {
  TestTube,
  ShieldCheck,
  Save,
  PenTool,
  Upload,
  Eraser,
  CheckCircle2,
  Crown,
  Award,
  FileCheck
} from 'lucide-react';

interface TechnicianMasterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  technician: LabTechnicianItem | null;
  onSaved: () => void;
  isSuperAdmin: boolean;
}

export const TechnicianMasterEditModal: React.FC<TechnicianMasterEditModalProps> = ({
  isOpen,
  onClose,
  technician,
  onSaved,
  isSuperAdmin
}) => {
  const { showToast } = useToast();
  const isEditing = !!technician;

  const [name, setName] = useState('');
  const [qualification, setQualification] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'active' | 'on_leave' | 'inactive'>('active');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [stampUrl, setStampUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Digital Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);

  useEffect(() => {
    if (technician) {
      setName(technician.name);
      setQualification(technician.qualification);
      setDesignation(technician.designation);
      setDepartment(technician.department);
      setRegNumber(technician.regNumber);
      setPhone(technician.phone);
      setEmail(technician.email);
      setStatus(technician.status);
      setSignatureUrl(technician.signatureUrl || '');
      setStampUrl(technician.stampUrl || '');
    } else {
      setName('');
      setQualification('B.Sc (MLT), DMLT');
      setDesignation('Senior Medical Laboratory Technologist');
      setDepartment('Hematology & Clinical Biochemistry');
      setRegNumber(`WB-PMAC-${Math.floor(4000 + Math.random() * 5000)}`);
      setPhone('+91 98300 ');
      setEmail('');
      setStatus('active');
      setSignatureUrl('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><path d="M15,40 Q40,12 70,36 T120,24 T165,40 T190,18" fill="none" stroke="%230f766e" stroke-width="2.5" stroke-linecap="round"/></svg>');
      setStampUrl('');
    }
  }, [technician, isOpen]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f766e';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const applyDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureUrl(dataUrl);
    setShowCanvas(false);
    showToast('success', 'Digital Signature Applied', 'Handwritten signature adopted for official reports.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'signature' | 'stamp') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'File Too Large', 'Please upload a signature or stamp image under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (type === 'signature') {
        setSignatureUrl(result);
        showToast('success', 'Signature Uploaded', 'Technician signature graphic updated.');
      } else {
        setStampUrl(result);
        showToast('success', 'Stamp Uploaded', 'Council stamp image updated.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Validation Error', 'Technician Full Name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && technician) {
        const res = TechnicianMasterService.updateTechnician(technician.id, {
          name,
          qualification,
          designation,
          department,
          regNumber,
          phone,
          email,
          status,
          signatureUrl,
          stampUrl
        }, 'super_admin');

        if (res.success) {
          triggerCelebrationFireworks();
          showToast('success', 'Technologist Updated', `${name} credentials and signature saved.`);
          onSaved();
          onClose();
        } else {
          showToast('error', 'Update Failed', res.error);
        }
      } else {
        const res = TechnicianMasterService.createTechnician({
          name,
          qualification,
          designation,
          department,
          regNumber,
          phone,
          email,
          status,
          signatureUrl,
          stampUrl
        }, 'super_admin');

        if (res.success && res.technician) {
          triggerCelebrationFireworks();
          showToast('success', 'Technologist Registered', `${res.technician.name} (${res.technician.technicianCode}) enrolled in Technician Master.`);
          onSaved();
          onClose();
        } else {
          showToast('error', 'Creation Failed', res.error);
        }
      }
    } catch (err: any) {
      showToast('error', 'Operation Failed', err.message || 'Error processing technologist record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `👑 Edit Laboratory Technologist — ${technician?.name}` : '👑 Register Laboratory Technologist to Master'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {/* Governance Banner */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 border border-teal-500/40 flex items-center justify-between text-slate-300">
          <div className="flex items-center gap-2 font-black text-teal-300">
            <TestTube className="w-4 h-4 text-teal-400" />
            <span>Authorized Diagnostic Laboratory Technologist Setup & Digital Signatures</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[10px] font-bold">
            LIS Master
          </span>
        </div>

        {/* Section 1: Professional Demographics */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <strong className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Award className="w-4 h-4 text-teal-500" />
            <span>Technologist Credentials & Council Registration</span>
          </strong>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Technologist Full Name *
              </label>
              <Input
                placeholder="e.g. Debashis Mukherjee"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Qualifications & Degrees *
              </label>
              <Input
                placeholder="e.g. B.Sc (MLT), DMLT"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Official Designation *
              </label>
              <Input
                placeholder="e.g. Senior Medical Laboratory Technologist"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Department / Lab Discipline *
              </label>
              <Input
                placeholder="e.g. Hematology & Clinical Biochemistry"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                State Paramedical Registration No. *
              </label>
              <Input
                placeholder="e.g. WB-PMAC-5519"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Contact Phone
              </label>
              <Input
                placeholder="e.g. +91 98300 22001"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Email Address
              </label>
              <Input
                placeholder="e.g. debashis.mlt@labmedix.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Operational Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="active">Active (Authorized for Sign-Off)</option>
                <option value="on_leave">On Leave</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Authorized Digital Signature & Stamp */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <strong className="text-xs font-bold text-white flex items-center gap-1.5">
              <PenTool className="w-4 h-4 text-teal-400" />
              <span>Authorized Technologist Digital Signature & Seal</span>
            </strong>
            <span className="text-[10px] text-teal-400 font-mono font-bold">
              Automatic Report Authorization
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Signature Preview & Actions */}
            <div className="space-y-2 p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Official Digital Signature
              </span>

              {signatureUrl ? (
                <div className="h-20 p-2 bg-white rounded-xl border border-slate-300 flex items-center justify-center">
                  <img src={signatureUrl} alt="Technician Signature" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="h-20 rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 text-[10px]">
                  <span>No Digital Signature Configured</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <label className="flex-1 cursor-pointer">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all">
                    <Upload className="w-3.5 h-3.5" /> Upload File
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'signature')}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowCanvas(!showCanvas)}
                  className="px-3 py-1.5 rounded-xl bg-teal-600/20 text-teal-300 hover:bg-teal-600/30 border border-teal-500/40 text-[11px] font-bold flex items-center gap-1 transition-all"
                >
                  <PenTool className="w-3.5 h-3.5" /> {showCanvas ? 'Close Pad' : 'Draw Live'}
                </button>
              </div>
            </div>

            {/* Optional Stamp Upload */}
            <div className="space-y-2 p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Official Council Stamp / Seal (Optional)
              </span>

              {stampUrl ? (
                <div className="h-20 p-2 bg-white rounded-xl border border-slate-300 flex items-center justify-center">
                  <img src={stampUrl} alt="Council Stamp" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="h-20 rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 text-[10px]">
                  <span>No Stamp Image Attached</span>
                </div>
              )}

              <div className="pt-1">
                <label className="block cursor-pointer">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all">
                    <Upload className="w-3.5 h-3.5" /> Upload Stamp Graphic
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'stamp')}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Draw Live Interactive Signature Canvas */}
          {showCanvas && (
            <div className="p-3 bg-slate-950 border border-teal-500/50 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-[11px] text-teal-400 font-bold">
                <span>Draw your official signature in the box below:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <Eraser className="w-3 h-3" /> Clear
                  </button>
                  <button
                    type="button"
                    onClick={applyDrawnSignature}
                    className="px-2.5 py-0.5 rounded-lg bg-teal-600 text-white font-black hover:bg-teal-500"
                  >
                    Adopt Signature ✓
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-1 border border-slate-300 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={120}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[120px] cursor-crosshair touch-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 text-white font-black shadow-lg"
            leftIcon={<Save className="w-4 h-4 text-white" />}
          >
            {isEditing ? 'Save Technologist Credentials' : 'Enroll Technologist'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
