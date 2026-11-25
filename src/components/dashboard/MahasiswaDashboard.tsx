import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/db';
import { PKNRegistration, DailyLog, GuidanceSession, PKNReport, Certificate, Announcement } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import {
  FileText,
  Building2,
  CalendarDays,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  BookOpen,
  UserCheck,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface MahasiswaDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const MahasiswaDashboard: React.FC<MahasiswaDashboardProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [activeReg, setActiveReg] = useState<PKNRegistration | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [guidances, setGuidances] = useState<GuidanceSession[]>([]);
  const [reports, setReports] = useState<PKNReport[]>([]);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    const [regs, allLogs, allGuidances, allReports, allCerts, allAnnounce] = await Promise.all([
      dbService.getPKNRegistrations(),
      dbService.getDailyLogs(user.id),
      dbService.getGuidanceSessions(user.id),
      dbService.getPKNReports(user.id),
      dbService.getCertificates(user.id),
      dbService.getAnnouncements(),
    ]);

    const myReg =
      regs.find(
        (r) => r.student_id === user.id || (r.group_members || []).some((m) => m.id === user.id)
      ) || null;
    setActiveReg(myReg);
    setLogs(allLogs);
    setGuidances(allGuidances);
    setReports(allReports);
    setCertificate(allCerts.find(c => c.student_id === user.id) || null);
    setAnnouncements(allAnnounce);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsubReg = dbService.subscribe('pkn_registrations', loadData);
    const unsubLogs = dbService.subscribe('daily_logs', loadData);
    const unsubReps = dbService.subscribe('pkn_reports', loadData);
    return () => {
      unsubReg();
      unsubLogs();
      unsubReps();
    };
  }, [user]);

  // Activity progress calculation
  const approvedLogsCount = logs.filter(l => l.status === 'approved').length;
  const pendingLogsCount = logs.filter(l => l.status === 'pending').length;
  const latestReport = reports[reports.length - 1] || null;

  // Stages for the Progress Tracker
  const stages = [
    { id: 1, name: 'Pendaftaran', isDone: Boolean(activeReg), current: activeReg && activeReg.status === 'submitted' },
    { id: 2, name: 'Verifikasi & Pembimbing', isDone: Boolean(activeReg && (activeReg.status === 'approved' || activeReg.status === 'completed')), current: activeReg?.status === 'under_review' },
    { id: 3, name: 'Jurnal & Bimbingan', isDone: approvedLogsCount >= 10, current: activeReg?.status === 'approved' && approvedLogsCount < 10 },
    { id: 4, name: 'Laporan Akhir', isDone: latestReport?.status === 'approved', current: latestReport && latestReport.status !== 'approved' },
    { id: 5, name: 'Penilaian & Selesai', isDone: Boolean(certificate), current: activeReg?.status === 'completed' && !certificate },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Profile Banner */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.full_name || 'Student')}`}
              alt={user?.full_name}
              className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {user?.full_name}
              </h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                <span>NIM {user?.identifier}</span>
                <span>·</span>
                <span>Prodi {user?.study_program}</span>
                <span>·</span>
                <span>Semester {user?.semester || 7}</span>
                <span>·</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">IPK {user?.gpa?.toFixed(2) || '3.75'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!activeReg ? (
              <button
                onClick={() => onNavigateTab('pkn_registration')}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs"
              >
                <span>Daftar PKN Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => onNavigateTab('daily_logs')}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs"
              >
                <span>Tulis Jurnal Harian</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Progress Tracker Workflow */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
          Tahapan Alur Pelaksanaan PKN
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {stages.map((stg) => (
            <div
              key={stg.id}
              className={`p-3 rounded-xl border transition-all ${
                stg.isDone
                  ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : stg.current
                  ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/50'
                  : 'border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/40 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-semibold text-slate-400">
                  Tahap 0{stg.id}
                </span>
                {stg.isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : stg.current ? (
                  <Clock className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100 animate-spin" />
                ) : null}
              </div>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                {stg.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status PKN Aktif */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Status Aktivitas PKN
            </span>
            {activeReg ? (
              <StatusBadge status={activeReg.status} />
            ) : (
              <span className="text-xs text-slate-400">Belum Mengajukan</span>
            )}
          </div>

          {activeReg ? (
            <div className="space-y-3 pt-1">
              <div>
                <span className="text-xs text-slate-400 block">Instansi / Perusahaan:</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block">
                  {activeReg.company_name}
                </span>
                <span className="text-xs text-slate-500 block truncate mt-0.5">
                  {activeReg.company_address}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Periode:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {activeReg.start_date} s/d {activeReg.end_date}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-slate-500">Anda belum memiliki pengajuan pendaftaran PKN aktif.</p>
              <button
                onClick={() => onNavigateTab('pkn_registration')}
                className="mt-3 text-xs font-semibold text-slate-900 dark:text-slate-100 underline"
              >
                Isi Formulir PKN &rarr;
              </button>
            </div>
          )}
        </div>

        {/* Dosen & Pembimbing Card */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Pembimbing Ditugaskan
          </span>
          <div className="space-y-3">
            <div>
              <span className="text-[11px] text-slate-400 block">Dosen Pembimbing Akademik:</span>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                {activeReg?.lecturer_name || 'Menunggu penugasan admin'}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block">Pembimbing Lapangan (Instansi):</span>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                {activeReg?.field_supervisor_name || 'Menunggu verifikasi instansi'}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Sesi Bimbingan:</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {guidances.length} pertemuan
              </span>
            </div>
          </div>
        </div>

        {/* Statistik Jurnal & Nilai */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Aktivitas Jurnal & Nilai
          </span>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
                {approvedLogsCount}
              </span>
              <span className="text-[11px] text-slate-500 block">Jurnal Disetujui</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 block">
                {pendingLogsCount}
              </span>
              <span className="text-[11px] text-slate-500 block">Menunggu Review</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Sertifikat PKN:</span>
            {certificate ? (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Tersedia (Grade {certificate.final_grade})</span>
            ) : (
              <span className="text-slate-500">Belum terbit</span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Recent Daily Logs & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Daily Logs */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Jurnal Kegiatan Harian Terbaru
            </h3>
            <button
              onClick={() => onNavigateTab('daily_logs')}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {logs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">
              Belum ada jurnal harian. Mulai catat kegiatan Anda setiap hari.
            </p>
          ) : (
            <div className="space-y-3">
              {logs.slice(0, 3).map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {log.date} · {log.start_time} - {log.end_time} WIB
                      </span>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                        {log.title}
                      </h4>
                    </div>
                    <StatusBadge status={log.status} />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {log.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements Preview */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Pengumuman Prodi
            </h3>
            <button
              onClick={() => onNavigateTab('announcements')}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Arsip
            </button>
          </div>

          <div className="space-y-3">
            {announcements.slice(0, 2).map((ann) => (
              <div key={ann.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block mb-1">
                  {new Date(ann.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                  {ann.title}
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                  {ann.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
