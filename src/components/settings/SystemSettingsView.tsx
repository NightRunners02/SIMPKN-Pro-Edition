import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { dbService } from '../../services/db';
import { SystemSettings } from '../../types/database';
import {
  DEFAULT_FAVICON_URL,
  applyDocumentFavicon,
  isValidFaviconUrl
} from '../../utils/favicon';
import {
  Database,
  Building2,
  GraduationCap,
  Scale,
  Save,
  Upload,
  Link2,
  RotateCcw,
  Globe,
  Loader2,
  Check
} from 'lucide-react';

interface SystemSettingsViewProps {
  onOpenSqlModal: () => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({ onOpenSqlModal }) => {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();
  const faviconFileRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<SystemSettings>({
    id: 'primary',
    app_name: 'SIMPKN - Sistem Informasi PKN & MBKM Informatika UMM',
    university_name: 'Universitas Muhammadiyah Malang',
    faculty_name: 'Fakultas Teknik',
    study_program: 'Program Studi Informatika (Terakreditasi Unggul)',
    current_academic_year: '2024/2025',
    current_semester: 'Genap',
    pkn_min_sks: 80,
    pkn_min_gpa: 2.50,
    dosen_weight: 50,
    field_supervisor_weight: 50,
    head_of_program_name: 'Ir. Galih Wasis Wicaksono, S.Kom., M.Cs.',
    head_of_program_nip: '10814100523PNS',
    contact_email: 'informatika@umm.ac.id',
    favicon_url: DEFAULT_FAVICON_URL,
  });

  const [faviconLinkInput, setFaviconLinkInput] = useState<string>('');
  const [faviconPreviewFailed, setFaviconPreviewFailed] = useState<boolean>(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const isSuperAdmin = role === 'super_admin';

  useEffect(() => {
    const fetchSettings = async () => {
      const data = await dbService.getSystemSettings();
      const resolvedFavicon = data.favicon_url || DEFAULT_FAVICON_URL;
      setSettings({ ...data, favicon_url: resolvedFavicon });
      setFaviconLinkInput(resolvedFavicon === DEFAULT_FAVICON_URL ? '' : resolvedFavicon);
      setFaviconPreviewFailed(false);
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const activeFaviconUrl = settings.favicon_url || DEFAULT_FAVICON_URL;

  const persistFaviconUrl = async (nextUrl: string, successTitle: string, successDesc: string) => {
    if (!isSuperAdmin) {
      showToast('error', 'Akses Terbatas', 'Hanya Super Admin yang dapat mengubah favicon situs.');
      return;
    }

    const updated = await dbService.updateSystemSettings({
      ...settings,
      favicon_url: nextUrl,
    });

    setSettings(updated);
    setFaviconPreviewFailed(false);
    applyDocumentFavicon(nextUrl, updated.app_name);

    if (user) {
      await dbService.logActivity(
        user.id,
        user.full_name,
        user.role,
        'UPDATE_FAVICON',
        'system_settings',
        'primary',
        `Super Admin memperbarui favicon situs SIMPKN`
      );
    }

    showToast('success', successTitle, successDesc);
  };

  const handleFaviconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.svg', '.png', '.ico', '.jpg', '.jpeg', '.webp'];
    const lowerName = file.name.toLowerCase();
    const isAllowedExt = allowedExtensions.some((ext) => lowerName.endsWith(ext));
    const isAllowedMime =
      file.type.startsWith('image/') || file.type === 'image/x-icon' || file.type === 'image/vnd.microsoft.icon';

    if (!isAllowedExt && !isAllowedMime) {
      showToast(
        'error',
        'Format File Tidak Didukung',
        'Pilih ikon berformat SVG, PNG, ICO, JPG, atau WEBP dari perangkat Anda.'
      );
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Ukuran Terlalu Besar', 'Ukuran maksimal file favicon adalah 2 MB.');
      e.target.value = '';
      return;
    }

    setIsUploadingFavicon(true);
    try {
      const ext = lowerName.split('.').pop() || 'png';
      const storagePath = `branding/favicon-${Date.now()}.${ext}`;
      const uploadedUrl = await dbService.uploadFile('pkn-activities', storagePath, file);

      setFaviconLinkInput(uploadedUrl.startsWith('data:') ? '' : uploadedUrl);
      await persistFaviconUrl(
        uploadedUrl,
        'Favicon Diperbarui',
        `Ikon "${file.name}" berhasil diunggah dan diterapkan ke tab browser.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah file favicon.';
      showToast('error', 'Gagal Unggah Favicon', msg);
    } finally {
      setIsUploadingFavicon(false);
      e.target.value = '';
    }
  };

  const handleApplyFaviconLink = async () => {
    const trimmed = faviconLinkInput.trim();
    if (!trimmed) {
      showToast('error', 'Link URL Kosong', 'Masukkan tautan URL gambar atau ikon yang valid.');
      return;
    }

    if (!isValidFaviconUrl(trimmed)) {
      showToast(
        'error',
        'URL Tidak Valid',
        'Gunakan URL lengkap (https://...) atau path relatif yang diawali tanda /.'
      );
      return;
    }

    setIsUploadingFavicon(true);
    try {
      await persistFaviconUrl(
        trimmed,
        'Favicon URL Diterapkan',
        'Favicon dari tautan URL berhasil disimpan dan aktif di tab browser.'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menerapkan tautan favicon.';
      showToast('error', 'Gagal Menyimpan Favicon', msg);
    } finally {
      setIsUploadingFavicon(false);
    }
  };

  const handleResetFavicon = async () => {
    setIsUploadingFavicon(true);
    try {
      setFaviconLinkInput('');
      await persistFaviconUrl(
        DEFAULT_FAVICON_URL,
        'Favicon Dikembalikan',
        'Ikon tab browser dikembalikan ke ikon bawaan SIMPKN.'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mereset favicon.';
      showToast('error', 'Gagal Reset Favicon', msg);
    } finally {
      setIsUploadingFavicon(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'super_admin' && role !== 'admin_pkn') {
      showToast('error', 'Akses Ditolak', 'Hanya Super Admin atau Admin PKN yang berwenang mengubah konfigurasi.');
      return;
    }

    setIsSavingSettings(true);
    try {
      const updated = await dbService.updateSystemSettings(settings);
      setSettings(updated);
      applyDocumentFavicon(updated.favicon_url, updated.app_name);

      if (user) {
        await dbService.logActivity(
          user.id,
          user.full_name,
          user.role,
          'UPDATE_SYSTEM_SETTINGS',
          'system_settings',
          'primary',
          'Memperbarui konfigurasi parameter akademik sistem SIMPKN'
        );
      }
      showToast('success', 'Pengaturan Disimpan', 'Konfigurasi sistem SIMPKN berhasil diperbarui di database.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan pengaturan sistem.';
      showToast('error', 'Gagal Menyimpan', msg);
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Pengaturan Sistem & Konfigurasi Akademik
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi parameter akademik, identitas favicon situs, bobot evaluasi, dan skema Supabase
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenSqlModal}
          className="px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-2 shadow-xs shrink-0 whitespace-nowrap"
        >
          <Database className="w-4 h-4" />
          <span>Supabase SQL Script</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 0: Favicon & Identitas Tab Browser (Super Admin) */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Globe className="w-5 h-5 text-red-700 dark:text-red-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Favicon & Ikon Tab Browser
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Unggah file ikon langsung dari laptop atau gunakan tautan URL gambar eksternal (khusus Super Admin)
                </p>
              </div>
            </div>

            {activeFaviconUrl !== DEFAULT_FAVICON_URL && isSuperAdmin && (
              <button
                type="button"
                disabled={isUploadingFavicon}
                onClick={handleResetFavicon}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Ikon Bawaan</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Live Preview Box */}
            <div className="lg:col-span-5 space-y-3">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pratinjau Ikon & Tab Browser
              </span>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                {/* Mock Browser Tab Strip */}
                <div className="bg-slate-200/80 dark:bg-slate-900 rounded-lg p-1.5 pb-0 border border-slate-300/70 dark:border-slate-700">
                  <div className="inline-flex items-center gap-2 max-w-full bg-white dark:bg-slate-800 px-3 py-1.5 rounded-t-md border border-b-0 border-slate-200 dark:border-slate-700">
                    {!faviconPreviewFailed ? (
                      <img
                        src={activeFaviconUrl}
                        alt="Pratinjau favicon tab browser"
                        onError={() => setFaviconPreviewFailed(true)}
                        className="w-4 h-4 rounded-xs object-contain shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <img
                        src={DEFAULT_FAVICON_URL}
                        alt="Ikon bawaan SIMPKN"
                        className="w-4 h-4 rounded-xs object-contain shrink-0"
                      />
                    )}
                    <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                      {settings.app_name || 'SIMPKN Informatika'}
                    </span>
                  </div>
                </div>

                {/* High-Res Preview Card */}
                <div className="flex items-center gap-3.5 pt-1">
                  <div className="w-14 h-14 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 shrink-0">
                    {!faviconPreviewFailed ? (
                      <img
                        src={activeFaviconUrl}
                        alt="Ikon aplikasi SIMPKN"
                        onError={() => setFaviconPreviewFailed(true)}
                        className="w-10 h-10 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <img
                        src={DEFAULT_FAVICON_URL}
                        alt="Ikon bawaan SIMPKN"
                        className="w-10 h-10 object-contain"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                      {activeFaviconUrl === DEFAULT_FAVICON_URL
                        ? 'Ikon Bawaan SIMPKN (SVG)'
                        : activeFaviconUrl.startsWith('data:')
                        ? 'Ikon Unggahan Lokal'
                        : 'Ikon Kustom Tersimpan'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block truncate max-w-[240px] mt-0.5">
                      {activeFaviconUrl.startsWith('data:')
                        ? 'Data URI Gambar Lokal'
                        : activeFaviconUrl}
                    </span>
                    {faviconPreviewFailed && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 block mt-0.5">
                        Pratinjau URL gagal dimuat; menampilkan ikon bawaan.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Super Admin Controls: Upload from Laptop + URL Input */}
            <div className="lg:col-span-7 space-y-4">
              {!isSuperAdmin ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  Pengaturan unggah atau penggantian URL favicon hanya tersedia untuk akun <strong>Super Admin</strong>.
                </div>
              ) : (
                <>
                  {/* Method 1: Upload File from Laptop */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      1. Pilih File Ikon dari Laptop
                    </label>
                    <input
                      ref={faviconFileRef}
                      type="file"
                      accept=".svg,.png,.ico,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/x-icon,image/jpeg,image/webp"
                      onChange={handleFaviconFileChange}
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={isUploadingFavicon || loading}
                        onClick={() => faviconFileRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] text-xs font-semibold rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                      >
                        {isUploadingFavicon ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        <span>{isUploadingFavicon ? 'Mengunggah...' : 'Pilih File dari Laptop'}</span>
                      </button>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Format: SVG, PNG, ICO, JPG, atau WEBP (maks. 2 MB)
                      </span>
                    </div>
                  </div>

                  {/* Method 2: Via Link URL */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      2. Atau Gunakan Link URL Favicon
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Link2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={faviconLinkInput}
                          onChange={(e) => setFaviconLinkInput(e.target.value)}
                          placeholder="https://domain.com/favicon.png atau /favicon.svg"
                          className="w-full min-h-[40px] pl-10 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-red-700"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isUploadingFavicon || loading}
                        onClick={handleApplyFaviconLink}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] text-xs font-semibold rounded-xl bg-red-700 text-white hover:bg-red-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Terapkan URL</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Section 1: Institutional Parameters */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <GraduationCap className="w-5 h-5 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Informasi Program Studi & Universitas
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Aplikasi
              </label>
              <input
                type="text"
                value={settings.app_name}
                onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Universitas
              </label>
              <input
                type="text"
                value={settings.university_name}
                onChange={(e) => setSettings({ ...settings, university_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fakultas
              </label>
              <input
                type="text"
                value={settings.faculty_name}
                onChange={(e) => setSettings({ ...settings, faculty_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Program Studi
              </label>
              <input
                type="text"
                value={settings.study_program}
                onChange={(e) => setSettings({ ...settings, study_program: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Academic Year & Requirements */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Scale className="w-5 h-5 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Syarat Pendaftaran PKN & Periode Berjalan
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tahun Akademik
              </label>
              <input
                type="text"
                value={settings.current_academic_year}
                onChange={(e) => setSettings({ ...settings, current_academic_year: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Semester
              </label>
              <select
                value={settings.current_semester}
                onChange={(e) =>
                  setSettings({ ...settings, current_semester: e.target.value as 'Ganjil' | 'Genap' })
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Minimal SKS Lulus
              </label>
              <input
                type="number"
                value={settings.pkn_min_sks}
                onChange={(e) => setSettings({ ...settings, pkn_min_sks: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Minimal IPK
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.pkn_min_gpa}
                onChange={(e) => setSettings({ ...settings, pkn_min_gpa: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Assessment Weights & Signer */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Building2 className="w-5 h-5 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Pembagian Bobot Penilaian & Pengesahan Sertifikat
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bobot Nilai Dosen Pembimbing (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.dosen_weight}
                onChange={(e) => setSettings({ ...settings, dosen_weight: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bobot Nilai Pembimbing Lapangan Industri (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.field_supervisor_weight}
                onChange={(e) =>
                  setSettings({ ...settings, field_supervisor_weight: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Ketua Program Studi (Penandatangan Sertifikat)
              </label>
              <input
                type="text"
                value={settings.head_of_program_name}
                onChange={(e) => setSettings({ ...settings, head_of_program_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                NIP / NIDN Kaprodi
              </label>
              <input
                type="text"
                value={settings.head_of_program_nip}
                onChange={(e) => setSettings({ ...settings, head_of_program_nip: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSavingSettings || loading}
            className="px-6 py-2.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50 whitespace-nowrap"
          >
            {isSavingSettings ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSavingSettings ? 'Menyimpan...' : 'Simpan Perubahan Pengaturan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
