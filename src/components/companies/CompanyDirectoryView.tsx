import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { dbService } from '../../services/db';
import { Company } from '../../types/database';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Pagination } from '../common/Pagination';
import {
  Building2,
  Search,
  Filter,
  Plus,
  Globe,
  Mail,
  Phone,
  MapPin,
  Star,
  CheckCircle2,
  Trash2,
  Edit2,
  ExternalLink
} from 'lucide-react';

export const CompanyDirectoryView: React.FC = () => {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [isRecommended, setIsRecommended] = useState(false);

  // Delete Confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isAdmin = role === 'admin_pkn' || role === 'super_admin';

  const loadCompanies = async () => {
    const list = await dbService.getCompanies();
    setCompanies(list);
  };

  useEffect(() => {
    loadCompanies();
    const unsub = dbService.subscribe('companies', loadCompanies);
    return () => unsub();
  }, []);

  const openAddModal = () => {
    setEditingCompany(null);
    setName('');
    setSector('');
    setAddress('');
    setCity('');
    setProvince('Jawa Timur');
    setWebsite('');
    setEmail('');
    setPhone('');
    setDescription('');
    setIsRecommended(false);
    setShowModal(true);
  };

  const openEditModal = (comp: Company) => {
    setEditingCompany(comp);
    setName(comp.name);
    setSector(comp.industry_sector);
    setAddress(comp.address);
    setCity(comp.city);
    setProvince(comp.province);
    setWebsite(comp.website || '');
    setEmail(comp.email);
    setPhone(comp.phone);
    setDescription(comp.description);
    setIsRecommended(comp.is_recommended);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !email) {
      showToast('error', 'Validasi Gagal', 'Harap isi nama instansi, alamat, dan email.');
      return;
    }

    if (editingCompany) {
      await dbService.updateCompany(editingCompany.id, {
        name,
        industry_sector: sector,
        address,
        city,
        province,
        website,
        email,
        phone,
        description,
        is_recommended: isRecommended,
      });
      if (user) {
        dbService.logActivity(user.id, user.full_name, user.role, 'UPDATE_COMPANY', 'company', editingCompany.id, `Memperbarui profil mitra: ${name}`);
      }
      showToast('success', 'Instansi Diperbarui', `Informasi ${name} berhasil disimpan.`);
    } else {
      const created = await dbService.createCompany({
        name,
        industry_sector: sector || 'Teknologi Informasi',
        address,
        city: city || 'Malang',
        province: province || 'Jawa Timur',
        website,
        email,
        phone,
        description,
        is_recommended: isAdmin ? isRecommended : false,
        is_active: true,
        verification_status: isAdmin ? 'verified' : 'pending',
        created_by: user?.id,
      });
      if (user) {
        dbService.logActivity(user.id, user.full_name, user.role, 'CREATE_COMPANY', 'company', created.id, `Menambahkan instansi baru: ${name}`);
      }
      showToast('success', 'Instansi Ditambahkan', isAdmin ? 'Data mitra resmi berhasil ditambahkan.' : 'Instansi diajukan dan menunggu verifikasi admin.');
    }

    setShowModal(false);
    loadCompanies();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await dbService.deleteCompany(deleteId);
    showToast('success', 'Instansi Dihapus', 'Data mitra instansi telah dihapus dari sistem.');
    setDeleteId(null);
    loadCompanies();
  };

  // Filter & Search
  const filtered = companies.filter((c) => {
    if (sectorFilter !== 'all' && !c.industry_sector.toLowerCase().includes(sectorFilter.toLowerCase())) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.industry_sector.toLowerCase().includes(q)
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
            Direktori Instansi & Tempat PKN
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar mitra industri, instansi pemerintah, dan startup teknologi rekomendasi Prodi Informatika
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isAdmin ? 'Tambah Mitra Instansi' : 'Usulkan Tempat Baru'}</span>
        </button>
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
            placeholder="Cari perusahaan, bidang, atau kota..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sectorFilter}
            onChange={(e) => {
              setSectorFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
          >
            <option value="all">Semua Sektor Industri</option>
            <option value="Telekomunikasi">Telekomunikasi & Jaringan</option>
            <option value="E-Commerce">E-Commerce & Digital</option>
            <option value="Instansi Pemerintah">Instansi Pemerintah</option>
            <option value="Fintech">Perbankan & Fintech</option>
            <option value="Software">Software House</option>
          </select>
        </div>
      </div>

      {/* Company Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pagedList.map((comp) => (
          <div
            key={comp.id}
            className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {comp.name}
                    </h3>
                    <span className="text-[11px] text-slate-500 block">
                      {comp.industry_sector}
                    </span>
                  </div>
                </div>
                {comp.is_recommended && (
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 shrink-0" title="Mitra Rekomendasi Unggulan">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>Unggulan</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                {comp.description}
              </p>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{comp.address}, {comp.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="truncate font-mono text-[11px]">{comp.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="font-mono text-[11px]">{comp.phone}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {comp.website ? (
                <a
                  href={comp.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[11px] text-slate-400 font-mono">Mitra Terdaftar</span>
              )}

              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(comp)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors"
                    title="Ubah data"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(comp.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                    title="Hapus data"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
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

      {/* Add / Edit Company Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCompany ? 'Ubah Informasi Instansi' : isAdmin ? 'Tambah Instansi Mitra Baru' : 'Ajukan Tempat PKN Baru'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Instansi / Perusahaan *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: PT Bank Central Asia Tbk"
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sektor Industri
              </label>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Fintech / Software House / BUMN"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kota
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Malang / Surabaya / Jakarta"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alamat Lengkap Kantor *
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Nama jalan, gedung, nomor kantor"
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Kontak *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hrd@company.com"
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Telepon
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="021-xxxx atau 081xxxx"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Website Resmi Perusahaan
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://company.com"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deskripsi Singkat Profil Perusahaan
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Profil bisnis, teknologi yang digunakan, serta lingkup tugas yang tersedia..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
            />
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isRec"
                checked={isRecommended}
                onChange={(e) => setIsRecommended(e.target.checked)}
                className="rounded-sm border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <label htmlFor="isRec" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Tandai sebagai Mitra Rekomendasi Unggulan Prodi
              </label>
            </div>
          )}

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
              Simpan Data Instansi
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Data Instansi"
        message="Apakah Anda yakin ingin menghapus instansi ini dari direktori? Mahasiswa tidak akan dapat memilih instansi ini lagi."
        confirmLabel="Hapus Instansi"
        isDestructive
      />
    </div>
  );
};
