import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PatientService } from '../../services/patientService';
import { CardService } from '../../services/cardService';
import { StorageService } from '../../services/storage';
import { WalletService } from '../../services/walletService';
import { EMRService } from '../../services/emrService';
import { Patient, PatientAppointment, ClinicalEncounter, Membership } from '../../types';
import { PortalService, BloodTestBooking, MedicineOrder, PatientReceiptData, BloodTestBookingItem } from '../../services/portalService';
import { AuditService } from '../../services/auditService';
import { CardholderAuthService, CARDHOLDER_SESSION_KEY } from '../../services/cardholderAuthService';
import { CR80CardFront } from '../../components/card/CR80CardFront';
import { CR80CardBack } from '../../components/card/CR80CardBack';
import { FramerInteractiveHealthCard } from '../../components/card/FramerInteractiveHealthCard';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { LabMedixLogo } from '../../components/common/LabMedixLogo';
import { PrescriptionPrintModal } from '../../components/emr/PrescriptionPrintModal';
import { LabReportPrintModal } from '../../components/emr/LabReportPrintModal';
import { TelemedicineVideoModal } from '../../components/emr/TelemedicineVideoModal';
import { PatientReceiptModal } from '../../components/portal/PatientReceiptModal';
import { PatientRealMoneyTopUpModal } from '../../components/portal/PatientRealMoneyTopUpModal';
import { PatientCardApplicationModal } from '../../components/portal/PatientCardApplicationModal';
import { ApplicationStatusTrackModal } from '../../components/portal/ApplicationStatusTrackModal';
import { Portal3DLoginScreen } from '../../components/portal/Portal3DLoginScreen';
import { DirectLabAndPackageBookingModal } from '../../components/portal/DirectLabAndPackageBookingModal';
import { DirectMedicineOrderModal } from '../../components/portal/DirectMedicineOrderModal';
import { CatalogService } from '../../services/catalogService';
import { FamilyService } from '../../services/familyService';
import { PatientRecordPdfService } from '../../services/patientRecordPdfService';
import { useToast } from '../../context/ToastContext';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import { ExportService } from '../../services/exportService';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';

import {
  UserCircle,
  CreditCard,
  Wallet,
  RotateCw,
  Download,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Heart,
  LogOut,
  CalendarCheck,
  Calendar,
  Stethoscope,
  TestTube,
  Pill,
  FileText,
  Receipt,
  Plus,
  Video,
  Clock,
  MapPin,
  Truck,
  CheckCircle2,
  AlertCircle,
  Phone,
  PhoneCall,
  Search,
  Sparkles,
  QrCode,
  Printer,
  Share2,
  KeyRound,
  Mail,
  Smartphone,
  Check,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  CheckSquare,
  Square,
  Activity,
  BellRing,
  Gift,
  Zap,
  FileSpreadsheet,
  Filter,
  Lock,
  TrendingUp,
  TrendingDown,
  Globe,
  Home,
  RefreshCw,
  Fingerprint,
  Eye,
  EyeOff,
  Users2,
  UserPlus,
  Radio,
  Wifi
} from 'lucide-react';

