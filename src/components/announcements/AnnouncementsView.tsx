import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { dbService } from '../../services/db';
import { Announcement } from '../../types/database';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Bell,
  Pin,
  Plus,
  Calendar,
  Trash2,
  Edit2,
  CheckCircle2,
  Info
} from 'lucide-react';

export const AnnouncementsView: React.FC = () => {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState<Announcement['target_role']>('all');
  const [isPinned, setIsPinned] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('2025-07-31');

  // Delete Confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isAdmin = role === 'admin_pkn' || role === 'super_admin';

  const loadData = async () => {
    const list = await dbService.getAnnouncements();
    // Sort: pinned first, then newest
    list.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setAnnouncements(list);
  };

  useEffect(() => {
    loadData();
    const unsub = dbService.subscribe('announcements', loadData);
    return () => unsub();
  }, []);

  const openAddModal = () => {
    setEditingAnn(null);
    setTitle('');
    setContent('');
    setTargetRole('all');
    setIsPinned(false);
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('2025-07-31');
    setShowModal(true);
  };

  const openEditModal = (ann: Announcement) => {
    setEditingAnn(ann);
    setTitle(ann.title);
    setContent(ann.content);
    setTargetRole(ann.target_role);
    setIsPinned(ann.is_pinned);
    setStartDate(ann.start_date);
    setEndDate(ann.end_date);
    setShowModal(true);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !user) {
      showToast('error', 'Validasi Gagal', 'Harap isi judul dan isi pengumuman.');
      return;
    }

    if (editingAnn) {
      await dbService.updateAnnouncement(editingAnn.id, {
        title,
        content,
        target_role: targetRole,
        is_pinned: isPinned,
        start_date: startDate,
        end_date: endDate,
      });
      dbService.logActivity(user.id, user.full_name, user.role, 'UPDATE_ANNOUNCEMENT', 'announcement', editingAnn.id, `Admin mengubah pengumuman: ${title}`);
      showToast('success', 'Pengumuman Diperbarui', 'Pembaruan informasi telah ditayangkan.');
    } else {
      const created = await dbService.createAnnouncement({
        title,
        content,
        target_role: targetRole,
        is_pinned: isPinned,
        start_date: startDate,
        end_date: endDate,
        author_name: user.full_name,
      });
      dbService.logActivity(user.id, user.full_name, user.role, 'CREATE_ANNOUNCEMENT', 'announcement', created.id, `Admin membuat pengumuman: ${title}`);
      showToast('success', 'Pengumuman Dibuat', 'Pengumuman baru telah diterbitkan untuk mahasiswa dan dosen.');
    }

    setShowModal(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await dbService.deleteAnnouncement(deleteId);
    showToast('success', 'Pengumuman Dihapus', 'Pengumuman telah ditarik.');
    setDeleteId(null);
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Papan Pengumuman Resmi & Jadwal Akademik
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Informasi penting terkait batas pendaftaran, pedoman laporan, dan sosialisasi MBKM
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Pengumuman Baru</span>
          </button>
        )}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className={`p-6 bg-white dark:bg-slate-900 border rounded-2xl shadow-xs space-y-3 transition-colors ${
              ann.is_pinned
                ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                {ann.is_pinned && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    <Pin className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>Dipasangi Pin (Penting)</span>
                  </span>
                )}
                <span className="text-xs font-mono text-slate-400">
                  Target: {ann.target_role === 'all' ? 'Seluruh Sivitas' : ann.target_role} · Diposting oleh {ann.author_name}
                </span>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(ann)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md"
                    title="Ubah pengumuman"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(ann.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md"
                    title="Hapus pengumuman"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {ann.title}
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {ann.content}
            </p>

            <div className="pt-2 text-[11px] font-mono text-slate-400 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Masa Tampil: {ann.start_date} s/d {ann.end_date}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingAnn ? 'Ubah Pengumuman' : 'Buat Pengumuman Baru'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAnnouncement} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Judul Pengumuman *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Batas Akhir Penyerahan Nilai PKN Genap 2024/2025"
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sasaran Target Pengumuman
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              >
                <option value="all">Semua Pengguna</option>
                <option value="mahasiswa">Khusus Mahasiswa</option>
                <option value="dosen_pembimbing">Khusus Dosen Pembimbing</option>
                <option value="pembimbing_lapangan">Khusus Pembimbing Lapangan</option>
              </select>
            </div>
            <div className="flex items-center pt-5">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded-sm border-slate-300 text-slate-900 focus:ring-slate-500"
                />
                <span>Sematkan di Atas (Pin Pengumuman)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Isi Informasi Pengumuman *
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tuliskan isi pengumuman lengkap secara jelas..."
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Mulai Berlaku
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Batas Tampil
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

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
              Terbitkan Pengumuman
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Pengumuman"
        message="Apakah Anda yakin ingin menghapus pengumuman ini? Tindakan tidak dapat dibatalkan."
        confirmLabel="Hapus"
        isDestructive
      />
    </div>
  );
};
