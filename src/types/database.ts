export type UserRole = 
  | 'super_admin' 
  | 'admin_pkn' 
  | 'dosen_pembimbing' 
  | 'pembimbing_lapangan' 
  | 'mahasiswa';

export type RegistrationStatus = 
  | 'draft' 
  | 'submitted' 
  | 'under_review' 
  | 'revision_required' 
  | 'approved' 
  | 'rejected'
  | 'completed';

export type LogStatus = 
  | 'pending' 
  | 'approved' 
  | 'revision_required' 
  | 'rejected';

export type GuidanceStatus = 
  | 'requested' 
  | 'scheduled' 
  | 'completed' 
  | 'cancelled';

export type ReportStatus = 
  | 'draft' 
  | 'submitted' 
  | 'reviewing' 
  | 'revision_required' 
  | 'approved';

export type ConversionStatus = 
  | 'pending' 
  | 'under_review' 
  | 'approved' 
  | 'rejected';

export interface UserProfile {
  id: string;
  identifier: string; // NIM for Mahasiswa, NIDN for Dosen, NIP for Pembimbing/Admin, Username for SuperAdmin
  full_name: string;
  email?: string | null;
  phone?: string;
  role: UserRole;
  study_program: string;
  faculty: string;
  avatar_url?: string;
  semester?: number;
  gpa?: number;
  company_id?: string; // For Pembimbing Lapangan
  company_name?: string;
  password_hash?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AcademicPeriod {
  id: string;
  name: string;
  year: string;
  semester: 'Ganjil' | 'Genap';
  is_active: boolean;
  start_date: string;
  end_date: string;
  pkn_registration_deadline: string;
}

export interface Company {
  id: string;
  name: string;
  industry_sector: string;
  address: string;
  city: string;
  province: string;
  website?: string;
  email: string;
  phone: string;
  description: string;
  is_recommended: boolean;
  is_active: boolean;
  verification_status: 'verified' | 'pending' | 'rejected';
  created_by?: string;
  created_at: string;
}

export interface CompanyContact {
  id: string;
  company_id: string;
  contact_name: string;
  position: string;
  email: string;
  phone: string;
}

export interface PKNGroupMember {
  id: string;
  full_name: string;
  identifier: string;
  study_program?: string;
  semester?: number;
  gpa?: number;
}

export interface PKNRegistration {
  id: string;
  student_id: string;
  student_name: string;
  student_nim: string;
  student_gpa: number;
  student_semester: number;
  academic_period_id?: string | null;
  company_id?: string | null;
  company_name: string;
  company_address: string;
  contact_name: string;
  contact_phone: string;
  start_date: string;
  end_date: string;
  krs_url?: string;
  proposal_url?: string;
  acceptance_letter_url?: string;
  transcript_url?: string;
  group_members?: PKNGroupMember[];
  notes?: string;
  status: RegistrationStatus;
  admin_notes?: string;
  lecturer_id?: string;
  lecturer_name?: string;
  field_supervisor_id?: string;
  field_supervisor_name?: string;
  submitted_at: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MBKMProgram {
  id: string;
  title: string;
  program_type: 'Magang Industri' | 'MSIB' | 'Studi Independen' | 'Kampus Mengajar' | 'Pertukaran Mahasiswa' | 'Riset / Penelitian';
  partner_name: string;
  description: string;
  period: string;
  duration_months: number;
  requirements: string;
  quota: number;
  registered_count: number;
  is_active: boolean;
  created_at: string;
}

export interface MBKMRegistration {
  id: string;
  student_id: string;
  student_name: string;
  student_nim: string;
  program_id: string;
  program_title: string;
  partner_name: string;
  program_type: string;
  academic_period_id?: string | null;
  start_date: string;
  end_date: string;
  status: RegistrationStatus;
  document_url?: string;
  admin_notes?: string;
  supervisor_id?: string;
  supervisor_name?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyLog {
  id: string;
  student_id: string;
  registration_id: string;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  description: string;
  activity_result: string;
  status: LogStatus;
  attachment_url?: string;
  attachment_name?: string;
  lecturer_feedback?: string;
  field_supervisor_feedback?: string;
  revision_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface GuidanceSession {
  id: string;
  student_id: string;
  student_name: string;
  student_nim: string;
  lecturer_id: string;
  lecturer_name: string;
  registration_id: string;
  requested_date: string;
  scheduled_at?: string;
  topic: string;
  description: string;
  supervisor_notes?: string;
  status: GuidanceStatus;
  location_or_link?: string;
  document_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PKNReport {
  id: string;
  student_id: string;
  student_name: string;
  student_nim: string;
  registration_id: string;
  version: number;
  title: string;
  report_file_url: string;
  status: ReportStatus;
  feedback?: string;
  reviewed_by?: string;
  submitted_at: string;
  created_at: string;
}

export interface AssessmentComponent {
  id: string;
  name: string;
  code: string;
  evaluator_role: 'dosen' | 'pembimbing_lapangan';
  weight_percentage: number; // e.g. 50
  description: string;
  is_active: boolean;
}

export interface Assessment {
  id: string;
  registration_id: string;
  student_id: string;
  student_name: string;
  student_nim: string;
  evaluator_id: string;
  evaluator_name: string;
  evaluator_role: 'dosen' | 'pembimbing_lapangan';
  scores: Record<string, number>; // component_code -> score (0-100)
  total_score: number;
  notes?: string;
  submitted_at: string;
}

export interface CourseConversionItem {
  id: string;
  course_code: string;
  course_name: string;
  sks: number;
  activity_mapping: string;
  status: 'pending' | 'approved' | 'rejected';
  grade?: string;
}

export interface CourseConversion {
  id: string;
  student_id: string;
  student_name: string;
  student_nim: string;
  mbkm_registration_id: string;
  program_title: string;
  total_sks_requested: number;
  total_sks_approved: number;
  courses: CourseConversionItem[];
  status: ConversionStatus;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface Certificate {
  id: string;
  student_id: string;
  student_name: string;
  student_nim: string;
  registration_id: string;
  program_type: 'PKN' | 'MBKM';
  company_name: string;
  certificate_number: string;
  issue_date: string;
  start_date: string;
  end_date: string;
  signer_name: string;
  signer_nip: string;
  signer_position: string;
  verification_code: string;
  final_grade: string;
  final_score: number;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  action_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  target_role: 'all' | 'mahasiswa' | 'dosen_pembimbing' | 'pembimbing_lapangan';
  is_pinned: boolean;
  start_date: string;
  end_date: string;
  attachment_url?: string;
  author_name: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  created_at: string;
}

export interface SystemSettings {
  id: string;
  app_name: string;
  university_name: string;
  faculty_name: string;
  study_program: string;
  current_academic_year: string;
  current_semester: 'Ganjil' | 'Genap';
  pkn_min_sks: number;
  pkn_min_gpa: number;
  dosen_weight: number; // e.g. 50
  field_supervisor_weight: number; // e.g. 50
  head_of_program_name: string;
  head_of_program_nip: string;
  contact_email: string;
}
