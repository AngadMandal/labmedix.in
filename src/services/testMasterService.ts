import {
  MasterTestParameter,
  TestResultType,
  AgeGenderReferenceRange,
  BookedTestConfig,
  LabParameterResult,
  LabParameterFlag
} from '../types';
import { CatalogService, LabTestItem } from './catalogService';
import { StorageService } from './storage';
import { ApiSyncService } from './apiSyncService';
import { generateUuid } from '../utils/idGenerator';

// ============================================================================
// STANDARD CLINICAL MASTER PARAMETER BLUEPRINTS
// ============================================================================

export const CBC_PARAMETERS: MasterTestParameter[] = [
  {
    id: 'p_cbc_hb',
    parameterCode: 'HB',
    parameterName: 'Hemoglobin (Hb)',
    method: 'Cyanmethemoglobin / Photometric',
    resultType: 'numeric',
    unit: 'g/dL',
    defaultReferenceRange: '13.0 - 17.0',
    minVal: 13.0,
    maxVal: 17.0,
    criticalLow: 6.0,
    criticalHigh: 20.0,
    required: true,
    displayOrder: 1,
    reportOrder: 1,
    ageGenderRanges: [
      { gender: 'male', minAgeYears: 15, maxAgeYears: 120, referenceRange: '13.0 - 17.0', minVal: 13.0, maxVal: 17.0, criticalLow: 6.0, criticalHigh: 20.0 },
      { gender: 'female', minAgeYears: 15, maxAgeYears: 120, referenceRange: '12.0 - 15.5', minVal: 12.0, maxVal: 15.5, criticalLow: 6.0, criticalHigh: 19.0 },
      { gender: 'all', minAgeYears: 0, maxAgeYears: 14, referenceRange: '11.0 - 14.5', minVal: 11.0, maxVal: 14.5, criticalLow: 7.0, criticalHigh: 18.0 }
    ]
  },
  {
    id: 'p_cbc_tlc',
    parameterCode: 'TLC',
    parameterName: 'Total Leukocyte Count (TLC / WBC)',
    method: 'Automated Cell Counter / Flow Cytometry',
    resultType: 'numeric',
    unit: 'cells/mcL',
    defaultReferenceRange: '4000 - 11000',
    minVal: 4000,
    maxVal: 11000,
    criticalLow: 1500,
    criticalHigh: 30000,
    required: true,
    displayOrder: 2,
    reportOrder: 2
  },
  {
    id: 'p_cbc_rbc',
    parameterCode: 'RBC',
    parameterName: 'Red Blood Cell Count (RBC)',
    method: 'Electrical Impedance',
    resultType: 'numeric',
    unit: 'million/mcL',
    defaultReferenceRange: '4.5 - 5.5',
    minVal: 4.5,
    maxVal: 5.5,
    required: true,
    displayOrder: 3,
    reportOrder: 3,
    ageGenderRanges: [
      { gender: 'male', minAgeYears: 15, maxAgeYears: 120, referenceRange: '4.5 - 5.9', minVal: 4.5, maxVal: 5.9 },
      { gender: 'female', minAgeYears: 15, maxAgeYears: 120, referenceRange: '4.0 - 5.2', minVal: 4.0, maxVal: 5.2 }
    ]
  },
  {
    id: 'p_cbc_plt',
    parameterCode: 'PLT',
    parameterName: 'Platelet Count',
    method: 'Electrical Impedance / Flow Cytometry',
    resultType: 'numeric',
    unit: 'lakh/mcL',
    defaultReferenceRange: '1.5 - 4.5',
    minVal: 1.5,
    maxVal: 4.5,
    criticalLow: 0.25,
    criticalHigh: 10.0,
    required: true,
    displayOrder: 4,
    reportOrder: 4
  },
  {
    id: 'p_cbc_pcv',
    parameterCode: 'PCV',
    parameterName: 'Packed Cell Volume (PCV / Hematocrit)',
    method: 'Calculated / Centrifugation',
    resultType: 'numeric',
    unit: '%',
    defaultReferenceRange: '40.0 - 50.0',
    minVal: 40.0,
    maxVal: 50.0,
    criticalLow: 20.0,
    criticalHigh: 60.0,
    required: true,
    displayOrder: 5,
    reportOrder: 5,
    ageGenderRanges: [
      { gender: 'male', referenceRange: '40.0 - 50.0', minVal: 40.0, maxVal: 50.0 },
      { gender: 'female', referenceRange: '36.0 - 46.0', minVal: 36.0, maxVal: 46.0 }
    ]
  },
  {
    id: 'p_cbc_mcv',
    parameterCode: 'MCV',
    parameterName: 'Mean Corpuscular Volume (MCV)',
    method: 'Calculated',
    resultType: 'numeric',
    unit: 'fL',
    defaultReferenceRange: '80.0 - 100.0',
    minVal: 80.0,
    maxVal: 100.0,
    required: true,
    displayOrder: 6,
    reportOrder: 6
  },
  {
    id: 'p_cbc_mch',
    parameterCode: 'MCH',
    parameterName: 'Mean Corpuscular Hemoglobin (MCH)',
    method: 'Calculated',
    resultType: 'numeric',
    unit: 'pg',
    defaultReferenceRange: '27.0 - 32.0',
    minVal: 27.0,
    maxVal: 32.0,
    required: false,
    displayOrder: 7,
    reportOrder: 7
  },
  {
    id: 'p_cbc_mchc',
    parameterCode: 'MCHC',
    parameterName: 'MCHC',
    method: 'Calculated',
    resultType: 'numeric',
    unit: 'g/dL',
    defaultReferenceRange: '32.0 - 36.0',
    minVal: 32.0,
    maxVal: 36.0,
    required: false,
    displayOrder: 8,
    reportOrder: 8
  },
  {
    id: 'p_cbc_rdw',
    parameterCode: 'RDW',
    parameterName: 'RDW - CV',
    method: 'Calculated',
    resultType: 'numeric',
    unit: '%',
    defaultReferenceRange: '11.5 - 14.5',
    minVal: 11.5,
    maxVal: 14.5,
    required: false,
    displayOrder: 9,
    reportOrder: 9
  },
  {
    id: 'p_cbc_neut',
    parameterCode: 'NEUT',
    parameterName: 'Neutrophils',
    method: 'Differential Automated / Microscopy',
    resultType: 'numeric',
    unit: '%',
    defaultReferenceRange: '40 - 70',
    minVal: 40,
    maxVal: 70,
    required: true,
    displayOrder: 10,
    reportOrder: 10
  },
  {
    id: 'p_cbc_lymph',
    parameterCode: 'LYMPH',
    parameterName: 'Lymphocytes',
    method: 'Differential Automated / Microscopy',
    resultType: 'numeric',
    unit: '%',
    defaultReferenceRange: '20 - 45',
    minVal: 20,
    maxVal: 45,
    required: true,
    displayOrder: 11,
    reportOrder: 11
  },
  {
    id: 'p_cbc_mono',
    parameterCode: 'MONO',
    parameterName: 'Monocytes',
    method: 'Differential Automated / Microscopy',
    resultType: 'numeric',
    unit: '%',
    defaultReferenceRange: '2 - 8',
    minVal: 2,
    maxVal: 8,
    required: false,
    displayOrder: 12,
    reportOrder: 12
  },
  {
    id: 'p_cbc_eos',
    parameterCode: 'EOS',
    parameterName: 'Eosinophils',
    method: 'Differential Automated / Microscopy',
    resultType: 'numeric',
    unit: '%',
    defaultReferenceRange: '1 - 6',
    minVal: 1,
    maxVal: 6,
    required: false,
    displayOrder: 13,
    reportOrder: 13
  },
  {
    id: 'p_cbc_baso',
    parameterCode: 'BASO',
    parameterName: 'Basophils',
    method: 'Differential Automated / Microscopy',
    resultType: 'numeric',
    unit: '%',
    defaultReferenceRange: '0 - 1',
    minVal: 0,
    maxVal: 1,
    required: false,
    displayOrder: 14,
    reportOrder: 14
  },
  {
    id: 'p_cbc_esr',
    parameterCode: 'ESR',
    parameterName: 'Erythrocyte Sedimentation Rate (ESR)',
    method: 'Westergren Method',
    resultType: 'numeric',
    unit: 'mm/1st hr',
    defaultReferenceRange: '0 - 15',
    minVal: 0,
    maxVal: 15,
    required: false,
    displayOrder: 15,
    reportOrder: 15,
    ageGenderRanges: [
      { gender: 'male', referenceRange: '0 - 15', minVal: 0, maxVal: 15 },
      { gender: 'female', referenceRange: '0 - 20', minVal: 0, maxVal: 20 }
    ]
  }
];

