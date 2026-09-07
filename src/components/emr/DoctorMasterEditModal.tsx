import React, { useState, useEffect } from 'react';
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
  Calendar
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
  const [speciality, setSpeciality] = useState('Cardiology & Interventional Medicine');
  const [department, setDepartment] = useState('Cardiology OPD');
  const [regNumber, setRegNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [opdRoom, setOpdRoom] = useState('Room 102 (First Floor)');
  const [avatarUrl, setAvatarUrl] = useState('');
  
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
      setSpeciality(doctor.speciality);
      setDepartment(doctor.department);
      setRegNumber(doctor.regNumber);
      setPhone(doctor.phone);
      setEmail(doctor.email);
      setOpdRoom(doctor.opdRoom);
      setAvatarUrl(doctor.avatarUrl);
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
      setSpeciality('Cardiology & Interventional Medicine');
      setDepartment('Cardiology OPD');
      setRegNumber(`WBMC-${Math.floor(50000 + Math.random() * 40000)}`);
      setPhone('+91 98300 ');
      setEmail('');
      setOpdRoom('Room 102 (First Floor)');
      setAvatarUrl('https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80');
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
          speciality,
          department,
          regNumber,
          phone,
          email,
          opdRoom,
          avatarUrl,
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
          showToast('success', 'Doctor Master Updated', `${name} profile and commission matrix updated.`);
          onSaved();
          onClose();
        } else {
          showToast('error', 'Update Failed', res.error);
        }
      } else {
        const res = DoctorMasterService.createDoctor({
          name,
          qualification,
          speciality,
          department,
          regNumber,
          phone,
          email: email || `${cleanUsername}@labmedix.org`,
          opdRoom,
          avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
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
          <strong className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-teal-500" />
            <span>Physician Profile & Clinical Qualifications</span>
          </strong>

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

        {/* SECTION 2: AUTO USER ID & SECURITY PIN */}
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
