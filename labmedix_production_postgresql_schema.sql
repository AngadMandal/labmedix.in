-- ============================================================================
-- LABMEDIX ENTERPRISE FULL HOSPITAL MANAGEMENT SYSTEM (HMS)
-- MASTER PRODUCTION POSTGRESQL SCHEMA (DDL)
-- Single Source of Truth: Core Relational Architecture (45+ Domain Tables)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean schema initialization
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

-- ============================================================================
-- 0. AUDIT & UTILITY TRIGGER FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.version = COALESCE(OLD.version, 0) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. AUTHENTICATION, STAFF, ROLES & PERMISSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    head_staff_id VARCHAR(50),
    is_clinical BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_key VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('view', 'create', 'edit', 'approve', 'reject', 'verify', 'issue', 'print', 'reprint', 'cancel', 'refund', 'export', 'manage')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    data_scope VARCHAR(50) NOT NULL DEFAULT 'department' CHECK (data_scope IN ('own', 'assigned', 'department', 'hospital_wide')),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    designation VARCHAR(150),
    pin_code_hash VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive', 'locked')),
    last_login_at TIMESTAMPTZ,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    allowed_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- ============================================================================
-- 2. COMPANY PROFILE & INSTITUTIONAL BRANDING
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    tagline VARCHAR(255),
    logo_url TEXT,
    logo_size VARCHAR(20) DEFAULT 'md',
    logo_position VARCHAR(20) DEFAULT 'left',
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    whatsapp_number VARCHAR(50),
    emergency_contact VARCHAR(50),
    website VARCHAR(255),
    address_street TEXT,
    address_city VARCHAR(100),
    address_state VARCHAR(100),
    address_pincode VARCHAR(20),
    registration_number VARCHAR(100),
    gst_number VARCHAR(100),
    pan_number VARCHAR(100),
    nabh_nabl_accreditation VARCHAR(150),
    print_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. PATIENTS MASTER RELATIONSHIP
-- ============================================================================
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(50) NOT NULL UNIQUE, -- e.g. LMDX-2026-000001
    uhid VARCHAR(50) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    dob DATE,
    age INT NOT NULL CHECK (age >= 0 AND age <= 150),
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    blood_group VARCHAR(10) NOT NULL DEFAULT 'Unknown' CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown', 'Not Provided')),
    blood_group_status VARCHAR(20) DEFAULT 'Unverified' CHECK (blood_group_status IN ('Verified', 'Unverified', 'Pending Verification')),
    mobile VARCHAR(30) NOT NULL,
    whatsapp VARCHAR(30),
    email VARCHAR(255),
    photo_url TEXT,
    
    -- Address Normalized
    village_area VARCHAR(255),
    post_office VARCHAR(150),
    police_station VARCHAR(150),
    district VARCHAR(150),
    state VARCHAR(150),
    pin_code VARCHAR(20),
    full_address TEXT,

    -- Emergency Contact
    emergency_name VARCHAR(200),
    emergency_relationship VARCHAR(100),
    emergency_mobile VARCHAR(30),

    -- Clinical Baseline
    allergies TEXT,
    chronic_conditions TEXT,
    important_notes TEXT,
    wallet_id VARCHAR(50),

    is_family_head BOOLEAN NOT NULL DEFAULT FALSE,
    family_id VARCHAR(50),
    health_card_id VARCHAR(50),
    membership_id VARCHAR(50),

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 1,
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_patients_family_id ON patients(family_id);

