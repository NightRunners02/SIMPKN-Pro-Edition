import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { dbService } from '../../services/db';
import { Certificate, PKNRegistration, PKNReport, Assessment } from '../../types/database';
import { jsPDF } from 'jspdf';
import {
  Award,
  Download,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  FileText,
  Printer,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export const CertificateView: React.FC = () => {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [registrations, setRegistrations] = useState<PKNRegistration[]>([]);
  const [reports, setReports] = useState<PKNReport[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  const isMahasiswa = role === 'mahasiswa';
  const isAdmin = role === 'admin_pkn' || role === 'super_admin';

  const loadData = async () => {
    const [allCerts, allRegs, allReports, allAssess] = await Promise.all([
      dbService.getCertificates(),
      dbService.getPKNRegistrations(),
      dbService.getPKNReports(),
      dbService.getAssessments(),
    ]);

    setCertificates(allCerts);
    setRegistrations(allRegs);
    setReports(allReports);
    setAssessments(allAssess);
  };

  useEffect(() => {
    loadData();
    const unsub = dbService.subscribe('certificates', loadData);
    return () => unsub();
  }, []);

  // For mahasiswa: check completion requirements
  const myReg = registrations.find(r => r.student_id === user?.id);
  const myReport = reports.filter(r => r.student_id === user?.id).pop();
  const myAssessments = assessments.filter(a => a.student_id === user?.id);

  const hasDosenScore = myAssessments.some(a => a.evaluator_role === 'dosen');
  const hasPlScore = myAssessments.some(a => a.evaluator_role === 'pembimbing_lapangan');
  const isReportApproved = myReport?.status === 'approved';
  const isPknApprovedOrCompleted = myReg?.status === 'completed' || myReg?.status === 'approved';

  const isEligible = isPknApprovedOrCompleted && isReportApproved && hasDosenScore && hasPlScore;
  const myCertificate = certificates.find(c => c.student_id === user?.id);

  // Generate / Claim Certificate
  const handleClaimCertificate = async () => {
    if (!user || !myReg) return;

    const dosenAssess = myAssessments.find(a => a.evaluator_role === 'dosen');
    const plAssess = myAssessments.find(a => a.evaluator_role === 'pembimbing_lapangan');

    const totalScore = Number((((dosenAssess?.total_score || 90) * 0.5) + ((plAssess?.total_score || 90) * 0.5)).toFixed(2));
    const grade = totalScore >= 80 ? 'A' : totalScore >= 75 ? 'B+' : 'B';

    const certNum = `UMM/FT-INF/PKN/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
    const verifCode = `VERIF-UMM-PKN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const newCert = await dbService.createCertificate({
      student_id: user.id,
      student_name: user.full_name,
      student_nim: user.identifier,
      registration_id: myReg.id,
      program_type: 'PKN',
      company_name: myReg.company_name,
      certificate_number: certNum,
      issue_date: new Date().toISOString().split('T')[0],
      start_date: myReg.start_date,
      end_date: myReg.end_date,
      signer_name: 'Ir. Galih Wasis Wicaksono, S.Kom., M.Cs.',
      signer_nip: '10814100523PNS',
      signer_position: 'Ketua Program Studi Informatika UMM',
      verification_code: verifCode,
      final_grade: grade,
      final_score: totalScore,
    });

    dbService.logActivity(user.id, user.full_name, user.role, 'CLAIM_CERTIFICATE', 'certificate', newCert.id, `Mahasiswa menerbitkan sertifikat PKN resmi: ${certNum}`);

    showToast('success', 'Sertifikat Diterbitkan!', 'Selamat! Sertifikat resmi PKN Anda telah siap diunduh.');
    loadData();
  };

  // Download PDF using jsPDF
  const handleDownloadPDF = (cert: Certificate) => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Background border
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(1.5);
      doc.rect(10, 10, 277, 190);

      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(0.5);
      doc.rect(13, 13, 271, 184);

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text('UNIVERSITAS MUHAMMADIYAH MALANG', 148.5, 32, { align: 'center' });

      doc.setFontSize(13);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('FAKULTAS TEKNIK - PROGRAM STUDI INFORMATIKA', 148.5, 40, { align: 'center' });
      doc.setFontSize(10);
      doc.text('Terakreditasi UNGGUL (Lam Infokom) · Jl. Raya Tlogomas No. 246 Malang', 148.5, 46, { align: 'center' });

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(180, 83, 9);
      doc.text('SERTIFIKAT KELULUSAN PKN', 148.5, 66, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Nomor: ${cert.certificate_number}`, 148.5, 73, { align: 'center' });

      // Body text
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85);
      doc.text('Diberikan kepada mahasiswa:', 148.5, 88, { align: 'center' });

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(cert.student_name.toUpperCase(), 148.5, 100, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`NIM: ${cert.student_nim}`, 148.5, 108, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      const textLine = `Telah menyelesaikan Praktik Kerja Nyata (PKN) di ${cert.company_name}`;
      const textLine2 = `pada periode ${cert.start_date} sampai dengan ${cert.end_date} dengan predikat kelulusan memuaskan.`;
      doc.text(textLine, 148.5, 120, { align: 'center' });
      doc.text(textLine2, 148.5, 126, { align: 'center' });

      // Grade box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129);
      doc.text(`NILAI AKHIR: ${cert.final_score} (GRADE ${cert.final_grade})`, 148.5, 138, { align: 'center' });

      // Signature & QR
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Diterbitkan di Malang, ${cert.issue_date}`, 215, 155, { align: 'center' });
      doc.text(cert.signer_position, 215, 161, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(cert.signer_name, 215, 182, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`NIP: ${cert.signer_nip}`, 215, 187, { align: 'center' });

      // Verification Code
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Kode Verifikasi Keaslian Ijazah/Sertifikat:`, 40, 175);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(cert.verification_code, 40, 180);

      doc.save(`Sertifikat_PKN_${cert.student_nim}_${cert.student_name.replace(/\s+/g, '_')}.pdf`);
      showToast('success', 'PDF Diunduh', 'File sertifikat PDF resmi telah disimpan di perangkat Anda.');
    } catch {
      showToast('error', 'Gagal Membuat PDF', 'Terjadi kendala saat merender dokumen PDF.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Penerbitan Sertifikat Kelulusan PKN Digital
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sertifikat resmi bertanda tangan digital dan kode verifikasi keabsahan Program Studi Informatika UMM
          </p>
        </div>
      </div>

      {/* Mahasiswa Eligibility Check Box */}
      {isMahasiswa && !myCertificate && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Syarat Kelayakan Penerbitan Sertifikat PKN
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`p-3 rounded-xl border text-xs ${isPknApprovedOrCompleted ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900 dark:text-slate-100">1. Status PKN</span>
                {isPknApprovedOrCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
              </div>
              <span className="text-slate-500">{isPknApprovedOrCompleted ? 'Selesai Dilaksanakan' : 'Belum Selesai'}</span>
            </div>

            <div className={`p-3 rounded-xl border text-xs ${isReportApproved ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900 dark:text-slate-100">2. Laporan Disetujui</span>
                {isReportApproved ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
              </div>
              <span className="text-slate-500">{isReportApproved ? 'Laporan Final Lolos' : 'Menunggu Review Dosen'}</span>
            </div>

            <div className={`p-3 rounded-xl border text-xs ${hasDosenScore ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900 dark:text-slate-100">3. Nilai Dosen</span>
                {hasDosenScore ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
              </div>
              <span className="text-slate-500">{hasDosenScore ? 'Telah Diinput' : 'Belum Lengkap'}</span>
            </div>

            <div className={`p-3 rounded-xl border text-xs ${hasPlScore ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900 dark:text-slate-100">4. Nilai Industri</span>
                {hasPlScore ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
              </div>
              <span className="text-slate-500">{hasPlScore ? 'Telah Diinput' : 'Belum Lengkap'}</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {isEligible ? 'Seluruh persyaratan telah terpenuhi. Silakan klaim sertifikat Anda.' : 'Penuhi seluruh 4 persyaratan di atas untuk menerbitkan sertifikat.'}
            </span>
            <button
              onClick={handleClaimCertificate}
              disabled={!isEligible}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
            >
              Terbitkan Sertifikat Saya
            </button>
          </div>
        </div>
      )}

      {/* Certificate Showcase Cards */}
      <div className="space-y-6">
        {certificates
          .filter(c => !isMahasiswa || c.student_id === user?.id)
          .map((cert) => (
            <div
              key={cert.id}
              className="p-8 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg relative overflow-hidden"
            >
              {/* Header Certificate Mockup */}
              <div className="text-center pb-6 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                  UNIVERSITAS MUHAMMADIYAH MALANG · FAKULTAS TEKNIK
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                  SERTIFIKAT KELULUSAN PRAKTIK KERJA NYATA
                </h3>
                <span className="text-xs font-mono text-slate-400 mt-1 block">
                  Nomor Sertifikat: {cert.certificate_number}
                </span>
              </div>

              {/* Student details */}
              <div className="py-8 text-center space-y-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider">
                  Diberikan kepada mahasiswa:
                </span>
                <h4 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {cert.student_name}
                </h4>
                <span className="text-xs font-mono text-slate-500 block">
                  Nomor Induk Mahasiswa (NIM): {cert.student_nim}
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl mx-auto pt-2 leading-relaxed">
                  Telah berhasil menyelesaikan seluruh rangkaian program Praktik Kerja Nyata (PKN) pada mitra instansi <strong className="text-slate-900 dark:text-slate-100">{cert.company_name}</strong> periode <span className="font-mono">{cert.start_date}</span> sampai <span className="font-mono">{cert.end_date}</span> dengan predikat memuaskan.
                </p>

                <div className="inline-block mt-4 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  Nilai Akhir: {cert.final_score} (Grade {cert.final_grade})
                </div>
              </div>

              {/* Footer Signer & QR */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    <span className="block font-semibold text-slate-600 dark:text-slate-300">Kode Keaslian:</span>
                    <span>{cert.verification_code}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-mono">Malang, {cert.issue_date}</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block mt-1">
                    {cert.signer_name}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {cert.signer_position}
                  </span>
                </div>
              </div>

              {/* Action Download */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => handleDownloadPDF(cert)}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Dokumen PDF Resmi</span>
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