export const LFT_PARAMETERS: MasterTestParameter[] = [
  {
    id: 'p_lft_tbili',
    parameterCode: 'TBIL',
    parameterName: 'Bilirubin - Total',
    method: 'Diazo Method / Spectrophotometry',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '0.2 - 1.2',
    minVal: 0.2,
    maxVal: 1.2,
    criticalHigh: 15.0,
    required: true,
    displayOrder: 1,
    reportOrder: 1
  },
  {
    id: 'p_lft_dbili',
    parameterCode: 'DBIL',
    parameterName: 'Bilirubin - Direct (Conjugated)',
    method: 'Diazo Reaction',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '0.0 - 0.3',
    minVal: 0.0,
    maxVal: 0.3,
    required: true,
    displayOrder: 2,
    reportOrder: 2
  },
  {
    id: 'p_lft_indbili',
    parameterCode: 'IBIL',
    parameterName: 'Bilirubin - Indirect',
    method: 'Calculated',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '0.2 - 0.9',
    minVal: 0.2,
    maxVal: 0.9,
    required: false,
    displayOrder: 3,
    reportOrder: 3,
    isCalculated: true,
    calculationFormula: 'TBIL - DBIL',
    calculationDependencies: ['TBIL', 'DBIL']
  },
  {
    id: 'p_lft_sgot',
    parameterCode: 'SGOT',
    parameterName: 'SGOT / AST (Aspartate Aminotransferase)',
    method: 'IFCC without Pyridoxal Phosphate',
    resultType: 'numeric',
    unit: 'U/L',
    defaultReferenceRange: '10 - 40',
    minVal: 10,
    maxVal: 40,
    criticalHigh: 500,
    required: true,
    displayOrder: 4,
    reportOrder: 4
  },
  {
    id: 'p_lft_sgpt',
    parameterCode: 'SGPT',
    parameterName: 'SGPT / ALT (Alanine Aminotransferase)',
    method: 'IFCC without Pyridoxal Phosphate',
    resultType: 'numeric',
    unit: 'U/L',
    defaultReferenceRange: '7 - 56',
    minVal: 7,
    maxVal: 56,
    criticalHigh: 500,
    required: true,
    displayOrder: 5,
    reportOrder: 5
  },
  {
    id: 'p_lft_alp',
    parameterCode: 'ALP',
    parameterName: 'Alkaline Phosphatase (ALP)',
    method: 'p-NPP Kinetic Method',
    resultType: 'numeric',
    unit: 'U/L',
    defaultReferenceRange: '44 - 147',
    minVal: 44,
    maxVal: 147,
    required: true,
    displayOrder: 6,
    reportOrder: 6
  },
  {
    id: 'p_lft_tp',
    parameterCode: 'TP',
    parameterName: 'Total Protein',
    method: 'Biuret Method',
    resultType: 'numeric',
    unit: 'g/dL',
    defaultReferenceRange: '6.0 - 8.3',
    minVal: 6.0,
    maxVal: 8.3,
    required: true,
    displayOrder: 7,
    reportOrder: 7
  },
  {
    id: 'p_lft_alb',
    parameterCode: 'ALB',
    parameterName: 'Serum Albumin',
    method: 'Bromocresol Green (BCG)',
    resultType: 'numeric',
    unit: 'g/dL',
    defaultReferenceRange: '3.5 - 5.5',
    minVal: 3.5,
    maxVal: 5.5,
    criticalLow: 1.8,
    required: true,
    displayOrder: 8,
    reportOrder: 8
  },
  {
    id: 'p_lft_glob',
    parameterCode: 'GLOB',
    parameterName: 'Serum Globulin',
    method: 'Calculated',
    resultType: 'numeric',
    unit: 'g/dL',
    defaultReferenceRange: '2.0 - 3.5',
    minVal: 2.0,
    maxVal: 3.5,
    required: false,
    displayOrder: 9,
    reportOrder: 9,
    isCalculated: true,
    calculationFormula: 'TP - ALB',
    calculationDependencies: ['TP', 'ALB']
  },
  {
    id: 'p_lft_ag',
    parameterCode: 'AG_RATIO',
    parameterName: 'A:G Ratio',
    method: 'Calculated',
    resultType: 'numeric',
    unit: 'ratio',
    defaultReferenceRange: '1.2 - 2.2',
    minVal: 1.2,
    maxVal: 2.2,
    required: false,
    displayOrder: 10,
    reportOrder: 10,
    isCalculated: true,
    calculationFormula: 'ALB / GLOB',
    calculationDependencies: ['ALB', 'GLOB']
  }
];

export const KFT_PARAMETERS: MasterTestParameter[] = [
  {
    id: 'p_kft_urea',
    parameterCode: 'UREA',
    parameterName: 'Blood Urea',
    method: 'GLDH Kinetic Enzymatic',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '15.0 - 45.0',
    minVal: 15.0,
    maxVal: 45.0,
    criticalHigh: 120.0,
    required: true,
    displayOrder: 1,
    reportOrder: 1
  },
  {
    id: 'p_kft_bun',
    parameterCode: 'BUN',
    parameterName: 'Blood Urea Nitrogen (BUN)',
    method: 'Calculated',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '7.0 - 20.0',
    minVal: 7.0,
    maxVal: 20.0,
    criticalHigh: 60.0,
    required: false,
    displayOrder: 2,
    reportOrder: 2
  },
  {
    id: 'p_kft_creat',
    parameterCode: 'CREAT',
    parameterName: 'Serum Creatinine',
    method: 'Modified Jaffe / Enzymatic',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '0.7 - 1.3',
    minVal: 0.7,
    maxVal: 1.3,
    criticalHigh: 5.0,
    required: true,
    displayOrder: 3,
    reportOrder: 3,
    ageGenderRanges: [
      { gender: 'male', referenceRange: '0.7 - 1.3', minVal: 0.7, maxVal: 1.3, criticalHigh: 5.0 },
      { gender: 'female', referenceRange: '0.5 - 1.1', minVal: 0.5, maxVal: 1.1, criticalHigh: 4.5 }
    ]
  },
  {
    id: 'p_kft_uric',
    parameterCode: 'URIC',
    parameterName: 'Serum Uric Acid',
    method: 'Uricase Enzymatic',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '3.5 - 7.2',
    minVal: 3.5,
    maxVal: 7.2,
    required: true,
    displayOrder: 4,
    reportOrder: 4,
    ageGenderRanges: [
      { gender: 'male', referenceRange: '3.5 - 7.2', minVal: 3.5, maxVal: 7.2 },
      { gender: 'female', referenceRange: '2.6 - 6.0', minVal: 2.6, maxVal: 6.0 }
    ]
  },
  {
    id: 'p_kft_na',
    parameterCode: 'NA',
    parameterName: 'Serum Sodium (Na+)',
    method: 'Ion Selective Electrode (ISE)',
    resultType: 'numeric',
    unit: 'mEq/L',
    defaultReferenceRange: '135.0 - 145.0',
    minVal: 135.0,
    maxVal: 145.0,
    criticalLow: 120.0,
    criticalHigh: 160.0,
    required: true,
    displayOrder: 5,
    reportOrder: 5
  },
  {
    id: 'p_kft_k',
    parameterCode: 'K',
    parameterName: 'Serum Potassium (K+)',
    method: 'Ion Selective Electrode (ISE)',
    resultType: 'numeric',
    unit: 'mEq/L',
    defaultReferenceRange: '3.5 - 5.1',
    minVal: 3.5,
    maxVal: 5.1,
    criticalLow: 2.8,
    criticalHigh: 6.5,
    required: true,
    displayOrder: 6,
    reportOrder: 6
  },
  {
    id: 'p_kft_cl',
    parameterCode: 'CL',
    parameterName: 'Serum Chloride (Cl-)',
    method: 'Ion Selective Electrode (ISE)',
    resultType: 'numeric',
    unit: 'mEq/L',
    defaultReferenceRange: '96.0 - 106.0',
    minVal: 96.0,
    maxVal: 106.0,
    required: false,
    displayOrder: 7,
    reportOrder: 7
  },
  {
    id: 'p_kft_ca',
    parameterCode: 'CA',
    parameterName: 'Serum Calcium',
    method: 'Arsenazo III',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '8.5 - 10.5',
    minVal: 8.5,
    maxVal: 10.5,
    criticalLow: 6.5,
    criticalHigh: 13.0,
    required: false,
    displayOrder: 8,
    reportOrder: 8
  }
];

