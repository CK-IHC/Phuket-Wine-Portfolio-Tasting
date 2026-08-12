import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { PrintProvider } from './context/PrintContext';
import { PrintReport } from './components/PrintReport';
import { HomePage } from './pages/user/HomePage';
import { RegisterPage } from './pages/user/RegisterPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { DashboardPage } from './pages/admin/DashboardPage';
import { RoundsPage } from './pages/admin/RoundsPage';
import { RegistrationListPage } from './pages/admin/RegistrationListPage';
import { SlipVerificationPage } from './pages/admin/SlipVerificationPage';
import { FormResponsesPage } from './pages/admin/FormResponsesPage';
import { UsersPage } from './pages/admin/UsersPage';
import { AnnouncementsPage } from './pages/admin/AnnouncementsPage';
import { FormBuilderPage } from './pages/admin/FormBuilderPage';
import { RequireAuth } from './pages/admin/RequireAuth';

export default function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
          <PrintProvider>
            <BrowserRouter>
              <div id="app-screen">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/admin/login" element={<AdminLoginPage />} />
                  <Route
                    path="/admin"
                    element={
                      <RequireAuth>
                        <AdminLayout />
                      </RequireAuth>
                    }
                  >
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="rounds" element={<RoundsPage />} />
                    <Route path="list" element={<RegistrationListPage />} />
                    <Route path="verify" element={<SlipVerificationPage />} />
                    <Route path="responses" element={<FormResponsesPage />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="announcements" element={<AnnouncementsPage />} />
                    <Route path="form-builder" element={<FormBuilderPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
              <PrintReport />
            </BrowserRouter>
          </PrintProvider>
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}
