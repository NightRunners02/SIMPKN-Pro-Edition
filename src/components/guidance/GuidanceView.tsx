import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { dbService } from '../../services/db';
import { GuidanceSession, GuidanceStatus, PKNRegistration } from '../../types/database';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import {
  Users,
  Calendar,
  Clock,
  Plus,
  Video,
  MapPin,
  CheckCircle2,
  FileText,
  MessageSquare,
  Edit2
} from 'lucide-react';

export const GuidanceView: React.FC = () => {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();

  const [guidances, setGuidances] = useState<GuidanceSession[]>([]);
  const [registrations, setRegistrations] = useState<PKNRegistration[]>([]);

  // Mahasiswa Request Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestedDate, setRequestedDate] = useState(new Date().toISOString().split('T')[0]);
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');

  // Dosen Scheduling / Complete Modal
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<GuidanceSession | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [locationOrLink, setLocationOrLink] = useState('');
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [manageStatus, setManageStatus] = useState<GuidanceStatus>('scheduled');

  const isMahasiswa = role === 'mahasiswa';
  const isLecturer = role === 'dosen_pembimbing' || role === 'admin_pkn' || role === 'super_admin';

  const loadData = async () => {
    const [allGuidance, allRegs] = await Promise.all([
      dbService.getGuidanceSessions(),
      dbService.getPKNRegistrations(),
    ]);

    setGuidances(allGuidance);
    setRegistrations(allRegs);
  };

  useEffect(() => {
    loadData();
    const unsub = dbService.subscribe('guidance_sessions', loadData);
    return () => unsub();
  }, []);

  const handleRequestGuidance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const myReg = registrations.find(r => r.student_id === user.id);
    if (!myReg || !myReg.lecturer_id) {
      showToast('error', 'Belum Ada Dosen', 'Anda belum memiliki dosen pembimbing yang ditugaskan oleh admin.');
      return;
    }

    const created = await dbService.createGuidanceSession({
      student_id: user.id,
      student_name: user.full_name,
      student_nim: user.identifier,
      lecturer_id: myReg.lecturer_id,
      lecturer_name: myReg.lecturer_name || 'Dosen Pembimbing',
      registration_id: myReg.id,
      requested_date: requestedDate,
      topic,
      description,
      status: 'requested',
    });

    // Notify lecturer
    await dbService.createNotification({
      user_id: myReg.lecturer_id,
      title: 'Permintaan Bimbingan Baru',
      message: `${user.full_name} (${user.identifier}) mengajukan bimbingan: "${topic}" pada ${requestedDate}.`,
      type: 'info',
      action_url: '/guidance',
    });

    dbService.logActivity(user.id, user.full_name, user.role, 'REQUEST_GUIDANCE', 'guidance', created.id, `Mahasiswa mengajukan bimbingan dosen: ${topic}`);

    showToast('success', 'Permintaan Terkirim', 'Jadwal konsultasi telah diajukan ke dosen pembimbing Anda.');
    setShowRequestModal(false);
    setTopic('');
    setDescription('');
    loadData();
  };

  const handleSaveManage = async () => {
    if (!selectedSession || !user) return;

    await dbService.updateGuidanceSession(selectedSession.id, {
      status: manageStatus,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : selectedSession.scheduled_at,
      location_or_link: locationOrLink,
      supervisor_notes: supervisorNotes,
    });

    // Notify student
    await dbService.createNotification({
      user_id: selectedSession.student_id,
      title: `Bimbingan ${manageStatus.toUpperCase()}`,
      message: `${user.full_name} memperbarui sesi bimbingan: "${selectedSession.topic}". Catatan: ${supervisorNotes || 'Silakan cek jadwal'}.`,
      type: manageStatus === 'completed' ? 'success' : 'info',
      action_url: '/guidance',
    });

    dbService.logActivity(user.id, user.full_name, user.role, 'UPDATE_GUIDANCE', 'guidance', selectedSession.id, `Dosen memperbarui sesi bimbingan ${selectedSession.topic} status: ${manageStatus}`);

    showToast('success', 'Jadwal Diperbarui', 'Pembaruan sesi bimbingan telah disimpan.');
    setShowManageModal(false);
    loadData();
  };

  const displayedList = guidances.filter(g => {
    if (isMahasiswa) return g.student_id === user?.id;
    if (role === 'dosen_pembimbing') return g.lecturer_id === user?.id || g.lecturer_name?.includes(user?.full_name.split(' ')[0] || '');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Sistem Konsultasi & Bimbingan Akademik PKN
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Jadwal tatap muka, konsultasi daring via Google Meet, serta catatan arahan pembimbing
          </p>
        </div>

        {isMahasiswa && (
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan Jadwal Bimbingan</span>
          </button>
        )}
      </div>

      {/* Guidance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayedList.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            Belum ada sesi bimbingan yang diajukan.
          </div>
        ) : (
          displayedList.map((session) => (
            <div
              key={session.id}
              className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 block">
                      {isMahasiswa ? `Dosen: ${session.lecturer_name}` : `Mahasiswa: ${session.student_name} (${session.student_nim})`}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {session.topic}
                    </h3>
                  </div>
                  <StatusBadge status={session.status} />
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {session.description}
                </p>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Usulan Mahasiswa: <strong className="font-mono">{session.requested_date}</strong></span>
                  </div>

                  {session.scheduled_at && (
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Jadwal Ditetapkan: <strong className="font-mono">{new Date(session.scheduled_at).toLocaleString('id-ID')}</strong></span>
                    </div>
                  )}

                  {session.location_or_link && (
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-medium">
                      <Video className="w-3.5 h-3.5" />
                      <span>Lokasi / Link: {session.location_or_link}</span>
                    </div>
                  )}
                </div>

                {session.supervisor_notes && (
                  <div className="p-3 bg-slate-100/70 dark:bg-slate-800/80 rounded-xl text-xs">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block mb-0.5">
                      Catatan / Arahan Dosen:
                    </span>
                    <p className="text-slate-600 dark:text-slate-300">
                      {session.supervisor_notes}
                    </p>
                  </div>
                )}
              </div>

              {isLecturer && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedSession(session);
                      setManageStatus(session.status);
                      setLocationOrLink(session.location_or_link || '');
                      setSupervisorNotes(session.supervisor_notes || '');
                      setShowManageModal(true);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Jadwalkan / Beri Catatan</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal 1: Request Guidance */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Ajukan Jadwal Bimbingan PKN"
        subtitle="Konsultasikan progres laporan bab, diagram sistem, atau kendala lapangan"
        maxWidth="md"
      >
        <form onSubmit={handleRequestGuidance} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tanggal yang Diusulkan *
            </label>
            <input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Topik Pembahasan Bimbingan *
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Contoh: Konsultasi Bab 3 Metodologi & Arsitektur Microservices"
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deskripsi Materi / Pertanyaan yang Diajukan *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan hal-hal spesifik yang ingin dikonsultasikan dengan dosen pembimbing..."
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowRequestModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 shadow-xs"
            >
              Kirim Permintaan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Manage Guidance (Dosen) */}
      <Modal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        title="Kelola Sesi Bimbingan"
        subtitle={`Mahasiswa: ${selectedSession?.student_name} (${selectedSession?.student_nim})`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Status Bimbingan
            </label>
            <select
              value={manageStatus}
              onChange={(e) => setManageStatus(e.target.value as GuidanceStatus)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            >
              <option value="scheduled">Terjadwal (Scheduled)</option>
              <option value="completed">Selesai Terlaksana (Completed)</option>
              <option value="requested">Masih Menunggu Jadwal (Requested)</option>
              <option value="cancelled">Dibatalkan (Cancelled)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Jadwal Waktu Pertemuan
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lokasi Ruangan / Tautan Google Meet
            </label>
            <input
              type="text"
              value={locationOrLink}
              onChange={(e) => setLocationOrLink(e.target.value)}
              placeholder="Contoh: Ruang Dosen GKB 3 Lt. 3 / https://meet.google.com/xxx-xxxx-xxx"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Arahan Hasil Bimbingan
            </label>
            <textarea
              rows={3}
              value={supervisorNotes}
              onChange={(e) => setSupervisorNotes(e.target.value)}
              placeholder="Tuliskan catatan perbaikan bab, poin arahan, atau tugas yang harus diselesaikan untuk bimbingan berikutnya..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowManageModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveManage}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 shadow-xs"
            >
              Simpan Sesi Bimbingan
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
