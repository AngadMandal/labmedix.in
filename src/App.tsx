import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';

import { AppLayout } from './components/layout/AppLayout';

// Route-level code-splitting with React.lazy for high-performance chunking
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const DoctorLoginPage = React.lazy(() => import('./pages/doctors/DoctorLoginPage').then(m => ({ default: m.DoctorLoginPage })));
const DashboardPage = React.lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const PatientListPage = React.lazy(() => import('./pages/patients/PatientListPage').then(m => ({ default: m.PatientListPage })));
const PatientCreatePage = React.lazy(() => import('./pages/patients/PatientCreatePage').then(m => ({ default: m.PatientCreatePage })));
const PatientDetailPage = React.lazy(() => import('./pages/patients/PatientDetailPage').then(m => ({ default: m.PatientDetailPage })));
const PatientEditPage = React.lazy(() => import('./pages/patients/PatientEditPage').then(m => ({ default: m.PatientEditPage })));
const CardListPage = React.lazy(() => import('./pages/cards/CardListPage').then(m => ({ default: m.CardListPage })));
const CardStudioPage = React.lazy(() => import('./pages/cards/CardStudioPage').then(m => ({ default: m.CardStudioPage })));
const CardPrintSheetPage = React.lazy(() => import('./pages/cards/CardPrintSheetPage').then(m => ({ default: m.CardPrintSheetPage })));
const CardPrintingDispatchPage = React.lazy(() => import('./pages/cards/CardPrintingDispatchPage').then(m => ({ default: m.CardPrintingDispatchPage })));
const MembershipListPage = React.lazy(() => import('./pages/memberships/MembershipListPage').then(m => ({ default: m.MembershipListPage })));
const FamilyListPage = React.lazy(() => import('./pages/families/FamilyListPage').then(m => ({ default: m.FamilyListPage })));
const WalletDashboardPage = React.lazy(() => import('./pages/wallet/WalletDashboardPage').then(m => ({ default: m.WalletDashboardPage })));
const DoctorEMRPage = React.lazy(() => import('./pages/emr/DoctorEMRPage').then(m => ({ default: m.DoctorEMRPage })));
const DoctorMasterPage = React.lazy(() => import('./pages/doctors/DoctorMasterPage').then(m => ({ default: m.DoctorMasterPage })));
const DoctorDashboardPage = React.lazy(() => import('./pages/doctors/DoctorDashboardPage').then(m => ({ default: m.DoctorDashboardPage })));
const TestMasterPage = React.lazy(() => import('./pages/catalog/TestMasterPage').then(m => ({ default: m.TestMasterPage })));
const ReportsPage = React.lazy(() => import('./pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const UserListPage = React.lazy(() => import('./pages/users/UserListPage').then(m => ({ default: m.UserListPage })));
const ActivityLogPage = React.lazy(() => import('./pages/activity/ActivityLogPage').then(m => ({ default: m.ActivityLogPage })));
const BackupRestorePage = React.lazy(() => import('./pages/backup/BackupRestorePage').then(m => ({ default: m.BackupRestorePage })));
const SettingsPage = React.lazy(() => import('./pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SuperAdminControlCenterPage = React.lazy(() => import('./pages/admin/SuperAdminControlCenterPage').then(m => ({ default: m.SuperAdminControlCenterPage })));
const HealthCardImpactReportPage = React.lazy(() => import('./pages/admin/HealthCardImpactReportPage'));
const IntegrationsPage = React.lazy(() => import('./pages/integrations/IntegrationsPage').then(m => ({ default: m.IntegrationsPage })));
const GmailIntegrationPage = React.lazy(() => import('./pages/integrations/GmailIntegrationPage').then(m => ({ default: m.GmailIntegrationPage })));
const WebsiteCmsPage = React.lazy(() => import('./pages/cms/WebsiteCmsPage').then(m => ({ default: m.WebsiteCmsPage })));
const CashDeskBillVouchersPage = React.lazy(() => import('./pages/vouchers/CashDeskBillVouchersPage').then(m => ({ default: m.CashDeskBillVouchersPage })));
const SystemMonitoringPage = React.lazy(() => import('./pages/monitoring/SystemMonitoringPage').then(m => ({ default: m.SystemMonitoringPage })));
const MultiDeviceManagementPage = React.lazy(() => import('./pages/devices/MultiDeviceManagementPage').then(m => ({ default: m.MultiDeviceManagementPage })));
const PublicVerifyPage = React.lazy(() => import('./pages/verify/PublicVerifyPage').then(m => ({ default: m.PublicVerifyPage })));
const OfficialReportViewPage = React.lazy(() => import('./pages/public/OfficialReportViewPage').then(m => ({ default: m.OfficialReportViewPage })));
const PatientPortalPage = React.lazy(() => import('./pages/portal/PatientPortalPage').then(m => ({ default: m.PatientPortalPage })));
const NgoWelfare = React.lazy(() => import('./pages/NgoWelfare').then(m => ({ default: m.NgoWelfare })));
const OfflineFormPage = React.lazy(() => import('./pages/offline/OfflineFormPage').then(m => ({ default: m.OfflineFormPage })));
const CardRequestsPage = React.lazy(() => import('./pages/cards/CardRequestsPage').then(m => ({ default: m.CardRequestsPage })));
const AppointmentsPage = React.lazy(() => import('./pages/appointments/AppointmentsPage').then(m => ({ default: m.AppointmentsPage })));
const DoctorsPage = React.lazy(() => import('./pages/doctors/DoctorsPage').then(m => ({ default: m.DoctorsPage })));
const LaboratoryPage = React.lazy(() => import('./pages/laboratory/LaboratoryPage').then(m => ({ default: m.LaboratoryPage })));
const PharmacyPage = React.lazy(() => import('./pages/pharmacy/PharmacyPage').then(m => ({ default: m.PharmacyPage })));
const BillingPage = React.lazy(() => import('./pages/billing/BillingPage').then(m => ({ default: m.BillingPage })));
const TransactionsPage = React.lazy(() => import('./pages/transactions/TransactionsPage').then(m => ({ default: m.TransactionsPage })));
const PermissionsPage = React.lazy(() => import('./pages/users/PermissionsPage').then(m => ({ default: m.PermissionsPage })));
const NotFoundPage = React.lazy(() => import('./pages/not-found/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

const RouteLoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping"></div>
      <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
    </div>
    <p className="mt-4 text-xs font-semibold text-slate-400 tracking-wider uppercase">Loading Workspace Module...</p>
  </div>
);

import { SystemModuleKey } from './constants/roles';
import { ShieldAlert, Stethoscope, UserCheck } from 'lucide-react';
import { StorageService } from './services/storage';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAuthLoading } = useAuth();
  if (isAuthLoading) {
    return <RouteLoadingSpinner />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Granular Module Permission Guard
const ModuleGuard: React.FC<{ moduleKey: SystemModuleKey; children: React.ReactNode }> = ({ moduleKey, children }) => {
  const { hasModuleAccess, currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (!hasModuleAccess(moduleKey)) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 rounded-3xl bg-slate-900 border border-rose-500/40 text-center text-white space-y-4 shadow-2xl">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/40">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono bg-rose-950 text-rose-300 border border-rose-500/50">
            HTTP 403 ACCESS DENIED
          </span>
          <h2 className="text-xl font-black text-white">Module Access Restricted</h2>
          <p className="text-xs text-slate-300">
            You do not have administrative permission to access the <strong className="text-rose-400">{moduleKey.toUpperCase()}</strong> module. The Super Administrator must grant this module to your user profile ({currentUser.fullName}).
          </p>
        </div>
        <div className="pt-2">
          <a
            href="#/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-colors shadow-md"
          >
            Return to Authorized Dashboard
          </a>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

// Dedicated Doctor Role Gate for EMR & Clinical Prescriptions

import { AuditService } from './services/auditService';
const SuperAdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  
  if (currentUser.role !== 'super_admin') {
    React.useEffect(() => {
      AuditService.log('UNAUTHORIZED_ACCESS_ATTEMPT', 'auth', `User ${currentUser.username} (${currentUser.role}) attempted to access Super Admin Portal.`);
    }, [currentUser]);
    
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-6 text-center">
        <div className="p-4 rounded-full bg-rose-500/20 text-rose-500 mb-6">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-white mb-2">403 Forbidden</h1>
        <p className="text-slate-400 max-w-md">
          ACCESS DENIED. You do not have the required Super Admin clearance to access this highly classified security sector.
        </p>
      </div>
    );
  }
  return <>{children}</>;
};


const DoctorRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, login, hasModuleAccess } = useAuth();
  const [error, setError] = React.useState<string>('');

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const isAllowed = currentUser.role === 'doctor' || currentUser.role === 'super_admin' || currentUser.role === 'admin' || hasModuleAccess('emr');

  if (!isAllowed) {
    const doctorUsers = StorageService.getUsers().filter(u => u.role === 'doctor');

    const handleSwitchToDoctor = (username: string) => {
      const res = login(username);
      if (!res.success) {
        setError(res.error || 'Failed to authenticate doctor account.');
      } else {
        setError('');
      }
    };

    return (
      <div className="p-6 sm:p-8 max-w-2xl mx-auto my-8 rounded-3xl bg-slate-900 border border-teal-500/40 text-white shadow-2xl space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto border border-teal-500/40 shadow-lg shadow-teal-500/10">
            <Stethoscope className="w-8 h-8" />
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase font-mono bg-teal-950 text-teal-300 border border-teal-500/50">
            LICENSED MEDICAL PRACTITIONER ACCESS ONLY
          </span>
          <h2 className="text-2xl font-black text-white">Doctor EMR & Prescription Suite</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            Prescription issuance, diagnostic orders, and clinical SOAP notes are legally restricted to verified Medical Doctors. You are currently logged in as <strong className="text-amber-400">{currentUser.fullName} ({currentUser.role.toUpperCase().replace('_', ' ')})</strong>.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-teal-400" />
            <span>Select a Doctor Profile to Enter Clinical Suite:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {doctorUsers.map(doc => (
              <button
                key={doc.id}
                type="button"
                onClick={() => handleSwitchToDoctor(doc.username)}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-teal-500 hover:bg-teal-950/40 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-600/20 text-teal-300 font-bold flex items-center justify-center text-sm shrink-0 border border-teal-500/30 group-hover:scale-105 transition-transform">
                  👨‍⚕️
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-white block truncate group-hover:text-teal-300">{doc.fullName}</span>
                  <span className="text-[10px] text-slate-400 block truncate">{doc.department || 'OPD Physician'}</span>
                  <span className="text-[9px] font-mono text-teal-400">License: {doc.licenseNo || 'WBMC-Verified'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <a
            href="#/dashboard"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors border border-slate-700"
          >
            Return to Authorized Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <ToastProvider>
            <HashRouter>
              <React.Suspense fallback={<RouteLoadingSpinner />}>
                <Routes>
                  {/* Public Verification & Official Diagnostic Report Routes */}
                  <Route path="/report/:reportNumber" element={<OfficialReportViewPage />} />
                  <Route path="/report" element={<OfficialReportViewPage />} />
                  <Route path="/verify/:code" element={<PublicVerifyPage />} />
                  <Route path="/verify" element={<PublicVerifyPage />} />

                  {/* Single Unified Patient & Cardholder Smart Portal (Primary Entry & ID Login) */}
                  <Route path="/" element={<PatientPortalPage />} />
                  <Route path="/portal" element={<PatientPortalPage />} />
                  <Route path="/home" element={<Navigate to="/" replace />} />
                  <Route path="/website" element={<Navigate to="/" replace />} />
                  <Route path="/patient-portal" element={<Navigate to="/" replace />} />

                  {/* Staff Login */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/doctor-login" element={<DoctorLoginPage />} />

                  {/* Protected Staff Operational Workspace */}
                  <Route
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/dashboard" element={<DashboardPage />} />

                    {/* Patient Routes */}
                    <Route path="/patients" element={<ModuleGuard moduleKey="patients"><PatientListPage /></ModuleGuard>} />
                    <Route path="/patients/new" element={<ModuleGuard moduleKey="patients"><PatientCreatePage /></ModuleGuard>} />
                    <Route path="/patients/offline" element={<ModuleGuard moduleKey="patients"><OfflineFormPage /></ModuleGuard>} />
                    <Route path="/offline-form" element={<ModuleGuard moduleKey="patients"><OfflineFormPage /></ModuleGuard>} />
                    <Route path="/patients/:id" element={<ModuleGuard moduleKey="patients"><PatientDetailPage /></ModuleGuard>} />
                    <Route path="/patients/:id/edit" element={<ModuleGuard moduleKey="patients"><PatientEditPage /></ModuleGuard>} />

                    {/* Card & Studio Routes */}
                    <Route path="/cards" element={<ModuleGuard moduleKey="cards"><CardListPage /></ModuleGuard>} />
                    <Route path="/card-requests" element={<ModuleGuard moduleKey="card_requests"><CardRequestsPage /></ModuleGuard>} />
                    <Route path="/card-studio" element={<ModuleGuard moduleKey="card_studio"><CardStudioPage /></ModuleGuard>} />
                    <Route path="/cards/print-sheet" element={<ModuleGuard moduleKey="print_sheet"><CardPrintSheetPage /></ModuleGuard>} />
                    <Route path="/cards/printing-dispatch" element={<ModuleGuard moduleKey="card_dispatch"><CardPrintingDispatchPage /></ModuleGuard>} />
                    <Route path="/card-dispatch" element={<Navigate to="/cards/printing-dispatch" replace />} />
                    <Route path="/dispatch" element={<Navigate to="/cards/printing-dispatch" replace />} />
                    <Route path="/card-printing" element={<Navigate to="/cards/printing-dispatch" replace />} />

                    {/* Memberships */}
                    <Route path="/memberships" element={<ModuleGuard moduleKey="memberships"><MembershipListPage /></ModuleGuard>} />

                    {/* Families */}
                    <Route path="/families" element={<ModuleGuard moduleKey="families"><FamilyListPage /></ModuleGuard>} />

                    {/* Appointments & OPD Queue */}
                    <Route path="/appointments" element={<ModuleGuard moduleKey="appointments"><AppointmentsPage /></ModuleGuard>} />

                    {/* Doctors Master & Clinical Desk */}
                    <Route path="/doctors" element={<ModuleGuard moduleKey="doctors"><DoctorsPage /></ModuleGuard>} />
                    <Route path="/doctor-master" element={<ModuleGuard moduleKey="doctors"><DoctorsPage /></ModuleGuard>} />

                    {/* Diagnostic Laboratory Hub */}
                    <Route path="/laboratory" element={<ModuleGuard moduleKey="laboratory"><LaboratoryPage /></ModuleGuard>} />
                    <Route path="/test-master" element={<ModuleGuard moduleKey="laboratory"><LaboratoryPage /></ModuleGuard>} />

                    {/* Pharmacy & Dispensing Hub */}
                    <Route path="/pharmacy" element={<ModuleGuard moduleKey="pharmacy"><PharmacyPage /></ModuleGuard>} />

                    {/* Hospital Billing & Invoices */}
                    <Route path="/billing" element={<ModuleGuard moduleKey="billing"><BillingPage /></ModuleGuard>} />

                    {/* Central Financial Ledger & Revenue */}
                    <Route path="/transactions" element={<ModuleGuard moduleKey="transactions"><TransactionsPage /></ModuleGuard>} />

                    {/* Wallet */}
                    <Route path="/wallet" element={<ModuleGuard moduleKey="wallet"><WalletDashboardPage /></ModuleGuard>} />

                    {/* Doctor EMR & Clinical Prescriptions (Exclusive to Doctor Role) */}
                    <Route path="/emr" element={<DoctorRouteGuard><DoctorEMRPage /></DoctorRouteGuard>} />
                    <Route path="/doctor-dashboard" element={<DoctorRouteGuard><DoctorDashboardPage /></DoctorRouteGuard>} />

                    {/* Branch Analytics & Reports */}
                    <Route path="/reports" element={<ModuleGuard moduleKey="reports"><ReportsPage /></ModuleGuard>} />

                    {/* Staff User Management */}
                    <Route path="/users" element={<ModuleGuard moduleKey="users"><UserListPage /></ModuleGuard>} />

                    {/* Permissions & RBAC Matrix */}
                    <Route path="/permissions" element={<ModuleGuard moduleKey="permissions"><PermissionsPage /></ModuleGuard>} />

                    {/* Super Admin Sovereign Cash Desk Voucher Engine */}
                    <Route path="/cash-desk-vouchers" element={<ModuleGuard moduleKey="cash_desk_vouchers"><CashDeskBillVouchersPage /></ModuleGuard>} />

                    {/* 3D Website Customizer & CMS Studio (Super Admin Exclusive) */}
                    <Route path="/website-cms" element={<ModuleGuard moduleKey="website_cms"><WebsiteCmsPage /></ModuleGuard>} />

                    {/* NGO & CSR Welfare Hub */}
                    <Route path="/ngo-welfare" element={<ModuleGuard moduleKey="ngo_welfare"><NgoWelfare /></ModuleGuard>} />

                    {/* System & Audit — Consolidated into Super Admin Sovereign Control Center */}
                    <Route path="/activity" element={<Navigate to="/super-admin?tab=audit_logs" replace />} />
                    <Route path="/system-monitoring" element={<SuperAdminGuard><ModuleGuard moduleKey="system_monitoring"><SystemMonitoringPage /></ModuleGuard></SuperAdminGuard>} />
                    <Route path="/monitoring" element={<Navigate to="/system-monitoring" replace />} />
                    <Route path="/multi-device" element={<ModuleGuard moduleKey="system_monitoring"><MultiDeviceManagementPage /></ModuleGuard>} />
                    <Route path="/devices" element={<Navigate to="/multi-device" replace />} />
                    <Route path="/backup" element={<SuperAdminGuard><Navigate to="/super-admin?tab=backup" replace /></SuperAdminGuard>} />
                    <Route path="/integrations" element={<ModuleGuard moduleKey="integrations"><IntegrationsPage /></ModuleGuard>} />
                    <Route path="/gmail-integration" element={<ModuleGuard moduleKey="integrations"><GmailIntegrationPage /></ModuleGuard>} />
                    <Route path="/settings" element={<ModuleGuard moduleKey="settings"><SettingsPage /></ModuleGuard>} />

                    {/* Super Admin Sovereign Control Center */}
                    <Route path="/super-admin" element={<SuperAdminGuard><SuperAdminControlCenterPage /></SuperAdminGuard>} />

                    {/* Super Admin — Health Card Impact & Beneficiary Report (NGO / CSR) */}
                    <Route path="/super-admin/ngo-impact-report" element={<SuperAdminGuard><HealthCardImpactReportPage /></SuperAdminGuard>} />

                  </Route>

                  {/* Fallback to Home */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </React.Suspense>
            </HashRouter>
          </ToastProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
};
export default App;