export const LIPID_PARAMETERS: MasterTestParameter[] = [
  {
    id: 'p_lip_tchol',
    parameterCode: 'TCHOL',
    parameterName: 'Total Cholesterol',
    method: 'CHOD-PAP Enzymatic',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '125 - 200',
    minVal: 125,
    maxVal: 200,
    required: true,
    displayOrder: 1,
    reportOrder: 1
  },
  {
    id: 'p_lip_tg',
    parameterCode: 'TG',
    parameterName: 'Serum Triglycerides',
    method: 'GPO-PAP Enzymatic',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '50 - 150',
    minVal: 50,
    maxVal: 150,
    criticalHigh: 500,
    required: true,
    displayOrder: 2,
    reportOrder: 2
  },
  {
    id: 'p_lip_hdl',
    parameterCode: 'HDL',
    parameterName: 'HDL Cholesterol (Good)',
    method: 'Direct Enzymatic Clearance',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '40 - 60',
    minVal: 40,
    maxVal: 60,
    required: true,
    displayOrder: 3,
    reportOrder: 3
  },
  {
    id: 'p_lip_ldl',
    parameterCode: 'LDL',
    parameterName: 'LDL Cholesterol (Bad)',
    method: 'Friedewald Calculated',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '60 - 100',
    minVal: 60,
    maxVal: 100,
    required: true,
    displayOrder: 4,
    reportOrder: 4,
    isCalculated: true,
    calculationFormula: 'TC - HDL - (TG / 5)',
    calculationDependencies: ['TCHOL', 'HDL', 'TG']
  },
  {
    id: 'p_lip_vldl',
    parameterCode: 'VLDL',
    parameterName: 'VLDL Cholesterol',
    method: 'Calculated (TG / 5)',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '10 - 30',
    minVal: 10,
    maxVal: 30,
    required: false,
    displayOrder: 5,
    reportOrder: 5,
    isCalculated: true,
    calculationFormula: 'TG / 5',
    calculationDependencies: ['TG']
  },
  {
    id: 'p_lip_nonhdl',
    parameterCode: 'NON_HDL',
    parameterName: 'Non-HDL Cholesterol',
    method: 'Calculated (TC - HDL)',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '< 130',
    maxVal: 130,
    required: false,
    displayOrder: 6,
    reportOrder: 6,
    isCalculated: true,
    calculationFormula: 'TCHOL - HDL',
    calculationDependencies: ['TCHOL', 'HDL']
  },
  {
    id: 'p_lip_ratio',
    parameterCode: 'CHOL_HDL',
    parameterName: 'Total Chol / HDL Ratio',
    method: 'Calculated Ratio',
    resultType: 'numeric',
    unit: 'ratio',
    defaultReferenceRange: '3.0 - 5.0',
    minVal: 3.0,
    maxVal: 5.0,
    required: false,
    displayOrder: 7,
    reportOrder: 7,
    isCalculated: true,
    calculationFormula: 'TCHOL / HDL',
    calculationDependencies: ['TCHOL', 'HDL']
  }
];

export const URINE_ROUTINE_PARAMETERS: MasterTestParameter[] = [
  {
    id: 'p_urn_col',
    parameterCode: 'U_COL',
    parameterName: 'Color & Transparency',
    method: 'Visual Inspection',
    resultType: 'qualitative',
    unit: '',
    defaultReferenceRange: 'Pale Yellow / Clear',
    qualitativeOptions: ['Pale Yellow / Clear', 'Straw / Clear', 'Amber / Hazy', 'Deep Yellow', 'Reddish / Cloudy', 'Turbid'],
    required: true,
    displayOrder: 1,
    reportOrder: 1
  },
  {
    id: 'p_urn_sg',
    parameterCode: 'U_SG',
    parameterName: 'Specific Gravity',
    method: 'Refractometer / Dipstick',
    resultType: 'numeric',
    unit: '',
    defaultReferenceRange: '1.005 - 1.030',
    minVal: 1.005,
    maxVal: 1.030,
    required: true,
    displayOrder: 2,
    reportOrder: 2
  },
  {
    id: 'p_urn_ph',
    parameterCode: 'U_PH',
    parameterName: 'Reaction (pH)',
    method: 'Bromothymol Blue / Indicator Paper',
    resultType: 'numeric',
    unit: 'pH',
    defaultReferenceRange: '5.0 - 8.0',
    minVal: 5.0,
    maxVal: 8.0,
    required: true,
    displayOrder: 3,
    reportOrder: 3
  },
  {
    id: 'p_urn_prot',
    parameterCode: 'U_PROT',
    parameterName: 'Urine Protein / Albumin',
    method: 'Sulfosalicylic Acid / Dipstick',
    resultType: 'qualitative',
    unit: '',
    defaultReferenceRange: 'Nil / Negative',
    qualitativeOptions: ['Nil / Negative', 'Trace', '1+ (30 mg/dL)', '2+ (100 mg/dL)', '3+ (300 mg/dL)', '4+ (1000 mg/dL)'],
    required: true,
    displayOrder: 4,
    reportOrder: 4
  },
  {
    id: 'p_urn_glu',
    parameterCode: 'U_GLU',
    parameterName: 'Urine Sugar / Glucose',
    method: 'Glucose Oxidase / Benedicts',
    resultType: 'qualitative',
    unit: '',
    defaultReferenceRange: 'Nil / Negative',
    qualitativeOptions: ['Nil / Negative', 'Trace (0.1%)', '1+ (0.5%)', '2+ (1.0%)', '3+ (1.5%)', '4+ (2.0%)'],
    required: true,
    displayOrder: 5,
    reportOrder: 5
  },
  {
    id: 'p_urn_ket',
    parameterCode: 'U_KET',
    parameterName: 'Ketone Bodies (Acetone)',
    method: 'Sodium Nitroprusside (Rotheras)',
    resultType: 'qualitative',
    unit: '',
    defaultReferenceRange: 'Negative',
    qualitativeOptions: ['Negative', 'Trace', 'Positive (Small)', 'Positive (Moderate)', 'Positive (Large)'],
    required: false,
    displayOrder: 6,
    reportOrder: 6
  },
  {
    id: 'p_urn_pus',
    parameterCode: 'U_PUS',
    parameterName: 'Pus Cells (WBC)',
    method: 'Microscopic 40x HPF',
    resultType: 'numeric',
    unit: '/HPF',
    defaultReferenceRange: '0 - 5',
    minVal: 0,
    maxVal: 5,
    required: true,
    displayOrder: 7,
    reportOrder: 7
  },
  {
    id: 'p_urn_rbc',
    parameterCode: 'U_RBC',
    parameterName: 'Red Blood Cells (RBCs)',
    method: 'Microscopic 40x HPF',
    resultType: 'numeric',
    unit: '/HPF',
    defaultReferenceRange: '0 - 2',
    minVal: 0,
    maxVal: 2,
    required: true,
    displayOrder: 8,
    reportOrder: 8
  },
  {
    id: 'p_urn_epi',
    parameterCode: 'U_EPI',
    parameterName: 'Epithelial Cells',
    method: 'Microscopic 40x HPF',
    resultType: 'numeric',
    unit: '/HPF',
    defaultReferenceRange: '0 - 4',
    minVal: 0,
    maxVal: 4,
    required: false,
    displayOrder: 9,
    reportOrder: 9
  },
  {
    id: 'p_urn_cst',
    parameterCode: 'U_CAST',
    parameterName: 'Casts',
    method: 'Microscopic 10x / 40x',
    resultType: 'qualitative',
    unit: '/LPF',
    defaultReferenceRange: 'Not Seen',
    qualitativeOptions: ['Not Seen', 'Hyaline Casts (Occasional)', 'Granular Casts', 'RBC Casts', 'WBC Casts'],
    required: false,
    displayOrder: 10,
    reportOrder: 10
  },
  {
    id: 'p_urn_crys',
    parameterCode: 'U_CRYS',
    parameterName: 'Crystals',
    method: 'Microscopic 40x HPF',
    resultType: 'qualitative',
    unit: '',
    defaultReferenceRange: 'Not Seen',
    qualitativeOptions: ['Not Seen', 'Calcium Oxalate (Occasional)', 'Uric Acid Crystals', 'Triple Phosphate', 'Amorphous Urates'],
    required: false,
    displayOrder: 11,
    reportOrder: 11
  },
  {
    id: 'p_urn_bac',
    parameterCode: 'U_BAC',
    parameterName: 'Bacteria / Yeast',
    method: 'Microscopic 40x HPF',
    resultType: 'qualitative',
    unit: '',
    defaultReferenceRange: 'Absent',
    qualitativeOptions: ['Absent', 'Few', 'Moderate', 'Plenty'],
    required: false,
    displayOrder: 12,
    reportOrder: 12
  }
];

