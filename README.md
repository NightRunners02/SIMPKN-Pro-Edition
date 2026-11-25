<div align="center">

# SIMPKN Pro Edition
### Sistem Informasi Praktik Kerja Nyata (PKN) & MBKM — Informatika UMM

Platform manajemen akademik terintegrasi untuk mengelola seluruh siklus **Praktik Kerja Nyata (PKN)**, magang industri, dan program **Merdeka Belajar Kampus Merdeka (MBKM)** Program Studi Informatika secara *real-time* di atas **Supabase** dan **Vercel**.

[![Live Demo](https://img.shields.io/badge/Live_App-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://simpkn-pro-edition.vercel.app/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%26_Realtime-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Apache_2.0-D22128?style=for-the-badge&logo=apache&logoColor=white)](https://www.apache.org/licenses/LICENSE-2.0)

</div>

---

## Daftar Isi

- [Tentang Aplikasi](#-tentang-aplikasi)
- [Fitur Utama](#-fitur-utama)
- [Hak Akses & Peran Pengguna (RBAC)](#-hak-akses--peran-pengguna-rbac)
- [Arsitektur & Teknologi](#-arsitektur--teknologi)
- [Skema Database & Storage Supabase](#-skema-database--storage-supabase)
- [Struktur Direktori](#-struktur-direktori)
- [Instalasi & Pengembangan Lokal](#-instalasi--pengembangan-lokal)
- [Panduan Deploy ke Vercel](#-panduan-deploy-ke-vercel)
- [Skrip NPM](#-skrip-npm)

---

## Tentang Aplikasi

**SIMPKN (Sistem Informasi PKN & MBKM)** mendigitalisasi alur administrasi, bimbingan, monitoring kegiatan harian, hingga penilaian akhir dan penerbitan sertifikat PKN/MBKM. Seluruh proses **CRUD**, penyimpanan berkas, dan notifikasi berjalan secara langsung (*real-time*) menggunakan **Supabase PostgreSQL**, **Supabase Storage**, dan **Supabase Realtime** tanpa data statis atau dummy.

---

## Fitur Utama

### 1. Autentikasi & Manajemen Akun Berbasis Identitas Akademik
- **Login Tanpa Verifikasi Email**: Mahasiswa masuk menggunakan **NIM**, Dosen menggunakan **NIDN**, Koordinator/Pembimbing Lapangan menggunakan **NIP / ID Mitra**, dan Super Admin menggunakan **Username**.
- **Registrasi Mahasiswa Mandiri & Reset Kata Sandi**: Verifikasi kredensial tersimpan aman di Supabase dengan hashing `SHA-256`.
- **Pengaturan Profil Universal (Semua Role)**: Setiap peran dapat memperbarui data profil, kontak, informasi akademik/instansi, mengunggah foto profil ke Supabase Storage, mengganti kata sandi, serta memilih tema **Light / Dark Mode**.

### 2. Siklus Pendaftaran & Pelaksanaan PKN
- **Pendaftaran PKN Individu & Kelompok**: Mahasiswa dapat mendaftarkan diri beserta hingga **4 anggota kelompok** yang dipilih langsung dari daftar mahasiswa terdaftar di sistem, dilengkapi unggah **Scan Lampiran KRS PKN** dan surat penerimaan instansi.
- **Verifikasi & Penugasan Pembimbing**: Koordinator/Admin PKN memverifikasi berkas pengajuan dan menetapkan **Dosen Pembimbing Akademik** serta **Pembimbing Lapangan**.
- **Jurnal Kegiatan Harian (*Daily Logs*)**: Pencatatan aktivitas harian lengkap dengan lampiran bukti kegiatan dan peninjauan/revisi oleh dosen maupun pembimbing industri.
- **Konsultasi Bimbingan & Laporan Akhir**: Penjadwalan sesi bimbingan, unggah revisi naskah laporan berversi (*versioning*), dan umpan balik terstruktur.

### 3. Penilaian, MBKM & Sertifikasi Digital
- **Rubrik Penilaian Terbobot**: Pengelolaan komponen rubrik penilaian serta kalkulasi nilai gabungan antara **Dosen Pembimbing** dan **Pembimbing Lapangan**.
- **Program MBKM & Konversi 20 SKS**: Katalog program MBKM, pendaftaran peserta, dan pengajuan ekuivalensi mata kuliah hingga 20 SKS.
- **Sertifikat Digital PDF & Document Center**: Generator sertifikat kelulusan berbasis `jsPDF` lengkap dengan kode verifikasi serta pusat arsip dokumen terintegrasi.
- **Audit Trail & Pusat Pengumuman**: Pencatatan log aktivitas sistem secara otomatis dan penyebaran pengumuman resmi berdasarkan peran target.

### 4. Antarmuka Akademik Modern & Responsif
- **Navigasi Sidebar & Hamburger Control**: Sidebar responsif dengan tombol *collapse/expand* di desktop, *slide-over drawer* di mobile, serta pencarian menu cepat (*Quick-Jump Search*) di navbar.
- **Notifikasi Real-time**: Sinkronisasi perubahan status pengajuan, penugasan kelompok, dan bimbingan secara instan menggunakan `postgres_changes`.

---

## Hak Akses & Peran Pengguna (RBAC)

| Role | ID Login | Ringkasan Hak Akses |
| :--- | :--- | :--- |
| **Super Admin** | Username | Kontrol penuh seluruh sistem, manajemen pengguna & role, audit trail log aktivitas, konfigurasi parameter akademik, dan utilitas skema SQL Supabase. |
| **Admin PKN / Koordinator** | NIP / NIDN | Verifikasi pendaftaran PKN & MBKM, penugasan dosen & pembimbing lapangan, pengelolaan mitra instansi, monitoring jurnal/laporan, rekap nilai, konversi SKS, sertifikat, dan pengumuman. |
| **Dosen Pembimbing** | NIDN | Memantau mahasiswa bimbingan, verifikasi jurnal kegiatan harian, konsultasi bimbingan, review/revisi laporan akhir, dan input nilai akademik. |
| **Pembimbing Lapangan** | NIP / ID Mitra | Memantau mahasiswa binaan di instansi, meninjau aktivitas harian, memberikan catatan industri, dan mengisi penilaian lapangan. |
| **Mahasiswa** | NIM | Registrasi mandiri, pengajuan PKN kelompok (maks. 4 anggota) + KRS, jurnal harian, bimbingan dosen, unggah laporan akhir, pengajuan MBKM & konversi 20 SKS, Document Center, dan unduh sertifikat. |

---

## Arsitektur & Teknologi

| Lapisan | Teknologi | Kegunaan |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 8 | SPA modular dengan *type-safety* penuh dan build production cepat |
| **Styling & UI** | Tailwind CSS v4, Lucide React, Motion | Desain sistem akademik responsif, Light/Dark mode (`@custom-variant dark`), animasi halus |
| **Database & Realtime** | Supabase PostgreSQL (`@supabase/supabase-js`) | Penyimpanan relasional, *foreign keys*, *triggers*, RLS, dan sinkronisasi *real-time* |
| **Storage & Dokumen** | Supabase Storage, `jsPDF` | Penyimpanan scan KRS, surat balasan, laporan PDF, foto profil, dan ekspor sertifikat PDF |
| **Deployment & Edge** | Vercel (`vercel.json`, Serverless Function) | Hosting SPA dengan fallback routing dan endpoint `/api/health` untuk verifikasi koneksi DB |

---

## Skema Database & Storage Supabase

Seluruh DDL database tersedia dalam satu skrip idempoten pada [`supabase/schema.sql`](./supabase/schema.sql) (dapat juga disalin/diunduh langsung dari modal **Supabase SQL Script** di dalam aplikasi):

- **19 Tabel Relasional**:
  `profiles`, `user_roles`, `academic_periods`, `companies`, `company_contacts`, `pkn_registrations`, `mbkm_programs`, `mbkm_registrations`, `daily_logs`, `guidance_sessions`, `pkn_reports`, `assessment_components`, `assessments`, `course_conversions`, `certificates`, `notifications`, `announcements`, `activity_logs`, dan `system_settings`.
- **Otomasi Database**: Trigger `handle_updated_at()`, constraint `CHECK`, indeks kolom pencarian, kebijakan *Row Level Security (RLS)* siap pakai, serta registrasi seluruh 19 tabel ke publikasi `supabase_realtime`.
- **4 Bucket Storage**:
  `pkn-requirements` (KRS & surat penerimaan), `pkn-activities` (lampiran jurnal & avatar profil), `pkn-reports` (naskah laporan PKN), dan `mbkm-documents` (dokumen MBKM).

---

## Struktur Direktori

```text
.
├── api/
│   └── health.ts                 # Vercel Serverless Function untuk cek konektivitas Supabase
├── src/
│   ├── components/
│   │   ├── admin/                # Manajemen pengguna & penugasan pembimbing
│   │   ├── announcements/        # Pusat pengumuman akademik & mitra
│   │   ├── assessments/          # Rubrik & input nilai dosen/lapangan
│   │   ├── auth/                 # Login, registrasi mahasiswa & reset kata sandi
│   │   ├── certificates/         # Penerbitan & unduh sertifikat PDF
│   │   ├── common/               # Modal, pagination, badge, toast & modal SQL
│   │   ├── companies/            # Direktori mitra industri
│   │   ├── daily-logs/           # Jurnal kegiatan harian mahasiswa
│   │   ├── dashboard/            # Dashboard khusus untuk 5 role
│   │   ├── documents/            # Document Center terintegrasi
│   │   ├── guidance/             # Sesi konsultasi bimbingan dosen
│   │   ├── layout/               # AppLayout, collapsible Sidebar & Navbar
│   │   ├── logs/                 # Audit trail aktivitas sistem
│   │   ├── mbkm/                 # Katalog MBKM & konversi 20 SKS
│   │   ├── pkn/                  # Pendaftaran PKN (kelompok + scan KRS) & verifikasi
│   │   ├── reports/              # Naskah laporan akhir & ekspor rekapitulasi
│   │   └── settings/             # Konfigurasi sistem & pengaturan profil semua role
│   ├── config/
│   │   └── navigation.ts         # Konfigurasi grup menu per role
│   ├── context/                  # AuthContext, ThemeContext, NotificationContext
│   ├── lib/
│   │   └── supabase.ts           # Inisialisasi client Supabase & normalisasi URL
│   ├── services/
│   │   └── db.ts                 # Layer akses data Supabase, Storage & Realtime
│   ├── types/
│   │   └── database.ts           # Definisi tipe TypeScript seluruh entitas
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── supabase/
│   └── schema.sql                # Skrip DDL lengkap PostgreSQL, RLS, Storage & Realtime
├── .env.example                  # Template variabel lingkungan
├── index.html
├── package.json
├── tsconfig.json
├── vercel.json                   # Konfigurasi SPA rewrite & cache headers Vercel
└── vite.config.ts
```

---

## Instalasi & Pengembangan Lokal

### Prasyarat
- **Node.js** v20+ (disarankan v22+)
- **npm** (atau **bun**)
- Proyek **Supabase** aktif

### Langkah Setup

1. **Kloning repositori & pasang dependensi**
   ```bash
   npm install
   ```

2. **Konfigurasi Environment Variables**
   Salin `.env.example` menjadi `.env` lalu isi kredensial Supabase proyek Anda:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-public-key
   ```

3. **Migrasi Database Supabase**
   - Buka **Supabase Dashboard → SQL Editor**.
   - Salin dan jalankan seluruh isi berkas [`supabase/schema.sql`](./supabase/schema.sql).

4. **Jalankan server pengembangan**
   ```bash
   npm run dev
   ```
   Aplikasi dapat diakses di `http://localhost:3000`.

---

## Panduan Deploy ke Vercel

Proyek ini sudah dikonfigurasi untuk langsung berjalan di **Vercel** melalui [`vercel.json`](./vercel.json) dan [`vite.config.ts`](./vite.config.ts).

1. Hubungkan repositori ke **Vercel** (*Framework Preset*: `Vite`, *Build Command*: `npm run build`, *Output Directory*: `dist`).
2. Tambahkan Environment Variables di **Vercel Dashboard → Settings → Environment Variables**:
   - `VITE_SUPABASE_URL` — URL proyek Supabase (`https://ravyjxtnrzvbcwpfumea.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` — Public `anon` key Supabase *(jangan gunakan `service_role` key pada frontend)*
   > *Catatan*: Build Vite juga mendukung variabel bawaan integrasi Supabase-Vercel seperti `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` serta membersihkan tanda kutip maupun akhiran `/rest/v1/` secara otomatis.
3. Deploy proyek. Setelah selesai, verifikasi konektivitas database dari server Vercel dengan mengakses:
   ```text
   https://<domain-vercel-anda>/api/health
   ```
   Respons `{"ok": true, ...}` menandakan Vercel terhubung penuh ke database Supabase.

---

## Skrip NPM

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan server pengembangan Vite pada port `3000` |
| `npm run build` | Membangun bundel produksi ke direktori `dist/` |
| `npm run preview` | Menjalankan pratinjau hasil build produksi secara lokal |
| `npm run lint` | Memeriksa validitas tipe TypeScript (`tsc --noEmit`) |
| `npm run clean` | Membersihkan artefak hasil build (`dist/`) |
