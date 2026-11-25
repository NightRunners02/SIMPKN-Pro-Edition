import React, { useEffect, useState } from 'react';
import { dbService } from '../../services/db';
import { PKNRegistration, MBKMRegistration, Company, UserProfile, DailyLog, PKNReport } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import {
  Users,
  Building2,
  FileCheck2,
  Sparkles,
  CalendarDays,
  BookOpen,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab }) => {
  const [pknRegs, setPknRegs] = useState<PKNRegistration[]>([]);
  const [mbkmRegs, setMbkmRegs] = useState<MBKMRegistration[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [reports, setReports] = useState<PKNReport[]>([]);

  const loadData = async () => {
    const [regs, mbkm, comps, users, allLogs, allReports] = await Promise.all([
      dbService.getPKNRegistrations(),
      dbService.getMBKMRegistrations(),
      dbService.getCompanies(),
      dbService.getProfiles(),
      dbService.getDailyLogs(),
      dbService.getPKNReports(),
    ]);

    setPknRegs(regs);
    setMbkmRegs(mbkm);
    setCompanies(comps);
    setProfiles(users);
    setLogs(allLogs);
    setReports(allReports);
  };

  useEffect(() => {
    loadData();
    const unsubRegs = dbService.subscribe('pkn_registrations', loadData);
    const unsubMbkm = dbService.subscribe('mbkm_registrations', loadData);
    const unsubComps = dbService.subscribe('companies', loadData);
    return () => {
      unsubRegs();
      unsubMbkm();
      unsubComps();
    };
  }, []);

  const pendingPknCount = pknRegs.filter(r => r.status === 'submitted' || r.status === 'under_review').length;
  const approvedPknCount = pknRegs.filter(r => r.status === 'approved' || r.status === 'completed').length;
  const dosenCount = profiles.filter(p => p.role === 'dosen_pembimbing').length;
  const pendingLogsCount = logs.filter(l => l.status === 'pending').length;
  const pendingReportsCount = reports.filter(r => r.status === 'submitted' || r.status === 'reviewing').length;

  return (
    <div className="space-y-6">
      {/* 1. Metric Stat Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Mahasiswa PKN</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
            {pknRegs.length}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{approvedPknCount} Disetujui</span>
            <span>·</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">{pendingPknCount} Pending</span>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Peserta MBKM</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-700 dark:text-purple-400 mt-2">
            {mbkmRegs.length}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">MSIB & Studi Independen</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Mitra & Instansi</span>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
            {companies.length}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            {companies.filter(c => c.is_recommended).length} Rekomendasi Unggulan
          </span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Dosen Pembimbing</span>
            <FileCheck2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
            {dosenCount}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Aktif membimbing semester ini</span>
        </div>
      </div>

      {/* 2. Visual Distribution Chart & Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Statistik Pelaksanaan PKN & MBKM 2024/2025
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sebaran mahasiswa berdasarkan status alur kerja
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-slate-400">
              Periode Genap
            </span>
          </div>

          {/* Clean Metric Bars */}
          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-slate-700 dark:text-slate-300">Pendaftaran Selesai & Disetujui</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{approvedPknCount} ({pknRegs.length ? Math.round((approvedPknCount / pknRegs.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${pknRegs.length ? (approvedPknCount / pknRegs.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-slate-700 dark:text-slate-300">Verifikasi Berkas Masuk</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{pendingPknCount}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${pknRegs.length ? (pendingPknCount / pknRegs.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-slate-700 dark:text-slate-300">Jurnal Menunggu Review</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{pendingLogsCount} log</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{ width: `${logs.length ? (pendingLogsCount / logs.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Box */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Aksi Cepat Koordinator
          </h4>

          <div className="space-y-2">
            <button
              onClick={() => onNavigateTab('pkn_registration')}
              className="w-full p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40 text-left transition-colors flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                  Verifikasi Berkas PKN
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {pendingPknCount} pengajuan menunggu
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => onNavigateTab('course_conversions')}
              className="w-full p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40 text-left transition-colors flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                  Konversi SKS MBKM
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Review ekuivalensi mata kuliah
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => onNavigateTab('reports_export')}
              className="w-full p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40 text-left transition-colors flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                  Ekspor Laporan & PDF
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Rekap nilai & yudisium PKN
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Pendaftaran PKN Terbaru Menunggu Verifikasi */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Pengajuan Pendaftaran PKN Terbaru
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verifikasi kelayakan berkas, instansi, dan penugasan dosen pembimbing
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('pkn_registration')}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
          >
            <span>Semua Data</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Mahasiswa</th>
                <th className="py-3 px-4 font-semibold">Instansi</th>
                <th className="py-3 px-4 font-semibold">Periode PKN</th>
                <th className="py-3 px-4 font-semibold">Dosen Pembimbing</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pknRegs.slice(0, 5).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                      {r.student_name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      NIM {r.student_nim} · IPK {r.student_gpa}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {r.company_name}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {r.start_date} s/d {r.end_date}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {r.lecturer_name || <span className="text-amber-600 dark:text-amber-400 font-medium">Belum Ditugaskan</span>}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onNavigateTab('pkn_registration')}
                      className="px-3 py-1.5 text-[11px] font-medium text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      Kelola
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
