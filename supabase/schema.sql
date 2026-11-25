-- ============================================================================
-- SIMPKN & MBKM INFORMATIKA - UNIVERSITAS MUHAMMADIYAH MALANG
-- Skrip Lengkap Database PostgreSQL Supabase
-- Fitur: Relasi & Foreign Keys, Indexes, Triggers, Storage Buckets, RLS, Realtime
-- Aman dijalankan ulang (Idempotent) & langsung proceed tanpa peringatan RLS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fungsi Trigger Otomatis Pembaruan Timestamp (updated_at)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. PROFILES (Akun Pengguna: Super Admin, Admin PKN, Dosen, Pembimbing, Mahasiswa)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE,
  identifier VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE,
  password_hash TEXT,
  phone VARCHAR(30),
  role VARCHAR(50) NOT NULL DEFAULT 'mahasiswa'
    CHECK (role IN ('super_admin', 'admin_pkn', 'dosen_pembimbing', 'pembimbing_lapangan', 'mahasiswa')),
  study_program VARCHAR(100) DEFAULT 'Informatika',
  faculty VARCHAR(100) DEFAULT 'Fakultas Teknik',
  avatar_url TEXT,
  semester INT DEFAULT 5 CHECK (semester BETWEEN 1 AND 14),
  gpa NUMERIC(3, 2) DEFAULT 3.50 CHECK (gpa BETWEEN 0.00 AND 4.00),
  company_id UUID,
  company_name VARCHAR(150),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to profiles" ON public.profiles;
CREATE POLICY "Public access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.profiles TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_profiles_identifier ON public.profiles (identifier);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 2. USER ROLES & KREDENSIAL
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to user_roles" ON public.user_roles;
CREATE POLICY "Public access to user_roles" ON public.user_roles FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.user_roles TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

