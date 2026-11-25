import {
  LayoutDashboard,
  FileCheck2,
  Building2,
  CalendarDays,
  BookOpen,
  Award,
  Users,
  Settings,
  Bell,
  Compass,
  Layers,
  CheckSquare,
  History,
  FolderArchive,
  BarChart3,
  UserCog,
  LucideIcon
} from 'lucide-react';
import { UserRole } from '../types/database';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export function getNavigationGroups(role: UserRole | null): NavGroup[] {
  switch (role) {
    case 'super_admin':
      return [
        {
          title: 'Utama',
          items: [
            { id: 'dashboard', label: 'Dashboard Sistem', icon: LayoutDashboard },
            { id: 'admin_management', label: 'Manajemen Pengguna', icon: Users },
          ],
        },
        {
          title: 'Layanan PKN & MBKM',
          items: [
            { id: 'pkn_registration', label: 'Data PKN & Verifikasi', icon: FileCheck2 },
            { id: 'mbkm_programs', label: 'Program MBKM', icon: Compass },
            { id: 'companies', label: 'Direktori Mitra Instansi', icon: Building2 },
            { id: 'announcements', label: 'Pusat Pengumuman', icon: Bell },
          ],
        },
        {
          title: 'Sistem & Akun',
          items: [
            { id: 'reports_export', label: 'Laporan & Rekapitulasi', icon: BarChart3 },
            { id: 'activity_logs', label: 'Audit Trail Sistem', icon: History },
            { id: 'system_settings', label: 'Konfigurasi Sistem', icon: Settings },
            { id: 'profile_settings', label: 'Pengaturan Profil', icon: UserCog },
          ],
        },
      ];

    case 'admin_pkn':
      return [
        {
          title: 'Utama',
          items: [
            { id: 'dashboard', label: 'Dashboard Koordinator', icon: LayoutDashboard },
            { id: 'pkn_registration', label: 'Pendaftaran & Verifikasi', icon: FileCheck2 },
            { id: 'admin_management', label: 'Penugasan Pembimbing', icon: Users },
            { id: 'companies', label: 'Mitra & Instansi', icon: Building2 },
          ],
        },
        {
          title: 'Monitoring & Nilai',
          items: [
            { id: 'daily_logs', label: 'Monitoring Log Harian', icon: CalendarDays },
            { id: 'reports', label: 'Pemeriksaan Laporan', icon: BookOpen },
            { id: 'assessments', label: 'Rekapitulasi Nilai', icon: CheckSquare },
            { id: 'certificates', label: 'Sertifikat Kelulusan', icon: Award },
          ],
        },
        {
          title: 'MBKM & Akun',
          items: [
            { id: 'mbkm_programs', label: 'Program MBKM', icon: Compass },
            { id: 'course_conversions', label: 'Ekuivalensi 20 SKS', icon: Layers },
            { id: 'announcements', label: 'Pengumuman Resmi', icon: Bell },
            { id: 'reports_export', label: 'Laporan & Ekspor Data', icon: BarChart3 },
            { id: 'profile_settings', label: 'Pengaturan Profil', icon: UserCog },
          ],
        },
      ];

    case 'dosen_pembimbing':
      return [
        {
          title: 'Utama',
          items: [{ id: 'dashboard', label: 'Dashboard Pembimbing', icon: LayoutDashboard }],
        },
        {
          title: 'Bimbingan & Evaluasi',
          items: [
            { id: 'daily_logs', label: 'Verifikasi Jurnal Harian', icon: CalendarDays },
            { id: 'guidance', label: 'Konsultasi Bimbingan', icon: Users },
            { id: 'reports', label: 'Laporan Akhir & Revisi', icon: BookOpen },
            { id: 'assessments', label: 'Form Penilaian Dosen', icon: CheckSquare },
          ],
        },
        {
          title: 'Referensi & Akun',
          items: [
            { id: 'companies', label: 'Direktori Instansi', icon: Building2 },
            { id: 'announcements', label: 'Pengumuman Akademik', icon: Bell },
            { id: 'profile_settings', label: 'Pengaturan Profil', icon: UserCog },
          ],
        },
      ];

    case 'pembimbing_lapangan':
      return [
        {
          title: 'Utama',
          items: [{ id: 'dashboard', label: 'Dashboard Industri', icon: LayoutDashboard }],
        },
        {
          title: 'Monitoring Mahasiswa',
          items: [
            { id: 'daily_logs', label: 'Log Aktivitas Mahasiswa', icon: CalendarDays },
            { id: 'assessments', label: 'Evaluasi & Nilai Industri', icon: CheckSquare },
            { id: 'announcements', label: 'Pengumuman Mitra', icon: Bell },
          ],
        },
        {
          title: 'Akun',
          items: [{ id: 'profile_settings', label: 'Pengaturan Profil', icon: UserCog }],
        },
      ];

    case 'mahasiswa':
    default:
      return [
        {
          title: 'Utama',
          items: [
            { id: 'dashboard', label: 'Dashboard Akademik', icon: LayoutDashboard },
            { id: 'pkn_registration', label: 'Pendaftaran PKN', icon: FileCheck2 },
            { id: 'companies', label: 'Direktori Instansi', icon: Building2 },
          ],
        },
        {
          title: 'Pelaksanaan PKN',
          items: [
            { id: 'daily_logs', label: 'Jurnal Kegiatan Harian', icon: CalendarDays },
            { id: 'guidance', label: 'Bimbingan Dosen', icon: Users },
            { id: 'reports', label: 'Naskah Laporan PKN', icon: BookOpen },
            { id: 'assessments', label: 'Hasil & Rekap Nilai', icon: CheckSquare },
          ],
        },
        {
          title: 'MBKM, Dokumen & Akun',
          items: [
            { id: 'mbkm_programs', label: 'Katalog MBKM', icon: Compass },
            { id: 'course_conversions', label: 'Konversi 20 SKS', icon: Layers },
            { id: 'documents', label: 'Document Center', icon: FolderArchive },
            { id: 'certificates', label: 'Sertifikat Digital', icon: Award },
            { id: 'announcements', label: 'Pengumuman', icon: Bell },
            { id: 'profile_settings', label: 'Pengaturan Profil', icon: UserCog },
          ],
        },
      ];
  }
}

export function getFlatNavItems(role: UserRole | null): NavItem[] {
  return getNavigationGroups(role).flatMap((g) => g.items);
}
