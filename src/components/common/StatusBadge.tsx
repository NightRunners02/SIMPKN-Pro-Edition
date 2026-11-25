import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let label = status;
  let colorClass = 'text-slate-600 dark:text-slate-400';

  switch (status.toLowerCase()) {
    case 'approved':
    case 'verified':
    case 'completed':
      label = status === 'verified' ? 'Terverifikasi' : status === 'completed' ? 'Selesai' : 'Disetujui';
      colorClass = 'text-emerald-700 dark:text-emerald-400 font-medium';
      break;
    case 'submitted':
      label = 'Diajukan';
      colorClass = 'text-blue-700 dark:text-blue-400 font-medium';
      break;
    case 'under_review':
    case 'reviewing':
      label = 'Sedang Ditinjau';
      colorClass = 'text-amber-700 dark:text-amber-400 font-medium';
      break;
    case 'revision_required':
      label = 'Perlu Revisi';
      colorClass = 'text-amber-700 dark:text-amber-400 font-medium';
      break;
    case 'rejected':
      label = 'Ditolak';
      colorClass = 'text-rose-700 dark:text-rose-400 font-medium';
      break;
    case 'pending':
      label = 'Menunggu';
      colorClass = 'text-amber-700 dark:text-amber-400 font-medium';
      break;
    case 'scheduled':
      label = 'Terjadwal';
      colorClass = 'text-indigo-700 dark:text-indigo-400 font-medium';
      break;
    case 'requested':
      label = 'Menunggu Jadwal';
      colorClass = 'text-slate-700 dark:text-slate-300 font-medium';
      break;
    case 'draft':
      label = 'Draf';
      colorClass = 'text-slate-500 dark:text-slate-400 font-medium';
      break;
    default:
      label = status;
  }

  return (
    <span className={`inline-flex items-center text-xs tracking-normal ${colorClass}`}>
      {label}
    </span>
  );
};
