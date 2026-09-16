import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StorageService } from '../../services/storage';
import { EMRService, WaitingQueueItem } from '../../services/emrService';
import { ClinicalAIService, AIMedicineSuggestion, AILabTestSuggestion, AIDiagnosisProtocol } from '../../services/clinicalAIService';
import { PatientService } from '../../services/patientService';
import { ClinicalEncounter, PrescribedMedication, OrderedLabTest, ClinicalVitals, Patient, HealthCard, Membership, PatientAppointment, User } from '../../types';
import { PrescriptionPrintModal } from '../../components/emr/PrescriptionPrintModal';
import { TelemedicineVideoModal } from '../../components/emr/TelemedicineVideoModal';
import { QueuePrescriptionModal } from '../../components/emr/QueuePrescriptionModal';
import { LabReportPrintModal } from '../../components/emr/LabReportPrintModal';
import { PortalService, BloodTestBooking } from '../../services/portalService';
import { LabMedixLogo } from '../../components/common/LabMedixLogo';
import { DataTable, Column } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { triggerCelebrationFireworks } from '../../utils/confetti';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';
import {
  Stethoscope,
  Users,
  FileText,
  Activity,
  Plus,
  Printer,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Zap,
  Building2,
  UserCheck,
  HeartPulse,
  Pill,
  FlaskConical,
  Calendar,
  Layers,
  ChevronRight,
  Trash2,
  RotateCcw,
  ShieldCheck,
  ScanLine,
  Flame,
  Award,
  Eye,
  Bot,
  Wand2,
  Check,
  HelpCircle,
  Copy,
  Edit3,
  ChevronDown,
  Lock,
  ShieldAlert,
  Key,
  CalendarCheck,
  Clock3,
  Undo2,
  Save,
  CheckCheck,
  Video,
  PhoneCall,
  Wifi,
  Send,
  UserPlus,
  LogIn,
  CheckSquare,
  DollarSign,
  TrendingUp,
  Receipt,
  TestTube,
  Share2,
  AlertCircle
} from 'lucide-react';

