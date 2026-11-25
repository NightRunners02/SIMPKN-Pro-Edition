import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { LoginView } from './components/auth/LoginView';
import { AppLayout } from './components/layout/AppLayout';
import { ToastContainer } from './components/common/ToastContainer';
import { dbService } from './services/db';
import { applyDocumentFavicon, getCachedFaviconUrl } from './utils/favicon';

// Dashboards
import { MahasiswaDashboard } from './components/dashboard/MahasiswaDashboard';
import { DosenDashboard } from './components/dashboard/DosenDashboard';
import { PembimbingLapanganDashboard } from './components/dashboard/PembimbingLapanganDashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { SuperAdminDashboard } from './components/dashboard/SuperAdminDashboard';

// Feature Views
import { PKNRegistrationView } from './components/pkn/PKNRegistrationView';
import { CompanyDirectoryView } from './components/companies/CompanyDirectoryView';
import { DailyLogsView } from './components/daily-logs/DailyLogsView';
import { GuidanceView } from './components/guidance/GuidanceView';
import { ReportsView } from './components/reports/ReportsView';
import { AssessmentsView } from './components/assessments/AssessmentsView';
import { MBKMProgramsView } from './components/mbkm/MBKMProgramsView';
import { CourseConversionView } from './components/mbkm/CourseConversionView';
import { DocumentCenterView } from './components/documents/DocumentCenterView';
import { CertificateView } from './components/certificates/CertificateView';
import { AnnouncementsView } from './components/announcements/AnnouncementsView';
import { ExportReportsView } from './components/reports/ExportReportsView';
import { AdminManagementView } from './components/admin/AdminManagementView';
import { ActivityLogsView } from './components/logs/ActivityLogsView';
import { SystemSettingsView } from './components/settings/SystemSettingsView';
import { ProfileSettingsView } from './components/settings/ProfileSettingsView';

const MainApp: React.FC = () => {
  const { user, role, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSqlModalOpen, setIsSqlModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const cached = getCachedFaviconUrl();
    if (cached) {
      applyDocumentFavicon(cached);
    }

    const syncBranding = async () => {
      try {
        const settings = await dbService.getSystemSettings();
        applyDocumentFavicon(settings.favicon_url, settings.app_name);
      } catch {
        applyDocumentFavicon();
      }
    };

    syncBranding();
    const unsub = dbService.subscribe('system_settings', syncBranding);
    return () => unsub();
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
        <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-900 dark:border-slate-800 dark:border-t-slate-100 rounded-full animate-spin mb-4" />
        <span className="text-xs font-mono">Memuat SIMPKN Informatika UMM...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginView />
        <ToastContainer />
      </>
    );
  }

  const renderDashboard = () => {
    switch (role) {
      case 'dosen_pembimbing':
        return <DosenDashboard onNavigateTab={setCurrentTab} />;
      case 'pembimbing_lapangan':
        return <PembimbingLapanganDashboard onNavigateTab={setCurrentTab} />;
      case 'admin_pkn':
        return <AdminDashboard onNavigateTab={setCurrentTab} />;
      case 'super_admin':
        return <SuperAdminDashboard onNavigateTab={setCurrentTab} onOpenSqlModal={() => setIsSqlModalOpen(true)} />;
      case 'mahasiswa':
      default:
        return <MahasiswaDashboard onNavigateTab={setCurrentTab} />;
    }
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return renderDashboard();
      case 'pkn_registration':
        return <PKNRegistrationView />;
      case 'companies':
        return <CompanyDirectoryView />;
      case 'daily_logs':
        return <DailyLogsView />;
      case 'guidance':
        return <GuidanceView />;
      case 'reports':
        return <ReportsView />;
      case 'assessments':
        return <AssessmentsView />;
      case 'mbkm_programs':
        return <MBKMProgramsView />;
      case 'course_conversions':
        return <CourseConversionView />;
      case 'documents':
        return <DocumentCenterView />;
      case 'certificates':
        return <CertificateView />;
      case 'announcements':
        return <AnnouncementsView />;
      case 'reports_export':
        return <ExportReportsView />;
      case 'admin_management':
        return <AdminManagementView />;
      case 'activity_logs':
        return <ActivityLogsView />;
      case 'system_settings':
        return <SystemSettingsView onOpenSqlModal={() => setIsSqlModalOpen(true)} />;
      case 'profile_settings':
        return <ProfileSettingsView />;
      default:
        return renderDashboard();
    }
  };

  return (
    <AppLayout
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      isSqlModalOpen={isSqlModalOpen}
      setIsSqlModalOpen={setIsSqlModalOpen}
    >
      {renderContent()}
    </AppLayout>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <MainApp />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
