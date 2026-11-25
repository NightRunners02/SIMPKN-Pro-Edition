import React from 'react';
import { UserRole } from '../../types/database';

interface RoleBadgeProps {
  role: UserRole;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  let label = '';
  let color = 'text-slate-600 dark:text-slate-400';

  switch (role) {
    case 'super_admin':
      label = 'Super Admin';
      color = 'text-purple-700 dark:text-purple-400 font-semibold';
      break;
    case 'admin_pkn':
      label = 'Koordinator / Admin PKN';
      color = 'text-blue-700 dark:text-blue-400 font-semibold';
      break;
    case 'dosen_pembimbing':
      label = 'Dosen Pembimbing';
      color = 'text-emerald-700 dark:text-emerald-400 font-semibold';
      break;
    case 'pembimbing_lapangan':
      label = 'Pembimbing Lapangan';
      color = 'text-amber-700 dark:text-amber-400 font-semibold';
      break;
    case 'mahasiswa':
      label = 'Mahasiswa';
      color = 'text-slate-700 dark:text-slate-300 font-medium';
      break;
  }

  return (
    <span className={`text-xs ${color}`}>
      {label}
    </span>
  );
};
