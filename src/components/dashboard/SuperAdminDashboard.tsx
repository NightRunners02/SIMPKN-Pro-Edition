import React, { useEffect, useState } from 'react';
import { dbService } from '../../services/db';
import { UserProfile, ActivityLog, PKNRegistration, Company } from '../../types/database';
import { RoleBadge } from '../common/RoleBadge';
import {
  ShieldAlert,
  Users,
  Database,
  History,
  Settings,
  Building2,
  FileCheck2,
  ArrowRight,
  Server,
  Lock,
  KeyRound
} from 'lucide-react';

interface SuperAdminDashboardProps {
  onNavigateTab: (tab: string) => void;
  onOpenSqlModal: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onNavigateTab, onOpenSqlModal }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [pknCount, setPknCount] = useState(0);
  const [compCount, setCompCount] = useState(0);

  const loadData = async () => {
    const [users, logs, regs, comps] = await Promise.all([
      dbService.getProfiles(),
      dbService.getActivityLogs(),
      dbService.getPKNRegistrations(),
      dbService.getCompanies(),
    ]);

    setProfiles(users);
    setActivityLogs(logs);
    setPknCount(regs.length);
    setCompCount(comps.length);
  };

  useEffect(() => {
    loadData();
    const unsub = dbService.subscribe('activity_logs', loadData);
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Header Global Super Admin */}
      <div className="p-6 bg-purple-900/10 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-700 text-white rounded-xl shadow-xs">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 block uppercase tracking-wider">
                Hak Akses Global Super Admin
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Pusat Kendali Sistem Informasi PKN & MBKM UMM
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSqlModal}
              className="px-3.5 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl hover:bg-purple-50 transition-colors flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              <span>Supabase DDL Migration</span>
            </button>
            <button
              onClick={() => onNavigateTab('system_settings')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span>Pengaturan Utama</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Global System Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Total Pengguna Terdaftar</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
            {profiles.length}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            {profiles.filter(p => p.role === 'mahasiswa').length} Mhs · {profiles.filter(p => p.role === 'dosen_pembimbing').length} Dosen
          </span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Pendaftaran PKN Aktif</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
            {pknCount}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Data relasional Supabase</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Instansi & Perusahaan</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
            {compCount}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Mitra kerjasama resmi</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Aktivitas Audit Logs</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
            {activityLogs.length}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Riwayat operasi tersimpan</span>
        </div>
      </div>

      {/* 3. User Roles Breakdown & Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Accounts Overview */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Distribusi Akun Pengguna
            </h3>
            <button
              onClick={() => onNavigateTab('admin_management')}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              Kelola Pengguna
            </button>
          </div>

          <div className="space-y-3">
            {[
              { role: 'mahasiswa', label: 'Mahasiswa Informatika' },
              { role: 'dosen_pembimbing', label: 'Dosen Pembimbing' },
              { role: 'pembimbing_lapangan', label: 'Pembimbing Lapangan' },
              { role: 'admin_pkn', label: 'Admin / Koordinator PKN' },
              { role: 'super_admin', label: 'Super Administrator' },
            ].map((item) => {
              const count = profiles.filter(p => p.role === item.role).length;
              return (
                <div key={item.role} className="flex items-center justify-between text-xs py-1.5">
                  <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{count} akun</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit Trails Stream */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Log Audit & Aktivitas Terkini
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('activity_logs')}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              Semua Log
            </button>
          </div>

          <div className="space-y-2.5">
            {activityLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {log.user_name}
                    </span>
                    <span className="text-[10px] font-mono text-purple-700 dark:text-purple-400 font-semibold">
                      [{log.action}]
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    {log.description}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