export const THYROID_PARAMETERS: MasterTestParameter[] = [
  {
    id: 'p_tft_t3',
    parameterCode: 'T3',
    parameterName: 'T3 - Total Triiodothyronine',
    method: 'Chemiluminescence Immunoassay (CLIA)',
    resultType: 'numeric',
    unit: 'ng/dL',
    defaultReferenceRange: '80.0 - 200.0',
    minVal: 80.0,
    maxVal: 200.0,
    required: true,
    displayOrder: 1,
    reportOrder: 1
  },
  {
    id: 'p_tft_t4',
    parameterCode: 'T4',
    parameterName: 'T4 - Total Thyroxine',
    method: 'Chemiluminescence Immunoassay (CLIA)',
    resultType: 'numeric',
    unit: 'mcg/dL',
    defaultReferenceRange: '4.5 - 12.0',
    minVal: 4.5,
    maxVal: 12.0,
    required: true,
    displayOrder: 2,
    reportOrder: 2
  },
  {
    id: 'p_tft_tsh',
    parameterCode: 'TSH',
    parameterName: 'TSH - Thyroid Stimulating Hormone (Ultrasensitive)',
    method: 'Chemiluminescence Immunoassay (CLIA)',
    resultType: 'numeric',
    unit: 'uIU/mL',
    defaultReferenceRange: '0.40 - 4.50',
    minVal: 0.40,
    maxVal: 4.50,
    criticalLow: 0.05,
    criticalHigh: 20.0,
    required: true,
    displayOrder: 3,
    reportOrder: 3
  }
];

export const HBA1C_PARAMETERS: MasterTestParameter[] = [
  {
    id: 'p_hba1c_val',
    parameterCode: 'HBA1C',
    parameterName: 'HbA1c (Glycosylated Hemoglobin)',
    method: 'HPLC - High Performance Liquid Chromatography',
    resultType: 'numeric',
    unit: '%',
    defaultReferenceRange: '4.0 - 5.6',
    minVal: 4.0,
    maxVal: 5.6,
    criticalHigh: 12.0,
    required: true,
    displayOrder: 1,
    reportOrder: 1,
    remarks: 'Non-Diabetic: <5.7%, Pre-Diabetic: 5.7 - 6.4%, Diabetic: >=6.5%'
  },
  {
    id: 'p_hba1c_eag',
    parameterCode: 'EAG',
    parameterName: 'Estimated Average Glucose (eAG)',
    method: 'Calculated from HbA1c (28.7 * HbA1c - 46.7)',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '70 - 115',
    minVal: 70,
    maxVal: 115,
    required: false,
    displayOrder: 2,
    reportOrder: 2
  }
];

export const GLUCOSE_FASTING_PARAMETERS: MasterTestParameter[] = [
  {
    id: 'p_glu_fbs',
    parameterCode: 'FBS',
    parameterName: 'Fasting Blood Glucose (FBS)',
    method: 'GOD-POD Enzymatic',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '70 - 99',
    minVal: 70,
    maxVal: 99,
    criticalLow: 45,
    criticalHigh: 400,
    required: true,
    displayOrder: 1,
    reportOrder: 1,
    remarks: 'Normal: 70-99, Impaired: 100-125, Diabetic: >=126 mg/dL'
  }
];

export const GLUCOSE_PP_PARAMETERS: MasterTestParameter[] = [
  {
    id: 'p_glu_ppbs',
    parameterCode: 'PPBS',
    parameterName: 'Post Prandial Blood Glucose (PPBS 2hr)',
    method: 'GOD-POD Enzymatic',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '80 - 140',
    minVal: 80,
    maxVal: 140,
    criticalLow: 50,
    criticalHigh: 450,
    required: true,
    displayOrder: 1,
    reportOrder: 1,
    remarks: 'Normal: <140, Impaired: 140-199, Diabetic: >=200 mg/dL'
  }
];

export const GLUCOSE_RANDOM_PARAMETERS: MasterTestParameter[] = [
  {
    id: 'p_glu_rbs',
    parameterCode: 'RBS',
    parameterName: 'Random Blood Sugar (RBS)',
    method: 'GOD-POD Enzymatic',
    resultType: 'numeric',
    unit: 'mg/dL',
    defaultReferenceRange: '70 - 140',
    minVal: 70,
    maxVal: 140,
    criticalLow: 45,
    criticalHigh: 450,
    required: true,
    displayOrder: 1,
    reportOrder: 1
  }
];

export const SEROLOGY_INFECTIOUS_PARAMETERS: MasterTestParameter[] = [
  {
    id: 'p_sero_dengue_ns1',
    parameterCode: 'DEN_NS1',
    parameterName: 'Dengue NS1 Antigen',
    method: 'Rapid Immunochromatography / ELISA',
    resultType: 'positive_negative',
    unit: '',
    defaultReferenceRange: 'Negative',
    qualitativeOptions: ['Negative', 'Positive'],
    required: true,
    displayOrder: 1,
    reportOrder: 1
  },
  {
    id: 'p_sero_dengue_igm',
    parameterCode: 'DEN_IGM',
    parameterName: 'Dengue IgM Antibodies',
    method: 'MAC-ELISA / Rapid Test',
    resultType: 'positive_negative',
    unit: '',
    defaultReferenceRange: 'Negative',
    qualitativeOptions: ['Negative', 'Positive'],
    required: false,
    displayOrder: 2,
    reportOrder: 2
  },
  {
    id: 'p_sero_dengue_igg',
    parameterCode: 'DEN_IGG',
    parameterName: 'Dengue IgG Antibodies',
    method: 'Rapid Test / ELISA',
    resultType: 'positive_negative',
    unit: '',
    defaultReferenceRange: 'Negative',
    qualitativeOptions: ['Negative', 'Positive'],
    required: false,
    displayOrder: 3,
    reportOrder: 3
  }
];

export const WIDAL_PARAMETERS: MasterTestParameter[] = [
  {
    id: 'p_widal_to',
    parameterCode: 'WID_TO',
    parameterName: 'S. Typhi Antigen "O"',
    method: 'Slide & Tube Agglutination',
    resultType: 'qualitative',
    unit: 'titer',
    defaultReferenceRange: '< 1:80',
    qualitativeOptions: ['Negative (< 1:20)', '1:40', '1:80', '1:160 (Significant)', '1:320 (Significant)'],
    required: true,
    displayOrder: 1,
    reportOrder: 1
  },
  {
    id: 'p_widal_th',
    parameterCode: 'WID_TH',
    parameterName: 'S. Typhi Antigen "H"',
    method: 'Slide & Tube Agglutination',
    resultType: 'qualitative',
    unit: 'titer',
    defaultReferenceRange: '< 1:80',
    qualitativeOptions: ['Negative (< 1:20)', '1:40', '1:80', '1:160 (Significant)', '1:320 (Significant)'],
    required: true,
    displayOrder: 2,
    reportOrder: 2
  },
  {
    id: 'p_widal_ah',
    parameterCode: 'WID_AH',
    parameterName: 'S. Paratyphi Antigen "AH"',
    method: 'Slide & Tube Agglutination',
    resultType: 'qualitative',
    unit: 'titer',
    defaultReferenceRange: '< 1:80',
    qualitativeOptions: ['Negative (< 1:20)', '1:40', '1:80', '1:160'],
    required: false,
    displayOrder: 3,
    reportOrder: 3
  },
  {
    id: 'p_widal_bh',
    parameterCode: 'WID_BH',
    parameterName: 'S. Paratyphi Antigen "BH"',
    method: 'Slide & Tube Agglutination',
    resultType: 'qualitative',
    unit: 'titer',
    defaultReferenceRange: '< 1:80',
    qualitativeOptions: ['Negative (< 1:20)', '1:40', '1:80', '1:160'],
    required: false,
    displayOrder: 4,
    reportOrder: 4
  }
];

