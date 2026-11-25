import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { dbService } from '../../services/db';
import { DailyLog, LogStatus, PKNRegistration } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Pagination } from '../common/Pagination';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Search,
  Filter,
  Paperclip,
  Trash2,
  Edit2,
  FileCheck2,
  ExternalLink
} from 'lucide-react';

export const DailyLogsView: React.FC = () => {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();

  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [registrations, setRegistrations] = useState<PKNRegistration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Mahasiswa Create/Edit Log Modal
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:30');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityResult, setActivityResult] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // Reviewer (Dosen / Pembimbing Lapangan) Feedback Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingLog, setReviewingLog] = useState<DailyLog | null>(null);
  const [reviewStatus, setReviewStatus] = useState<LogStatus>('approved');
  const [reviewFeedback, setReviewFeedback] = useState('');

  // Delete Confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isMahasiswa = role === 'mahasiswa';
  const isLecturer = role === 'dosen_pembimbing';
  const isFieldSupervisor = role === 'pembimbing_lapangan';
  const isReviewer = isLecturer || isFieldSupervisor || role === 'admin_pkn' || role === 'super_admin';

  const loadData = async () => {
    const [allLogs, allRegs] = await Promise.all([
      dbService.getDailyLogs(),
      dbService.getPKNRegistrations(),
    ]);

    setLogs(allLogs);
    setRegistrations(allRegs);
  };

  useEffect(() => {
    loadData();
    const unsub = dbService.subscribe('daily_logs', loadData);
    return () => unsub();
  }, []);

  const openAddModal = () => {
    setEditingLog(null);
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime('08:00');
    setEndTime('16:30');
    setTitle('');
    setDescription('');
    setActivityResult('');
    setAttachmentFile(null);
    setShowModal(true);
  };

  const openEditModal = (log: DailyLog) => {
    setEditingLog(log);
    setDate(log.date);
    setStartTime(log.start_time);
    setEndTime(log.end_time);
    setTitle(log.title);
    setDescription(log.description);
    setActivityResult(log.activity_result);
    setAttachmentFile(null);
    setShowModal(true);
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title || !description || !activityResult) {
      showToast('error', 'Validasi Gagal', 'Harap lengkapi judul, deskripsi kegiatan, dan hasil capaian.');
      return;
    }

    let attachmentUrl = editingLog?.attachment_url;
    let attachmentName = editingLog?.attachment_name;

    if (attachmentFile) {
      attachmentName = attachmentFile.name;
      attachmentUrl = await dbService.uploadFile('pkn-activities', `logs/${user.identifier}_${attachmentFile.name}`, attachmentFile);
    }

    if (editingLog) {
      await dbService.updateDailyLog(editingLog.id, {
        date,
        start_time: startTime,
        end_time: endTime,
        title,
        description,
        activity_result: activityResult,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        status: 'pending', // Re-trigger review after edit
      });
      dbService.logActivity(user.id, user.full_name, user.role, 'UPDATE_DAILY_LOG', 'daily_log', editingLog.id, `Mahasiswa memperbarui jurnal kegiatan: ${title}`);
      showToast('success', 'Jurnal Diperbarui', 'Perubahan jurnal berhasil disimpan dan diajukan kembali.');
    } else {
      const myReg = registrations.find(r => r.student_id === user.id);
      const created = await dbService.createDailyLog({
        student_id: user.id,
        registration_id: myReg ? myReg.id : dbService.generateId(),
        date,
        start_time: startTime,
        end_time: endTime,
        title,
        description,
        activity_result: activityResult,
        status: 'pending',
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
      });

      // Send notification to supervisor
      if (myReg?.lecturer_id) {
        await dbService.createNotification({
          user_id: myReg.lecturer_id,
          title: 'Jurnal Harian Baru Masuk',
          message: `${user.full_name} (${user.identifier}) mengisi jurnal kegiatan pada tanggal ${date}.`,
          type: 'info',
          action_url: '/daily_logs',
        });
      }

      dbService.logActivity(user.id, user.full_name, user.role, 'CREATE_DAILY_LOG', 'daily_log', created.id, `Mahasiswa mengisi jurnal kegiatan baru: ${title}`);
      showToast('success', 'Jurnal Tersimpan', 'Jurnal harian Anda telah masuk antrean pemeriksaan pembimbing.');
    }

    setShowModal(false);
    loadData();
  };

  const openReviewModal = (log: DailyLog) => {
    setReviewingLog(log);
    setReviewStatus(log.status === 'pending' ? 'approved' : log.status);
    setReviewFeedback(isFieldSupervisor ? log.field_supervisor_feedback || '' : log.lecturer_feedback || '');
    setShowReviewModal(true);
  };

  const handleSaveReview = async () => {
    if (!reviewingLog || !user) return;

    const updates: Partial<DailyLog> = {
      status: reviewStatus,
    };

    if (isFieldSupervisor) {
      updates.field_supervisor_feedback = reviewFeedback;
    } else {
      updates.lecturer_feedback = reviewFeedback;
    }

    await dbService.updateDailyLog(reviewingLog.id, updates);

    // Notify the student
    await dbService.createNotification({
      user_id: reviewingLog.student_id,
      title: `Jurnal Kegiatan: ${reviewStatus.toUpperCase()}`,
      message: `${user.full_name} telah meninjau jurnal Anda tanggal ${reviewingLog.date}: "${reviewFeedback || reviewStatus}"`,
      type: reviewStatus === 'approved' ? 'success' : 'warning',
      action_url: '/daily_logs',
    });

    dbService.logActivity(user.id, user.full_name, user.role, 'REVIEW_DAILY_LOG', 'daily_log', reviewingLog.id, `Pembimbing ${user.full_name} mengubah status jurnal menjadi ${reviewStatus}`);

    showToast('success', 'Penilaian Jurnal Disimpan', 'Status jurnal dan catatan pembimbing berhasil dikirim.');
    setShowReviewModal(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await dbService.deleteDailyLog(deleteId);
    showToast('success', 'Jurnal Dihapus', 'Entri jurnal kegiatan telah dihapus.');
    setDeleteId(null);
    loadData();
  };

  // Filter logs
  const filtered = logs.filter((log) => {
    if (isMahasiswa && log.student_id !== user?.id) return false;
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        log.title.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        log.date.includes(q)
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
            Jurnal Kegiatan Harian (Daily Activity Log)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dokumentasikan seluruh task teknis, hasil capaian harian, dan feedback dari pembimbing
          </p>
        </div>

        {isMahasiswa && (
          <button
            onClick={openAddModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Catatan Harian</span>
          </button>
        )}
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
            placeholder="Cari judul kegiatan, deskripsi, tanggal..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
          >
            <option value="all">Semua Status Jurnal</option>
            <option value="pending">Menunggu Persetujuan</option>
            <option value="approved">Disetujui (Approved)</option>
            <option value="revision_required">Perlu Perbaikan</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>
      </div>

      {/* Daily Logs Timeline Cards */}
      <div className="space-y-4">
        {pagedList.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            Belum ada catatan kegiatan harian yang sesuai filter.
          </div>
        ) : (
          pagedList.map((log) => (
            <div
              key={log.id}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {log.date}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500 font-mono">
                    {log.start_time} - {log.end_time} WIB
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={log.status} />

                  {isReviewer && (
                    <button
                      onClick={() => openReviewModal(log)}
                      className="px-3 py-1 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Review & Komentar</span>
                    </button>
                  )}

                  {isMahasiswa && log.status !== 'approved' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(log)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md"
                        title="Edit jurnal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(log.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                        title="Hapus jurnal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {log.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {log.description}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/60 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                  Hasil / Capaian Kegiatan:
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {log.activity_result}
                </p>
              </div>

              {/* Attachments & Feedback Section */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                {log.attachment_url ? (
                  <a
                    href={log.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Lampiran: {log.attachment_name || 'Dokumen Bukti Kegiatan'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400">Tidak ada lampiran berkas</span>
                )}

                {/* Feedbacks */}
                <div className="flex flex-wrap items-center gap-3">
                  {log.lecturer_feedback && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md">
                      <MessageSquare className="w-3 h-3" />
                      <span>Catatan Dosen: {log.lecturer_feedback}</span>
                    </div>
                  )}
                  {log.field_supervisor_feedback && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md">
                      <MessageSquare className="w-3 h-3" />
                      <span>Catatan Industri: {log.field_supervisor_feedback}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal 1: Create / Edit Log */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingLog ? 'Ubah Catatan Jurnal Harian' : 'Tambah Jurnal Harian Baru'}
        subtitle="Isi riwayat pekerjaan, task yang diselesaikan, dan bukti kegiatan hari ini"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveLog} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Kegiatan *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jam Mulai *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jam Selesai *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Topik / Judul Aktivitas Utama *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Implementasi REST API Autentikasi JWT dan Unit Test"
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Uraian Deskripsi Aktivitas *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ceritakan proses teknis yang dikerjakan, alat/bahasa pemrograman yang dipakai, serta diskusi bersama tim..."
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Hasil & Capaian (Outcome) *
            </label>
            <textarea
              rows={2}
              value={activityResult}
              onChange={(e) => setActivityResult(e.target.value)}
              placeholder="Output yang berhasil diselesaikan, modul yang lolos pengujian, atau dokumen yang dihasilkan..."
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Foto Kegiatan / Tangkapan Layar / Dokumen Pendukung
            </label>
            <input
              type="file"
              onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
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
              Simpan Jurnal
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Reviewer Feedback Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Review Jurnal Mahasiswa"
        subtitle={`Kegiatan tanggal ${reviewingLog?.date}: ${reviewingLog?.title}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Keputusan Review
            </label>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as LogStatus)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            >
              <option value="approved">Setujui Jurnal (Approved)</option>
              <option value="revision_required">Perlu Perbaikan (Revision Required)</option>
              <option value="rejected">Tolak Jurnal (Rejected)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Arahan Pembimbing
            </label>
            <textarea
              rows={3}
              value={reviewFeedback}
              onChange={(e) => setReviewFeedback(e.target.value)}
              placeholder="Berikan saran teknis, catatan metodologi, atau revisi yang harus dilengkapi mahasiswa..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveReview}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 shadow-xs"
            >
              Kirim Feedback Review
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Entri Jurnal"
        message="Apakah Anda yakin ingin menghapus catatan jurnal harian ini?"
        confirmLabel="Hapus Jurnal"
        isDestructive
      />
    </div>
  );
};
