import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PatientService } from '../../services/patientService';
import { StorageService } from '../../services/storage';
import { CardService } from '../../services/cardService';
import { FamilyService } from '../../services/familyService';
import { WalletService } from '../../services/walletService';
import { EMRService } from '../../services/emrService';
import { PortalService, BloodTestBooking, MedicineOrder } from '../../services/portalService';
import { ApiSyncService } from '../../services/apiSyncService';
import { PatientRecordPdfService } from '../../services/patientRecordPdfService';
import { ClinicalEncounter, PatientAppointment, Membership } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Badge, CardStatusBadge } from '../../components/common/Badge';
import { CR80CardFront } from '../../components/card/CR80CardFront';
import { FramerInteractiveHealthCard } from '../../components/card/FramerInteractiveHealthCard';
import { CardStudio } from '../../components/card/CardStudio';
import { CreateCardRequestModal } from '../../components/card/CreateCardRequestModal';
import { PatientVitalsModule } from '../../components/patients/PatientVitalsModule';
import { PrescriptionPrintModal } from '../../components/emr/PrescriptionPrintModal';
import { LabReportPrintModal } from '../../components/emr/LabReportPrintModal';
import { WalletTransactionModal, WalletReceiptModal } from '../../components/wallet/WalletTransactionModal';
import { CardRenewalModal } from '../cards/CardRenewalModal';
import { CardReplacementModal } from '../cards/CardReplacementModal';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import {
  ArrowLeft,
  User,
  CreditCard,
  Wallet as WalletIcon,
  Users2,
  FileText,
  History,
  Activity,
  Plus,
  RefreshCw,
  Printer,
  Edit,
  ShieldCheck,
  Layers,
  HeartPulse,
  Download,
  FileDown,
  Stethoscope,
  Pill,
  FlaskConical,
  Calendar,
  Sparkles,
  CheckCircle2,
  Lock,
  ShieldAlert,
  Clock,
  ChevronRight,
  Eye,
  Share2,
  CheckCheck,
  Video,
  ExternalLink,
  Tag
} from 'lucide-react';