-- ============================================================================
-- 3. ACADEMIC PERIODS (Periode Akademik PKN & MBKM)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.academic_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  year VARCHAR(20) NOT NULL,
  semester VARCHAR(10) NOT NULL CHECK (semester IN ('Ganjil', 'Genap')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pkn_registration_deadline DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.academic_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to academic_periods" ON public.academic_periods;
CREATE POLICY "Public access to academic_periods" ON public.academic_periods FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.academic_periods TO anon, authenticated, service_role;

-- ============================================================================
-- 4. COMPANIES (Direktori Instansi & Mitra Industri)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  industry_sector VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  website VARCHAR(200),
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  description TEXT,
  is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'verified'
    CHECK (verification_status IN ('verified', 'pending', 'rejected')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to companies" ON public.companies;
CREATE POLICY "Public access to companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.companies TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_companies_city ON public.companies (city);
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies (verification_status);

-- ============================================================================
-- 5. COMPANY CONTACTS (Kontak PIC Mitra)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.company_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_name VARCHAR(150) NOT NULL,
  position VARCHAR(100),
  email VARCHAR(150),
  phone VARCHAR(50)
);

ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to company_contacts" ON public.company_contacts;
CREATE POLICY "Public access to company_contacts" ON public.company_contacts FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.company_contacts TO anon, authenticated, service_role;

-- ============================================================================
-- 6. PKN REGISTRATIONS (Pendaftaran & Penugasan Pembimbing PKN)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pkn_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name VARCHAR(150),
  student_nim VARCHAR(50),
  student_gpa NUMERIC(3, 2) DEFAULT 3.50,
  student_semester INT DEFAULT 7,
  academic_period_id UUID REFERENCES public.academic_periods(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name VARCHAR(150) NOT NULL,
  company_address TEXT NOT NULL,
  contact_name VARCHAR(150) NOT NULL,
  contact_phone VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  krs_url TEXT,
  proposal_url TEXT,
  acceptance_letter_url TEXT,
  transcript_url TEXT,
  group_members JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('draft', 'submitted', 'under_review', 'revision_required', 'approved', 'rejected', 'completed')),
  admin_notes TEXT,
  lecturer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  lecturer_name VARCHAR(150),
  field_supervisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  field_supervisor_name VARCHAR(150),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pkn_registrations ADD COLUMN IF NOT EXISTS krs_url TEXT;
ALTER TABLE public.pkn_registrations ADD COLUMN IF NOT EXISTS group_members JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.pkn_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to pkn_registrations" ON public.pkn_registrations;
CREATE POLICY "Public access to pkn_registrations" ON public.pkn_registrations FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.pkn_registrations TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_pkn_reg_student ON public.pkn_registrations (student_id);
CREATE INDEX IF NOT EXISTS idx_pkn_reg_lecturer ON public.pkn_registrations (lecturer_id);
CREATE INDEX IF NOT EXISTS idx_pkn_reg_status ON public.pkn_registrations (status);

DROP TRIGGER IF EXISTS trg_pkn_registrations_updated_at ON public.pkn_registrations;
CREATE TRIGGER trg_pkn_registrations_updated_at
  BEFORE UPDATE ON public.pkn_registrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 7. MBKM PROGRAMS (Katalog Program Merdeka Belajar Kampus Merdeka)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mbkm_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  program_type VARCHAR(50) NOT NULL,
  partner_name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  period VARCHAR(50) NOT NULL,
  duration_months INT DEFAULT 6 CHECK (duration_months > 0),
  requirements TEXT,
  quota INT DEFAULT 10 CHECK (quota > 0),
  registered_count INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.mbkm_programs ADD COLUMN IF NOT EXISTS registered_count INT DEFAULT 0;

ALTER TABLE public.mbkm_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to mbkm_programs" ON public.mbkm_programs;
CREATE POLICY "Public access to mbkm_programs" ON public.mbkm_programs FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.mbkm_programs TO anon, authenticated, service_role;

-- ============================================================================
-- 8. MBKM REGISTRATIONS (Pendaftaran Mahasiswa pada Program MBKM)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mbkm_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name VARCHAR(150),
  student_nim VARCHAR(50),
  program_id UUID NOT NULL REFERENCES public.mbkm_programs(id) ON DELETE CASCADE,
  program_title VARCHAR(200),
  partner_name VARCHAR(150),
  program_type VARCHAR(50),
  academic_period_id UUID REFERENCES public.academic_periods(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'submitted',
  document_url TEXT,
  admin_notes TEXT,
  supervisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  supervisor_name VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.mbkm_registrations ADD COLUMN IF NOT EXISTS supervisor_name VARCHAR(150);

ALTER TABLE public.mbkm_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to mbkm_registrations" ON public.mbkm_registrations;
CREATE POLICY "Public access to mbkm_registrations" ON public.mbkm_registrations FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.mbkm_registrations TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_mbkm_reg_student ON public.mbkm_registrations (student_id);

DROP TRIGGER IF EXISTS trg_mbkm_registrations_updated_at ON public.mbkm_registrations;
CREATE TRIGGER trg_mbkm_registrations_updated_at
  BEFORE UPDATE ON public.mbkm_registrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 9. DAILY LOGS (Jurnal Kegiatan Harian Mahasiswa)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  activity_result TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'revision_required', 'rejected')),
  attachment_url TEXT,
  attachment_name VARCHAR(200),
  lecturer_feedback TEXT,
  field_supervisor_feedback TEXT,
  revision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS revision_notes TEXT;

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to daily_logs" ON public.daily_logs;
CREATE POLICY "Public access to daily_logs" ON public.daily_logs FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.daily_logs TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_daily_logs_student_date ON public.daily_logs (student_id, date DESC);

DROP TRIGGER IF EXISTS trg_daily_logs_updated_at ON public.daily_logs;
CREATE TRIGGER trg_daily_logs_updated_at
  BEFORE UPDATE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 10. GUIDANCE SESSIONS (Jadwal & Catatan Bimbingan Dosen)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.guidance_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name VARCHAR(150),
  student_nim VARCHAR(50),
  lecturer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lecturer_name VARCHAR(150),
  registration_id UUID NOT NULL,
  requested_date DATE NOT NULL,
  scheduled_at TIMESTAMPTZ,
  topic VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  supervisor_notes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'scheduled', 'completed', 'cancelled')),
  location_or_link VARCHAR(255),
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.guidance_sessions ADD COLUMN IF NOT EXISTS student_nim VARCHAR(50);
ALTER TABLE public.guidance_sessions ADD COLUMN IF NOT EXISTS document_url TEXT;

