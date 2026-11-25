import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { dbService } from '../../services/db';
import {
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  Lock,
  User,
  Eye,
  EyeOff,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Mail,
  Phone
} from 'lucide-react';

type AuthMode = 'login' | 'register' | 'reset';

export const LoginView: React.FC = () => {
  const { login, registerMahasiswa, resetPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useNotifications();

  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live Supabase Institutional Metadata
  const [academicPeriodLabel, setAcademicPeriodLabel] = useState('2024/2025 Genap');
  const [minSks, setMinSks] = useState(80);
  const [minGpa, setMinGpa] = useState(2.5);
  const [companyCount, setCompanyCount] = useState<number | null>(null);
  const [programCount, setProgramCount] = useState<number | null>(null);

  // Login Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register Mahasiswa Form State (Email is Optional)
  const [regNim, setRegNim] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regSemester, setRegSemester] = useState<number>(5);
  const [regGpa, setRegGpa] = useState<string>('3.50');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Reset Password Form State
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetVerification, setResetVerification] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    let active = true;
    const loadInstitutionalContext = async () => {
      try {
        const [settings, companies, programs] = await Promise.all([
          dbService.getSystemSettings(),
          dbService.getCompanies(),
          dbService.getMBKMPrograms(),
        ]);
        if (!active) return;
        setAcademicPeriodLabel(`${settings.current_academic_year} ${settings.current_semester}`);
        setMinSks(settings.pkn_min_sks);
        setMinGpa(Number(settings.pkn_min_gpa));
        setCompanyCount(companies.filter(c => c.is_active).length);
        setProgramCount(programs.filter(p => p.is_active).length);
      } catch {
        // retain defaults
      }
    };
    loadInstitutionalContext();
    return () => {
      active = false;
    };
  }, []);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setSuccessMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!identifier.trim()) {
      setError('Masukkan NIM, NIDN, NIP, atau Username Anda.');
      return;
    }
    if (!password) {
      setError('Kata sandi wajib diisi untuk verifikasi database.');
      return;
    }

    setLoading(true);
    const result = await login(identifier, password, rememberMe);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Gagal masuk sistem. Periksa nomor identitas dan kata sandi Anda.');
      showToast('error', 'Autentikasi Ditolak', result.error);
    } else {
      showToast('success', 'Autentikasi Berhasil', 'Selamat datang di SIMPKN Informatika UMM.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!regNim.trim() || !regFullName.trim()) {
      setError('NIM dan Nama Lengkap wajib diisi.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Kata sandi minimal harus 6 karakter.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    const res = await registerMahasiswa({
      nim: regNim,
      fullName: regFullName,
      email: regEmail,
      phone: regPhone,
      semester: Number(regSemester),
      gpa: parseFloat(regGpa) || 3.5,
      password: regPassword,
    });
    setLoading(false);

    if (res.success) {
      showToast(
        'success',
        'Registrasi Berhasil',
        'Akun mahasiswa aktif langsung dan kata sandi tersimpan di Supabase.'
      );
    } else {
      setError(res.error || 'Pendaftaran akun gagal.');
      showToast('error', 'Registrasi Gagal', res.error);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!resetIdentifier.trim() || !resetVerification.trim()) {
      setError('Masukkan nomor identitas dan nama lengkap / email / nomor HP terdaftar.');
      return;
    }
    if (resetNewPassword.length < 6) {
      setError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setLoading(true);
    const res = await resetPassword({
      identifier: resetIdentifier,
      verificationValue: resetVerification,
      newPassword: resetNewPassword,
    });
    setLoading(false);

    if (res.success) {
      setSuccessMsg('Kata sandi berhasil diperbarui di database Supabase. Silakan masuk menggunakan kata sandi baru.');
      showToast('success', 'Kata Sandi Diperbarui', 'Silakan masuk kembali dengan kata sandi baru Anda.');
      setIdentifier(resetIdentifier.trim());
      setPassword('');
      setResetNewPassword('');
      setResetConfirmPassword('');
      setMode('login');
    } else {
      setError(res.error || 'Gagal memperbarui kata sandi.');
      showToast('error', 'Reset Sandi Gagal', res.error);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
      {/* Left Institutional Showcase Panel */}
      <aside className="hidden lg:flex lg:col-span-7 relative flex-col justify-between bg-slate-950 text-white p-10 xl:p-14 overflow-hidden">
        {/* Background Campus Photography with Styled Fallback */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-slate-900 via-red-950/60 to-slate-950"
        />
        <img
          src="/src/assets/images/umm_campus_portal_1795429778695.jpg"
          alt="Gedung Fakultas Teknik Program Studi Informatika Universitas Muhammadiyah Malang"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-70"
        />
        {/* Measured Contrast Scrim */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/60"
        />

        {/* Top Institutional Lockup */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-700 text-white flex items-center justify-center shrink-0 shadow-md">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white leading-tight">
              Universitas Muhammadiyah Malang
            </p>
            <p className="text-xs text-slate-300 leading-tight mt-0.5">
              Fakultas Teknik · Program Studi Informatika
            </p>
          </div>
        </div>

        {/* Center Editorial Narrative */}
        <div className="relative z-10 max-w-2xl my-auto py-10 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-red-400">
              Portal Akademik Terpadu
            </p>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-[1.15] text-balance">
              Sistem Informasi Praktik Kerja Nyata & MBKM Informatika
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
              Platform manajemen akademik untuk pendaftaran PKN dan program Merdeka Belajar Kampus Merdeka, pencatatan log harian, bimbingan dosen, evaluasi industri, serta konversi 20 SKS secara terintegrasi.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/15">
            <div>
              <p className="text-xs font-semibold text-white">01. Pengajuan & Mitra</p>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Verifikasi pendaftaran PKN, instansi mitra industri, dan penugasan pembimbing.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-white">02. Log & Bimbingan</p>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Pencatatan aktivitas harian, konsultasi dosen, dan revisi naskah laporan.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-white">03. Nilai & Konversi</p>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Penilaian terpadu 50/50 dosen-industri, sertifikat digital, dan ekuivalensi SKS.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Live Institutional Summary */}
        <div className="relative z-10 pt-5 border-t border-white/15 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 tabular-nums">
          <span className="font-semibold text-white">T.A. {academicPeriodLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{companyCount !== null ? `${companyCount} Mitra Industri` : 'Direktori Mitra Aktif'}</span>
          <span aria-hidden="true">·</span>
          <span>{programCount !== null ? `${programCount} Program MBKM` : 'Program MBKM Terdaftar'}</span>
          <span aria-hidden="true">·</span>
          <span>Syarat PKN Min. {minSks} SKS (IPK {minGpa.toFixed(2)})</span>
        </div>
      </aside>

      {/* Right Authentication Workspace */}
      <main className="lg:col-span-5 flex flex-col justify-between px-6 py-6 sm:px-10 xl:px-14 bg-white dark:bg-slate-950">
        {/* Top Utility Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex lg:hidden items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-700 text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block leading-tight">
                SIMPKN Informatika
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                Universitas Muhammadiyah Malang
              </span>
            </div>
          </div>

          <div className="hidden lg:block text-xs text-slate-500 dark:text-slate-400 font-medium">
            SIMPKN Informatika UMM
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-700"
            title={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
            aria-label={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Center Form Section */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-8">
          {mode !== 'reset' ? (
            <div className="grid grid-cols-2 gap-1 p-1 mb-7 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Masuk Portal
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Daftar Mahasiswa
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-400 mb-6 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke halaman masuk</span>
            </button>
          )}

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {mode === 'login' && 'Masuk ke Akun Anda'}
              {mode === 'register' && 'Registrasi Mahasiswa Baru'}
              {mode === 'reset' && 'Atur Ulang Kata Sandi'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {mode === 'login' && 'Autentikasi menggunakan nomor identitas akademik beserta kata sandi yang tersimpan di database Supabase.'}
              {mode === 'register' && 'Buat akun mahasiswa menggunakan NIM. Alamat email bersifat opsional dan akun langsung aktif tanpa verifikasi email.'}
              {mode === 'reset' && 'Verifikasi data akun Anda untuk memperbarui kata sandi secara langsung di database.'}
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5 leading-relaxed"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE 1: LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Nomor Identitas (NIM / NIDN / NIP / Username)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Contoh: 202110370311001"
                    autoComplete="username"
                    required
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-700 focus:border-red-700 text-slate-900 dark:text-slate-100 font-mono placeholder:font-sans"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetIdentifier(identifier);
                      switchMode('reset');
                    }}
                    className="text-xs font-medium text-red-700 dark:text-red-400 hover:underline whitespace-nowrap shrink-0"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi akun..."
                    autoComplete="current-password"
                    required
                    className="w-full min-h-[44px] pl-10 pr-11 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-700 focus:border-red-700 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-sm border-slate-300 dark:border-slate-700 text-red-700 focus:ring-red-700"
                  />
                  <span>Ingat sesi di perangkat ini</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] mt-2 py-2.5 px-4 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 whitespace-nowrap"
              >
                <span>{loading ? 'Memverifikasi ke Supabase...' : 'Masuk ke Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-5 mt-5 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Identitas Akses Sesuai Peran
                </p>
                <p>
                  Mahasiswa menggunakan NIM · Dosen Pembimbing menggunakan NIDN · Pembimbing Lapangan &amp; Koordinator menggunakan NIP.
                </p>
              </div>
            </form>
          )}

          {/* MODE 2: REGISTER MAHASISWA FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label
                  htmlFor="reg-nim"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Nomor Induk Mahasiswa (NIM) *
                </label>
                <input
                  id="reg-nim"
                  type="text"
                  value={regNim}
                  onChange={(e) => setRegNim(e.target.value)}
                  placeholder="Contoh: 202210370311250"
                  required
                  className="w-full min-h-[42px] px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-700 text-slate-900 dark:text-slate-100 font-mono placeholder:font-sans"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-fullname"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Nama Lengkap Mahasiswa *
                </label>
                <input
                  id="reg-fullname"
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="Sesuai Kartu Rencana Studi (KRS)"
                  required
                  className="w-full min-h-[42px] px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Email <span className="font-normal text-slate-400">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="reg-email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="nama@webmail.umm.ac.id"
                      className="w-full min-h-[42px] pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="reg-phone"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    No. WhatsApp <span className="font-normal text-slate-400">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="reg-phone"
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="0812xxxxxxxx"
                      className="w-full min-h-[42px] pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-700 text-slate-900 dark:text-slate-100 font-mono placeholder:font-sans"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-semester"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Semester Berjalan
                  </label>
                  <select
                    id="reg-semester"
                    value={regSemester}
                    onChange={(e) => setRegSemester(Number(e.target.value))}
                    className="w-full min-h-[42px] px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value={5}>Semester 5</option>
                    <option value={6}>Semester 6</option>
                    <option value={7}>Semester 7</option>
                    <option value={8}>Semester 8</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="reg-gpa"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    IPK Terakhir
                  </label>
                  <input
                    id="reg-gpa"
                    type="number"
                    step="0.01"
                    min="2.00"
                    max="4.00"
                    value={regGpa}
                    onChange={(e) => setRegGpa(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-700 text-slate-900 dark:text-slate-100 font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Kata Sandi *
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min. 6 karakter"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full min-h-[42px] pl-3.5 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-700 text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      aria-label={showRegPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="reg-confirm-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Ulangi Sandi *
                  </label>
                  <input
                    id="reg-confirm-password"
                    type={showRegPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang sandi"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full min-h-[42px] px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] mt-1 py-2.5 px-4 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 whitespace-nowrap"
              >
                <span>{loading ? 'Menyimpan ke Supabase...' : 'Daftar & Masuk Sekarang'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* MODE 3: FORGOT / RESET PASSWORD FORM */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="reset-identifier"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Nomor Identitas Akun (NIM / NIDN / NIP) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="reset-identifier"
                    type="text"
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    placeholder="Masukkan NIM / NIDN / NIP Anda"
                    required
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-700 text-slate-900 dark:text-slate-100 font-mono placeholder:font-sans"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reset-verification"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Verifikasi Pemilik Akun *
                </label>
                <input
                  id="reset-verification"
                  type="text"
                  value={resetVerification}
                  onChange={(e) => setResetVerification(e.target.value)}
                  placeholder="Nama lengkap terdaftar, email, atau nomor WhatsApp"
                  required
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="reset-new-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Kata Sandi Baru *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="reset-new-password"
                    type={showResetPassword ? 'text' : 'password'}
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full min-h-[44px] pl-10 pr-11 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-700 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    aria-label={showResetPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reset-confirm-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Konfirmasi Kata Sandi Baru *
                </label>
                <input
                  id="reset-confirm-password"
                  type={showResetPassword ? 'text' : 'password'}
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi baru"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] mt-1 py-2.5 px-4 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 whitespace-nowrap"
              >
                <span>{loading ? 'Memperbarui Database...' : 'Simpan Kata Sandi Baru'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Quiet Institutional Footer */}
        <footer className="pt-4 border-t border-slate-100 dark:border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span>&copy; {new Date().getFullYear()} Program Studi Informatika UMM</span>
          <span>Kampus III · Jl. Raya Tlogomas No. 246 Malang</span>
        </footer>
      </main>
    </div>
  );
};
