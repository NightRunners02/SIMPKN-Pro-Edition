import { supabase } from '../lib/supabase';
import {
  UserProfile,
  AcademicPeriod,
  Company,
  PKNRegistration,
  PKNGroupMember,
  MBKMProgram,
  MBKMRegistration,
  DailyLog,
  GuidanceSession,
  PKNReport,
  AssessmentComponent,
  Assessment,
  CourseConversion,
  Certificate,
  AppNotification,
  Announcement,
  ActivityLog,
  SystemSettings
} from '../types/database';

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  id: 'primary',
  app_name: 'SIMPKN - Sistem Informasi PKN & MBKM Informatika UMM',
  university_name: 'Universitas Muhammadiyah Malang',
  faculty_name: 'Fakultas Teknik',
  study_program: 'Program Studi Informatika',
  current_academic_year: '2024/2025',
  current_semester: 'Genap',
  pkn_min_sks: 80,
  pkn_min_gpa: 2.50,
  dosen_weight: 50,
  field_supervisor_weight: 50,
  head_of_program_name: 'Ir. Galih Wasis Wicaksono, S.Kom., M.Cs.',
  head_of_program_nip: '10814100523PNS',
  contact_email: 'informatika@umm.ac.id',
};

class DatabaseService {
  private listeners: Map<string, Set<() => void>> = new Map();
  private realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

  public generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  constructor() {
    this.setupRealtimeSync();
  }

  public subscribe(table: string, callback: () => void): () => void {
    if (!this.listeners.has(table)) {
      this.listeners.set(table, new Set());
    }
    this.listeners.get(table)!.add(callback);
    return () => {
      this.listeners.get(table)?.delete(callback);
    };
  }