ALTER TABLE public.guidance_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to guidance_sessions" ON public.guidance_sessions;
CREATE POLICY "Public access to guidance_sessions" ON public.guidance_sessions FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.guidance_sessions TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_guidance_student ON public.guidance_sessions (student_id);
CREATE INDEX IF NOT EXISTS idx_guidance_lecturer ON public.guidance_sessions (lecturer_id);

DROP TRIGGER IF EXISTS trg_guidance_sessions_updated_at ON public.guidance_sessions;
CREATE TRIGGER trg_guidance_sessions_updated_at
  BEFORE UPDATE ON public.guidance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 11. PKN REPORTS (Naskah & Revisi Bertingkat Laporan PKN)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pkn_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name VARCHAR(150),
  student_nim VARCHAR(50),
  registration_id UUID NOT NULL,
  version INT NOT NULL DEFAULT 1,
  title VARCHAR(255) NOT NULL,
  report_file_url TEXT NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('draft', 'submitted', 'reviewing', 'revision_required', 'approved')),
  feedback TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pkn_reports ADD COLUMN IF NOT EXISTS student_name VARCHAR(150);
ALTER TABLE public.pkn_reports ADD COLUMN IF NOT EXISTS student_nim VARCHAR(50);
ALTER TABLE public.pkn_reports ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.pkn_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to pkn_reports" ON public.pkn_reports;
CREATE POLICY "Public access to pkn_reports" ON public.pkn_reports FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.pkn_reports TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_pkn_reports_student ON public.pkn_reports (student_id);

-- ============================================================================
-- 12. ASSESSMENT COMPONENTS (Komponen Rubrik Penilaian)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assessment_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  evaluator_role VARCHAR(30) NOT NULL CHECK (evaluator_role IN ('dosen', 'pembimbing_lapangan')),
  weight_percentage NUMERIC(5,2) NOT NULL CHECK (weight_percentage > 0 AND weight_percentage <= 100),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE public.assessment_components ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to assessment_components" ON public.assessment_components;
CREATE POLICY "Public access to assessment_components" ON public.assessment_components FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.assessment_components TO anon, authenticated, service_role;

-- ============================================================================
-- 13. ASSESSMENTS (Hasil Penilaian Dosen & Pembimbing Lapangan)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name VARCHAR(150),
  student_nim VARCHAR(50),
  evaluator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluator_name VARCHAR(150),
  evaluator_role VARCHAR(30) NOT NULL CHECK (evaluator_role IN ('dosen', 'pembimbing_lapangan')),
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_score NUMERIC(5,2) NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to assessments" ON public.assessments;
CREATE POLICY "Public access to assessments" ON public.assessments FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.assessments TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_assessments_reg ON public.assessments (registration_id);
CREATE INDEX IF NOT EXISTS idx_assessments_student ON public.assessments (student_id);

-- ============================================================================
-- 14. COURSE CONVERSIONS (Pengajuan Konversi 20 SKS MBKM)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.course_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name VARCHAR(150),
  student_nim VARCHAR(50),
  mbkm_registration_id UUID NOT NULL,
  program_title VARCHAR(200),
  total_sks_requested INT NOT NULL DEFAULT 0,
  total_sks_approved INT NOT NULL DEFAULT 0,
  courses JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by VARCHAR(150),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.course_conversions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to course_conversions" ON public.course_conversions;
CREATE POLICY "Public access to course_conversions" ON public.course_conversions FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.course_conversions TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_course_conversions_student ON public.course_conversions (student_id);

-- ============================================================================
-- 15. CERTIFICATES (Sertifikat Digital Kelulusan PKN & MBKM)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name VARCHAR(150),
  student_nim VARCHAR(50),
  registration_id UUID NOT NULL UNIQUE,
  program_type VARCHAR(20) NOT NULL DEFAULT 'PKN',
  company_name VARCHAR(150) NOT NULL,
  certificate_number VARCHAR(100) NOT NULL UNIQUE,
  issue_date DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  signer_name VARCHAR(150) NOT NULL,
  signer_nip VARCHAR(50) NOT NULL,
  signer_position VARCHAR(100) NOT NULL,
  verification_code VARCHAR(100) NOT NULL,
  final_grade VARCHAR(5) NOT NULL,
  final_score NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to certificates" ON public.certificates;
