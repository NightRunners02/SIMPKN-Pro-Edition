import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { dbService } from '../../services/db';
import { UserProfile, UserRole } from '../../types/database';
import { RoleBadge } from '../common/RoleBadge';
import { Modal } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Building2,
  Mail,
  Phone
} from 'lucide-react';

export const AdminManagementView: React.FC = () => {
  const { user: currentUser, role: currentRole } = useAuth();
  const { showToast } = useNotifications();

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('dosen_pembimbing');
  const [companyName, setCompanyName] = useState('');
  const [studyProgram, setStudyProgram] = useState('Informatika');
  const [password, setPassword] = useState('');

  const loadProfiles = async () => {
    const list = await dbService.getProfiles();
    setProfiles(list);
  };

  useEffect(() => {
    loadProfiles();
    const unsub = dbService.subscribe('profiles', loadProfiles);
    return () => unsub();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setIdentifier('');
    setFullName('');
    setEmail('');
    setPhone('');
    setRole('dosen_pembimbing');
    setCompanyName('');
    setStudyProgram('Informatika');
    setPassword('');
    setShowModal(true);
  };

  const openEditModal = (target: UserProfile) => {
    setEditingUser(target);
    setIdentifier(target.identifier);
    setFullName(target.full_name);
    setEmail(target.email && !target.email.endsWith('@noemail.simpkn.umm') ? target.email : '');
    setPhone(target.phone || '');
    setRole(target.role);
    setCompanyName(target.company_name || '');
    setStudyProgram(target.study_program);
    setPassword('');
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !fullName) {
      showToast('error', 'Validasi Gagal', 'Harap lengkapi nomor identitas dan nama lengkap.');
      return;
    }

    if (!editingUser && (!password || password.length < 6)) {
      showToast('error', 'Validasi Gagal', 'Kata sandi akun baru minimal 6 karakter.');
      return;
    }

    if (editingUser && password && password.length < 6) {
      showToast('error', 'Validasi Gagal', 'Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (editingUser) {
      await dbService.updateProfile(
        editingUser.id,
        {
          identifier: identifier.trim(),
          full_name: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim(),
          role,
          company_name: companyName.trim(),
          study_program: studyProgram,
        },
        password || undefined
      );

      if (currentUser) {
        dbService.logActivity(currentUser.id, currentUser.full_name, currentUser.role, 'UPDATE_USER', 'profile', editingUser.id, `Admin memperbarui data pengguna: ${fullName} (${identifier})`);
      }
      showToast('success', 'Akun Diperbarui', `Data ${fullName} berhasil disimpan ke Supabase.`);
    } else {
      const created = await dbService.createProfile(
        {
          identifier: identifier.trim(),
          full_name: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim(),
          role,
          study_program: studyProgram,
          faculty: 'Fakultas Teknik',
          company_name: companyName.trim(),
          is_active: true,
          avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
        },
        password
      );

      if (currentUser) {
        dbService.logActivity(currentUser.id, currentUser.full_name, currentUser.role, 'CREATE_USER', 'profile', created.id, `Admin menambahkan akun baru: ${fullName} [${role}]`);
      }
      showToast('success', 'Akun Ditambahkan', `Akun baru ${fullName} aktif dan kata sandi tersimpan di Supabase.`);
    }

    setShowModal(false);
    loadProfiles();
  };

  const toggleStatus = async (target: UserProfile) => {
    const updated = await dbService.updateProfile(target.id, { is_active: !target.is_active });
    showToast('info', 'Status Akun Diubah', `${target.full_name} sekarang ${updated?.is_active ? 'Aktif' : 'Nonaktif'}.`);
    loadProfiles();
  };

  // Filter
  const filtered = profiles.filter(p => {
    if (roleFilter !== 'all' && p.role !== roleFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        p.full_name.toLowerCase().includes(q) ||
        p.identifier.toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
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
            Manajemen Akun & Hak Akses Pengguna
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data mahasiswa, dosen pembimbing, pembimbing lapangan mitra, dan administrator
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Akun Baru</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari nama, NIM, NIDN, email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
          >
            <option value="all">Semua Peran (Roles)</option>
            <option value="mahasiswa">Mahasiswa</option>
            <option value="dosen_pembimbing">Dosen Pembimbing</option>
            <option value="pembimbing_lapangan">Pembimbing Lapangan</option>
            <option value="admin_pkn">Admin PKN / Koordinator</option>
            <option value="super_admin">Super Administrator</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Pengguna</th>
                <th className="py-3 px-4 font-semibold">Nomor Identitas</th>
                <th className="py-3 px-4 font-semibold">Peran Sistem</th>
                <th className="py-3 px-4 font-semibold">Kontak</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagedList.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.full_name)}`}
                        alt={p.full_name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                          {p.full_name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {p.study_program} {p.company_name ? `· ${p.company_name}` : ''}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                    {p.identifier}
                  </td>
                  <td className="py-3 px-4">
                    <RoleBadge role={p.role} />
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-800 dark:text-slate-200 block truncate max-w-xs">
                      {p.email && !p.email.endsWith('@noemail.simpkn.umm') ? p.email : 'Email belum diisi'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {p.phone || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleStatus(p)}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                        p.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {p.is_active ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aktif</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Nonaktif</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => openEditModal(p)}
                      className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      Ubah
                    </button>
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

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? 'Ubah Profil Pengguna' : 'Tambah Akun Pengguna Baru'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Peran Akun (Role) *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              >
                <option value="mahasiswa">Mahasiswa</option>
                <option value="dosen_pembimbing">Dosen Pembimbing</option>
                <option value="pembimbing_lapangan">Pembimbing Lapangan</option>
                <option value="admin_pkn">Admin PKN / Koordinator</option>
                {currentRole === 'super_admin' && (
                  <option value="super_admin">Super Administrator</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Identitas (NIM/NIDN/NIP) *
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Contoh: 0715088201 / 202110370311001"
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap & Gelar *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Contoh: Dr. Ir. Wahyu Hidayat, M.Kom."
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Pengguna (Opsional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@umm.ac.id (opsional)"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Telepon / WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08123456789"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {editingUser ? 'Atur Ulang Kata Sandi (Opsional)' : 'Kata Sandi Akun *'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={editingUser ? 'Kosongkan jika tidak ingin mengubah kata sandi' : 'Minimal 6 karakter...'}
              required={!editingUser}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          {role === 'pembimbing_lapangan' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Instansi / Perusahaan Tempat Bertugas
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Contoh: PT Telkom Indonesia Witel Malang"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 shadow-xs"
            >
              Simpan Data Akun
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
