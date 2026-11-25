import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { dbService } from '../../services/db';
import { SystemSettings } from '../../types/database';
import {
  Settings,
  Database,
  Building2,
  GraduationCap,
  Scale,
  Save,
  CheckCircle2,
  Terminal,
  ExternalLink,
  Sun,
  Moon
} from 'lucide-react';

interface SystemSettingsViewProps {
  onOpenSqlModal: () => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({ onOpenSqlModal }) => {
  const { user, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useNotifications();

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
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const data = await dbService.getSystemSettings();
      setSettings(data);
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'super_admin' && role !== 'admin_pkn') {
      showToast('error', 'Akses Ditolak', 'Hanya Super Admin atau Admin PKN yang berwenang mengubah konfigurasi.');
      return;
    }

    const updated = await dbService.updateSystemSettings(settings);
    setSettings(updated);
    if (user) {
      dbService.logActivity(user.id, user.full_name, user.role, 'UPDATE_SYSTEM_SETTINGS', 'system_settings', 'primary', 'Memperbarui konfigurasi parameter akademik sistem SIMPKN');
    }
    showToast('success', 'Pengaturan Disimpan', 'Konfigurasi sistem SIMPKN berhasil diperbarui di database.');
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
            Konfigurasi parameter akademik, bobot evaluasi, informasi institusi, dan database Supabase
          </p>
        </div>

        <button
          onClick={onOpenSqlModal}
          className="px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-2 shadow-xs shrink-0"
        >
          <Database className="w-4 h-4" />
          <span>Supabase SQL Script</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
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
                onChange={(e) => setSettings({ ...settings, current_semester: e.target.value as any })}
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
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
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
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
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
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100"
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
                onChange={(e) => setSettings({ ...settings, field_supervisor_weight: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100"
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
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
};
