import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { dbService } from '../../services/db';
import {
  Assessment,
  AssessmentComponent,
  PKNRegistration,
  UserProfile
} from '../../types/database';
import { Modal } from '../common/Modal';
import {
  CheckSquare,
  Award,
  Calculator,
  UserCheck,
  Building2,
  FileText,
  AlertCircle,
  Save,
  CheckCircle2,
  Plus,
  Trash2
} from 'lucide-react';

export const AssessmentsView: React.FC = () => {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();

  const [registrations, setRegistrations] = useState<PKNRegistration[]>([]);
  const [components, setComponents] = useState<AssessmentComponent[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  // Assessment Input Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedReg, setSelectedReg] = useState<PKNRegistration | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');

  // Component Management Modal (Admin)
  const [showCompModal, setShowCompModal] = useState(false);
  const [compName, setCompName] = useState('');
  const [compCode, setCompCode] = useState('');
  const [compRole, setCompRole] = useState<'dosen' | 'pembimbing_lapangan'>('dosen');
  const [compWeight, setCompWeight] = useState(20);
  const [compDesc, setCompDesc] = useState('');

  const isDosen = role === 'dosen_pembimbing';
  const isPL = role === 'pembimbing_lapangan';
  const isAdmin = role === 'admin_pkn' || role === 'super_admin';
  const isEvaluator = isDosen || isPL || isAdmin;
  const isMahasiswa = role === 'mahasiswa';

  const loadData = async () => {
    const [allRegs, allComps, allAssess] = await Promise.all([
      dbService.getPKNRegistrations(),
      dbService.getAssessmentComponents(),
      dbService.getAssessments(),
    ]);

    setRegistrations(allRegs);
    setComponents(allComps);
    setAssessments(allAssess);
  };

  useEffect(() => {
    loadData();
    const unsubAssess = dbService.subscribe('assessments', loadData);
    const unsubRegs = dbService.subscribe('pkn_registrations', loadData);
    const unsubComps = dbService.subscribe('assessment_components', loadData);
    return () => {
      unsubAssess();
      unsubRegs();
      unsubComps();
    };
  }, []);

  const openAssessmentModal = (reg: PKNRegistration) => {
    setSelectedReg(reg);
    const evaluatorRole = isPL ? 'pembimbing_lapangan' : 'dosen';
    const existing = assessments.find(a => a.registration_id === reg.id && a.evaluator_role === evaluatorRole);
    const activeComps = components.filter(c => c.evaluator_role === evaluatorRole);

    const initialScores: Record<string, number> = {};
    if (activeComps.length > 0) {
      activeComps.forEach(c => {
        initialScores[c.code] = existing?.scores[c.code] ?? 85;
      });
    } else {
      initialScores['nilai_keseluruhan'] = existing?.total_score ?? 85;
    }

    setScores(initialScores);
    setNotes(existing?.notes || '');
    setShowModal(true);
  };

  const calculateSubtotal = () => {
    const evaluatorRole = isPL ? 'pembimbing_lapangan' : 'dosen';
    const activeComps = components.filter(c => c.evaluator_role === evaluatorRole);
    if (activeComps.length === 0) {
      return Number(scores['nilai_keseluruhan'] ?? 0);
    }

    let sumWeighted = 0;
    let sumWeight = 0;

    activeComps.forEach(c => {
      const val = scores[c.code] || 0;
      sumWeighted += val * (c.weight_percentage / 50);
      sumWeight += c.weight_percentage / 50;
    });

    return sumWeight > 0 ? sumWeighted / sumWeight : 0;
  };

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReg || !user) return;

    const evaluatorRole = isPL ? 'pembimbing_lapangan' : 'dosen';
    const totalScore = parseFloat(calculateSubtotal().toFixed(2));

    try {
      await dbService.saveAssessment({
        registration_id: selectedReg.id,
        student_id: selectedReg.student_id,
        student_name: selectedReg.student_name,
        student_nim: selectedReg.student_nim,
        evaluator_id: user.id,
        evaluator_name: user.full_name,
        evaluator_role: evaluatorRole,
        scores,
        total_score: totalScore,
        notes,
      });

      await dbService.createNotification({
        user_id: selectedReg.student_id,
        title: 'Penilaian Baru Telah Masuk',
        message: `${user.full_name} (${evaluatorRole === 'dosen' ? 'Dosen Pembimbing' : 'Pembimbing Lapangan'}) telah menginputkan skor evaluasi Anda.`,
        type: 'success',
        action_url: '/assessments',
      });

      dbService.logActivity(user.id, user.full_name, user.role, 'SUBMIT_ASSESSMENT', 'assessment', selectedReg.id, `Penilaian ${evaluatorRole} untuk mahasiswa ${selectedReg.student_name}: Skor ${totalScore}`);

      showToast('success', 'Penilaian Berhasil Disimpan', 'Nilai tersimpan di database Supabase dan langsung memperbarui rekap nilai akhir.');
      setShowModal(false);
      loadData();
    } catch (err) {
      showToast('error', 'Gagal Menyimpan Nilai', err instanceof Error ? err.message : 'Gagal menyimpan penilaian ke Supabase.');
    }
  };

  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim() || !compCode.trim()) return;
    try {
      await dbService.createAssessmentComponent({
        name: compName.trim(),
        code: compCode.trim().toLowerCase().replace(/\s+/g, '_'),
        evaluator_role: compRole,
        weight_percentage: Number(compWeight),
        description: compDesc.trim(),
        is_active: true,
      });
      showToast('success', 'Komponen Ditambahkan', 'Komponen penilaian berhasil disimpan ke Supabase.');
      setShowCompModal(false);
      setCompName('');
      setCompCode('');
      setCompDesc('');
      loadData();
    } catch (err) {
      showToast('error', 'Gagal Menambah Komponen', err instanceof Error ? err.message : 'Gagal menyimpan ke Supabase.');
    }
  };

  const handleDeleteComponent = async (id: string) => {
    try {
      await dbService.deleteAssessmentComponent(id);
      showToast('info', 'Komponen Dihapus', 'Komponen penilaian dihapus dari database Supabase.');
      loadData();
    } catch (err) {
      showToast('error', 'Gagal Menghapus', err instanceof Error ? err.message : 'Gagal menghapus dari Supabase.');
    }
  };

  // Letter Grade Helper
  const getLetterGrade = (score: number) => {
    if (score >= 80) return 'A';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'C+';
    if (score >= 56) return 'C';
    if (score >= 45) return 'D';
    return 'E';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Sistem Penilaian Terpadu PKN & Rekapitulasi Nilai
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Integrasi nilai Dosen Pembimbing (50%) dan Nilai Pembimbing Lapangan Industri (50%)
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCompModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Komponen Nilai</span>
          </button>
        )}
      </div>

      {/* Assessment Components Breakdown Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dosen Components */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Komponen Penilaian Dosen Pembimbing (50%)</span>
            </span>
          </div>
          <div className="space-y-2">
            {components.filter(c => c.evaluator_role === 'dosen').length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                Belum ada komponen rubrik khusus di Supabase. Penilaian menggunakan skor akhir langsung (0–100).
              </p>
            ) : (
              components.filter(c => c.evaluator_role === 'dosen').map(c => (
                <div key={c.id} className="flex items-center justify-between text-xs py-1 gap-2">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">{c.name}</span>
                    <span className="text-[11px] text-slate-400">{c.description}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{c.weight_percentage}%</span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComponent(c.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Hapus komponen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pembimbing Lapangan Components */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Komponen Penilaian Pembimbing Lapangan (50%)</span>
            </span>
          </div>
          <div className="space-y-2">
            {components.filter(c => c.evaluator_role === 'pembimbing_lapangan').length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                Belum ada komponen rubrik khusus di Supabase. Penilaian menggunakan skor akhir langsung (0–100).
              </p>
            ) : (
              components.filter(c => c.evaluator_role === 'pembimbing_lapangan').map(c => (
                <div key={c.id} className="flex items-center justify-between text-xs py-1 gap-2">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">{c.name}</span>
                    <span className="text-[11px] text-slate-400">{c.description}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{c.weight_percentage}%</span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComponent(c.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Hapus komponen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Rekap Nilai Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Rekapitulasi Nilai PKN Mahasiswa
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Kalkulasi otomatis nilai gabungan, nilai huruf, dan status kelulusan kegiatan
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Mahasiswa</th>
                <th className="py-3 px-4 font-semibold">Instansi PKN</th>
                <th className="py-3 px-4 font-semibold text-center">Nilai Dosen (50%)</th>
                <th className="py-3 px-4 font-semibold text-center">Nilai Industri (50%)</th>
                <th className="py-3 px-4 font-semibold text-center">Nilai Akhir</th>
                <th className="py-3 px-4 font-semibold text-center">Grade</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {registrations
                .filter(r => !isMahasiswa || r.student_id === user?.id)
                .map((r) => {
                  const dosenAssess = assessments.find(a => a.registration_id === r.id && a.evaluator_role === 'dosen');
                  const plAssess = assessments.find(a => a.registration_id === r.id && a.evaluator_role === 'pembimbing_lapangan');

                  const dosenScore = dosenAssess ? Number(dosenAssess.total_score) : null;
                  const plScore = plAssess ? Number(plAssess.total_score) : null;

                  let finalScore = null;
                  if (dosenScore !== null && plScore !== null) {
                    finalScore = Number(((dosenScore * 0.5) + (plScore * 0.5)).toFixed(2));
                  } else if (dosenScore !== null) {
                    finalScore = Number(dosenScore.toFixed(2));
                  } else if (plScore !== null) {
                    finalScore = Number(plScore.toFixed(2));
                  }

                  const letter = finalScore !== null ? getLetterGrade(finalScore) : '-';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                          {r.student_name}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          NIM {r.student_nim}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        {r.company_name}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-medium">
                        {dosenScore !== null ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{dosenScore}</span>
                        ) : (
                          <span className="text-slate-400">Belum Ada</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-medium">
                        {plScore !== null ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">{plScore}</span>
                        ) : (
                          <span className="text-slate-400">Belum Ada</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                        {finalScore !== null ? finalScore : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold">
                        <span className={letter === 'A' || letter === 'B+' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}>
                          {letter}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isEvaluator && !isMahasiswa && (
                          <button
                            onClick={() => openAssessmentModal(r)}
                            className="px-3 py-1.5 text-[11px] font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
                          >
                            Input Skor
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assessment Scoring Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Formulir Evaluasi & Penilaian PKN"
        subtitle={`Mahasiswa: ${selectedReg?.student_name} (${selectedReg?.student_nim}) · Peran: ${isPL ? 'Pembimbing Lapangan' : 'Dosen Pembimbing'}`}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAssessment} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 text-xs flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-300">Total Skor Sub-Komponen Saat Ini:</span>
            <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
              {calculateSubtotal().toFixed(1)} / 100
            </span>
          </div>

          <div className="space-y-3">
            {components.filter(c => c.evaluator_role === (isPL ? 'pembimbing_lapangan' : 'dosen')).length === 0 ? (
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                      Nilai Evaluasi Keseluruhan
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Skor akhir penilai (0–100)
                    </span>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={scores['nilai_keseluruhan'] ?? 85}
                      onChange={(e) => setScores({ ...scores, nilai_keseluruhan: Number(e.target.value) })}
                      required
                      className="w-full px-2 py-1.5 text-xs text-center font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            ) : (
              components
                .filter(c => c.evaluator_role === (isPL ? 'pembimbing_lapangan' : 'dosen'))
                .map(c => (
                  <div key={c.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                          {c.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Bobot: {c.weight_percentage}% · {c.description}
                        </span>
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={scores[c.code] ?? 85}
                          onChange={(e) => setScores({ ...scores, [c.code]: Number(e.target.value) })}
                          required
                          className="w-full px-2 py-1.5 text-xs text-center font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Evaluasi & Rekomendasi
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Berikan apresiasi, feedback peningkatan performa, atau catatan khusus..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
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
              Simpan Penilaian
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Component Modal (Admin) */}
      <Modal
        isOpen={showCompModal}
        onClose={() => setShowCompModal(false)}
        title="Tambah Komponen Rubrik Penilaian"
        maxWidth="md"
      >
        <form onSubmit={handleCreateComponent} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Komponen *
            </label>
            <input
              type="text"
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
              placeholder="Contoh: Kualitas Laporan & Analisis Teknis"
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kode Unik *
              </label>
              <input
                type="text"
                value={compCode}
                onChange={(e) => setCompCode(e.target.value)}
                placeholder="misal: laporan_teknis"
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bobot (%) *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={compWeight}
                onChange={(e) => setCompWeight(Number(e.target.value))}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Penilai
            </label>
            <select
              value={compRole}
              onChange={(e) => setCompRole(e.target.value as 'dosen' | 'pembimbing_lapangan')}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            >
              <option value="dosen">Dosen Pembimbing</option>
              <option value="pembimbing_lapangan">Pembimbing Lapangan</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deskripsi Kriteria
            </label>
            <textarea
              rows={2}
              value={compDesc}
              onChange={(e) => setCompDesc(e.target.value)}
              placeholder="Indikator penilaian..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowCompModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 shadow-xs"
            >
              Simpan Komponen
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
