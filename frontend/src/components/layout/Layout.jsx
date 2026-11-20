import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="agri-shell min-h-screen">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex min-h-[calc(100dvh-4.5rem)]">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="min-w-0 w-full flex-1 p-3 sm:p-6 lg:p-8">
          <div key={location.pathname} className="mx-auto max-w-[1480px] page-enter">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
