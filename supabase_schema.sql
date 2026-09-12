-- ================================================================
-- LABMEDIX ENTERPRISE POSTGRESQL SCHEMA (SUPABASE)
-- Multi-Counter Realtime Synchronization & High Performance Store
-- ================================================================

-- 1. Main Document Store with JSONB & High Speed Indexes
CREATE TABLE IF NOT EXISTS public.labmedix_store (
    collection_name VARCHAR(100) NOT NULL,
    id VARCHAR(150) NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_labmedix_store PRIMARY KEY (collection_name, id)
);

-- Index for instant collection lookups
CREATE INDEX IF NOT EXISTS idx_labmedix_store_collection 
    ON public.labmedix_store (collection_name);

-- Index for ordering by update timestamp
CREATE INDEX IF NOT EXISTS idx_labmedix_store_updated_at 
    ON public.labmedix_store (updated_at DESC);

-- GIN Index for arbitrary deep JSON search inside records (e.g. phone, name, status)
CREATE INDEX IF NOT EXISTS idx_labmedix_store_data_gin 
    ON public.labmedix_store USING GIN (data);

-- 2. Auto-Update 'updated_at' Timestamp Trigger
CREATE OR REPLACE FUNCTION public.set_labmedix_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_labmedix_store_updated_at ON public.labmedix_store;
CREATE TRIGGER trg_labmedix_store_updated_at
    BEFORE UPDATE ON public.labmedix_store
    FOR EACH ROW
    EXECUTE FUNCTION public.set_labmedix_updated_at();

-- 3. Enable Row Level Security (RLS) with Permissive Policy for Anon Key
ALTER TABLE public.labmedix_store ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "LabMedix Anon Full Access" ON public.labmedix_store;
CREATE POLICY "LabMedix Anon Full Access" 
    ON public.labmedix_store
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. Enable Supabase Realtime Replication for Live Multi-Counter Sync
-- (Broadcasts INSERT, UPDATE, DELETE to all connected browsers immediately)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'labmedix_store'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.labmedix_store;
    END IF;
END $$;

-- 5. Relational SQL Views for Analytics, Billing & Medical Reports
-- View: Patients
CREATE OR REPLACE VIEW public.v_patients AS
SELECT 
    id AS patient_id,
    data->>'name' AS name,
    data->>'phone' AS phone,
    (data->>'age')::int AS age,
    data->>'gender' AS gender,
    data->>'bloodGroup' AS blood_group,
    data->>'uhid' AS uhid,
    data->>'address' AS address,
    created_at
FROM public.labmedix_store
WHERE collection_name = 'patients';

-- View: Appointments / Bookings
CREATE OR REPLACE VIEW public.v_appointments AS
SELECT 
    id AS appointment_id,
    data->>'patientId' AS patient_id,
    data->>'patientName' AS patient_name,
    data->>'patientPhone' AS patient_phone,
    data->>'doctorName' AS doctor_name,
    (data->>'totalAmount')::numeric AS total_amount,
    (data->>'discountAmount')::numeric AS discount_amount,
    (data->>'finalAmount')::numeric AS final_amount,
    data->>'paymentStatus' AS payment_status,
    data->>'status' AS status,
    data->>'appointmentDate' AS appointment_date,
    created_at
FROM public.labmedix_store
WHERE collection_name IN ('appointments', 'labBookings');

-- View: Health Cards
CREATE OR REPLACE VIEW public.v_health_cards AS
SELECT 
    id AS card_number,
    data->>'patientId' AS patient_id,
    data->>'holderName' AS holder_name,
    data->>'tier' AS tier,
    data->>'status' AS status,
    data->>'issueDate' AS issue_date,
    data->>'validUntil' AS valid_until,
    (data->>'walletBalance')::numeric AS wallet_balance,
    created_at
FROM public.labmedix_store
WHERE collection_name = 'cards';

-- View: Cash Desk Vouchers & Bills
CREATE OR REPLACE VIEW public.v_vouchers AS
SELECT 
    id AS voucher_id,
    data->>'voucherNumber' AS voucher_number,
    data->>'patientName' AS patient_name,
    (data->>'amount')::numeric AS amount,
    data->>'paymentMethod' AS payment_method,
    data->>'issuedBy' AS issued_by,
    data->>'status' AS status,
    created_at
FROM public.labmedix_store
WHERE collection_name = 'vouchers';

-- End of schema