CREATE TABLE IF NOT EXISTS patient_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    storage_key TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    uploaded_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. HEALTH CARD ENGINE, PRIVILEGE TIERS & FAMILY BENEFICIARIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_card_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_slug VARCHAR(50) NOT NULL UNIQUE, -- e.g. gold_privilege
    tier_title VARCHAR(100) NOT NULL,
    color_hex VARCHAR(20) NOT NULL DEFAULT '#d97706',
    validity_days INT NOT NULL DEFAULT 365,
    max_family_members INT NOT NULL DEFAULT 5,
    opd_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    lab_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    pharmacy_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    home_collection_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS health_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    health_card_no VARCHAR(50) NOT NULL UNIQUE, -- e.g. LHC-2026-000842
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    tier_id UUID REFERENCES health_card_tiers(id) ON DELETE RESTRICT,
    tier_name VARCHAR(100) NOT NULL DEFAULT 'GOLD PRIVILEGE',
    card_holder_name VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'requested', 'pending_approval', 'approved', 'payment_pending',
        'ready_for_issue', 'issued', 'active', 'suspended', 'expired', 'lost',
        'damaged', 'cancelled', 'replaced'
    )),
    issue_date DATE,
    expiry_date DATE,
    cvv VARCHAR(10),
    verification_code VARCHAR(50) NOT NULL UNIQUE,
    nfc_uid VARCHAR(100),
    qr_verification_url TEXT,
    anti_duplication_hash VARCHAR(255),
    design_version VARCHAR(20) DEFAULT 'v1.0',
    design_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_physical_issued BOOLEAN NOT NULL DEFAULT FALSE,
    physical_issue_date TIMESTAMPTZ,
    printed_count INT NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS health_card_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_card_id UUID NOT NULL REFERENCES health_cards(id) ON DELETE CASCADE,
    member_patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    relationship VARCHAR(50) NOT NULL,
    member_order INT NOT NULL CHECK (member_order BETWEEN 1 AND 5),
    is_physical_card_requested BOOLEAN NOT NULL DEFAULT FALSE,
    is_physical_card_issued BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_card_member UNIQUE (primary_card_id, member_patient_id)
);