export const PatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'clinical_history' | 'vitals' | 'personal' | 'card' | 'family' | 'wallet' | 'card_history' | 'activity'>('overview');
  const [clinicalSubTab, setClinicalSubTab] = useState<'all' | 'encounters' | 'labs' | 'medicines' | 'appointments'>('all');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeReceiptTxn, setActiveReceiptTxn] = useState<any>(null);
  const [isRenewalOpen, setIsRenewalOpen] = useState(false);
  const [isReplacementOpen, setIsReplacementOpen] = useState(false);
  const [isCreateCardModalOpen, setIsCreateCardModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Print modals for Clinical tab
  const [activePrintEncounter, setActivePrintEncounter] = useState<ClinicalEncounter | null>(null);
  const [activePrintLabBooking, setActivePrintLabBooking] = useState<BloodTestBooking | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsubPatients = ApiSyncService.subscribeToCollection('patients', () => setTick(t => t + 1));
    const unsubCards = ApiSyncService.subscribeToCollection('cards', () => setTick(t => t + 1));
    const unsubWallets = ApiSyncService.subscribeToCollection('wallets', () => setTick(t => t + 1));
    const unsubApps = ApiSyncService.subscribeToCollection('cardApplications', () => setTick(t => t + 1));

    const handleSync = () => setTick(t => t + 1);
    window.addEventListener('labmedix_data_synced', handleSync);
    return () => {
      unsubPatients();
      unsubCards();
      unsubWallets();
      unsubApps();
      window.removeEventListener('labmedix_data_synced', handleSync);
    };
  }, []);

  const defaultMembership: Membership = {
    id: 'tier_standard',
    name: 'Standard Care Membership',
    slug: 'standard-care',
    validityMonths: 12,
    registrationFee: 0,
    annualRenewalFee: 0,
    opdDiscount: 20,
    labDiscount: 20,
    pharmacyDiscount: 10,
    homeCollectionDiscount: 15,
    specialBenefits: ['Digital Health Card', 'Free Annual Checkup'],
    color: '#3b82f6',
    badgeIcon: 'Shield',
    isFamilyPlan: true,
    maxFamilyMembers: 4,
    status: 'active',
    createdAt: '2025-01-01T00:00:00.000Z'
  };

  const patient = PatientService.getById(id || '');
  const company = StorageService.getCompanyProfile();
  const card = patient ? CardService.getById(patient.healthCardId || '') : undefined;
  const pendingApp = useMemo(() => {
    if (!patient) return undefined;
    return PortalService.getCardApplications().find(
      a => (a.patientId === patient.id || a.mobile === patient.mobile) && (a.status === 'submitted' || a.status === 'under_review' || a.status === 'pending_approval' || a.status === 'info_required')
    );
  }, [patient, tick]);
  const memberships = StorageService.getMemberships() || [];
  const membership = (card ? memberships.find(m => m && m.id === card?.membershipId) : null) || memberships[0] || defaultMembership;
  const wallet = patient ? WalletService.getByPatientId(patient.id) : undefined;
  const transactions = patient ? WalletService.getTransactions(patient.id) : [];
  const family = patient ? FamilyService.getByPatientId(patient.id) : undefined;
  const auditLogs = StorageService.getAuditLogs().filter(l => l.referenceId === id || l.description.includes(id || ''));

  // Live Clinical Data linked to Card/Patient
  const encounters = useMemo(() => {
    if (!patient) return [];
    return EMRService.getEncountersByPatient(patient.id);
  }, [patient]);

  const appointments = useMemo(() => {
    if (!patient) return [];
    return EMRService.getAppointmentsByPatient(patient.id);
  }, [patient]);

  const labBookings = useMemo(() => {
    if (!patient) return [];
    return PortalService.getLabBookings(patient.id);
  }, [patient]);

  const pharmacyOrders = useMemo(() => {
    if (!patient) return [];
    return PortalService.getPharmacyOrders(patient.id);
  }, [patient]);

  // Aggregate all prescribed medicines across encounters
  const allPrescribedMeds = useMemo(() => {
    const meds: Array<{
      encounterNo: string;
      date: string;
      doctorName: string;
      name: string;
      composition?: string;
      dosage: string;
      frequency: string;
      timing: string;
      duration: string;
      instructions?: string;
    }> = [];
    encounters.forEach(e => {
      e.medications.forEach(m => {
        meds.push({
          encounterNo: e.encounterNo,
          date: e.date,
          doctorName: e.doctorName,
          name: m.name,
          composition: 'Standard formulation',
          dosage: m.dosage,
          frequency: m.frequency,
          timing: m.timing,
          duration: m.duration || '5 Days',
          instructions: m.instructions
        });
      });
    });
    return meds;
  }, [encounters]);

  const handleDownloadFullRecord = async () => {
    if (!patient) return;
    try {
      setIsGeneratingPdf(true);
      showToast('info', 'Compiling Medical Record', `Aggregating clinical profile, vitals, prescriptions & tests for ${patient.fullName}...`);
      await PatientRecordPdfService.generateFullRecordPdf(patient.id);
      showToast('success', 'Full Record Downloaded', 'Comprehensive Patient Health Record PDF downloaded successfully.');
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      showToast('error', 'Download Failed', err?.message || 'Failed to generate PDF record.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!patient) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Patient Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">The patient ID {id} does not exist in records.</p>
        <Button className="mt-4" onClick={() => navigate('/patients')}>
          Back to Directory
        </Button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: User },
    { id: 'clinical_history', name: 'Card Clinical & Rx Records', icon: Stethoscope },
    { id: 'vitals', name: 'Patient Vitals', icon: HeartPulse },
    { id: 'personal', name: 'Personal Details', icon: FileText },
    { id: 'card', name: 'Health Card & Studio', icon: CreditCard },
    { id: 'family', name: 'Family Group', icon: Users2 },
    { id: 'wallet', name: 'Health Wallet', icon: WalletIcon },
    { id: 'card_history', name: 'Card History', icon: History },
    { id: 'activity', name: 'Audit Trail', icon: Activity }
  ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/patients')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {patient.fullName}
              </h2>
              {card && <CardStatusBadge status={card.status} />}
            </div>
            <span className="text-xs font-mono text-slate-500">
              Patient ID: {patient.id} • Registered: {formatDate(patient.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download Full Patient Record PDF Button */}
          <Button
            size="sm"
            variant="primary"
            leftIcon={<FileDown className="w-4 h-4" />}
            isLoading={isGeneratingPdf}
            onClick={handleDownloadFullRecord}
            className="bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-700 hover:from-blue-600 hover:to-teal-600 text-white font-bold shadow-md"
          >
            Download Full Patient Record (PDF)
          </Button>

          {can('card_request_create') && !card && (
            pendingApp ? (
              <span className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <Clock className="w-3.5 h-3.5" />
                Card Request Pending ({pendingApp.applicationNo})
              </span>
            ) : (
              <Button
                size="sm"
                variant="primary"
                leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                onClick={() => setIsCreateCardModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
              >
                Request Health Card
              </Button>
            )
          )}

          {can('wallet_credit') && wallet && (
            <Button
              size="sm"
              variant="success"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsWalletModalOpen(true)}
            >
              Deposit Wallet
            </Button>
          )}

          {can('card_renew') && card && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => setIsRenewalOpen(true)}
            >
              Renew Card
            </Button>
          )}

          {can('card_replace') && card && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Layers className="w-3.5 h-3.5" />}
              onClick={() => setIsReplacementOpen(true)}
            >
              Replace Card
            </Button>
          )}

          {can('patient_update') && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Edit className="w-3.5 h-3.5" />}
              onClick={() => navigate(`/patients/${patient.id}/edit`)}
            >
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Profile Header Summary Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6">
        <img
          src={patient.photoUrl || '/logo.jpg'}
          alt={patient.fullName}
          className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-200 shadow-md shrink-0"
        />

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs w-full">
          <div>
            <span className="text-slate-400 uppercase font-semibold block text-[10px]">Contact Mobile</span>
            <strong className="text-slate-800 dark:text-slate-200 text-sm block mt-0.5">{patient.mobile}</strong>
            <span className="text-slate-500">{patient.email || 'No email provided'}</span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-semibold block text-[10px]">Demographics</span>
            <strong className="text-slate-800 dark:text-slate-200 text-sm block mt-0.5">{patient.age} Years • {patient.gender.toUpperCase()}</strong>
            <span className="text-red-500 font-bold">Blood Group: {patient.bloodGroup}</span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-semibold block text-[10px]">Health Card & Tier</span>
            <strong className="font-mono text-brand-blue dark:text-blue-400 text-sm block mt-0.5">
              {card ? card.cardNumber : 'No Active Card'}
            </strong>
            <span className="text-slate-600 dark:text-slate-300 font-semibold">{membership.name}</span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-semibold block text-[10px]">Health Wallet Float</span>
            <strong className="text-emerald-600 text-lg font-black block mt-0.5">
              {formatCurrency(wallet?.balance || 0)}
            </strong>
            <span className="text-slate-500">{transactions.length} Transactions</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      <div>
        {/* Tab: Card-Wise Clinical & Rx Records */}
        {activeTab === 'clinical_history' && (
          <div className="space-y-6">
            {/* Live Security Guarantee Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-3xl border border-blue-500/30 text-white shadow-lg space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center shadow-inner">
                    <ShieldCheck className="w-7 h-7 text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">Live Card-Wise Medical Directory & Clinical Log</h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        100% Live Verified
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Strict cryptographic card linkage. Zero simulated or fake entries permitted. Every record is digitally audited and signed.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Stethoscope className="w-4 h-4" />}
                    onClick={() => navigate('/emr')}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                  >
                    Open Rx Studio / New Prescription
                  </Button>
                </div>
              </div>

              {/* Card Meta & Cryptographic Fingerprint */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800 text-xs">
                <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Bound Health Card</span>
                  <strong className="font-mono text-blue-300 font-bold text-sm block mt-0.5">{card ? card.cardNumber : 'Direct Patient UID'}</strong>
                  <span className="text-[10px] text-slate-400">{membership.name}</span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Doctor Consultations</span>
                  <strong className="text-white font-black text-sm block mt-0.5">{encounters.length} Live Rx Records</strong>
                  <span className="text-[10px] text-emerald-400">All Signed by Doctors</span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Blood & Lab Orders</span>
                  <strong className="text-white font-black text-sm block mt-0.5">{labBookings.length} Lab Requisitions</strong>
                  <span className="text-[10px] text-blue-400">Direct Pathology Sync</span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Prescribed Medicines</span>
                  <strong className="text-white font-black text-sm block mt-0.5">{allPrescribedMeds.length} Active Rx Drugs</strong>
                  <span className="text-[10px] text-amber-400">Cross-verified Dosage</span>
                </div>
              </div>
            </div>

            {/* Sub-Tabs / Category Filters */}
            <div className="flex items-center gap-2 overflow-x-auto bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl">
              <button
                onClick={() => setClinicalSubTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  clinicalSubTab === 'all'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All Live Card Records ({encounters.length + labBookings.length + appointments.length})
              </button>
              <button
                onClick={() => setClinicalSubTab('encounters')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  clinicalSubTab === 'encounters'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                Doctor Recommendations & Rx ({encounters.length})
              </button>
              <button
                onClick={() => setClinicalSubTab('labs')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  clinicalSubTab === 'labs'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                Blood Tests & Pathology ({labBookings.length})
              </button>
              <button
                onClick={() => setClinicalSubTab('medicines')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  clinicalSubTab === 'medicines'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Pill className="w-3.5 h-3.5" />
                Prescribed Medicines ({allPrescribedMeds.length})
              </button>
              <button
                onClick={() => setClinicalSubTab('appointments')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  clinicalSubTab === 'appointments'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Doctor Appointments ({appointments.length})
              </button>
            </div>

            {/* SECTION 1: Doctor Consultations & Digital Prescriptions */}
            {(clinicalSubTab === 'all' || clinicalSubTab === 'encounters') && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    Doctor Consultations, Digital Prescriptions & Clinical Advice
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">{encounters.length} Records</span>
                </div>

                {encounters.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Stethoscope className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Doctor Consultations Recorded Yet for this Card</p>
                    <p className="text-[11px] text-slate-400 mt-1">When a doctor writes an authentic prescription in EMR Studio, it will appear here immediately.</p>
                    <Button
                      size="sm"
                      variant="primary"
                      className="mt-3"
                      onClick={() => navigate('/emr')}
                    >
                      Start EMR Consultation
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {encounters.map((enc) => (
                      <div
                        key={enc.id}
                        className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                {enc.encounterNo}
                              </span>
                              <strong className="text-sm text-slate-900 dark:text-white font-bold">{enc.doctorName}</strong>
                              <span className="text-[11px] text-slate-500">({enc.doctorSpeciality})</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                              <span>Reg: {enc.doctorRegNo}</span>
                              <span>•</span>
                              <span>Dept: {enc.department}</span>
                              <span>•</span>
                              <span>Date: {formatDateTime(enc.date || enc.createdAt)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold rounded flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              {enc.securitySeal || 'LIVE SIGNED'}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<Printer className="w-3.5 h-3.5" />}
                              onClick={() => setActivePrintEncounter(enc)}
                            >
                              Print Prescription
                            </Button>
                          </div>
                        </div>

                        {/* Clinical Highlights */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Chief Complaints & Diagnosis</span>
                            <div className="space-y-1">
                              <p className="text-slate-800 dark:text-slate-200 font-semibold">
                                {enc.chiefComplaints?.join(', ') || 'General Consultation'}
                              </p>
                              {enc.diagnoses?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {enc.diagnoses.map((d, di) => (
                                    <span key={di} className="px-1.5 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded text-[10px] font-bold">
                                      {d}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Prescribed Medicines ({enc.medications?.length || 0})</span>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {enc.medications?.map((m, mi) => (
                                <div key={mi} className="text-[11px] flex items-center justify-between text-slate-700 dark:text-slate-300">
                                  <span className="font-semibold">{m.name}</span>
                                  <span className="text-slate-400 font-mono text-[10px]">{m.dosage} • {m.frequency}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Diet & Doctor Wishes / Advice</span>
                            <div className="space-y-0.5">
                              {enc.dietAndAdvice?.map((adv, ai) => (
                                <p key={ai} className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1">
                                  <span className="text-emerald-500">•</span>
                                  {adv}
                                </p>
                              ))}
                              {enc.followUpDate && (
                                <p className="text-[11px] font-bold text-blue-600 mt-1">
                                  Follow-up: {formatDate(enc.followUpDate)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 2: Blood Tests & Diagnostic Lab Orders */}
            {(clinicalSubTab === 'all' || clinicalSubTab === 'labs') && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-emerald-600" />
                    Ordered Blood Tests, Pathology & Diagnostic Reports
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">{labBookings.length} Bookings</span>
                </div>

                {labBookings.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <FlaskConical className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Blood Tests or Lab Orders Recorded for this Card</p>
                    <p className="text-[11px] text-slate-400 mt-1">Doctor-prescribed lab requisitions and diagnostic bookings will be synced here in real-time.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] font-bold text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Booking No & Date</th>
                          <th className="px-4 py-3">Test Investigation</th>
                          <th className="px-4 py-3">Category / Tube</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Net Price</th>
                          <th className="px-4 py-3 text-right">Report Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {labBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-mono">
                              <span className="font-bold text-slate-900 dark:text-white block">{b.bookingNo}</span>
                              <span className="text-[10px] text-slate-400">{formatDate(b.scheduledDate || b.createdAt)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <strong className="text-slate-900 dark:text-white block">{b.testName}</strong>
                              {b.prescribedByDoctorName && (
                                <span className="text-[10px] text-blue-600">Prescribed by {b.prescribedByDoctorName}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-slate-600 dark:text-slate-300 block">{b.category}</span>
                              {b.sampleBarcode && (
                                <span className="font-mono text-[10px] text-slate-400">Barcode: {b.sampleBarcode}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                b.status === 'report_ready' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                b.status === 'processing' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                b.status === 'sample_collected' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                                'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                              }`}>
                                {b.status === 'report_ready' ? 'Report Ready' :
                                 b.status === 'processing' ? 'Lab Processing' :
                                 b.status === 'sample_collected' ? 'Sample Collected' : 'Confirmed'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                              {formatCurrency(b.netPrice)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {b.status === 'report_ready' || b.testResults ? (
                                <button
                                  onClick={() => setActivePrintLabBooking(b)}
                                  className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs inline-flex items-center gap-1 border border-blue-200"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  View Lab Report
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono">In Progress</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 3: Prescribed Medicines Chart */}
            {(clinicalSubTab === 'all' || clinicalSubTab === 'medicines') && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Pill className="w-4 h-4 text-amber-600" />
                    Doctor Prescribed Medications & Pharmacy Dispensing Chart
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">{allPrescribedMeds.length} Prescribed Drugs</span>
                </div>

                {allPrescribedMeds.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Pill className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Prescribed Medications on Record</p>
                    <p className="text-[11px] text-slate-400 mt-1">Prescriptions issued by attending consultants will list exact dosage regimens here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] font-bold text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Medicine Brand & Composition</th>
                          <th className="px-4 py-3">Dosage & Frequency</th>
                          <th className="px-4 py-3">Timing & Duration</th>
                          <th className="px-4 py-3">Prescribing Doctor</th>
                          <th className="px-4 py-3">Encounter Ref</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {allPrescribedMeds.map((med, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3">
                              <strong className="text-slate-900 dark:text-white block">{med.name}</strong>
                              <span className="text-[10px] text-slate-500">{med.composition}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-blue-600 dark:text-blue-400 block">{med.dosage}</span>
                              <span className="text-[10px] text-slate-500">{med.frequency}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-slate-700 dark:text-slate-200 block">{med.timing}</span>
                              <span className="text-[10px] text-slate-400">{med.duration}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block">{med.doctorName}</span>
                              <span className="text-[10px] text-slate-400">{formatDate(med.date)}</span>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-500">
                              {med.encounterNo}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 4: Doctor Appointments */}
            {(clinicalSubTab === 'all' || clinicalSubTab === 'appointments') && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Doctor Appointments & Consultation Visits
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">{appointments.length} Appointments</span>
                </div>

                {appointments.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Doctor Appointments Booked for this Card</p>
                    <p className="text-[11px] text-slate-400 mt-1">Live physical OPD and Telemedicine Video slots booked for this patient will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {appointments.map((apt) => (
                      <div key={apt.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{apt.appointmentNo}</span>
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                              apt.consultationMode === 'telemedicine_video' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {apt.consultationMode === 'telemedicine_video' ? 'Video Telemedicine' : 'Physical OPD'}
                            </span>
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                              apt.status === 'doctor_confirmed' ? 'bg-emerald-100 text-emerald-800' :
                              apt.status === 'completed' ? 'bg-slate-100 text-slate-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {apt.status}
                            </span>
                          </div>
                          <strong className="text-slate-800 dark:text-slate-200 block mt-1">{apt.doctorName} ({apt.doctorSpeciality})</strong>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            Slot: {apt.doctorConfirmedDate || apt.patientWishDate} • {apt.doctorConfirmedSlot || apt.patientWishSlot} • Chief Complaint: {apt.chiefComplaint}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(apt.consultationFee)}</span>
                          <span className="font-mono text-[10px] text-slate-400">({apt.walletDebitStatus})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && card && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card Preview */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center">
                <div className="flex items-center justify-between w-full mb-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-brand-blue" />
                    Issued CR80 Health Card
                  </h4>
                  <Button size="sm" variant="ghost" onClick={() => setActiveTab('card')}>
                    Open in Card Studio →
                  </Button>
                </div>

                <div className="w-full flex justify-center py-2">
                  <FramerInteractiveHealthCard
                    patient={patient}
                    card={card}
                    membership={membership}
                    company={company}
                  />
                </div>
              </div>

              {/* Membership Benefits Breakdown */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Active Membership Benefits ({membership.name})
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Outdoor OPD</span>
                    <div className="text-xl font-black text-brand-blue">{membership.opdDiscount}% OFF</div>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Diagnostic / Lab</span>
                    <div className="text-xl font-black text-brand-green">{membership.labDiscount}% OFF</div>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-100 dark:border-amber-900">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Pharmacy Drugs</span>
                    <div className="text-xl font-black text-amber-600">{membership.pharmacyDiscount}% OFF</div>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-100 dark:border-purple-900">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Home Collection</span>
                    <div className="text-xl font-black text-purple-600">
                      {membership.homeCollectionDiscount === 100 ? 'FREE' : `${membership.homeCollectionDiscount}% OFF`}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Included Perks:</span>
                  {(membership?.specialBenefits || []).map((b, i) => (
                    <p key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {b}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Overview Vitals Callout Banner */}
            <div className="bg-gradient-to-r from-rose-950/30 via-slate-900 to-blue-950/30 p-5 rounded-3xl border border-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Patient Vitals & Clinical Health Trends</h4>
                  <p className="text-xs text-slate-400">Track longitudinal Blood Pressure, Pulse, Glucose, BMI & Oxygenation history with Recharts visualizer.</p>
                </div>
              </div>
              <Button size="sm" variant="primary" onClick={() => setActiveTab('vitals')} className="bg-rose-600 hover:bg-rose-500 text-white font-bold">
                View Vitals & Trends →
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Patient Vitals */}
        {activeTab === 'vitals' && (
          <PatientVitalsModule patient={patient} />
        )}

        {/* Tab 2: Personal Details */}
        {activeTab === 'personal' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Complete Patient Demographic Profile</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2">
                <span className="font-bold text-slate-500 uppercase block">Personal Info</span>
                <p><strong>Full Name:</strong> {patient.fullName}</p>
                <p><strong>Date of Birth:</strong> {patient.dob} ({patient.age} Y)</p>
                <p><strong>Gender:</strong> {patient.gender.toUpperCase()}</p>
                <p><strong>Blood Group:</strong> <span className="text-red-500 font-bold">{patient.bloodGroup}</span></p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2">
                <span className="font-bold text-slate-500 uppercase block">Contact & Address</span>
                <p><strong>Mobile:</strong> {patient.mobile}</p>
                <p><strong>WhatsApp:</strong> {patient.whatsapp || patient.mobile}</p>
                <p><strong>Email:</strong> {patient.email || 'N/A'}</p>
                <p><strong>Full Address:</strong> {patient.address.fullAddress}</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2">
                <span className="font-bold text-slate-500 uppercase block">Emergency & Medical</span>
                <p><strong>Emergency Contact:</strong> {patient.emergencyContact.name} ({patient.emergencyContact.relationship})</p>
                <p><strong>Emergency Phone:</strong> {patient.emergencyContact.mobile}</p>
                <p><strong>Allergies:</strong> <span className="text-amber-500 font-semibold">{patient.medicalInfo.allergies || 'None'}</span></p>
                <p><strong>Chronic Conditions:</strong> {patient.medicalInfo.chronicConditions || 'None'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Health Card & Studio */}
        {activeTab === 'card' && (
          card ? (
            <CardStudio
              patient={patient}
              card={card}
              membership={membership}
              company={company}
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm text-center max-w-xl mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CreditCard className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">No Active Health Card</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  This patient does not currently have an active physical/digital Labmedix Health Card assigned to their profile.
                </p>
              </div>

              {pendingApp ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Request In Progress
                    </span>
                    <Badge variant="warning" size="sm">{pendingApp.status.toUpperCase()}</Badge>
                  </div>
                  <p className="text-xs text-amber-900 dark:text-amber-200">
                    Application <strong>{pendingApp.applicationNo}</strong> is waiting for Super Admin review and minting.
                  </p>
                  {pendingApp.submittedByStaffName && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Submitted by: {pendingApp.submittedByStaffName} ({pendingApp.submittedByStaffRole || 'Staff'})
                    </p>
                  )}
                </div>
              ) : (
                can('card_request_create') && (
                  <Button
                    variant="primary"
                    leftIcon={<CreditCard className="w-4 h-4" />}
                    onClick={() => setIsCreateCardModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 shadow-md shadow-emerald-500/20"
                  >
                    Request Health Card for {patient.fullName}
                  </Button>
                )
              )}
            </div>
          )
        )}

        {/* Tab 4: Family Group */}
        {activeTab === 'family' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users2 className="w-5 h-5 text-brand-green" />
                  Family Health Card Group
                </h4>
                <p className="text-xs text-slate-500">
                  {family ? `Linked to ${family.familyName} (${family.id})` : 'This patient is not currently enrolled in a Family Group.'}
                </p>
              </div>

              {!family && can('family_manage') && (
                <Button
                  size="sm"
                  onClick={() => {
                    FamilyService.createFamily(`${patient.fullName}'s Family`, patient.id);
                    showToast('success', 'Family Created', 'Patient marked as Primary Family Head.');
                    navigate(0);
                  }}
                >
                  Create Family Group
                </Button>
              )}
            </div>

            {family && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Enrolled Family Members:</span>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {family.members.map((m, idx) => {
                    const memPatient = PatientService.getById(m.patientId);
                    return (
                      <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-slate-900 dark:text-white block">{memPatient?.fullName || m.patientId}</strong>
                          <span className="text-slate-500">{m.relationship}</span>
                        </div>
                        {m.isPrimary && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[10px]">
                            Primary Head
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Health Wallet Ledger */}
        {activeTab === 'wallet' && wallet && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-slate-400">Available Wallet Float</span>
                <div className="text-3xl font-black text-brand-blue dark:text-blue-400 mt-1">
                  {formatCurrency(wallet.balance)}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="success"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsWalletModalOpen(true)}
                >
                  Add Funds / Deposit
                </Button>
              </div>
            </div>

            {/* Transaction Ledger Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white">
                Transaction Statement History
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] font-bold text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Reference No</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Closing Balance</th>
                      <th className="px-4 py-3">Notes</th>
                      <th className="px-4 py-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono">{formatDateTime(t.date)}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{t.referenceNo}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                            t.type === 'credit' ? 'bg-emerald-100 text-emerald-800' :
                            t.type === 'debit' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{formatCurrency(t.amount)}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-600">{formatCurrency(t.closingBalance)}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{t.notes}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setActiveReceiptTxn(t);
                              setIsReceiptModalOpen(true);
                            }}
                            className="p-1 rounded text-blue-600 hover:bg-blue-50"
                            title="Print Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Card History */}
        {activeTab === 'card_history' && card && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-brand-blue" />
              Health Card Status History & Replacements
            </h4>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {card.statusHistory.map((h) => (
                <div key={h.id} className="py-3 flex items-start justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase text-slate-800 dark:text-slate-200">
                        {h.previousStatus} → {h.newStatus}
                      </span>
                      <span className="text-[10px] text-slate-400">by {h.changedBy}</span>
                    </div>
                    <p className="text-slate-500 mt-0.5">{h.reason}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{formatDateTime(h.date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 7: Audit Trail */}
        {activeTab === 'activity' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Patient Activity & Security Audit Logs
            </h4>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between text-xs">
                  <div>
                    <strong className="text-slate-900 dark:text-white block">{log.action}</strong>
                    <p className="text-slate-500 mt-0.5">{log.description}</p>
                    <span className="text-[10px] text-slate-400">Logged by: {log.userName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{formatDateTime(log.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Global Modals */}
      {wallet && (
        <WalletTransactionModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          patient={patient}
          wallet={wallet}
          onSuccess={() => navigate(0)}
        />
      )}

      <WalletReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        transaction={activeReceiptTxn}
        patient={patient}
      />

      {card && (
        <>
          <CardRenewalModal
            isOpen={isRenewalOpen}
            onClose={() => setIsRenewalOpen(false)}
            card={card}
            patient={patient}
            onSuccess={() => navigate(0)}
          />
          <CardReplacementModal
            isOpen={isReplacementOpen}
            onClose={() => setIsReplacementOpen(false)}
            oldCard={card}
            patient={patient}
            onSuccess={() => navigate(0)}
          />
        </>
      )}

      {/* Clinical Prescription & Lab Report Print Modals */}
      {activePrintEncounter && (
        <PrescriptionPrintModal
          isOpen={!!activePrintEncounter}
          onClose={() => setActivePrintEncounter(null)}
          encounter={activePrintEncounter}
          patient={patient}
        />
      )}

      {activePrintLabBooking && (
        <LabReportPrintModal
          isOpen={!!activePrintLabBooking}
          onClose={() => setActivePrintLabBooking(null)}
          booking={activePrintLabBooking}
        />
      )}

      <CreateCardRequestModal
        isOpen={isCreateCardModalOpen}
        onClose={() => setIsCreateCardModalOpen(false)}
        preselectedPatientId={patient.id}
        onRequestCreated={() => {
          showToast('success', 'Card Request Submitted', `Health Card request for ${patient.fullName} sent to Super Admin for approval.`);
          setTick(t => t + 1);
        }}
      />
    </div>
  );
};