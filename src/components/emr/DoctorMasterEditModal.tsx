import React, { useState, useEffect, useRef } from 'react';
import { DoctorMasterItem, DoctorMasterService } from '../../services/doctorMasterService';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { useToast } from '../../context/ToastContext';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import {
  Crown,
  Stethoscope,
  KeyRound,
  User,
  DollarSign,
  TestTube,
  ShieldCheck,
  Save,
  Sparkles,
  Phone,
  Mail,
  Building,
  Award,
  Lock,
  Clock,
  Calendar,
  PenTool,
  Upload,
  Eraser,
  CheckCircle2,
  FileCheck
} from 'lucide-react';

interface DoctorMasterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: DoctorMasterItem | null;
  onSaved: () => void;
  isSuperAdmin: boolean;
}

export const DoctorMasterEditModal: React.FC<DoctorMasterEditModalProps> = ({
  isOpen,
  onClose,
  doctor,
  onSaved,
  isSuperAdmin
}) => {
  const { showToast } = useToast();
  const isEditing = !!doctor;

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [qualification, setQualification] = useState('');
  const [designation, setDesignation] = useState('');
  const [isReportingDoctor, setIsReportingDoctor] = useState(true);
  const [speciality, setSpeciality] = useState('Cardiology & Interventional Medicine');
  const [department, setDepartment] = useState('Cardiology OPD');
  const [regNumber, setRegNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [opdRoom, setOpdRoom] = useState('Room 102 (First Floor)');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Signatures & Stamp
  const [signatureUrl, setSignatureUrl] = useState('');
  const [stampUrl, setStampUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);

  // Credentials
  const [username, setUsername] = useState('');
  const [pinCode, setPinCode] = useState('1234');
  
  // Fees
  const [standardFee, setStandardFee] = useState<number>(800);
  const [followUpFee, setFollowUpFee] = useState<number>(500);
  const [telemedicineFee, setTelemedicineFee] = useState<number>(700);
  const [cardholderDiscountPercent, setCardholderDiscountPercent] = useState<number>(20);
  
  // Blood Commission
  const [bloodCommissionPercent, setBloodCommissionPercent] = useState<number>(20);
  const [status, setStatus] = useState<'active' | 'on_leave' | 'inactive'>('active');
  const [opdTiming, setOpdTiming] = useState('10:00 AM - 02:00 PM');

  useEffect(() => {
    if (doctor) {
      setName(doctor.name);
      setQualification(doctor.qualification);
      setDesignation(doctor.designation || `Consultant (${doctor.speciality})`);
      setIsReportingDoctor(doctor.isReportingDoctor ?? true);
      setSpeciality(doctor.speciality);
      setDepartment(doctor.department);
      setRegNumber(doctor.regNumber);
      setPhone(doctor.phone);
      setEmail(doctor.email);
      setOpdRoom(doctor.opdRoom);
      setAvatarUrl(doctor.avatarUrl);
      setSignatureUrl(doctor.signatureUrl || '');
      setStampUrl(doctor.stampUrl || '');
      setUsername(doctor.username);
      setPinCode(doctor.pinCode || '1234');
      setStandardFee(doctor.standardFee);
      setFollowUpFee(doctor.followUpFee);
      setTelemedicineFee(doctor.telemedicineFee);
      setCardholderDiscountPercent(doctor.cardholderDiscountPercent);
      setBloodCommissionPercent(doctor.bloodCommissionPercent);
      setStatus(doctor.status);
      setOpdTiming(doctor.opdTiming);
    } else {
      setName('');
      setQualification('MBBS, MD (Medicine)');
      setDesignation('Senior Consultant Physician & Clinical Pathologist');
      setIsReportingDoctor(true);
      setSpeciality('Cardiology & Interventional Medicine');
      setDepartment('Cardiology OPD');
      setRegNumber(`WBMC-${Math.floor(50000 + Math.random() * 40000)}`);
      setPhone('+91 98300 ');
      setEmail('');
      setOpdRoom('Room 102 (First Floor)');
      setAvatarUrl('https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80');
      setSignatureUrl('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><path d="M10,40 Q30,10 60,35 T110,25 T150,45 T190,20" fill="none" stroke="%231e3a8a" stroke-width="2.5" stroke-linecap="round"/></svg>');
      setStampUrl('');
      setUsername('');
      setPinCode('1234');
      setStandardFee(800);
      setFollowUpFee(500);
      setTelemedicineFee(700);
      setCardholderDiscountPercent(20);
      setBloodCommissionPercent(20);
      setStatus('active');
      setOpdTiming('10:00 AM - 02:00 PM');
    }
  }, [doctor, isOpen]);

  // Canvas drawing
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
    ctx.strokeStyle = '#1e3a8a';
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
    showToast('success', 'Digital Signature Applied', 'Doctor digital signature saved.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'signature' | 'stamp') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'File Too Large', 'Please upload an image under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      if (type === 'signature') {
        setSignatureUrl(res);
        showToast('success', 'Signature Uploaded', 'Doctor signature image updated.');
      } else {
        setStampUrl(res);
        showToast('success', 'Stamp Uploaded', 'Council seal/stamp updated.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showToast('error', 'Super Admin Required', 'Only Root Super Administrator can edit or create Doctor Master entries.');
      return;
    }

    if (!name.trim()) {
      showToast('error', 'Validation Error', 'Doctor name is required.');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const cleanUsername = username.trim() ? username.trim().toLowerCase().replace(/\s+/g, '.') : name.toLowerCase().replace(/[^a-z0-9]/g, '.');

      if (isEditing && doctor) {
        const res = DoctorMasterService.updateDoctor(doctor.id, {
          name,
          qualification,
          designation,
          isReportingDoctor,
          speciality,
          department,
          regNumber,
          phone,
          email,
          opdRoom,
          avatarUrl,
          signatureUrl,
          stampUrl,
          pinCode,
          standardFee,
          followUpFee,
          telemedicineFee,
          cardholderDiscountPercent,
          bloodCommissionPercent,
          status,
          opdTiming
        }, 'super_admin');

        if (res.success) {
          triggerCelebrationFireworks();
          showToast('success', 'Doctor Master Updated', `${name} profile, credentials and signatures updated.`);
          onSaved();
          onClose();
        } else {
          showToast('error', 'Update Failed', res.error);
        }
      } else {
        const res = DoctorMasterService.createDoctor({
          name,
          qualification,
          designation,
          isReportingDoctor,
          speciality,
          department,
          regNumber,
          phone,
          email: email || `${cleanUsername}@labmedix.org`,
          opdRoom,
          avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
          signatureUrl,
          stampUrl,
          username: cleanUsername,
          pinCode,
          standardFee,
          followUpFee,
          telemedicineFee,
          cardholderDiscountPercent,
          bloodCommissionPercent,
          status,
          availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          opdTiming
        }, 'super_admin');

        if (res.success && res.doctor) {
          triggerCelebrationFireworks();
          showToast('success', 'Doctor Master Created', `${res.doctor.name} registered with Auto User ID @${res.doctor.username} & PIN ${res.doctor.pinCode}.`);
          onSaved();
          onClose();
        } else {
          showToast('error', 'Registration Failed', res.error);
        }
      }
    } catch (err: any) {
      showToast('error', 'Operation Failed', err?.message || 'Failed to process Doctor Master entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `👑 Super Admin: Edit Doctor Master - ${doctor?.name}` : '👑 Super Admin: Register Physician to Doctor Master'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {/* Super Admin Top Governance Banner */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-teal-950/80 border border-purple-500/40 flex items-center justify-between text-slate-300">
          <div className="flex items-center gap-2 font-black text-purple-300">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Root Master Authority: Full Doctor Profile, Credentials & Commission Governance</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">
            Level 5
          </span>
        </div>

        {/* SECTION 1: CLINICAL CREDENTIALS & DEMOGRAPHICS */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <strong className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-teal-500" />
              <span>Physician Profile & Clinical Qualifications</span>
            </strong>
            <label className="flex items-center gap-2 cursor-pointer bg-teal-500/10 px-2.5 py-1 rounded-xl border border-teal-500/30">
              <input
                type="checkbox"
                checked={isReportingDoctor}
                onChange={(e) => setIsReportingDoctor(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300">
                Authorized Diagnostic Reporting Doctor
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Doctor Full Name:
              </label>
              <Input
                placeholder="e.g. Dr. Subhashish Roy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Medical Degrees & Qualifications:
              </label>
              <Input
                placeholder="e.g. MBBS, MD (Medicine), DM (Cardiology)"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Official Clinical Designation:
              </label>
              <Input
                placeholder="e.g. Senior Consultant Pathologist & Head of Diagnostics"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Speciality:
              </label>
              <Input
                placeholder="e.g. Cardiology & Interventional Medicine"
                value={speciality}
                onChange={(e) => setSpeciality(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Department / OPD Clinic:
              </label>
              <Input
                placeholder="e.g. Cardiology OPD"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                State Medical Registration No:
              </label>
              <Input
                placeholder="e.g. WBMC-88412"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                OPD Room & Floor Location:
              </label>
              <Input
                placeholder="e.g. Room 102 (First Floor)"
                value={opdRoom}
                onChange={(e) => setOpdRoom(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Contact Mobile:
              </label>
              <Input
                placeholder="e.g. +91 98301 11223"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                OPD Consultation Timing:
              </label>
              <Input
                placeholder="e.g. 10:00 AM - 02:00 PM"
                value={opdTiming}
                onChange={(e) => setOpdTiming(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: AUTHORIZED DIGITAL SIGNATURE & STAMP */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <strong className="text-xs font-bold text-white flex items-center gap-1.5">
              <PenTool className="w-4 h-4 text-teal-400" />
              <span>Doctor Digital Signature & Council Seal</span>
            </strong>
            <span className="text-[10px] text-teal-400 font-mono">
              Diagnostic Sign-off
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Digital Signature Graphic</span>
              {signatureUrl ? (
                <div className="h-16 p-2 bg-white rounded-lg border border-slate-300 flex items-center justify-center">
                  <img src={signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="h-16 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-[10px]">
                  No signature configured
                </div>
              )}
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer">
                  <span className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center gap-1">
                    <Upload className="w-3 h-3" /> Upload
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'signature')} />
                </label>
                <button
                  type="button"
                  onClick={() => setShowCanvas(!showCanvas)}
                  className="px-2 py-1 rounded bg-teal-600/20 text-teal-300 border border-teal-500/40 text-[10px] font-bold flex items-center gap-1"
                >
                  <PenTool className="w-3 h-3" /> {showCanvas ? 'Close' : 'Draw'}
                </button>
              </div>
            </div>

            <div className="space-y-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Doctor Seal / Stamp (Optional)</span>
              {stampUrl ? (
                <div className="h-16 p-2 bg-white rounded-lg border border-slate-300 flex items-center justify-center">
                  <img src={stampUrl} alt="Stamp" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="h-16 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-[10px]">
                  No stamp attached
                </div>
              )}
              <label className="block cursor-pointer">
                <span className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center gap-1">
                  <Upload className="w-3 h-3" /> Upload Stamp
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'stamp')} />
              </label>
            </div>
          </div>

          {showCanvas && (
            <div className="p-3 bg-slate-950 border border-teal-500/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[10px] text-teal-400 font-bold">
                <span>Draw Doctor Signature with mouse or stylus:</span>
                <div className="flex gap-2">
                  <button type="button" onClick={clearCanvas} className="text-rose-400 hover:underline flex items-center gap-0.5">
                    <Eraser className="w-3 h-3" /> Clear
                  </button>
                  <button type="button" onClick={applyDrawnSignature} className="bg-teal-600 text-white px-2 py-0.5 rounded font-bold">
                    Adopt Signature ✓
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-lg p-1">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={100}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[100px] cursor-crosshair touch-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: AUTO USER ID & SECURITY PIN */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">

          <div className="flex items-center justify-between">
            <strong className="text-xs font-bold text-white flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Auto Staff User Account & Login Credentials</span>
            </strong>
            <span className="text-[10px] text-amber-400 font-mono">Role: Licensed Doctor</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                Operational Username / Login ID:
              </label>
              <Input
                placeholder="e.g. dr.subhashish"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isEditing}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                Security Password / PIN (4-Digit):
              </label>
              <Input
                type="text"
                placeholder="e.g. 4-digit PIN"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: CONSULTATION FEES & BLOOD REFERRAL COMMISSION MATRIX */}
        <div className="p-3.5 rounded-2xl bg-teal-950/40 border border-teal-500/40 space-y-3">
          <strong className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Consultation Fee Structure & Blood Test Referral Commission (%)</span>
          </strong>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                Standard OPD Fee (₹):
              </label>
              <Input
                type="number"
                value={standardFee}
                onChange={(e) => setStandardFee(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                Follow-up Fee (₹):
              </label>
              <Input
                type="number"
                value={followUpFee}
                onChange={(e) => setFollowUpFee(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                Telemedicine Fee (₹):
              </label>
              <Input
                type="number"
                value={telemedicineFee}
                onChange={(e) => setTelemedicineFee(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-amber-300 block">
                🩸 Blood Commission (%):
              </label>
              <Input
                type="number"
                value={bloodCommissionPercent}
                onChange={(e) => setBloodCommissionPercent(parseInt(e.target.value, 10) || 0)}
                required
              />
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
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
            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-500 text-white font-black shadow-lg"
            leftIcon={<Save className="w-4 h-4 text-white" />}
          >
            {isEditing ? 'Save Doctor Master Changes' : 'Register Physician to Master'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
