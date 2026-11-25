import React, { useState } from 'react';
import { Modal } from './Modal';
import { Database, Copy, Check, ExternalLink, Download } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import schemaSql from '../../../supabase/schema.sql?raw';

interface SqlMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlMigrationModal: React.FC<SqlMigrationModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const { showToast } = useNotifications();

  const handleCopy = () => {
    navigator.clipboard.writeText(schemaSql);
    setCopied(true);
    showToast(
      'success',
      'Skrip SQL Disalin',
      'Tempel pada SQL Editor Supabase Anda. RLS, Index, Trigger, Storage, dan Realtime langsung aktif.'
    );
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([schemaSql], { type: 'application/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'simpkn_supabase_schema.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', 'File SQL Diunduh', 'Berkas simpkn_supabase_schema.sql berhasil disimpan.');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Skema Database Supabase PostgreSQL"
      subtitle="19 Tabel Relasional, Foreign Key, Index, Trigger, Storage Bucket, RLS & Realtime"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
          <Database className="w-5 h-5 text-red-700 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 leading-relaxed">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Proyek Supabase: <span className="font-mono text-slate-700 dark:text-slate-300">ravyjxtnrzvbcwpfumea</span>
            </p>
            <p>
              Skrip DDL idempoten ini mencakup migrasi kolom (<span className="font-mono">ALTER TABLE IF NOT EXISTS</span>), relasi antar tabel, <span className="font-mono">updated_at</span> trigger, bucket Supabase Storage, aktivasi Row Level Security langsung pada setiap tabel, serta replikasi Supabase Realtime per tabel.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Skrip Lengkap (Siap Dijalankan di SQL Editor)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://supabase.com/dashboard/project/ravyjxtnrzvbcwpfumea/sql"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span>Buka SQL Editor</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={handleDownloadSql}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh .sql</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin SQL'}</span>
            </button>
          </div>
        </div>

        <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-4 overflow-hidden">
          <pre className="font-mono text-[11px] leading-relaxed text-slate-300 max-h-80 overflow-y-auto whitespace-pre">
            {schemaSql}
          </pre>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
};