CREATE TABLE IF NOT EXISTS health_card_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_no VARCHAR(50) NOT NULL UNIQUE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    requested_tier_id UUID REFERENCES health_card_tiers(id),
    applicant_name VARCHAR(255) NOT NULL,
    applicant_mobile VARCHAR(30) NOT NULL,
    requested_by_user_id UUID REFERENCES users(id),
    status VARCHAR(30) NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected', 'payment_pending', 'issued')),
    approval_user_id UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    allocated_card_no VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS health_card_design_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(20) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'preview', 'testing', 'approved', 'published', 'archived')),
    config JSONB NOT NULL,
    terms_and_conditions TEXT[] NOT NULL,
    published_at TIMESTAMPTZ,
    published_by VARCHAR(150),
    changes_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. DOCTOR MASTER & OPD CONSULTATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    qualification VARCHAR(255),
    specialization VARCHAR(150) NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    registration_council VARCHAR(150),
    registration_number VARCHAR(100),
    mobile VARCHAR(30),
    email VARCHAR(255),
    consultation_fee NUMERIC(10,2) NOT NULL DEFAULT 500.00,
    follow_up_fee NUMERIC(10,2) NOT NULL DEFAULT 300.00,
    commission_percentage NUMERIC(5,2) DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_no VARCHAR(50) NOT NULL UNIQUE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    token_number INT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'consultation' CHECK (type IN ('consultation', 'follow_up', 'emergency', 'routine_checkup')),
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show')),
    consultation_fee NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    final_amount NUMERIC(10,2) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    notes TEXT,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS opd_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_no VARCHAR(50) NOT NULL UNIQUE,
    appointment_id UUID REFERENCES appointments(id),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    visit_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    chief_complaints TEXT,
    diagnosis TEXT,
    clinical_notes TEXT,
    advice TEXT,
    follow_up_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS triage_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES opd_visits(id) ON DELETE SET NULL,
    bp_systolic INT CHECK (bp_systolic BETWEEN 40 AND 300),
    bp_diastolic INT CHECK (bp_diastolic BETWEEN 20 AND 200),
    pulse_bpm INT CHECK (pulse_bpm BETWEEN 20 AND 250),
    temperature_f NUMERIC(4,1) CHECK (temperature_f BETWEEN 90.0 AND 110.0),
    spo2_percent INT CHECK (spo2_percent BETWEEN 50 AND 100),
    respiratory_rate INT CHECK (respiratory_rate BETWEEN 5 AND 60),
    weight_kg NUMERIC(5,2) CHECK (weight_kg BETWEEN 1.0 AND 300.0),
    height_cm NUMERIC(5,2) CHECK (height_cm BETWEEN 30.0 AND 250.0),
    bmi NUMERIC(4,1),
    rbs_mg_dl INT,
    recorded_by VARCHAR(100),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_no VARCHAR(50) NOT NULL UNIQUE,
    visit_id UUID REFERENCES opd_visits(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    diagnosis TEXT,
    instructions TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dispensed', 'partially_dispensed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL, -- e.g. 500mg
    frequency VARCHAR(50) NOT NULL, -- e.g. 1-0-1
    duration_days INT NOT NULL,
    timing VARCHAR(100), -- e.g. After food
    dispensed_qty INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. LABORATORY, SPECIMENS & DIAGNOSTIC REPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS lab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_code VARCHAR(50) NOT NULL UNIQUE,
    test_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- Biochemistry, Haematology, Serology, Microbiology
    department_id UUID REFERENCES departments(id),
    sample_type VARCHAR(100) NOT NULL, -- Blood, Serum, Plasma, Urine, Sputum
    container_type VARCHAR(100) NOT NULL, -- EDTA (Purple), Plain (Red), Fluoride (Grey)
    price NUMERIC(10,2) NOT NULL,
    tat_hours INT NOT NULL DEFAULT 24,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lab_test_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES lab_tests(id) ON DELETE CASCADE,
    parameter_code VARCHAR(50) NOT NULL,
    parameter_name VARCHAR(200) NOT NULL,
    unit VARCHAR(50),
    male_reference_range VARCHAR(100),
    female_reference_range VARCHAR(100),
    child_reference_range VARCHAR(100),
    critical_low NUMERIC(10,2),
    critical_high NUMERIC(10,2),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lab_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_no VARCHAR(50) NOT NULL UNIQUE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    referring_doctor_id UUID REFERENCES doctors(id),
    source VARCHAR(30) NOT NULL DEFAULT 'opd' CHECK (source IN ('opd', 'ipd', 'emergency', 'home_collection', 'portal')),
    total_amount NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    net_amount NUMERIC(10,2) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    order_status VARCHAR(30) NOT NULL DEFAULT 'ordered' CHECK (order_status IN ('ordered', 'sample_collected', 'in_process', 'verified', 'delivered', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS specimens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_id VARCHAR(50) NOT NULL UNIQUE,
    accession_no VARCHAR(50) NOT NULL UNIQUE,
    lab_order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    specimen_type VARCHAR(100) NOT NULL,
    collected_at TIMESTAMPTZ,
    collected_by VARCHAR(150),
    received_in_lab_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'collected' CHECK (status IN ('pending', 'collected', 'received', 'processing', 'rejected', 'analyzed')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES lab_tests(id) ON DELETE RESTRICT,
    parameter_id UUID NOT NULL REFERENCES lab_test_parameters(id) ON DELETE RESTRICT,
    result_value VARCHAR(255) NOT NULL,
    flag VARCHAR(20) DEFAULT 'normal' CHECK (flag IN ('normal', 'low', 'high', 'critical_low', 'critical_high')),
    remarks TEXT,
    entered_by VARCHAR(150) NOT NULL,
    verified_by VARCHAR(150),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diagnostic_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_no VARCHAR(50) NOT NULL UNIQUE,
    lab_order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    report_title VARCHAR(255) NOT NULL,
    pdf_storage_key TEXT,
    qr_verification_url TEXT,
    pathologist_name VARCHAR(200) NOT NULL,
    pathologist_signature_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'verified' CHECK (status IN ('draft', 'verified', 'published', 'amended')),
    verified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 7. PHARMACY & INVENTORY STORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_code VARCHAR(50) NOT NULL UNIQUE,
    brand_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(200),
    dosage_form VARCHAR(50) NOT NULL, -- Tablet, Syrup, Injection, Ointment, Capsule
    strength VARCHAR(50) NOT NULL,
    hsn_code VARCHAR(50),
    gst_percent NUMERIC(5,2) NOT NULL DEFAULT 12.00,
    mrp NUMERIC(10,2) NOT NULL,
    cost_price NUMERIC(10,2) NOT NULL,
    sale_price NUMERIC(10,2) NOT NULL,
    min_reorder_level INT NOT NULL DEFAULT 50,
    is_narcotic BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medicine_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
    batch_no VARCHAR(100) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    initial_quantity INT NOT NULL,
    current_quantity INT NOT NULL CHECK (current_quantity >= 0),
    purchase_rate NUMERIC(10,2) NOT NULL,
    mrp NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_medicine_batch UNIQUE (medicine_id, batch_no)
);

CREATE TABLE IF NOT EXISTS pharmacy_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no VARCHAR(50) NOT NULL UNIQUE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_mobile VARCHAR(30),
    doctor_name VARCHAR(200),
    subtotal_amount NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10,2) NOT NULL,
    payment_mode VARCHAR(30) NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'upi', 'card', 'wallet', 'due')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'due', 'refunded')),
    billed_by VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pharmacy_sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES pharmacy_sales(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES medicine_batches(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    discount_percent NUMERIC(5,2) DEFAULT 0.00,
    total_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. CENTRAL BILLING & FINANCIAL TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_no VARCHAR(50) NOT NULL UNIQUE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments(id),
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('opd', 'ipd', 'emergency', 'lab', 'radiology', 'pharmacy', 'health_card', 'general')),
    gross_amount NUMERIC(10,2) NOT NULL,
    card_discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    manual_discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    net_payable NUMERIC(10,2) NOT NULL,
    paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    due_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'partially_paid', 'paid', 'cancelled', 'refunded')),
    billed_by VARCHAR(150) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL, -- Consultation, Lab Test, Medicine, Bed Charge, OT
    item_id VARCHAR(50),
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(8,2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    final_amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_no VARCHAR(50) NOT NULL UNIQUE,
    bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'deposit', 'withdrawal', 'adjustment')),
    payment_mode VARCHAR(30) NOT NULL CHECK (payment_mode IN ('cash', 'upi', 'card', 'net_banking', 'wallet', 'cheque')),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    reference_number VARCHAR(100), -- UPI Ref, Card Auth Code, Cheque No
    cashier_user_id UUID REFERENCES users(id),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 9. INPATIENT (IPD), WARDS, BEDS & SURGERY
