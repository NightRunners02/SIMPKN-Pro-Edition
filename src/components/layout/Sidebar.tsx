import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getNavigationGroups } from '../../config/navigation';
import {
  Menu,
  LogOut,
  GraduationCap
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { user, role, logout } = useAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatar_url]);

  const navGroups = getNavigationGroups(role);

  const getRoleLabel = () => {
    switch (role) {
      case 'super_admin':
        return 'Super Administrator';
      case 'admin_pkn':
        return 'Koordinator PKN';
      case 'dosen_pembimbing':
        return 'Dosen Pembimbing';
      case 'pembimbing_lapangan':
        return 'Pembimbing Industri';
      case 'mahasiswa':
      default:
        return 'Mahasiswa';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'UM';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || '').join('') || 'UM';
  };

  const handleSelectTab = (tabId: string) => {
    setCurrentTab(tabId);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          aria-hidden="true"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      <aside
        aria-label="Navigasi Utama SIMPKN"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-all duration-200 ease-out lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 w-[272px] shadow-xl' : '-translate-x-full w-[272px]'
        } ${isCollapsed ? 'lg:w-[76px]' : 'lg:w-[264px]'}`}
      >
        {/* Brand Header + Single Hamburger Control */}
        <div
          className={`flex items-center h-16 px-4 border-b border-slate-200 dark:border-slate-800 shrink-0 ${
            isCollapsed ? 'lg:justify-center' : 'justify-between'
          }`}
        >
          <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'lg:hidden' : ''}`}>
            <div className="w-9 h-9 rounded-xl bg-red-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white block leading-tight">
                SIMPKN
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block truncate leading-tight mt-0.5">
                Informatika UMM
              </span>
            </div>
          </div>

          {/* Desktop Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-700"
            title={isCollapsed ? 'Buka Sidebar' : 'Ciutkan Sidebar'}
            aria-label={isCollapsed ? 'Buka Sidebar' : 'Ciutkan Sidebar'}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile Hamburger Close */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-700"
            aria-label="Tutup menu navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Grouped Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {navGroups.map((group, groupIdx) => (
            <div key={group.title}>
              {!isCollapsed ? (
                <p className="px-3 mb-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 select-none">
                  {group.title}
                </p>
              ) : (
                groupIdx > 0 && (
                  <div className="hidden lg:block mx-3 my-2 border-t border-slate-200 dark:border-slate-800" />
                )
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      title={isCollapsed ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full min-h-[40px] flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-700 ${
                        isCollapsed ? 'lg:justify-center lg:px-0' : ''
                      } ${
                        isActive
                          ? 'bg-red-700 text-white font-semibold shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 font-medium hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className={`truncate whitespace-nowrap ${isCollapsed ? 'lg:hidden' : ''}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Footer Account & Logout */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <div
            className={`flex items-center gap-2 ${
              isCollapsed ? 'lg:flex-col lg:gap-2' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => handleSelectTab('profile_settings')}
              title="Buka Pengaturan Profil"
              aria-label="Buka Pengaturan Profil"
              className={`flex items-center gap-3 p-1.5 rounded-xl flex-1 min-w-0 text-left transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-700 ${
                isCollapsed ? 'lg:flex-none lg:justify-center lg:p-1' : ''
              } ${
                currentTab === 'profile_settings'
                  ? 'bg-slate-100 dark:bg-slate-800'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`}
            >
              {user?.avatar_url && !avatarFailed ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  onError={() => setAvatarFailed(true)}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-bold shrink-0">
                  {getInitials(user?.full_name)}
                </div>
              )}

              <div className={`flex-1 min-w-0 ${isCollapsed ? 'lg:hidden' : ''}`}>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block truncate">
                  {user?.full_name}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  <span className="font-mono truncate">{user?.identifier}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate font-medium text-red-700 dark:text-red-400">
                    {getRoleLabel()}
                  </span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-9 h-9 inline-flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-700"
              title="Keluar dari sesi akun"
              aria-label="Keluar dari sesi akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