  private notify(table: string) {
    this.listeners.get(table)?.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.error('Subscriber notification error:', err);
      }
    });
  }

  private setupRealtimeSync() {
    try {
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
      }

      this.realtimeChannel = supabase
        .channel('simpkn_realtime_sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          (payload) => {
            if (payload.table) {
              this.notify(payload.table);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription initialisation:', err);
    }
  }

  // --- ACTIVITY AUDIT LOG ---
  public async logActivity(
    userId: string,
    userName: string,
    role: string,
    action: string,
    entityType: string,
    entityId: string,
    description: string
  ) {
    const log: ActivityLog = {
      id: this.generateId(),
      user_id: userId,
      user_name: userName,
      role,
      action,
      entity_type: entityType,
      entity_id: entityId,
      description,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('activity_logs').insert([log]);
    if (error) {
      console.error('Supabase logActivity error:', error.message);
      return;
    }
    this.notify('activity_logs');
  }

  // --- PASSWORD CRYPTO & REALTIME SUPABASE CREDENTIALS ---
  public async hashPassword(identifier: string, plainPassword: string): Promise<string> {
    const normalized = `${identifier.trim().toLowerCase()}::${plainPassword}::simpkn_umm`;
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoded = new TextEncoder().encode(normalized);
      const buffer = await crypto.subtle.digest('SHA-256', encoded);
      const hex = Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return `sha256:${hex}`;
    }
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    const hexFallback = ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0')).repeat(4);
    return `sha256:${hexFallback}`;
  }

  private toCompactPasswordToken(fullHash: string): string {
    return `pwd:${fullHash.replace('sha256:', '').slice(0, 32)}`;
  }

  public async setUserPassword(userId: string, identifier: string, plainPassword: string): Promise<boolean> {
    const fullHash = await this.hashPassword(identifier, plainPassword);
    const compactToken = this.toCompactPasswordToken(fullHash);
    let savedToSupabase = false;

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ password_hash: fullHash, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (!profileErr) {
      savedToSupabase = true;
    }

    await supabase.from('user_roles').delete().eq('user_id', userId).like('role', 'pwd:%');
    const { error: credErr } = await supabase
      .from('user_roles')
      .insert([{ id: this.generateId(), user_id: userId, role: compactToken }]);
    if (!credErr) {
      savedToSupabase = true;
    }

    if (savedToSupabase) {
      this.notify('profiles');
    }
    return savedToSupabase;
  }

  public async verifyUserPassword(profile: UserProfile, plainPassword: string): Promise<boolean> {
    if (!plainPassword) return false;
    const fullHash = await this.hashPassword(profile.identifier, plainPassword);
    const compactToken = this.toCompactPasswordToken(fullHash);

    const directStored = profile.password_hash || (profile as unknown as { password?: string }).password;
    if (directStored) {
      if (directStored.startsWith('sha256:')) {
        return directStored === fullHash;
      }
      return directStored === plainPassword;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.id)
      .like('role', 'pwd:%')
      .order('granted_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      return data[0].role === compactToken;
    }

    return false;
  }

  // --- ACADEMIC PERIODS ---
  async getAcademicPeriods(): Promise<AcademicPeriod[]> {
    const { data, error } = await supabase
      .from('academic_periods')
      .select('*')
      .order('start_date', { ascending: false });
    if (error) {
      console.error('Supabase getAcademicPeriods error:', error.message);
      return [];
    }
    return (data || []) as AcademicPeriod[];
  }

  // --- PROFILES / USERS ---
  async getProfiles(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase getProfiles error:', error.message);
      return [];
    }
    return (data || []) as UserProfile[];
  }

  async getProfileById(id: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Supabase getProfileById error:', error.message);
      return null;
    }
    return (data as UserProfile) || null;
  }

  async getProfileByIdentifier(identifier: string): Promise<UserProfile | null> {
    const trimmed = identifier.trim();
    if (!trimmed) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('identifier', trimmed)
      .maybeSingle();

    if (error) {
      console.error('Supabase getProfileByIdentifier error:', error.message);
      return null;
    }
    if (data) return data as UserProfile;

    if (trimmed.includes('@')) {
      const { data: byEmail, error: emailErr } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', trimmed)
        .maybeSingle();
      if (!emailErr && byEmail) {
        return byEmail as UserProfile;
      }
    }

    return null;
  }

  async createProfile(profile: Omit<UserProfile, 'id' | 'created_at'>, plainPassword?: string): Promise<UserProfile> {
    const passwordHash = plainPassword ? await this.hashPassword(profile.identifier, plainPassword) : profile.password_hash;
    const cleanEmail = profile.email && profile.email.trim() ? profile.email.trim() : null;

    const newProfile: UserProfile = {
      ...profile,
      email: cleanEmail,
      password_hash: passwordHash,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };

    let { data, error } = await supabase.from('profiles').insert([newProfile]).select().maybeSingle();

    if (error && error.message.includes('password_hash')) {
      const { password_hash: _ph, ...withoutHash } = newProfile;
      const retry1 = await supabase.from('profiles').insert([withoutHash]).select().maybeSingle();
      data = retry1.data;
      error = retry1.error;

      if (error && (error.message.includes('email') || error.message.includes('null value'))) {
        const fallbackEmail = `${profile.identifier.trim().toLowerCase()}@noemail.simpkn.umm`;
        const retry2 = await supabase
          .from('profiles')
          .insert([{ ...withoutHash, email: fallbackEmail }])
          .select()
          .maybeSingle();
        data = retry2.data;
        error = retry2.error;
      }
    } else if (error && (error.message.includes('email') || error.message.includes('null value'))) {
      const fallbackEmail = `${profile.identifier.trim().toLowerCase()}@noemail.simpkn.umm`;
      const retryEmail = await supabase
        .from('profiles')
        .insert([{ ...newProfile, email: fallbackEmail }])
        .select()
        .maybeSingle();
      data = retryEmail.data;
      error = retryEmail.error;
    }

    if (error || !data) {
      throw new Error(error?.message || 'Gagal menyimpan akun pengguna ke database Supabase.');
    }

    if (plainPassword) {
      await this.setUserPassword(data.id, data.identifier, plainPassword);
    }
    this.notify('profiles');
    return data as UserProfile;
  }

  async updateProfile(id: string, updates: Partial<UserProfile>, plainPassword?: string): Promise<UserProfile | null> {
    const cleanUpdates: Partial<UserProfile> = { ...updates };
    if (cleanUpdates.email !== undefined) {
      cleanUpdates.email = cleanUpdates.email && cleanUpdates.email.trim() ? cleanUpdates.email.trim() : null;
    }
    const payload = { ...cleanUpdates, updated_at: new Date().toISOString() };

    let { data, error } = await supabase.from('profiles').update(payload).eq('id', id).select().maybeSingle();
    if (error && (error.message.includes('email') || error.message.includes('null value')) && payload.email === null) {
      const existing = await this.getProfileById(id);
      const fallbackEmail = `${(existing?.identifier || id).toLowerCase()}@noemail.simpkn.umm`;
      const retry = await supabase
        .from('profiles')
        .update({ ...payload, email: fallbackEmail })
        .eq('id', id)
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      throw new Error(error.message);
    }

    if (plainPassword && data) {
      await this.setUserPassword(id, (data as UserProfile).identifier, plainPassword);
    }

    this.notify('profiles');
    return (data as UserProfile) || (await this.getProfileById(id));
  }

  // --- PKN REGISTRATIONS ---
  private readonly GROUP_NOTES_MARKER = '\n\n[ANGGOTA_KELOMPOK_PKN]:';

  private normalizePKNRegistration(raw: PKNRegistration): PKNRegistration {
    let members: PKNGroupMember[] = Array.isArray(raw.group_members) ? raw.group_members : [];
    let cleanNotes = raw.notes || '';

    if (cleanNotes.includes(this.GROUP_NOTES_MARKER)) {
      const [baseNotes, jsonPart] = cleanNotes.split(this.GROUP_NOTES_MARKER);
      cleanNotes = baseNotes;
      if (members.length === 0 && jsonPart) {
        try {
          const parsed = JSON.parse(jsonPart.trim());
          if (Array.isArray(parsed)) {
            members = parsed;
          }
        } catch {
          // Ignore malformed legacy marker
        }
      }
    }

    return {
      ...raw,
      krs_url: raw.krs_url || raw.proposal_url,
      group_members: members,
      notes: cleanNotes,
    };
  }

  async getPKNRegistrations(): Promise<PKNRegistration[]> {
    const { data, error } = await supabase
      .from('pkn_registrations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase getPKNRegistrations error:', error.message);
      return [];
    }
    return ((data || []) as PKNRegistration[]).map((r) => this.normalizePKNRegistration(r));
  }

  async createPKNRegistration(reg: Omit<PKNRegistration, 'id' | 'created_at' | 'updated_at'>): Promise<PKNRegistration> {
    const now = new Date().toISOString();
    const newReg: PKNRegistration = {
      ...reg,
      id: this.generateId(),
      group_members: reg.group_members || [],
      created_at: now,
      updated_at: now,
    };

    let { data, error } = await supabase.from('pkn_registrations').insert([newReg]).select().single();

    if (
      error &&
      (error.message.includes('krs_url') ||
        error.message.includes('group_members') ||
        error.message.includes('schema cache'))
    ) {
      const { krs_url, group_members, ...rest } = newReg;
      const fallbackNotes =
        group_members && group_members.length > 0
          ? `${rest.notes || ''}${this.GROUP_NOTES_MARKER}${JSON.stringify(group_members)}`
          : rest.notes;

      const retry = await supabase
        .from('pkn_registrations')
        .insert([
          {
            ...rest,
            proposal_url: krs_url || rest.proposal_url,
            notes: fallbackNotes,
          },
        ])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      throw new Error(error?.message || 'Gagal menyimpan pendaftaran PKN ke Supabase.');
    }
    this.notify('pkn_registrations');
    return this.normalizePKNRegistration(data as PKNRegistration);
  }

  async updatePKNRegistration(id: string, updates: Partial<PKNRegistration>): Promise<PKNRegistration | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('pkn_registrations')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    this.notify('pkn_registrations');
    return data ? this.normalizePKNRegistration(data as PKNRegistration) : null;
  }

  // --- COMPANIES ---
  async getCompanies(): Promise<Company[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      console.error('Supabase getCompanies error:', error.message);
      return [];
    }
    return (data || []) as Company[];
  }

  async createCompany(comp: Omit<Company, 'id' | 'created_at'>): Promise<Company> {
    const newComp: Company = {
      ...comp,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('companies').insert([newComp]).select().single();
    if (error || !data) {
      throw new Error(error?.message || 'Gagal menambahkan instansi mitra ke Supabase.');
    }
    this.notify('companies');
    return data as Company;
  }

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    this.notify('companies');
    return (data as Company) || null;
  }

  async deleteCompany(id: string): Promise<boolean> {
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    this.notify('companies');
    return true;
  }

  // --- DAILY LOGS ---
  async getDailyLogs(studentId?: string): Promise<DailyLog[]> {
    let query = supabase.from('daily_logs').select('*').order('date', { ascending: false });
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    if (error) {
      console.error('Supabase getDailyLogs error:', error.message);
      return [];
    }
    return (data || []) as DailyLog[];
  }

  async createDailyLog(log: Omit<DailyLog, 'id' | 'created_at' | 'updated_at'>): Promise<DailyLog> {
    const newLog: DailyLog = {
      ...log,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('daily_logs').insert([newLog]).select().single();
    if (error || !data) {
      throw new Error(error?.message || 'Gagal menyimpan jurnal harian ke Supabase.');
    }
    this.notify('daily_logs');
    return data as DailyLog;
  }

  async updateDailyLog(id: string, updates: Partial<DailyLog>): Promise<DailyLog | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('daily_logs')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    this.notify('daily_logs');
    return (data as DailyLog) || null;
  }

  async deleteDailyLog(id: string): Promise<boolean> {
    const { error } = await supabase.from('daily_logs').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    this.notify('daily_logs');
    return true;
  }

  // --- GUIDANCE SESSIONS ---
  async getGuidanceSessions(studentId?: string, lecturerId?: string): Promise<GuidanceSession[]> {
    let query = supabase.from('guidance_sessions').select('*').order('created_at', { ascending: false });
    if (studentId) query = query.eq('student_id', studentId);
    if (lecturerId) query = query.eq('lecturer_id', lecturerId);
    const { data, error } = await query;
    if (error) {
      console.error('Supabase getGuidanceSessions error:', error.message);
      return [];
    }
    return (data || []) as GuidanceSession[];
  }

  async createGuidanceSession(session: Omit<GuidanceSession, 'id' | 'created_at' | 'updated_at'>): Promise<GuidanceSession> {
    const newSession: GuidanceSession = {
      ...session,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('guidance_sessions').insert([newSession]).select().single();
    if (error || !data) {
      throw new Error(error?.message || 'Gagal menyimpan pengajuan bimbingan ke Supabase.');
    }
    this.notify('guidance_sessions');
    return data as GuidanceSession;
  }

  async updateGuidanceSession(id: string, updates: Partial<GuidanceSession>): Promise<GuidanceSession | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('guidance_sessions')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    this.notify('guidance_sessions');
    return (data as GuidanceSession) || null;
  }

  // --- PKN REPORTS ---
  async getPKNReports(studentId?: string): Promise<PKNReport[]> {
    let query = supabase.from('pkn_reports').select('*').order('version', { ascending: false });
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    if (error) {
      console.error('Supabase getPKNReports error:', error.message);
      return [];
    }
    return (data || []) as PKNReport[];
  }

  async createPKNReport(rep: Omit<PKNReport, 'id' | 'created_at'>): Promise<PKNReport> {
    const newRep: PKNReport = {
      ...rep,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('pkn_reports').insert([newRep]).select().single();
    if (error || !data) {
      throw new Error(error?.message || 'Gagal menyimpan laporan PKN ke Supabase.');
    }
    this.notify('pkn_reports');
    return data as PKNReport;
  }

  async updatePKNReport(id: string, updates: Partial<PKNReport>): Promise<PKNReport | null> {
    const { data, error } = await supabase
      .from('pkn_reports')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    this.notify('pkn_reports');
    return (data as PKNReport) || null;
  }

  // --- MBKM PROGRAMS & REGISTRATIONS ---
  async getMBKMPrograms(): Promise<MBKMProgram[]> {
    const { data, error } = await supabase
      .from('mbkm_programs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase getMBKMPrograms error:', error.message);
      return [];
    }
    return ((data || []) as Array<Partial<MBKMProgram>>).map(p => ({
      ...(p as MBKMProgram),
      registered_count: p.registered_count ?? 0,
    }));
  }

  async createMBKMProgram(prog: Omit<MBKMProgram, 'id' | 'created_at' | 'registered_count'>): Promise<MBKMProgram> {
    const payload = {
      ...prog,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('mbkm_programs').insert([payload]).select().single();
    if (error || !data) {
      throw new Error(error?.message || 'Gagal menambahkan program MBKM ke Supabase.');
    }
    this.notify('mbkm_programs');
    return { ...(data as MBKMProgram), registered_count: (data as Partial<MBKMProgram>).registered_count ?? 0 };
  }

  async getMBKMRegistrations(studentId?: string): Promise<MBKMRegistration[]> {
    let query = supabase.from('mbkm_registrations').select('*').order('created_at', { ascending: false });
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    if (error) {
      console.error('Supabase getMBKMRegistrations error:', error.message);
      return [];
    }
    return (data || []) as MBKMRegistration[];
  }

  async createMBKMRegistration(reg: Omit<MBKMRegistration, 'id' | 'created_at' | 'updated_at'>): Promise<MBKMRegistration> {
    const newReg: MBKMRegistration = {
      ...reg,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('mbkm_registrations').insert([newReg]).select().single();
    if (error || !data) {
      throw new Error(error?.message || 'Gagal mendaftar program MBKM ke Supabase.');
    }
    this.notify('mbkm_registrations');
    return data as MBKMRegistration;
  }

  // --- ASSESSMENTS & COMPONENTS ---
  async getAssessmentComponents(): Promise<AssessmentComponent[]> {
    const { data, error } = await supabase.from('assessment_components').select('*');
    if (error) {
      console.error('Supabase getAssessmentComponents error:', error.message);
      return [];
    }
    return (data || []) as AssessmentComponent[];
  }

  async createAssessmentComponent(comp: Omit<AssessmentComponent, 'id'>): Promise<AssessmentComponent> {
    const newComp: AssessmentComponent = {
      ...comp,
      id: this.generateId(),
    };
    const { data, error } = await supabase.from('assessment_components').insert([newComp]).select().single();
    if (error || !data) {
      throw new Error(error?.message || 'Gagal menambahkan komponen penilaian ke Supabase.');
    }
    this.notify('assessment_components');
    return data as AssessmentComponent;
  }

  async deleteAssessmentComponent(id: string): Promise<boolean> {
    const { error } = await supabase.from('assessment_components').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    this.notify('assessment_components');
    return true;
  }

  async getAssessments(registrationId?: string): Promise<Assessment[]> {
    let query = supabase.from('assessments').select('*').order('submitted_at', { ascending: false });
    if (registrationId) query = query.eq('registration_id', registrationId);
    const { data, error } = await query;
    if (error) {
      console.error('Supabase getAssessments error:', error.message);
      return [];
    }
    return (data || []) as Assessment[];
  }

  async saveAssessment(assessment: Omit<Assessment, 'id' | 'submitted_at'>): Promise<Assessment> {
    const { data: existing } = await supabase
      .from('assessments')
      .select('id')
      .eq('registration_id', assessment.registration_id)
      .eq('evaluator_role', assessment.evaluator_role)
      .maybeSingle();

    const payload: Assessment = {
      ...assessment,
      id: existing?.id || this.generateId(),
      submitted_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('assessments').upsert([payload]).select().single();
    if (error || !data) {
      throw new Error(error?.message || 'Gagal menyimpan penilaian ke Supabase.');
    }
    this.notify('assessments');
    return data as Assessment;
  }

  // --- COURSE CONVERSIONS ---
  async getCourseConversions(studentId?: string): Promise<CourseConversion[]> {
    let query = supabase.from('course_conversions').select('*').order('created_at', { ascending: false });
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    if (error) {
      console.error('Supabase getCourseConversions error:', error.message);
      return [];
    }
    return (data || []) as CourseConversion[];
  }

  async createCourseConversion(conv: Omit<CourseConversion, 'id' | 'created_at'>): Promise<CourseConversion> {
    const newConv: CourseConversion = {
      ...conv,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('course_conversions').insert([newConv]).select().single();
    if (error || !data) {
      throw new Error(error?.message || 'Gagal mengajukan konversi SKS ke Supabase.');
    }
    this.notify('course_conversions');
    return data as CourseConversion;
  }

  async updateCourseConversion(id: string, updates: Partial<CourseConversion>): Promise<CourseConversion | null> {
    const { data, error } = await supabase
      .from('course_conversions')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    this.notify('course_conversions');
    return (data as CourseConversion) || null;
  }

  // --- CERTIFICATES ---
  async getCertificates(studentId?: string): Promise<Certificate[]> {
    let query = supabase.from('certificates').select('*').order('created_at', { ascending: false });
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    if (error) {
      console.error('Supabase getCertificates error:', error.message);
      return [];
    }
    return (data || []) as Certificate[];
  }

  async createCertificate(cert: Omit<Certificate, 'id' | 'created_at'>): Promise<Certificate> {
    const newCert: Certificate = {
      ...cert,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('certificates').insert([newCert]).select().single();
    if (error || !data) {
      throw new Error(error?.message || 'Gagal menerbitkan sertifikat ke Supabase.');
    }
    this.notify('certificates');
    return data as Certificate;
  }

  // --- NOTIFICATIONS ---
  async getNotifications(userId: string): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase getNotifications error:', error.message);
      return [];
    }
    return (data || []) as AppNotification[];
  }

  async createNotification(notif: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>): Promise<AppNotification> {
    const newNotif: AppNotification = {
      ...notif,
      id: this.generateId(),
      is_read: false,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('notifications').insert([newNotif]).select().maybeSingle();
    if (error) {
      console.error('Supabase createNotification error:', error.message);
      return newNotif;
    }
    this.notify('notifications');
    return (data as AppNotification) || newNotif;
  }

  async markNotificationRead(id: string): Promise<void> {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (!error) {
      this.notify('notifications');
    }
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    if (!error) {
      this.notify('notifications');
    }
  }

  // --- ANNOUNCEMENTS ---
  async getAnnouncements(): Promise<Announcement[]> {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase getAnnouncements error:', error.message);
      return [];
    }
    return (data || []) as Announcement[];
  }

  async createAnnouncement(ann: Omit<Announcement, 'id' | 'created_at'>): Promise<Announcement> {
    const newAnn: Announcement = {
      ...ann,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('announcements').insert([newAnn]).select().single();
    if (error || !data) {
      throw new Error(error?.message || 'Gagal membuat pengumuman di Supabase.');
    }
    this.notify('announcements');
    return data as Announcement;
  }

  async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement | null> {
    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    this.notify('announcements');
    return (data as Announcement) || null;
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    this.notify('announcements');
    return true;
  }

  // --- ACTIVITY LOGS ---
  async getActivityLogs(): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error('Supabase getActivityLogs error:', error.message);
      return [];
    }
    return (data || []) as ActivityLog[];
  }

  // --- SYSTEM SETTINGS ---
  async getSystemSettings(): Promise<SystemSettings> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 'primary')
      .maybeSingle();
    if (!error && data) {
      return data as SystemSettings;
    }
    return DEFAULT_SYSTEM_SETTINGS;
  }

  async updateSystemSettings(updates: Partial<SystemSettings>): Promise<SystemSettings> {
    const current = await this.getSystemSettings();
    const updated = { ...current, ...updates, id: 'primary' };

    const { data, error } = await supabase
      .from('system_settings')
      .upsert([updated])
      .select()
      .single();
    if (error || !data) {
      throw new Error(error?.message || 'Gagal memperbarui pengaturan sistem di Supabase.');
    }
    this.notify('system_settings');
    return data as SystemSettings;
  }

  // --- FILE UPLOAD (Supabase Storage) ---
  async uploadFile(bucketName: string, path: string, file: File): Promise<string> {
    const { data, error } = await supabase.storage.from(bucketName).upload(path, file, {
      upsert: true
    });
    if (!error && data) {
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(path);
      if (publicUrlData?.publicUrl) return publicUrlData.publicUrl;
    }

    // Fallback to base64 data URI only if bucket isn't provisioned yet and file <= 2MB
    if (file.size <= 2 * 1024 * 1024) {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error(error?.message || 'Gagal membaca berkas.'));
        reader.readAsDataURL(file);
      });
    }

    throw new Error(error?.message || `Gagal mengunggah file ke Supabase Storage (${bucketName}).`);
  }
}

export const dbService = new DatabaseService();
