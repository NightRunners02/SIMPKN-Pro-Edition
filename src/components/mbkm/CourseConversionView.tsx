import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { dbService } from '../../services/db';
import { CourseConversion, CourseConversionItem, ConversionStatus } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import {
  Layers,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Trash2,
  BookOpen,
  ArrowRight
} from 'lucide-react';

export const CourseConversionView: React.FC = () => {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();

  const [conversions, setConversions] = useState<CourseConversion[]>([]);

  // Mahasiswa Request Modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [programTitle, setProgramTitle] = useState('MSIB Batch 8 - Software Engineering');
  const [courses, setCourses] = useState<Array<{ code: string; name: string; sks: number; mapping: string }>>([
    { code: 'INF-4101', name: 'Praktik Kerja Nyata (PKN)', sks: 4, mapping: 'Pengalaman magang industri selama 6 bulan' },
    { code: 'INF-3204', name: 'Rekayasa Perangkat Lunak Terapan', sks: 4, mapping: 'Pengembangan Microservices dan CI/CD pipeline' },
    { code: 'INF-3208', name: 'Pengembangan Aplikasi Web Lanjut', sks: 4, mapping: 'Arsitektur REST API high-throughput dan container Docker' },
    { code: 'INF-4202', name: 'Kapita Selekta Informatika', sks: 4, mapping: 'Studi tren terkini payment gateway dan cloud security' },
    { code: 'INF-4210', name: 'Etika Profesi & Komunikasi Bisnis', sks: 4, mapping: 'Kolaborasi lintas tim Scrum di industri' },
  ]);

  // Admin Review Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedConversion, setSelectedConversion] = useState<CourseConversion | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ConversionStatus>('approved');
  const [adminNotes, setAdminNotes] = useState('');
  const [approvedSks, setApprovedSks] = useState<number>(20);

  const isMahasiswa = role === 'mahasiswa';
  const isAdmin = role === 'admin_pkn' || role === 'super_admin';

  const loadData = async () => {
    const list = await dbService.getCourseConversions();
    setConversions(list);
  };

  useEffect(() => {
    loadData();
    const unsub = dbService.subscribe('course_conversions', loadData);
    return () => unsub();
  }, []);

  const handleAddCourseRow = () => {
    setCourses([...courses, { code: 'INF-XXXX', name: 'Mata Kuliah Pilihan', sks: 4, mapping: '' }]);
  };

  const handleRemoveCourseRow = (idx: number) => {
    setCourses(courses.filter((_, i) => i !== idx));
  };

  const totalSksRequested = courses.reduce((acc, c) => acc + Number(c.sks || 0), 0);

  const handleSubmitConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (courses.length === 0) {
      showToast('error', 'Validasi Gagal', 'Harap masukkan minimal satu mata kuliah ekuivalensi.');
      return;
    }

    try {
      const myMbkmRegs = await dbService.getMBKMRegistrations(user.id);
      const mbkmRegId = myMbkmRegs[0]?.id || dbService.generateId();

      const created = await dbService.createCourseConversion({
        student_id: user.id,
        student_name: user.full_name,
        student_nim: user.identifier,
        mbkm_registration_id: mbkmRegId,
        program_title: programTitle,
        total_sks_requested: totalSksRequested,
        total_sks_approved: 0,
        status: 'pending',
        courses: courses.map((c) => ({
          id: dbService.generateId(),
          course_code: c.code,
          course_name: c.name,
          sks: c.sks,
          activity_mapping: c.mapping,
          status: 'pending',
        })),
      });

      dbService.logActivity(user.id, user.full_name, user.role, 'SUBMIT_CONVERSION', 'course_conversion', created.id, `Mahasiswa mengajukan konversi ${totalSksRequested} SKS untuk ${programTitle}`);

      showToast('success', 'Pengajuan Terkirim', 'Pengajuan konversi 20 SKS sedang diverifikasi Tim Kurikulum.');
      setShowApplyModal(false);
      loadData();
    } catch (err) {
      showToast('error', 'Gagal Mengajukan', err instanceof Error ? err.message : 'Gagal menyimpan pengajuan konversi ke Supabase.');
    }
  };

  const handleSaveReview = async () => {
    if (!selectedConversion || !user) return;

    try {
      await dbService.updateCourseConversion(selectedConversion.id, {
        status: reviewStatus,
        admin_notes: adminNotes,
        total_sks_approved: reviewStatus === 'approved' ? approvedSks : 0,
        reviewed_by: user.full_name,
        reviewed_at: new Date().toISOString(),
        courses: selectedConversion.courses.map(c => ({
          ...c,
          status: reviewStatus === 'approved' ? 'approved' : 'rejected',
          grade: reviewStatus === 'approved' ? 'A' : undefined,
        })),
      });

      // Notify student
      await dbService.createNotification({
        user_id: selectedConversion.student_id,
        title: `Status Konversi SKS MBKM: ${reviewStatus.toUpperCase()}`,
        message: `${user.full_name} telah meninjau pengajuan konversi: ${approvedSks} SKS disetujui. Catatan: ${adminNotes || 'Selesai'}`,
        type: reviewStatus === 'approved' ? 'success' : 'warning',
        action_url: '/course_conversions',
      });

      dbService.logActivity(user.id, user.full_name, user.role, 'REVIEW_CONVERSION', 'course_conversion', selectedConversion.id, `Admin menyetujui konversi ${approvedSks} SKS mahasiswa ${selectedConversion.student_name}`);

      showToast('success', 'Konversi Disimpan', 'Keputusan ekuivalensi mata kuliah berhasil dicatat di sistem.');
      setShowReviewModal(false);
      loadData();
    } catch (err) {
      showToast('error', 'Gagal Menyimpan', err instanceof Error ? err.message : 'Gagal memperbarui konversi SKS di Supabase.');
    }
  };

  const displayedList = conversions.filter(c => {
    if (isMahasiswa) return c.student_id === user?.id;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Ekuivalensi & Konversi Mata Kuliah MBKM (20 SKS)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pemetaan kompetensi magang industri ke mata kuliah kurikulum Informatika UMM
          </p>
        </div>

        {isMahasiswa && (
          <button
            onClick={() => setShowApplyModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan Konversi SKS</span>
          </button>
        )}
      </div>

      {/* Conversions Cards & Tables */}
      <div className="space-y-6">
        {displayedList.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            Belum ada data pengajuan konversi mata kuliah.
          </div>
        ) : (
          displayedList.map((conv) => (
            <div
              key={conv.id}
              className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {conv.student_name}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      NIM {conv.student_nim}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    Program MBKM: <strong className="text-slate-700 dark:text-slate-300">{conv.program_title}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    <span className="text-slate-400 block font-mono">
                      SKS Diajukan: <strong className="text-slate-900 dark:text-slate-100">{conv.total_sks_requested}</strong> · Disetujui: <strong className="text-emerald-600 dark:text-emerald-400">{conv.total_sks_approved}</strong>
                    </span>
                  </div>
                  <StatusBadge status={conv.status} />

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setSelectedConversion(conv);
                        setReviewStatus(conv.status === 'pending' ? 'approved' : conv.status);
                        setAdminNotes(conv.admin_notes || '');
                        setApprovedSks(conv.total_sks_requested || 20);
                        setShowReviewModal(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
                    >
                      Verifikasi SKS
                    </button>
                  )}
                </div>
              </div>

              {/* Table Courses in Conversion */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Kode MK</th>
                      <th className="py-2.5 px-3 font-semibold">Mata Kuliah Konversi</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Bobot SKS</th>
                      <th className="py-2.5 px-3 font-semibold">Aktivitas & Kompetensi yang Relevan</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Nilai Huruf</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {conv.courses.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                          {c.course_code}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {c.course_name}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          {c.sks} SKS
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {c.activity_mapping}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {c.grade || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={c.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {conv.admin_notes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Catatan Tim Kurikulum: </span>
                  {conv.admin_notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal 1: Mahasiswa Request Conversion */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="Formulir Pengajuan Konversi 20 SKS MBKM"
        subtitle="Petakan capaian pembelajaran kegiatan magang/studi independen ke mata kuliah prodi Informatika"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmitConversion} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Program MBKM yang Diikuti *
            </label>
            <input
              type="text"
              value={programTitle}
              onChange={(e) => setProgramTitle(e.target.value)}
              placeholder="Contoh: MSIB Batch 8 - GoTo Financial Software Engineer"
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Daftar Mata Kuliah yang Diajukan (Total: <span className="font-mono font-bold text-emerald-600">{totalSksRequested} SKS</span>)
              </span>
              <button
                type="button"
                onClick={handleAddCourseRow}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris MK</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {courses.map((c, i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                  <div className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      placeholder="Kode MK"
                      value={c.code}
                      onChange={(e) => {
                        const updated = [...courses];
                        updated[i].code = e.target.value;
                        setCourses(updated);
                      }}
                      className="col-span-3 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Nama Mata Kuliah"
                      value={c.name}
                      onChange={(e) => {
                        const updated = [...courses];
                        updated[i].name = e.target.value;
                        setCourses(updated);
                      }}
                      className="col-span-6 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="SKS"
                      min="1"
                      max="6"
                      value={c.sks}
                      onChange={(e) => {
                        const updated = [...courses];
                        updated[i].sks = Number(e.target.value);
                        setCourses(updated);
                      }}
                      className="col-span-2 px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCourseRow(i)}
                      className="col-span-1 p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Deskripsikan kompetensi industri yang relevan dengan mata kuliah ini..."
                    value={c.mapping}
                    onChange={(e) => {
                      const updated = [...courses];
                      updated[i].mapping = e.target.value;
                      setCourses(updated);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowApplyModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 shadow-xs"
            >
              Kirim Pengajuan Konversi
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Admin Review Conversion */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Verifikasi Konversi SKS MBKM"
        subtitle={`Mahasiswa: ${selectedConversion?.student_name} (${selectedConversion?.student_nim})`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Keputusan Konversi
            </label>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as ConversionStatus)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            >
              <option value="approved">Disetujui Penuh (Approved)</option>
              <option value="under_review">Sedang Ditinjau Tim Kurikulum</option>
              <option value="rejected">Ditolak (Rejected)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Total SKS yang Disetujui
            </label>
            <input
              type="number"
              min="0"
              max="24"
              value={approvedSks}
              onChange={(e) => setApprovedSks(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Tim Kurikulum & Rekomendasi
            </label>
            <textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Tuliskan catatan persetujuan SKS atau alasan penyesuaian..."
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
              Simpan Keputusan Konversi
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
