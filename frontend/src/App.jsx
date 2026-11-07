import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import useSocket from './hooks/useSocket';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Farmer
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import BrowseEquipment from './pages/farmer/BrowseEquipment';
import EquipmentDetailPage from './pages/farmer/EquipmentDetailPage';
import MyReservations from './pages/farmer/MyReservations';
import ReservationDetailPage from './pages/farmer/ReservationDetailPage';

// Owner
import OwnerDashboard from './pages/owner/OwnerDashboard';
import MyEquipment from './pages/owner/MyEquipment';
import ManageReservations from './pages/owner/ManageReservations';
import ManageTransactions from './pages/owner/ManageTransactions';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import EquipmentManagement from './pages/admin/EquipmentManagement';
import ReservationManagement from './pages/admin/ReservationManagement';

// Chat
import ChatPage from './pages/chat/ChatPage';

// Other
import NotFound from './pages/NotFound';

// Socket initializer component
const SocketInit = () => { useSocket(); return null; };

function App() {
  return (
    <BrowserRouter>
      <SocketInit />
      <Toaster position="top-right" />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Public equipment detail */}
        <Route path="/equipment/:id" element={<Layout><EquipmentDetailPage /></Layout>} />

        {/* Farmer routes */}
        <Route path="/farmer/*" element={
          <ProtectedRoute roles={['farmer']}>
            <Layout>
              <Routes>
                <Route path="dashboard" element={<FarmerDashboard />} />
                <Route path="browse" element={<BrowseEquipment />} />
                <Route path="reservations" element={<MyReservations />} />
                <Route path="reservations/:id" element={<ReservationDetailPage />} />
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
                <Route path="*" element={<Navigate to="dashboard" />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />

        {/* Chat */}
        <Route path="/chat" element={
          <ProtectedRoute>
            <Layout><ChatPage /></Layout>
          </ProtectedRoute>
        } />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
