import React, { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, ChevronRight, LogOut, School } from 'lucide-react';
import { getNavigationMenu } from './navigation';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [openSections, setOpenSections] = React.useState<string[]>([]);
  const toggleSection = (label: string) => {
    setOpenSections(prev =>
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menu = getNavigationMenu(user?.rol, user?.rolSistema);

  useEffect(() => {
    const activeSection = menu.find(item =>
      'children' in item && item.children?.some(child =>
        pathname === child.to || pathname.startsWith(`${child.to}/`)
      )
    );
    if (activeSection) {
      setOpenSections(current => current.includes(activeSection.label)
        ? current
        : [...current, activeSection.label]);
    }
  }, [pathname, user?.rol]);

  return (
    <aside
      id="app-sidebar"
      aria-label="Navegación principal"
      className="hidden h-dvh w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:flex"
    >
      {/* Logo */}
      <div className="relative flex h-16 items-center justify-center border-b border-gray-200 dark:border-slate-700 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm overflow-hidden dark:bg-gray-800">
            <img src="/assets/logo.png" alt="Ciencias e Ingeniería" className="w-8 h-8 object-contain" />
          </div>
          <div className="text-left">
            <h1 className="font-bold text-gray-900 dark:text-slate-100 text-base leading-tight">Ciencias e Ingeniería</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">Gestión Académica</p>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <div className="w-10 h-10 bg-primary-100 dark:bg-slate-800 rounded-full flex items-center justify-center shrink-0">
          <span className="text-sm font-semibold text-primary-700 dark:text-blue-300">
            {user?.nombre?.[0]}{user?.apellido?.[0]}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{user?.nombre} {user?.apellido}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">{user?.rolSistema||user?.rol}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {menu.map((item) => (
          'children' in item ? (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => toggleSection(item.label)}
                className="flex min-h-11 w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-200 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
                aria-expanded={openSections.includes(item.label)}
              >
                <item.icon className="w-5 h-5 mr-3 text-gray-400 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {openSections.includes(item.label) ?
                  <ChevronDown className="w-4 h-4 text-gray-400" /> :
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                }
              </button>
              {openSections.includes(item.label) && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) =>
                        `flex min-h-11 items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                          isActive ? 'bg-primary-50 dark:bg-slate-800 text-primary-700 dark:text-blue-300 font-medium' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`
                      }
                    >
                      <child.icon className="w-4 h-4 mr-3" />
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-50 dark:bg-slate-800 text-primary-700 dark:text-blue-300' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </NavLink>
          )
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-200 dark:border-slate-700 p-3">
        <button
          onClick={handleLogout}
          className="flex min-h-11 w-full items-center rounded-lg px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
