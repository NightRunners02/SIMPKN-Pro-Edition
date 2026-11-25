import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/database';
import { dbService } from '../services/db';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  registerMahasiswa: (data: {
    nim: string;
    fullName: string;
    email?: string;
    phone?: string;
    semester: number;
    gpa: number;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (data: {
    identifier: string;
    verificationValue: string;
    newPassword: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateCurrentUserProfile: (updates: Partial<UserProfile>, plainPassword?: string) => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'simpkn_current_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedUserId = localStorage.getItem(CURRENT_USER_KEY) || sessionStorage.getItem(CURRENT_USER_KEY);
      if (savedUserId) {
        const liveProfile = await dbService.getProfileById(savedUserId);
        if (liveProfile && liveProfile.is_active) {
          setUser(liveProfile);
        } else {
          localStorage.removeItem(CURRENT_USER_KEY);
          sessionStorage.removeItem(CURRENT_USER_KEY);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = dbService.subscribe('profiles', async () => {
      const latest = await dbService.getProfileById(user.id);
      if (latest) {
        setUser(latest);
      }
    });
    return () => unsub();
  }, [user?.id]);

  const login = async (
    identifier: string,
    password: string,
    rememberMe = true
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      return { success: false, error: 'Silakan masukkan NIM, NIDN, NIP, atau Username Anda.' };
    }
    if (!password) {
      return { success: false, error: 'Silakan masukkan kata sandi akun Anda.' };
    }

    const found = await dbService.getProfileByIdentifier(trimmed);

    if (!found) {
      return {
        success: false,
        error: 'Nomor identitas (NIM / NIDN / NIP / Username) tidak terdaftar di database SIMPKN.',
      };
    }

    if (!found.is_active) {
      return {
        success: false,
        error: 'Akun Anda sedang dinonaktifkan. Hubungi Administrator Program Studi Informatika.',
      };
    }

    const isPasswordValid = await dbService.verifyUserPassword(found, password);
    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Kata sandi yang Anda masukkan tidak sesuai dengan data pada database Supabase.',
      };
    }

    setUser(found);
    if (rememberMe) {
      localStorage.setItem(CURRENT_USER_KEY, found.id);
      sessionStorage.removeItem(CURRENT_USER_KEY);
    } else {
      sessionStorage.setItem(CURRENT_USER_KEY, found.id);
      localStorage.removeItem(CURRENT_USER_KEY);
    }

    dbService.logActivity(
      found.id,
      found.full_name,
      found.role,
      'LOGIN',
      'auth',
      found.id,
      `Pengguna ${found.full_name} (${found.identifier}) berhasil masuk ke sistem.`
    );

    return { success: true };
  };

  const registerMahasiswa = async (data: {
    nim: string;
    fullName: string;
    email?: string;
    phone?: string;
    semester: number;
    gpa: number;
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanNim = data.nim.trim();
    const cleanName = data.fullName.trim();
    const cleanEmail = data.email?.trim() || '';

    if (!cleanNim || !cleanName) {
      return { success: false, error: 'NIM dan Nama Lengkap wajib diisi.' };
    }

    if (!data.password || data.password.length < 6) {
      return { success: false, error: 'Kata sandi minimal 6 karakter.' };
    }

    const existing = await dbService.getProfileByIdentifier(cleanNim);
    if (existing) {
      return { success: false, error: `Mahasiswa dengan NIM ${cleanNim} sudah terdaftar di SIMPKN.` };
    }

    try {
      const newProfile = await dbService.createProfile(
        {
          identifier: cleanNim,
          full_name: cleanName,
          email: cleanEmail || null,
          phone: data.phone?.trim() || undefined,
          role: 'mahasiswa',
          study_program: 'Informatika',
          faculty: 'Fakultas Teknik',
          semester: data.semester,
          gpa: data.gpa,
          avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
          is_active: true,
        },
        data.password
      );

      setUser(newProfile);
      localStorage.setItem(CURRENT_USER_KEY, newProfile.id);
      dbService.logActivity(
        newProfile.id,
        newProfile.full_name,
        'mahasiswa',
        'REGISTER',
        'profile',
        newProfile.id,
        `Pendaftaran mahasiswa mandiri: ${newProfile.full_name} (${newProfile.identifier})`
      );

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mendaftarkan akun ke database Supabase.';
      return { success: false, error: message };
    }
  };

  const resetPassword = async (data: {
    identifier: string;
    verificationValue: string;
    newPassword: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanId = data.identifier.trim();
    const cleanVerif = data.verificationValue.trim().toLowerCase();

    if (!cleanId || !cleanVerif) {
      return { success: false, error: 'Lengkapi nomor identitas dan data verifikasi akun Anda.' };
    }
    if (!data.newPassword || data.newPassword.length < 6) {
      return { success: false, error: 'Kata sandi baru minimal harus 6 karakter.' };
    }

    const found = await dbService.getProfileByIdentifier(cleanId);
    if (!found) {
      return { success: false, error: `Akun dengan identitas "${cleanId}" tidak ditemukan di database.` };
    }

    const matchesName = found.full_name.trim().toLowerCase() === cleanVerif;
    const matchesEmail = found.email ? found.email.trim().toLowerCase() === cleanVerif : false;
    const matchesPhone = found.phone ? found.phone.replace(/\D/g, '') === cleanVerif.replace(/\D/g, '') && cleanVerif.length >= 6 : false;

    if (!matchesName && !matchesEmail && !matchesPhone) {
      return {
        success: false,
        error: 'Data verifikasi (Nama Lengkap / Email / No. WhatsApp) tidak cocok dengan catatan database.',
      };
    }

    const saved = await dbService.setUserPassword(found.id, found.identifier, data.newPassword);
    if (!saved) {
      return { success: false, error: 'Gagal memperbarui kata sandi pada database Supabase. Coba kembali.' };
    }

    dbService.logActivity(
      found.id,
      found.full_name,
      found.role,
      'RESET_PASSWORD',
      'auth',
      found.id,
      `Pengguna ${found.full_name} (${found.identifier}) melakukan pembaruan kata sandi.`
    );

    return { success: true };
  };

  const updateCurrentUserProfile = async (
    updates: Partial<UserProfile>,
    plainPassword?: string
  ): Promise<UserProfile | null> => {
    if (!user) return null;
    const updated = await dbService.updateProfile(user.id, updates, plainPassword);
    if (updated) {
      setUser(updated);
    }
    return updated;
  };

  const logout = () => {
    if (user) {
      dbService.logActivity(
        user.id,
        user.full_name,
        user.role,
        'LOGOUT',
        'auth',
        user.id,
        `Pengguna ${user.full_name} keluar dari sistem.`
      );
    }
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
    sessionStorage.removeItem(CURRENT_USER_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isLoading,
        login,
        registerMahasiswa,
        resetPassword,
        logout,
        updateCurrentUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
