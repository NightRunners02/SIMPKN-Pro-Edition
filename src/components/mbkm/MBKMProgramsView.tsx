import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { dbService } from '../../services/db';
import { MBKMProgram, MBKMRegistration } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import {
  Sparkles,
  Building2,
  Calendar,
  Users,
  Clock,
  Plus,
  CheckCircle2,
  FileText,
  Upload,
  ArrowRight
} from 'lucide-react';

export const MBKMProgramsView: React.FC = () => {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();

  const [programs, setPrograms] = useState<MBKMProgram[]>([]);
  const [registrations, setRegistrations] = useState<MBKMRegistration[]>([]);

  // Apply Modal (Mahasiswa)
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<MBKMProgram | null>(null);
  const [startDate, setStartDate] = useState('2025-02-15');
  const [endDate, setEndDate] = useState('2025-08-15');
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  // Add Program Modal (Admin)
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [title, setTitle] = useState('');
  const [programType, setProgramType] = useState<MBKMProgram['program_type']>('Magang Industri');
  const [partnerName, setPartnerName] = useState('');
  const [description, setDescription] = useState('');
  const [period, setPeriod] = useState('Semester Genap 2024/2025');
  const [durationMonths, setDurationMonths] = useState(6);
  const [requirements, setRequirements] = useState('');
  const [quota, setQuota] = useState(20);

  const isMahasiswa = role === 'mahasiswa';
  const isAdmin = role === 'admin_pkn' || role === 'super_admin';

  const [academicPeriodId, setAcademicPeriodId] = useState<string | null>(null);

  const loadData = async () => {
    const [allPrograms, allRegs, allPeriods] = await Promise.all([
      dbService.getMBKMPrograms(),
      dbService.getMBKMRegistrations(),
      dbService.getAcademicPeriods(),
    ]);

    const activePeriod = allPeriods.find(p => p.is_active) || allPeriods[0] || null;
    setAcademicPeriodId(activePeriod ? activePeriod.id : null);
    setPrograms(allPrograms);
    setRegistrations(allRegs);
  };

  useEffect(() => {
    loadData();
    const unsub = dbService.subscribe('mbkm_programs', loadData);
    return () => unsub();
  }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram || !user) return;

    try {
      let docUrl: string | undefined;
      if (documentFile) {
        docUrl = await dbService.uploadFile('mbkm-documents', `mbkm/${user.identifier}_${documentFile.name}`, documentFile);
      }

      const created = await dbService.createMBKMRegistration({
        student_id: user.id,
        student_name: user.full_name,
        student_nim: user.identifier,
        program_id: selectedProgram.id,
        program_title: selectedProgram.title,
        partner_name: selectedProgram.partner_name,
        program_type: selectedProgram.program_type,
        academic_period_id: academicPeriodId,
        start_date: startDate,
        end_date: endDate,
        status: 'submitted',
        document_url: docUrl,
      });

      dbService.logActivity(user.id, user.full_name, user.role, 'REGISTER_MBKM', 'mbkm_registration', created.id, `Mahasiswa mendaftar MBKM: ${selectedProgram.title}`);

      showToast('success', 'Pendaftaran MBKM Berhasil', 'Pengajuan keikutsertaan program MBKM Anda telah terkirim.');
      setShowApplyModal(false);
      loadData();
    } catch (err) {
      showToast('error', 'Pendaftaran Gagal', err instanceof Error ? err.message : 'Gagal mengirim pendaftaran ke Supabase.');
    }
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !partnerName) {
      showToast('error', 'Validasi Gagal', 'Harap lengkapi nama program dan mitra.');
      return;
    }

    try {
      const created = await dbService.createMBKMProgram({
        title,
        program_type: programType,
        partner_name: partnerName,
        description,
        period,
        duration_months: Number(durationMonths),
        requirements,
        quota: Number(quota),
        is_active: true,
      });

      if (user) {
        dbService.logActivity(user.id, user.full_name, user.role, 'CREATE_MBKM_PROGRAM', 'mbkm_program', created.id, `Admin membuat program MBKM: ${title}`);
      }

      showToast('success', 'Program MBKM Ditambahkan', 'Program baru sekarang dapat dilihat mahasiswa.');
      setShowAddProgramModal(false);
      setTitle('');
      setPartnerName('');
      setDescription('');
      loadData();
    } catch (err) {
      showToast('error', 'Gagal Menambah Program', err instanceof Error ? err.message : 'Gagal menyimpan program ke Supabase.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Katalog Program MBKM Informatika (Merdeka Belajar)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Program Magang Industri Bersertifikat, Studi Independen (Bangkit), dan Kampus Mengajar terkonversi 20 SKS
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddProgramModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Program MBKM</span>
          </button>
        )}
      </div>

      {/* Program Cards Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((prog) => {
          const registered = registrations.filter(r => r.program_id === prog.id).length;
          const isUserRegistered = registrations.some(r => r.program_id === prog.id && r.student_id === user?.id);

          return (
            <div
              key={prog.id}
              className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 rounded-md">
                    {prog.program_type}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Durasi: {prog.duration_months} Bulan
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    {prog.title}
                  </h3>
                  <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{prog.partner_name}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                  {prog.description}
                </p>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">Persyaratan:</span>
                  <p className="text-slate-500 line-clamp-2">{prog.requirements}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500">
                  Kuota: <strong className="text-slate-900 dark:text-slate-100">{prog.registered_count + registered} / {prog.quota}</strong>
                </span>

                {isMahasiswa && (
                  isUserRegistered ? (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Terdaftar</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedProgram(prog);
                        setShowApplyModal(true);
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <span>Daftar Program</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal 1: Apply MBKM (Mahasiswa) */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="Form Pendaftaran Program MBKM"
        subtitle={`Program: ${selectedProgram?.title} · Mitra: ${selectedProgram?.partner_name}`}
        maxWidth="md"
      >
        <form onSubmit={handleApply} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Mulai *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Selesai *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Surat Penerimaan Mitra / Bukti Lolos Seleksi (PDF)
            </label>
            <input
              type="file"
              accept=".pdf,.png,.jpg"
              onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowApplyModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 shadow-xs"
            >
              Kirim Pendaftaran
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Add Program (Admin) */}
      <Modal
        isOpen={showAddProgramModal}
        onClose={() => setShowAddProgramModal(false)}
        title="Tambah Program MBKM Baru"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateProgram} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama / Judul Program MBKM *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Bangkit Academy 2025 Mobile Development"
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Program
              </label>
              <select
                value={programType}
                onChange={(e) => setProgramType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              >
                <option value="Magang Industri">Magang Industri</option>
                <option value="MSIB">MSIB (Studi & Magang Bersertifikat)</option>
                <option value="Studi Independen">Studi Independen</option>
                <option value="Kampus Mengajar">Kampus Mengajar</option>
                <option value="Pertukaran Mahasiswa">Pertukaran Mahasiswa</option>
                <option value="Riset / Penelitian">Riset / Penelitian</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Mitra / Lembaga Penyelenggara *
              </label>
              <input
                type="text"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="Google Indonesia / PT GoTo"
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deskripsi Silabus & Aktivitas
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cakupan pembelajaran, teknologi, dan portofolio..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Durasi (Bulan)
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kuota Maksimal
              </label>
              <input
                type="number"
                min="1"
                value={quota}
                onChange={(e) => setQuota(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Persyaratan Peserta
            </label>
            <textarea
              rows={2}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Contoh: Semester 5 atau 7, IPK minimal 3.00, lolos technical test..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddProgramModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 shadow-xs"
            >
              Simpan Program MBKM
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
