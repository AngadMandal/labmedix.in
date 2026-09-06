import { CompanyProfile, CardDesignConfig, ClinicRegistrationSettings } from '../types';

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyId: 'LABMEDIX-MAIN-CLINIC',
  name: 'LABMEDIX MULTI-SPECIALITY HEALTHCARE & DIAGNOSTIC CENTRE',
  tagline: 'Angad Mandal • Confident In Care',
  estdYear: '2025',
  logoUrl: '/logo.jpg',
  subtitle: 'AngadMandal/Labmedix.in • ISO 9001:2015 ACCREDITED • DIAGNOSTIC LABS • NABH STANDARDS',
  address: 'Main Medical Expressway, Sultanganj',
  postOffice: 'Sultanganj P.O.',
  policeStation: 'Sultanganj PS',
  district: 'Malda',
  state: 'West Bengal',
  pinCode: '732142',
  phone: '+91 98765 43210',
  helpline: '+91 98765 43210',
  ambulanceHelpline: '1800 123 4567',
  bloodBankHelpline: '+91 98765 43211',
  whatsapp: '+91 98765 43210',
  email: 'care@labmedix.in',
  website: 'https://labmedix.in',
  registrationNo: 'WB-MED-MALDA-2026/08942',
  isoCertification: 'ISO 9001:2015 ACCREDITED • ADVANCED DIAGNOSTIC LABS • NABH STANDARDS',
  clinicalLicenseNo: 'CEA/WB/MLD/2026/1102',
  gstin: '19AAACL1234F1Z5',
  cardValidityMonths: 12,
  cardFooterNotice: 'Present this card or digital QR at LABMEDIX front desk to redeem medical discounts.',
  cardSecurityWatermark: 'LABMEDIX SECURE HEALTHCARE • AngadMandal/Labmedix.in',
  currencySymbol: '₹',
  sessionTimeoutMinutes: 15,
  isLocked: true,
  lockedBy: 'Super Administrator',
  services: [
    {
      id: 'srv_1',
      title: 'Outdoor Consultation',
      icon: 'Stethoscope',
      description: 'Expert specialist doctor consultations across all clinical disciplines.'
    },
    {
      id: 'srv_2',
      title: 'Diagnostic Services',
      icon: 'Microscope',
      description: 'Fully automated biochemistry, haematology, pathology, radiology & imaging.'
    },
    {
      id: 'srv_3',
      title: 'Pharmacy',
      icon: 'Cross',
      description: '100% genuine pharmaceutical drugs, emergency medicines & wellness products.'
    },
    {
      id: 'srv_4',
      title: 'Home Blood Collection',
      icon: 'HomeDroplet',
      description: 'Safe, hygienic doorstep sample collection with instant digital reports.'
    }
  ],
  termsAndConditions: [
    'This Health Card is issued by LABMEDIX Multi-speciality Centre and remains the property of the organization.',
    'Cardholder must present this card or digital QR code at front desk / billing counter to claim membership discounts.',
    'Discounts apply to prevailing standard rack rates and cannot be combined with external special offers.',
    'Card validity is strictly as embossed. Expired cards must be renewed to maintain active benefits.',
    'In case of card loss or damage, immediate reporting is advised for instant replacement.',
    'For 24x7 Emergency Assistance & Home Collection Booking, call helpline +91 98765 43210.'
  ],
  zohoPayments: {
    enabled: true,
    environment: 'production',
    isConnected: true,
    authStatus: 'authenticated',
    connectedEmail: 'payments@labmedix.org',
    apiKey: '1003.25e5fb49edcb6ea6aea2c2840d90cd6f.e511b7068cf53a011dedc54651946730',
    signingKey: '1d02e6e16b86d29cf0e960bc1e933f2ac1d7c29dc8fe1ad22400f592ccd25cf716952446dafaa2ae92d746056994fe7b',
    merchantAccountId: 'zoho_lmdx_live_9901',
    accountHolderName: 'LABMEDIX MULTI-SPECIALITY CENTRE',
    webhookUrl: 'https://api.labmedix.org/v1/webhooks/zoho-payments',
    autoCapture: true,
    enableUpi: true,
    enableCards: true,
    enableNetBanking: true,
    enableInternational: true,
    settlementSchedule: 'instant',
    settlementBank: 'ICICI Bank Current Account (•••• 9921 - IFSC: ICIC0000102)',
    lastPingStatus: 'online',
    lastPingLatencyMs: 38,
    lastPingTimestamp: '2026-08-24T05:30:00.000Z'
  },
  upiSettings: {
    enabled: true,
    merchantVpa: '7047108226@okbizaxis',
    merchantName: 'LABMEDIX MULTI-SPECIALITY CENTRE',
    merchantMcc: '8099',
    googlePayMerchantId: 'GPAY-LMDX-8829-LIVE',
    googlePayBusinessName: 'LABMEDIX HEALTHCARE',
    enableDeepLinks: true,
    autoVerifySimulation: true
  },
  nfcSettings: {
    enabled: true,
    defaultStandard: 'ISO/IEC 14443 Type A',
    frequency: '13.56 MHz',
    payloadType: 'verification_url',
    autoWriteOnIssue: true,
    securityKey: 'A0B1C2D3E4F5',
    enableWebNfcApi: true
  },
  registrationSettings: {
    enableClinicalTriageDefault: false,
    maxIncludedFamilyMembers: 5,
    additionalMemberFee: 299,
    cardIssuanceDefault: false
  }
};

export const DEFAULT_CLINIC_REGISTRATION_SETTINGS: ClinicRegistrationSettings = {
  enableClinicalTriageDefault: false,
  maxIncludedFamilyMembers: 5,
  additionalMemberFee: 299,
  cardIssuanceDefault: false
};

export const BLOOD_GROUP_OPTIONS: Array<{
  value: string;
  label: string;
  badge: string;
  status: 'verified' | 'unverified' | 'unknown' | 'not_tested';
}> = [
  { value: 'Unknown / Not Known', label: 'Unknown / Not Known (Can update later)', badge: 'Unknown', status: 'unknown' },
  { value: 'Not Tested', label: 'Not Tested (Laboratory testing pending)', badge: 'Pending Lab', status: 'not_tested' },
  { value: 'A+', label: 'A Positive (A+)', badge: 'A+', status: 'unverified' },
  { value: 'A-', label: 'A Negative (A-)', badge: 'A-', status: 'unverified' },
  { value: 'B+', label: 'B Positive (B+)', badge: 'B+', status: 'unverified' },
  { value: 'B-', label: 'B Negative (B-)', badge: 'B-', status: 'unverified' },
  { value: 'AB+', label: 'AB Positive (AB+)', badge: 'AB+', status: 'unverified' },
  { value: 'AB-', label: 'AB Negative (AB-)', badge: 'AB-', status: 'unverified' },
  { value: 'O+', label: 'O Positive (O+)', badge: 'O+', status: 'unverified' },
  { value: 'O-', label: 'O Negative (O-)', badge: 'O-', status: 'unverified' }
];

export const DEFAULT_CARD_DESIGN: CardDesignConfig = {
  preset: 'executive_navy',
  material: 'gloss',
  primaryColor: '#0B4F9C',
  accentColor: '#109B48',
  backgroundColor: '#062B57',
  textColor: '#FFFFFF',
  showChip: true,
  showContactless: true,
  showEmergencyBadge: true,
  showBarcode: true,
  showSignatureStrip: true,
  customTagline: 'Confident In Care'
};