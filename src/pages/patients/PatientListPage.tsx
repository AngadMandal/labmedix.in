import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirestoreCollection } from '../../hooks/useFirestore';
import { PatientService } from '../../services/patientService';
import { StorageService } from '../../services/storage';
import { PortalService, BloodTestBooking, MedicineOrder, PatientReceiptData } from '../../services/portalService';
import { EMRService } from '../../services/emrService';
import { ApiSyncService } from '../../services/apiSyncService';
import { useAuth } from '../../context/AuthContext';
import { DataTable, Column } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PatientQuickViewModal } from '../../components/common/PatientQuickViewModal';
import { PatientReceiptModal } from '../../components/portal/PatientReceiptModal';
import { PhlebotomySampleLabelModal } from '../../components/patients/PhlebotomySampleLabelModal';
import { PhlebotomySampleDispatchModal } from '../../components/patients/PhlebotomySampleDispatchModal';
import { CardApplicationReviewModal } from '../../components/card/CardApplicationReviewModal';
import { CreateCardRequestModal } from '../../components/card/CreateCardRequestModal';
import { PatientRealMoneyTopUpModal } from '../../components/portal/PatientRealMoneyTopUpModal';
import { DirectLabAndPackageBookingModal } from '../../components/portal/DirectLabAndPackageBookingModal';
import { DirectMedicineOrderModal } from '../../components/portal/DirectMedicineOrderModal';
import { CardDispatchService } from '../../services/cardDispatchService';
import { Patient, PatientAppointment, CardApplicationRequest, HealthCard, Membership, Wallet, CardDispatchRecord } from '../../types';
import { DEFAULT_MEMBERSHIPS } from '../../constants/memberships';
import { formatDate, formatDateTime, formatCurrency } from '../../utils/formatters';

const FALLBACK_MEMBERSHIP: Membership = DEFAULT_MEMBERSHIPS[0] || {
  id: 'mem_gold',
  name: 'Standard Gold',
  color: '#0D9488',
  registrationFee: 500,
  opdDiscount: 25,
  labDiscount: 30,
  pharmacyDiscount: 15,
  ipdDiscount: 10,
  validityYears: 3,
  description: 'Standard Membership'
};

