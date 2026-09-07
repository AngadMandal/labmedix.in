import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ScreenLockModal } from './ScreenLockModal';
import { IdleSessionWarningModal } from '../common/IdleSessionWarningModal';
import { ToastContainer } from '../common/ToastContainer';
import { BackupReminderNotification } from '../common/BackupReminderNotification';
import { DeviceRevokedModal } from '../common/DeviceRevokedModal';
import { FloatingActionButton } from '../common/FloatingActionButton';
import { ModuleErrorBoundary } from '../common/ModuleErrorBoundary';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col print:bg-white print:text-black print:min-h-0">
      {/* Sidebar */}
      <div className="print:hidden">
        <Sidebar isOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content Area with Header */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen transition-all duration-200 print:pl-0 print:m-0 print:min-h-0">
        <div className="print:hidden">
          <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto print:p-0 print:m-0 print:max-w-none print:w-full">
          <ModuleErrorBoundary>
            <Outlet />
          </ModuleErrorBoundary>
        </main>
      </div>

      {/* Global Modals & Notifications */}
      <div className="print:hidden">
        <ScreenLockModal />
        <IdleSessionWarningModal />
        <BackupReminderNotification />
        <DeviceRevokedModal />
        <ToastContainer />
        <FloatingActionButton />
      </div>
    </div>
  );
};