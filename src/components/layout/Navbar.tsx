import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { getFlatNavItems } from '../../config/navigation';
import { RoleBadge } from '../common/RoleBadge';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  Search,
  Check,
  ChevronRight,
  UserCog
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onNavigateTab: (tab: string) => void;
  onOpenMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigateTab,
  onOpenMobileSidebar,
}) => {
  const { user, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = getFlatNavItems(role);
  const activeItem = navItems.find((item) => item.id === currentTab);
  const breadcrumbTitle = activeItem?.label || 'Dashboard';

  const matchingNavItems = searchQuery.trim()
    ? navItems.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : [];

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 h-16 px-4 sm:px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shrink-0">
      {/* Zone 1: Mobile Hamburger + Breadcrumb Trail */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-700"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs min-w-0">
          <span className="hidden sm:inline text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
            SIMPKN Informatika
          </span>
          <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-900 dark:text-slate-100 tracking-tight truncate">
            {breadcrumbTitle}
          </span>
        </div>
      </div>

      {/* Zone 2: Wired Quick Menu Jump Search */}
      <div ref={searchRef} className="hidden md:block relative max-w-sm w-full mx-4">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onFocus={() => setShowSearchResults(true)}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSearchResults(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matchingNavItems.length > 0) {
              onNavigateTab(matchingNavItems[0].id);
              setSearchQuery('');
              setShowSearchResults(false);
            }
          }}
          placeholder="Cari menu atau modul akademik..."
          className="w-full min-h-[38px] pl-10 pr-3 py-1.5 text-xs bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all"
        />

        {showSearchResults && searchQuery.trim() && (
          <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1.5 z-40 max-h-64 overflow-y-auto">
            {matchingNavItems.length === 0 ? (
              <p className="px-3.5 py-2.5 text-xs text-slate-400">
                Tidak ada modul yang cocok.
              </p>
            ) : (
              matchingNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigateTab(item.id);
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-medium truncate">{item.label}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Zone 3: Theme Toggle, Notifications, User Identity */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Light / Dark Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-9 h-9 inline-flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-700"
          title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          aria-label={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Popover */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative w-9 h-9 inline-flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-700"
            aria-label="Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-700 text-white text-[10px] font-mono font-bold flex items-center justify-center tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Notifikasi Masuk
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[11px] font-mono font-semibold text-red-700 dark:text-red-400 tabular-nums">
                      ({unreadCount} baru)
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Tandai dibaca</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 my-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
                    Belum ada notifikasi baru.
                  </p>
                ) : (
                  notifications.map((notif) => (
                    <button
                      type="button"
                      key={notif.id}
                      onClick={() => {
                        markAsRead(notif.id);
                        if (notif.action_url) {
                          const tab = notif.action_url.replace('/', '');
                          if (tab) onNavigateTab(tab);
                        }
                        setShowNotifDropdown(false);
                      }}
                      className={`w-full text-left p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        !notif.is_read ? 'bg-slate-50/80 dark:bg-slate-800/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {notif.title}
                        </span>
                        {!notif.is_read && (
                          <span className="text-[10px] font-semibold text-red-700 dark:text-red-400 shrink-0">
                            Baru
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-[10px] font-mono text-slate-400 mt-1.5 block tabular-nums">
                        {new Date(notif.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Identity -> Quick Link to Pengaturan Profil */}
        {user && (
          <button
            type="button"
            onClick={() => onNavigateTab('profile_settings')}
            title="Buka Pengaturan Profil"
            aria-label="Buka Pengaturan Profil"
            className={`flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl border-l border-slate-200 dark:border-slate-800 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-700 ${
              currentTab === 'profile_settings'
                ? 'bg-slate-100 dark:bg-slate-800'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800/80'
            }`}
          >
            <div className="hidden sm:flex flex-col items-end">
              <RoleBadge role={user.role} />
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                {user.identifier}
              </span>
            </div>
            <UserCog className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 sm:hidden" />
          </button>
        )}
      </div>
    </header>
  );
};
