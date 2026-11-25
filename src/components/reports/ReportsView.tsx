import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { dbService } from '../../services/db';
import { PKNReport, ReportStatus, PKNRegistration } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import {
  BookOpen,
  Upload,
  FileCheck2,
  CheckCircle2,
  Clock,
  History,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  FileText
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();

  const [reports, setReports] = useState<PKNReport[]>([]);
  const [registrations, setRegistrations] = useState<PKNRegistration[]>([]);

  // Mahasiswa Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);

  // Review Modal (Dosen)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<PKNReport | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReportStatus>('approved');
  const [reviewFeedback, setReviewFeedback] = useState('');

  const isMahasiswa = role === 'mahasiswa';
  const isReviewer = role === 'dosen_pembimbing' || role === 'admin_pkn' || role === 'super_admin';

  const loadData = async () => {
    const [allReports, allRegs] = await Promise.all([
      dbService.getPKNReports(),
      dbService.getPKNRegistrations(),
    ]);

    setReports(allReports);
    setRegistrations(allRegs);
  };

  useEffect(() => {
    loadData();
    const unsub = dbService.subscribe('pkn_reports', loadData);
    return () => unsub();
  }, []);

  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!reportTitle) {
      showToast('error', 'Validasi Gagal', 'Harap masukkan judul laporan PKN.');
      return;
    }

    const myReports = reports.filter(r => r.student_id === user.id);
    const nextVersion = myReports.length + 1;

    try {
      let reportUrl = '';
      if (reportFile) {
        reportUrl = await dbService.uploadFile('pkn-reports', `reports/${user.identifier}_v${nextVersion}_${reportFile.name}`, reportFile);
      }

      const myReg = registrations.find(r => r.student_id === user.id);

      const created = await dbService.createPKNReport({
        student_id: user.id,
        student_name: user.full_name,
        student_nim: user.identifier,
        registration_id: myReg ? myReg.id : dbService.generateId(),
        version: nextVersion,
        title: reportTitle,
        report_file_url: reportUrl,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      });

      // Notify lecturer
      if (myReg?.lecturer_id) {
        await dbService.createNotification({
          user_id: myReg.lecturer_id,
          title: `Laporan PKN Versi ${nextVersion} Masuk`,
          message: `${user.full_name} (${user.identifier}) telah mengunggah versi laporan baru untuk diperiksa.`,
          type: 'info',
          action_url: '/reports',
        });
      }

      dbService.logActivity(user.id, user.full_name, user.role, 'UPLOAD_REPORT', 'pkn_report', created.id, `Mahasiswa mengunggah laporan PKN versi ${nextVersion}`);

      showToast('success', 'Laporan Berhasil Diunggah', `Versi ${nextVersion} berhasil dikirim ke dosen pembimbing.`);
      setShowUploadModal(false);
      setReportTitle('');
      setReportFile(null);
      loadData();
    } catch (err) {
      showToast('error', 'Gagal Mengunggah Laporan', err instanceof Error ? err.message : 'Gagal menyimpan laporan ke Supabase.');
    }
  };

  const handleSaveReview = async () => {
    if (!selectedReport || !user) return;

    await dbService.updatePKNReport(selectedReport.id, {
      status: reviewStatus,
      feedback: reviewFeedback,
      reviewed_by: user.id,
    });

    // Notify student
    await dbService.createNotification({
      user_id: selectedReport.student_id,
      title: `Hasil Review Laporan Versi ${selectedReport.version}`,
      message: `${user.full_name} telah meninjau laporan: status ${reviewStatus}. Catatan: ${reviewFeedback || 'Laporan disetujui.'}`,
      type: reviewStatus === 'approved' ? 'success' : 'warning',
      action_url: '/reports',
    });

    dbService.logActivity(user.id, user.full_name, user.role, 'REVIEW_REPORT', 'pkn_report', selectedReport.id, `Dosen meninjau laporan versi ${selectedReport.version} menjadi ${reviewStatus}`);

    showToast('success', 'Review Laporan Tersimpan', 'Pemberitahuan telah diteruskan ke mahasiswa.');
    setShowReviewModal(false);
    loadData();
  };

  const displayedList = reports.filter(r => {
    if (isMahasiswa) return r.student_id === user?.id;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Pusat Pengumpulan Laporan PKN & Histori Revisi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Setiap draf dan revisi tersimpan dalam versioning berkas tanpa menimpa histori sebelumnya
          </p>
        </div>

        {isMahasiswa && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Unggah Versi Baru</span>
          </button>
        )}
      </div>

      {/* Reports Version History Cards */}
      <div className="space-y-4">
        {displayedList.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            Belum ada berkas laporan yang diunggah.
          </div>
        ) : (
          displayedList.map((rep) => (
            <div
              key={rep.id}
              className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                    Versi {rep.version}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {rep.title}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      Oleh: {rep.student_name} ({rep.student_nim}) · Diajukan {new Date(rep.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={rep.status} />

                  {isReviewer && (
                    <button
                      onClick={() => {
                        setSelectedReport(rep);
                        setReviewStatus(rep.status === 'submitted' ? 'approved' : rep.status);
                        setReviewFeedback(rep.feedback || '');
                        setShowReviewModal(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Review Laporan</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Feedback Alert if any */}
              {rep.feedback && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>Catatan Review Pembimbing:</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed pl-5">
                    {rep.feedback}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-xs">
                <a
                  href={rep.report_file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  <span>Lihat Dokumen PDF Laporan (Versi {rep.version})</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                {rep.status === 'approved' && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Laporan Resmi Disetujui</span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal 1: Upload New Report / Revision */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Unggah Versi Laporan PKN"
        subtitle="Dokumen akan dicatat sebagai versi bertingkat otomatis untuk riwayat bimbingan"
        maxWidth="md"
      >
        <form onSubmit={handleUploadReport} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Judul Laporan Lengkap *
            </label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="Contoh: Rancang Bangun Sistem Monitoring Jaringan IndiHome Enterprise"
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              File Dokumen Laporan (Format PDF) *
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setReportFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Maksimum 25 MB. Pastikan naskah telah menyertakan lembar pengesahan dan lampiran teknis.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 shadow-xs"
            >
              Kirim Dokumen Laporan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Review Report (Dosen) */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Review & Verifikasi Laporan PKN"
        subtitle={`Mahasiswa: ${selectedReport?.student_name} (Versi ${selectedReport?.version})`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Keputusan Pemeriksaan
            </label>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as ReportStatus)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            >
              <option value="approved">Setujui Laporan Akhir (Approved)</option>
              <option value="revision_required">Perlu Perbaikan / Revisi (Revision Required)</option>
              <option value="reviewing">Sedang Diperiksa Mendalam (Reviewing)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Revisi & Feedback Penguji
            </label>
            <textarea
              rows={4}
              value={reviewFeedback}
              onChange={(e) => setReviewFeedback(e.target.value)}
              placeholder="Tuliskan catatan detail bab yang harus diperbaiki, format tata tulis, atau kesimpulan..."
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
              Simpan Hasil Pemeriksaan
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