CREATE POLICY "Public access to certificates" ON public.certificates FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.certificates TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_certificates_student ON public.certificates (student_id);

-- ============================================================================
-- 16. NOTIFICATIONS (Notifikasi Realtime Pengguna)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'info'
    CHECK (type IN ('info', 'success', 'warning', 'error')),
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to notifications" ON public.notifications;
CREATE POLICY "Public access to notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.notifications TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, is_read, created_at DESC);

-- ============================================================================
-- 17. ANNOUNCEMENTS (Pengumuman Resmi Prodi)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  target_role VARCHAR(50) NOT NULL DEFAULT 'all',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  attachment_url TEXT,
  author_name VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to announcements" ON public.announcements;
CREATE POLICY "Public access to announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.announcements TO anon, authenticated, service_role;

-- ============================================================================
-- 18. ACTIVITY LOGS (Audit Trail Aktivitas Sistem)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name VARCHAR(150),
  role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to activity_logs" ON public.activity_logs;
CREATE POLICY "Public access to activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.activity_logs TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs (created_at DESC);

-- ============================================================================
-- 19. SYSTEM SETTINGS (Konfigurasi Parameter Akademik Utama)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'primary',
  app_name VARCHAR(200) DEFAULT 'SIMPKN - Sistem Informasi PKN & MBKM Informatika UMM',
  university_name VARCHAR(150) DEFAULT 'Universitas Muhammadiyah Malang',
  faculty_name VARCHAR(150) DEFAULT 'Fakultas Teknik',
  study_program VARCHAR(150) DEFAULT 'Program Studi Informatika',
  current_academic_year VARCHAR(30) DEFAULT '2024/2025',
  current_semester VARCHAR(10) DEFAULT 'Genap',
  pkn_min_sks INT DEFAULT 80,
  pkn_min_gpa NUMERIC(3,2) DEFAULT 2.50,
  dosen_weight NUMERIC(5,2) DEFAULT 50.00,
  field_supervisor_weight NUMERIC(5,2) DEFAULT 50.00,
  head_of_program_name VARCHAR(150) DEFAULT 'Ir. Galih Wasis Wicaksono, S.Kom., M.Cs.',
  head_of_program_nip VARCHAR(50) DEFAULT '10814100523PNS',
  contact_email VARCHAR(150) DEFAULT 'informatika@umm.ac.id'
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to system_settings" ON public.system_settings;
CREATE POLICY "Public access to system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.system_settings TO anon, authenticated, service_role;

INSERT INTO public.system_settings (id) VALUES ('primary') ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 20. SUPABASE STORAGE BUCKETS & POLICIES
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('pkn-requirements', 'pkn-requirements', true),
  ('pkn-activities', 'pkn-activities', true),
  ('pkn-reports', 'pkn-reports', true),
  ('mbkm-documents', 'mbkm-documents', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  DROP POLICY IF EXISTS "SIMPKN Public Storage Access" ON storage.objects;
  CREATE POLICY "SIMPKN Public Storage Access"
    ON storage.objects FOR ALL
    USING (bucket_id IN ('pkn-requirements', 'pkn-activities', 'pkn-reports', 'mbkm-documents'))
    WITH CHECK (bucket_id IN ('pkn-requirements', 'pkn-activities', 'pkn-reports', 'mbkm-documents'));
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- ============================================================================
-- 21. SUPABASE REALTIME REPLICATION (Per Tabel Secara Aman & Idempoten)
-- ============================================================================
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'profiles',
    'user_roles',
    'academic_periods',
    'companies',
    'company_contacts',
    'pkn_registrations',
    'mbkm_programs',
    'mbkm_registrations',
    'daily_logs',
    'guidance_sessions',
    'pkn_reports',
    'assessment_components',
    'assessments',
    'course_conversions',
    'certificates',
    'notifications',
    'announcements',
    'activity_logs',
    'system_settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_object THEN NULL;
      WHEN others THEN NULL;
    END;
  END LOOP;
END $$;
