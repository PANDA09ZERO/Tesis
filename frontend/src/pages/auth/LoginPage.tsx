import { useTheme } from '../../context/ThemeContext';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import InstallAppCard from '../../components/ui/InstallAppCard';

export default function LoginPage() {
  const {theme,toggleTheme}=useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Complete todos los campos');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      // Error handled in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-surface relative grid min-h-screen min-h-dvh bg-gray-50 dark:bg-gray-900 lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)]">
      {/* Panel institucional: solo en escritorio, donde hay espacio para la identidad sin empujar el formulario. */}
      <aside aria-hidden="true" className="relative hidden flex-col justify-between overflow-hidden bg-primary-700 p-12 text-white lg:flex dark:bg-gray-950">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1"><img src="/assets/logo.png" alt="" className="h-10 w-10 object-contain" /></span>
          <span className="text-lg font-bold">Ciencias e Ingeniería</span>
        </div>
        <div className="max-w-md">
          <span className="mb-6 block h-1 w-12 rounded-full bg-[#d98a82]" />
          <p className="text-[2.25rem] font-bold leading-[1.15] tracking-tight">Notas, asistencia y horarios del año escolar en un solo lugar.</p>
          <p className="mt-4 text-base text-primary-100">Para docentes, estudiantes, familias y administración.</p>
        </div>
        <p className="text-sm text-primary-200">Gestión académica institucional</p>
      </aside>
      <button type="button" onClick={toggleTheme} aria-label={theme==='dark'?'Cambiar a tema claro':'Cambiar a tema oscuro'} className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">{theme==='dark'?<Sun className="h-5 w-5"/>:<Moon className="h-5 w-5"/>}</button>
      <main className="flex items-center justify-center px-5 py-16 sm:px-8">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <img src="/assets/logo.png" alt="Ciencias e Ingeniería" className="mb-6 h-16 w-16 object-contain lg:hidden" />
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100"><span className="lg:hidden">Ciencias e Ingeniería</span><span className="hidden lg:inline">Iniciar sesión</span></h1>
          <p className="mt-2 text-[0.9375rem] text-gray-500 dark:text-gray-400">Ingresa con tu usuario institucional.</p>
        </div>

        <div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">Correo electrónico</label>
              <input
                aria-label="Correo Electrónico" type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="nombre.apellido@cienciaseingenieria.edu"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">Contraseña</label>
              <div className="relative">
                <input
                  aria-label="Contraseña" type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-12"
                  placeholder="••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary mt-2 w-full"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando...
                </span>
              ) : 'Iniciar Sesión'}
            </button>
          </form>
          <div className="mt-6"><InstallAppCard compacto permitirOcultar={false} /></div>
        </div>
      </div>
      </main>
    </div>
  );
}
