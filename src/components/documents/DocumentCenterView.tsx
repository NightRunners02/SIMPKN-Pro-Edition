import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { dbService } from '../../services/db';
import { PKNRegistration, PKNReport, Certificate } from '../../types/database';
import { Modal } from '../common/Modal';
import {
  FolderArchive,
  FileText,
  Upload,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Trash2,
  Search,
  Filter
} from 'lucide-react';

interface DocumentItem {
  id: string;
  name: string;
  category: 'Surat Pengajuan' | 'Surat Penerimaan' | 'Lampiran KRS' | 'Laporan PKN' | 'Sertifikat' | 'Transkrip';
  ownerName: string;
  ownerIdentifier: string;
  uploadedAt: string;
  fileUrl: string;
  fileSize: string;
  verificationStatus: 'verified' | 'pending' | 'rejected';
}

export const DocumentCenterView: React.FC = () => {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentItem['category']>('Surat Penerimaan');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isMahasiswa = role === 'mahasiswa';

  const loadDocuments = async () => {
    const [regs, reports, certs] = await Promise.all([
      dbService.getPKNRegistrations(),
      dbService.getPKNReports(),
      dbService.getCertificates(),
    ]);

    const items: DocumentItem[] = [];

    regs.forEach(r => {
      const krsUrl = r.krs_url || r.proposal_url;
      if (krsUrl) {
        items.push({
          id: `krs-${r.id}`,
          name: `Scan Lampiran KRS PKN - ${r.student_name}`,
          category: 'Lampiran KRS',
          ownerName: r.student_name,
          ownerIdentifier: r.student_nim,
          uploadedAt: r.submitted_at,
          fileUrl: krsUrl,
          fileSize: 'Lampiran KRS',
          verificationStatus: r.status === 'approved' ? 'verified' : 'pending',
        });
      }
      if (r.acceptance_letter_url) {
        items.push({
          id: `acc-${r.id}`,
          name: `Surat Penerimaan ${r.company_name} - ${r.student_name}`,
          category: 'Surat Penerimaan',
          ownerName: r.student_name,
          ownerIdentifier: r.student_nim,
          uploadedAt: r.submitted_at,
          fileUrl: r.acceptance_letter_url,
          fileSize: '950 KB',
          verificationStatus: r.status === 'approved' ? 'verified' : 'pending',
        });
      }
    });

    reports.forEach(rep => {
      items.push({
        id: `rep-${rep.id}`,
        name: `${rep.title} (Versi ${rep.version})`,
        category: 'Laporan PKN',
        ownerName: rep.student_name,
        ownerIdentifier: rep.student_nim,
        uploadedAt: rep.submitted_at,
        fileUrl: rep.report_file_url,
        fileSize: '4.2 MB',
        verificationStatus: rep.status === 'approved' ? 'verified' : 'pending',
      });
    });

    certs.forEach(cert => {
      items.push({
        id: `cert-${cert.id}`,
        name: `Sertifikat PKN ${cert.certificate_number}`,
        category: 'Sertifikat',
        ownerName: cert.student_name,
        ownerIdentifier: cert.student_nim,
        uploadedAt: cert.created_at,
        fileUrl: '#',
        fileSize: '820 KB',
        verificationStatus: 'verified',
      });
    });

    setDocuments(items);
  };

  useEffect(() => {
    loadDocuments();
  }, [user]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !docName) {
      showToast('error', 'Validasi Gagal', 'Harap lengkapi nama dokumen.');
      return;
    }

    try {
      let url = '#';
      if (selectedFile) {
        url = await dbService.uploadFile('pkn-requirements', `docs/${user.identifier}_${selectedFile.name}`, selectedFile);
      }

      const newItem: DocumentItem = {
        id: dbService.generateId(),
        name: docName,
        category: docCategory,
        ownerName: user.full_name,
        ownerIdentifier: user.identifier,
        uploadedAt: new Date().toISOString(),
        fileUrl: url,
        fileSize: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : '0.0 MB',
        verificationStatus: 'pending',
      };

      setDocuments([newItem, ...documents]);
      dbService.logActivity(user.id, user.full_name, user.role, 'UPLOAD_DOCUMENT', 'document', newItem.id, `Mahasiswa mengunggah berkas: ${docName}`);
      showToast('success', 'Dokumen Diunggah', 'Berkas berhasil disimpan di Document Center.');
      setShowUploadModal(false);
      setDocName('');
      setSelectedFile(null);
    } catch (err) {
      showToast('error', 'Gagal Mengunggah', err instanceof Error ? err.message : 'Gagal mengunggah dokumen ke Supabase Storage.');
    }
  };

  const filtered = documents.filter(d => {
    if (isMahasiswa && d.ownerIdentifier !== user?.identifier) return false;
    if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return d.name.toLowerCase().includes(q) || d.ownerName.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Document Center (Pusat Arsip Dokumen Digital)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola scan lampiran KRS, surat balasan instansi, draf bab laporan, dan sertifikat terintegrasi
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>Unggah Berkas Baru</span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berkas dokumen atau nama..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
          >
            <option value="all">Semua Kategori</option>
            <option value="Lampiran KRS">Scan Lampiran KRS PKN</option>
            <option value="Surat Penerimaan">Surat Penerimaan</option>
            <option value="Laporan PKN">Laporan PKN</option>
            <option value="Sertifikat">Sertifikat</option>
          </select>
        </div>
      </div>

      {/* Document List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Nama Dokumen</th>
                <th className="py-3 px-4 font-semibold">Kategori</th>
                <th className="py-3 px-4 font-semibold">Pemilik</th>
                <th className="py-3 px-4 font-semibold font-mono">Ukuran</th>
                <th className="py-3 px-4 font-semibold">Tanggal Unggah</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {doc.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {doc.category}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-800 dark:text-slate-200 block font-medium">
                      {doc.ownerName}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      NIM {doc.ownerIdentifier}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {doc.fileSize}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {new Date(doc.uploadedAt).toLocaleDateString('id-ID')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Buka</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Unggah Dokumen ke Document Center"
        maxWidth="md"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kategori Dokumen *
            </label>
            <select
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            >
              <option value="Surat Penerimaan">Surat Penerimaan Instansi</option>
              <option value="Lampiran KRS">Scan Lampiran KRS PKN</option>
              <option value="Laporan PKN">Laporan PKN</option>
              <option value="Transkrip">Transkrip Nilai Sementara</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama / Judul Dokumen *
            </label>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Contoh: Surat Balasan PT Telkom Witel Malang"
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Berkas File (PDF, PNG, JPG)
            </label>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
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
              Simpan Dokumen
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