const getMem = (membershipId: string | undefined, membershipsList: Membership[] = []): Membership => {
  if (!membershipsList || membershipsList.length === 0) return FALLBACK_MEMBERSHIP;
  const found = membershipsList.find(m => m.id === membershipId);
  return found || membershipsList[0] || FALLBACK_MEMBERSHIP;
};
import {
  Users,
  Plus,
  Eye,
  Edit,
  Trash2,
  RotateCcw,
  CreditCard,
  Heart,
  LayoutGrid,
  List,
  Search,
  Sparkles,
  Phone,
  TestTube,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  Pill,
  Printer,
  Tag,
  Activity,
  Send,
  Truck,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Package,
  Layers,
  Flame,
  ArrowRight,
  FileText,
  TrendingUp,
  MapPin,
  Stethoscope,
  Wallet as WalletIcon,
  FileCheck,
  Zap,
  Filter,
  UserCheck,
  QrCode
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { triggerCelebrationFireworks } from '../../utils/confetti';

export const PatientListPage: React.FC = () => {
  // Navigation & View Mode: Default to primary Patient Directory Table
  const [activeMainView, setActiveMainView] = useState<'directory_table' | 'directory_grid' | 'requests_command' | 'card_applications'>('directory_table');
  const [showDeleted, setShowDeleted] = useState(false);
  const [quickViewPatient, setQuickViewPatient] = useState<Patient | null>(null);

  // Live Service Requests Filters
  const [serviceTypeFilter, setServiceTypeFilter] = useState<'all' | 'labs' | 'pharmacy' | 'opd'>('all');
  const [serviceStatusFilter, setServiceStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Master Patient Directory Filters
  const [directoryBloodGroupFilter, setDirectoryBloodGroupFilter] = useState<string>('all');
  const [directoryTierFilter, setDirectoryTierFilter] = useState<string>('all');
  const [directorySearchQuery, setDirectorySearchQuery] = useState('');

  // Modals for Printing Bill, Barcode Label, Sample Dispatch, Card Review, Wallet, Lab Booking, Medicine
  const [activeReceiptToPrint, setActiveReceiptToPrint] = useState<PatientReceiptData | null>(null);
  const [activeLabelToPrint, setActiveLabelToPrint] = useState<BloodTestBooking | null>(null);
  const [activeBookingToDispatch, setActiveBookingToDispatch] = useState<BloodTestBooking | null>(null);
  const [activeApplicationToReview, setActiveApplicationToReview] = useState<CardApplicationRequest | null>(null);
  const [activePatientForTopUp, setActivePatientForTopUp] = useState<Patient | null>(null);
  const [activePatientForLabBooking, setActivePatientForLabBooking] = useState<Patient | null>(null);
  const [activePatientForMedicineOrder, setActivePatientForMedicineOrder] = useState<Patient | null>(null);
  const [isCreateRequestModalOpen, setIsCreateRequestModalOpen] = useState(false);
  const [preselectedPatientId, setPreselectedPatientId] = useState<string | undefined>(undefined);

  const { can, currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Core Data & Real-time Subscriptions
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const [cards, setCards] = useState<HealthCard[]>(() => StorageService.getCards());
  const [memberships, setMemberships] = useState<Membership[]>(() => StorageService.getMemberships());
  const company = StorageService.getCompanyProfile();
  const [wallets, setWallets] = useState<Wallet[]>(() => StorageService.getWallets());
  const [cardDispatches, setCardDispatches] = useState<CardDispatchRecord[]>(() => CardDispatchService.getAll());
  const [onlyPendingPrint, setOnlyPendingPrint] = useState(false);

  // Live Cardholder Portal Requests & Applications
  const [labBookings, setLabBookings] = useState<BloodTestBooking[]>(() => PortalService.getLabBookings());
  const [pharmacyOrders, setPharmacyOrders] = useState<MedicineOrder[]>(() => PortalService.getPharmacyOrders());
  const [appointments, setAppointments] = useState<PatientAppointment[]>(() => EMRService.getAllAppointments());
  const [cardApplications, setCardApplications] = useState<CardApplicationRequest[]>(() => PortalService.getCardApplications());

  const refreshList = () => {
    setPatients(StorageService.getPatients());
    setCards(StorageService.getCards());
    setMemberships(StorageService.getMemberships());
    setWallets(StorageService.getWallets());
    setCardDispatches(CardDispatchService.getAll());
    setLabBookings(PortalService.getLabBookings());
    setPharmacyOrders(PortalService.getPharmacyOrders());
    setAppointments(EMRService.getAllAppointments());
    setCardApplications(PortalService.getCardApplications());
    showToast('info', 'Data Synchronized', 'Live requests, card applications, and patient records refreshed.');
  };

  const handleTogglePrintStatus = (patient: Patient, card?: HealthCard) => {
    if (!card) {
      showToast('warning', 'No Health Card', 'This patient does not have an active health card minted yet.');
      return;
    }
    let dispatch = cardDispatches.find(d => d.patientId === patient.id || d.cardId === card.id);
    if (!dispatch) {
      dispatch = CardDispatchService.createDispatch({
        cardId: card.id,
        patientId: patient.id,
        printStatus: 'pending_print'
      });
    }

    if (dispatch.printStatus === 'pending_print') {
      CardDispatchService.markAsPrinted(dispatch.id, 'Reception Desk Terminal');
      showToast('success', 'Card Marked Printed', `Health card ${card.cardNumber} marked as printed successfully!`);
    } else {
      dispatch.printStatus = 'pending_print';
      const all = CardDispatchService.getAll().map(r => r.id === dispatch?.id ? dispatch : r);
      StorageService.saveCardDispatches(all);
      showToast('info', 'Print Status Reset', `Health card ${card.cardNumber} marked as pending print.`);
    }
    setCardDispatches(CardDispatchService.getAll());
    refreshList();
  };

  useEffect(() => {
    const unsubPatients = ApiSyncService.subscribeToCollection<Patient>('patients', (items) => {
      if (Array.isArray(items) && items.length > 0) setPatients(items);
      else setPatients(StorageService.getPatients());
    });
    const unsubCards = ApiSyncService.subscribeToCollection<HealthCard>('cards', (items) => {
      if (Array.isArray(items)) setCards(items);
    });
    const unsubMemberships = ApiSyncService.subscribeToCollection<Membership>('memberships', (items) => {
      if (Array.isArray(items)) setMemberships(items);
    });
    const unsubWallets = ApiSyncService.subscribeToCollection<Wallet>('wallets', (items) => {
      if (Array.isArray(items)) setWallets(items);
    });
    const unsubDispatches = ApiSyncService.subscribeToCollection<CardDispatchRecord>('cardDispatches', (items) => {
      if (Array.isArray(items)) setCardDispatches(items);
    });
    const unsubLab = ApiSyncService.subscribeToCollection<BloodTestBooking>('labBookings', (items) => {
      if (Array.isArray(items)) setLabBookings(items);
    });
    const unsubPharmacy = ApiSyncService.subscribeToCollection<MedicineOrder>('pharmacyOrders', (items) => {
      if (Array.isArray(items)) setPharmacyOrders(items);
    });
    const unsubAppointments = ApiSyncService.subscribeToCollection<PatientAppointment>('appointments', (items) => {
      if (Array.isArray(items)) setAppointments(items);
    });
    const unsubCardApps = ApiSyncService.subscribeToCollection<CardApplicationRequest>('cardApplications', (items) => {
      if (Array.isArray(items)) setCardApplications(items);
    });

    const handleSync = () => {
      setPatients(StorageService.getPatients());
      setCards(StorageService.getCards());
      setMemberships(StorageService.getMemberships());
      setWallets(StorageService.getWallets());
      setCardDispatches(CardDispatchService.getAll());
      setLabBookings(PortalService.getLabBookings());
      setPharmacyOrders(PortalService.getPharmacyOrders());
      setAppointments(EMRService.getAllAppointments());
      setCardApplications(PortalService.getCardApplications());
    };
    window.addEventListener('labmedix_data_synced', handleSync as EventListener);

    return () => {
      unsubPatients();
      unsubCards();
      unsubMemberships();
      unsubWallets();
      unsubDispatches();
      unsubLab();
      unsubPharmacy();
      unsubAppointments();
      unsubCardApps();
      window.removeEventListener('labmedix_data_synced', handleSync as EventListener);
    };
  }, []);

  const handleSoftDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to archive patient ${name}?`)) {
      PatientService.softDelete(id);
      showToast('warning', 'Patient Archived', `${name} has been soft-deleted.`);
      refreshList();
    }
  };

  const handleRestore = (id: string, name: string) => {
    PatientService.restore(id);
    showToast('success', 'Patient Restored', `${name} has been reactivated.`);
    refreshList();
  };

  const handlePermanentDelete = (id: string, name: string) => {
    if (!isSuperAdmin) {
      showToast('error', 'Access Restricted', 'Only Super Administrator can permanently purge patient records.');
      return;
    }
    if (window.confirm(`CRITICAL: Are you sure you want to permanently delete patient ${name} (ID: ${id})? This will expunge all records from Firestore and cannot be undone.`)) {
      PatientService.permanentDelete(id);
      showToast('success', 'Patient Purged', `${name} has been permanently expunged across all devices.`);
      refreshList();
    }
  };

  // Operational Action Handlers
  const handleAdvanceLabStatus = (booking: BloodTestBooking, targetStatus?: BloodTestBooking['status']) => {
    let nextStatus: BloodTestBooking['status'] = 'sample_collected';
    if (targetStatus) {
      nextStatus = targetStatus;
    } else {
      if (booking.status === 'confirmed') nextStatus = 'phlebotomist_assigned';
      else if (booking.status === 'phlebotomist_assigned') nextStatus = 'sample_collected';
      else if (booking.status === 'sample_collected') nextStatus = 'processing';
      else if (booking.status === 'processing') nextStatus = 'report_ready';
    }

    PortalService.updateLabBookingStatus(booking.id, nextStatus);
    setLabBookings(PortalService.getLabBookings());
    triggerCelebrationFireworks();

    const statusLabels: Record<string, string> = {
      phlebotomist_assigned: 'Phlebotomist Assigned & Dispatched',
      sample_collected: 'Sample Collected by Phlebotomist',
      processing: 'Test Processing in Central Diagnostic Lab',
      report_ready: 'Official Diagnostic Report Generated & Ready'
    };

    showToast('success', 'Lab Status Updated', `${booking.bookingNo}: ${statusLabels[nextStatus] || nextStatus}.`);
  };

  const handleAdvancePharmacyStatus = (order: MedicineOrder, targetStatus?: MedicineOrder['status']) => {
    let nextStatus: MedicineOrder['status'] = 'packed';
    if (targetStatus) {
      nextStatus = targetStatus;
    } else {
      if (order.status === 'order_placed') nextStatus = 'packed';
      else if (order.status === 'packed') nextStatus = 'out_for_delivery';
      else if (order.status === 'out_for_delivery') nextStatus = 'delivered';
    }

    PortalService.updatePharmacyOrderStatus(order.id, nextStatus);
    setPharmacyOrders(PortalService.getPharmacyOrders());
    triggerCelebrationFireworks();

    const statusLabels: Record<string, string> = {
      packed: 'Medicines Verified & Packed in Bio-Seal Box',
      out_for_delivery: 'Out for 2-Hour Express Doorstep Delivery (Rider Dispatched)',
      delivered: 'Medicines Handed Over to Patient Successfully'
    };

    showToast('success', 'e-Pharmacy Updated', `${order.orderNo}: ${statusLabels[nextStatus] || nextStatus}.`);
  };

  const handleAdvanceAppointmentStatus = (apt: PatientAppointment, targetStatus?: PatientAppointment['status']) => {
    let nextStatus: PatientAppointment['status'] = 'doctor_confirmed';
    if (targetStatus) {
      nextStatus = targetStatus;
    } else {
      if (apt.status === 'pending_doctor_approval') nextStatus = 'doctor_confirmed';
      else if (apt.status === 'doctor_confirmed') nextStatus = 'in_consultation';
      else if (apt.status === 'in_consultation') nextStatus = 'completed';
    }

    EMRService.updateAppointmentStatus(apt.id, nextStatus);
    setAppointments(EMRService.getAllAppointments());
    triggerCelebrationFireworks();

    showToast('success', 'Appointment Updated', `Consultation ${apt.appointmentNo} marked as ${nextStatus.replace(/_/g, ' ').toUpperCase()}.`);
  };

  // Online Card Application Direct Approval
  const handleApproveApplication = async (appId: string) => {
    const res = await PortalService.approveCardApplication(appId, 'Super Administrator');
    if (res.success && res.patient && res.card) {
      triggerCelebrationFireworks();
      showToast(
        'success',
        'Card Approved & Issued!',
        `Generated Patient ID: ${res.patient.id}, Card: ${res.card.cardNumber}. Automated SMS & Email dispatched.`
      );
      refreshList();
    } else {
      showToast('error', 'Approval Error', res.error || 'Failed to approve application.');
    }
  };

  // Bill Printing Trigger Helpers
  const handlePrintLabBill = (booking: BloodTestBooking) => {
    const patient = patients.find(p => p.id === booking.patientId);
    const card = cards.find(c => c.patientId === booking.patientId || c.id === patient?.healthCardId);
    const mem = getMem(card?.membershipId, memberships);

    setActiveReceiptToPrint({
      id: `rcp_lab_${booking.id}`,
      receiptNo: `REC-${booking.bookingNo}`,
      patientId: booking.patientId,
      patientName: booking.patientName,
      patientPhone: patient?.mobile,
      cardNo: card?.cardNumber,
      cardTier: mem.name,
      serviceType: 'Pathology',
      serviceDescription: `Diagnostic Pathology: ${booking.testName} (${booking.collectionType === 'home_collection' ? 'Home Sample Collection' : 'Lab Walk-in'})`,
      items: booking.items ? booking.items.map(i => ({ name: i.testName, price: i.netPrice })) : [{ name: booking.testName, price: booking.netPrice }],
      grossAmount: booking.grossPrice,
      discountAmount: booking.discountAmount,
      discountPercentage: booking.discountPercentage,
      netAmount: booking.netPrice,
      paymentMethod: 'Health Wallet (Prepaid Cashless)',
      date: booking.createdAt,
      status: 'Completed',
      referenceNo: booking.bookingNo
    });
  };

  const handlePrintPharmacyBill = (order: MedicineOrder) => {
    const patient = patients.find(p => p.id === order.patientId);
    const card = cards.find(c => c.patientId === order.patientId || c.id === patient?.healthCardId);
    const mem = getMem(card?.membershipId, memberships);

    setActiveReceiptToPrint({
      id: `rcp_phm_${order.id}`,
      receiptNo: `REC-${order.orderNo}`,
      patientId: order.patientId,
      patientName: order.patientName,
      patientPhone: order.patientPhone || patient?.mobile,
      cardNo: card?.cardNumber,
      cardTier: mem.name,
      serviceType: 'Pharmacy',
      serviceDescription: `e-Pharmacy Order (${order.items.length} Medicines Delivered via ${order.deliveryMode === 'express_home_delivery' ? 'Express Delivery' : 'Counter Pickup'})`,
      items: order.items.map(i => ({ name: `${i.medicineName} x ${i.quantity}`, price: i.totalPrice })),
      grossAmount: order.grossTotal,
      discountAmount: order.discountAmount,
      discountPercentage: order.discountPercentage,
      netAmount: order.netTotal,
      paymentMethod: 'Health Wallet (Prepaid Cashless)',
      date: order.createdAt,
      status: 'Completed',
      referenceNo: order.orderNo
    });
  };

  const handlePrintAppointmentBill = (apt: PatientAppointment) => {
    const patient = patients.find(p => p.id === apt.patientId);
    const card = cards.find(c => c.patientId === apt.patientId || c.id === patient?.healthCardId);
    const mem = getMem(card?.membershipId, memberships);
    const gross = apt.consultationFee / (1 - (mem.opdDiscount || 25) / 100);
    const discount = gross * ((mem.opdDiscount || 25) / 100);

    setActiveReceiptToPrint({
      id: `rcp_apt_${apt.id}`,
      receiptNo: `REC-${apt.appointmentNo}`,
      patientId: apt.patientId,
      patientName: apt.patientName,
      patientPhone: patient?.mobile,
      cardNo: card?.cardNumber,
      cardTier: mem.name,
      serviceType: 'Consultation',
      serviceDescription: `${apt.consultationMode === 'telemedicine_video' ? 'Telemedicine Video Consultation' : 'Hospital OPD Consultation'} with ${apt.doctorName} (${apt.department})`,
      grossAmount: gross,
      discountAmount: discount,
      discountPercentage: mem.opdDiscount || 25,
      netAmount: apt.consultationFee,
      paymentMethod: 'Health Wallet (Prepaid Cashless)',
      date: apt.patientWishDate || new Date().toISOString(),
      status: 'Completed',
      referenceNo: apt.appointmentNo
    });
  };

  const handlePrintPatientCardSlip = (patient: Patient) => {
    const card = cards.find(c => c.id === patient.healthCardId || c.patientId === patient.id);
    const mem = getMem(card?.membershipId, memberships);
    const wallet = wallets.find(w => w.patientId === patient.id);
    const regFee = mem.registrationFee || 500;
    const walletBal = wallet?.balance || 0;

    setActiveReceiptToPrint({
      id: `rcp_reg_${patient.id}`,
      receiptNo: `CARD-${card?.cardNumber || patient.id}`,
      patientId: patient.id,
      patientName: patient.fullName,
      patientPhone: patient.mobile,
      cardNo: card?.cardNumber,
      cardTier: mem.name,
      serviceType: 'General',
      serviceDescription: `CR80 PVC Smart Health Card Issuance & Membership Registration (${mem.name})`,
      items: [
        { name: `CR80 PVC Smart Card Issuance (${mem.name})`, price: regFee },
        { name: 'Initial Prepaid Health Wallet Float Allocation', price: walletBal },
        { name: '24x7 Digital Health Record (EMR) & QR Verification Setup', price: 0 }
      ],
      grossAmount: regFee + walletBal,
      discountAmount: 0,
      discountPercentage: 0,
      netAmount: regFee + walletBal,
      paymentMethod: 'Health Wallet (Prepaid Cashless)',
      walletClosingBalance: walletBal,
      date: patient.createdAt || new Date().toISOString(),
      status: 'Completed',
      referenceNo: card?.cardNumber || patient.id
    });
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const pendingLabs = labBookings.filter(b => b.status === 'confirmed' || b.status === 'phlebotomist_assigned').length;
    const pendingPhm = pharmacyOrders.filter(o => o.status === 'order_placed' || o.status === 'packed').length;
    const pendingOpd = appointments.filter(a => a.status === 'pending_doctor_approval' || a.status === 'doctor_confirmed').length;
    const pendingApps = cardApplications.filter(a => a.status === 'pending_approval').length;
    const totalPending = pendingLabs + pendingPhm + pendingOpd + pendingApps;

    const totalRevenue = labBookings.reduce((sum, b) => sum + b.netPrice, 0) +
                         pharmacyOrders.reduce((sum, o) => sum + o.netTotal, 0) +
                         appointments.reduce((sum, a) => sum + a.consultationFee, 0);

    return {
      totalPending,
      pendingLabs,
      pendingPhm,
      pendingOpd,
      pendingApps,
      totalRevenue,
      totalLabsCount: labBookings.length,
      totalPhmCount: pharmacyOrders.length,
      totalOpdCount: appointments.length,
      totalAppsCount: cardApplications.length
    };
  }, [labBookings, pharmacyOrders, appointments, cardApplications]);

  // Unified Request Model for 3D Feed
  interface UnifiedServiceRequest {
    id: string;
    type: 'lab' | 'pharmacy' | 'opd';
    refNo: string;
    patientId: string;
    patientName: string;
    title: string;
    subtitle: string;
    modeBadge: string;
    date: string;
    grossAmount: number;
    discountAmount: number;
    discountPercent: number;
    netAmount: number;
    status: string;
    statusBadgeVariant: 'warning' | 'info' | 'purple' | 'success';
    originalData: BloodTestBooking | MedicineOrder | PatientAppointment;
  }

  const unifiedRequests = useMemo(() => {
    const list: UnifiedServiceRequest[] = [];

    // 1. Labs
    labBookings.forEach(b => {
      let badgeVar: 'warning' | 'info' | 'purple' | 'success' = 'warning';
      if (b.status === 'phlebotomist_assigned') badgeVar = 'warning';
      else if (b.status === 'sample_collected') badgeVar = 'info';
      else if (b.status === 'processing') badgeVar = 'purple';
      else if (b.status === 'report_ready') badgeVar = 'success';

      list.push({
        id: b.id,
        type: 'lab',
        refNo: b.bookingNo,
        patientId: b.patientId,
        patientName: b.patientName,
        title: b.testName,
        subtitle: `${b.category} • ${b.fastingRequired ? '⚠️ Fasting Required' : 'Routine'}`,
        modeBadge: b.collectionType === 'home_collection' ? '🏠 Home Sample' : '🏥 Lab Visit',
        date: b.scheduledDate,
        grossAmount: b.grossPrice,
        discountAmount: b.discountAmount,
        discountPercent: b.discountPercentage,
        netAmount: b.netPrice,
        status: b.status,
        statusBadgeVariant: badgeVar,
        originalData: b
      });
    });

    // 2. Pharmacy
    pharmacyOrders.forEach(o => {
      let badgeVar: 'warning' | 'info' | 'purple' | 'success' = 'warning';
      if (o.status === 'packed') badgeVar = 'info';
      else if (o.status === 'out_for_delivery') badgeVar = 'purple';
      else if (o.status === 'delivered') badgeVar = 'success';

      list.push({
        id: o.id,
        type: 'pharmacy',
        refNo: o.orderNo,
        patientId: o.patientId,
        patientName: o.patientName,
        title: `${o.items.length} Medicines (${o.items[0]?.medicineName || 'Medicine Pack'}...)`,
        subtitle: `Deliver to: ${o.deliveryAddress}`,
        modeBadge: o.deliveryMode === 'express_home_delivery' ? '🚚 Express 2h Delivery' : '🏪 Counter Pickup',
        date: o.createdAt,
        grossAmount: o.grossTotal,
        discountAmount: o.discountAmount,
        discountPercent: o.discountPercentage,
        netAmount: o.netTotal,
        status: o.status,
        statusBadgeVariant: badgeVar,
        originalData: o
      });
    });

    // 3. OPD Appointments
    appointments.forEach(a => {
      let badgeVar: 'warning' | 'info' | 'purple' | 'success' = 'warning';
      if (a.status === 'doctor_confirmed') badgeVar = 'info';
      else if (a.status === 'in_consultation') badgeVar = 'purple';
      else if (a.status === 'completed') badgeVar = 'success';

      const mem = getMem(undefined, memberships);
      const gross = a.consultationFee / (1 - (mem.opdDiscount || 25) / 100);
      const discount = gross * ((mem.opdDiscount || 25) / 100);

      list.push({
        id: a.id,
        type: 'opd',
        refNo: a.appointmentNo,
        patientId: a.patientId,
        patientName: a.patientName,
        title: `Dr. ${a.doctorName} (${a.department})`,
        subtitle: `Complaint: ${a.chiefComplaint} • Slot: ${a.patientWishSlot}`,
        modeBadge: a.consultationMode === 'telemedicine_video' ? '📹 Telemedicine Video' : '🏥 Hospital OPD',
        date: a.patientWishDate || a.createdAt,
        grossAmount: gross,
        discountAmount: discount,
        discountPercent: mem.opdDiscount || 25,
        netAmount: a.consultationFee,
        status: a.status,
        statusBadgeVariant: badgeVar,
        originalData: a
      });
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [labBookings, pharmacyOrders, appointments, memberships]);

  // Filtered 3D Feed
  const filteredRequests = useMemo(() => {
    return unifiedRequests.filter(req => {
      // Type Filter
      if (serviceTypeFilter === 'labs' && req.type !== 'lab') return false;
      if (serviceTypeFilter === 'pharmacy' && req.type !== 'pharmacy') return false;
      if (serviceTypeFilter === 'opd' && req.type !== 'opd') return false;

      // Status Filter
      if (serviceStatusFilter === 'pending') {
        const isPending = req.status === 'confirmed' || req.status === 'order_placed' || req.status === 'pending_doctor_approval' || req.status === 'phlebotomist_assigned';
        if (!isPending) return false;
      } else if (serviceStatusFilter === 'in_progress') {
        const isInProgress = req.status === 'sample_collected' || req.status === 'processing' || req.status === 'packed' || req.status === 'out_for_delivery' || req.status === 'doctor_confirmed' || req.status === 'in_consultation';
        if (!isInProgress) return false;
      } else if (serviceStatusFilter === 'completed') {
        const isDone = req.status === 'report_ready' || req.status === 'delivered' || req.status === 'completed';
        if (!isDone) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          req.patientName.toLowerCase().includes(q) ||
          req.patientId.toLowerCase().includes(q) ||
          req.refNo.toLowerCase().includes(q) ||
          req.title.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [unifiedRequests, serviceTypeFilter, serviceStatusFilter, searchQuery]);

  // Filtered Master Patients List
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      if (showDeleted ? !p.isDeleted : p.isDeleted) return false;

      if (directoryBloodGroupFilter !== 'all' && p.bloodGroup !== directoryBloodGroupFilter) {
        return false;
      }

      if (directoryTierFilter !== 'all') {
        const card = cards.find(c => c.id === p.healthCardId || c.patientId === p.id);
        if (card?.membershipId !== directoryTierFilter) return false;
      }

      if (onlyPendingPrint) {
        const card = cards.find(c => c.id === p.healthCardId || c.patientId === p.id);
        if (!card) return false;
        const dispatch = cardDispatches.find(d => d.patientId === p.id || d.cardId === card.id);
        const printStatus = dispatch?.printStatus || 'printed';
        if (printStatus !== 'pending_print') return false;
      }

      if (directorySearchQuery.trim()) {
        const q = directorySearchQuery.toLowerCase();
        const card = cards.find(c => c.id === p.healthCardId || c.patientId === p.id);
        return (
          p.fullName.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.mobile.includes(q) ||
          p.bloodGroup.toLowerCase().includes(q) ||
          (card?.cardNumber && card.cardNumber.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [patients, showDeleted, directoryBloodGroupFilter, directoryTierFilter, directorySearchQuery, cards, cardDispatches, onlyPendingPrint]);

  // Directory Columns for Table View
  const directoryColumns: Column<Patient>[] = [
    {
      header: 'Patient Info',
      accessor: (p) => {
        const pendingForPatient = unifiedRequests.filter(r => r.patientId === p.id && (r.status === 'confirmed' || r.status === 'order_placed' || r.status === 'pending_doctor_approval' || r.status === 'phlebotomist_assigned'));
        const hasAlert = pendingForPatient.length > 0;

        return (
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={p.photoUrl || '/logo.jpg'}
                alt={p.fullName}
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
              />
              {hasAlert && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" />
              )}
              {hasAlert && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-black text-white">
                  {pendingForPatient.length}
                </span>
              )}
            </div>
            <div>
              <strong
                className="text-sm font-bold text-slate-900 dark:text-white block hover:text-teal-600 cursor-pointer"
                onClick={() => setQuickViewPatient(p)}
              >
                {p.fullName}
              </strong>
              <span className="text-xs font-mono text-slate-500">{p.id}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Contact & Demographics',
      accessor: (p) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">{p.mobile}</span>
          <span className="text-slate-500">{p.age} Y • {p.gender.toUpperCase()} • <strong className="text-rose-500">{p.bloodGroup}</strong></span>
        </div>
      )
    },
    {
      header: 'Health Card & Print Status',
      accessor: (p) => {
        const card = cards.find(c => c.id === p.healthCardId || c.patientId === p.id);
        const mem = getMem(card?.membershipId, memberships);
        const wallet = wallets.find(w => w.patientId === p.id);
        if (!card) return <span className="text-xs text-slate-400">No Active Card</span>;

        const dispatch = cardDispatches.find(d => d.patientId === p.id || d.cardId === card.id);
        const printStatus = dispatch?.printStatus || 'printed';
        const isPending = printStatus === 'pending_print';

        return (
          <div className="text-xs space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{card.cardNumber}</span>
              <button
                type="button"
                onClick={() => handleTogglePrintStatus(p, card)}
                title={isPending ? 'Click to mark card as Printed' : 'Card Printed. Click to toggle status.'}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono tracking-wider transition-all shadow-sm flex items-center gap-1 ${
                  isPending
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-600 animate-pulse'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-600'
                }`}
              >
                {isPending ? '🖨️ Pending Print' : '✅ Card Printed'}
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono inline-block"
                style={{ backgroundColor: (mem.color || '#0D9488') + '20', color: mem.color || '#0D9488' }}
              >
                {mem.name || 'Standard Gold'}
              </span>
              <span className="text-[10px] font-mono text-emerald-600 font-bold">
                ₹{wallet?.balance || 0}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Live Service Requests & Actions',
      accessor: (p) => {
        const patientReqs = unifiedRequests.filter(r => r.patientId === p.id);
        if (patientReqs.length === 0) {
          return <span className="text-xs text-slate-400 font-mono">No active requests</span>;
        }

        return (
          <div className="space-y-1.5 text-xs max-w-sm">
            {patientReqs.slice(0, 2).map((req, idx) => (
              <div
                key={idx}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="truncate text-[11px]">
                  <span className="font-bold text-slate-900 dark:text-white block truncate">
                    {req.type === 'lab' ? '🧪' : req.type === 'pharmacy' ? '💊' : '📅'} {req.title}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {req.refNo} • {req.modeBadge}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="p-1 h-7 text-[10px] font-bold"
                    title="Print Official Service Bill"
                    onClick={() => {
                      if (req.type === 'lab') handlePrintLabBill(req.originalData as BloodTestBooking);
                      else if (req.type === 'pharmacy') handlePrintPharmacyBill(req.originalData as MedicineOrder);
                      else handlePrintAppointmentBill(req.originalData as PatientAppointment);
                    }}
                  >
                    <Printer className="w-3 h-3 text-teal-500" />
                  </Button>

                  {req.type === 'lab' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="p-1 h-7 text-[10px] font-bold text-purple-600 border-purple-300 dark:border-purple-800"
                      title="Sample Dispatch / Phlebotomist Logistics"
                      onClick={() => setActiveBookingToDispatch(req.originalData as BloodTestBooking)}
                    >
                      <Truck className="w-3 h-3 text-purple-500" />
                    </Button>
                  )}

                  {req.type === 'lab' && req.status === 'confirmed' && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="p-1 h-7 text-[10px] font-bold bg-teal-600 hover:bg-teal-500"
                      onClick={() => handleAdvanceLabStatus(req.originalData as BloodTestBooking)}
                      title="Advance to Phlebotomist Assigned"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (p) => {
        const card = cards.find(c => c.id === p.healthCardId || c.patientId === p.id);
        const mem = getMem(card?.membershipId, memberships);

        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              title="Quick Summary Popup"
              onClick={() => setQuickViewPatient(p)}
            >
              <Eye className="w-4 h-4 text-teal-600" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              title="Deposit Real Money to Health Wallet"
              onClick={() => setActivePatientForTopUp(p)}
            >
              <WalletIcon className="w-4 h-4 text-emerald-600" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              title="Book Pathology Test / Package"
              onClick={() => setActivePatientForLabBooking(p)}
            >
              <TestTube className="w-4 h-4 text-blue-600" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              title="Order Medicine with Express Delivery"
              onClick={() => setActivePatientForMedicineOrder(p)}
            >
              <Pill className="w-4 h-4 text-amber-600" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              title="Print Official Registration & Health Card Slip"
              onClick={() => handlePrintPatientCardSlip(p)}
            >
              <Printer className="w-4 h-4 text-purple-600" />
            </Button>

            {can('patient_update') && !p.isDeleted && (
              <Button
                size="sm"
                variant="ghost"
                title="Edit Patient"
                onClick={() => navigate(`/patients/${p.id}/edit`)}
              >
                <Edit className="w-4 h-4 text-slate-600" />
              </Button>
            )}

            {can('card_read') && (
              <Button
                size="sm"
                variant="ghost"
                title="Open Card Studio"
                onClick={() => navigate(`/card-studio?patientId=${p.id}`)}
              >
                <CreditCard className="w-4 h-4 text-cyan-600" />
              </Button>
            )}

            {!p.healthCardId && (can('card_request_create') || can('card_create') || isSuperAdmin) && (
              <Button
                size="sm"
                variant="outline"
                className="text-[10px] h-7 px-2 font-bold bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                title="Request Health Card for this Patient"
                onClick={() => {
                  setPreselectedPatientId(p.id);
                  setIsCreateRequestModalOpen(true);
                }}
              >
                <CreditCard className="w-3.5 h-3.5 mr-1" />
                Request Card
              </Button>
            )}

            {can('patient_delete') && (
              p.isDeleted ? (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Restore Patient"
                    onClick={() => handleRestore(p.id, p.fullName)}
                  >
                    <RotateCcw className="w-4 h-4 text-emerald-600" />
                  </Button>
                  {isSuperAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Permanently Expunge Patient (Firestore & WAL)"
                      className="hover:bg-rose-500/10 text-rose-600 hover:text-rose-700"
                      onClick={() => handlePermanentDelete(p.id, p.fullName)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  title="Archive Patient"
                  onClick={() => handleSoftDelete(p.id, p.fullName)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              )
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* 1. TOP 3D GLASSMORPHIC HEADER & ACTION COMMAND BAR */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 sm:p-8 text-white border border-slate-700/80 shadow-2xl">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -top-16 w-64 h-64 rounded-full bg-emerald-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 p-0.5 shadow-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  Patient Directory & Live Cardholder Services
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-teal-500/20 text-teal-300 border border-teal-500/40">
                    3D Operations Hub
                  </span>
                </h1>
                <p className="text-xs text-slate-300">
                  Manage patient master records, approve live portal bookings, dispatch samples, and print official bills.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="p-1 rounded-2xl bg-slate-950/80 border border-slate-700 flex items-center gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveMainView('requests_command')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeMainView === 'requests_command'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Live Requests ({stats.totalPending - stats.pendingApps})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMainView('card_applications')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeMainView === 'card_applications'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Online Card Applications ({stats.pendingApps})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMainView('directory_table')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeMainView === 'directory_table'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Table View</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMainView('directory_grid')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeMainView === 'directory_grid'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Card Grid</span>
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={refreshList}
            >
              🔄 Refresh
            </Button>

            {(can('card_request_create') || can('card_create') || isSuperAdmin) && (
              <Button
                variant="outline"
                size="sm"
                className="border-amber-500/50 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 font-bold shadow-md flex items-center gap-1.5"
                onClick={() => {
                  setPreselectedPatientId(undefined);
                  setIsCreateRequestModalOpen(true);
                }}
              >
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Request Health Card</span>
              </Button>
            )}

            {can('patient_create') && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-indigo-500/50 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 font-bold shadow-md flex items-center gap-1.5"
                  onClick={() => navigate('/offline-form')}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Offline Form / Field Camp</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 font-bold shadow-lg"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => navigate('/patients/new')}
                >
                  Register Patient
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. 3D GLASSMORPHIC OPERATIONAL KPI COUNTERS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* KPI 1: Total Pending Actions */}
        <div
          onClick={() => {
            setActiveMainView('requests_command');
            setServiceStatusFilter('pending');
            setServiceTypeFilter('all');
          }}
          className="p-4 rounded-3xl bg-slate-900 border-2 border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer shadow-lg group relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider font-mono">Pending Actions</span>
            <AlertTriangle className="w-4 h-4 text-amber-400 animate-bounce" />
          </div>
          <div className="mt-2">
            <strong className="text-2xl font-black text-white font-mono block group-hover:scale-105 transition-transform">
              {stats.totalPending}
            </strong>
            <span className="text-[10px] text-slate-400">Cardholder requests awaiting response</span>
          </div>
        </div>

        {/* KPI 2: Online Card Applications */}
        <div
          onClick={() => setActiveMainView('card_applications')}
          className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-teal-400 transition-all cursor-pointer shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider font-mono">Card Requests</span>
            <CreditCard className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2">
            <strong className="text-2xl font-black text-white font-mono block group-hover:scale-105 transition-transform">
              {stats.totalAppsCount}
            </strong>
            <span className="text-[10px] text-teal-400 font-bold">{stats.pendingApps} Awaiting Approval</span>
          </div>
        </div>

        {/* KPI 3: Diagnostic Lab & Packages */}
        <div
          onClick={() => {
            setActiveMainView('requests_command');
            setServiceTypeFilter('labs');
          }}
          className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-cyan-500 transition-all cursor-pointer shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider font-mono">Diagnostic Labs</span>
            <TestTube className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <strong className="text-2xl font-black text-white font-mono block group-hover:scale-105 transition-transform">
              {stats.totalLabsCount}
            </strong>
            <span className="text-[10px] text-cyan-400 font-bold">{stats.pendingLabs} Pending Collection</span>
          </div>
        </div>

        {/* KPI 4: e-Pharmacy Medicine Deliveries */}
        <div
          onClick={() => {
            setActiveMainView('requests_command');
            setServiceTypeFilter('pharmacy');
          }}
          className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500 transition-all cursor-pointer shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider font-mono">e-Pharmacy</span>
            <Pill className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <strong className="text-2xl font-black text-white font-mono block group-hover:scale-105 transition-transform">
              {stats.totalPhmCount}
            </strong>
            <span className="text-[10px] text-emerald-400 font-bold">{stats.pendingPhm} Need Dispatch</span>
          </div>
        </div>

        {/* KPI 5: Doctor OPD Appointments */}
        <div
          onClick={() => {
            setActiveMainView('requests_command');
            setServiceTypeFilter('opd');
          }}
          className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-purple-500 transition-all cursor-pointer shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider font-mono">Doctor OPD</span>
            <CalendarCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <strong className="text-2xl font-black text-white font-mono block group-hover:scale-105 transition-transform">
              {stats.totalOpdCount}
            </strong>
            <span className="text-[10px] text-purple-400 font-bold">{stats.pendingOpd} Awaiting Slot</span>
          </div>
        </div>

        {/* KPI 6: Total Revenue Handled */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-teal-950 via-slate-900 to-slate-900 border border-teal-500/50 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider font-mono">Cashless Serviced</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <strong className="text-xl font-black text-emerald-400 font-mono block">
              {formatCurrency(stats.totalRevenue)}
            </strong>
            <span className="text-[10px] text-slate-400">Prepaid Health Wallet</span>
          </div>
        </div>
      </div>

      {/* 3. WORKSPACE VIEW 1: LIVE CARDHOLDER SERVICE REQUESTS COMMAND CENTER (3D VIEW) */}
      {activeMainView === 'requests_command' && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900 border border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              {/* Type Tabs */}
              <button
                type="button"
                onClick={() => setServiceTypeFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  serviceTypeFilter === 'all'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All Requests ({unifiedRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setServiceTypeFilter('labs')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  serviceTypeFilter === 'labs'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-slate-950 text-teal-400 hover:text-teal-300 border border-teal-500/30'
                }`}
              >
                <TestTube className="w-3.5 h-3.5" />
                <span>Pathology & Packages ({labBookings.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setServiceTypeFilter('pharmacy')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  serviceTypeFilter === 'pharmacy'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-950 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30'
                }`}
              >
                <Pill className="w-3.5 h-3.5" />
                <span>e-Pharmacy ({pharmacyOrders.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setServiceTypeFilter('opd')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  serviceTypeFilter === 'opd'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-950 text-purple-400 hover:text-purple-300 border border-purple-500/30'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Doctor OPD ({appointments.length})</span>
              </button>
            </div>

            {/* Status Tabs & Search */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setServiceStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    serviceStatusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'
                  }`}
                >
                  All Status
                </button>
                <button
                  type="button"
                  onClick={() => setServiceStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    serviceStatusFilter === 'pending' ? 'bg-amber-500 text-slate-950' : 'text-amber-400'
                  }`}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => setServiceStatusFilter('in_progress')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    serviceStatusFilter === 'in_progress' ? 'bg-blue-600 text-white' : 'text-blue-400'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setServiceStatusFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    serviceStatusFilter === 'completed' ? 'bg-emerald-600 text-white' : 'text-emerald-400'
                  }`}
                >
                  Done
                </button>
              </div>

              <div className="relative flex-1 md:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by Patient, Ref, Test..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* 3D Requests Live Grid */}
          {filteredRequests.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto animate-pulse" />
              <h3 className="text-base font-black text-white">All Clear! No Requests Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No active service requests match your selected filters. Switch to "All Requests" or check back when patients submit bookings.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setServiceTypeFilter('all');
                  setServiceStatusFilter('all');
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRequests.map((req) => {
                const patient = patients.find(p => p.id === req.patientId);
                const card = cards.find(c => c.patientId === req.patientId || c.id === patient?.healthCardId);
                const mem = getMem(card?.membershipId, memberships);

                return (
                  <div
                    key={`${req.type}_${req.id}`}
                    className={`p-5 rounded-3xl bg-slate-900 border-2 transition-all flex flex-col justify-between space-y-3 shadow-xl group hover:scale-[1.01] ${
                      req.status === 'confirmed' || req.status === 'order_placed' || req.status === 'pending_doctor_approval' || req.status === 'phlebotomist_assigned'
                        ? 'border-amber-500/50 hover:border-amber-400 bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/20'
                        : 'border-slate-800 hover:border-teal-500/50'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Ref No + Service Mode Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-slate-950 text-teal-400 border border-slate-700">
                          {req.refNo}
                        </span>

                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {req.modeBadge}
                        </span>
                      </div>

                      {/* Patient Details */}
                      <div className="flex items-center gap-3 mt-3">
                        <img
                          src={patient?.photoUrl || '/logo.jpg'}
                          alt=""
                          className="w-11 h-11 rounded-xl object-cover border border-slate-700 shadow-sm"
                        />
                        <div className="overflow-hidden">
                          <strong
                            className="text-sm font-black text-white block hover:text-teal-400 cursor-pointer truncate"
                            onClick={() => {
                              if (patient) setQuickViewPatient(patient);
                            }}
                          >
                            {req.patientName}
                          </strong>
                          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                            <span>{req.patientId}</span>
                            <span>•</span>
                            <span
                              className="px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase"
                              style={{ backgroundColor: (mem.color || '#0D9488') + '20', color: mem.color || '#0D9488' }}
                            >
                              {mem.name || 'Standard Gold'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Service Request Title & Details */}
                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1 mt-3">
                        <strong className="text-white block font-bold truncate">
                          {req.type === 'lab' ? '🔬' : req.type === 'pharmacy' ? '💊' : '🩺'} {req.title}
                        </strong>
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {req.subtitle}
                        </p>
                        <div className="flex justify-between text-[10.5px] text-amber-400 font-mono pt-1 border-t border-slate-800/80">
                          <span>Scheduled / Placed:</span>
                          <span>{formatDate(req.date)}</span>
                        </div>
                      </div>

                      {/* Cashless Benefit & Payment Bar */}
                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono space-y-0.5 mt-2">
                        <div className="flex justify-between text-slate-400">
                          <span>Standard Fee:</span>
                          <span>{formatCurrency(req.grossAmount)}</span>
                        </div>
                        <div className="flex justify-between text-teal-400 font-bold">
                          <span>Cardholder Benefit ({req.discountPercent}% OFF):</span>
                          <span>- {formatCurrency(req.discountAmount)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 font-bold border-t border-slate-800 pt-0.5">
                          <span>Net Cashless Paid:</span>
                          <span>{formatCurrency(req.netAmount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Action Controls Bar */}
                    <div className="pt-3 border-t border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-400">
                          Status: <strong className="text-white uppercase">{req.status.replace(/_/g, ' ')}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Action 1: Print Bill / Invoice */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-slate-700 text-teal-400 hover:bg-slate-800 text-[11px] font-bold"
                          leftIcon={<Printer className="w-3.5 h-3.5 text-teal-400" />}
                          onClick={() => {
                            if (req.type === 'lab') handlePrintLabBill(req.originalData as BloodTestBooking);
                            else if (req.type === 'pharmacy') handlePrintPharmacyBill(req.originalData as MedicineOrder);
                            else handlePrintAppointmentBill(req.originalData as PatientAppointment);
                          }}
                        >
                          Print Bill
                        </Button>

                        {/* Action 2: Lab Logistics / Tube Label */}
                        {req.type === 'lab' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full border-purple-500/40 text-purple-300 hover:bg-slate-800 text-[11px] font-bold"
                            leftIcon={<Truck className="w-3.5 h-3.5 text-purple-400" />}
                            onClick={() => setActiveBookingToDispatch(req.originalData as BloodTestBooking)}
                          >
                            Dispatch Lab
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full text-slate-300 hover:text-white text-[11px]"
                            onClick={() => {
                              if (patient) setQuickViewPatient(patient);
                            }}
                          >
                            View Patient →
                          </Button>
                        )}
                      </div>

                      {/* Primary Step-Advance Action Button */}
                      {req.type === 'lab' && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="primary"
                            className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 font-black text-xs shadow-md"
                            leftIcon={<Activity className="w-3.5 h-3.5" />}
                            onClick={() => handleAdvanceLabStatus(req.originalData as BloodTestBooking)}
                          >
                            {req.status === 'confirmed'
                              ? '🩸 Phlebotomist Assigned'
                              : req.status === 'phlebotomist_assigned'
                              ? '🧪 Mark Sample Collected'
                              : req.status === 'sample_collected'
                              ? '⚡ Start Diagnostic Processing'
                              : req.status === 'processing'
                              ? '✅ Generate & Mark Report Ready'
                              : '🔄 Re-verify Lab Status'}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="p-2 border-slate-700 text-purple-400 hover:bg-slate-800"
                            title="Print Vacutainer Tube Label"
                            onClick={() => setActiveLabelToPrint(req.originalData as BloodTestBooking)}
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}

                      {req.type === 'pharmacy' && (
                        <Button
                          size="sm"
                          variant="primary"
                          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 font-black text-xs shadow-md"
                          leftIcon={<Truck className="w-3.5 h-3.5" />}
                          onClick={() => handleAdvancePharmacyStatus(req.originalData as MedicineOrder)}
                        >
                          {req.status === 'order_placed'
                            ? '📦 Verify & Pack Medicines'
                            : req.status === 'packed'
                            ? '🚀 Dispatch for 2-Hour Express Delivery'
                            : req.status === 'out_for_delivery'
                            ? '✅ Confirm Doorstep Delivery'
                            : '🔄 Order Fulfilled'}
                        </Button>
                      )}

                      {req.type === 'opd' && (
                        <Button
                          size="sm"
                          variant="primary"
                          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 font-black text-xs shadow-md"
                          leftIcon={<Stethoscope className="w-3.5 h-3.5" />}
                          onClick={() => handleAdvanceAppointmentStatus(req.originalData as PatientAppointment)}
                        >
                          {req.status === 'pending_doctor_approval'
                            ? '📅 Confirm OPD Doctor Slot'
                            : req.status === 'doctor_confirmed'
                            ? '🩺 Call Patient / In-Consultation'
                            : req.status === 'in_consultation'
                            ? '✅ Complete Consultation'
                            : '🔄 Consultation Done'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. WORKSPACE VIEW 2: ONLINE HEALTH CARD APPLICATIONS APPROVAL QUEUE */}
      {activeMainView === 'card_applications' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900 border border-slate-800">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-400" />
                Online Health Card Self-Service Applications ({cardApplications.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Review applicant identity, verify cashless payments, approve to auto-mint CR80 PVC Cards & dispatch SMS/Email.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="warning" size="md">
                {stats.pendingApps} Pending Review
              </Badge>
            </div>
          </div>

          {cardApplications.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-base font-black text-white">No Pending Applications</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                All patient health card applications from the public portal have been processed and minted.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cardApplications.map((app) => (
                <div
                  key={app.id}
                  className={`p-5 rounded-3xl bg-slate-900 border-2 transition-all flex flex-col justify-between space-y-4 shadow-xl ${
                    app.status === 'pending_approval'
                      ? 'border-teal-500/50 bg-gradient-to-b from-slate-900 to-teal-950/20'
                      : app.status === 'approved'
                      ? 'border-emerald-500/30'
                      : 'border-rose-500/30'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-slate-950 text-teal-400 border border-slate-700">
                        {app.applicationNo}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono border ${
                        app.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : app.status === 'pending_approval'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}>
                        {app.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <img
                        src={app.photoUrl || '/logo.jpg'}
                        alt={app.fullName}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shadow-md"
                      />
                      <div>
                        <strong className="text-sm font-black text-white block">
                          {app.fullName}
                        </strong>
                        <span className="text-xs text-slate-400 font-mono">{app.mobile}</span>
                        <div className="text-[10px] text-slate-500">
                          {app.age} Y • {app.gender.toUpperCase()} • <strong className="text-rose-400">{app.bloodGroup}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Card Tier:</span>
                        <strong className="text-teal-400">{app.membershipName}</strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Initial Deposit:</span>
                        <strong className="text-emerald-400">₹{app.initialDeposit}</strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Total Paid:</span>
                        <strong className="text-white font-bold">{formatCurrency(app.totalPaidAmount)}</strong>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-800">
                        <span>Payment:</span>
                        <span className="text-amber-300">{app.paymentMethod}</span>
                      </div>
                    </div>

                    {app.status === 'approved' && app.approvedCardNumber && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-mono space-y-0.5">
                        <div className="text-emerald-300 font-bold">Issued Health Card:</div>
                        <div className="text-white font-bold text-xs">{app.approvedCardNumber}</div>
                        <div className="text-slate-400 text-[10px]">Patient ID: {app.approvedPatientId}</div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold"
                      onClick={() => setActiveApplicationToReview(app)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Review Details
                    </Button>

                    {app.status === 'pending_approval' && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 font-black text-xs shadow-md"
                        onClick={() => handleApproveApplication(app.id)}
                      >
                        ⚡ Mint Card
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. WORKSPACE VIEW 3: STANDARD PATIENT DIRECTORY (TABLE VIEW) */}
      {activeMainView === 'directory_table' && (
        <div className="space-y-4">
          {/* Advanced Multi-Filtering Bar */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                <Filter className="w-3.5 h-3.5 text-teal-500" />
                Filters:
              </div>

              {/* Blood Group Filter */}
              <select
                value={directoryBloodGroupFilter}
                onChange={(e) => setDirectoryBloodGroupFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-teal-500"
              >
                <option value="all">All Blood Groups</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>

              {/* Membership Tier Filter */}
              <select
                value={directoryTierFilter}
                onChange={(e) => setDirectoryTierFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-teal-500"
              >
                <option value="all">All Card Tiers</option>
                {memberships.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowDeleted(!showDeleted)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                  showDeleted
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {showDeleted ? 'Showing Archived' : 'Show Archived'}
              </button>

              <button
                onClick={() => setOnlyPendingPrint(!onlyPendingPrint)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 ${
                  onlyPendingPrint
                    ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md'
                    : 'bg-slate-950 text-amber-300 border-amber-500/40 hover:border-amber-500/80'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                {onlyPendingPrint ? 'Showing Pending Prints' : 'Pending Prints'}
                {cardDispatches.filter(d => d.printStatus === 'pending_print').length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-200 text-amber-900 font-black">
                    {cardDispatches.filter(d => d.printStatus === 'pending_print').length}
                  </span>
                )}
              </button>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Name, Phone, ID, Card..."
                value={directorySearchQuery}
                onChange={(e) => setDirectorySearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <DataTable
            data={filteredPatients}
            columns={directoryColumns}
            keyExtractor={(p) => p.id}
            searchPlaceholder="Search within filtered results..."
            emptyTitle={showDeleted ? 'Trash is empty' : 'No patients found'}
            emptyDescription="No registered patients match your selected filters. Register a new patient or reset filters."
          />
        </div>
      )}

      {/* 6. WORKSPACE VIEW 4: CARDHOLDER DIRECTORY (GRID VIEW) */}
      {activeMainView === 'directory_grid' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-teal-600" />
              Cardholder Profiles & Real-Time Beneficiaries ({filteredPatients.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map((p) => {
              const card = cards.find(c => c.id === p.healthCardId || c.patientId === p.id);
              const mem = getMem(card?.membershipId, memberships);
              const patientReqs = unifiedRequests.filter(r => r.patientId === p.id);
              const wallet = wallets.find(w => w.patientId === p.id);

              return (
                <div
                  key={p.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center gap-3.5 mb-4">
                      <img
                        src={p.photoUrl || '/logo.jpg'}
                        alt=""
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100 dark:border-slate-800 shadow-sm"
                      />
                      <div>
                        <h3
                          className="text-base font-black text-slate-900 dark:text-white uppercase cursor-pointer hover:text-teal-600"
                          onClick={() => setQuickViewPatient(p)}
                        >
                          {p.fullName}
                        </h3>
                        <span className="text-xs font-mono text-slate-400 block">{p.id}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="danger" size="sm">
                            <Heart className="w-3 h-3 fill-current" />
                            {p.bloodGroup}
                          </Badge>
                          <span className="text-[10px] text-slate-500">{p.age} Y • {p.gender.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs space-y-1.5 my-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Mobile:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{p.mobile}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Card No & Print:</span>
                        <div className="flex items-center gap-1.5">
                          <strong className="font-mono text-teal-600 dark:text-teal-400">{card?.cardNumber || 'N/A'}</strong>
                          {card && (() => {
                            const dispatch = cardDispatches.find(d => d.patientId === p.id || d.cardId === card.id);
                            const printStatus = dispatch?.printStatus || 'printed';
                            const isPending = printStatus === 'pending_print';
                            return (
                              <button
                                type="button"
                                onClick={() => handleTogglePrintStatus(p, card)}
                                title={isPending ? 'Click to mark card as Printed' : 'Card Printed. Click to toggle status.'}
                                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase font-mono tracking-wider transition-all ${
                                  isPending
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-600 animate-pulse'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-600'
                                }`}
                              >
                                {isPending ? '🖨️ Pending' : '✅ Printed'}
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Card Tier:</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono"
                          style={{ backgroundColor: (mem.color || '#0D9488') + '20', color: mem.color || '#0D9488' }}
                        >
                          {mem.name || 'Standard Gold'}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1">
                        <span className="text-slate-400">Wallet Float:</span>
                        <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                          {formatCurrency(wallet?.balance || 0)}
                        </strong>
                      </div>
                    </div>

                    {/* Active Live Requests on Card */}
                    {patientReqs.length > 0 && (
                      <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-xs space-y-1.5 my-2">
                        <div className="flex items-center justify-between text-amber-900 dark:text-amber-300 font-bold">
                          <span className="flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-amber-500" />
                            {patientReqs.length} Active Request(s)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                          {patientReqs[0].title}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] p-1 h-7 text-emerald-600"
                        title="Top Up Wallet"
                        onClick={() => setActivePatientForTopUp(p)}
                      >
                        <WalletIcon className="w-3 h-3 mr-1" />
                        Top-Up
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] p-1 h-7 text-blue-600"
                        title="Book Lab Test"
                        onClick={() => setActivePatientForLabBooking(p)}
                      >
                        <TestTube className="w-3 h-3 mr-1" />
                        Lab Test
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] p-1 h-7 text-purple-600"
                        title="Print Card Slip"
                        onClick={() => handlePrintPatientCardSlip(p)}
                      >
                        <Printer className="w-3 h-3 mr-1" />
                        Slip
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <Button size="sm" variant="outline" onClick={() => setQuickViewPatient(p)}>
                        Quick View
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/patients/${p.id}`)}>
                        Open Full Profile →
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. PATIENT QUICK-VIEW MODAL */}
      {quickViewPatient && (
        <PatientQuickViewModal
          isOpen={!!quickViewPatient}
          onClose={() => setQuickViewPatient(null)}
          patient={quickViewPatient}
          card={cards.find(c => c.id === quickViewPatient.healthCardId || c.patientId === quickViewPatient.id)}
          membership={getMem(cards.find(c => c.id === quickViewPatient?.healthCardId || c.patientId === quickViewPatient?.id)?.membershipId, memberships)}
          company={company}
        />
      )}

      {/* 8. OFFICIAL SERVICE BILL & VOUCHER PRINT MODAL */}
      {activeReceiptToPrint && (
        <PatientReceiptModal
          isOpen={!!activeReceiptToPrint}
          onClose={() => setActiveReceiptToPrint(null)}
          receipt={activeReceiptToPrint}
        />
      )}

      {/* 9. PHLEBOTOMY SAMPLE TUBE BARCODE LABEL PRINT MODAL */}
      {activeLabelToPrint && (
        <PhlebotomySampleLabelModal
          isOpen={!!activeLabelToPrint}
          onClose={() => setActiveLabelToPrint(null)}
          booking={activeLabelToPrint}
        />
      )}

      {/* 10. PHLEBOTOMY SAMPLE DISPATCH & LOGISTICS MODAL */}
      {activeBookingToDispatch && (
        <PhlebotomySampleDispatchModal
          isOpen={!!activeBookingToDispatch}
          onClose={() => setActiveBookingToDispatch(null)}
          booking={activeBookingToDispatch}
          onStatusUpdated={() => {
            refreshList();
          }}
          onOpenLabelPrinter={(b) => {
            setActiveLabelToPrint(b);
          }}
        />
      )}

      {/* 11. ONLINE CARD APPLICATION REVIEW & MINT MODAL */}
      {activeApplicationToReview && (
        <CardApplicationReviewModal
          isOpen={!!activeApplicationToReview}
          onClose={() => setActiveApplicationToReview(null)}
          application={activeApplicationToReview}
          onApproved={(newCard, newPatient) => {
            refreshList();
            if (newPatient) {
              setSearchQuery(newPatient.fullName || newPatient.id);
            }
            showToast('success', 'Patient & Health Card Activated', 'Card minted! Patient is now active in directory.');
          }}
          onRejected={() => {
            refreshList();
          }}
        />
      )}

      {/* 12. REAL MONEY HEALTH WALLET TOP-UP MODAL */}
      {activePatientForTopUp && (
        <PatientRealMoneyTopUpModal
          isOpen={!!activePatientForTopUp}
          onClose={() => setActivePatientForTopUp(null)}
          patient={activePatientForTopUp}
          wallet={wallets.find(w => w.patientId === activePatientForTopUp.id)}
          card={cards.find(c => c.id === activePatientForTopUp.healthCardId || c.patientId === activePatientForTopUp.id)}
          membership={getMem(cards.find(c => c.id === activePatientForTopUp.healthCardId || c.patientId === activePatientForTopUp.id)?.membershipId, memberships)}
          onSuccess={(receipt) => {
            refreshList();
            setActiveReceiptToPrint(receipt);
          }}
        />
      )}

      {/* 13. DIRECT LAB TEST & PACKAGE BOOKING MODAL */}
      {activePatientForLabBooking && (
        <DirectLabAndPackageBookingModal
          isOpen={!!activePatientForLabBooking}
          onClose={() => setActivePatientForLabBooking(null)}
          patient={activePatientForLabBooking}
          membership={getMem(cards.find(c => c.id === activePatientForLabBooking.healthCardId || c.patientId === activePatientForLabBooking.id)?.membershipId, memberships)}
          walletBalance={wallets.find(w => w.patientId === activePatientForLabBooking.id)?.balance || 0}
          onBookingSuccess={(booking, receipt) => {
            refreshList();
            if (receipt) {
              setActiveReceiptToPrint(receipt);
            }
          }}
        />
      )}

      {/* 14. DIRECT MEDICINE ORDER MODAL */}
      {activePatientForMedicineOrder && (
        <DirectMedicineOrderModal
          isOpen={!!activePatientForMedicineOrder}
          onClose={() => setActivePatientForMedicineOrder(null)}
          patient={activePatientForMedicineOrder}
          membership={getMem(cards.find(c => c.id === activePatientForMedicineOrder.healthCardId || c.patientId === activePatientForMedicineOrder.id)?.membershipId, memberships)}
          walletBalance={wallets.find(w => w.patientId === activePatientForMedicineOrder.id)?.balance || 0}
          onOrderSuccess={(order, receipt) => {
            refreshList();
            if (receipt) {
              setActiveReceiptToPrint(receipt);
            }
          }}
        />
      )}

      {/* 15. CREATE CARD REQUEST MODAL */}
      <CreateCardRequestModal
        isOpen={isCreateRequestModalOpen}
        onClose={() => {
          setIsCreateRequestModalOpen(false);
          setPreselectedPatientId(undefined);
        }}
        preselectedPatientId={preselectedPatientId}
        onRequestCreated={() => {
          refreshList();
        }}
      />
    </div>
  );
};