import { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex min-h-[calc(100vh-57px)]">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {/* Main content: constrain width on very wide screens, ensure it never bleeds under sidebar */}
        <main className="flex-1 p-4 lg:p-6 min-w-0 max-w-7xl w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