-- ============================================================================
CREATE TABLE IF NOT EXISTS wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_code VARCHAR(50) NOT NULL UNIQUE,
    ward_name VARCHAR(150) NOT NULL,
    ward_type VARCHAR(50) NOT NULL CHECK (ward_type IN ('general', 'semi_private', 'private', 'icu', 'ccu', 'nicu', 'emergency')),
    floor_number VARCHAR(20),
    total_beds INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_no VARCHAR(50) NOT NULL UNIQUE,
    ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE RESTRICT,
    per_day_charge NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'cleaning', 'maintenance', 'reserved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_no VARCHAR(50) NOT NULL UNIQUE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    admitting_doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments(id),
    bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE RESTRICT,
    admission_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    admission_reason TEXT NOT NULL,
    discharge_date TIMESTAMPTZ,
    discharge_summary TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'admitted' CHECK (status IN ('admitted', 'transferred', 'discharged', 'absconded', 'deceased')),
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 10. SYSTEM AUDIT LOG (IMMUTABLE OPERATIONAL LEDGER)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id VARCHAR(100) NOT NULL,
    actor_name VARCHAR(200) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    old_state JSONB,
    new_state JSONB,
    client_ip VARCHAR(50),
    user_agent TEXT,
    severity VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'security')),
    sha256_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);

-- ============================================================================
-- 11. AUTOMATIC UPDATED_AT TRIGGERS
-- ============================================================================
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
          AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_set_updated_at ON %I;
            CREATE TRIGGER trg_set_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION set_updated_at_column();
        ', t, t);
    END LOOP;
END $$;

-- End of Enterprise PostgreSQL DDL Schema
