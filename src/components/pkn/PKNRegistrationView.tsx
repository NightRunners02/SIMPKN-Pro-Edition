import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { dbService } from '../../services/db';
import {
  PKNRegistration,
  PKNGroupMember,
  Company,
  UserProfile,
  RegistrationStatus
} from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import {
  Upload,
  Search,
  Filter,
  ExternalLink,
  Edit3,
  Users,
  UserPlus,
  X,
  FileText,
  Loader2
} from 'lucide-react';

const MAX_GROUP_MEMBERS = 4;

export const PKNRegistrationView: React.FC = () => {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();

  const [registrations, setRegistrations] = useState<PKNRegistration[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [registeredStudents, setRegisteredStudents] = useState<UserProfile[]>([]);
  const [dosenList, setDosenList] = useState<UserProfile[]>([]);
  const [plList, setPlList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // New Registration Modal for Mahasiswa
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [startDate, setStartDate] = useState('2025-02-10');
  const [endDate, setEndDate] = useState('2025-05-10');
  const [notes, setNotes] = useState('');
  const [krsFile, setKrsFile] = useState<File | null>(null);
  const [acceptanceFile, setAcceptanceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group members picker state (max 4 members)
  const [selectedMembers, setSelectedMembers] = useState<PKNGroupMember[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);

  // Admin Verification & Assignment Modal
  const [selectedReg, setSelectedReg] = useState<PKNRegistration | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [newStatus, setNewStatus] = useState<RegistrationStatus>('approved');
  const [adminNotes, setAdminNotes] = useState('');
  const [assignedLecturerId, setAssignedLecturerId] = useState('');
  const [assignedPlId, setAssignedPlId] = useState('');

  const [academicPeriodId, setAcademicPeriodId] = useState<string | null>(null);

  const loadData = async () => {
    const [allRegs, allComps, allProfiles, allPeriods] = await Promise.all([
      dbService.getPKNRegistrations(),
      dbService.getCompanies(),
      dbService.getProfiles(),
      dbService.getAcademicPeriods(),
    ]);

    const activePeriod = allPeriods.find((p) => p.is_active) || allPeriods[0] || null;
    setAcademicPeriodId(activePeriod ? activePeriod.id : null);
    setRegistrations(allRegs);
    setCompanies(allComps);
    setRegisteredStudents(
      allProfiles.filter(
        (p) => p.role === 'mahasiswa' && p.is_active && p.id !== user?.id
      )
    );
    setDosenList(allProfiles.filter((p) => p.role === 'dosen_pembimbing'));
    setPlList(allProfiles.filter((p) => p.role === 'pembimbing_lapangan'));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsubReg = dbService.subscribe('pkn_registrations', loadData);
    const unsubProfiles = dbService.subscribe('profiles', loadData);
    return () => {
      unsubReg();
      unsubProfiles();
    };
  }, [user?.id]);

  const handleCompanySelect = (compId: string) => {
    setSelectedCompanyId(compId);
    const comp = companies.find((c) => c.id === compId);
    if (comp) {
      setCompanyName(comp.name);
      setCompanyAddress(`${comp.address}, ${comp.city}`);
      setContactName(comp.email);
      setContactPhone(comp.phone);
    }
  };

  const resetApplyForm = () => {
    setSelectedCompanyId('');
    setCompanyName('');
    setCompanyAddress('');
    setContactName('');
    setContactPhone('');
    setStartDate('2025-02-10');
    setEndDate('2025-05-10');
    setNotes('');
    setKrsFile(null);
    setAcceptanceFile(null);
    setSelectedMembers([]);
    setMemberSearch('');
    setIsMemberDropdownOpen(false);
  };

  const availableStudentCandidates = registeredStudents.filter((student) => {
    const alreadyAdded = selectedMembers.some((m) => m.id === student.id);
    if (alreadyAdded) return false;
    if (!memberSearch.trim()) return true;
    const q = memberSearch.trim().toLowerCase();
    return (
      student.full_name.toLowerCase().includes(q) ||
      student.identifier.toLowerCase().includes(q)
    );
  });

  const handleAddGroupMember = (student: UserProfile) => {
    if (selectedMembers.length >= MAX_GROUP_MEMBERS) {
      showToast(
        'warning',
        'Batas Anggota Tercapai',
        `Maksimal ${MAX_GROUP_MEMBERS} anggota kelompok PKN dapat ditambahkan.`
      );
      return;
    }

    if (selectedMembers.some((m) => m.id === student.id)) return;

    setSelectedMembers((prev) => [
      ...prev,
      {
        id: student.id,
        full_name: student.full_name,
        identifier: student.identifier,
        study_program: student.study_program,
        semester: student.semester,
        gpa: student.gpa,
      },
    ]);
    setMemberSearch('');
    setIsMemberDropdownOpen(false);
  };

  const handleRemoveGroupMember = (memberId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!companyName.trim() || !companyAddress.trim() || !contactPhone.trim()) {
      showToast('error', 'Formulir Belum Lengkap', 'Silakan lengkapi informasi instansi tujuan PKN.');
      return;
    }

    if (!krsFile) {
      showToast(
        'error',
        'Lampiran KRS Wajib Diunggah',
        'Silakan unggah scan lampiran KRS PKN Anda sebelum mengirim pendaftaran.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      let krsUrl: string | undefined;
      let acceptanceUrl: string | undefined;

      if (krsFile) {
        krsUrl = await dbService.uploadFile(
          'pkn-requirements',
          `krs/${user.identifier}_${Date.now()}_${krsFile.name}`,
          krsFile
        );
      }
      if (acceptanceFile) {
        acceptanceUrl = await dbService.uploadFile(
          'pkn-requirements',
          `acceptance/${user.identifier}_${Date.now()}_${acceptanceFile.name}`,
          acceptanceFile
        );
      }

      const created = await dbService.createPKNRegistration({
        student_id: user.id,
        student_name: user.full_name,
        student_nim: user.identifier,
        student_gpa: user.gpa || 3.75,
        student_semester: user.semester || 7,
        academic_period_id: academicPeriodId,
        company_id: selectedCompanyId || null,
        company_name: companyName.trim(),
        company_address: companyAddress.trim(),
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim(),
        start_date: startDate,
        end_date: endDate,
        krs_url: krsUrl,
        acceptance_letter_url: acceptanceUrl,
        group_members: selectedMembers,
        notes: notes.trim(),
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      });

      // Notify added group members via Supabase
      if (selectedMembers.length > 0) {
        await Promise.all(
          selectedMembers.map((member) =>
            dbService.createNotification({
              user_id: member.id,
              title: 'Anda Ditambahkan ke Kelompok PKN',
              message: `${user.full_name} (${user.identifier}) mendaftarkan Anda sebagai anggota kelompok PKN di ${companyName.trim()}.`,
              type: 'info',
              action_url: '/pkn_registration',
            })
          )
        );
      }

      const memberInfo =
        selectedMembers.length > 0
          ? ` bersama ${selectedMembers.length} anggota kelompok`
          : '';
      await dbService.logActivity(
        user.id,
        user.full_name,
        user.role,
        'SUBMIT_PKN_REGISTRATION',
        'pkn_registration',
        created.id,
        `Mahasiswa mengajukan PKN di ${companyName.trim()}${memberInfo}`
      );

      showToast(
        'success',
        'Pendaftaran Berhasil Dikirim',
        'Pengajuan PKN beserta lampiran KRS Anda sedang ditinjau koordinator prodi.'
      );
      resetApplyForm();
      setShowApplyModal(false);
      loadData();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan sistem saat mengirim pendaftaran.';
      showToast('error', 'Gagal Mengirim', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveVerification = async () => {
    if (!selectedReg) return;

    const lecturer = dosenList.find((d) => d.id === assignedLecturerId);
    const pl = plList.find((p) => p.id === assignedPlId);

    const updates: Partial<PKNRegistration> = {
      status: newStatus,
      admin_notes: adminNotes,
      lecturer_id: assignedLecturerId || selectedReg.lecturer_id,
      lecturer_name: lecturer ? lecturer.full_name : selectedReg.lecturer_name,
      field_supervisor_id: assignedPlId || selectedReg.field_supervisor_id,
      field_supervisor_name: pl ? pl.full_name : selectedReg.field_supervisor_name,
      approved_at: newStatus === 'approved' ? new Date().toISOString() : undefined,
    };

    await dbService.updatePKNRegistration(selectedReg.id, updates);

    // Notify leader and all group members
    const recipientIds = Array.from(
      new Set([
        selectedReg.student_id,
        ...(selectedReg.group_members || []).map((m) => m.id),
      ])
    );

    await Promise.all(
      recipientIds.map((uid) =>
        dbService.createNotification({
          user_id: uid,
          title: `Status Pendaftaran PKN: ${newStatus.toUpperCase()}`,
          message:
            adminNotes ||
            `Pengajuan PKN Anda di ${selectedReg.company_name} telah diperbarui statusnya menjadi ${newStatus}.`,
          type:
            newStatus === 'approved'
              ? 'success'
              : newStatus === 'revision_required'
              ? 'warning'
              : 'info',
          action_url: '/pkn_registration',
        })
      )
    );

    if (user) {
      dbService.logActivity(
        user.id,
        user.full_name,
        user.role,
        'VERIFY_PKN',
        'pkn_registration',
        selectedReg.id,
        `Koordinator mengubah status PKN mahasiswa ${selectedReg.student_name} menjadi ${newStatus}`
      );
    }

    showToast('success', 'Verifikasi Disimpan', 'Status dan penugasan dosen berhasil diperbarui.');
    setShowVerifyModal(false);
    loadData();
  };

  // Filter registrations
  const isMahasiswa = role === 'mahasiswa';
  const displayedRegistrations = registrations.filter((r) => {
    const isMemberOfGroup =
      r.student_id === user?.id ||
      (r.group_members || []).some((m) => m.id === user?.id);
    if (isMahasiswa && !isMemberOfGroup) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const memberMatch = (r.group_members || []).some(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          m.identifier.toLowerCase().includes(q)
      );
      return (
        r.student_name.toLowerCase().includes(q) ||
        r.student_nim.toLowerCase().includes(q) ||
        r.company_name.toLowerCase().includes(q) ||
        memberMatch
      );
    }
    return true;
  });

  const totalPages = Math.ceil(displayedRegistrations.length / pageSize);
  const pagedList = displayedRegistrations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {isMahasiswa
              ? 'Status & Pendaftaran PKN Mahasiswa'
              : 'Pengelolaan & Verifikasi Pendaftaran PKN'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola pengajuan tempat PKN, anggota kelompok, scan lampiran KRS, dan penetapan pembimbing
          </p>
        </div>

        {isMahasiswa && (
          <button
            type="button"
            onClick={() => {
              resetApplyForm();
              setShowApplyModal(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs whitespace-nowrap shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Ajukan Tempat PKN Baru</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari mahasiswa, anggota, NIM, atau instansi..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
          >
            <option value="all">Semua Status</option>
            <option value="submitted">Diajukan (Submitted)</option>
            <option value="under_review">Sedang Ditinjau</option>
            <option value="revision_required">Perlu Revisi</option>
            <option value="approved">Disetujui (Approved)</option>
            <option value="completed">Selesai (Completed)</option>
          </select>
        </div>
      </div>

      {/* Registrations List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">
            Memuat data pendaftaran PKN dari Supabase...
          </div>
        ) : pagedList.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Tidak ada data pendaftaran PKN yang sesuai kriteria pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Mahasiswa & Kelompok</th>
                  <th className="py-3 px-4 font-semibold">Instansi PKN</th>
                  <th className="py-3 px-4 font-semibold">Periode & Lampiran</th>
                  <th className="py-3 px-4 font-semibold">Dosen Pembimbing</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pagedList.map((reg) => {
                  const members = reg.group_members || [];
                  const krsDocUrl = reg.krs_url || reg.proposal_url;
                  return (
                    <tr
                      key={reg.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                          {reg.student_name}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-slate-400 block">
                          NIM {reg.student_nim} · IPK {reg.student_gpa}
                        </span>
                        {members.length > 0 && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                            Kelompok ({members.length} anggota):{' '}
                            {members.map((m) => m.full_name).join(', ')}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800 dark:text-slate-200 block">
                          {reg.company_name}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                          {reg.company_address}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300 block">
                          {reg.start_date} s/d {reg.end_date}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {krsDocUrl && (
                            <a
                              href={krsDocUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 dark:text-red-400 hover:underline"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Lampiran KRS</span>
                            </a>
                          )}
                          {reg.acceptance_letter_url && (
                            <a
                              href={reg.acceptance_letter_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Surat Balasan</span>
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        {reg.lecturer_name || (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            Belum Ditugaskan
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={reg.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!isMahasiswa ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReg(reg);
                              setNewStatus(reg.status);
                              setAdminNotes(reg.admin_notes || '');
                              setAssignedLecturerId(reg.lecturer_id || '');
                              setAssignedPlId(reg.field_supervisor_id || '');
                              setShowVerifyModal(true);
                            }}
                            className="px-3 py-1.5 text-[11px] font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Verifikasi & Dosen</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-400">
                            {reg.admin_notes ? reg.admin_notes : 'Dalam proses'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={displayedRegistrations.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Modal 1: Formulir Pendaftaran PKN Mahasiswa */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="Formulir Pendaftaran PKN Mahasiswa"
        subtitle="Pastikan Anda telah memenuhi syarat minimal 80 SKS, IPK minimal 2.50, dan melampirkan scan KRS PKN"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmitRegistration} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                {user?.full_name} (Pengaju / Ketua Kelompok)
              </span>
              <span className="text-slate-500 font-mono tabular-nums">
                NIM {user?.identifier} · IPK {user?.gpa || '3.75'}
              </span>
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
              Syarat Terpenuhi
            </span>
          </div>

          {/* Anggota Kelompok PKN (Maks. 4 Anggota) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Anggota Kelompok PKN (Maks. {MAX_GROUP_MEMBERS} Anggota)
                </span>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {selectedMembers.length}/{MAX_GROUP_MEMBERS} anggota dipilih
              </span>
            </div>

            {/* Searchable Dropdown Picker of Registered Students */}
            <div className="relative">
              <div className="relative">
                <UserPlus className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={memberSearch}
                  disabled={selectedMembers.length >= MAX_GROUP_MEMBERS}
                  onFocus={() => setIsMemberDropdownOpen(true)}
                  onChange={(e) => {
                    setMemberSearch(e.target.value);
                    setIsMemberDropdownOpen(true);
                  }}
                  placeholder={
                    selectedMembers.length >= MAX_GROUP_MEMBERS
                      ? `Batas maksimal ${MAX_GROUP_MEMBERS} anggota kelompok telah tercapai`
                      : 'Cari dan pilih nama atau NIM mahasiswa terdaftar...'
                  }
                  className="w-full pl-9 pr-20 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-hidden focus:ring-2 focus:ring-red-700"
                />
                {selectedMembers.length < MAX_GROUP_MEMBERS && (
                  <button
                    type="button"
                    onClick={() => setIsMemberDropdownOpen((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    {isMemberDropdownOpen ? 'Tutup' : 'Pilih Nama'}
                  </button>
                )}
              </div>

              {isMemberDropdownOpen && selectedMembers.length < MAX_GROUP_MEMBERS && (
                <div className="mt-1.5 max-h-44 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-md divide-y divide-slate-100 dark:divide-slate-800">
                  {availableStudentCandidates.length === 0 ? (
                    <div className="px-3.5 py-3 text-[11px] text-slate-400">
                      {registeredStudents.length === 0
                        ? 'Belum ada akun mahasiswa lain yang terdaftar di sistem.'
                        : 'Tidak ada mahasiswa yang cocok atau semua sudah dipilih.'}
                    </div>
                  ) : (
                    availableStudentCandidates.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleAddGroupMember(student)}
                        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block truncate">
                            {student.full_name}
                          </span>
                          <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            NIM {student.identifier} · Semester {student.semester || '-'}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-red-700 dark:text-red-400 shrink-0">
                          + Tambah
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selected Members List */}
            {selectedMembers.length > 0 && (
              <div className="space-y-2 pt-1">
                {selectedMembers.map((member, index) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block truncate">
                        {index + 1}. {member.full_name}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        NIM {member.identifier}
                        {member.study_program ? ` · ${member.study_program}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveGroupMember(member.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                      title={`Hapus ${member.full_name}`}
                      aria-label={`Hapus ${member.full_name} dari kelompok`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Opsional: kosongkan jika melaksanakan PKN secara individu, atau pilih maksimal {MAX_GROUP_MEMBERS} anggota kelompok yang terdaftar.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pilih dari Direktori Instansi Terverifikasi
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => handleCompanySelect(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            >
              <option value="">-- Pilih Instansi yang Tersedia atau Ketik Manual --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Instansi / Perusahaan *
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Contoh: PT Telkom Indonesia Witel Malang"
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alamat Lengkap Instansi *
            </label>
            <textarea
              rows={2}
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              placeholder="Alamat kantor, gedung, jalan, kota"
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                PIC / Kontak Instansi
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nama HRD atau Manajer Unit"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                No. Telepon / WhatsApp Instansi *
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="0341-xxx atau 0812xxx"
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Mulai PKN
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
                Tanggal Selesai PKN
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Scan Lampiran KRS PKN (PDF / JPG / PNG) *
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setKrsFile(e.target.files?.[0] || null)}
                required
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {krsFile
                  ? `Terpilih: ${krsFile.name}`
                  : 'Wajib unggah bukti KRS mata kuliah PKN yang telah disetujui.'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Surat Penerimaan Instansi (PDF / Gambar)
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setAcceptanceFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200"
              />
              {acceptanceFile && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Terpilih: {acceptanceFile.name}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Rencana Aktivitas & Catatan Tambahan
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Deskripsikan divisi, fokus tugas, atau teknologi yang akan dikembangkan..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowApplyModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 shadow-xs disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Mengirim...' : 'Kirim Pendaftaran PKN'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Admin PKN Verifikasi & Penugasan Dosen */}
      <Modal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        title="Verifikasi Berkas & Penugasan Dosen"
        subtitle={`Mahasiswa: ${selectedReg?.student_name} (${selectedReg?.student_nim})`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-2">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Instansi Tujuan:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-right">
                {selectedReg?.company_name}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Durasi:</span>
              <span className="font-mono tabular-nums">
                {selectedReg?.start_date} s/d {selectedReg?.end_date}
              </span>
            </div>

            {selectedReg?.group_members && selectedReg.group_members.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/70">
                <span className="text-slate-500 block mb-1">
                  Anggota Kelompok ({selectedReg.group_members.length} orang):
                </span>
                <ul className="space-y-1 text-slate-800 dark:text-slate-200">
                  {selectedReg.group_members.map((m, idx) => (
                    <li key={m.id} className="font-mono text-[11px]">
                      {idx + 1}. {m.full_name} (NIM {m.identifier})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/70 flex flex-wrap items-center gap-3">
              {(selectedReg?.krs_url || selectedReg?.proposal_url) && (
                <a
                  href={selectedReg.krs_url || selectedReg.proposal_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400 hover:underline"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Buka Scan Lampiran KRS PKN</span>
                </a>
              )}
              {selectedReg?.acceptance_letter_url && (
                <a
                  href={selectedReg.acceptance_letter_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Surat Penerimaan</span>
                </a>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Status Verifikasi
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as RegistrationStatus)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            >
              <option value="submitted">Diajukan (Submitted)</option>
              <option value="under_review">Sedang Ditinjau (Under Review)</option>
              <option value="approved">Disetujui (Approved)</option>
              <option value="revision_required">Perlu Revisi (Revision Required)</option>
              <option value="rejected">Ditolak (Rejected)</option>
              <option value="completed">Selesai (Completed)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tugaskan Dosen Pembimbing Akademik
            </label>
            <select
              value={assignedLecturerId}
              onChange={(e) => setAssignedLecturerId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            >
              <option value="">-- Pilih Dosen Pembimbing --</option>
              {dosenList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} (NIDN: {d.identifier})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tugaskan Pembimbing Lapangan (Instansi)
            </label>
            <select
              value={assignedPlId}
              onChange={(e) => setAssignedPlId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            >
              <option value="">-- Pilih Pembimbing Lapangan --</option>
              {plList.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.full_name} ({pl.company_name || 'Mitra'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Koordinator untuk Mahasiswa
            </label>
            <textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Berikan instruksi berkas, catatan surat pengantar, atau alasan revisi..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowVerifyModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveVerification}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 shadow-xs"
            >
              Simpan Verifikasi & Penugasan
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
