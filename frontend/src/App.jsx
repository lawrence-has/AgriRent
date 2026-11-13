import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import NetworkStatus from './components/common/NetworkStatus';
import useSocket from './hooks/useSocket';
import useAuthStore from './store/authStore';
import useNotificationStore from './store/notificationStore';
import { getNotifications } from './api/notifications';
import { destroySocket } from './socket';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Shared
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';

// Farmer
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import BrowseEquipment from './pages/farmer/BrowseEquipment';
import EquipmentDetailPage from './pages/farmer/EquipmentDetailPage';
import MyReservations from './pages/farmer/MyReservations';
import ReservationDetailPage from './pages/farmer/ReservationDetailPage';
import MyRentals from './pages/farmer/MyRentals';
import OfflineQueue from './pages/farmer/OfflineQueue';

// Owner
import OwnerDashboard from './pages/owner/OwnerDashboard';
import MyEquipment from './pages/owner/MyEquipment';
import ManageReservations from './pages/owner/ManageReservations';
import ManageTransactions from './pages/owner/ManageTransactions';
import OwnerEquipmentDetail from './pages/owner/OwnerEquipmentDetail';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import EquipmentManagement from './pages/admin/EquipmentManagement';
import ReservationManagement from './pages/admin/ReservationManagement';
import ArchiveManagement from './pages/admin/ArchiveManagement';

// Chat
import ChatPage from './pages/chat/ChatPage';

// Other
import NotFound from './pages/NotFound';

// Initialize socket, load notification count, and handle session expiry
const AppInit = () => {
  useSocket();
  const { token, logout } = useAuthStore();
  const { setNotifications } = useNotificationStore();

  useEffect(() => {
    if (!token) return;
    // Load unread count immediately so bell badge is correct on first render
    getNotifications({ limit: 20 })
      .then((r) => setNotifications(r.data.notifications, r.data.unreadCount))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    // Listen for the auth:expired event dispatched by the axios interceptor
    // This gives us a clean React-aware logout without full page reload
    const handleExpired = () => {
      logout();
      destroySocket();
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [logout]);

  return null;
};

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <NetworkStatus />
        <AppInit />
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Public equipment browsing */}
          <Route path="/equipment/:id" element={<Layout><EquipmentDetailPage /></Layout>} />

          {/* Shared protected routes */}
          <Route path="/profile" element={
            <ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute><Layout><NotificationsPage /></Layout></ProtectedRoute>
          } />
          <Route path="/chat" element={
            <ProtectedRoute><Layout><ChatPage /></Layout></ProtectedRoute>
          } />

          {/* Farmer routes */}
          <Route path="/farmer/*" element={
            <ProtectedRoute roles={['farmer']}>
              <Layout>
                <Routes>
                  <Route path="dashboard" element={<FarmerDashboard />} />
                  <Route path="browse" element={<BrowseEquipment />} />
                  <Route path="reservations" element={<MyReservations />} />
                  <Route path="reservations/:id" element={<ReservationDetailPage />} />
                  <Route path="rentals" element={<MyRentals />} />
                  <Route path="offline-queue" element={<OfflineQueue />} />
                  <Route path="*" element={<Navigate to="dashboard" />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />

          {/* Owner routes */}
          <Route path="/owner/*" element={
            <ProtectedRoute roles={['owner']}>
              <Layout>
                <Routes>
                  <Route path="dashboard" element={<OwnerDashboard />} />
                  <Route path="equipment" element={<MyEquipment />} />
                  <Route path="equipment/:id" element={<OwnerEquipmentDetail />} />
                  <Route path="reservations" element={<ManageReservations />} />
                  <Route path="transactions" element={<ManageTransactions />} />
                  <Route path="*" element={<Navigate to="dashboard" />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute roles={['admin']}>
              <Layout>
                <Routes>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="users" element={<UserManagement />} />
                  <Route path="equipment" element={<EquipmentManagement />} />
                  <Route path="reservations" element={<ReservationManagement />} />
                  <Route path="archive" element={<ArchiveManagement />} />
                  <Route path="*" element={<Navigate to="dashboard" />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
