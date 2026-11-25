import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/db';
import { PKNRegistration, DailyLog, GuidanceSession, PKNReport, Assessment } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import {
  Users,
  CalendarDays,
  BookOpen,
  CheckSquare,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface DosenDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const DosenDashboard: React.FC<DosenDashboardProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [students, setStudents] = useState<PKNRegistration[]>([]);
  const [pendingLogs, setPendingLogs] = useState<DailyLog[]>([]);
  const [upcomingGuidance, setUpcomingGuidance] = useState<GuidanceSession[]>([]);
  const [reports, setReports] = useState<PKNReport[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  const loadData = async () => {
    if (!user) return;
    const [allRegs, allLogs, allGuidance, allReports, allAssess] = await Promise.all([
      dbService.getPKNRegistrations(),
      dbService.getDailyLogs(),
      dbService.getGuidanceSessions(),
      dbService.getPKNReports(),
      dbService.getAssessments(),
    ]);

    // Assigned students
    const myStudents = allRegs.filter(r => r.lecturer_id === user.id || r.lecturer_name?.includes(user.full_name.split(' ')[0]));
    setStudents(myStudents);

    // Logs for my students that are pending
    const studentIds = myStudents.map(s => s.student_id);
    const myPendingLogs = allLogs.filter(l => studentIds.includes(l.student_id) && l.status === 'pending');
    setPendingLogs(myPendingLogs);

    // Guidance for this lecturer
    const myGuidances = allGuidance.filter(g => g.lecturer_id === user.id || studentIds.includes(g.student_id));
    setUpcomingGuidance(myGuidances.filter(g => g.status === 'requested' || g.status === 'scheduled'));

    // Reports
    setReports(allReports.filter(r => studentIds.includes(r.student_id) && r.status === 'submitted' || r.status === 'reviewing'));

    setAssessments(allAssess.filter(a => a.evaluator_id === user.id));
  };

  useEffect(() => {
    loadData();
    const unsubLogs = dbService.subscribe('daily_logs', loadData);
    const unsubGuidance = dbService.subscribe('guidance_sessions', loadData);
    const unsubReports = dbService.subscribe('pkn_reports', loadData);
    return () => {
      unsubLogs();
      unsubGuidance();
      unsubReports();
    };
  }, [user]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">
              Portal Akademik Dosen Pembimbing
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Selamat Datang, {user?.full_name}
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              NIDN: {user?.identifier} · Program Studi Informatika UMM
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('daily_logs')}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-xs"
            >
              Periksa Jurnal ({pendingLogs.length})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Mahasiswa Bimbingan</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
            {students.length}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Aktif semester ini</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Jurnal Perlu Review</span>
            <CalendarDays className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-2">
            {pendingLogs.length}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Menunggu feedback</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Laporan PKN Masuk</span>
            <BookOpen className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-2">
            {reports.length}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Draf & revisi baru</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Sesi Bimbingan</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-2">
            {upcomingGuidance.length}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Permintaan konsultasi</span>
        </div>
      </div>

      {/* 3. Mahasiswa Bimbingan Table */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Daftar Mahasiswa Bimbingan PKN
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoring kemajuan pelaksanaan, jurnal, laporan, dan penilaian
            </p>
          </div>
        </div>

        {students.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">
            Belum ada mahasiswa yang ditugaskan kepada Anda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Mahasiswa</th>
                  <th className="py-3 px-4 font-semibold">Instansi PKN</th>
                  <th className="py-3 px-4 font-semibold">Pembimbing Lapangan</th>
                  <th className="py-3 px-4 font-semibold">Status PKN</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        {st.student_name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        NIM {st.student_nim} · IPK {st.student_gpa}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-800 dark:text-slate-200 block font-medium">
                        {st.company_name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {st.start_date} s/d {st.end_date}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {st.field_supervisor_name || 'Belum Ditentukan'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={st.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onNavigateTab('daily_logs')}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Jurnal
                        </button>
                        <button
                          onClick={() => onNavigateTab('assessments')}
                          className="px-2.5 py-1 text-[11px] font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          Beri Nilai
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Pending Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Jurnal Masuk */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Jurnal Masuk Menunggu Respon
            </h4>
            <button
              onClick={() => onNavigateTab('daily_logs')}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              Lihat Semua
            </button>
          </div>

          {pendingLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Semua jurnal mahasiswa telah diverifikasi.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>{log.date}</span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">Menunggu Review</span>
                  </div>
                  <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-1">
                    {log.title}
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {log.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Permintaan Bimbingan */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Permintaan Sesi Bimbingan
            </h4>
            <button
              onClick={() => onNavigateTab('guidance')}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              Kelola Jadwal
            </button>
          </div>

          {upcomingGuidance.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Tidak ada agenda bimbingan yang perlu dijadwalkan.
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingGuidance.slice(0, 3).map((g) => (
                <div key={g.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{g.student_name}</span>
                    <StatusBadge status={g.status} />
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-medium">
                    {g.topic}
                  </p>
                  <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                    Usulan tanggal: {g.requested_date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
