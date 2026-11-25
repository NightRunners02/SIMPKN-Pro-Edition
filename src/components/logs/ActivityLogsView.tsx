import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/db';
import { ActivityLog } from '../../types/database';
import { Pagination } from '../common/Pagination';
import {
  History,
  Search,
  Filter,
  ShieldAlert,
  Clock,
  UserCheck
} from 'lucide-react';

export const ActivityLogsView: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const loadLogs = async () => {
    const list = await dbService.getActivityLogs();
    setLogs(list);
  };

  useEffect(() => {
    loadLogs();
    const unsub = dbService.subscribe('activity_logs', loadLogs);
    return () => unsub();
  }, []);

  const filtered = logs.filter(l => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        l.user_name?.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.role?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pagedList = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Log Audit & Aktivitas Sistem (Activity Logs)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekam jejak setiap aksi login, pengajuan berkas, verifikasi pendaftaran, dan perubahan nilai
          </p>
        </div>

        <div className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          Total: <strong className="text-slate-900 dark:text-slate-100">{logs.length}</strong> Riwayat
        </div>
      </div>

      {/* Search */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari aksi, pengguna, atau deskripsi..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Waktu Operasi</th>
                <th className="py-3 px-4 font-semibold">Pengguna</th>
                <th className="py-3 px-4 font-semibold">Peran</th>
                <th className="py-3 px-4 font-semibold">Kode Tindakan</th>
                <th className="py-3 px-4 font-semibold">Deskripsi Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {pagedList.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-4 font-sans font-semibold text-slate-900 dark:text-slate-100">
                    {log.user_name}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-600 dark:text-slate-300">
                    {log.role}
                  </td>
                  <td className="py-3 px-4 text-purple-700 dark:text-purple-400 font-semibold text-[11px]">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-700 dark:text-slate-300">
                    {log.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
};
