import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { SqlMigrationModal } from '../common/SqlMigrationModal';
import { ToastContainer } from '../common/ToastContainer';

interface AppLayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isSqlModalOpen: boolean;
  setIsSqlModalOpen: (open: boolean) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  setCurrentTab,
  isSqlModalOpen,
  setIsSqlModalOpen,
  children,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Collapsible Sidebar (Desktop) & Drawer (Mobile) */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          currentTab={currentTab}
          onNavigateTab={setCurrentTab}
          onOpenMobileSidebar={() => setIsMobileOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Supabase SQL DDL Modal */}
      <SqlMigrationModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />

      {/* Toast Alerts Container */}
      <ToastContainer />
    </div>
  );
};