export const MALARIA_PARAMETERS: MasterTestParameter[] = [
  {
    id: 'p_mal_pv',
    parameterCode: 'MAL_PV',
    parameterName: 'Plasmodium vivax (P.v) Antigen (pLDH)',
    method: 'Rapid Immunochromatography',
    resultType: 'positive_negative',
    unit: '',
    defaultReferenceRange: 'Negative',
    qualitativeOptions: ['Negative', 'Positive'],
    required: true,
    displayOrder: 1,
    reportOrder: 1
  },
  {
    id: 'p_mal_pf',
    parameterCode: 'MAL_PF',
    parameterName: 'Plasmodium falciparum (P.f) Antigen (HRP-2)',
    method: 'Rapid Immunochromatography',
    resultType: 'positive_negative',
    unit: '',
    defaultReferenceRange: 'Negative',
    qualitativeOptions: ['Negative', 'Positive'],
    required: true,
    displayOrder: 2,
    reportOrder: 2
  },
  {
    id: 'p_mal_smear',
    parameterCode: 'MAL_SMR',
    parameterName: 'Peripheral Smear Examination for MP',
    method: 'Leishman Stain Microscopy (Thick & Thin Smear)',
    resultType: 'qualitative',
    unit: '',
    defaultReferenceRange: 'No hemoparasites seen',
    qualitativeOptions: ['No hemoparasites seen', 'P. vivax trophozoites seen', 'P. falciparum ring forms seen', 'Gametocytes seen'],
    required: true,
    displayOrder: 3,
    reportOrder: 3
  }
];

export const HIV_PARAMETERS: MasterTestParameter[] = [
  {
    id: 'p_hiv_scr',
    parameterCode: 'HIV_SCR',
    parameterName: 'HIV 1 & 2 Antibodies Screening',
    method: '4th Gen Chemiluminescence / Rapid 3-line',
    resultType: 'reactive_non_reactive',
    unit: '',
    defaultReferenceRange: 'Non-Reactive',
    qualitativeOptions: ['Non-Reactive', 'Reactive'],
    required: true,
    displayOrder: 1,
    reportOrder: 1
  }
];

export const HBSAG_PARAMETERS: MasterTestParameter[] = [
  {
    id: 'p_hbsag_scr',
    parameterCode: 'HBSAG',
    parameterName: 'Hepatitis B Surface Antigen (HBsAg)',
    method: 'Chemiluminescent Microparticle Immunoassay (CMIA)',
    resultType: 'reactive_non_reactive',
    unit: '',
    defaultReferenceRange: 'Non-Reactive',
    qualitativeOptions: ['Non-Reactive', 'Reactive'],
    required: true,
    displayOrder: 1,
    reportOrder: 1
  }
];

export const HCV_PARAMETERS: MasterTestParameter[] = [
  {
    id: 'p_hcv_scr',
    parameterCode: 'HCV',
    parameterName: 'Hepatitis C Virus (HCV) Antibodies',
    method: 'Chemiluminescent Immunoassay (CMIA)',
    resultType: 'reactive_non_reactive',
    unit: '',
    defaultReferenceRange: 'Non-Reactive',
    qualitativeOptions: ['Non-Reactive', 'Reactive'],
    required: true,
    displayOrder: 1,
    reportOrder: 1
  }
];

export const ELECTROLYTES_PARAMETERS: MasterTestParameter[] = [
  {
    id: 'p_elec_na',
    parameterCode: 'NA',
    parameterName: 'Serum Sodium (Na+)',
    method: 'Ion Selective Electrode (ISE)',
    resultType: 'numeric',
    unit: 'mEq/L',
    defaultReferenceRange: '135 - 145',
    minVal: 135,
    maxVal: 145,
    criticalLow: 120,
    criticalHigh: 160,
    required: true,
    displayOrder: 1,
    reportOrder: 1
  },
  {
    id: 'p_elec_k',
    parameterCode: 'K',
    parameterName: 'Serum Potassium (K+)',
    method: 'Ion Selective Electrode (ISE)',
    resultType: 'numeric',
    unit: 'mEq/L',
    defaultReferenceRange: '3.5 - 5.1',
    minVal: 3.5,
    maxVal: 5.1,
    criticalLow: 2.8,
    criticalHigh: 6.5,
    required: true,
    displayOrder: 2,
    reportOrder: 2
  },
  {
    id: 'p_elec_cl',
    parameterCode: 'CL',
    parameterName: 'Serum Chloride (Cl-)',
    method: 'Ion Selective Electrode (ISE)',
    resultType: 'numeric',
    unit: 'mEq/L',
    defaultReferenceRange: '96 - 106',
    minVal: 96,
    maxVal: 106,
    required: true,
    displayOrder: 3,
    reportOrder: 3
  },
  {
    id: 'p_elec_bicarb',
    parameterCode: 'HCO3',
    parameterName: 'Serum Bicarbonate (HCO3-)',
    method: 'Enzymatic / ISE',
    resultType: 'numeric',
    unit: 'mEq/L',
    defaultReferenceRange: '22 - 29',
    minVal: 22,
    maxVal: 29,
    criticalLow: 10,
    criticalHigh: 40,
    required: false,
    displayOrder: 4,
    reportOrder: 4
  }
];

// ============================================================================
// SERVICE CLASS: TEST MASTER AS SINGLE SOURCE OF TRUTH
// ============================================================================

export class TestMasterService {
  /**
   * Look up standard blueprint parameters by test name or code
   */
  public static getBlueprintForTest(testNameOrCode: string): MasterTestParameter[] | null {
    const q = (testNameOrCode || '').toLowerCase().trim();

    if (q.includes('cbc') || q.includes('complete blood count') || q.includes('hemogram') || q.includes('haemogram')) {
      return CBC_PARAMETERS;
    }
    if (q.includes('lft') || q.includes('liver function')) {
      return LFT_PARAMETERS;
    }
    if (q.includes('kft') || q.includes('rft') || q.includes('kidney function') || q.includes('renal function')) {
      return KFT_PARAMETERS;
    }
    if (q.includes('lipid profile') || q.includes('cholesterol') || q.includes('lipid panel')) {
      return LIPID_PARAMETERS;
    }
    if (q.includes('urine routine') || q.includes('urine examination') || q.includes('urine r/m') || q.includes('urinalysis')) {
      return URINE_ROUTINE_PARAMETERS;
    }
    if (q.includes('tft') || q.includes('thyroid profile') || q.includes('thyroid panel')) {
      return THYROID_PARAMETERS;
    }
    if (q.includes('hba1c') || q.includes('glycated hemoglobin') || q.includes('glycosylated')) {
      return HBA1C_PARAMETERS;
    }
    if (q.includes('fasting blood sugar') || q.includes('fbs') || q.includes('glucose fasting')) {
      return GLUCOSE_FASTING_PARAMETERS;
    }
    if (q.includes('post prandial') || q.includes('ppbs') || q.includes('glucose pp')) {
      return GLUCOSE_PP_PARAMETERS;
    }
    if (q.includes('random blood sugar') || q.includes('rbs') || q.includes('glucose random')) {
      return GLUCOSE_RANDOM_PARAMETERS;
    }
    if (q.includes('dengue')) {
      return SEROLOGY_INFECTIOUS_PARAMETERS;
    }
    if (q.includes('widal') || q.includes('typhoid')) {
      return WIDAL_PARAMETERS;
    }
    if (q.includes('malaria') || q.includes('mp')) {
      return MALARIA_PARAMETERS;
    }
    if (q.includes('hiv')) {
      return HIV_PARAMETERS;
    }
    if (q.includes('hbsag') || q.includes('hepatitis b')) {
      return HBSAG_PARAMETERS;
    }
    if (q.includes('hcv') || q.includes('hepatitis c')) {
      return HCV_PARAMETERS;
    }
    if (q.includes('electrolyte') || q.includes('electrolytes') || q.includes('na/k/cl')) {
      return ELECTROLYTES_PARAMETERS;
    }

    return null;
  }

