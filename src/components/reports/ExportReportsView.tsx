import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/db';
import { PKNRegistration, MBKMRegistration, Company, Assessment } from '../../types/database';
import { useNotifications } from '../../context/NotificationContext';
import { jsPDF } from 'jspdf';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Search,
  CheckCircle2,
  Building2,
  Calendar
} from 'lucide-react';

export const ExportReportsView: React.FC = () => {
  const { showToast } = useNotifications();

  const [pknList, setPknList] = useState<PKNRegistration[]>([]);
  const [mbkmList, setMbkmList] = useState<MBKMRegistration[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  const [reportType, setReportType] = useState<'pkn' | 'mbkm' | 'companies' | 'assessments'>('pkn');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      const [pkn, mbkm, comps, assess] = await Promise.all([
        dbService.getPKNRegistrations(),
        dbService.getMBKMRegistrations(),
        dbService.getCompanies(),
        dbService.getAssessments(),
      ]);
      setPknList(pkn);
      setMbkmList(mbkm);
      setCompanies(comps);
      setAssessments(assess);
    };
    fetchData();
  }, []);

  // Export to CSV
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[] = [];
    let filename = `laporan_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;

    if (reportType === 'pkn') {
      headers = ['NIM', 'Nama Mahasiswa', 'IPK', 'Instansi', 'Dosen Pembimbing', 'Pembimbing Lapangan', 'Mulai', 'Selesai', 'Status'];
      rows = pknList.map(r => [
        `"${r.student_nim}"`,
        `"${r.student_name}"`,
        r.student_gpa,
        `"${r.company_name}"`,
        `"${r.lecturer_name || '-'}"`,
        `"${r.field_supervisor_name || '-'}"`,
        r.start_date,
        r.end_date,
        r.status
      ]);
    } else if (reportType === 'mbkm') {
      headers = ['NIM', 'Nama Mahasiswa', 'Program MBKM', 'Mitra', 'Mulai', 'Selesai', 'Status'];
      rows = mbkmList.map(r => [
        `"${r.student_nim}"`,
        `"${r.student_name}"`,
        `"${r.program_title}"`,
        `"${r.partner_name}"`,
        r.start_date,
        r.end_date,
        r.status
      ]);
    } else if (reportType === 'companies') {
      headers = ['Nama Instansi', 'Sektor', 'Kota', 'Email', 'Telepon', 'Rekomendasi'];
      rows = companies.map(c => [
        `"${c.name}"`,
        `"${c.industry_sector}"`,
        `"${c.city}"`,
        `"${c.email}"`,
        `"${c.phone}"`,
        c.is_recommended ? 'Ya' : 'Tidak'
      ]);
    } else {
      headers = ['NIM', 'Nama Mahasiswa', 'Penilai', 'Peran', 'Total Nilai', 'Tanggal'];
      rows = assessments.map(a => [
        `"${a.student_nim}"`,
        `"${a.student_name}"`,
        `"${a.evaluator_name}"`,
        a.evaluator_role,
        a.total_score,
        a.submitted_at
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Ekspor CSV Berhasil', `File ${filename} telah diunduh.`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('LAPORAN RESMI SIMPKN & MBKM INFORMATIKA', 14, 20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Universitas Muhammadiyah Malang · Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')}`, 14, 26);
      doc.text(`Kategori Laporan: ${reportType.toUpperCase()}`, 14, 32);

      doc.setDrawColor(203, 213, 225);
      doc.line(14, 36, 196, 36);

      let y = 46;
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);

      if (reportType === 'pkn') {
        pknList.forEach((r, i) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.setFont('helvetica', 'bold');
          doc.text(`${i + 1}. ${r.student_name} (${r.student_nim}) - Status: ${r.status.toUpperCase()}`, 14, y);
          doc.setFont('helvetica', 'normal');
          doc.text(`   Instansi: ${r.company_name} | Dosen: ${r.lecturer_name || 'Belum ada'} | Periode: ${r.start_date} s/d ${r.end_date}`, 14, y + 5);
          y += 12;
        });
      } else if (reportType === 'mbkm') {
        mbkmList.forEach((r, i) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.setFont('helvetica', 'bold');
          doc.text(`${i + 1}. ${r.student_name} (${r.student_nim}) - ${r.program_title}`, 14, y);
          doc.setFont('helvetica', 'normal');
          doc.text(`   Mitra: ${r.partner_name} | Status: ${r.status}`, 14, y + 5);
          y += 12;
        });
      } else if (reportType === 'companies') {
        companies.forEach((c, i) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.setFont('helvetica', 'bold');
          doc.text(`${i + 1}. ${c.name} (${c.city}) - Sektor: ${c.industry_sector}`, 14, y);
          doc.setFont('helvetica', 'normal');
          doc.text(`   Kontak: ${c.email} | Telp: ${c.phone}`, 14, y + 5);
          y += 12;
        });
      }

      doc.save(`rekap_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('success', 'PDF Terbuat', `Dokumen laporan rekapitulasi PDF telah diunduh.`);
    } catch {
      showToast('error', 'Gagal Ekspor PDF', 'Terjadi kesalahan saat memproses file PDF.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Pusat Laporan Eksekutif & Ekspor Data
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Unduh rekapitulasi nilai, statistik mahasiswa PKN, peserta MBKM, dan direktori instansi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-2 shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor CSV / Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>Ekspor PDF Resmi</span>
          </button>
        </div>
      </div>

      {/* Select Report Type */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { id: 'pkn', label: 'Peserta & Status PKN', count: pknList.length },
          { id: 'mbkm', label: 'Program MBKM', count: mbkmList.length },
          { id: 'companies', label: 'Direktori Instansi', count: companies.length },
          { id: 'assessments', label: 'Rekapitulasi Nilai', count: assessments.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as any)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              reportType === tab.id
                ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/60 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
            }`}
          >
            <span className="text-xs text-slate-500 block">{tab.label}</span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {tab.count} data
            </div>
          </button>
        ))}
      </div>

      {/* Preview Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Pratinjau Data Laporan ({reportType.toUpperCase()})
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Siap diekspor ke CSV atau PDF
          </span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 sticky top-0 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">No</th>
                <th className="py-3 px-4 font-semibold">Identitas Utama</th>
                <th className="py-3 px-4 font-semibold">Keterangan / Instansi</th>
                <th className="py-3 px-4 font-semibold">Status / Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {reportType === 'pkn' && pknList.map((r, i) => (
                <tr key={r.id}>
                  <td className="py-3 px-4 font-mono">{i + 1}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                    {r.student_name} <span className="text-slate-400 font-mono">({r.student_nim})</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {r.company_name} · Periode: {r.start_date} s/d {r.end_date}
                  </td>
                  <td className="py-3 px-4 font-mono font-medium">{r.status}</td>
                </tr>
              ))}
              {reportType === 'mbkm' && mbkmList.map((r, i) => (
                <tr key={r.id}>
                  <td className="py-3 px-4 font-mono">{i + 1}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                    {r.student_name} <span className="text-slate-400 font-mono">({r.student_nim})</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {r.program_title} ({r.partner_name})
                  </td>
                  <td className="py-3 px-4 font-mono font-medium">{r.status}</td>
                </tr>
              ))}
              {reportType === 'companies' && companies.map((c, i) => (
                <tr key={c.id}>
                  <td className="py-3 px-4 font-mono">{i + 1}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                    {c.name}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {c.industry_sector} · {c.city} ({c.email})
                  </td>
                  <td className="py-3 px-4 font-mono font-medium">{c.is_recommended ? 'Unggulan' : 'Terdaftar'}</td>
                </tr>
              ))}
              {reportType === 'assessments' && assessments.map((a, i) => (
                <tr key={a.id}>
                  <td className="py-3 px-4 font-mono">{i + 1}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                    {a.student_name} <span className="text-slate-400 font-mono">({a.student_nim})</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    Penilai: {a.evaluator_name} ({a.evaluator_role})
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{a.total_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