export const DoctorEMRPage: React.FC = () => {
  const { currentUser, can, login } = useAuth();
  const { showToast } = useToast();

  // Role-Based Security Permissions (Doctor Exclusive)
  const isDoctor = currentUser?.role === 'doctor';
  const canEditRx = isDoctor || can('emr_edit');
  const canCreateEncounter = isDoctor || can('emr_create');

  // Active Doctor Metadata
  const activeDoctorName = currentUser?.fullName || 'Dr. Subhashish Roy';

  // EMR Core Records State (Doctor Specific Queue & Appointments)
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>(() => EMRService.getAllEncounters());
  const [waitingQueue, setWaitingQueue] = useState<WaitingQueueItem[]>(() => EMRService.getWaitingQueue(activeDoctorName));
  const [appointments, setAppointments] = useState<PatientAppointment[]>(() => EMRService.getAllAppointments());

  // 4 Core Clinical Suites (Rx Studio is default active suite)
  const [activeTab, setActiveTab] = useState<'rx_studio' | 'waiting_queue' | 'appointments_telemed' | 'records_archive'>('rx_studio');

  // Doctor Consultation Mode (In-Person OPD vs Remote Telemedicine)
  const [consultationMode, setConsultationMode] = useState<'physical_opd' | 'telemedicine_video'>('physical_opd');

  // Correction & Edit Prescription State
  const [editingEncounterId, setEditingEncounterId] = useState<string | null>(null);
  const [editingEncounterNo, setEditingEncounterNo] = useState<string | null>(null);
  const [correctionNotes, setCorrectionNotes] = useState<string>('');

  // Active Print, Telemedicine, Lab Report & Queue Prescription Modal States
  const [activePrintEncounter, setActivePrintEncounter] = useState<ClinicalEncounter | null>(null);
  const [activeTelemedAppointment, setActiveTelemedAppointment] = useState<PatientAppointment | null>(null);
  const [selectedQueueToken, setSelectedQueueToken] = useState<WaitingQueueItem | null>(null);
  const [activeLabReportToView, setActiveLabReportToView] = useState<BloodTestBooking | null>(null);

  // Appointment Filter State
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'physical_opd' | 'telemedicine_video' | 'pending' | 'confirmed'>('all');

  // Doctor Login Quick Modal
  const [showDoctorLoginModal, setShowDoctorLoginModal] = useState<boolean>(false);

  // Encounter Form State
  const patients = PatientService.getAll();
  const cards = StorageService.getCards();
  const memberships = StorageService.getMemberships();
  const company = StorageService.getCompanyProfile();
  const users = StorageService.getUsers();

  // Filter doctor accounts for quick switcher
  const doctorUsers = useMemo(() => {
    return users.filter(u => u.role === 'doctor');
  }, [users]);

  const [searchParams] = useSearchParams();
  const queryPatientId = searchParams.get('patientId');

  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    if (queryPatientId && patients.some(p => p.id === queryPatientId)) {
      return queryPatientId;
    }
    const initialQueue = EMRService.getWaitingQueue(activeDoctorName);
    return initialQueue[0]?.patientId || patients[0]?.id || '';
  });
  const [patientSearchTerm, setPatientSearchTerm] = useState<string>('');

  useEffect(() => {
    if (queryPatientId && queryPatientId !== selectedPatientId) {
      setSelectedPatientId(queryPatientId);
    }
  }, [queryPatientId]);

  // Auto-sync Doctor-Specific Queue and Appointments whenever Active Doctor switches
  useEffect(() => {
    const queue = EMRService.getWaitingQueue(activeDoctorName);
    setWaitingQueue(queue);
    if (!queryPatientId && queue.length > 0 && !queue.some(q => q.patientId === selectedPatientId)) {
      setSelectedPatientId(queue[0].patientId);
    }

    const handleSync = () => {
      setEncounters(EMRService.getAllEncounters());
      setWaitingQueue(EMRService.getWaitingQueue(activeDoctorName));
      setAppointments(EMRService.getAllAppointments());
    };
    window.addEventListener('labmedix_data_synced', handleSync as EventListener);
    return () => {
      window.removeEventListener('labmedix_data_synced', handleSync as EventListener);
    };
  }, [activeDoctorName, currentUser?.username]);

  const activeQueueItem = useMemo(() => {
    return waitingQueue.find(q => q.patientId === selectedPatientId) || waitingQueue[0];
  }, [waitingQueue, selectedPatientId]);

  // AI Medicine Search State
  const [aiMedQuery, setAiMedQuery] = useState<string>('');
  const [showAiMedDropdown, setShowAiMedDropdown] = useState<boolean>(false);

  // Custom Medicine Input Form Toggle
  const [showCustomMedModal, setShowCustomMedModal] = useState<boolean>(false);
  const [customMed, setCustomMed] = useState({
    name: '',
    composition: '',
    dosage: '1 Tab',
    frequency: '1-0-1 (Morning & Night)',
    timing: 'After Meals',
    duration: '7 Days',
    instructions: 'Take with water'
  });

  // AI Lab Test Search State
  const [aiLabQuery, setAiLabQuery] = useState<string>('');
  const [showAiLabDropdown, setShowAiLabDropdown] = useState<boolean>(false);

  // Active Row Popup State for inline editing
  const [activeDosePopupId, setActiveDosePopupId] = useState<string | null>(null);
  const [activeFreqPopupId, setActiveFreqPopupId] = useState<string | null>(null);
  const [activeDurationPopupId, setActiveDurationPopupId] = useState<string | null>(null);
  const [activeInstructionPopupId, setActiveInstructionPopupId] = useState<string | null>(null);

  // Vitals State
  const [vitals, setVitals] = useState<ClinicalVitals>({
    bpSystolic: 120,
    bpDiastolic: 80,
    pulseRate: 76,
    temperature: 98.4,
    spo2: 99,
    respiratoryRate: 16,
    bloodSugar: 110,
    weightKg: 70,
    heightCm: 170,
    bmi: '24.2'
  });

  // Auto-calculated BMI & BP classification
  const calculatedBmi = useMemo(() => {
    const height = vitals.heightCm || 0;
    const weight = vitals.weightKg || 0;
    if (height > 0 && weight > 0) {
      const heightInMeters = height / 100;
      const val = weight / (heightInMeters * heightInMeters);
      return val.toFixed(1);
    }
    return vitals.bmi || '24.2';
  }, [vitals.heightCm, vitals.weightKg, vitals.bmi]);

  const bpStatus = useMemo(() => {
    const sys = vitals.bpSystolic || 120;
    const dia = vitals.bpDiastolic || 80;
    if (sys >= 160 || dia >= 100) return { label: 'Stage 2 HTN', color: 'text-rose-600 bg-rose-100 dark:bg-rose-950 border-rose-400' };
    if (sys >= 140 || dia >= 90) return { label: 'Stage 1 HTN', color: 'text-amber-600 bg-amber-100 dark:bg-amber-950 border-amber-400' };
    if (sys >= 120 || dia >= 80) return { label: 'Pre-HTN', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950 border-yellow-400' };
    return { label: 'Normal BP', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950 border-emerald-400' };
  }, [vitals.bpSystolic, vitals.bpDiastolic]);

  // Clinical Notes & Diagnosis
  const [chiefComplaintsInput, setChiefComplaintsInput] = useState<string>('Exertional chest tightness x 2 weeks, Mild breathlessness');
  const [hpiInput, setHpiInput] = useState<string>('Patient reports retrosternal tightness on climbing stairs, relieved with 5 minutes rest.');
  const [examinationNotesInput, setExaminationNotesInput] = useState<string>('S1 S2 present, no murmurs. Bilateral vesicular breath sounds, no rales. No pedal edema.');
  const [diagnosisInput, setDiagnosisInput] = useState<string>('I20.9 - Angina Pectoris, I10 - Essential Hypertension');

  // Prescribed Medications State with Composition
  const [medications, setMedications] = useState<PrescribedMedication[]>([
    {
      id: 'med_1',
      name: 'Tab. Telmisartan + Amlodipine (Telma-AM)',
      composition: 'Telmisartan 40mg + Amlodipine 5mg',
      dosage: '40mg + 5mg',
      frequency: '1-0-0 (Morning)',
      timing: 'After Breakfast',
      duration: '30 Days',
      instructions: 'Take daily at fixed morning time. Monitor BP weekly.'
    },
    {
      id: 'med_2',
      name: 'Tab. Rosuvastatin (Rozavel 10)',
      composition: 'Rosuvastatin 10mg',
      dosage: '10mg',
      frequency: '0-0-1 (Night)',
      timing: 'After Dinner at Bedtime',
      duration: '30 Days',
      instructions: 'Take at bedtime for lipid & vascular protection'
    }
  ]);

  // Lab Orders State
  const [labOrders, setLabOrders] = useState<OrderedLabTest[]>([
    { id: 'lo_1', testName: 'Lipid Profile Comprehensive + Fasting Sugar', category: 'Biochemistry', urgency: 'routine', estimatedCost: 950 },
    { id: 'lo_2', testName: 'Digital 12-Lead ECG + 2D Echocardiography', category: 'Cardiology Imaging', urgency: 'routine', estimatedCost: 1800 }
  ]);

  // Dietary Advice State
  const [dietAdvice, setDietAdvice] = useState<string>(
    'Low salt DASH diet (<3g/day)\nAvoid deep fried foods & bakery products\n30 minutes brisk walking daily\nAvoid sudden physical strain & stress'
  );
  const [followUpDays, setFollowUpDays] = useState<number>(14);

  // Appointment & Patient Wish Scheduling State
  const [appointmentSlot, setAppointmentSlot] = useState<string>('Morning OPD (09:00 AM - 01:00 PM)');
  const [patientPreferredTime, setPatientPreferredTime] = useState<string>('10:30 AM');
  const [appointmentType, setAppointmentType] = useState<'routine_followup' | 'investigation_review' | 'emergency' | 'patient_wish'>('patient_wish');

  // Active Selected Patient Data
  const currentPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId) || patients[0];
  }, [patients, selectedPatientId]);

  const activeCard = useMemo(() => {
    if (!currentPatient) return null;
    return cards.find(c => c.patientId === currentPatient.id && c.status === 'active') || null;
  }, [cards, currentPatient]);

  const activeMembership = useMemo(() => {
    if (!activeCard) return null;
    return memberships.find(m => m.id === activeCard.membershipId) || null;
  }, [activeCard, memberships]);

  // Drug Allergy Alert Checker
  const patientAllergies = useMemo(() => {
    return ['Penicillin (Skin Rash)', 'Sulfa Drugs'];
  }, []);

  const hasAllergyConflict = useMemo(() => {
    return medications.some(m => {
      const name = (m.name + ' ' + (m.composition || '')).toLowerCase();
      return name.includes('penicillin') || name.includes('amoxicillin') || name.includes('augmentin') || name.includes('ampicillin');
    });
  }, [medications]);

  // Primary Doctor Appointment Tracker
  const primaryDoctorAppointment = useMemo(() => {
    if (!currentPatient) return null;
    const apts = appointments.filter(a => a.patientId === currentPatient.id);
    return apts.find(a => a.status !== 'completed') || apts[0] || null;
  }, [currentPatient, appointments]);

  const isCrossDoctorConsultation = useMemo(() => {
    if (!primaryDoctorAppointment || !currentUser?.fullName) return false;
    const docName = (currentUser.fullName || '').toLowerCase();
    const aptDoc = (primaryDoctorAppointment.doctorName || '').toLowerCase();
    return !aptDoc.includes(docName) && !docName.includes(aptDoc) &&
      !((docName.includes('roy') && aptDoc.includes('roy')) ||
        (docName.includes('sen') && aptDoc.includes('sen')) ||
        (docName.includes('das') && aptDoc.includes('das')));
  }, [primaryDoctorAppointment, currentUser]);

  // Filtered Appointments (Doctor Specific)
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      const aDoc = (apt.doctorName || '').toLowerCase();
      const curDoc = (currentUser?.fullName || '').toLowerCase();
      const matchesDoc = aDoc.includes(curDoc) || curDoc.includes(aDoc) ||
        (curDoc.includes('roy') && aDoc.includes('roy')) ||
        (curDoc.includes('sen') && aDoc.includes('sen')) ||
        (curDoc.includes('das') && aDoc.includes('das'));

      if (!matchesDoc && currentUser?.role === 'doctor') return false;

      if (appointmentFilter === 'physical_opd') return apt.consultationMode === 'physical_opd';
      if (appointmentFilter === 'telemedicine_video') return apt.consultationMode === 'telemedicine_video';
      if (appointmentFilter === 'pending') return apt.status === 'pending_doctor_approval';
      if (appointmentFilter === 'confirmed') return apt.status === 'doctor_confirmed';
      return true;
    });
  }, [appointments, appointmentFilter, currentUser]);

  // AI Filtered Medicine Suggestions
  const aiMedicineResults = useMemo(() => {
    return ClinicalAIService.searchMedicines(aiMedQuery);
  }, [aiMedQuery]);

  // AI Filtered Lab Test Suggestions
  const aiLabResults = useMemo(() => {
    return ClinicalAIService.searchLabTests(aiLabQuery);
  }, [aiLabQuery]);

  // AI Clinical Protocols
  const aiProtocols = useMemo(() => {
    return ClinicalAIService.getProtocols();
  }, []);

  // Quick Doctor Account Switch
  const handleQuickDoctorLogin = (username: string) => {
    const res = login(username);
    if (res.success) {
      const targetDoc = doctorUsers.find(d => d.username === username);
      const targetDocName = targetDoc?.fullName || 'Dr. Subhashish Roy';
      const queue = EMRService.getWaitingQueue(targetDocName);
      setWaitingQueue(queue);
      if (queue.length > 0) {
        setSelectedPatientId(queue[0].patientId);
      }
      setAppointments(EMRService.getAllAppointments());
      setEncounters(EMRService.getAllEncounters());
      triggerCelebrationFireworks();
      showToast('success', 'Attending Physician Activated', `Logged in as ${targetDocName}. OPD Chamber & Live Queue Activated.`);
      setShowDoctorLoginModal(false);
    } else {
      showToast('error', 'Login Failed', res.error);
    }
  };

  // Patient Card Search Auto-Lookup
  const handleCardPatientSearch = (term: string) => {
    setPatientSearchTerm(term);
    const q = term.trim().toLowerCase();
    if (!q) return;

    const matchedCard = cards.find(
      c => c.cardNumber.toLowerCase().includes(q) || c.verificationCode.toLowerCase().includes(q)
    );

    if (matchedCard) {
      const p = patients.find(pat => pat.id === matchedCard.patientId);
      if (p) setSelectedPatientId(p.id);
    } else {
      const p = patients.find(
        pat => pat.id.toLowerCase().includes(q) ||
               pat.fullName.toLowerCase().includes(q) ||
               (pat.mobile && pat.mobile.includes(q))
      );
      if (p) setSelectedPatientId(p.id);
    }
  };

  // 1-Click Standard Normal Vitals Loader
  const handleSetNormalVitals = () => {
    setVitals({
      bpSystolic: 120,
      bpDiastolic: 80,
      pulseRate: 74,
      temperature: 98.4,
      spo2: 99,
      respiratoryRate: 16,
      bloodSugar: 105,
      weightKg: 68,
      heightCm: 168,
      bmi: '24.1'
    });
    showToast('info', 'Standard Normal Vitals Applied', 'BP 120/80 mmHg, HR 74 bpm, Temp 98.4°F, SpO2 99%');
  };

  // 1-Click Symptom Chip Appender
  const handleAddSymptomChip = (symptom: string) => {
    if (!chiefComplaintsInput.trim()) {
      setChiefComplaintsInput(symptom);
    } else if (!chiefComplaintsInput.toLowerCase().includes(symptom.toLowerCase())) {
      setChiefComplaintsInput(`${chiefComplaintsInput}, ${symptom}`);
    }
  };

  // 1-Click HPI Sentence Appender
  const handleAddHpiChip = (text: string) => {
    if (!hpiInput.trim()) {
      setHpiInput(text);
    } else if (!hpiInput.toLowerCase().includes(text.toLowerCase())) {
      setHpiInput(`${hpiInput}. ${text}`);
    }
  };

  // 1-Click Systemic Exam Finding Appender
  const handleAddExamFinding = (finding: string) => {
    if (!examinationNotesInput.trim()) {
      setExaminationNotesInput(finding);
    } else if (!examinationNotesInput.toLowerCase().includes(finding.toLowerCase())) {
      setExaminationNotesInput(`${examinationNotesInput}. ${finding}`);
    }
  };

  // 1-Click Dietary Advice Appender
  const handleAddDietAdviceChip = (adv: string) => {
    if (!dietAdvice.includes(adv)) {
      setDietAdvice(prev => prev ? `${prev}\n• ${adv}` : `• ${adv}`);
    }
  };

  // 1-Click Diagnosis Chip Appender
  const handleAddDiagnosisChip = (diag: string) => {
    if (!diagnosisInput.trim()) {
      setDiagnosisInput(diag);
    } else if (!diagnosisInput.toLowerCase().includes(diag.toLowerCase())) {
      setDiagnosisInput(`${diagnosisInput}, ${diag}`);
    }
  };

  // Add Medicine from AI Suggestion
  const handleSelectAIMedicine = (med: AIMedicineSuggestion) => {
    if (!canEditRx) {
      showToast('error', 'Doctor Permission Required', 'Only Licensed Doctors can prescribe medications.');
      return;
    }
    const newMed: PrescribedMedication = {
      id: `med_${Date.now()}`,
      name: med.name,
      composition: med.generic,
      dosage: med.defaultDosage,
      frequency: med.defaultFrequency,
      timing: med.defaultTiming,
      duration: med.defaultDuration,
      instructions: med.instructions
    };
    setMedications([...medications, newMed]);
    setAiMedQuery('');
    setShowAiMedDropdown(false);
    showToast('success', 'AI Medicine Added', `Added ${med.name} (${med.generic}) to prescription.`);
  };

  // Add Custom Medicine
  const handleAddCustomMedicine = () => {
    if (!customMed.name.trim()) {
      showToast('error', 'Medicine Name Required', 'Please enter a medicine name.');
      return;
    }
    const newMed: PrescribedMedication = {
      id: `med_custom_${Date.now()}`,
      name: customMed.name.trim(),
      composition: customMed.composition.trim() || customMed.name.trim(),
      dosage: customMed.dosage,
      frequency: customMed.frequency,
      timing: customMed.timing,
      duration: customMed.duration,
      instructions: customMed.instructions
    };
    setMedications([...medications, newMed]);
    setShowCustomMedModal(false);
    setCustomMed({
      name: '',
      composition: '',
      dosage: '1 Tab',
      frequency: '1-0-1 (Morning & Night)',
      timing: 'After Meals',
      duration: '7 Days',
      instructions: 'Take with water'
    });
    showToast('success', 'Medication Added', `Added custom drug ${newMed.name}`);
  };

  // Add Lab Test from AI Suggestion
  const handleSelectAILabTest = (lab: AILabTestSuggestion) => {
    if (labOrders.some(l => l.testName === lab.testName)) {
      showToast('warning', 'Already Ordered', `${lab.testName} is already on the investigation list.`);
      return;
    }
    const newLab: OrderedLabTest = {
      id: `lab_${Date.now()}`,
      testName: lab.testName,
      category: lab.category,
      urgency: 'routine',
      estimatedCost: lab.estimatedCost
    };
    setLabOrders([...labOrders, newLab]);
    setAiLabQuery('');
    setShowAiLabDropdown(false);
    showToast('success', 'AI Lab Test Ordered', `Added ${lab.testName} (${lab.category}).`);
  };

  // Apply Full AI Clinical Protocol
  const handleApplyAIProtocol = (protocol: AIDiagnosisProtocol) => {
    if (!canEditRx) {
      showToast('error', 'Doctor Permission Required', 'Only Licensed Doctors can apply clinical prescription protocols.');
      return;
    }
    setDiagnosisInput(`${protocol.diagnosisCode} - ${protocol.diagnosisName}`);
    setChiefComplaintsInput(protocol.symptoms.join(', '));

    const generatedMeds: PrescribedMedication[] = protocol.recommendedMeds.map((m, idx) => ({
      id: `med_ai_${Date.now()}_${idx}`,
      name: m.name,
      composition: m.name.includes('(') ? m.name.split('(')[1]?.replace(')', '') : m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      timing: m.timing,
      duration: m.duration,
      instructions: m.instructions
    }));
    setMedications(generatedMeds);

    const generatedLabs: OrderedLabTest[] = protocol.recommendedLabs.map((l, idx) => ({
      id: `lab_ai_${Date.now()}_${idx}`,
      testName: l.testName,
      category: l.category,
      urgency: 'routine',
      estimatedCost: l.estimatedCost
    }));
    setLabOrders(generatedLabs);

    setDietAdvice(protocol.dietAndLifestyle.join('\n'));
    triggerCelebrationFireworks();
    showToast(
      'success',
      'AI Clinical Protocol Applied',
      `Auto-loaded evidence-based protocol for ${protocol.diagnosisName}.`
    );
  };

  // Update Medication Field
  const handleUpdateMedication = (id: string, updates: Partial<PrescribedMedication>) => {
    if (!canEditRx) {
      showToast('error', 'Permission Denied', 'Clinical dosage/frequency editing is restricted to doctors.');
      return;
    }
    setMedications(medications.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  // Duplicate Medication
  const handleDuplicateMedication = (med: PrescribedMedication) => {
    if (!canEditRx) {
      showToast('error', 'Permission Denied', 'Only doctors can add or modify prescribed medications.');
      return;
    }
    const duplicated: PrescribedMedication = {
      ...med,
      id: `med_dup_${Date.now()}`
    };
    setMedications([...medications, duplicated]);
    showToast('info', 'Medication Duplicated', `Created duplicate of ${med.name}`);
  };

  // Remove Medication
  const handleRemoveMedication = (id: string) => {
    if (!canEditRx) {
      showToast('error', 'Permission Denied', 'Only doctors can remove prescribed medications.');
      return;
    }
    setMedications(medications.filter(m => m.id !== id));
  };

  // Remove Lab Order
  const handleRemoveLabOrder = (id: string) => {
    setLabOrders(labOrders.filter(l => l.id !== id));
  };

  // Start Correction of an Existing Prescription
  const handleStartCorrection = (encounter: ClinicalEncounter) => {
    if (!canEditRx) {
      showToast('error', 'Permission Denied', 'Only Licensed Doctors can correct prescriptions.');
      return;
    }

    setEditingEncounterId(encounter.id);
    setEditingEncounterNo(encounter.encounterNo);
    setSelectedPatientId(encounter.patientId);
    setVitals(encounter.vitals || {
      bpSystolic: 120,
      bpDiastolic: 80,
      pulseRate: 76,
      temperature: 98.4,
      spo2: 99,
      respiratoryRate: 16,
      bloodSugar: 110,
      weightKg: 70,
      heightCm: 170,
      bmi: '24.2'
    });
    setChiefComplaintsInput(encounter.chiefComplaints.join(', '));
    setHpiInput(encounter.historyOfPresentIllness || '');
    setExaminationNotesInput(encounter.examinationNotes || '');
    setDiagnosisInput(encounter.diagnoses.join(', '));
    setMedications(encounter.medications || []);
    setLabOrders(encounter.labOrders || []);
    setDietAdvice(encounter.dietAndAdvice?.join('\n') || '');
    setFollowUpDays(encounter.followUpDays || 14);
    setAppointmentSlot(encounter.appointmentSlot || 'Morning OPD (09:00 AM - 01:00 PM)');
    setPatientPreferredTime(encounter.patientPreferredTime || '10:30 AM');
    setAppointmentType(encounter.appointmentType || 'patient_wish');
    setCorrectionNotes(encounter.correctionNotes || 'Prescription dosage & appointment updated per patient review.');

    setActiveTab('rx_studio');
    showToast('info', `Correcting ${encounter.encounterNo}`, `Loaded prescription for ${encounter.patientName} into editor.`);
  };

  // Cancel Correction Mode & Reset to New
  const handleCancelCorrection = () => {
    setEditingEncounterId(null);
    setEditingEncounterNo(null);
    setCorrectionNotes('');
    showToast('info', 'New Prescription Mode', 'Switched back to creating a new prescription.');
  };

  // Handle Complete & Save EMR Encounter (Create or Update Correction)
  const handleSaveAndPrintEncounter = () => {
    if (!currentPatient) {
      showToast('error', 'No Patient', 'Please select a patient first.');
      return;
    }

    if (!canCreateEncounter || (currentUser?.role !== 'doctor' && currentUser?.role !== 'super_admin')) {
      showToast('error', 'Doctor Authentication Required', 'Prescriptions can only be created and finalized by verified Medical Doctors. Front desk, cashiers, and other staff cannot issue prescriptions.');
      return;
    }

    const complaintsArray = chiefComplaintsInput.split(',').map(s => s.trim()).filter(Boolean);
    const diagnosesArray = diagnosisInput.split(',').map(s => s.trim()).filter(Boolean);
    const adviceArray = dietAdvice.split('\n').map(s => s.trim()).filter(Boolean);

    const doctorName = currentUser?.fullName || 'Dr. Subhashish Roy';
    const doctorRegNo = currentUser?.licenseNo || 'WBMC-88412';

    const followUpTargetDate = new Date(Date.now() + followUpDays * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const isUpdating = !!editingEncounterId;

    const savedEncounter = EMRService.saveEncounter({
      ...(isUpdating ? { id: editingEncounterId, encounterNo: editingEncounterNo || undefined } : {}),
      patientId: currentPatient.id,
      patientName: currentPatient.fullName,
      doctorId: currentUser?.id || 'usr_doctor',
      doctorName,
      doctorSpeciality: currentUser?.designation || 'Sr. Consultant Cardiologist & Medical Director',
      doctorRegNo,
      department: currentUser?.department || 'Cardiology OPD',
      date: new Date().toISOString(),
      chiefComplaints: complaintsArray.length ? complaintsArray : ['Clinical Evaluation'],
      historyOfPresentIllness: hpiInput,
      allergies: patientAllergies,
      chronicConditions: ['Essential Hypertension', 'Dyslipidemia'],
      vitals: {
        ...vitals,
        bmi: calculatedBmi
      },
      examinationNotes: examinationNotesInput,
      diagnoses: diagnosesArray.length ? diagnosesArray : ['Clinical Follow-up'],
      medications,
      labOrders,
      dietAndAdvice: adviceArray,
      followUpDays,
      followUpDate: followUpTargetDate,
      appointmentSlot,
      patientPreferredTime,
      appointmentType,
      correctionNotes: isUpdating ? (correctionNotes || 'Corrected per clinical review') : undefined,
      lastCorrectedAt: isUpdating ? new Date().toISOString() : undefined,
      status: isUpdating ? 'corrected' : 'completed'
    });

    triggerCelebrationFireworks();
    showToast(
      'success',
      isUpdating ? 'Prescription Corrected & Updated' : 'Prescription Generated & Saved',
      `Saved EMR record ${savedEncounter.encounterNo} with appointment slot (${appointmentSlot}) for ${currentPatient.fullName}.`
    );

    // Automatically dispatch diagnostic lab requisitions if investigations were ordered
    if (labOrders.length > 0) {
      PortalService.createDoctorPrescribedLabBooking({
        patientId: currentPatient.id,
        patientName: currentPatient.fullName,
        patientPhone: currentPatient.mobile,
        cardTier: activeMembership?.name || 'Gold Card',
        testNames: labOrders.map(l => l.testName),
        doctorName,
        encounterNo: savedEncounter.encounterNo,
        grossPrice: labOrders.reduce((sum, l) => sum + (l.estimatedCost || 600), 0),
        discountPercentage: activeMembership?.labDiscount || 25
      });
      showToast('info', '🧪 Lab Requisition Dispatched', `${labOrders.length} diagnostic test(s) sent to Central Pathology & Patient Portal.`);
    }

    setEncounters(EMRService.getAllEncounters());
    setActivePrintEncounter(savedEncounter);

    // Automatically transition queue token and appointment to completed
    setWaitingQueue(prev =>
      prev.map(q => q.patientId === currentPatient.id ? { ...q, status: 'completed' } : q)
    );
    setAppointments(prev =>
      prev.map(a => a.patientId === currentPatient.id ? { ...a, status: 'completed' } : a)
    );

    // Clear correction state
    if (isUpdating) {
      setEditingEncounterId(null);
      setEditingEncounterNo(null);
      setCorrectionNotes('');
    }
  };

  // WhatsApp Share Generator
  const handleShareOnWhatsApp = () => {
    if (!currentPatient) return;
    const phone = currentPatient.mobile ? currentPatient.mobile.replace(/\D/g, '') : '919876543210';
    const text = encodeURIComponent(
      `*LABMEDIX MULTI-SPECIALITY CENTRE - DIGITAL PRESCRIPTION*\n` +
      `-----------------------------------------\n` +
      `👨‍⚕️ *Doctor:* ${currentUser?.fullName || 'Dr. Subhashish Roy'} (${currentUser?.licenseNo || 'WBMC-88412'})\n` +
      `👤 *Patient:* ${currentPatient.fullName} (${currentPatient.id})\n` +
      `🩺 *Diagnosis:* ${diagnosisInput}\n` +
      `💊 *Medications Prescribed:* ${medications.length} items\n` +
      medications.map((m, i) => `  ${i + 1}. ${m.name} - ${m.dosage} [${m.frequency}] (${m.timing}) for ${m.duration}`).join('\n') +
      `\n🧪 *Investigations:* ${labOrders.map(l => l.testName).join(', ') || 'None'}\n` +
      `📅 *Next Follow-up:* In ${followUpDays} Days (${appointmentSlot})\n` +
      `-----------------------------------------\n` +
      `View verified report & card at: https://labmedix.org/portal`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    showToast('success', 'WhatsApp Link Generated', 'Opened WhatsApp dispatch for patient.');
  };

  // Launch Active Encounter from an Appointment
  const handleLaunchAppointmentRx = (apt: PatientAppointment) => {
    setSelectedPatientId(apt.patientId);
    setChiefComplaintsInput(apt.chiefComplaint);
    setConsultationMode(apt.consultationMode);
    setActiveTab('rx_studio');

    showToast(
      'success',
      `Prescription Studio Ready`,
      `Loaded ${apt.patientName} (${apt.consultationMode === 'telemedicine_video' ? '🌐 Telemedicine' : '🏥 Physical OPD'}) into Clinical Suite.`
    );
  };

  // Doctor Confirms an Appointment Slot
  const handleDoctorConfirmAppointment = (apt: PatientAppointment) => {
    const updated = EMRService.confirmAppointmentByDoctor(
      apt.id,
      apt.patientWishSlot,
      apt.patientWishTime,
      `Doctor Approved Slot: ${apt.patientWishSlot} at ${apt.patientWishTime}`
    );
    if (updated) {
      setAppointments(EMRService.getAllAppointments());
      triggerCelebrationFireworks();
      showToast('success', 'Doctor Slot Confirmed', `Confirmed ${apt.appointmentNo} for ${apt.patientName}.`);
    }
  };

  // Next waiting patient helper in doctor queue
  const nextWaitingPatient = useMemo(() => {
    return waitingQueue.find(q => (q.status === 'waiting' || q.status === 'next_up') && q.patientId !== selectedPatientId) ||
           waitingQueue.find(q => q.status === 'waiting' || q.status === 'next_up') || null;
  }, [waitingQueue, selectedPatientId]);

  // Call patient in queue & launch active clinical encounter with audio/speech token announcement
  const announceTokenCall = (tokenNo: number, patientName: string) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        [659.25, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.15);
          gain.gain.setValueAtTime(0.2, now + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.15);
          osc.stop(now + i * 0.15 + 0.4);
        });
      }

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
          `Token number ${tokenNo}, ${patientName}, please proceed to OPD chamber.`
        );
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Audio or SpeechSynthesis fallback
    }
  };

  // Call patient in queue & launch active clinical encounter with fresh state
  const handleCallQueuePatient = (item: WaitingQueueItem) => {
    announceTokenCall(item.tokenNo, item.patientName);

    setWaitingQueue(prev =>
      prev.map(q => ({
        ...q,
        status: q.tokenNo === item.tokenNo ? 'in_consultation' : (q.status === 'in_consultation' ? 'completed' : q.status)
      }))
    );

    setSelectedPatientId(item.patientId);
    setChiefComplaintsInput(item.chiefComplaint || '');
    setHpiInput('');
    setExaminationNotesInput('');
    setDiagnosisInput('');
    setMedications([]);
    setLabOrders([]);
    setDietAdvice('Drink adequate water\nMaintain balanced diet\nTake prescribed medicines regularly');
    setFollowUpDays(14);
    setAppointmentSlot('Morning OPD (09:00 AM - 01:00 PM)');
    setPatientPreferredTime('10:30 AM');
    setEditingEncounterId(null);
    setEditingEncounterNo(null);
    setCorrectionNotes('');
    setConsultationMode('physical_opd');
    setActiveTab('rx_studio');

    triggerCelebrationFireworks();
    showToast(
      'success',
      `🎯 Token #${item.tokenNo} IN CONSULTATION`,
      `${item.patientName} called to OPD chamber. Ready to prescribe.`
    );
  };

  // 1-Click Call Next Waiting Patient in Line
  const handleCallNextWaitingPatient = () => {
    if (nextWaitingPatient) {
      handleCallQueuePatient(nextWaitingPatient);
    } else {
      showToast('info', 'OPD Queue Complete', 'All waiting patients for this session have been consulted.');
    }
  };

  // DataTable columns for EMR Archive
  const recordColumns: Column<ClinicalEncounter>[] = [
    {
      header: 'Encounter No & Date',
      accessor: (e) => (
        <div>
          <strong className="font-mono text-xs text-slate-900 dark:text-white block">{e.encounterNo}</strong>
          <span className="font-mono text-[10px] text-slate-400">{formatDateTime(e.date)}</span>
        </div>
      )
    },
    {
      header: 'Patient Details',
      accessor: (e) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-600/20 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-xs shrink-0 border border-teal-500/30">
            {e.patientName.charAt(0)}
          </div>
          <div className="text-xs">
            <strong className="text-slate-900 dark:text-white block">{e.patientName}</strong>
            <span className="text-[10px] text-slate-500 font-mono">{e.patientId}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Primary Diagnoses',
      accessor: (e) => (
        <div className="text-xs max-w-xs truncate">
          <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{e.diagnoses.join(', ')}</span>
          <span className="text-[10px] text-slate-400">{e.medications.length} Meds • {e.labOrders.length} Labs</span>
        </div>
      )
    },
    {
      header: 'Next Appointment Wish',
      accessor: (e) => (
        <div className="text-xs font-mono">
          <span className="text-amber-600 font-bold block">{formatDate(e.followUpDate || '')}</span>
          <span className="text-[10px] text-slate-500">{e.appointmentSlot ? e.appointmentSlot.split(' (')[0] : 'Morning OPD'} • {e.patientPreferredTime || '10:30 AM'}</span>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (e) => (
        <Badge variant={e.status === 'corrected' ? 'info' : e.status === 'completed' ? 'success' : 'warning'} size="sm">
          {e.status === 'corrected' ? 'CORRECTED / UPDATED' : e.status.toUpperCase()}
        </Badge>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (e) => (
        <div className="flex items-center justify-end gap-1.5">
          {canEditRx && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Edit3 className="w-3.5 h-3.5 text-amber-500" />}
              onClick={() => handleStartCorrection(e)}
              title="Edit & Correct Prescription"
            >
              Correct
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Printer className="w-3.5 h-3.5" />}
            onClick={() => setActivePrintEncounter(e)}
          >
            Print Rx
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. TOP DOCTOR CLINICAL COMMAND BAR */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 sm:p-8 text-white border border-slate-700/80 shadow-2xl">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -top-16 w-64 h-64 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <LabMedixLogo logoUrl={company.logoUrl} variant="monogram" size="lg" theme="white" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <Stethoscope className="w-6 h-6 text-teal-400" />
                  Doctor EMR, OPD & Professional Prescription Suite
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-300 border border-teal-400/40 uppercase tracking-widest flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  LICENSED PHYSICIAN CLINICAL DESK
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Evidence-based prescribing with under-name generic compositions, rapid dosage matrix, bilingual (বাংলা ও ইংরেজি) A4 prescription pad, and patient-wish appointment follow-ups.
              </p>
            </div>
          </div>

          {/* Quick Doctor Login & Fast Role Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="border-teal-400/60 text-teal-300 hover:bg-teal-950 font-bold"
              leftIcon={<LogIn className="w-3.5 h-3.5 text-teal-400" />}
              onClick={() => setShowDoctorLoginModal(true)}
            >
              👨‍⚕️ Switch Doctor Profile
            </Button>

            <Button
              variant="primary"
              size="sm"
              className="bg-gradient-to-r from-amber-500 via-teal-400 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-slate-950 font-black border-none shadow-lg shadow-amber-500/20"
              leftIcon={<Wand2 className="w-4 h-4 text-slate-950" />}
              onClick={() => {
                handleCancelCorrection();
                setActiveTab('rx_studio');
              }}
            >
              ✨ New Prescription (Rx)
            </Button>
          </div>
        </div>

        {/* Doctor Information Strip with License Badge & OPD/Telemed Counters */}
        <div className="mt-6 pt-4 border-t border-slate-700/60 flex flex-wrap items-center justify-between text-xs text-slate-300 font-mono gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-teal-400 font-bold">Attending Physician:</span>
            <strong className="text-white">{currentUser?.fullName || 'Dr. Subhashish Roy'}</strong>
            <span className="text-teal-300 font-bold bg-teal-950 px-2 py-0.5 rounded border border-teal-500/40">
              MCI/WBMC: {currentUser?.licenseNo || 'WBMC-88412'}
            </span>
            <span className="text-slate-400 hidden sm:inline">• {currentUser?.department || 'Cardiology OPD Room #104'}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              OPD Queue: <strong className="text-teal-300">{waitingQueue.length}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Video className="w-3.5 h-3.5 text-purple-400" />
              Telemed: <strong className="text-purple-300">{appointments.filter(a => a.consultationMode === 'telemedicine_video').length}</strong>
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Prescriptions: <strong className="text-emerald-300">{encounters.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. 4 CORE CLINICAL TABS */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto text-xs font-bold">
        {[
          { id: 'rx_studio' as const, name: `🩺 Live Prescription Studio (Rx)`, icon: Stethoscope },
          { id: 'waiting_queue' as const, name: `👥 OPD Waiting Queue (${waitingQueue.length})`, icon: Users },
          { id: 'appointments_telemed' as const, name: `📅 Appointments & Telemed (${appointments.length})`, icon: CalendarCheck },
          { id: 'records_archive' as const, name: `📜 EMR Records & Rx Archive (${encounters.length})`, icon: FileText }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-teal-600 text-white shadow-md font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* 3. TAB 1: CLINICAL PRESCRIPTION STUDIO (UPGRADED PROFESSIONAL RX ENGINE) */}
      {activeTab === 'rx_studio' && (
        <div className="space-y-6">
          {/* CONSULTATION MODE SWITCHER: IN-PERSON OPD VS TELEMEDICINE */}
          <div className="p-3 rounded-2xl bg-slate-900 text-white border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                Consultation Channel:
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider" style={{
                backgroundColor: consultationMode === 'telemedicine_video' ? '#8B5CF6' : '#0D9488',
                color: '#FFF'
              }}>
                {consultationMode === 'telemedicine_video' ? '🌐 Live HD Telemedicine Video' : '🏥 In-Person Physical OPD (Room #104)'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setConsultationMode('physical_opd')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  consultationMode === 'physical_opd'
                    ? 'bg-teal-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                🏥 Physical OPD
              </button>
              <button
                type="button"
                onClick={() => setConsultationMode('telemedicine_video')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  consultationMode === 'telemedicine_video'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                🌐 Telemedicine Video
              </button>
            </div>
          </div>

          {/* CORRECTION / EDIT MODE BANNER */}
          {editingEncounterId && (
            <div className="p-4 rounded-3xl bg-amber-500/15 border-2 border-amber-500/60 text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <Edit3 className="w-6 h-6 text-amber-600 shrink-0 animate-bounce" />
                <div>
                  <strong className="block text-xs font-black uppercase tracking-wide text-amber-900 dark:text-amber-100">
                    ✏️ PRESCRIPTION CORRECTION & REVISION MODE ({editingEncounterNo})
                  </strong>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    You are revising an existing prescription for <strong>{currentPatient?.fullName}</strong>. Modifications will be saved with a timestamped clinical audit trail.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={handleCancelCorrection} className="shrink-0 border-amber-500 text-amber-900 dark:text-amber-200 hover:bg-amber-100">
                Cancel Revision / Create New Rx
              </Button>
            </div>
          )}

          {/* 1-CLICK CLINICAL DISEASE PROTOCOLS PRESETS */}
          <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-teal-950 text-white border border-purple-500/40 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-purple-400 animate-pulse" />
                ⚡ 1-Click Evidence-Based Clinical Protocols & Rx Templates
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Auto-populates diagnosis, standard guideline drugs & investigations
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {aiProtocols.map((p) => (
                <button
                  key={p.diagnosisCode}
                  type="button"
                  onClick={() => handleApplyAIProtocol(p)}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all bg-slate-900/90 border-purple-500/40 text-purple-200 hover:bg-purple-600 hover:text-white"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>{p.diagnosisName.split(' (')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ACTIVE OPD CONSULTATION TOKEN & APPOINTMENT BANNER */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3.5 py-1 bg-teal-600 text-white font-mono font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  TOKEN #{activeQueueItem?.tokenNo || '101'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  CONFIRMED TOKEN • IN CONSULTATION
                </span>
                <span className="text-xs text-teal-400 font-mono font-bold bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                  {activeQueueItem?.opdRoom || currentUser?.workPhone || 'OPD Room #104'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Attending: <strong className="text-white">{currentUser?.fullName || 'Dr. Subhashish Roy'}</strong>
                </span>
              </div>

              {/* Waiting Queue Token Quick Switcher & Call Next Action */}
              <div className="flex flex-wrap items-center gap-2">
                {nextWaitingPatient && (
                  <Button
                    size="sm"
                    variant="primary"
                    className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black shadow-md animate-pulse"
                    leftIcon={<Sparkles className="w-3.5 h-3.5 text-slate-950" />}
                    onClick={handleCallNextWaitingPatient}
                  >
                    📢 Call Next (Token #{nextWaitingPatient.tokenNo})
                  </Button>
                )}

                <span className="text-[11px] text-slate-500 font-bold hidden sm:inline">Token Queue:</span>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  {waitingQueue.map((q) => (
                    <option key={q.tokenNo} value={q.patientId}>
                      Token #{q.tokenNo}: {q.patientName} ({q.cardTier}) [{q.status.toUpperCase()}]
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Users className="w-3.5 h-3.5 text-teal-600" />}
                  onClick={() => setActiveTab('waiting_queue')}
                >
                  Queue ({waitingQueue.filter(q => q.status === 'waiting').length} Waiting)
                </Button>
              </div>
            </div>

            {/* Cross-Doctor Booking Alert (when viewing patient booked with another physician) */}
            {isCrossDoctorConsultation && primaryDoctorAppointment && (
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/50 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Primary Appointment:</strong> This patient is scheduled with <strong className="text-white">{primaryDoctorAppointment.doctorName}</strong> ({primaryDoctorAppointment.department}).
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400 text-amber-300 hover:bg-amber-950/60 text-[11px] font-bold"
                  onClick={() => {
                    const match = doctorUsers.find(d =>
                      d.fullName.toLowerCase().includes(primaryDoctorAppointment.doctorName.toLowerCase()) ||
                      primaryDoctorAppointment.doctorName.toLowerCase().includes(d.fullName.toLowerCase())
                    );
                    if (match) {
                      handleQuickDoctorLogin(match.username);
                    }
                  }}
                >
                  Switch to {primaryDoctorAppointment.doctorName.split(' ')[1] || 'Doctor'}
                </Button>
              </div>
            )}

            {/* Patient Clinical Bio Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-slate-50 to-slate-50 dark:from-teal-950/40 dark:via-slate-800/60 dark:to-slate-800/60 border border-teal-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white font-black text-lg flex items-center justify-center shadow-md shrink-0">
                  {currentPatient?.photoUrl ? (
                    <img src={currentPatient.photoUrl} alt={currentPatient.fullName} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    currentPatient?.fullName.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-base font-black text-slate-900 dark:text-white">
                      {currentPatient?.fullName}
                    </strong>
                    {activeMembership && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 dark:bg-amber-950 border border-amber-300">
                        {activeMembership.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    UHID: <strong>{currentPatient?.id}</strong> • Age: <strong>{currentPatient?.age || 54} Yrs</strong> • Gender: <strong>{currentPatient?.gender || 'Male'}</strong> • Blood: <strong className="text-rose-600">{currentPatient?.bloodGroup || 'B+'}</strong> • Card: <strong className="text-teal-600">{activeCard?.cardNumber || 'LHC-Active'}</strong>
                  </p>
                </div>
              </div>

              {/* Cardholder Privileges */}
              <div className="flex items-center gap-2 font-mono text-xs">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[9px] text-slate-400 uppercase block font-bold">OPD / Consultation</span>
                  <strong className="text-teal-600">{activeMembership?.opdDiscount || 20}% OFF</strong>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[9px] text-slate-400 uppercase block font-bold">Lab Pathology</span>
                  <strong className="text-purple-600">{activeMembership?.labDiscount || 25}% OFF</strong>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[9px] text-slate-400 uppercase block font-bold">Pharmacy Drugs</span>
                  <strong className="text-emerald-600">{activeMembership?.pharmacyDiscount || 15}% OFF</strong>
                </div>
              </div>
            </div>

            {/* DRUG ALLERGY WARNING BANNER */}
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-bold text-rose-900 dark:text-rose-200">
                  Known Drug Allergies:
                </span>
                <div className="flex items-center gap-1.5">
                  {patientAllergies.map(a => (
                    <span key={a} className="px-2 py-0.5 rounded-md bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 font-mono font-bold text-[10px]">
                      ⚠️ {a}
                    </span>
                  ))}
                </div>
              </div>
              {hasAllergyConflict && (
                <span className="px-2.5 py-1 rounded-xl bg-rose-600 text-white font-bold text-[10px] animate-pulse">
                  🚨 CONTRADICTION DETECTED IN RX
                </span>
              )}
            </div>
          </div>

          {/* 1. PATIENT CLINICAL VITALS & TRIAGE (AUTO BMI) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    Patient Clinical Vitals & Triage
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                      Auto BMI: {calculatedBmi} kg/m²
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Live hemodynamic assessment, automatic triage classification & BMI calculator</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-teal-400 text-teal-700 dark:text-teal-300 hover:bg-teal-50 text-[11px] font-bold"
                  leftIcon={<Sparkles className="w-3.5 h-3.5 text-teal-600" />}
                  onClick={handleSetNormalVitals}
                >
                  ⚡ Standard Normal Vitals (120/80, 74 bpm, 98.4°F)
                </Button>
                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wider ${bpStatus.color}`}>
                  {bpStatus.label}
                </span>
              </div>
            </div>

            {/* 8 Modern Telemetry Input Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs font-mono">
              {/* BP Systolic */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>BP Systolic</span>
                  <span className="text-[9px] text-teal-600">mmHg</span>
                </div>
                <input
                  type="number"
                  value={vitals.bpSystolic}
                  onChange={(e) => setVitals({ ...vitals, bpSystolic: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-center text-sm"
                />
                <span className="text-[9px] text-slate-500 block text-center truncate">Target: 110-125</span>
              </div>

              {/* BP Diastolic */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>BP Diastolic</span>
                  <span className="text-[9px] text-teal-600">mmHg</span>
                </div>
                <input
                  type="number"
                  value={vitals.bpDiastolic}
                  onChange={(e) => setVitals({ ...vitals, bpDiastolic: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-center text-sm"
                />
                <span className="text-[9px] text-slate-500 block text-center truncate">Target: 70-85</span>
              </div>

              {/* Pulse Rate */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>Pulse Rate</span>
                  <HeartPulse className="w-3 h-3 text-rose-500" />
                </div>
                <input
                  type="number"
                  value={vitals.pulseRate}
                  onChange={(e) => setVitals({ ...vitals, pulseRate: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-center text-sm text-rose-600"
                />
                <span className="text-[9px] text-slate-500 block text-center">
                  {(vitals.pulseRate || 74) > 100 ? '⚡ Tachycardia' : (vitals.pulseRate || 74) < 60 ? '❄️ Bradycardia' : '✓ Normal Pulse'}
                </span>
              </div>

              {/* Temperature */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>Temp (°F)</span>
                  <span className="text-[9px] text-amber-500">🌡️</span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={vitals.temperature}
                  onChange={(e) => setVitals({ ...vitals, temperature: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-center text-sm text-amber-600"
                />
                <span className="text-[9px] text-slate-500 block text-center">
                  {(vitals.temperature || 98.4) >= 99.5 ? '🔥 Febrile' : '✓ Afebrile'}
                </span>
              </div>

              {/* SpO2 */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>SpO2 (%)</span>
                  <span className="text-[9px] text-teal-600">🫁</span>
                </div>
                <input
                  type="number"
                  value={vitals.spo2}
                  onChange={(e) => setVitals({ ...vitals, spo2: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-center text-sm text-teal-600"
                />
                <span className="text-[9px] text-slate-500 block text-center">
                  {(vitals.spo2 || 99) >= 95 ? '✓ Optimal SpO2' : '⚠️ Hypoxia Alert'}
                </span>
              </div>

              {/* Blood Glucose */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>RBS / FBS</span>
                  <span className="text-[9px] text-purple-600">mg/dL</span>
                </div>
                <input
                  type="number"
                  value={vitals.bloodSugar}
                  onChange={(e) => setVitals({ ...vitals, bloodSugar: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-center text-sm text-purple-600"
                />
                <span className="text-[9px] text-slate-500 block text-center">
                  {(vitals.bloodSugar || 110) >= 200 ? '⚠️ High Glucose' : (vitals.bloodSugar || 110) >= 140 ? '⚠️ Pre-diabetic' : '✓ Euglycemic'}
                </span>
              </div>

              {/* Weight */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>Weight (kg)</span>
                  <span className="text-[9px] text-slate-400">scale</span>
                </div>
                <input
                  type="number"
                  value={vitals.weightKg}
                  onChange={(e) => setVitals({ ...vitals, weightKg: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-center text-sm"
                />
                <span className="text-[9px] text-slate-500 block text-center">Height: {vitals.heightCm || 170} cm</span>
              </div>

              {/* Height & BMI Gauge */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>Height (cm)</span>
                  <span className="text-[9px] text-emerald-600 font-bold">BMI {calculatedBmi}</span>
                </div>
                <input
                  type="number"
                  value={vitals.heightCm}
                  onChange={(e) => setVitals({ ...vitals, heightCm: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-center text-sm"
                />
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block text-center truncate">
                  {parseFloat(calculatedBmi) >= 30 ? 'Obese Class' : parseFloat(calculatedBmi) >= 25 ? 'Overweight' : 'Normal Weight'}
                </span>
              </div>
            </div>
          </div>

          {/* 2 & 3 & 4. CHIEF COMPLAINTS, HPI, PHYSICAL EXAM & DIAGNOSIS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT: 2. Chief Complaints & 3. HPI */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              {/* Module 2: Chief Complaints & Symptoms */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    Chief Complaints & Symptoms
                  </label>
                  <span className="text-[10px] text-slate-400 font-bold">1-Click Clinical Symptom Presets</span>
                </div>

                {/* Categorized Symptom Chips */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase w-12 shrink-0">Cardio:</span>
                    {['Chest Pain', 'Palpitations', 'Dyspnea on Exertion', 'Orthopnea'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleAddSymptomChip(s)}
                        className="px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-600 hover:text-white text-[10px] font-bold text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 transition-colors"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase w-12 shrink-0">General:</span>
                    {['High Fever', 'Generalized Weakness', 'Loss of Appetite', 'Bodyache'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleAddSymptomChip(s)}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white text-[10px] font-medium text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase w-12 shrink-0">Resp/GI:</span>
                    {['Dry Cough', 'Sore Throat', 'Acid Reflux / Heartburn', 'Abdominal Pain', 'Loose Stools'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleAddSymptomChip(s)}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white text-[10px] font-medium text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>

                  {/* Duration Presets */}
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <span className="text-[9.5px] font-bold text-amber-600 dark:text-amber-400 uppercase w-12 shrink-0">Duration:</span>
                    {['x 2 Days', 'x 5 Days', 'x 1 Week', 'x 2 Weeks', 'x 1 Month'].map(dur => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setChiefComplaintsInput(prev => `${prev} ${dur}`)}
                        className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-600 hover:text-white font-mono text-[9.5px] font-bold border border-amber-300"
                      >
                        {dur}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={chiefComplaintsInput}
                  onChange={(e) => setChiefComplaintsInput(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 font-medium"
                  placeholder="e.g. Exertional retrosternal chest pain x 2 weeks, Mild breathlessness, Palpitations"
                />
              </div>

              {/* Module 3: History of Present Illness (HPI) & Background */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    History of Present Illness (HPI) & Background
                  </label>
                  <span className="text-[10px] text-slate-400 font-bold">1-Click Clinical Starters</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {[
                    'Sudden onset with exertion, relieved by rest',
                    'Gradual progressive shortness of breath on climbing stairs',
                    'Known hypertensive for 5 years on regular oral medications',
                    'No prior history of CAD, Diabetes, or Bronchial Asthma',
                    'Post-prandial heaviness with retrosternal burning sensation'
                  ].map(hpi => (
                    <button
                      key={hpi}
                      type="button"
                      onClick={() => handleAddHpiChip(hpi)}
                      className="px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-600 hover:text-white text-[10px] font-medium text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors text-left"
                    >
                      + {hpi.slice(0, 36)}...
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={hpiInput}
                  onChange={(e) => setHpiInput(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 font-medium"
                  placeholder="Clinical progression, aggravating/relieving factors, chronic history, comorbidities..."
                />
              </div>
            </div>

            {/* RIGHT: 4. Physical Exam & Clinical Diagnosis */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              {/* Module 4: Physical Examination & Systemic Findings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Physical Examination & Systemic Findings
                  </label>
                  <span className="text-[10px] text-slate-400 font-bold">1-Click Systemic Presets</span>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleAddExamFinding('General: No Pallor, No Icterus, No Cyanosis, No Clubbing, No Pedal Edema')}
                      className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-600 hover:text-white text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    >
                      + General: NAD, No Edema/Icterus
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddExamFinding('CVS: S1 S2 Normal, No Murmurs')}
                      className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-600 hover:text-white text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    >
                      + CVS: S1 S2 Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddExamFinding('RS: Bilateral Vesicular Breath Sounds, Chest Clear')}
                      className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-600 hover:text-white text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    >
                      + RS: Clear, No Rhonchi
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddExamFinding('P/A: Soft, Non-tender, No Organomegaly')}
                      className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-600 hover:text-white text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    >
                      + P/A: Soft, Non-tender
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddExamFinding('CNS: Conscious, Oriented, GCS 15/15')}
                      className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-600 hover:text-white text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    >
                      + CNS: Conscious GCS 15
                    </button>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={examinationNotesInput}
                  onChange={(e) => setExaminationNotesInput(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-medium"
                  placeholder="CVS, Respiratory, Per-Abdomen, CNS, and localized systemic findings..."
                />
              </div>

              {/* Provisional & Final Diagnoses (ICD-10 Presets) */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    Clinical Diagnoses (ICD-10 Presets)
                  </label>
                  <span className="text-[10px] text-teal-600 font-bold">1-Click ICD-10 Code Presets</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {[
                    'I10 - Essential HTN',
                    'E11 - Type-2 Diabetes',
                    'I20.9 - Angina Pectoris',
                    'E78.5 - Hyperlipidemia',
                    'K21 - GERD',
                    'M17 - Osteoarthritis',
                    'J20 - Acute Bronchitis',
                    'J30 - Allergic Rhinitis',
                    'A09 - Gastroenteritis',
                    'B34 - Viral Fever'
                  ].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleAddDiagnosisChip(d)}
                      className="px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-600 hover:text-white text-[10px] font-bold text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 transition-colors"
                    >
                      + {d}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={diagnosisInput}
                  onChange={(e) => setDiagnosisInput(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-teal-300 dark:border-teal-700 bg-teal-50/30 dark:bg-teal-950/30 text-xs font-bold text-teal-800 dark:text-teal-200 focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. I20.9 - Angina Pectoris, I10 - Essential Hypertension, E78.5 - Hyperlipidemia"
                />
              </div>
            </div>
          </div>

          {/* 5. PRESCRIBED MEDICATIONS & THERAPEUTIC REGIMEN (RX PAD) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <span className="text-xl font-serif font-black">℞</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    Prescribed Medications & Therapeutic Regimen
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300">
                      RAPID DRUG DOSAGE MATRIX
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Generic salt composition, rapid dosage presets, meal timing, duration, and patient instructions</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Plus className="w-3.5 h-3.5 text-teal-600" />}
                  onClick={() => setShowCustomMedModal(true)}
                >
                  + Add Custom Drug
                </Button>
                <span className="text-xs text-purple-600 font-mono font-bold">{medications.length} Prescribed</span>
              </div>
            </div>

            {/* 1-Click Popular Indian Drug Presets Strip */}
            <div className="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 space-y-1.5">
              <span className="text-[10px] font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider block">
                ⚡ 1-Tap Rapid Drug Presets (Indian Medical Standard):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'Tab. Telma-AM (40/5)', gen: 'Telmisartan 40mg + Amlodipine 5mg', dose: '1 Tab', freq: '1-0-0 (Morning)', time: 'After Breakfast', dur: '30 Days', inst: 'Take with water. Monitor BP.' },
                  { name: 'Tab. Glycomet-SR 500', gen: 'Metformin Hydrochloride 500mg SR', dose: '1 Tab', freq: '1-0-1 (Morning & Night)', time: 'After Meals', dur: '30 Days', inst: 'Strictly after meals.' },
                  { name: 'Cap. Pan-D (40/30)', gen: 'Pantoprazole 40mg + Domperidone 30mg', dose: '1 Cap', freq: '1-0-0 (Morning)', time: 'Empty Stomach (Morning)', dur: '14 Days', inst: 'Take 30 mins before breakfast.' },
                  { name: 'Tab. Rozavel 10', gen: 'Rosuvastatin Calcium 10mg', dose: '1 Tab', freq: '0-0-1 (Night)', time: 'After Dinner at Bedtime', dur: '30 Days', inst: 'Take at night for lipid control.' },
                  { name: 'Tab. Dolo-650', gen: 'Paracetamol 650mg', dose: '1 Tab', freq: 'SOS (As needed)', time: 'After Meals', dur: '5 Days', inst: 'Take for fever or pain only.' },
                  { name: 'Tab. Augmentin 625', gen: 'Amoxicillin 500mg + Clavulanic Acid 125mg', dose: '1 Tab', freq: '1-0-1 (Morning & Night)', time: 'After Meals', dur: '7 Days', inst: 'Complete full 7-day course.' },
                  { name: 'Tab. Azithral 500', gen: 'Azithromycin 500mg', dose: '1 Tab', freq: '1-0-0 (Morning)', time: 'After Breakfast', dur: '3 Days', inst: 'Take once daily for 3 days.' },
                  { name: 'Tab. Montair-LC', gen: 'Montelukast 10mg + Levocetirizine 5mg', dose: '1 Tab', freq: '0-0-1 (Night)', time: 'At Bedtime', dur: '10 Days', inst: 'Take at night for allergy/cough.' }
                ].map(med => (
                  <button
                    key={med.name}
                    type="button"
                    onClick={() => {
                      if (!canEditRx) {
                        showToast('error', 'Doctor Permission Required', 'Only doctors can add medicines.');
                        return;
                      }
                      const newMed: PrescribedMedication = {
                        id: `med_preset_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                        name: med.name,
                        composition: med.gen,
                        dosage: med.dose,
                        frequency: med.freq,
                        timing: med.time,
                        duration: med.dur,
                        instructions: med.inst
                      };
                      setMedications([...medications, newMed]);
                      showToast('success', 'Medicine Added', `Prescribed ${med.name}`);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-purple-600 hover:text-white border border-purple-200 dark:border-purple-700 text-[10.5px] font-bold shadow-xs transition-all flex items-center gap-1"
                  >
                    <span>+ {med.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI AUTOCOMPLETE SEARCH BAR */}
            <div className="relative">
              <div className="relative">
                <Bot className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-500 animate-pulse" />
                <input
                  type="text"
                  placeholder="Search drug master by brand or generic name (e.g. 'telma', 'metformin', 'pantoprazole', 'dolo', 'augmentin', 'shelcal', 'rozavel', 'azithro')..."
                  value={aiMedQuery}
                  onChange={(e) => {
                    setAiMedQuery(e.target.value);
                    setShowAiMedDropdown(true);
                  }}
                  onFocus={() => setShowAiMedDropdown(true)}
                  className="w-full text-xs pl-10 pr-3 py-2.5 rounded-2xl border-2 border-purple-400/40 bg-purple-50/20 dark:bg-purple-950/20 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500 font-medium"
                />
              </div>

              {/* AI Instant Suggestions Dropdown */}
              {showAiMedDropdown && aiMedicineResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1.5 p-2 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800 rounded-2xl shadow-2xl max-h-64 overflow-y-auto space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 text-[10px] text-purple-600 font-bold uppercase">
                    <span>Clinical Drug Matches ({aiMedicineResults.length})</span>
                    <button type="button" onClick={() => setShowAiMedDropdown(false)} className="text-slate-400 hover:text-slate-600">Close ✕</button>
                  </div>
                  {aiMedicineResults.map((med, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectAIMedicine(med)}
                      className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs text-slate-900 dark:text-white font-bold">{med.name}</strong>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-mono">
                            {med.category}
                          </span>
                        </div>
                        <span className="text-[10px] text-teal-700 dark:text-teal-400 font-mono block mt-0.5">
                          🧪 Comp: {med.generic}
                        </span>
                        <span className="text-[9.5px] text-slate-500 font-mono block mt-0.5">
                          Dosage: <strong>{med.defaultDosage}</strong> • Frequency: <strong>{med.defaultFrequency}</strong> ({med.defaultTiming}) • Duration: {med.defaultDuration}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-teal-600 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 shrink-0 ml-2">
                        + Prescribe
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prescribed Medications Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border rounded-2xl overflow-hidden">
                <thead className="bg-slate-900 text-white uppercase text-[10px]">
                  <tr>
                    <th className="p-3" style={{ width: '30%' }}>Drug Name & Generic Composition</th>
                    <th className="p-3" style={{ width: '15%' }}>Dosage</th>
                    <th className="p-3" style={{ width: '22%' }}>Frequency & Timing</th>
                    <th className="p-3" style={{ width: '13%' }}>Duration</th>
                    <th className="p-3" style={{ width: '14%' }}>Special Instructions</th>
                    <th className="p-3 text-right" style={{ width: '6%' }}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {medications.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      {/* Drug Name & Composition */}
                      <td className="p-3">
                        <strong className="text-slate-900 dark:text-white font-bold block">{m.name}</strong>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-[10px] text-teal-700 dark:text-teal-400 font-mono italic">
                            🧪 Comp: {m.composition || m.name}
                          </span>
                        </div>
                      </td>

                      {/* Dosage Edit with AI System */}
                      <td className="p-3 relative">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={m.dosage}
                            onChange={(e) => handleUpdateMedication(m.id, { dosage: e.target.value })}
                            className="w-full px-2 py-1 rounded-lg border text-xs font-mono font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setActiveDosePopupId(activeDosePopupId === m.id ? null : m.id)}
                            className="p-1 text-slate-400 hover:text-teal-600"
                            title="Dosage Presets"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {activeDosePopupId === m.id && (
                          <div className="absolute left-0 top-full z-20 mt-1 p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl space-y-1 w-48 text-[10px]">
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Quick Dosages</span>
                            <div className="flex flex-wrap gap-1">
                              {['1 Tab', '2 Tabs', '1 Cap', '2.5mg', '5mg', '10mg', '20mg', '40mg', '50mg', '100mg', '250mg', '500mg', '625mg', '650mg', '1000mg', '5 ml', '10 ml', '1 Drop'].map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => {
                                    handleUpdateMedication(m.id, { dosage: d });
                                    setActiveDosePopupId(null);
                                  }}
                                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white font-mono"
                                >
                                  {d}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Frequency & Timing Edit */}
                      <td className="p-3 relative">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={m.frequency}
                              onChange={(e) => handleUpdateMedication(m.id, { frequency: e.target.value })}
                              className="w-full px-2 py-0.5 rounded-lg border text-xs font-bold text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => setActiveFreqPopupId(activeFreqPopupId === m.id ? null : m.id)}
                              className="p-1 text-slate-400 hover:text-teal-600"
                              title="Frequency Selector"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium block">
                            {m.timing}
                          </span>
                        </div>

                        {activeFreqPopupId === m.id && (
                          <div className="absolute left-0 top-full z-20 mt-1 p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl space-y-2 w-56 text-[10px]">
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-bold block">1. Frequency Schedule</span>
                              <div className="grid grid-cols-2 gap-1 mt-1">
                                {[
                                  { label: '☀️ 1-0-0 (Morning)', val: '1-0-0 (Morning)' },
                                  { label: '☀️🌙 1-0-1 (Morn & Night)', val: '1-0-1 (Morning & Night)' },
                                  { label: '🌙 0-0-1 (Night)', val: '0-0-1 (Night)' },
                                  { label: '☀️⛅🌙 1-1-1 (Thrice)', val: '1-1-1 (Thrice Daily)' },
                                  { label: '⚡ SOS (On Demand)', val: 'SOS (As needed)' },
                                  { label: '🔴 Stat (Immediately)', val: 'Stat (Take Immediately)' }
                                ].map((freq) => (
                                  <button
                                    key={freq.val}
                                    type="button"
                                    onClick={() => handleUpdateMedication(m.id, { frequency: freq.val })}
                                    className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white text-left truncate font-bold"
                                  >
                                    {freq.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-bold block">2. Meal Timing</span>
                              <div className="grid grid-cols-2 gap-1 mt-1">
                                {[
                                  'After Breakfast',
                                  'After Meals',
                                  'After Dinner',
                                  'Empty Stomach (Morning)',
                                  'With Meals',
                                  'At Bedtime'
                                ].map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => {
                                      handleUpdateMedication(m.id, { timing: t });
                                      setActiveFreqPopupId(null);
                                    }}
                                    className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white text-left truncate"
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Duration Auto Popup */}
                      <td className="p-3 relative">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={m.duration}
                            onChange={(e) => handleUpdateMedication(m.id, { duration: e.target.value })}
                            className="w-full px-2 py-1 rounded-lg border text-xs font-mono font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setActiveDurationPopupId(activeDurationPopupId === m.id ? null : m.id)}
                            className="p-1 text-slate-400 hover:text-teal-600"
                            title="Duration Popup"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {activeDurationPopupId === m.id && (
                          <div className="absolute left-0 top-full z-20 mt-1 p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl space-y-1 w-44 text-[10px]">
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Quick Duration</span>
                            <div className="grid grid-cols-2 gap-1">
                              {['3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '21 Days', '30 Days', '60 Days', '90 Days', 'Continuous'].map((dur) => (
                                <button
                                  key={dur}
                                  type="button"
                                  onClick={() => {
                                    handleUpdateMedication(m.id, { duration: dur });
                                    setActiveDurationPopupId(null);
                                  }}
                                  className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white text-center font-mono"
                                >
                                  {dur}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Special Instructions */}
                      <td className="p-3 relative">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={m.instructions || ''}
                            onChange={(e) => handleUpdateMedication(m.id, { instructions: e.target.value })}
                            placeholder="Special advice..."
                            className="w-full px-2 py-1 rounded-lg border text-[11px] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => setActiveInstructionPopupId(activeInstructionPopupId === m.id ? null : m.id)}
                            className="p-1 text-slate-400 hover:text-teal-600"
                            title="Advice Presets"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {activeInstructionPopupId === m.id && (
                          <div className="absolute right-0 top-full z-20 mt-1 p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl space-y-1 w-56 text-[10px]">
                            <span className="text-[9px] text-slate-400 uppercase font-bold block">Special Presets</span>
                            {[
                              'Take with plenty of water',
                              'Strictly after meals (never empty stomach)',
                              'Complete full antibiotic course',
                              'Take 30 mins before breakfast',
                              'Keep under tongue on acute chest pain',
                              'Monitor blood pressure weekly',
                              'Check blood sugar regularly'
                            ].map((adv) => (
                              <button
                                key={adv}
                                type="button"
                                onClick={() => {
                                  handleUpdateMedication(m.id, { instructions: adv });
                                  setActiveInstructionPopupId(null);
                                }}
                                className="w-full p-1 rounded bg-slate-50 dark:bg-slate-800 hover:bg-teal-600 hover:text-white text-left truncate block"
                              >
                                {adv}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateMedication(m)}
                            className="p-1 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                            title="Duplicate Drug"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(m.id)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. DIAGNOSTIC LAB & 7. DIETARY ADVICE & 8. FOLLOW-UP */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Module 6: Diagnostic Pathology & Imaging Orders */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-2xl bg-purple-500/10 text-purple-600">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Diagnostic Pathology & Imaging Orders
                    </h3>
                    <span className="text-[10px] text-purple-600 font-mono font-bold">{labOrders.length} Tests Ordered</span>
                  </div>
                </div>
              </div>

              {/* 1-Click Common Test Bundles */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  1-Tap Diagnostic Panels:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: 'Lipid Profile + Fasting Sugar (FBS)', cat: 'Biochemistry', cost: 950 },
                    { name: 'Complete Blood Count (CBC) + ESR', cat: 'Haematology', cost: 450 },
                    { name: 'Liver Function Test (LFT)', cat: 'Biochemistry', cost: 850 },
                    { name: 'Kidney Profile (KFT / Creatinine)', cat: 'Biochemistry', cost: 750 },
                    { name: 'HbA1c Glycated Hemoglobin', cat: 'Biochemistry', cost: 600 },
                    { name: 'Thyroid Profile Total (T3, T4, TSH)', cat: 'Endocrinology', cost: 800 },
                    { name: '12-Lead Resting Digital ECG', cat: 'Cardiology', cost: 350 },
                    { name: '2D Echocardiography with Doppler', cat: 'Cardiology Imaging', cost: 1800 },
                    { name: 'Chest X-Ray PA View', cat: 'Radiology', cost: 500 },
                    { name: 'USG Whole Abdomen & Pelvis', cat: 'Radiology Imaging', cost: 1200 }
                  ].map(test => (
                    <button
                      key={test.name}
                      type="button"
                      onClick={() => handleSelectAILabTest({
                        testName: test.name,
                        category: test.cat,
                        estimatedCost: test.cost,
                        fastingRequired: test.name.includes('FBS') || test.name.includes('Lipid'),
                        sampleType: 'Blood',
                        indication: 'Routine Evaluation'
                      })}
                      className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-600 hover:text-white text-[10px] font-bold text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors"
                    >
                      + {test.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lab Search Bar */}
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" />
                  <input
                    type="text"
                    placeholder="Search diagnostic test catalog (e.g. 'cbc', 'echo', 'thyroid', 'usg', 'crp', 'troponin')..."
                    value={aiLabQuery}
                    onChange={(e) => {
                      setAiLabQuery(e.target.value);
                      setShowAiLabDropdown(true);
                    }}
                    onFocus={() => setShowAiLabDropdown(true)}
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-purple-300 dark:border-purple-800 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>

                {showAiLabDropdown && aiLabResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 p-2 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800 rounded-2xl shadow-xl max-h-56 overflow-y-auto space-y-1">
                    <div className="flex items-center justify-between px-2 py-0.5 text-[10px] text-purple-600 font-bold uppercase">
                      <span>Diagnostic Matches ({aiLabResults.length})</span>
                      <button type="button" onClick={() => setShowAiLabDropdown(false)} className="text-slate-400">✕</button>
                    </div>
                    {aiLabResults.map((lab, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectAILabTest(lab)}
                        className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer transition-all flex items-center justify-between text-xs"
                      >
                        <div>
                          <strong className="text-slate-900 dark:text-white block font-bold">{lab.testName}</strong>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {lab.category} • {lab.fastingRequired ? '⚠️ 12h Fasting' : 'No Fasting'}
                          </span>
                        </div>
                        <span className="font-mono text-purple-600 font-bold ml-2">
                          {formatCurrency(lab.estimatedCost)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ordered Lab Tests List */}
              <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto">
                {labOrders.map((lo) => (
                  <div key={lo.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-slate-900 dark:text-white block font-bold">{lo.testName}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">{lo.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-purple-600 font-bold">{formatCurrency(lo.estimatedCost)}</span>
                      <button type="button" onClick={() => handleRemoveLabOrder(lo.id)} className="text-rose-500 hover:text-rose-700">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Module 7. Dietary & Lifestyle & Module 8. Follow-up & Appointment */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
              {/* Module 7: Dietary Advice & Lifestyle Instructions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Dietary Advice & Lifestyle Instructions
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold">1-Click Guidelines</span>
                </div>

                <div className="flex flex-wrap gap-1 mt-1">
                  {[
                    'Low sodium DASH diet (<3g salt daily, no extra table salt)',
                    'Strict diabetic diet (Avoid sugar, sweets, cold drinks, maida)',
                    'Adequate hydration (Drink 3 to 3.5 Litres of water daily)',
                    '30 to 45 minutes brisk walking or light exercise daily',
                    'Avoid deep fried, fatty, oily and excessively spicy foods',
                    'Strictly avoid smoking, tobacco, and alcohol',
                    'Maintain 7-8 hours quality sleep every night',
                    'Daily home blood pressure monitoring (maintain log)'
                  ].map(adv => (
                    <button
                      key={adv}
                      type="button"
                      onClick={() => handleAddDietAdviceChip(adv)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white text-[10px] font-medium text-slate-700 dark:text-slate-300 transition-colors text-left"
                    >
                      + {adv.slice(0, 32)}...
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={dietAdvice}
                  onChange={(e) => setDietAdvice(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  placeholder="Dietary recommendations, physical exercise, lifestyle advice, fluid intake..."
                />
              </div>

              {/* Module 8: Next Follow-up & Appointment (Patient Wish) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-50 to-amber-50/50 dark:from-amber-950/40 dark:via-slate-800/60 dark:to-slate-800/60 border-2 border-amber-400 text-amber-950 dark:text-amber-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
                    <CalendarCheck className="w-4 h-4 text-amber-600" />
                    📅 Next Follow-up & Appointment (Patient Wish)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-600 text-white uppercase tracking-wider">
                    Target: {formatDate(new Date(Date.now() + followUpDays * 24 * 3600 * 1000).toISOString().slice(0, 10))}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500">Days:</span>
                  {[3, 5, 7, 10, 14, 21, 30, 60, 90].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setFollowUpDays(days)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                        followUpDays === days
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-amber-300'
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500 block font-bold">Preferred OPD Slot</label>
                    <select
                      value={appointmentSlot}
                      onChange={(e) => setAppointmentSlot(e.target.value)}
                      className="w-full p-2 rounded-xl border border-amber-300 bg-white dark:bg-slate-800 font-bold"
                    >
                      <option value="Morning OPD (09:00 AM - 01:00 PM)">🌅 Morning OPD (09:00 AM - 01:00 PM)</option>
                      <option value="Afternoon OPD (02:00 PM - 05:00 PM)">🌆 Afternoon OPD (02:00 PM - 05:00 PM)</option>
                      <option value="Evening OPD (05:00 PM - 08:30 PM)">🌙 Evening OPD (05:00 PM - 08:30 PM)</option>
                      <option value="Special Clinical VIP Slot">⚡ Special Clinical VIP Slot</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block font-bold">Exact Preferred Time</label>
                    <input
                      type="text"
                      value={patientPreferredTime}
                      onChange={(e) => setPatientPreferredTime(e.target.value)}
                      placeholder="e.g. 10:30 AM, 06:15 PM"
                      className="w-full p-2 rounded-xl border border-amber-300 bg-white dark:bg-slate-800 font-bold font-mono text-center"
                    />
                  </div>
                </div>

                {editingEncounterId && (
                  <div className="pt-1">
                    <label className="text-[10px] text-amber-800 dark:text-amber-300 block font-bold">Correction & Clinical Revision Reason</label>
                    <input
                      type="text"
                      value={correctionNotes}
                      onChange={(e) => setCorrectionNotes(e.target.value)}
                      placeholder="e.g. Dosage adjusted per blood test report & patient review..."
                      className="w-full p-2 rounded-xl border border-amber-400 bg-white dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS BAR */}
              <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 font-bold"
                    leftIcon={<Share2 className="w-3.5 h-3.5 text-emerald-600" />}
                    onClick={handleShareOnWhatsApp}
                  >
                    WhatsApp Rx
                  </Button>

                  {editingEncounterId && (
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Undo2 className="w-3.5 h-3.5" />}
                      onClick={handleCancelCorrection}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>

                <Button
                  size="md"
                  variant="primary"
                  className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 font-black shadow-lg"
                  leftIcon={<Printer className="w-4 h-4" />}
                  onClick={handleSaveAndPrintEncounter}
                >
                  {editingEncounterId
                    ? '✨ Save & Print Corrected Prescription (A4)'
                    : '✨ Save & Sign Official Prescription (A4 Letterhead)'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: LIVE OPD WAITING QUEUE */}
      {activeTab === 'waiting_queue' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-500" />
                  Live OPD Waiting Queue & Token Board
                </h3>
                <p className="text-xs text-slate-500">Real-time token calling for {currentUser?.fullName || 'Attending Doctor'}</p>
              </div>
              <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200">
                {waitingQueue.length} Patients in Queue
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {waitingQueue.map((item) => (
                <div
                  key={item.tokenNo}
                  className={`p-5 rounded-2xl border space-y-3 flex flex-col justify-between transition-all ${
                    item.status === 'completed'
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-800 shadow-sm'
                      : item.status === 'in_consultation'
                      ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 shadow-md ring-2 ring-teal-400/30'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black font-mono px-2.5 py-1 rounded-xl bg-slate-900 text-white">
                        TOKEN #{item.tokenNo}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: item.cardTierColor + '20', color: item.cardTierColor }}>
                        {item.cardTier}
                      </span>
                    </div>

                    <div className="pt-2">
                      <strong className="text-sm font-black text-slate-900 dark:text-white block">
                        {item.patientName}
                      </strong>
                      <span className="text-[11px] text-slate-500 font-mono">
                        UHID: {item.patientId} • {item.age} Y / {item.gender} • Blood: {item.bloodGroup}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <strong>Complaint:</strong> {item.chiefComplaint}
                    </p>
                  </div>

                  <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {item.status === 'completed' ? (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-400 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          RX COMPLETED ✅
                        </span>
                      ) : item.status === 'in_consultation' ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          IN CONSULTATION
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">🕒 {item.arrivalTime}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.status === 'completed' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-500 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-bold"
                          leftIcon={<Printer className="w-3.5 h-3.5 text-emerald-600" />}
                          onClick={() => {
                            const enc = encounters.find(e => e.patientId === item.patientId) || encounters[0];
                            if (enc) setActivePrintEncounter(enc);
                          }}
                        >
                          🖨️ View Rx
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 font-bold shadow-md"
                          leftIcon={<Stethoscope className="w-3.5 h-3.5" />}
                          onClick={() => handleCallQueuePatient(item)}
                        >
                          {item.status === 'in_consultation' ? '✨ Open in Rx Studio' : '✨ Call Patient & Start Rx'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 3: APPOINTMENTS & TELEMEDICINE HUB */}
      {activeTab === 'appointments_telemed' && (
        <div className="space-y-5">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-amber-500" />
                  Patient Appointments & Doctor Wish Telemedicine Hub
                </h3>
                <p className="text-xs text-slate-500">
                  Doctor-confirmed physical OPD and live encrypted WebRTC video telemedicine consultations.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                {[
                  { id: 'all' as const, label: `All (${appointments.length})` },
                  { id: 'physical_opd' as const, label: '🏥 Physical OPD' },
                  { id: 'telemedicine_video' as const, label: '🌐 Telemed Video' },
                  { id: 'pending' as const, label: '🕒 Pending Wish' },
                  { id: 'confirmed' as const, label: '🟢 Confirmed' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setAppointmentFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      appointmentFilter === f.id
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Appointments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className={`p-5 rounded-3xl border space-y-3.5 flex flex-col justify-between transition-all ${
                    apt.consultationMode === 'telemedicine_video'
                      ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-900 text-white">
                        {apt.appointmentNo}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase" style={{
                          backgroundColor: apt.consultationMode === 'telemedicine_video' ? '#8B5CF620' : '#0D948820',
                          color: apt.consultationMode === 'telemedicine_video' ? '#8B5CF6' : '#0D9488'
                        }}>
                          {apt.consultationMode === 'telemedicine_video' ? '🌐 Telemed Video' : '🏥 Physical OPD'}
                        </span>
                        <Badge
                          variant={apt.status === 'doctor_confirmed' ? 'success' : apt.status === 'in_consultation' ? 'blue' : 'warning'}
                          size="sm"
                        >
                          {apt.status.toUpperCase().replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <strong className="text-sm font-black text-slate-900 dark:text-white block">
                        {apt.patientName}
                      </strong>
                      <span className="text-[11px] text-slate-500 font-mono">
                        UHID: {apt.patientId} • Phone: {apt.patientPhone} • {apt.cardTier}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border text-xs text-slate-700 dark:text-slate-300">
                      <strong>Complaint:</strong> {apt.chiefComplaint}
                    </div>

                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs space-y-1.5 font-mono">
                      <div className="flex items-center justify-between text-amber-900 dark:text-amber-200">
                        <span className="font-bold">📅 Patient Wish:</span>
                        <span>{formatDate(apt.patientWishDate)} • {apt.patientWishTime} ({apt.patientWishSlot.split(' (')[0]})</span>
                      </div>
                      <div className="flex items-center justify-between text-teal-700 dark:text-teal-300 border-t border-amber-200/60 pt-1">
                        <span className="font-bold">👨‍⚕️ Doctor Slot:</span>
                        <strong>{apt.doctorConfirmedSlot || 'Pending Approval'} ({apt.doctorConfirmedTime || apt.patientWishTime})</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500 font-mono">
                      Fee: <strong className="text-teal-600">{formatCurrency(apt.consultationFee)}</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {apt.status === 'pending_doctor_approval' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-500 text-amber-700 hover:bg-amber-100"
                          leftIcon={<CheckSquare className="w-3.5 h-3.5 text-amber-600" />}
                          onClick={() => handleDoctorConfirmAppointment(apt)}
                        >
                          Approve Slot
                        </Button>
                      )}

                      {apt.consultationMode === 'telemedicine_video' ? (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            className="bg-purple-600 hover:bg-purple-700 font-bold"
                            leftIcon={<Video className="w-3.5 h-3.5" />}
                            onClick={() => setActiveTelemedAppointment(apt)}
                          >
                            Launch Video Room
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-teal-500 text-teal-700 hover:bg-teal-50 font-bold"
                            leftIcon={<Stethoscope className="w-3.5 h-3.5" />}
                            onClick={() => handleLaunchAppointmentRx(apt)}
                          >
                            ✨ Prescribe (Rx)
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 font-bold shadow-md"
                          leftIcon={<Stethoscope className="w-3.5 h-3.5" />}
                          onClick={() => handleLaunchAppointmentRx(apt)}
                        >
                          ✨ Start Consultation (Rx)
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 4: EMR RECORDS & RX ARCHIVE */}
      {activeTab === 'records_archive' && (
        <div className="space-y-5">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white border border-slate-700/80 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-lg border border-teal-400/40">
                  <ShieldCheck className="w-6 h-6 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    Cardholder Digital Prescription Archive & Audit Records ({encounters.length})
                  </h3>
                  <p className="text-xs text-slate-300">
                    Official ISO 9001:2015 accredited prescriptions with 1-click A4 thermal/laser print, PDF download, and WhatsApp sharing.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-slate-950/80 text-emerald-400 font-bold border border-slate-700">
                  Total Records: {encounters.length}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-950/80 text-amber-400 font-bold border border-slate-700">
                  Revised: {encounters.filter(e => e.status === 'corrected').length}
                </span>
              </div>
            </div>
          </div>

          <DataTable
            data={encounters}
            columns={recordColumns}
            keyExtractor={(e) => e.id}
            searchPlaceholder="Search prescriptions by Encounter No, Patient Name, UHID, Diagnosis..."
            emptyTitle="No EMR records found"
            emptyDescription="Generated clinical encounter prescriptions will appear here."
          />
        </div>
      )}

      {/* Custom Medication Modal */}
      {showCustomMedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-teal-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Add Custom Medication
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomMedModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block">Brand Name / Formulation</label>
                <input
                  type="text"
                  placeholder="e.g. Tab. Dolo 650, Syp. Grilinctus"
                  value={customMed.name}
                  onChange={(e) => setCustomMed({ ...customMed, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold block">Generic Active Composition</label>
                <input
                  type="text"
                  placeholder="e.g. Paracetamol 650mg, Dextromethorphan + CPM"
                  value={customMed.composition}
                  onChange={(e) => setCustomMed({ ...customMed, composition: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block">Dosage</label>
                  <input
                    type="text"
                    value={customMed.dosage}
                    onChange={(e) => setCustomMed({ ...customMed, dosage: e.target.value })}
                    className="w-full p-2 rounded-xl border bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block">Frequency</label>
                  <input
                    type="text"
                    value={customMed.frequency}
                    onChange={(e) => setCustomMed({ ...customMed, frequency: e.target.value })}
                    className="w-full p-2 rounded-xl border bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block">Meal Timing</label>
                  <input
                    type="text"
                    value={customMed.timing}
                    onChange={(e) => setCustomMed({ ...customMed, timing: e.target.value })}
                    className="w-full p-2 rounded-xl border bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block">Duration</label>
                  <input
                    type="text"
                    value={customMed.duration}
                    onChange={(e) => setCustomMed({ ...customMed, duration: e.target.value })}
                    className="w-full p-2 rounded-xl border bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowCustomMedModal(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleAddCustomMedicine}>
                Add to Prescription
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Login & Account Switcher Modal */}
      {showDoctorLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Licensed Doctor Authentication & Profile Switcher
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDoctorLoginModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select a verified physician profile to activate clinical prescribing, digital signature, and telemedicine video room authority:
            </p>

            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {doctorUsers.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleQuickDoctorLogin(doc.username)}
                  className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    currentUser?.username === doc.username
                      ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 ring-2 ring-teal-400/30'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-teal-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white font-bold flex items-center justify-center overflow-hidden shrink-0 shadow">
                      {doc.photoUrl ? (
                        <img src={doc.photoUrl} alt={doc.fullName} className="w-full h-full object-cover" />
                      ) : (
                        doc.fullName.charAt(0)
                      )}
                    </div>
                    <div>
                      <strong className="text-xs text-slate-900 dark:text-white block font-bold">
                        {doc.fullName}
                      </strong>
                      <span className="text-[10px] text-teal-700 dark:text-teal-300 font-semibold block">
                        {doc.designation || 'Consultant Physician'}
                      </span>
                      <span className="text-[9.5px] text-slate-400 font-mono">
                        License: <strong>{doc.licenseNo || 'WBMC-88412'}</strong> • User: <span className="font-mono">{doc.username}</span>
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-teal-600 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950 border border-teal-200 shrink-0">
                    {currentUser?.username === doc.username ? 'Active ✅' : 'Activate ➔'}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowDoctorLoginModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Telemedicine Live Video Room Modal */}
      {activeTelemedAppointment && (
        <TelemedicineVideoModal
          isOpen={!!activeTelemedAppointment}
          onClose={() => setActiveTelemedAppointment(null)}
          appointment={activeTelemedAppointment}
          onLaunchPrescription={handleLaunchAppointmentRx}
        />
      )}

      {/* Queue Prescription & Appointment Wish Modal */}
      {selectedQueueToken && (
        <QueuePrescriptionModal
          isOpen={!!selectedQueueToken}
          onClose={() => setSelectedQueueToken(null)}
          queueItem={selectedQueueToken}
          onPrescriptionGenerated={(enc) => {
            setWaitingQueue(prev =>
              prev.map(q => ({
                ...q,
                status: q.tokenNo === selectedQueueToken.tokenNo ? 'completed' : q.status
              }))
            );
            setAppointments(prev =>
              prev.map(a => ({
                ...a,
                status: a.patientId === selectedQueueToken.patientId ? 'completed' : a.status
              }))
            );
            setEncounters(EMRService.getAllEncounters());
            setActivePrintEncounter(enc);
          }}
        />
      )}

      {/* Prescription Print Modal */}
      {activePrintEncounter && (
        <PrescriptionPrintModal
          isOpen={!!activePrintEncounter}
          onClose={() => setActivePrintEncounter(null)}
          encounter={activePrintEncounter}
          patient={patients.find(p => p.id === activePrintEncounter.patientId)}
          nextQueuePatient={nextWaitingPatient}
          onCallNextPatient={() => {
            setActivePrintEncounter(null);
            handleCallNextWaitingPatient();
          }}
        />
      )}

      {/* Diagnostic Lab Report Print & PDF Modal */}
      {activeLabReportToView && (
        <LabReportPrintModal
          isOpen={!!activeLabReportToView}
          onClose={() => setActiveLabReportToView(null)}
          booking={activeLabReportToView}
        />
      )}
    </div>
  );
};
export default DoctorEMRPage;