  /**
   * Get all tests with populated parameters
   */
  public static getAllTests(): LabTestItem[] {
    const rawTests = CatalogService.getLabTests();
    return rawTests.map(t => {
      if (t.parameters && t.parameters.length > 0) {
        return t;
      }
      // Auto-attach standard blueprint if missing
      const blueprint = this.getBlueprintForTest(t.name) || this.getBlueprintForTest(t.code);
      if (blueprint) {
        return {
          ...t,
          parameters: blueprint
        };
      }
      // Fallback single parameter test
      return {
        ...t,
        parameters: [
          {
            id: `p_${t.id}_default`,
            parameterCode: t.code,
            parameterName: t.name,
            resultType: 'numeric' as TestResultType,
            unit: 'mg/dL',
            defaultReferenceRange: 'Normal',
            displayOrder: 1,
            reportOrder: 1,
            required: true
          }
        ]
      };
    });
  }

  /**
   * Find single test by ID
   */
  public static getTestById(id: string): LabTestItem | undefined {
    return this.getAllTests().find(t => t.id === id);
  }

  /**
   * Find single test by Name or Code
   */
  public static getTestByNameOrCode(nameOrCode: string): LabTestItem | undefined {
    const q = (nameOrCode || '').toLowerCase().trim();
    return this.getAllTests().find(
      t => t.name.toLowerCase().trim() === q || t.code.toLowerCase().trim() === q
    );
  }

  /**
   * Resolves reference range according to patient age and gender if configured
   */
  public static resolveReferenceRange(
    param: MasterTestParameter,
    patientAge?: number,
    patientGender?: string
  ): { referenceRange: string; minVal?: number; maxVal?: number; criticalLow?: number; criticalHigh?: number } {
    if (!param.ageGenderRanges || param.ageGenderRanges.length === 0) {
      return {
        referenceRange: param.defaultReferenceRange,
        minVal: param.minVal,
        maxVal: param.maxVal,
        criticalLow: param.criticalLow,
        criticalHigh: param.criticalHigh
      };
    }

    const genderNorm = (patientGender || 'all').toLowerCase();
    const ageNorm = typeof patientAge === 'number' && !isNaN(patientAge) ? patientAge : 30;

    const matched = param.ageGenderRanges.find(r => {
      const genderMatch = !r.gender || r.gender === 'all' || r.gender.toLowerCase() === genderNorm;
      const minAgeMatch = r.minAgeYears === undefined || ageNorm >= r.minAgeYears;
      const maxAgeMatch = r.maxAgeYears === undefined || ageNorm <= r.maxAgeYears;
      return genderMatch && minAgeMatch && maxAgeMatch;
    });

    if (matched) {
      return {
        referenceRange: matched.referenceRange,
        minVal: matched.minVal !== undefined ? matched.minVal : param.minVal,
        maxVal: matched.maxVal !== undefined ? matched.maxVal : param.maxVal,
        criticalLow: matched.criticalLow !== undefined ? matched.criticalLow : param.criticalLow,
        criticalHigh: matched.criticalHigh !== undefined ? matched.criticalHigh : param.criticalHigh
      };
    }

    return {
      referenceRange: param.defaultReferenceRange,
      minVal: param.minVal,
      maxVal: param.maxVal,
      criticalLow: param.criticalLow,
      criticalHigh: param.criticalHigh
    };
  }

  /**
   * Builds an immutable BookedTestConfig snapshot for an order booking
   */
  public static createBookedTestConfig(
    test: LabTestItem,
    patientAge?: number,
    patientGender?: string
  ): BookedTestConfig {
    const params = test.parameters && test.parameters.length > 0
      ? test.parameters
      : (this.getBlueprintForTest(test.name) || [
          {
            id: `p_${test.id}_def`,
            parameterCode: test.code,
            parameterName: test.name,
            resultType: 'numeric' as TestResultType,
            unit: 'mg/dL',
            defaultReferenceRange: 'Normal',
            displayOrder: 1,
            reportOrder: 1,
            required: true
          }
        ]);

    const resolvedParameters: MasterTestParameter[] = params.map(p => {
      const resolved = this.resolveReferenceRange(p, patientAge, patientGender);
      return {
        ...p,
        defaultReferenceRange: resolved.referenceRange,
        minVal: resolved.minVal,
        maxVal: resolved.maxVal,
        criticalLow: resolved.criticalLow,
        criticalHigh: resolved.criticalHigh
      };
    });

    return {
      testId: test.id,
      testCode: test.code,
      testName: test.name,
      department: test.department || 'Pathology & Diagnostic Medicine',
      specimen: test.specimen || 'Standard Specimen',
      method: test.method,
      tatHours: test.tatHours,
      parameters: resolvedParameters
    };
  }

  /**
   * Creates initial LabParameterResult list from a single test or multiple tests
   */
  public static buildInitialResultsFromBookedTests(
    bookedTests: BookedTestConfig[]
  ): LabParameterResult[] {
    const results: LabParameterResult[] = [];

    for (const test of bookedTests) {
      for (const param of test.parameters) {
        results.push({
          id: `res_${test.testId}_${param.id}_${generateUuid().slice(0, 4)}`,
          testId: test.testId,
          testName: test.testName,
          parameterId: param.id,
          parameterCode: param.parameterCode,
          parameterName: param.parameterName,
          observedValue: '',
          unit: param.unit,
          referenceRange: param.defaultReferenceRange,
          flag: 'normal',
          critical: false,
          method: param.method || test.method,
          resultType: param.resultType,
          displayOrder: param.displayOrder,
          reportOrder: param.reportOrder,
          required: param.required,
          qualitativeOptions: param.qualitativeOptions,
          minVal: param.minVal,
          maxVal: param.maxVal,
          criticalLow: param.criticalLow,
          criticalHigh: param.criticalHigh,
          notes: param.remarks
        });
      }
    }

    return results;
  }

  /**
   * Real-time automated abnormal and critical evaluation based on Test Master configuration
   */
  public static evaluateAbnormalFlag(
    param: {
      resultType?: TestResultType;
      referenceRange?: string;
      minVal?: number;
      maxVal?: number;
      criticalLow?: number;
      criticalHigh?: number;
      parameterName?: string;
    },
    observedValueStr: string
  ): { flag: LabParameterFlag; critical: boolean } {
    if (!observedValueStr || !observedValueStr.trim()) {
      return { flag: 'normal', critical: false };
    }

    const val = observedValueStr.trim();
    const lowerVal = val.toLowerCase();

    // 1. Check qualitative positive/reactive values
    if (
      lowerVal === 'positive' ||
      lowerVal === 'reactive' ||
      lowerVal.includes('reactive') ||
      lowerVal.includes('positive') ||
      lowerVal.includes('significant') ||
      lowerVal.includes('seen') ||
      lowerVal.includes('plenty')
    ) {
      if (lowerVal === 'negative' || lowerVal === 'non-reactive' || lowerVal === 'not seen' || lowerVal === 'absent') {
        return { flag: 'normal', critical: false };
      }
      return { flag: 'high', critical: false };
    }

    if (
      lowerVal === 'negative' ||
      lowerVal === 'non-reactive' ||
      lowerVal === 'nil' ||
      lowerVal === 'normal' ||
      lowerVal === 'not seen' ||
      lowerVal === 'absent'
    ) {
      return { flag: 'normal', critical: false };
    }

    // 2. Numeric evaluation
    const num = parseFloat(val);
    if (isNaN(num)) {
      return { flag: 'normal', critical: false };
    }

    // Check critical panic boundaries first
    if (param.criticalLow !== undefined && num <= param.criticalLow) {
      return { flag: 'critical', critical: true };
    }
    if (param.criticalHigh !== undefined && num >= param.criticalHigh) {
      return { flag: 'critical', critical: true };
    }

    // Check reference range min/max
    let min = param.minVal;
    let max = param.maxVal;

    if ((min === undefined || max === undefined) && param.referenceRange) {
      const match = param.referenceRange.match(/([\d.]+)\s*-\s*([\d.]+)/);
      if (match) {
        min = parseFloat(match[1]);
        max = parseFloat(match[2]);
      }
    }

    if (min !== undefined && num < min) {
      // If critical limits not specified, panic threshold at 65% of min
      if (num < min * 0.65) {
        return { flag: 'critical', critical: true };
      }
      return { flag: 'low', critical: false };
    }

    if (max !== undefined && num > max) {
      // If critical limits not specified, panic threshold at 140% of max
      if (num > max * 1.40) {
        return { flag: 'critical', critical: true };
      }
      return { flag: 'high', critical: false };
    }

    return { flag: 'normal', critical: false };
  }

