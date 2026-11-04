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
      className="hidden h-dvh w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:flex xl:w-72"
    >
      {/* Logo */}
      <div className="relative flex h-16 items-center border-b border-gray-200 px-5 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg dark:bg-gray-800">
            <img src="/assets/logo.png" alt="Ciencias e Ingeniería" className="w-8 h-8 object-contain" />
          </div>
          <div className="text-left">
            <h1 className="text-[0.9375rem] font-bold leading-tight text-gray-900 dark:text-slate-100">Ciencias e Ingeniería</h1>
            <p className="text-[0.8125rem] leading-snug text-gray-500 dark:text-slate-400">Gestión académica</p>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="mx-3 mt-3 flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-3 dark:bg-slate-800">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 dark:bg-slate-700">
          <span className="text-sm font-bold text-white">
            {user?.nombre?.[0]}{user?.apellido?.[0]}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">{user?.nombre} {user?.apellido}</p>
          <p className="text-[0.8125rem] capitalize text-gray-500 dark:text-slate-400">{user?.rolSistema||user?.rol}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {menu.map((item) => (
          'children' in item ? (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => toggleSection(item.label)}
                className="flex min-h-11 w-full items-center rounded-lg px-3 py-2.5 text-[0.9375rem] font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
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
                <div className="mb-1 ml-5 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2 dark:border-slate-700">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) =>
                        `nav-pencil flex min-h-11 items-center rounded-lg px-3 py-2 text-[0.9375rem] transition-colors ${
                          isActive ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-slate-800 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`
                      }
                    >
                      <child.icon className="mr-3 h-4 w-4 shrink-0" aria-hidden="true" />
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
                `nav-pencil flex min-h-11 items-center rounded-lg px-3 py-2.5 text-[0.9375rem] font-medium transition-colors ${
                  isActive ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-slate-800 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              <item.icon className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
              {item.label}
            </NavLink>
          )
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-200 dark:border-slate-700 p-3">
        <button
          onClick={handleLogout}
          className="flex min-h-11 w-full items-center rounded-lg px-3 py-2.5 text-[0.9375rem] font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
