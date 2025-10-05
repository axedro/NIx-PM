import { useState } from 'react';
import { Menu, ChevronLeft, ChevronRight, LayoutDashboard, BarChart3, Bell, User, LogOut, Settings } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supersetService } from '../services/superset';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboards', path: '/dashboards' },
    { icon: BarChart3, label: 'Charts', path: '/charts' },
    { icon: Bell, label: 'Alerts', path: '/alerts' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    supersetService.logout();
    navigate('/login');
  };

  const credentials = supersetService.getCredentials();
  const username = credentials?.username || 'User';

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="NIx PM" className="h-8 w-8" />
          <h1 className="text-xl font-semibold text-gray-900">NIx PM</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Business Intelligence</span>
          <Link
            to="/settings"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              isActive('/settings')
                ? 'bg-blue-50 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Settings</span>
          </Link>
          <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
              <User className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`bg-white border-r border-gray-200 transition-all duration-300 ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          } flex flex-col shadow-sm`}
        >
          <div className="flex-1 py-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="font-medium text-sm">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-4 border-t border-gray-200 hover:bg-gray-100 transition-colors flex items-center justify-center"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