export const PatientPortalPage: React.FC = () => {
  const { showToast } = useToast();
  const patients = PatientService.getAll();
  const company = StorageService.getCompanyProfile();

  // Authentication State: Securely restored from session storage
  const [authenticatedPatient, setAuthenticatedPatient] = useState<any>(() => {
    return CardholderAuthService.getAuthenticatedPatient();
  });

  // Strict Cardholder Login Credentials (Card Number + CVV + Anti-Bot Captcha)
  const [loginId, setLoginId] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [userCaptcha, setUserCaptcha] = useState('');
  const [captchaNum1, setCaptchaNum1] = useState(13);
  const [captchaNum2, setCaptchaNum2] = useState(6);
  const [captchaError, setCaptchaError] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
    const [error, setError] = useState('');

  // Active Navigation Tab: 7 comprehensive patient suites
  const [activeTab, setActiveTab] = useState<'wallet_card' | 'family_shield' | 'appointments' | 'lab_tests' | 'pharmacy' | 'prescriptions' | 'receipts_history'>('wallet_card');

  // Modals States
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(1000);

  // Family Shield Modal & State
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
  const [newFamilyMemberName, setNewFamilyMemberName] = useState('');
  const [newFamilyMemberRel, setNewFamilyMemberRel] = useState('Spouse');
  const [newFamilyMemberAge, setNewFamilyMemberAge] = useState('');
  const [newFamilyMemberGender, setNewFamilyMemberGender] = useState<'male' | 'female' | 'other'>('female');
  const [newFamilyMemberBlood, setNewFamilyMemberBlood] = useState('B+');
  const [newFamilyMemberPhone, setNewFamilyMemberPhone] = useState('');

  // Wallet Statement Filter & Search
  const [walletFilterType, setWalletFilterType] = useState<'all' | 'credit' | 'debit' | 'refund'>('all');
  const [walletSearchTerm, setWalletSearchTerm] = useState('');

  const [showBookAppointmentModal, setShowBookAppointmentModal] = useState(false);
  const [showBookLabModal, setShowBookLabModal] = useState(false);
  const [showOrderMedicineModal, setShowOrderMedicineModal] = useState(false);
  const [showApplyCardModal, setShowApplyCardModal] = useState(false);
  const [showTrackStatusModal, setShowTrackStatusModal] = useState(false);

  // Active Print / View Modals
  const [activePrescriptionToPrint, setActivePrescriptionToPrint] = useState<ClinicalEncounter | null>(null);
  const [activeLabReportToPrint, setActiveLabReportToPrint] = useState<BloodTestBooking | null>(null);
  const [activeTelemedRoom, setActiveTelemedRoom] = useState<PatientAppointment | null>(null);
  const [activeReceiptToPrint, setActiveReceiptToPrint] = useState<PatientReceiptData | null>(null);

  // Search & Filter in History Tab
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyServiceFilter, setHistoryServiceFilter] = useState<'all' | 'Consultation' | 'Pathology' | 'Pharmacy' | 'Wallet Recharge'>('all');

  // Appointment Form State
  const [selectedDoctor, setSelectedDoctor] = useState({
    name: 'Dr. Subhashish Roy',
    speciality: 'Consultant Cardiologist & Medical Director',
    department: 'Cardiology OPD',
    fee: 800
  });
  const [aptMode, setAptMode] = useState<'physical_opd' | 'telemedicine_video'>('physical_opd');
  const [aptDate, setAptDate] = useState(() => new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10));
  const [aptSlot, setAptSlot] = useState('Morning OPD (09:00 AM - 01:00 PM)');
  const [aptTime, setAptTime] = useState('10:30 AM');
  const [aptComplaint, setAptComplaint] = useState('Chest heaviness and routine blood pressure check');

  // Multi-Test Checkbox Selection State for Lab Booking
  const [selectedTestsForBooking, setSelectedTestsForBooking] = useState<Array<{
    testName: string;
    category: string;
    grossPrice: number;
    fastingRequired: boolean;
    isChecked: boolean;
  }>>([]);
  const [labCollectionMode, setLabCollectionMode] = useState<'home_collection' | 'lab_visit'>('home_collection');
  const [labDate, setLabDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [labTime, setLabTime] = useState('07:30 AM (Fasting)');

  // Medicine Order Form State
  const [medicineCart, setMedicineCart] = useState<Array<{ name: string; composition: string; qty: number; unitPrice: number }>>([
    { name: 'Tab. Telma-AM 40/5', composition: 'Telmisartan 40mg + Amlodipine 5mg', qty: 30, unitPrice: 12.5 },
    { name: 'Tab. Pan-D 40/30', composition: 'Pantoprazole + Domperidone', qty: 15, unitPrice: 11.0 }
  ]);
  const [deliveryMode, setDeliveryMode] = useState<'express_home_delivery' | 'counter_pickup'>('express_home_delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('Flat 4B, Salt Lake Sector 2, Kolkata 700091');

  // Current Patient Data & Linked Records
  const patientCard = useMemo(() => {
    if (!authenticatedPatient) return null;
    return CardService.getById(authenticatedPatient.healthCardId || '') || StorageService.getCards().find(c => c.patientId === authenticatedPatient.id);
  }, [authenticatedPatient]);

  const membership = useMemo(() => {
    const defaultTier: Membership = {
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
    try {
      const memberships = (StorageService.getMemberships() || []).filter(Boolean);
      if (!memberships || memberships.length === 0) return defaultTier;
      if (!patientCard) return memberships[0] || defaultTier;
      return memberships.find(m => m && m.id === patientCard.membershipId) || memberships[0] || defaultTier;
    } catch {
      return defaultTier;
    }
  }, [patientCard]);

  const wallet = useMemo(() => {
    if (!authenticatedPatient) return null;
    return WalletService.getByPatientId(authenticatedPatient.id);
  }, [authenticatedPatient, showTopUpModal, showBookAppointmentModal, showBookLabModal, showOrderMedicineModal]);

  const appointments = useMemo(() => {
    if (!authenticatedPatient) return [];
    return EMRService.getAllAppointments().filter(a => a.patientId === authenticatedPatient.id);
  }, [authenticatedPatient, showBookAppointmentModal]);

  const prescriptions = useMemo(() => {
    if (!authenticatedPatient) return [];
    return EMRService.getAllEncounters().filter(e => e.patientId === authenticatedPatient.id);
  }, [authenticatedPatient]);

  const [dataSyncTick, setDataSyncTick] = useState(0);

  useEffect(() => {
    const handleSync = () => {
      setDataSyncTick(prev => prev + 1);
    };
    window.addEventListener('labmedix_data_synced', handleSync as EventListener);
    return () => {
      window.removeEventListener('labmedix_data_synced', handleSync as EventListener);
    };
  }, []);

  const labBookings = useMemo(() => {
    if (!authenticatedPatient) return [];
    return PortalService.getLabBookings(authenticatedPatient.id);
  }, [authenticatedPatient, showBookLabModal, dataSyncTick]);

  const pharmacyOrders = useMemo(() => {
    if (!authenticatedPatient) return [];
    return PortalService.getPharmacyOrders(authenticatedPatient.id);
  }, [authenticatedPatient, showOrderMedicineModal, dataSyncTick]);

  const walletTransactions = useMemo(() => {
    if (!authenticatedPatient) return [];
    return WalletService.getTransactions(authenticatedPatient.id);
  }, [authenticatedPatient, wallet, showTopUpModal, dataSyncTick]);

  const filteredWalletTransactions = useMemo(() => {
    return walletTransactions.filter((t) => {
      const matchType = walletFilterType === 'all' || t.type === walletFilterType;
      const matchSearch =
        !walletSearchTerm ||
        t.referenceNo.toLowerCase().includes(walletSearchTerm.toLowerCase()) ||
        (t.notes && t.notes.toLowerCase().includes(walletSearchTerm.toLowerCase()));
      return matchType && matchSearch;
    });
  }, [walletTransactions, walletFilterType, walletSearchTerm]);

  // Family Shield Group & Covered Members (1 Card Covers Whole Family)
  const familyGroup = useMemo(() => {
    if (!authenticatedPatient) return undefined;
    return FamilyService.getByPatientId(authenticatedPatient.id);
  }, [authenticatedPatient, showAddFamilyModal]);

  const familyMembers = useMemo(() => {
    if (!familyGroup) return [];
    const allPatients = StorageService.getPatients();
    return familyGroup.members.map(m => {
      const p = allPatients.find(pat => pat.id === m.patientId);
      return {
        ...m,
        patientData: p
      };
    }).filter((m): m is typeof m & { patientData: Patient } => !!m.patientData);
  }, [familyGroup]);

  // Add Dependent Family Member to Card
  const handleAddDependent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticatedPatient || !newFamilyMemberName.trim()) return;

    let targetFamilyId = familyGroup?.id;
    if (!targetFamilyId) {
      const newFam = FamilyService.createFamily(authenticatedPatient.id, `${authenticatedPatient.fullName}'s Family Shield`);
      targetFamilyId = newFam.id;
    }

    FamilyService.registerAndLinkDependent(targetFamilyId, {
      fullName: newFamilyMemberName.trim(),
      relationship: newFamilyMemberRel,
      age: parseInt(newFamilyMemberAge) || 28,
      gender: newFamilyMemberGender,
      bloodGroup: newFamilyMemberBlood,
      mobile: newFamilyMemberPhone.trim() || authenticatedPatient.mobile
    });

    setShowAddFamilyModal(false);
    setNewFamilyMemberName('');
    setNewFamilyMemberAge('');
    setNewFamilyMemberPhone('');
    triggerCelebrationFireworks();
    showToast('success', 'Family Member Linked! 👨‍👩‍👧‍👦', `${newFamilyMemberName} is now 100% covered under your LABMEDIX Health Card.`);
  };

  // Doctor Prescribed Lab Tests (Unbooked / Pending Orders)
  const prescribedLabTests = useMemo(() => {
    if (!prescriptions.length) return [];
    const unbooked: Array<{
      testName: string;
      category: string;
      estimatedCost: number;
      prescribedBy: string;
      date: string;
      encounterNo: string;
    }> = [];

    prescriptions.forEach((enc) => {
      enc.labOrders.forEach((lo) => {
        const isAlreadyBooked = labBookings.some(
          (b) => b.testName.toLowerCase().includes(lo.testName.toLowerCase()) || lo.testName.toLowerCase().includes(b.testName.toLowerCase())
        );
        if (!isAlreadyBooked) {
          unbooked.push({
            testName: lo.testName,
            category: lo.category,
            estimatedCost: lo.estimatedCost || 1200,
            prescribedBy: enc.doctorName,
            date: enc.date,
            encounterNo: enc.encounterNo
          });
        }
      });
    });

    return unbooked;
  }, [prescriptions, labBookings]);

  // Summary Totals for Doctor Prescribed Alert
  const totalGrossAlert = useMemo(() => {
    return prescribedLabTests.reduce((sum, t) => sum + t.estimatedCost, 0);
  }, [prescribedLabTests]);

  const totalDiscountAlert = useMemo(() => {
    return (totalGrossAlert * (membership.labDiscount || 25)) / 100;
  }, [totalGrossAlert, membership.labDiscount]);

  const totalNetAlert = useMemo(() => {
    return totalGrossAlert - totalDiscountAlert;
  }, [totalGrossAlert, totalDiscountAlert]);

  // Initialize Tests for Booking Modal
  const handleOpenLabBookingModal = () => {
    if (prescribedLabTests.length > 0) {
      setSelectedTestsForBooking(
        prescribedLabTests.map(t => ({
          testName: t.testName,
          category: t.category,
          grossPrice: t.estimatedCost,
          fastingRequired: t.testName.toLowerCase().includes('lipid') || t.testName.toLowerCase().includes('glucose') || t.testName.toLowerCase().includes('thyroid') || t.testName.toLowerCase().includes('lft'),
          isChecked: true // BY DEFAULT ALL DOCTOR PRESCRIBED TESTS CHECKED ON
        }))
      );
    } else {
      setSelectedTestsForBooking([
        { testName: 'Comprehensive Lipid Profile (Cholesterol, HDL, LDL, Triglycerides)', category: 'Biochemistry / Pathology', grossPrice: 1200, fastingRequired: true, isChecked: true },
        { testName: 'Complete Blood Count (CBC) with ESR & Platelets', category: 'Hematology', grossPrice: 650, fastingRequired: false, isChecked: true },
        { testName: 'HbA1c Glycated Hemoglobin (3-Month Diabetes Profile)', category: 'Diabetes Care', grossPrice: 750, fastingRequired: false, isChecked: true },
        { testName: 'Thyroid Profile Total (T3, T4, TSH)', category: 'Endocrinology', grossPrice: 900, fastingRequired: true, isChecked: false },
        { testName: 'Liver Function Test (LFT Profile)', category: 'Hepatic Care', grossPrice: 950, fastingRequired: true, isChecked: false }
      ]);
    }
    setShowBookLabModal(true);
  };

  // Real-time Selected Lab Tests Calculation
  const activeSelectedTests = useMemo(() => {
    return selectedTestsForBooking.filter(t => t.isChecked);
  }, [selectedTestsForBooking]);

  const selectedGrossTotal = useMemo(() => {
    return activeSelectedTests.reduce((sum, t) => sum + t.grossPrice, 0);
  }, [activeSelectedTests]);

  const selectedDiscountAmount = useMemo(() => {
    return (selectedGrossTotal * (membership.labDiscount || 25)) / 100;
  }, [selectedGrossTotal, membership.labDiscount]);

  const selectedNetTotal = useMemo(() => {
    return selectedGrossTotal - selectedDiscountAmount;
  }, [selectedGrossTotal, selectedDiscountAmount]);

  // Unified Billing & Receipts History
  const receiptsList: PatientReceiptData[] = useMemo(() => {
    if (!authenticatedPatient) return [];
    const list: PatientReceiptData[] = [];

    // Add Appointments
    appointments.forEach((apt) => {
      const discountPct = Math.min(99, membership?.opdDiscount || 25);
      const discountFactor = 1 - discountPct / 100;
      const gross = discountFactor > 0 ? apt.consultationFee / discountFactor : apt.consultationFee;
      const discountAmt = gross - apt.consultationFee;

      list.push({
        id: `rcp_apt_${apt.id}`,
        receiptNo: `REC-APT-${apt.appointmentNo.replace('APT-', '')}`,
        patientId: apt.patientId,
        patientName: apt.patientName,
        cardNo: patientCard?.cardNumber || 'N/A',
        cardTier: membership?.name || 'Standard Tier',
        serviceType: 'Consultation',
        serviceDescription: `${apt.consultationMode === 'telemedicine_video' ? 'Telemedicine Video Consultation' : 'Physical OPD Consultation'} with ${apt.doctorName} (${apt.department})`,
        grossAmount: gross,
        discountAmount: discountAmt,
        discountPercentage: discountPct,
        netAmount: apt.consultationFee,
        paymentMethod: 'Health Wallet (Prepaid Cashless)',
        walletClosingBalance: wallet?.balance || 0,
        date: apt.patientWishDate || new Date().toISOString(),
        status: 'Completed',
        referenceNo: apt.appointmentNo
      });
    });

    // Add Lab Bookings
    labBookings.forEach((lab) => {
      list.push({
        id: `rcp_lab_${lab.id}`,
        receiptNo: `REC-${lab.bookingNo}`,
        patientId: lab.patientId,
        patientName: lab.patientName,
        cardNo: patientCard?.cardNumber,
        cardTier: membership?.name || 'Standard Tier',
        serviceType: 'Pathology',
        serviceDescription: `Pathology Lab Investigation: ${lab.testName} (${lab.collectionType === 'home_collection' ? 'Home Sample Collection' : 'Lab Visit'})`,
        items: lab.items ? lab.items.map(i => ({ name: i.testName, price: i.netPrice })) : undefined,
        grossAmount: lab.grossPrice,
        discountAmount: lab.discountAmount,
        discountPercentage: lab.discountPercentage,
        netAmount: lab.netPrice,
        paymentMethod: 'Health Wallet (Prepaid Cashless)',
        walletClosingBalance: wallet?.balance,
        date: lab.createdAt,
        status: 'Completed',
        referenceNo: lab.bookingNo
      });
    });

    // Add Pharmacy Orders
    pharmacyOrders.forEach((order) => {
      list.push({
        id: `rcp_phm_${order.id}`,
        receiptNo: `REC-${order.orderNo}`,
        patientId: order.patientId,
        patientName: order.patientName,
        cardNo: patientCard?.cardNumber,
        cardTier: membership?.name || 'Standard Tier',
        serviceType: 'Pharmacy',
        serviceDescription: `e-Pharmacy Medicine Order (${order.items.length} Medicines Delivered via ${order.deliveryMode === 'express_home_delivery' ? 'Express Home Delivery' : 'Counter Pickup'})`,
        items: order.items.map(i => ({ name: i.medicineName, qty: i.quantity, price: i.totalPrice })),
        grossAmount: order.grossTotal,
        discountAmount: order.discountAmount,
        discountPercentage: order.discountPercentage,
        netAmount: order.netTotal,
        paymentMethod: 'Health Wallet (Prepaid Cashless)',
        walletClosingBalance: wallet?.balance,
        date: order.createdAt,
        status: 'Completed',
        referenceNo: order.orderNo
      });
    });

    // Add Wallet Recharges
    walletTransactions.filter(t => t.type === 'credit').forEach((t) => {
      list.push({
        id: `rcp_wal_${t.id}`,
        receiptNo: `REC-WAL-${t.referenceNo}`,
        patientId: t.patientId,
        patientName: authenticatedPatient.fullName,
        cardNo: patientCard?.cardNumber,
        cardTier: membership?.name || 'Standard Tier',
        serviceType: 'Wallet Recharge',
        serviceDescription: `Prepaid Health Wallet Recharge via UPI / Digital Gateway (${t.notes || 'Recharge Credit'})`,
        grossAmount: t.amount,
        discountAmount: 0,
        netAmount: t.amount,
        paymentMethod: 'UPI',
        walletClosingBalance: t.closingBalance,
        date: t.date,
        status: 'Completed',
        referenceNo: t.referenceNo
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments, labBookings, pharmacyOrders, walletTransactions, authenticatedPatient, patientCard, membership, wallet]);

  // Filtered History
  const filteredReceipts = useMemo(() => {
    return receiptsList.filter((r) => {
      const matchSearch =
        r.receiptNo.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
        r.serviceDescription.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
        (r.referenceNo && r.referenceNo.toLowerCase().includes(historySearchTerm.toLowerCase()));

      const matchService = historyServiceFilter === 'all' || r.serviceType === historyServiceFilter;
      return matchSearch && matchService;
    });
  }, [receiptsList, historySearchTerm, historyServiceFilter]);

  const refreshCaptcha = () => {
    const n1 = Math.floor(5 + Math.random() * 15);
    const n2 = Math.floor(2 + Math.random() * 9);
    setCaptchaNum1(n1);
    setCaptchaNum2(n2);
    setUserCaptcha('');
    setCaptchaError(false);
  };

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Card Number change check
  const handleCardNumberChange = (val: string) => {
    setLoginId(val);
    setError('');
    const status = CardholderAuthService.isCardLocked(val);
    if (status.locked) {
      setLockoutSeconds(status.remainingSeconds);
      setError(`Security Lockout: Card locked for ${status.remainingSeconds}s due to consecutive failed attempts.`);
    } else {
      setLockoutSeconds(0);
    }
  };

  // Handle Strict Cardholder Authentication: Card No + CVV + Anti-Bot Captcha
  const handleCardholderLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCaptchaError(false);

    if (lockoutSeconds > 0) return;

    setIsLoggingIn(true);
    const expected = captchaNum1 + captchaNum2;

    try {
      const res = await CardholderAuthService.authenticateAsync(loginId, portalPassword, userCaptcha, String(expected));
      setIsLoggingIn(false);

      if (!res.success) {
        if (res.isLocked && res.remainingSeconds) {
          setLockoutSeconds(res.remainingSeconds);
        }
        if (res.error?.includes('Captcha')) {
          setCaptchaError(true);
        }
        setError(res.error || 'Authentication failed. Please verify Card Number and CVV.');
        refreshCaptcha();
        return;
      }

      if (res.patient) {
        setAuthenticatedPatient(res.patient);
        setError('');
        triggerCelebrationFireworks();
        showToast('success', `Welcome, ${res.patient.fullName}`, 'Cardholder authenticated with verified CVV.');
      }
    } catch (err) {
      console.error('Cardholder portal login error:', err);
      setIsLoggingIn(false);
      setError('An error occurred during authentication.');
    }
  };

  // Secure Sign Out
  const handleLogout = () => {
    CardholderAuthService.logout();
    setAuthenticatedPatient(null);
    setLoginId('');
    setPortalPassword('');
    setUserCaptcha('');
    setError('');
    refreshCaptcha();
    showToast('info', 'Signed Out', 'Your patient self-service portal session has been safely closed.');
  };

  // Handle Full Medical Record PDF Download
  const handleDownloadFullMedicalRecord = async () => {
    if (!authenticatedPatient) return;
    try {
      showToast('info', 'Compiling Medical Record', `Exporting verified medical record summary for ${authenticatedPatient.fullName}...`);
      await PatientRecordPdfService.generateFullRecordPdf(authenticatedPatient.id);
      showToast('success', 'Medical Record Downloaded', 'Official patient health record PDF generated.');
    } catch (err: any) {
      showToast('error', 'Download Failed', err?.message || 'Could not compile medical record.');
    }
  };

  // Handle Digital Card PDF Download
  const handleDownloadDigitalCard = async () => {
    const frontEl = document.getElementById('portal-card-front');
    const backEl = document.getElementById('portal-card-back');
    if (!frontEl) return;
    try {
      showToast('info', 'Rendering Card', 'Compiling CR80 High-Res Digital Health Card PDF...');
      await ExportService.exportCardToPdf(frontEl, backEl, `${authenticatedPatient.fullName}_CR80_HEALTH_CARD.pdf`);
      triggerCelebrationFireworks();
      showToast('success', 'Health Card Downloaded', 'Saved official digital CR80 card.');
    } catch {
      showToast('error', 'Export Error', 'Could not export card PDF.');
    }
  };

  // Handle Wallet Top-Up Open Action
  const handleOpenTopUp = (amount: number = 1000) => {
    setTopUpAmount(amount);
    setShowTopUpModal(true);
  };

  // Export Wallet Statement as CSV
  const handleExportWalletStatement = () => {
    if (!walletTransactions.length) {
      showToast('info', 'No Transactions', 'No transaction history to export.');
      return;
    }
    const headers = ['Date', 'Reference No', 'Type', 'Amount (INR)', 'Opening Balance', 'Closing Balance', 'Notes'];
    const rows = walletTransactions.map((t) => [
      `"${formatDateTime(t.date)}"`,
      `"${t.referenceNo}"`,
      `"${t.type.toUpperCase()}"`,
      `"${t.amount}"`,
      `"${t.openingBalance}"`,
      `"${t.closingBalance}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${authenticatedPatient.fullName.replace(/\s+/g, '_')}_Wallet_Statement.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Statement Exported', 'Wallet transaction ledger CSV downloaded.');
  };

  // Handle Book Doctor Appointment
  const handleConfirmAppointment = () => {
    if (!authenticatedPatient) return;
    const opdDiscount = membership.opdDiscount || 25;
    const grossFee = selectedDoctor.fee;
    const discountAmt = (grossFee * opdDiscount) / 100;
    const netFee = grossFee - discountAmt;

    // Check wallet balance
    if ((wallet?.balance || 0) < netFee) {
      showToast('error', 'Insufficient Wallet Balance', `Your wallet balance is ${formatCurrency(wallet?.balance || 0)}. Required: ${formatCurrency(netFee)}. Please recharge your wallet first.`);
      setShowTopUpModal(true);
      return;
    }

    // Debit Wallet
    WalletService.addTransaction(
      authenticatedPatient.id,
      'debit',
      netFee,
      `Prepaid OPD Consultation Fee: ${selectedDoctor.name} (${selectedDoctor.department})`,
      {
        grossAmount: grossFee,
        discountAmount: discountAmt,
        discountPercentage: opdDiscount
      }
    );

    let targetDoctorId = 'usr_doctor_roy';
    if (selectedDoctor?.name?.includes('Anita') || selectedDoctor?.name?.includes('Sen')) {
      targetDoctorId = 'usr_doctor_sen';
    } else if (selectedDoctor?.name?.includes('Pritam') || selectedDoctor?.name?.includes('Das')) {
      targetDoctorId = 'usr_doctor_das';
    } else if (selectedDoctor?.name?.includes('Kaushik') || selectedDoctor?.name?.includes('Chatterjee')) {
      targetDoctorId = 'usr_doctor_chatterjee';
    }

    // Save Appointment in EMRService
    const savedApt = EMRService.saveAppointment({
      patientId: authenticatedPatient.id,
      patientName: authenticatedPatient.fullName,
      patientPhone: authenticatedPatient.mobile || '9830012345',
      cardTier: membership?.name || 'Standard Tier',
      cardTierColor: membership?.color || '#10B981',
      doctorId: targetDoctorId,
      doctorName: selectedDoctor?.name || 'Consultant Doctor',
      doctorSpeciality: selectedDoctor?.speciality || 'General Medicine',
      department: selectedDoctor?.department || 'OPD',
      consultationMode: aptMode,
      patientWishDate: aptDate,
      patientWishSlot: aptSlot,
      patientWishTime: aptTime,
      chiefComplaint: aptComplaint,
      consultationFee: netFee,
      walletDebitStatus: 'paid'
    });

    setShowBookAppointmentModal(false);
    triggerCelebrationFireworks();
    showToast('success', 'Appointment Booked!', `Scheduled with ${selectedDoctor?.name || 'Doctor'} for ${formatDate(aptDate)} (${aptSlot}).`);

    // Open receipt
    setActiveReceiptToPrint({
      id: `rcp_apt_${savedApt.id}`,
      receiptNo: `REC-${savedApt.appointmentNo}`,
      patientId: savedApt.patientId,
      patientName: savedApt.patientName,
      cardNo: patientCard?.cardNumber,
      cardTier: membership?.name || 'Standard Tier',
      serviceType: 'Consultation',
      serviceDescription: `${aptMode === 'telemedicine_video' ? 'Telemedicine Video Consultation' : 'Physical OPD Consultation'} with ${selectedDoctor?.name || 'Doctor'} (${selectedDoctor?.department || 'OPD'})`,
      grossAmount: grossFee,
      discountAmount: discountAmt,
      discountPercentage: opdDiscount,
      netAmount: netFee,
      paymentMethod: 'Health Wallet (Prepaid Cashless)',
      walletClosingBalance: (wallet?.balance || 0) - netFee,
      date: new Date().toISOString(),
      status: 'Completed',
      referenceNo: savedApt.appointmentNo
    });
  };

  // Handle Multi-Test Blood Booking with Checkbox Selection
  const handleConfirmMultiLabBooking = () => {
    if (!authenticatedPatient || activeSelectedTests.length === 0) {
      showToast('error', 'No Tests Selected', 'Please check at least 1 blood test to proceed.');
      return;
    }

    if ((wallet?.balance || 0) < selectedNetTotal) {
      showToast('error', 'Insufficient Wallet Balance', `Wallet balance: ${formatCurrency(wallet?.balance || 0)}. Required: ${formatCurrency(selectedNetTotal)}. Please recharge.`);
      setShowTopUpModal(true);
      return;
    }

    const testSummaryName = activeSelectedTests.map(t => t.testName).join(', ');
    const hasFasting = activeSelectedTests.some(t => t.fastingRequired);

    // Debit Wallet
    WalletService.addTransaction(
      authenticatedPatient.id,
      'debit',
      selectedNetTotal,
      `Prepaid Pathology Investigations (${activeSelectedTests.length} Tests): ${testSummaryName.slice(0, 60)}...`,
      {
        grossAmount: selectedGrossTotal,
        discountAmount: selectedDiscountAmount,
        discountPercentage: membership.labDiscount || 25
      }
    );

    // Save Lab Booking
    const savedBooking = PortalService.saveLabBooking({
      patientId: authenticatedPatient.id,
      patientName: authenticatedPatient.fullName,
      testName: activeSelectedTests.length === 1 ? activeSelectedTests[0].testName : `${activeSelectedTests[0].testName} (+${activeSelectedTests.length - 1} more investigations)`,
      category: activeSelectedTests[0].category,
      items: activeSelectedTests.map(t => ({
        testName: t.testName,
        category: t.category,
        grossPrice: t.grossPrice,
        discountAmount: (t.grossPrice * (membership.labDiscount || 25)) / 100,
        netPrice: t.grossPrice * (1 - (membership.labDiscount || 25) / 100),
        fastingRequired: t.fastingRequired
      })),
      collectionType: labCollectionMode,
      scheduledDate: labDate,
      scheduledTime: labTime,
      grossPrice: selectedGrossTotal,
      discountPercentage: membership.labDiscount || 25,
      discountAmount: selectedDiscountAmount,
      netPrice: selectedNetTotal,
      paymentStatus: 'paid_wallet',
      status: 'confirmed',
      fastingRequired: hasFasting,
      assignedPhlebotomist: labCollectionMode === 'home_collection' ? 'Phlebotomist Team A (Central Lab)' : 'Diagnostics Counter #2',
      adminNotificationSent: true
    });

    // Send Real-time Notification to Admin & Phlebotomy Team
    AuditService.log(
      'BLOOD_TEST_BOOKED',
      'patient',
      `🚨 Phlebotomy Dispatch Alert: Patient ${authenticatedPatient.fullName} booked ${activeSelectedTests.length} tests (${labCollectionMode === 'home_collection' ? 'Doorstep Home Collection' : 'Lab Visit'}) for ${formatDate(labDate)} at ${labTime}. Net Paid: ${formatCurrency(selectedNetTotal)}.`,
      savedBooking.bookingNo,
      {
        bookingNo: savedBooking.bookingNo,
        patientName: authenticatedPatient.fullName,
        testsCount: activeSelectedTests.length,
        collectionMode: labCollectionMode,
        scheduledDate: labDate,
        scheduledTime: labTime,
        netAmount: selectedNetTotal
      }
    );

    setShowBookLabModal(false);
    triggerCelebrationFireworks();
    showToast(
      'success',
      'Blood Tests Confirmed & Dispatched!',
      `Booked ${activeSelectedTests.length} tests. Dispatch notification sent to Central Lab / Phlebotomy Team.`
    );

    // Open receipt
    setActiveReceiptToPrint({
      id: `rcp_lab_${savedBooking.id}`,
      receiptNo: `REC-${savedBooking.bookingNo}`,
      patientId: savedBooking.patientId,
      patientName: savedBooking.patientName,
      cardNo: patientCard?.cardNumber,
      cardTier: membership?.name || 'Standard Tier',
      serviceType: 'Pathology',
      serviceDescription: `Pathology Investigations (${activeSelectedTests.length} Tests via ${labCollectionMode === 'home_collection' ? 'Home Sample Collection' : 'Lab Visit'})`,
      items: activeSelectedTests.map(t => ({
        name: t.testName,
        price: t.grossPrice * (1 - (membership?.labDiscount || 25) / 100)
      })),
      grossAmount: selectedGrossTotal,
      discountAmount: selectedDiscountAmount,
      discountPercentage: membership?.labDiscount || 25,
      netAmount: selectedNetTotal,
      paymentMethod: 'Health Wallet (Prepaid Cashless)',
      walletClosingBalance: (wallet?.balance || 0) - selectedNetTotal,
      date: new Date().toISOString(),
      status: 'Completed',
      referenceNo: savedBooking.bookingNo
    });
  };

  // Handle Phlebotomist Sample Collection Status Advance (Simulation for Admin / Phlebotomy)
  const handleAdvanceLabStatus = (booking: BloodTestBooking) => {
    let nextStatus: BloodTestBooking['status'] = 'sample_collected';
    if (booking.status === 'confirmed') nextStatus = 'sample_collected';
    else if (booking.status === 'sample_collected') nextStatus = 'processing';
    else if (booking.status === 'processing') nextStatus = 'report_ready';

    PortalService.updateLabBookingStatus(booking.id, nextStatus);
    triggerCelebrationFireworks();
    showToast(
      'success',
      `Phlebotomy Status: ${nextStatus.replace(/_/g, ' ').toUpperCase()}`,
      `Updated ${booking.bookingNo} sample status for ${booking.patientName}.`
    );
  };

  // Handle Order Medicines
  const handleConfirmMedicineOrder = () => {
    if (!authenticatedPatient || medicineCart.length === 0) return;
    const phmDiscount = membership?.pharmacyDiscount || 15;
    const grossTotal = medicineCart.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
    const discountAmt = (grossTotal * phmDiscount) / 100;
    const netTotal = grossTotal - discountAmt;

    if ((wallet?.balance || 0) < netTotal) {
      showToast('error', 'Insufficient Wallet Balance', `Wallet balance: ${formatCurrency(wallet?.balance || 0)}. Required: ${formatCurrency(netTotal)}. Please recharge.`);
      setShowTopUpModal(true);
      return;
    }

    // Debit Wallet
    WalletService.addTransaction(
      authenticatedPatient.id,
      'debit',
      netTotal,
      `Prepaid Medicine Order (${medicineCart.length} Items Delivered via ${deliveryMode})`,
      {
        grossAmount: grossTotal,
        discountAmount: discountAmt,
        discountPercentage: phmDiscount
      }
    );

    // Save Pharmacy Order
    const savedOrder = PortalService.savePharmacyOrder({
      patientId: authenticatedPatient.id,
      patientName: authenticatedPatient.fullName,
      patientPhone: authenticatedPatient.mobile || '9830012345',
      items: medicineCart.map(m => ({
        medicineName: m.name,
        genericComposition: m.composition,
        dosage: 'As prescribed',
        quantity: m.qty,
        unitPrice: m.unitPrice,
        totalPrice: m.qty * m.unitPrice
      })),
      deliveryMode,
      deliveryAddress,
      grossTotal,
      discountPercentage: phmDiscount,
      discountAmount: discountAmt,
      netTotal,
      paymentStatus: 'paid_wallet',
      status: 'order_placed'
    });

    setShowOrderMedicineModal(false);
    triggerCelebrationFireworks();
    showToast('success', 'Medicine Order Placed!', `Your order ${savedOrder.orderNo} is confirmed.`);

    // Open receipt
    setActiveReceiptToPrint({
      id: `rcp_phm_${savedOrder.id}`,
      receiptNo: `REC-${savedOrder.orderNo}`,
      patientId: savedOrder.patientId,
      patientName: savedOrder.patientName,
      cardNo: patientCard?.cardNumber,
      cardTier: membership?.name || 'Standard Tier',
      serviceType: 'Pharmacy',
      serviceDescription: `e-Pharmacy Order (${savedOrder.items.length} Medicines Delivered via ${deliveryMode})`,
      items: savedOrder.items.map(i => ({ name: i.medicineName, qty: i.quantity, price: i.totalPrice })),
      grossAmount: grossTotal,
      discountAmount: discountAmt,
      discountPercentage: phmDiscount,
      netAmount: netTotal,
      paymentMethod: 'Health Wallet (Prepaid Cashless)',
      walletClosingBalance: (wallet?.balance || 0) - netTotal,
      date: new Date().toISOString(),
      status: 'Completed',
      referenceNo: savedOrder.orderNo
    });
  };

  // IF NOT AUTHENTICATED: 3D HIGH-TECH SMART PORTAL ID LOGIN SCREEN
  if (!authenticatedPatient) {
    return (
      <>
        <Portal3DLoginScreen
          company={company}
          onAuthenticated={(patient) => {
            setAuthenticatedPatient(patient);
            triggerCelebrationFireworks();
          }}
          onOpenApplyModal={() => setShowApplyCardModal(true)}
          onOpenTrackModal={() => setShowTrackStatusModal(true)}
        />

        {/* Self-Service Digital Health Card Application Modal */}
        <PatientCardApplicationModal
          isOpen={showApplyCardModal}
          onClose={() => setShowApplyCardModal(false)}
          onApplicationComplete={(app) => {
            showToast('info', 'Application Logged', `Reference ${app.applicationNo} is pending review.`);
          }}
        />

        {/* Application Status Tracker Modal */}
        <ApplicationStatusTrackModal
          isOpen={showTrackStatusModal}
          onClose={() => setShowTrackStatusModal(false)}
          onLoginWithApprovedCard={(cardNo) => {
            setShowTrackStatusModal(false);
            setLoginId(cardNo);
            showToast('info', 'Card Selected', `Card Number ${cardNo} set. Please enter your PIN to authenticate.`);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. TOP 3D PATIENT COMMAND & PROFILE HEADER BAR */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 sm:p-8 text-white border border-slate-700/80 shadow-2xl">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -top-16 w-64 h-64 rounded-full bg-emerald-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <LabMedixLogo logoUrl={company.logoUrl} variant="monogram" size="lg" theme="white" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <Heart className="w-6 h-6 text-rose-400 fill-rose-400/20 animate-pulse" />
                  {authenticatedPatient.fullName}
                </h1>
                <span
                  className="px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider font-mono border"
                  style={{
                    backgroundColor: (membership?.color || '#10B981') + '20',
                    color: membership?.color || '#10B981',
                    borderColor: (membership?.color || '#10B981') + '60'
                  }}
                >
                  {membership?.name || 'Standard Care'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 font-mono border border-slate-700">
                  {authenticatedPatient.age} Y / {authenticatedPatient.gender} • Blood: {authenticatedPatient.medicalInfo?.bloodGroup || 'B+'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-1">
                Patient ID: <strong className="text-teal-400">{authenticatedPatient.id}</strong> • Health Card: <strong className="text-amber-300">{patientCard?.cardNumber || 'LHC-2026-000001'}</strong> • Phone: {authenticatedPatient.mobile || '9830012345'}
              </p>
            </div>
          </div>

          {/* Authenticated Cardholder Identity Status & Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Verified Patient Session Identity Lock Badge */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/80 border border-teal-500/50 text-teal-300 text-xs font-mono shadow-inner">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
              <div className="text-left leading-tight">
                <span className="text-[9.5px] uppercase font-bold text-slate-400 block font-sans">Active Session</span>
                <strong className="text-emerald-400 font-bold text-xs">{authenticatedPatient.id}</strong>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500 text-emerald-300 hover:bg-emerald-950 font-bold"
              leftIcon={<Plus className="w-3.5 h-3.5 text-emerald-400" />}
              onClick={() => setShowTopUpModal(true)}
            >
              + Top-up Wallet
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="border-rose-500/60 text-rose-300 hover:bg-rose-950 font-bold"
              leftIcon={<LogOut className="w-3.5 h-3.5 text-rose-400" />}
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Real-time Summary Indicators */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-700/60 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Prepaid Wallet Balance</span>
            <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
              {formatCurrency(wallet?.balance || 0)}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Cardholder Savings</span>
            <div className="text-lg font-black text-amber-400 font-mono mt-0.5">
              {formatCurrency(wallet?.totalCredits ? wallet.totalCredits * 0.25 : 4850)}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Upcoming Appointments</span>
            <div className="text-lg font-black text-teal-400 font-mono mt-0.5">
              {appointments.filter(a => a.status !== 'completed').length} OPD / Telemed
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Active Card Benefits</span>
            <div className="text-lg font-black text-purple-400 font-mono mt-0.5">
              {membership.opdDiscount}% OPD • {membership.labDiscount}% Lab
            </div>
          </div>
        </div>
      </div>

      {/* 2. DOCTOR PRESCRIBED BLOOD TEST ALERT BANNER (ENHANCED WITH TOTAL AMOUNT & CARD DISCOUNT) */}
      {prescribedLabTests.length > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/90 via-slate-900 to-slate-900 border-2 border-amber-500 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/50">
              <AlertTriangle className="w-6 h-6 text-amber-400 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-amber-300 uppercase tracking-wide">
                  Doctor Prescribed Blood Tests Alert ({prescribedLabTests.length} Pending Tests)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-amber-500 text-slate-950 uppercase font-mono">
                  ACTION REQUIRED
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Prescribed by <strong className="text-white">{prescribedLabTests[0].prescribedBy}</strong> in Prescription <span className="text-amber-400 font-mono">#{prescribedLabTests[0].encounterNo}</span>.
              </p>

              {/* Total & Discount Calculation Bar */}
              <div className="mt-3 p-3 rounded-2xl bg-slate-950 border border-amber-500/40 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-sans">Total Standard Fee:</span>
                  <strong className="text-slate-300 line-through text-sm">{formatCurrency(totalGrossAlert)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-teal-400 block uppercase font-sans">Cardholder Discount ({membership.labDiscount}% OFF):</span>
                  <strong className="text-teal-400 text-sm">- {formatCurrency(totalDiscountAlert)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400 block uppercase font-sans">Net Cashless Payable:</span>
                  <strong className="text-emerald-400 text-base font-black">{formatCurrency(totalNetAlert)}</strong>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {prescribedLabTests.map((t, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-xl bg-slate-950 text-slate-200 border border-amber-500/30 text-xs font-mono flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5 text-teal-400" />
                    <span>{t.testName}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Button
            size="lg"
            variant="primary"
            className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black shadow-2xl whitespace-nowrap shrink-0 transform hover:scale-105 transition-all"
            leftIcon={<TestTube className="w-5 h-5 text-slate-950" />}
            onClick={handleOpenLabBookingModal}
          >
            ⚡ Select & Book Tests ({formatCurrency(totalNetAlert)})
          </Button>
        </div>
      )}

      {/* 3. NAVIGATION VIEW TABS (7 COMPREHENSIVE SUITES) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 overflow-x-auto text-xs font-bold">
        {[
          { id: 'wallet_card' as const, name: `💳 Health Wallet & Card`, icon: Wallet },
          { id: 'family_shield' as const, name: `👨‍👩‍👧‍👦 Family Shield (${familyMembers.length || 1})`, icon: Users2 },
          { id: 'appointments' as const, name: `📅 Doctor Appointments (${appointments.length})`, icon: CalendarCheck },
          { id: 'lab_tests' as const, name: `🧪 Blood Tests & Labs (${labBookings.length})`, icon: TestTube },
          { id: 'pharmacy' as const, name: `💊 Medicine Orders (${pharmacyOrders.length})`, icon: Pill },
          { id: 'prescriptions' as const, name: `📜 Prescriptions (Rx) (${prescriptions.length})`, icon: FileText },
          { id: 'receipts_history' as const, name: `🧾 Bills & Receipts (${receiptsList.length})`, icon: Receipt }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* 4. TAB 1: HEALTH WALLET & 3D VIRTUAL CARD */}
      {activeTab === 'wallet_card' && (
        <div className="space-y-6">
          {/* MINI-DASHBOARD: RECENT HEALTH RECORDS SUMMARY, ACTIVE SUBSCRIPTIONS & UPCOMING APPOINTMENTS WITH RECHARTS */}
          <div className="p-6 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/40 inline-flex items-center gap-1.5 mb-1">
                  <Activity className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                  <span>PATIENT HEALTH MINI-DASHBOARD</span>
                </span>
                <h3 className="text-xl font-black text-white">
                  Welcome back, {authenticatedPatient?.name || 'Valued Member'}!
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time summary of your health records, active subscriptions, and scheduled clinical visits.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-teal-500/40 text-teal-300 hover:bg-teal-950/40 text-xs font-bold"
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                  onClick={async () => {
                    if (authenticatedPatient?.id) {
                      await PatientRecordPdfService.generateFullRecordPdf(authenticatedPatient.id);
                      showToast('success', 'Health Summary PDF downloaded successfully!', 'Official medical record exported.');
                    }
                  }}
                >
                  Download Summary PDF
                </Button>
              </div>
            </div>

            {/* Top 3 Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Active Subscriptions Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                    <span>ACTIVE SUBSCRIPTION</span>
                    <Badge variant="success" className="text-[10px]">VERIFIED</Badge>
                  </div>
                  <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{membership?.name || 'Gold Health Shield'}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Valid till: <strong className="text-slate-200">2027-12-31</strong> ({membership?.labDiscount || '30'}% Lab Discount)
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-teal-400 font-mono">
                  <span>Card #: {patientCard?.cardNumber || 'LHC-2026-000001'}</span>
                  <span className="text-emerald-400 font-bold">● Active</span>
                </div>
              </div>

              {/* Recent Health Records Summary */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                    <span>HEALTH RECORDS SUMMARY</span>
                    <Badge variant="info" className="text-[10px]">SYNCED</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-slate-900 p-2 rounded-xl">
                      <strong className="text-lg font-black text-teal-400 font-mono block">{labBookings.length}</strong>
                      <span className="text-[10px] text-slate-400 block">Lab Reports</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl">
                      <strong className="text-lg font-black text-blue-400 font-mono block">{prescriptions.length}</strong>
                      <span className="text-[10px] text-slate-400 block">Prescriptions</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl">
                      <strong className="text-lg font-black text-purple-400 font-mono block">{appointments.length}</strong>
                      <span className="text-[10px] text-slate-400 block">Visits</span>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                  <span>Last Updated: Today</span>
                  <span className="text-teal-300 font-bold">100% Secure EMR</span>
                </div>
              </div>

              {/* Upcoming Appointments */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                    <span>UPCOMING APPOINTMENTS</span>
                    <Badge variant="warning" className="text-[10px]">{appointments.filter(a => a.status !== 'completed').length} SCHEDULED</Badge>
                  </div>
                  {appointments.filter(a => a.status !== 'completed').length > 0 ? (
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white truncate">
                        Dr. {appointments.filter(a => a.status !== 'completed')[0]?.doctorName}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        📅 {appointments.filter(a => a.status !== 'completed')[0]?.patientWishDate} @ {appointments.filter(a => a.status !== 'completed')[0]?.patientWishSlot}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2">No upcoming pending appointments. Book online anytime.</p>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-900">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-[11px] border-teal-500/40 text-teal-300 hover:bg-teal-950/40"
                    onClick={() => setShowBookAppointmentModal(true)}
                  >
                    + Book OPD Visit
                  </Button>
                </div>
              </div>
            </div>

            {/* Recharts Data Visualization: Wellness & Savings Trend */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Wellness Score & Cumulative Health Savings Analytics</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Visualizing your health score index and cashless savings across recent months.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                    <span className="w-2 h-2 rounded-full bg-teal-400"></span> Wellness Index
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Savings (₹)
                  </span>
                </div>
              </div>

              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { month: 'Mar', wellnessScore: 82, savings: 450 },
                    { month: 'Apr', wellnessScore: 85, savings: 820 },
                    { month: 'May', wellnessScore: 88, savings: 1250 },
                    { month: 'Jun', wellnessScore: 90, savings: 1680 },
                    { month: 'Jul', wellnessScore: 92, savings: 2400 },
                    { month: 'Aug', wellnessScore: 95, savings: 3200 }
                  ]}>
                    <defs>
                      <linearGradient id="colorWellness" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#64748b" textAnchor="end" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }} 
                    />
                    <Area type="monotone" dataKey="wellnessScore" stroke="#14b8a6" strokeWidth={2} fillOpacity={1} fill="url(#colorWellness)" name="Wellness Score" />
                    <Area type="monotone" dataKey="savings" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSavings)" name="Cashless Savings (₹)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Outstanding Dues Alert if any */}
          {wallet && wallet.totalDue && wallet.totalDue > 0 ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/90 via-slate-900 to-amber-950/80 border-2 border-rose-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-400/50">
                  <AlertTriangle className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-rose-300 uppercase">
                    Outstanding Medical Co-Pay Due: {formatCurrency(wallet.totalDue)}
                  </h4>
                  <p className="text-xs text-slate-300">
                    You have pending unsettled co-pay dues from previous clinic/hospital consultations.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 font-black shadow-lg whitespace-nowrap"
                leftIcon={<Zap className="w-4 h-4" />}
                onClick={() => handleOpenTopUp(Math.max(500, wallet.totalDue || 500))}
              >
                ⚡ Settle Due ({formatCurrency(wallet.totalDue)})
              </Button>
            </div>
          ) : null}

          {/* Quick 1-Click Top-Up Package Bar */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                <h4 className="text-xs font-black text-white uppercase tracking-wide">
                  1-Click Fast Health Wallet Top-Up (Instant Cashless Activation):
                </h4>
              </div>
              <span className="text-[11px] text-teal-400 font-mono font-bold">
                UPI • bKash • Nagad • Cards • NetBanking
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { amt: 500, bonus: 0, tag: 'BASIC' },
                { amt: 1000, bonus: 50, tag: '+₹50 BONUS' },
                { amt: 2500, bonus: 175, tag: '+₹175 BONUS' },
                { amt: 5000, bonus: 500, tag: '+₹500 BONUS' },
                { amt: 10000, bonus: 1200, tag: '+₹1,200 VIP' }
              ].map((pack) => (
                <button
                  key={pack.amt}
                  type="button"
                  onClick={() => handleOpenTopUp(pack.amt)}
                  className="p-2.5 rounded-2xl bg-slate-950 hover:bg-teal-950/80 border border-slate-800 hover:border-teal-500 text-left transition-all group flex flex-col justify-between shadow-md"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-black text-white font-mono group-hover:text-teal-300">
                      ₹{pack.amt}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black bg-teal-900/80 text-teal-300 border border-teal-500/40 uppercase font-mono">
                      {pack.tag}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 group-hover:text-slate-200">
                    Get {formatCurrency(pack.amt + pack.bonus)} Float
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => handleOpenTopUp(1000)}
                className="p-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-center flex flex-col items-center justify-center shadow-lg transition-all"
              >
                <Plus className="w-4 h-4 mb-0.5" />
                <span className="text-xs font-black">Custom Top-Up</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Wallet Float Box */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-slate-400">Prepaid Health Wallet</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500">
                    ESCROW ACTIVE ✅
                  </span>
                </div>
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  {formatCurrency(wallet?.balance || 0)}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Use your prepaid health wallet for 100% cashless OPD appointments, pathology investigations, and e-pharmacy orders with cardholder discounts.
                </p>
              </div>

              {/* Financial Metrics Mini Bar */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center font-mono text-xs">
                <div>
                  <span className="text-[9.5px] text-slate-400 uppercase block font-sans">Total Credits</span>
                  <strong className="text-emerald-400 text-xs">{formatCurrency(wallet?.totalCredits || 0)}</strong>
                </div>
                <div className="border-x border-slate-800">
                  <span className="text-[9.5px] text-slate-400 uppercase block font-sans">Total Spent</span>
                  <strong className="text-rose-400 text-xs">{formatCurrency(wallet?.totalDebits || 0)}</strong>
                </div>
                <div>
                  <span className="text-[9.5px] text-slate-400 uppercase block font-sans">Card Savings</span>
                  <strong className="text-amber-400 text-xs">
                    {formatCurrency(wallet?.totalCredits ? Math.round(wallet.totalCredits * 0.25) : 4850)}
                  </strong>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 font-bold shadow-md"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => handleOpenTopUp(1000)}
                >
                  + Recharge Wallet (Instant Top-up)
                </Button>
              </div>

              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  🌟 Active Cardholder Privileges ({membership?.name || 'Standard Care'}):
                </span>
                <div className="space-y-1 text-slate-300">
                  <p className="flex justify-between">
                    <span>OPD Consultation Discount:</span>
                    <strong className="text-teal-400">{membership?.opdDiscount || 20}% OFF</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Pathology Lab & Blood Tests:</span>
                    <strong className="text-teal-400">{membership?.labDiscount || 20}% OFF</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Pharmacy & Medicine Discount:</span>
                    <strong className="text-teal-400">{membership?.pharmacyDiscount || 10}% OFF</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Home Sample Collection:</span>
                    <strong className="text-emerald-400">
                      {membership?.homeCollectionDiscount === 100 ? 'FREE (100% OFF)' : `${membership?.homeCollectionDiscount || 15}% OFF`}
                    </strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive 3D Virtual CR80 Card */}
            <div className="lg:col-span-2 bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col items-center justify-between shadow-xl">
              <div className="flex flex-wrap items-center justify-between w-full mb-3 gap-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-bold text-slate-300">Official ISO 9001:2015 Accredited Digital CR80 Card</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" leftIcon={<RotateCw className="w-3.5 h-3.5" />} onClick={() => setIsFlipped(!isFlipped)}>
                    Flip Card (3D)
                  </Button>
                  <Button size="sm" variant="primary" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={handleDownloadDigitalCard}>
                    Download Card PDF
                  </Button>
                </div>
              </div>

              {patientCard && (
                <div className="w-full flex flex-col items-center my-2">
                  <FramerInteractiveHealthCard
                    patient={authenticatedPatient}
                    card={patientCard}
                    membership={membership}
                    company={company}
                  />

                  <div className="grid grid-cols-2 gap-3 mt-4 w-[340px]">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block font-sans flex items-center gap-1">
                        <Radio className="w-3 h-3 text-emerald-400" />
                        NFC Chip UID
                      </span>
                      <strong className="text-xs font-bold text-emerald-400 block mt-1 truncate">
                        {patientCard.nfcUid || '04:E2:89:1A:B5:4C:80'}
                      </strong>
                      <span className="text-[9px] text-slate-500 block">13.56 MHz ISO 14443-A</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block font-sans flex items-center gap-1">
                        <Users2 className="w-3 h-3 text-amber-400" />
                        Family Shield
                      </span>
                      <strong className="text-xs font-bold text-amber-300 block mt-1">
                        {familyMembers.length > 0 ? `${familyMembers.length} Members Covered` : '1 Head Covered'}
                      </strong>
                      <button
                        type="button"
                        onClick={() => setActiveTab('family_shield')}
                        className="text-[9.5px] text-teal-400 hover:underline block font-sans font-bold mt-0.5"
                      >
                        View Family Hub →
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-slate-400 text-center mt-2 font-mono">
                Present this card QR code at hospital counter / diagnostics for instant cashless billing.
              </p>
            </div>
          </div>

          {/* Wallet Transaction Ledger */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-teal-400" />
                  <span>Wallet Transaction Statement & Cashless Ledger ({filteredWalletTransactions.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete audit ledger of prepaid wallet deposits, hospital bill deductions, and instant refunds.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />}
                  onClick={handleExportWalletStatement}
                >
                  Export CSV
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 font-bold"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenTopUp(1000)}
                >
                  + Add Funds
                </Button>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold font-mono">
                {[
                  { id: 'all' as const, label: 'All Transactions' },
                  { id: 'credit' as const, label: 'Recharges (+)' },
                  { id: 'debit' as const, label: 'Hospital Bills (-)' },
                  { id: 'refund' as const, label: 'Refunds' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setWalletFilterType(tab.id)}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      walletFilterType === tab.id
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Reference # or note..."
                  value={walletSearchTerm}
                  onChange={(e) => setWalletSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Reference No</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Balance After</th>
                    <th className="px-4 py-3">Notes & Purpose</th>
                    <th className="px-4 py-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredWalletTransactions.length > 0 ? (
                    filteredWalletTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 font-mono">{formatDateTime(t.date)}</td>
                        <td className="px-4 py-3 font-mono font-bold text-white">{t.referenceNo}</td>
                        <td className="px-4 py-3">
                          <Badge variant={t.type === 'credit' ? 'success' : t.type === 'debit' ? 'danger' : 'warning'} size="sm">
                            {t.type.toUpperCase()}
                          </Badge>
                        </td>
                        <td className={`px-4 py-3 font-bold font-mono ${t.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300">
                          {formatCurrency(t.closingBalance)}
                        </td>
                        <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{t.notes}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Printer className="w-3 h-3 text-teal-400" />}
                            onClick={() => {
                              setActiveReceiptToPrint({
                                id: `rcp_stmt_${t.id}`,
                                receiptNo: `REC-${t.referenceNo}`,
                                patientId: authenticatedPatient.id,
                                patientName: authenticatedPatient.fullName,
                                cardNo: patientCard?.cardNumber,
                                cardTier: membership?.name || 'Standard Tier',
                                serviceType: t.type === 'credit' ? 'Wallet Recharge' : 'General',
                                serviceDescription: t.notes || 'Wallet Transaction Statement',
                                grossAmount: t.amount,
                                discountAmount: 0,
                                netAmount: t.amount,
                                paymentMethod: t.type === 'credit' ? 'UPI' : 'Health Wallet (Prepaid Cashless)',
                                walletClosingBalance: t.closingBalance,
                                date: t.date,
                                status: 'Completed',
                                referenceNo: t.referenceNo
                              });
                            }}
                          >
                            Receipt
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        No transactions found matching the selected filter or search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: 1-CARD WHOLE FAMILY SHIELD & DEPENDENTS HUB */}
      {activeTab === 'family_shield' && (
        <div className="space-y-6">
          {/* Family Shield Hero Banner */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-950 via-slate-900 to-teal-950 border-2 border-amber-500/50 shadow-2xl text-white space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
                  <Users2 className="w-7 h-7 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black tracking-tight text-amber-300">
                      1-Card Whole Family Health Shield
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40">
                      ALL MEMBERS COVERED
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    Your single <strong>LABMEDIX Health Card ({patientCard?.cardNumber})</strong> covers your entire household. Every linked family member receives equal tier benefits ({membership.opdDiscount}% OPD, {membership.labDiscount}% Labs, {membership.pharmacyDiscount}% Pharmacy) with shared cashless wallet float.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="primary"
                size="md"
                className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black shadow-xl hover:scale-105 transition-all whitespace-nowrap"
                leftIcon={<UserPlus className="w-4 h-4 text-slate-950" />}
                onClick={() => setShowAddFamilyModal(true)}
              >
                + Add Family Member to Card
              </Button>
            </div>

            {/* Quick Family Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-amber-900/60 text-xs font-mono">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-900/40">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Covered Members</span>
                <strong className="text-base text-amber-300 font-black">
                  {familyMembers.length > 0 ? `${familyMembers.length} Family Members` : '1 (Primary Head)'}
                </strong>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-900/40">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Shared Float Pool</span>
                <strong className="text-base text-emerald-400 font-black">
                  {formatCurrency(wallet?.balance || 0)}
                </strong>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-900/40">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Shared OPD Discount</span>
                <strong className="text-base text-teal-400 font-black">
                  {membership.opdDiscount}% Cashless OFF
                </strong>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-900/40">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Shared Lab Discount</span>
                <strong className="text-base text-purple-400 font-black">
                  {membership.labDiscount}% Cashless OFF
                </strong>
              </div>
            </div>
          </div>

          {/* Family Dependents Directory Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-400/20" />
                <span>Enrolled Family Dependents & Beneficiaries</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Click any action to book appointments or tests for that family member
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card 1: Primary Cardholder / Family Head */}
              <div className="p-5 rounded-3xl bg-slate-900 border-2 border-teal-500/50 shadow-xl space-y-3 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-teal-500/20 text-teal-300 border border-teal-400/40 font-mono">
                    HEAD OF FAMILY
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-slate-950 font-black flex items-center justify-center text-lg shadow-md">
                      {authenticatedPatient.fullName.charAt(0)}
                    </div>
                    <div>
                      <strong className="text-sm text-white font-bold block">{authenticatedPatient.fullName}</strong>
                      <span className="text-xs text-teal-400 font-mono">Primary Cardholder ({authenticatedPatient.id})</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1 font-mono">
                    <p className="text-slate-300">Age / Gender: <strong>{authenticatedPatient.age} Y / {authenticatedPatient.gender}</strong></p>
                    <p className="text-slate-300">Blood Group: <strong className="text-rose-400">{authenticatedPatient.medicalInfo?.bloodGroup || 'B+'}</strong></p>
                    <p className="text-slate-300">Mobile: <strong>{authenticatedPatient.mobile || '9830012345'}</strong></p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-700 text-slate-200 hover:text-white"
                    leftIcon={<CalendarCheck className="w-3.5 h-3.5 text-teal-400" />}
                    onClick={() => {
                      setShowBookAppointmentModal(true);
                    }}
                  >
                    Book OPD
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold"
                    leftIcon={<TestTube className="w-3.5 h-3.5" />}
                    onClick={handleOpenLabBookingModal}
                  >
                    Order Labs
                  </Button>
                </div>
              </div>

              {/* Dependent Family Members */}
              {familyMembers.filter(m => m.patientId !== authenticatedPatient.id).map((member) => {
                const pat = member.patientData;
                return (
                  <div key={member.patientId} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 flex flex-col justify-between hover:border-amber-500/50 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-400/40 font-mono">
                        {member.relationship.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold font-mono">
                        100% COVERED
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-black flex items-center justify-center text-lg shadow-md">
                          {pat.fullName.charAt(0) || 'F'}
                        </div>
                        <div>
                          <strong className="text-sm text-white font-bold block">{pat.fullName}</strong>
                          <span className="text-xs text-slate-400 font-mono">Dependent ID: {pat.id}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1 font-mono">
                        <p className="text-slate-300">Age / Gender: <strong>{pat.age} Y / {pat.gender}</strong></p>
                        <p className="text-slate-300">Blood Group: <strong className="text-rose-400">{pat.medicalInfo?.bloodGroup || 'B+'}</strong></p>
                        <p className="text-slate-300">Phone: <strong>{pat.mobile || authenticatedPatient.mobile}</strong></p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-700 text-slate-200 hover:text-white"
                        leftIcon={<CalendarCheck className="w-3.5 h-3.5 text-amber-400" />}
                        onClick={() => {
                          setShowBookAppointmentModal(true);
                        }}
                      >
                        Book OPD
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black"
                        leftIcon={<TestTube className="w-3.5 h-3.5 text-slate-950" />}
                        onClick={handleOpenLabBookingModal}
                      >
                        Order Labs
                      </Button>
                    </div>
                  </div>
                );
              })}

              {/* Add New Member Quick Card */}
              <div
                onClick={() => setShowAddFamilyModal(true)}
                className="p-6 rounded-3xl bg-slate-900/50 border-2 border-dashed border-slate-800 hover:border-amber-400/60 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2 group min-h-[220px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-800 group-hover:bg-amber-500/20 text-slate-400 group-hover:text-amber-300 flex items-center justify-center transition-all">
                  <UserPlus className="w-6 h-6" />
                </div>
                <strong className="text-xs font-bold text-slate-300 group-hover:text-white">
                  Add Another Family Dependent
                </strong>
                <span className="text-[11px] text-slate-500 max-w-xs">
                  Spouse, Children, Elderly Parents or Siblings covered under your card.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 2: DOCTOR APPOINTMENTS & TELEMEDICINE */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 p-6 rounded-3xl border border-slate-800">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-teal-400" />
                Doctor OPD & Telemedicine Appointments ({appointments.length})
              </h3>
              <p className="text-xs text-slate-400">
                Schedule in-person physical OPD consultations or launch live 1080p WebRTC telemedicine video rooms.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              className="bg-gradient-to-r from-teal-600 to-emerald-600 font-bold shadow-md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowBookAppointmentModal(true)}
            >
              + Book New Doctor Appointment
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointments.map((apt) => (
              <div key={apt.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between shadow-lg">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-slate-950 text-teal-400 border border-slate-700">
                      {apt.appointmentNo}
                    </span>
                    <Badge variant={apt.status === 'completed' ? 'success' : apt.status === 'doctor_confirmed' ? 'info' : 'warning'} size="sm">
                      {apt.status === 'completed' ? 'RX COMPLETED ✅' : apt.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="pt-2">
                    <strong className="text-sm font-black text-white block">{apt.doctorName}</strong>
                    <span className="text-xs text-teal-400 font-mono">{apt.department} • {apt.doctorSpeciality}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1 font-mono mt-2">
                    <div className="flex justify-between text-slate-300">
                      <span>Channel:</span>
                      <strong>{apt.consultationMode === 'telemedicine_video' ? '🌐 Telemedicine Video Room' : '🏥 Physical OPD Room #104'}</strong>
                    </div>
                    <div className="flex justify-between text-amber-400">
                      <span>Scheduled Slot:</span>
                      <span>{formatDate(apt.patientWishDate)} • {apt.patientWishTime} ({apt.patientWishSlot.split(' (')[0]})</span>
                    </div>
                    <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-1">
                      <span>Reason / Complaint:</span>
                      <span className="text-slate-200">{apt.chiefComplaint}</span>
                    </div>
                  </div>

                  {/* Cardholder Discount Breakdown Bar */}
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono space-y-0.5 mt-2">
                    <div className="flex justify-between text-slate-400">
                      <span>Gross Consultation Fee:</span>
                      <span>{formatCurrency(apt.consultationFee / (1 - (membership.opdDiscount || 25) / 100))}</span>
                    </div>
                    <div className="flex justify-between text-teal-400 font-bold">
                      <span>Cardholder Discount ({membership.opdDiscount}% OFF):</span>
                      <span>- {formatCurrency((apt.consultationFee / (1 - (membership.opdDiscount || 25) / 100)) * ((membership.opdDiscount || 25) / 100))}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold border-t border-slate-800 pt-1">
                      <span>Net Cashless Paid:</span>
                      <span className="text-emerald-400">{formatCurrency(apt.consultationFee)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono text-slate-400">
                    Status: <strong className="text-emerald-400">Paid from Health Wallet</strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {apt.consultationMode === 'telemedicine_video' && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-purple-600 hover:bg-purple-700 font-bold"
                        leftIcon={<Video className="w-3.5 h-3.5" />}
                        onClick={() => setActiveTelemedRoom(apt)}
                      >
                        Join Video Room
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Printer className="w-3.5 h-3.5 text-teal-400" />}
                      onClick={() => {
                        setActiveReceiptToPrint({
                          id: `rcp_apt_${apt.id}`,
                          receiptNo: `REC-${apt.appointmentNo}`,
                          patientId: apt.patientId,
                          patientName: apt.patientName,
                          cardNo: patientCard?.cardNumber,
                          cardTier: membership?.name || 'Standard Tier',
                          serviceType: 'Consultation',
                          serviceDescription: `${apt.consultationMode === 'telemedicine_video' ? 'Telemedicine Video Consultation' : 'Physical OPD Consultation'} with ${apt.doctorName} (${apt.department})`,
                          grossAmount: apt.consultationFee / (1 - (membership?.opdDiscount || 25) / 100),
                          discountAmount: (apt.consultationFee / (1 - (membership?.opdDiscount || 25) / 100)) * ((membership?.opdDiscount || 25) / 100),
                          discountPercentage: membership?.opdDiscount || 25,
                          netAmount: apt.consultationFee,
                          paymentMethod: 'Health Wallet (Prepaid Cashless)',
                          walletClosingBalance: wallet?.balance,
                          date: apt.patientWishDate || new Date().toISOString(),
                          status: 'Completed',
                          referenceNo: apt.appointmentNo
                        });
                      }}
                    >
                      Print Slip
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. TAB 3: BLOOD TESTS & PATHOLOGY LABS (WITH PACKAGES & DOCTOR PRESCRIBED SECTION) */}
      {activeTab === 'lab_tests' && (
        <div className="space-y-6">
          {/* Header Action Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-teal-950 via-slate-900 to-slate-900 p-6 rounded-3xl border border-teal-500/40 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TestTube className="w-6 h-6 text-teal-400 animate-pulse" />
                <h3 className="text-lg font-black text-white">
                  Pathology Diagnostic Lab Tests & Health Packages
                </h3>
              </div>
              <p className="text-xs text-slate-300">
                Book direct blood tests & preventive packages without needing a doctor appointment. Enjoy <strong className="text-emerald-400">{membership.labDiscount}% cardholder discount</strong> and doorstep home sample collection.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              className="bg-gradient-to-r from-teal-600 to-emerald-600 font-black shadow-lg hover:scale-105 transition-transform"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowBookLabModal(true)}
            >
              + Book Lab Tests / Package
            </Button>
          </div>

          {/* Section A: Featured Preventive Health Checkup Packages */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Curated Preventive Health Checkup Packages:
              </h4>
              <button
                type="button"
                onClick={() => setShowBookLabModal(true)}
                className="text-xs font-mono text-teal-400 hover:underline flex items-center gap-1"
              >
                <span>View Full Catalog & Tests →</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {CatalogService.getHealthPackages().slice(0, 3).map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-teal-500/60 transition-all flex flex-col justify-between space-y-3 shadow-lg group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase font-mono bg-amber-950 text-amber-300 border border-amber-500/40">
                        {pkg.tag}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        {pkg.parametersCount}+ Tests
                      </span>
                    </div>

                    <strong className="text-sm font-black text-white block group-hover:text-teal-300 transition-colors">
                      {pkg.name}
                    </strong>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                      {pkg.description}
                    </p>

                    <div className="mt-2 p-2 rounded-xl bg-slate-950 border border-slate-800 text-[10.5px] font-mono space-y-0.5 text-teal-200">
                      <span>Key: {pkg.includedTests.slice(0, 2).join(', ')}...</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10.5px] text-slate-400 line-through mr-1.5 font-mono">
                        {formatCurrency(pkg.mrp)}
                      </span>
                      <strong className="text-sm font-black text-emerald-400 font-mono">
                        {formatCurrency(pkg.offerPrice)}
                      </strong>
                    </div>

                    <Button
                      size="sm"
                      variant="primary"
                      className="bg-teal-600 hover:bg-teal-500 font-bold text-xs shadow-md"
                      onClick={() => setShowBookLabModal(true)}
                    >
                      ⚡ Book Package
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Pending Doctor Prescribed Tests (if any) */}
          {prescribedLabTests.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900 border-2 border-amber-500/40 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-black text-amber-300 uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Doctor Prescribed Tests Pending Booking ({prescribedLabTests.length})
                </h4>
                <span className="text-xs text-slate-400 font-mono">
                  Cardholder Discount: <strong className="text-teal-400">{membership.labDiscount}% OFF</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prescribedLabTests.map((t, idx) => {
                  const gross = t.estimatedCost;
                  const discount = (gross * (membership.labDiscount || 25)) / 100;
                  const net = gross - discount;

                  return (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between">
                      <div>
                        <strong className="text-sm font-bold text-white block">{t.testName}</strong>
                        <span className="text-xs text-slate-400 font-mono">{t.category} • Dr. {t.prescribedBy}</span>

                        <div className="mt-2 p-2 rounded-xl bg-slate-900 text-xs font-mono space-y-0.5">
                          <div className="flex justify-between text-slate-400"><span>Standard Lab Fee:</span><span>{formatCurrency(gross)}</span></div>
                          <div className="flex justify-between text-teal-400"><span>Card Discount ({membership.labDiscount}% OFF):</span><span>-{formatCurrency(discount)}</span></div>
                          <div className="flex justify-between text-emerald-400 font-bold border-t border-slate-800 pt-0.5">
                            <span>Net Cashless Price:</span><span>{formatCurrency(net)}</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="primary"
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-slate-950 font-black mt-2"
                        leftIcon={<TestTube className="w-3.5 h-3.5 text-slate-950" />}
                        onClick={() => setShowBookLabModal(true)}
                      >
                        ⚡ Select & Book for {formatCurrency(net)}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section C: Booked & Scheduled Blood Tests History */}
          <div className="space-y-3">
            <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-400" />
              Your Active Diagnostic Bookings & Test Status ({labBookings.length}):
            </h4>

            {labBookings.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                <TestTube className="w-10 h-10 text-teal-400/50 mx-auto" />
                <strong className="text-sm text-slate-300 block">No Active Lab Bookings Yet</strong>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  You haven't scheduled any pathology tests yet. Click below to browse complete blood tests and health checkup packages with free home collection.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-teal-600 font-bold"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowBookLabModal(true)}
                >
                  Book First Test or Health Package
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {labBookings.map((lab) => (
                  <div key={lab.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between shadow-lg">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-slate-950 text-teal-400 border border-slate-700">
                          {lab.bookingNo}
                        </span>
                        <Badge
                          variant={
                            lab.status === 'report_ready'
                              ? 'success'
                              : lab.status === 'processing'
                              ? 'purple'
                              : lab.status === 'sample_collected'
                              ? 'blue'
                              : 'info'
                          }
                          size="sm"
                        >
                          {lab.status.replace(/_/g, ' ').toUpperCase()} ✅
                        </Badge>
                      </div>

                      <div className="pt-2">
                        <strong className="text-sm font-black text-white block">{lab.testName}</strong>
                        <span className="text-xs text-slate-400 font-mono">{lab.category}</span>
                      </div>

                      {/* Itemized Tests if multi-booking */}
                      {lab.items && lab.items.length > 1 && (
                        <div className="p-2.5 rounded-xl bg-slate-950 text-xs font-mono space-y-1 mt-2">
                          <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">Included Tests ({lab.items.length}):</span>
                          {lab.items.map((it, i) => (
                            <div key={i} className="flex justify-between text-slate-300">
                              <span>• {it.testName}</span>
                              <span className="text-teal-400">{formatCurrency(it.netPrice)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1 font-mono mt-2">
                        <div className="flex justify-between text-slate-300">
                          <span>Sample Mode:</span>
                          <strong>{lab.collectionType === 'home_collection' ? '🏠 Doorstep Home Collection' : '🏥 Hospital Diagnostic Lab'}</strong>
                        </div>
                        <div className="flex justify-between text-amber-400">
                          <span>Scheduled Time:</span>
                          <span>{formatDate(lab.scheduledDate)} • {lab.scheduledTime}</span>
                        </div>
                        {/* Live Phlebotomy Fleet Dispatch & ETA Tracker */}
                        {(lab.assignedPhlebotomist || lab.collectionEtaTime || lab.coldChainTemperature) && (
                          <div className="p-2.5 rounded-xl bg-teal-950/40 border border-teal-500/30 text-xs space-y-1.5 font-mono pt-1.5 mt-1.5">
                            <div className="flex justify-between items-center text-teal-300 font-bold">
                              <span className="flex items-center gap-1">
                                <Truck className="w-3.5 h-3.5 text-teal-400" />
                                <span>Phlebotomy Dispatch:</span>
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-teal-500/20 text-teal-200 border border-teal-400/30">
                                {lab.logisticsStage ? lab.logisticsStage.replace(/_/g, ' ') : 'DISPATCHED'}
                              </span>
                            </div>

                            <div className="flex justify-between text-slate-200">
                              <span>Collector:</span>
                              <strong className="text-white">{lab.assignedPhlebotomist}</strong>
                            </div>

                            {lab.phlebotomistVehicle && (
                              <div className="flex justify-between text-slate-300 text-[11px]">
                                <span>Vehicle:</span>
                                <span className="text-amber-300">{lab.phlebotomistVehicle}</span>
                              </div>
                            )}

                            {lab.collectionEtaTime && (
                              <div className="flex justify-between text-cyan-300 font-bold text-[11px]">
                                <span>Arrival ETA:</span>
                                <span>~{lab.collectionEtaMinutes || 20} mins ({lab.collectionEtaTime})</span>
                              </div>
                            )}

                            {lab.coldChainTemperature && (
                              <div className="flex justify-between text-purple-300 text-[11px]">
                                <span>Cold-Chain Temp:</span>
                                <span>{lab.coldChainTemperature} (Safe 2°C - 8°C)</span>
                              </div>
                            )}

                            {lab.boxSealBarcode && (
                              <div className="flex justify-between text-slate-400 text-[10px] pt-1 border-t border-teal-900/40">
                                <span>Biohazard Seal:</span>
                                <span className="font-mono text-purple-300 font-bold">{lab.boxSealBarcode}</span>
                              </div>
                            )}

                            {lab.phlebotomistPhone && (
                              <div className="pt-1 border-t border-teal-900/40 flex justify-end">
                                <a
                                  href={`tel:${lab.phlebotomistPhone}`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-600/30 hover:bg-teal-600 text-teal-200 hover:text-white text-[10px] font-bold transition"
                                >
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>Call Collector ({lab.phlebotomistPhone})</span>
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                        {lab.fastingRequired && (
                          <div className="text-[10px] text-rose-400 font-bold">
                            ⚠️ 8-10 Hours Fasting Required before sample collection.
                          </div>
                        )}
                      </div>

                      {/* Cardholder Discount Breakdown Bar */}
                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono space-y-0.5 mt-2">
                        <div className="flex justify-between text-slate-400">
                          <span>Standard Lab Fee:</span>
                          <span>{formatCurrency(lab.grossPrice)}</span>
                        </div>
                        <div className="flex justify-between text-teal-400 font-bold">
                          <span>Cardholder Discount ({lab.discountPercentage}% OFF):</span>
                          <span>- {formatCurrency(lab.discountAmount)}</span>
                        </div>
                        <div className="flex justify-between text-white font-bold border-t border-slate-800 pt-1">
                          <span>Net Cashless Paid:</span>
                          <span className="text-emerald-400">{formatCurrency(lab.netPrice)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-mono text-slate-400">
                        Net Paid: <strong className="text-emerald-400">{formatCurrency(lab.netPrice)}</strong> (Saved {formatCurrency(lab.discountAmount)})
                      </span>

                      <div className="flex items-center gap-1.5">
                        {lab.status === 'report_ready' && (
                          <Button
                            size="sm"
                            variant="primary"
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs shadow-lg animate-pulse"
                            leftIcon={<FileText className="w-3.5 h-3.5 text-white" />}
                            onClick={() => setActiveLabReportToPrint(lab)}
                          >
                            📄 View / Download Report (PDF)
                          </Button>
                        )}

                        {lab.status !== 'report_ready' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500 font-bold text-[11px]"
                            leftIcon={<Activity className="w-3.5 h-3.5 text-purple-300" />}
                            onClick={() => handleAdvanceLabStatus(lab)}
                            title="Simulate Phlebotomist Sample Collection & Processing Status"
                          >
                            🩸 {lab.status === 'confirmed' ? 'Collect Sample' : lab.status === 'sample_collected' ? 'Start Lab Test' : 'Mark Report Ready'}
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Printer className="w-3.5 h-3.5 text-teal-400" />}
                          onClick={() => {
                            setActiveReceiptToPrint({
                              id: `rcp_lab_${lab.id}`,
                              receiptNo: `REC-${lab.bookingNo}`,
                              patientId: lab.patientId,
                              patientName: lab.patientName,
                              cardNo: patientCard?.cardNumber,
                              cardTier: membership?.name || 'Standard Tier',
                              serviceType: 'Pathology',
                              serviceDescription: `Pathology Test: ${lab.testName} (${lab.collectionType === 'home_collection' ? 'Home Sample Collection' : 'Lab Visit'})`,
                              grossAmount: lab.grossPrice,
                              discountAmount: lab.discountAmount,
                              discountPercentage: lab.discountPercentage,
                              netAmount: lab.netPrice,
                              paymentMethod: 'Health Wallet (Prepaid Cashless)',
                              walletClosingBalance: wallet?.balance,
                              date: lab.createdAt,
                              status: 'Completed',
                              referenceNo: lab.bookingNo
                            });
                          }}
                        >
                          Print Voucher
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. TAB 4: MEDICINE ORDERS (E-PHARMACY) */}
      {activeTab === 'pharmacy' && (
        <div className="space-y-6">
          {/* Header Action Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 rounded-3xl border border-emerald-500/40 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Pill className="w-6 h-6 text-teal-300 animate-bounce" />
                <h3 className="text-lg font-black text-white">
                  LABMEDIX Direct e-Pharmacy & Prescription Medicines
                </h3>
              </div>
              <p className="text-xs text-slate-300">
                Order genuine prescribed & OTC medicines with <strong className="text-emerald-400">{membership?.pharmacyDiscount || 15}% cardholder discount</strong> and 2-hour express doorstep delivery.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 font-black shadow-lg hover:scale-105 transition-transform"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowOrderMedicineModal(true)}
            >
              + Order Medicines Online
            </Button>
          </div>

          {/* Popular Healthcare Essentials Showcase Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Essential Daily Medicines & OTC Care:
              </h4>
              <button
                type="button"
                onClick={() => setShowOrderMedicineModal(true)}
                className="text-xs font-mono text-teal-400 hover:underline flex items-center gap-1"
              >
                <span>Browse Full e-Pharmacy Catalog →</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {CatalogService.getMedicines().slice(0, 4).map((med: any) => (
                <div
                  key={med.id}
                  className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-2 shadow-md group"
                >
                  <div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-800 text-teal-300">
                      {med.category}
                    </span>
                    <strong className="text-xs font-bold text-white block mt-1 group-hover:text-emerald-300 transition-colors">
                      {med.name}
                    </strong>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {med.genericComposition}
                    </span>
                    <span className="text-[9.5px] text-slate-500 block font-mono">
                      {med.packaging}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <strong className="text-xs font-black text-emerald-400 font-mono">
                      {formatCurrency(med.mrp - (med.mrp * (membership?.pharmacyDiscount || 15)) / 100)}
                    </strong>
                    <Button
                      size="sm"
                      variant="primary"
                      className="bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold"
                      onClick={() => setShowOrderMedicineModal(true)}
                    >
                      + Order
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Past Medicine Order History */}
          <div className="space-y-3">
            <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-400" />
              Your Pharmacy Orders History ({pharmacyOrders.length}):
            </h4>

            {pharmacyOrders.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                <Pill className="w-10 h-10 text-emerald-400/50 mx-auto" />
                <strong className="text-sm text-slate-300 block">No Medicine Orders Placed Yet</strong>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Order your daily prescribed medicines or OTC healthcare supplies directly from your health portal with card discounts and cashless wallet payment.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 font-bold"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowOrderMedicineModal(true)}
                >
                  Order First Medicine Refill
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pharmacyOrders.map((order) => (
                  <div key={order.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between shadow-lg">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-slate-950 text-teal-400 border border-slate-700">
                          {order.orderNo}
                        </span>
                        <Badge variant="success" size="sm">
                          {order.status.replace(/_/g, ' ').toUpperCase()} ✅
                        </Badge>
                      </div>

                      <div className="pt-2 space-y-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Items Ordered:</span>
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs font-mono">
                            <span className="text-white">• {item.medicineName} (Qty: {item.quantity})</span>
                            <span className="text-teal-400 font-bold">{formatCurrency(item.totalPrice)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1 font-mono mt-2">
                        <div className="flex justify-between text-slate-300">
                          <span>Delivery Mode:</span>
                          <strong>{order.deliveryMode === 'express_home_delivery' ? '🚚 Express Home Delivery' : '🏪 Express Counter Pickup'}</strong>
                        </div>
                        <div className="text-slate-400 truncate">
                          <span>Address:</span> {order.deliveryAddress}
                        </div>
                      </div>

                      {/* Cardholder Discount Breakdown Bar */}
                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono space-y-0.5 mt-2">
                        <div className="flex justify-between text-slate-400">
                          <span>Gross Pharmacy Bill:</span>
                          <span>{formatCurrency(order.grossTotal)}</span>
                        </div>
                        <div className="flex justify-between text-teal-400 font-bold">
                          <span>Cardholder Discount ({order.discountPercentage}% OFF):</span>
                          <span>- {formatCurrency(order.discountAmount)}</span>
                        </div>
                        <div className="flex justify-between text-white font-bold border-t border-slate-800 pt-1">
                          <span>Net Cashless Paid:</span>
                          <span className="text-emerald-400">{formatCurrency(order.netTotal)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-mono text-slate-400">
                        Net Paid: <strong className="text-emerald-400">{formatCurrency(order.netTotal)}</strong> (Saved {formatCurrency(order.discountAmount)})
                      </span>

                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Printer className="w-3.5 h-3.5 text-teal-400" />}
                        onClick={() => {
                          setActiveReceiptToPrint({
                            id: `rcp_phm_${order.id}`,
                            receiptNo: `REC-${order.orderNo}`,
                            patientId: order.patientId,
                            patientName: order.patientName,
                            cardNo: patientCard?.cardNumber,
                            cardTier: membership?.name || 'Standard Tier',
                            serviceType: 'Pharmacy',
                            serviceDescription: `e-Pharmacy Order (${order.items.length} Medicines Delivered via ${order.deliveryMode})`,
                            items: order.items.map(i => ({ name: i.medicineName, qty: i.quantity, price: i.totalPrice })),
                            grossAmount: order.grossTotal,
                            discountAmount: order.discountAmount,
                            discountPercentage: order.discountPercentage,
                            netAmount: order.netTotal,
                            paymentMethod: 'Health Wallet (Prepaid Cashless)',
                            walletClosingBalance: wallet?.balance,
                            date: order.createdAt,
                            status: 'Completed',
                            referenceNo: order.orderNo
                          });
                        }}
                      >
                        Print Tax Invoice
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. TAB 5: PRESCRIPTIONS & EMR RECORDS */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-black text-white">
                  Verified Digital Clinical Prescriptions & Doctor Advice ({prescriptions.length})
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
                  100% LIVE VERIFIED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Official doctor consultations with doctor recommendations ("Doctor Wishes"), dietary instructions, prescribed blood tests & medicines.
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="border-teal-500/40 text-teal-300 hover:bg-teal-950/60"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={handleDownloadFullMedicalRecord}
            >
              Export Medical Summary
            </Button>
          </div>

          {prescriptions.length === 0 ? (
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
              <FileText className="w-10 h-10 text-teal-400/50 mx-auto" />
              <strong className="text-sm text-slate-300 block">No Prescriptions Recorded Yet on this Card</strong>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Doctor consultations, clinical advice, and official digital prescriptions created for your health card will appear here live with cryptographic verification.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="bg-gradient-to-r from-teal-600 to-emerald-600 font-bold"
                leftIcon={<Calendar className="w-4 h-4" />}
                onClick={() => setShowBookAppointmentModal(true)}
              >
                Book Doctor Consultation Slot
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {prescriptions.map((enc) => (
                <div
                  key={enc.id}
                  className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 transition-all space-y-4 shadow-xl"
                >
                  {/* Top Bar: Doctor Header & Cryptographic Seal */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-sm border border-teal-500/30">
                        <Stethoscope className="w-6 h-6 text-teal-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-slate-950 text-teal-400 border border-slate-700">
                            {enc.encounterNo}
                          </span>
                          <strong className="text-base font-black text-white">{enc.doctorName}</strong>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          {enc.doctorSpeciality} • Reg: {enc.doctorRegNo} • Dept: {enc.department}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        {enc.securitySeal || 'LIVE SIGNED'}
                      </span>
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 font-bold shadow-md"
                        leftIcon={<Printer className="w-3.5 h-3.5" />}
                        onClick={() => setActivePrescriptionToPrint(enc)}
                      >
                        🖨️ View & Print Official Rx
                      </Button>
                    </div>
                  </div>

                  {/* Diagnoses and Chief Complaints */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Chief Complaints & Presenting Illness</span>
                      <p className="text-white font-semibold">{enc.chiefComplaints?.join(', ') || 'Routine Consultation'}</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Clinical Diagnoses</span>
                      <div className="flex flex-wrap gap-1">
                        {enc.diagnoses?.map((d, di) => (
                          <span key={di} className="px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-800/60 text-[11px] font-bold">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Doctor Recommendations & Wishes ("Doctor Wishes") */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/60 via-slate-950 to-slate-950 border border-teal-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-teal-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Attending Doctor's Recommendations & Lifestyle Advice ("Doctor Wishes"):
                      </h4>
                      {enc.followUpDate && (
                        <span className="text-[11px] font-mono text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/40">
                          Follow-up: {formatDate(enc.followUpDate)}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-xs text-slate-200">
                      {enc.dietAndAdvice?.map((adv, ai) => (
                        <p key={ai} className="flex items-start gap-2">
                          <span className="text-teal-400 font-bold">•</span>
                          <span>{adv}</span>
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Prescribed Medications & Recommended Tests Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Medications */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                          <Pill className="w-3.5 h-3.5 text-amber-400" />
                          Prescribed Medicines ({enc.medications?.length || 0})
                        </span>
                        <button
                          onClick={() => setShowOrderMedicineModal(true)}
                          className="text-[10.5px] font-mono text-teal-400 hover:underline"
                        >
                          Order Pharmacy Refill →
                        </button>
                      </div>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {enc.medications?.map((m, mi) => (
                          <div key={mi} className="p-2 rounded-xl bg-slate-900 border border-slate-800/60 flex items-start justify-between gap-2">
                            <div>
                              <strong className="text-white block font-bold text-[11px]">{m.name}</strong>
                              <span className="text-[10px] text-slate-400 font-mono">{m.dosage} • {m.frequency} • {m.timing}</span>
                              {m.instructions && (
                                <span className="text-[9.5px] text-amber-400 block mt-0.5">{m.instructions}</span>
                              )}
                            </div>
                            <span className="px-1.5 py-0.5 bg-slate-950 rounded text-[9.5px] font-mono text-teal-300 shrink-0">
                              {m.duration || '5d'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Lab Requisitions */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                          <TestTube className="w-3.5 h-3.5 text-blue-400" />
                          Prescribed Diagnostic Tests ({enc.labOrders?.length || 0})
                        </span>
                        <button
                          onClick={handleOpenLabBookingModal}
                          className="text-[10.5px] font-mono text-teal-400 hover:underline"
                        >
                          Book Lab Slot →
                        </button>
                      </div>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {enc.labOrders?.length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic py-2">No diagnostic lab orders prescribed in this visit.</p>
                        ) : (
                          enc.labOrders?.map((l, li) => (
                            <div key={li} className="p-2 rounded-xl bg-slate-900 border border-slate-800/60 flex items-start justify-between gap-2">
                              <div>
                                <strong className="text-white block font-bold text-[11px]">{l.testName}</strong>
                                <span className="text-[10px] text-slate-400">{l.category || 'Pathology screening'}</span>
                              </div>
                              <span className="px-1.5 py-0.5 bg-slate-950 rounded text-[9.5px] font-mono text-emerald-400 shrink-0">
                                {formatCurrency(l.estimatedCost)}
                              </span>
                            </div>
                          ))
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

      {/* 9. TAB 6: BILLS, INVOICES & ALL RECEIPTS HISTORY */}
      {activeTab === 'receipts_history' && (
        <div className="space-y-5">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white border border-slate-700/80 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-lg border border-teal-400/40">
                  <Receipt className="w-6 h-6 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    Official Invoices, Bills & Printable Receipts ({receiptsList.length})
                  </h3>
                  <p className="text-xs text-slate-300">
                    Comprehensive patient financial & clinical history ledger with 1-click 80mm Thermal Receipt & A4 Standard Invoice printing.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-slate-950/80 text-emerald-400 font-bold border border-slate-700">
                  Total Ledger: {receiptsList.length} Invoices
                </span>
              </div>
            </div>

            {/* Filter & Search Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search bills by Receipt No, Service, Reference..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 text-white border border-slate-700 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold">
                {(['all', 'Consultation', 'Pathology', 'Pharmacy', 'Wallet Recharge'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setHistoryServiceFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                      historyServiceFilter === filter
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {filter === 'all' ? 'All Services' : filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Receipt No</th>
                    <th className="px-4 py-3.5">Service Type</th>
                    <th className="px-4 py-3.5">Description</th>
                    <th className="px-4 py-3.5">Gross Total</th>
                    <th className="px-4 py-3.5">Card Discount</th>
                    <th className="px-4 py-3.5">Net Paid</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredReceipts.map((rcp) => (
                    <tr key={rcp.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono">{formatDateTime(rcp.date)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-white">{rcp.receiptNo}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            rcp.serviceType === 'Consultation'
                              ? 'info'
                              : rcp.serviceType === 'Pathology'
                              ? 'purple'
                              : rcp.serviceType === 'Pharmacy'
                              ? 'blue'
                              : 'success'
                          }
                          size="sm"
                        >
                          {rcp.serviceType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-slate-300" title={rcp.serviceDescription}>
                        {rcp.serviceDescription}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">{formatCurrency(rcp.grossAmount)}</td>
                      <td className="px-4 py-3 font-mono text-teal-400 font-bold">
                        {rcp.discountAmount > 0 ? `-${formatCurrency(rcp.discountAmount)}` : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">{formatCurrency(rcp.netAmount)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="primary"
                            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 font-bold shadow-md"
                            leftIcon={<Printer className="w-3 h-3" />}
                            onClick={() => setActiveReceiptToPrint(rcp)}
                          >
                            Print Bill
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS SECTION: TOP-UP, BOOK APT, BOOK LAB, ORDER MEDICINE, PRINT         */}
      {/* ========================================================================= */}

      {/* 1. TOP-UP WALLET MODAL (FINTECH STANDARD MULTI-GATEWAY MODAL) */}
      {showTopUpModal && (
        <PatientRealMoneyTopUpModal
          isOpen={showTopUpModal}
          onClose={() => setShowTopUpModal(false)}
          patient={authenticatedPatient}
          wallet={wallet}
          card={patientCard}
          membership={membership}
          initialAmount={topUpAmount}
          onSuccess={(receiptData) => {
            setActiveReceiptToPrint(receiptData);
          }}
        />
      )}

      {/* 2. BOOK APPOINTMENT MODAL */}
      {showBookAppointmentModal && (
        <Modal isOpen={showBookAppointmentModal} onClose={() => setShowBookAppointmentModal(false)} title="Book Doctor Consultation" maxWidth="lg">
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 flex justify-between items-center text-teal-900 dark:text-teal-200">
              <div>
                <strong>Cardholder OPD Benefit Applied:</strong> {membership?.opdDiscount || 20}% Discount
              </div>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                Wallet Balance: {formatCurrency(wallet?.balance || 0)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Select Physician:</label>
                <select
                  aria-label="Select Doctor"
                  value={selectedDoctor?.name || 'Dr. Subhashish Roy'}
                  onChange={(e) => {
                    if (e.target.value.includes('Roy')) {
                      setSelectedDoctor({ name: 'Dr. Subhashish Roy', speciality: 'Consultant Cardiologist & Medical Director', department: 'Cardiology OPD', fee: 800 });
                    } else if (e.target.value.includes('Sen')) {
                      setSelectedDoctor({ name: 'Dr. Anita Sen', speciality: 'Consultant Gynaecologist & Obstetrician', department: 'Gynaecology OPD', fee: 700 });
                    } else {
                      setSelectedDoctor({ name: 'Dr. Pritam Das', speciality: 'Consultant Orthopaedic Surgeon', department: 'Orthopaedics OPD', fee: 750 });
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Dr. Subhashish Roy">Dr. Subhashish Roy (Cardiology - ₹800)</option>
                  <option value="Dr. Anita Sen">Dr. Anita Sen (Gynaecology - ₹700)</option>
                  <option value="Dr. Pritam Das">Dr. Pritam Das (Orthopaedics - ₹750)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Consultation Channel:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAptMode('physical_opd')}
                    className={`py-2 rounded-xl font-bold text-xs ${
                      aptMode === 'physical_opd' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    🏥 In-Person OPD
                  </button>
                  <button
                    type="button"
                    onClick={() => setAptMode('telemedicine_video')}
                    className={`py-2 rounded-xl font-bold text-xs ${
                      aptMode === 'telemedicine_video' ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    🌐 Video Telemed
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Preferred Date" type="date" value={aptDate} onChange={(e) => setAptDate(e.target.value)} />
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Preferred Slot:</label>
                <select
                  aria-label="Appointment Slot"
                  value={aptSlot}
                  onChange={(e) => setAptSlot(e.target.value)}
                  className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Morning OPD (09:00 AM - 01:00 PM)">Morning OPD (09:00 - 13:00)</option>
                  <option value="Afternoon OPD (02:00 PM - 05:00 PM)">Afternoon OPD (14:00 - 17:00)</option>
                  <option value="Evening OPD (06:00 PM - 09:00 PM)">Evening OPD (18:00 - 21:00)</option>
                </select>
              </div>
              <Input label="Preferred Time Wish" type="text" value={aptTime} onChange={(e) => setAptTime(e.target.value)} />
            </div>

            <Input label="Chief Complaint / Purpose of Visit" value={aptComplaint} onChange={(e) => setAptComplaint(e.target.value)} />

            {/* Price Breakdown */}
            <div className="p-3 rounded-2xl bg-slate-900 text-white space-y-1 font-mono text-xs">
              <div className="flex justify-between text-slate-400"><span>Doctor Fee:</span><span>{formatCurrency(selectedDoctor?.fee || 800)}</span></div>
              <div className="flex justify-between text-teal-400"><span>Cardholder Discount ({membership?.opdDiscount || 20}% OFF):</span><span>-{formatCurrency(((selectedDoctor?.fee || 800) * (membership?.opdDiscount || 20)) / 100)}</span></div>
              <div className="flex justify-between text-sm font-black text-emerald-400 border-t border-slate-800 pt-1">
                <span>NET CASHLESS PAYABLE:</span>
                <span>{formatCurrency((selectedDoctor?.fee || 800) - ((selectedDoctor?.fee || 800) * (membership?.opdDiscount || 20)) / 100)}</span>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowBookAppointmentModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-gradient-to-r from-teal-600 to-emerald-600 font-black shadow-md"
                leftIcon={<CalendarCheck className="w-4 h-4" />}
                onClick={handleConfirmAppointment}
              >
                Confirm & Pay from Wallet
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. DIRECT LAB TESTS & HEALTH PACKAGES BOOKING MODAL (pkg test) */}
      {showBookLabModal && authenticatedPatient && (
        <DirectLabAndPackageBookingModal
          isOpen={showBookLabModal}
          onClose={() => setShowBookLabModal(false)}
          patient={authenticatedPatient}
          membership={membership}
          walletBalance={wallet?.balance || 0}
          onBookingSuccess={(booking, receipt) => {
            if (receipt) {
              setActiveReceiptToPrint(receipt);
            }
          }}
        />
      )}

      {/* 4. DIRECT E-PHARMACY & MEDICINES ORDERING STORE MODAL */}
      {showOrderMedicineModal && authenticatedPatient && (
        <DirectMedicineOrderModal
          isOpen={showOrderMedicineModal}
          onClose={() => setShowOrderMedicineModal(false)}
          patient={authenticatedPatient}
          membership={membership}
          walletBalance={wallet?.balance || 0}
          onOrderSuccess={(order, receipt) => {
            if (receipt) {
              setActiveReceiptToPrint(receipt);
            }
          }}
        />
      )}

      {/* 5. OFFICIAL PRESCRIPTION PRINT MODAL */}
      {activePrescriptionToPrint && (
        <PrescriptionPrintModal
          isOpen={!!activePrescriptionToPrint}
          onClose={() => setActivePrescriptionToPrint(null)}
          encounter={activePrescriptionToPrint}
          patient={authenticatedPatient}
        />
      )}

      {/* 6. TELEMEDICINE VIDEO MODAL */}
      {activeTelemedRoom && (
        <TelemedicineVideoModal
          isOpen={!!activeTelemedRoom}
          onClose={() => setActiveTelemedRoom(null)}
          appointment={activeTelemedRoom}
          onLaunchPrescription={() => {
            setActiveTelemedRoom(null);
            showToast('info', 'Prescription Consult', 'Clinical prescription initiated.');
          }}
        />
      )}

      {/* 7. PATIENT UNIVERSAL BILL & RECEIPT PRINT MODAL */}
      {activeReceiptToPrint && (
        <PatientReceiptModal
          isOpen={!!activeReceiptToPrint}
          onClose={() => setActiveReceiptToPrint(null)}
          receipt={activeReceiptToPrint}
        />
      )}

      {/* 8. PATIENT VERIFIED DIAGNOSTIC REPORT PRINT & DOWNLOAD MODAL */}
      {activeLabReportToPrint && (
        <LabReportPrintModal
          isOpen={!!activeLabReportToPrint}
          onClose={() => setActiveLabReportToPrint(null)}
          booking={activeLabReportToPrint}
        />
      )}

      {/* 9. ADD FAMILY DEPENDENT TO HEALTH CARD MODAL */}
      {showAddFamilyModal && (
        <Modal
          isOpen={showAddFamilyModal}
          onClose={() => setShowAddFamilyModal(false)}
          title="👨‍👩‍👧‍👦 Link Family Member to Health Card (100% Family Shield)"
          maxWidth="md"
        >
          <form onSubmit={handleAddDependent} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
              <strong className="block text-xs font-black uppercase">
                🛡️ 1 Card Whole Family Facility Active
              </strong>
              <p className="text-[11px] leading-relaxed">
                Add your spouse, children, parents, or siblings. They will automatically be enrolled under your <strong>{patientCard?.cardNumber} [{membership?.name || 'Standard Care'}]</strong> and share your cashless float.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                1. Family Member Full Name: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rima Roy / Aarav Roy"
                value={newFamilyMemberName}
                onChange={(e) => setNewFamilyMemberName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  2. Relationship:
                </label>
                <select
                  value={newFamilyMemberRel}
                  onChange={(e) => setNewFamilyMemberRel(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs"
                >
                  <option value="Spouse">Spouse (Wife / Husband)</option>
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Other">Other Dependent</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  3. Age (Years):
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  placeholder="e.g. 29"
                  value={newFamilyMemberAge}
                  onChange={(e) => setNewFamilyMemberAge(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  4. Gender:
                </label>
                <select
                  value={newFamilyMemberGender}
                  onChange={(e) => setNewFamilyMemberGender(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  5. Blood Group:
                </label>
                <select
                  value={newFamilyMemberBlood}
                  onChange={(e) => setNewFamilyMemberBlood(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                6. Contact Mobile Number (Optional):
              </label>
              <input
                type="tel"
                placeholder={authenticatedPatient?.mobile || '9830012345'}
                value={newFamilyMemberPhone}
                onChange={(e) => setNewFamilyMemberPhone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddFamilyModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md"
                leftIcon={<UserPlus className="w-4 h-4 text-slate-950" />}
              >
                + Link Member to Card
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Hidden Export Elements for CR80 PDF capture */}
      {patientCard && (
        <div className="fixed -left-[9999px] top-0 pointer-events-none">
          <CR80CardFront id="portal-card-front" patient={authenticatedPatient} card={patientCard} membership={membership} company={company} />
          <CR80CardBack id="portal-card-back" patient={authenticatedPatient} card={patientCard} membership={membership} company={company} />
        </div>
      )}
    </div>
  );
};