  /**
   * Save or update test configuration in Test Master
   */
  public static saveTest(test: LabTestItem): LabTestItem {
    const all = CatalogService.getLabTests();
    const idx = all.findIndex(t => t.id === test.id || t.code === test.code);
    const now = new Date().toISOString();

    const updated: LabTestItem = {
      ...test,
      version: (test.version || 1) + 1,
      updatedAt: now
    };

    if (idx >= 0) {
      all[idx] = updated;
    } else {
      all.unshift(updated);
    }

    CatalogService.saveLabTests(all);
    ApiSyncService.saveDocument('labTests', updated.id, updated).catch(() => {});
    return updated;
  }

  // ============================================================================
  // CALCULATION RULES & AUTOMATED CALCULATION ENGINE (Requirement 9)
  // ============================================================================

  public static readonly CALCULATION_RULES: import('../types').CalculationRule[] = [
    // Lipid Profile
    {
      targetParameterCode: 'VLDL',
      targetParameterName: 'VLDL Cholesterol',
      formulaDescription: 'Triglycerides / 5',
      requiredParameterCodes: ['TG'],
      conditionDescription: 'Standard Friedewald model',
      unit: 'mg/dL'
    },
    {
      targetParameterCode: 'LDL',
      targetParameterName: 'LDL Cholesterol',
      formulaDescription: 'Total Cholesterol - HDL - (Triglycerides / 5)',
      requiredParameterCodes: ['TCHOL', 'HDL', 'TG'],
      conditionDescription: 'Friedewald formula valid when Triglycerides < 400 mg/dL',
      unit: 'mg/dL'
    },
    {
      targetParameterCode: 'NON_HDL',
      targetParameterName: 'Non-HDL Cholesterol',
      formulaDescription: 'Total Cholesterol - HDL',
      requiredParameterCodes: ['TCHOL', 'HDL'],
      conditionDescription: 'Atherogenic particle estimate',
      unit: 'mg/dL'
    },
    {
      targetParameterCode: 'CHOL_HDL',
      targetParameterName: 'Total Chol / HDL Ratio',
      formulaDescription: 'Total Cholesterol / HDL',
      requiredParameterCodes: ['TCHOL', 'HDL'],
      conditionDescription: 'Cardiovascular risk index',
      unit: 'ratio'
    },
    // Liver Function Test
    {
      targetParameterCode: 'BIL_INDIR',
      targetParameterName: 'Bilirubin Indirect',
      formulaDescription: 'Total Bilirubin - Direct Bilirubin',
      requiredParameterCodes: ['TBIL', 'DBIL'],
      conditionDescription: 'Unconjugated fraction',
      unit: 'mg/dL'
    },
    {
      targetParameterCode: 'GLOB',
      targetParameterName: 'Serum Globulin',
      formulaDescription: 'Total Protein - Serum Albumin',
      requiredParameterCodes: ['TP', 'ALB'],
      conditionDescription: 'Immune & transport protein fraction',
      unit: 'g/dL'
    },
    {
      targetParameterCode: 'AG_RATIO',
      targetParameterName: 'A:G Ratio',
      formulaDescription: 'Serum Albumin / Serum Globulin',
      requiredParameterCodes: ['ALB', 'GLOB'],
      conditionDescription: 'Liver synthetic & protein balance',
      unit: 'ratio'
    },
    // Kidney Function Test
    {
      targetParameterCode: 'BUN',
      targetParameterName: 'Blood Urea Nitrogen (BUN)',
      formulaDescription: 'Blood Urea / 2.14',
      requiredParameterCodes: ['UREA'],
      conditionDescription: 'Stoichiometric nitrogen balance',
      unit: 'mg/dL'
    },
    {
      targetParameterCode: 'BUN_CREAT_RATIO',
      targetParameterName: 'BUN / Creatinine Ratio',
      formulaDescription: 'BUN / Serum Creatinine',
      requiredParameterCodes: ['BUN', 'CREAT'],
      conditionDescription: 'Pre-renal vs intrinsic renal failure',
      unit: 'ratio'
    },
    // Hematology
    {
      targetParameterCode: 'MCV',
      targetParameterName: 'Mean Corpuscular Volume (MCV)',
      formulaDescription: '(PCV * 10) / RBC',
      requiredParameterCodes: ['PCV', 'RBC'],
      conditionDescription: 'Erythrocyte average volume in fL',
      unit: 'fL'
    },
    {
      targetParameterCode: 'MCH',
      targetParameterName: 'Mean Corpuscular Hemoglobin (MCH)',
      formulaDescription: '(Hb * 10) / RBC',
      requiredParameterCodes: ['HB', 'RBC'],
      conditionDescription: 'Average hemoglobin weight per red cell in pg',
      unit: 'pg'
    },
    {
      targetParameterCode: 'MCHC',
      targetParameterName: 'Mean Corpuscular Hemoglobin Conc. (MCHC)',
      formulaDescription: '(Hb * 100) / PCV',
      requiredParameterCodes: ['HB', 'PCV'],
      conditionDescription: 'Hemoglobin concentration in packed cells',
      unit: 'g/dL'
    },
    // Diabetes
    {
      targetParameterCode: 'EAG',
      targetParameterName: 'Estimated Average Glucose (eAG)',
      formulaDescription: '28.7 * HbA1c - 46.7',
      requiredParameterCodes: ['HBA1C'],
      conditionDescription: 'ADA translation of glycation to mean plasma glucose',
      unit: 'mg/dL'
    }
  ];

