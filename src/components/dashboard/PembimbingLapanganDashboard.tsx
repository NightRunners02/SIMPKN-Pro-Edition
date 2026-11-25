import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/db';
import { PKNRegistration, DailyLog, Assessment } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import { Building2, Users, CalendarDays, CheckSquare, ArrowRight, CheckCircle2 } from 'lucide-react';

interface PembimbingLapanganDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const PembimbingLapanganDashboard: React.FC<PembimbingLapanganDashboardProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [students, setStudents] = useState<PKNRegistration[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  const loadData = async () => {
    if (!user) return;
    const [allRegs, allLogs, allAssess] = await Promise.all([
      dbService.getPKNRegistrations(),
      dbService.getDailyLogs(),
      dbService.getAssessments(),
    ]);

    // Students at this company or assigned to this field supervisor
    const myStudents = allRegs.filter(
      r => r.field_supervisor_id === user.id ||
      r.field_supervisor_name?.toLowerCase().includes(user.full_name.toLowerCase()) ||
      (user.company_name && r.company_name.toLowerCase().includes(user.company_name.toLowerCase()))
    );
    setStudents(myStudents);

    const studentIds = myStudents.map(s => s.student_id);
    setLogs(allLogs.filter(l => studentIds.includes(l.student_id)));
    setAssessments(allAssess.filter(a => a.evaluator_id === user.id || a.evaluator_role === 'pembimbing_lapangan'));
  };

  useEffect(() => {
    loadData();
    const unsubRegs = dbService.subscribe('pkn_registrations', loadData);
    const unsubLogs = dbService.subscribe('daily_logs', loadData);
    return () => {
      unsubRegs();
      unsubLogs();
    };
  }, [user]);

  const pendingReviewLogs = logs.filter(l => l.status === 'pending');

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
              <Building2 className="w-4 h-4" />
              <span>Pembimbing Lapangan Mitra Industri</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {user?.full_name}
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              NIP: {user?.identifier} · {user?.company_name || 'PT Telkom Indonesia (Persero) Tbk'}
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('assessments')}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-xs"
          >
            Form Penilaian Industri
          </button>
        </div>
      </div>

      {/* 2. Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Mahasiswa Magang</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
            {students.length}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Ditempatkan di unit kerja Anda</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Jurnal Harian Masuk</span>
            <CalendarDays className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-2">
            {pendingReviewLogs.length}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Perlu review & persetujuan</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Penilaian Dikirim</span>
            <CheckSquare className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {assessments.length}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Tersimpan di database SIMPKN</span>
        </div>
      </div>

      {/* 3. Mahasiswa Magang di Perusahaan */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">
          Daftar Mahasiswa Magang Binaan Anda
        </h3>

        {students.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            Belum ada mahasiswa yang ditugaskan ke instansi Anda saat ini.
          </p>
        ) : (
          <div className="space-y-4">
            {students.map((st) => (
              <div
                key={st.id}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {st.student_name}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      NIM {st.student_nim}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Divisi/Unit: <span className="font-medium text-slate-700 dark:text-slate-300">{st.notes || 'Full-stack Engineering'}</span> · Periode: {st.start_date} s/d {st.end_date}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigateTab('daily_logs')}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Periksa Jurnal
                  </button>
                  <button
                    onClick={() => onNavigateTab('assessments')}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Input Nilai Industri
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
