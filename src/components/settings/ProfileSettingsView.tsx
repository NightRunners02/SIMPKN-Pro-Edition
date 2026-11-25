import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { dbService } from '../../services/db';
import { Company, UserRole } from '../../types/database';
import { RoleBadge } from '../common/RoleBadge';
import {
  User,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  KeyRound,
  Save,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ShieldCheck,
  Loader2,
  BookOpen
} from 'lucide-react';

type ProfileTab = 'identity' | 'security' | 'preferences';

const getIdentifierLabel = (role: UserRole | null): string => {
  switch (role) {
    case 'mahasiswa':
      return 'Nomor Induk Mahasiswa (NIM)';
    case 'dosen_pembimbing':
      return 'Nomor Induk Dosen Nasional (NIDN)';
    case 'pembimbing_lapangan':
      return 'Nomor Induk Pegawai (NIP / ID Mitra)';
    case 'admin_pkn':
      return 'Nomor Induk Pegawai (NIP / NIDN)';
    case 'super_admin':
      return 'Username Administrator';
    default:
      return 'Identitas Akun';
  }
};

const getInitials = (name?: string) => {
  if (!name) return 'UM';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || 'UM';
};

export const ProfileSettingsView: React.FC = () => {
  const { user, role, updateCurrentUserProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useNotifications();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('identity');

  // Profile identity form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [faculty, setFaculty] = useState('Fakultas Teknik');
  const [studyProgram, setStudyProgram] = useState('Informatika');
  const [semester, setSemester] = useState<number>(7);
  const [gpa, setGpa] = useState<string>('3.50');
  const [companyId, setCompanyId] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security / password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name || '');
    setEmail(
      user.email && !user.email.endsWith('@noemail.simpkn.umm') ? user.email : ''
    );
    setPhone(user.phone || '');
    setFaculty(user.faculty || 'Fakultas Teknik');
    setStudyProgram(user.study_program || 'Informatika');
    setSemester(user.semester ?? 7);
    setGpa(user.gpa !== undefined && user.gpa !== null ? Number(user.gpa).toFixed(2) : '3.50');
    setCompanyId(user.company_id || '');
    setCompanyName(user.company_name || '');
    setAvatarFailed(false);
  }, [user]);

  useEffect(() => {
    if (role !== 'pembimbing_lapangan') return;
    let active = true;
    dbService.getCompanies().then((list) => {
      if (active) {
        setCompanies(list.filter((c) => c.is_active));
      }
    });
    return () => {
      active = false;
    };
  }, [role]);

  if (!user) return null;

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('error', 'Format Tidak Didukung', 'Unggah foto profil berformat JPG, PNG, atau WEBP.');
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Ukuran Terlalu Besar', 'Ukuran maksimal foto profil adalah 2 MB.');
      e.target.value = '';
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const storagePath = `avatars/${user.id}-${Date.now()}.${ext}`;
      const uploadedUrl = await dbService.uploadFile('pkn-activities', storagePath, file);

      await updateCurrentUserProfile({ avatar_url: uploadedUrl });
      setAvatarFailed(false);

      await dbService.logActivity(
        user.id,
        user.full_name,
        user.role,
        'UPDATE_AVATAR',
        'profile',
        user.id,
        `${user.full_name} memperbarui foto profil akun.`
      );
      showToast('success', 'Foto Profil Diperbarui', 'Foto profil baru Anda telah tersimpan di Supabase.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengunggah foto profil.';
      showToast('error', 'Gagal Unggah Foto', message);
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      await updateCurrentUserProfile({ avatar_url: '' });
      setAvatarFailed(false);
      showToast('info', 'Foto Profil Dihapus', 'Tampilan profil dikembalikan ke inisial nama.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus foto profil.';
      showToast('error', 'Terjadi Kesalahan', message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < 3) {
      showToast('error', 'Validasi Gagal', 'Nama lengkap minimal harus 3 karakter.');
      return;
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showToast('error', 'Format Email Salah', 'Masukkan alamat email yang valid atau kosongkan.');
      return;
    }

    const updates: Record<string, unknown> = {
      full_name: trimmedName,
      email: trimmedEmail || null,
      phone: trimmedPhone || '',
      faculty: faculty.trim() || 'Fakultas Teknik',
      study_program: studyProgram.trim() || 'Informatika',
    };

    if (role === 'mahasiswa') {
      const parsedSemester = Number(semester);
      const parsedGpa = Number(gpa);
      if (!Number.isInteger(parsedSemester) || parsedSemester < 1 || parsedSemester > 14) {
        showToast('error', 'Validasi Semester', 'Semester harus berupa bilangan bulat antara 1 sampai 14.');
        return;
      }
      if (Number.isNaN(parsedGpa) || parsedGpa < 0 || parsedGpa > 4) {
        showToast('error', 'Validasi IPK', 'Nilai IPK harus berada di antara 0.00 sampai 4.00.');
        return;
      }
      updates.semester = parsedSemester;
      updates.gpa = Number(parsedGpa.toFixed(2));
    }

    if (role === 'pembimbing_lapangan') {
      updates.company_id = companyId || undefined;
      updates.company_name = companyName.trim() || '';
    }

    setIsSavingProfile(true);
    try {
      await updateCurrentUserProfile(updates);
      await dbService.logActivity(
        user.id,
        trimmedName,
        user.role,
        'UPDATE_PROFILE',
        'profile',
        user.id,
        `Pengguna ${trimmedName} (${user.identifier}) memperbarui informasi profil.`
      );
      showToast('success', 'Profil Disimpan', 'Perubahan data profil Anda telah tersinkronisasi dengan Supabase.');
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : 'Gagal memperbarui profil.';
      const friendlyMsg = rawMsg.toLowerCase().includes('duplicate') || rawMsg.toLowerCase().includes('unique')
        ? 'Email yang dimasukkan sudah digunakan oleh akun lain.'
        : rawMsg;
      showToast('error', 'Gagal Menyimpan Profil', friendlyMsg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      showToast('error', 'Validasi Gagal', 'Masukkan kata sandi Anda saat ini.');
      return;
    }
    if (newPassword.length < 6) {
      showToast('error', 'Kata Sandi Terlalu Pendek', 'Kata sandi baru minimal harus 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Konfirmasi Tidak Cocok', 'Kata sandi baru dan konfirmasi kata sandi harus sama.');
      return;
    }
    if (currentPassword === newPassword) {
      showToast('warning', 'Tidak Ada Perubahan', 'Kata sandi baru sama dengan kata sandi saat ini.');
      return;
    }

    setIsSavingPassword(true);
    try {
      const isValidCurrent = await dbService.verifyUserPassword(user, currentPassword);
      if (!isValidCurrent) {
        showToast('error', 'Kata Sandi Salah', 'Kata sandi saat ini tidak sesuai dengan data pada database.');
        setIsSavingPassword(false);
        return;
      }

      const ok = await dbService.setUserPassword(user.id, user.identifier, newPassword);
      if (!ok) {
        showToast('error', 'Gagal Memperbarui', 'Tidak dapat menyimpan kata sandi baru ke database Supabase.');
        setIsSavingPassword(false);
        return;
      }

      await dbService.logActivity(
        user.id,
        user.full_name,
        user.role,
        'CHANGE_PASSWORD',
        'auth',
        user.id,
        `Pengguna ${user.full_name} (${user.identifier}) mengganti kata sandi akun.`
      );

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('success', 'Kata Sandi Diperbarui', 'Kata sandi baru berhasil disimpan ke database Supabase.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengubah kata sandi.';
      showToast('error', 'Gagal Mengubah Kata Sandi', message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const joinedDate = new Date(user.created_at).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Summary Card */}
      <section className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5 min-w-0">
            <div className="relative shrink-0">
              {user.avatar_url && !avatarFailed ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  onError={() => setAvatarFailed(true)}
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xl font-bold">
                  {getInitials(user.full_name)}
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <RoleBadge role={user.role} />
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{user.identifier}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  {user.is_active ? 'Akun Aktif' : 'Nonaktif'}
                </span>
              </div>

              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                {user.full_name}
              </h1>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user.role === 'pembimbing_lapangan'
                  ? user.company_name || 'Mitra Industri SIMPKN'
                  : `${user.study_program} · ${user.faculty}`}
                <span aria-hidden="true"> · </span>
                <span className="tabular-nums">Terdaftar {joinedDate}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] text-xs font-semibold rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{isUploadingAvatar ? 'Mengunggah...' : 'Ganti Foto'}</span>
            </button>

            {user.avatar_url && (
              <button
                type="button"
                disabled={isUploadingAvatar}
                onClick={handleRemoveAvatar}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                title="Hapus foto dan gunakan inisial"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            )}
          </div>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('identity')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'identity'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Data Profil</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'security'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Keamanan & Kata Sandi</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preferences')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'preferences'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              <span>Preferensi Tampilan</span>
            </button>
          </div>
        </div>
      </section>

      {/* Tab 1: Data Profil & Informasi Role */}
      {activeTab === 'identity' && (
        <form
          onSubmit={handleSaveIdentity}
          className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-6"
        >
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Informasi Akun & Identitas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Perbarui nama tampilan, kontak aktif, dan detail akademik atau instansi Anda. Perubahan tersimpan langsung ke database Supabase.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Read-only Login Identifier */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {getIdentifierLabel(user.role)}
              </label>
              <input
                type="text"
                value={user.identifier}
                readOnly
                disabled
                className="w-full px-3.5 py-2.5 text-xs font-mono tabular-nums bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Digunakan sebagai ID login utama. Hubungi Admin jika perlu koreksi nomor induk.
              </p>
            </div>

            {/* Read-only Role */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Peran Akses (Role)
              </label>
              <div className="w-full px-3.5 py-2.5 text-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <RoleBadge role={user.role} />
                <ShieldCheck className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Full Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Lengkap {user.role === 'dosen_pembimbing' ? '(beserta Gelar Akademik)' : ''}
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masukkan nama lengkap Anda"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-red-700"
                />
              </div>
            </div>

            {/* Email (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Alamat Email <span className="font-normal text-slate-400">(Opsional)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  maxLength={150}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@webmail.umm.ac.id"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-red-700"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nomor WhatsApp / Telepon
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="tel"
                  maxLength={30}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-red-700"
                />
              </div>
            </div>

            {/* Role-Specific Section */}
            {user.role === 'pembimbing_lapangan' ? (
              <>
                {companies.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Pilih dari Direktori Mitra Terdaftar
                    </label>
                    <select
                      value={companyId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        setCompanyId(selectedId);
                        const match = companies.find((c) => c.id === selectedId);
                        if (match) {
                          setCompanyName(match.name);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-red-700"
                    >
                      <option value="">-- Pilih atau isi manual di samping --</option>
                      {companies.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name} ({comp.city})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={companies.length > 0 ? '' : 'md:col-span-2'}>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Instansi / Perusahaan Mitra
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      maxLength={150}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="PT / Instansi Tempat Pembimbingan"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-red-700"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Fakultas
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      maxLength={100}
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                      placeholder="Fakultas Teknik"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-red-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Program Studi
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      maxLength={100}
                      value={studyProgram}
                      onChange={(e) => setStudyProgram(e.target.value)}
                      placeholder="Informatika"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-red-700"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Mahasiswa Academic Details */}
            {user.role === 'mahasiswa' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Semester Berjalan
                  </label>
                  <div className="relative">
                    <BookOpen className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={semester}
                      onChange={(e) => setSemester(Number(e.target.value))}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-red-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Indeks Prestasi Kumulatif (IPK)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={4}
                    step={0.01}
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-red-700"
                  />
                </div>
              </>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[40px] text-xs font-semibold rounded-xl bg-red-700 text-white hover:bg-red-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {isSavingProfile ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSavingProfile ? 'Menyimpan...' : 'Simpan Perubahan Profil'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Keamanan & Ubah Kata Sandi */}
      {activeTab === 'security' && (
        <form
          onSubmit={handleChangePassword}
          className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-6"
        >
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Ubah Kata Sandi Akun
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Verifikasi kata sandi saat ini untuk memperbarui kredensial login Anda di Supabase.
            </p>
          </div>

          <div className="max-w-lg space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Kata Sandi Saat Ini
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan kata sandi saat ini"
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-red-700"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Tampilkan atau sembunyikan kata sandi saat ini"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-red-700"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Tampilkan atau sembunyikan kata sandi baru"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Konfirmasi Kata Sandi Baru
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-red-700"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Tampilkan atau sembunyikan konfirmasi kata sandi"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSavingPassword}
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[40px] text-xs font-semibold rounded-xl bg-red-700 text-white hover:bg-red-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {isSavingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>{isSavingPassword ? 'Memperbarui...' : 'Perbarui Kata Sandi'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Preferensi Tampilan */}
      {activeTab === 'preferences' && (
        <section className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-5">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Preferensi Tampilan Antarmuka
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Sesuaikan tema warna aplikasi untuk kenyamanan aktivitas akademik Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left transition-colors flex items-start gap-3.5 ${
                theme === 'light'
                  ? 'border-red-700 bg-red-50/50 dark:bg-red-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-slate-700 flex items-center justify-center text-amber-600 shrink-0">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Mode Terang (Light)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Kontras tinggi dengan latar putih bersih untuk pembacaan dokumen di siang hari.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left transition-colors flex items-start gap-3.5 ${
                theme === 'dark'
                  ? 'border-red-700 bg-red-50/50 dark:bg-red-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-200 shrink-0">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Mode Gelap (Dark)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Mengurangi silau layar saat meninjau jurnal harian dan laporan pada malam hari.
                </p>
              </div>
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