  /**
   * Automated Clinical Calculation Engine:
   * Analyzes observed values across all entered parameters, verifies prerequisite
   * clinical conditions, and auto-populates dependent calculated parameters.
   */
  public static runAutomatedCalculations(
    parameters: LabParameterResult[],
    patientAge: number = 45,
    patientGender: string = 'male'
  ): { updatedParameters: LabParameterResult[]; calculatedCount: number } {
    let calculatedCount = 0;
    const nextParams = [...parameters];

    // Build value map keyed by normalized parameterCode and lowercase parameterName
    const valMap = new Map<string, number>();
    for (const p of nextParams) {
      if (p.observedValue && p.observedValue.trim()) {
        const num = parseFloat(p.observedValue.trim());
        if (!isNaN(num)) {
          if (p.parameterCode) valMap.set(p.parameterCode.toUpperCase(), num);
          valMap.set(p.parameterName.toLowerCase(), num);
        }
      }
    }

    // Helper getter across alias codes
    const getVal = (...keys: string[]): number | undefined => {
      for (const k of keys) {
        const direct = valMap.get(k.toUpperCase()) ?? valMap.get(k.toLowerCase());
        if (direct !== undefined) return direct;
      }
      return undefined;
    };

    // Evaluate each parameter that is marked as calculated or matches known clinical rules
    for (let i = 0; i < nextParams.length; i++) {
      const p = nextParams[i];
      const pCode = (p.parameterCode || '').toUpperCase();
      const pName = p.parameterName.toLowerCase();

      let computedVal: number | null = null;
      let notes: string | undefined = p.notes;

      // 1. LIPID: VLDL = TG / 5
      if (pCode === 'VLDL' || pName.includes('vldl')) {
        const tg = getVal('TG', 'triglycerides', 'serum triglycerides');
        if (tg !== undefined && tg > 0) {
          computedVal = +(tg / 5).toFixed(1);
          p.isCalculated = true;
          p.calculationFormula = 'TG / 5';
        }
      }

      // 2. LIPID: LDL = TC - HDL - (TG / 5) [Friedewald formula]
      else if (pCode === 'LDL' || pName.includes('ldl cholesterol') || pName === 'ldl') {
        const tc = getVal('TCHOL', 'total cholesterol', 'cholesterol');
        const hdl = getVal('HDL', 'hdl cholesterol (good)', 'hdl cholesterol');
        const tg = getVal('TG', 'triglycerides', 'serum triglycerides');

        if (tc !== undefined && hdl !== undefined && tg !== undefined) {
          if (tg > 400) {
            notes = 'Note: Friedewald formula unreliable when Triglycerides > 400 mg/dL. Direct LDL recommended.';
          } else {
            const vldl = tg / 5;
            const ldl = tc - hdl - vldl;
            if (ldl >= 0) {
              computedVal = +ldl.toFixed(1);
              p.isCalculated = true;
              p.calculationFormula = 'TC - HDL - (TG / 5)';
            }
          }
        }
      }

      // 3. LIPID: Non-HDL = TC - HDL
      else if (pCode === 'NON_HDL' || pName.includes('non-hdl') || pName.includes('non hdl')) {
        const tc = getVal('TCHOL', 'total cholesterol', 'cholesterol');
        const hdl = getVal('HDL', 'hdl cholesterol (good)', 'hdl cholesterol');
        if (tc !== undefined && hdl !== undefined && tc >= hdl) {
          computedVal = +(tc - hdl).toFixed(1);
          p.isCalculated = true;
          p.calculationFormula = 'TC - HDL';
        }
      }

      // 4. LIPID: TC / HDL Ratio
      else if (pCode === 'CHOL_HDL' || pName.includes('chol / hdl ratio') || pName.includes('chol:hdl')) {
        const tc = getVal('TCHOL', 'total cholesterol', 'cholesterol');
        const hdl = getVal('HDL', 'hdl cholesterol (good)', 'hdl cholesterol');
        if (tc !== undefined && hdl !== undefined && hdl > 0) {
          computedVal = +(tc / hdl).toFixed(2);
          p.isCalculated = true;
          p.calculationFormula = 'TC / HDL';
        }
      }

      // 5. LFT: Indirect Bilirubin = Total Bilirubin - Direct Bilirubin
      else if (pCode === 'BIL_INDIR' || pName.includes('indirect bilirubin') || pName === 'bilirubin indirect') {
        const tbil = getVal('TBIL', 'total bilirubin', 'bilirubin total');
        const dbil = getVal('DBIL', 'direct bilirubin', 'bilirubin direct');
        if (tbil !== undefined && dbil !== undefined) {
          computedVal = +Math.max(0, tbil - dbil).toFixed(2);
          p.isCalculated = true;
          p.calculationFormula = 'Total Bilirubin - Direct Bilirubin';
        }
      }

      // 6. LFT: Globulin = Total Protein - Albumin
      else if (pCode === 'GLOB' || pName.includes('globulin') || pName === 'serum globulin') {
        const tp = getVal('TP', 'total protein');
        const alb = getVal('ALB', 'serum albumin', 'albumin');
        if (tp !== undefined && alb !== undefined && tp >= alb) {
          computedVal = +(tp - alb).toFixed(2);
          p.isCalculated = true;
          p.calculationFormula = 'Total Protein - Albumin';
          // Update valMap for immediate downstream A:G ratio calculation
          valMap.set('GLOB', computedVal);
          valMap.set('serum globulin', computedVal);
        }
      }

      // 7. LFT: A:G Ratio = Albumin / Globulin
      else if (pCode === 'AG_RATIO' || pName.includes('a:g ratio') || pName.includes('a/g ratio')) {
        const alb = getVal('ALB', 'serum albumin', 'albumin');
        const glob = getVal('GLOB', 'serum globulin', 'globulin');
        if (alb !== undefined && glob !== undefined && glob > 0) {
          computedVal = +(alb / glob).toFixed(2);
          p.isCalculated = true;
          p.calculationFormula = 'Albumin / Globulin';
        }
      }

      // 8. KFT: BUN = Urea / 2.14
      else if (pCode === 'BUN' || pName.includes('blood urea nitrogen')) {
        const urea = getVal('UREA', 'blood urea', 'serum urea');
        if (urea !== undefined && urea > 0) {
          computedVal = +(urea / 2.14).toFixed(1);
          p.isCalculated = true;
          p.calculationFormula = 'Urea / 2.14';
          valMap.set('BUN', computedVal);
        }
      }

      // 9. HEMATOLOGY: MCV = (PCV * 10) / RBC
      else if (pCode === 'MCV' || pName.includes('mean corpuscular volume') || pName === 'mcv') {
        const pcv = getVal('PCV', 'packed cell volume (pcv / hematocrit)', 'hematocrit');
        const rbc = getVal('RBC', 'red blood cell count (rbc)');
        if (pcv !== undefined && rbc !== undefined && rbc > 0) {
          computedVal = +((pcv * 10) / rbc).toFixed(1);
          p.isCalculated = true;
          p.calculationFormula = '(PCV * 10) / RBC';
        }
      }

      // 10. HEMATOLOGY: MCH = (Hb * 10) / RBC
      else if (pCode === 'MCH' || pName.includes('mean corpuscular hemoglobin (mch)')) {
        const hb = getVal('HB', 'hemoglobin (hb)', 'hemoglobin');
        const rbc = getVal('RBC', 'red blood cell count (rbc)');
        if (hb !== undefined && rbc !== undefined && rbc > 0) {
          computedVal = +((hb * 10) / rbc).toFixed(1);
          p.isCalculated = true;
          p.calculationFormula = '(Hb * 10) / RBC';
        }
      }

      // 11. HEMATOLOGY: MCHC = (Hb * 100) / PCV
      else if (pCode === 'MCHC' || pName.includes('mean corpuscular hemoglobin conc.')) {
        const hb = getVal('HB', 'hemoglobin (hb)', 'hemoglobin');
        const pcv = getVal('PCV', 'packed cell volume (pcv / hematocrit)', 'hematocrit');
        if (hb !== undefined && pcv !== undefined && pcv > 0) {
          computedVal = +((hb * 100) / pcv).toFixed(1);
          p.isCalculated = true;
          p.calculationFormula = '(Hb * 100) / PCV';
        }
      }

      // 12. DIABETES: eAG = 28.7 * HbA1c - 46.7
      else if (pCode === 'EAG' || pName.includes('estimated average glucose') || pName.includes('eag')) {
        const hba1c = getVal('HBA1C', 'glycated hemoglobin (hba1c)', 'hba1c');
        if (hba1c !== undefined && hba1c > 3.0) {
          computedVal = +Math.round(28.7 * hba1c - 46.7);
          p.isCalculated = true;
          p.calculationFormula = '28.7 * HbA1c - 46.7';
        }
      }

      // If a valid calculation occurred, update observedValue & flag
      if (computedVal !== null) {
        const strVal = computedVal.toString();
        const evalRes = this.evaluateAbnormalFlag(
          {
            resultType: p.resultType,
            referenceRange: p.referenceRange,
            parameterName: p.parameterName
          },
          strVal
        );

        nextParams[i] = {
          ...p,
          observedValue: strVal,
          flag: evalRes.flag,
          critical: evalRes.critical,
          notes: notes || p.notes,
          isCalculated: true
        };
        calculatedCount++;
      }
    }

    return { updatedParameters: nextParams, calculatedCount };
  }

  /**
   * Panel Expander (Requirement 4 & 5):
   * Expands a Panel / Package into its constituent Individual Tests and parameters
   * without duplicating parameter definitions in multiple places.
   */
  public static expandPanelToBookedTests(
    panel: import('../types').LabPanelItem,
    patientAge: number = 45,
    patientGender: string = 'male'
  ): BookedTestConfig[] {
    const allIndividualTests = CatalogService.getLabTests();
    const result: BookedTestConfig[] = [];

    // 1. If panel specifies constituent test IDs, resolve each referenced test
    if (panel.individualTestIds && panel.individualTestIds.length > 0) {
      for (const testId of panel.individualTestIds) {
        const indTest = allIndividualTests.find(t => t.id === testId);
        if (indTest) {
          const config = this.createBookedTestConfig(indTest, patientAge, patientGender);
          config.panelId = panel.id;
          config.panelName = panel.name;
          config.isFromPanel = true;
          result.push(config);
        }
      }
    }

    // 2. If no individual tests were explicitly matched or panel is a master clinical panel
    // (e.g. Lipid Profile, LFT, CBC, KFT), resolve from standard authoritative blueprint
    if (result.length === 0) {
      const blueprintParams = this.getBlueprintForTest(panel.name) || [];
      const resolvedParams = blueprintParams.map(p => {
        const range = this.resolveReferenceRange(p, patientAge, patientGender);
        return {
          ...p,
          defaultReferenceRange: range.referenceRange,
          minVal: range.minVal,
          maxVal: range.maxVal,
          criticalLow: range.criticalLow,
          criticalHigh: range.criticalHigh
        };
      });

      result.push({
        testId: panel.id,
        testCode: panel.code,
        testName: panel.name,
        department: panel.department,
        specimen: panel.specimen,
        tatHours: panel.tatHours,
        panelId: panel.id,
        panelName: panel.name,
        isFromPanel: true,
        parameters: resolvedParams
      });
    }

    return result;
  }
}
