import type React from 'react';
import { useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { LayoutDashboard, LogIn, Lock, User } from 'lucide-react';
import api from '../../services/api';

export const LoginView = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(state => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
     const response = await api.post('/auth/login', { username, password });
      const { usuario, token } = response.data.data;

      let rolAsignado = 'mesero'; // Rol base por seguridad
      if (usuario.roles && (usuario.roles.includes('Super Admin') || usuario.roles.includes('Administrador'))) {
        rolAsignado = 'admin';
      } else if (usuario.roles && usuario.roles.includes('Cocina')) {
        rolAsignado = 'cocina';
      } else if (usuario.roles && usuario.roles.includes('Cajero')) {
        rolAsignado = 'cajero';
      }

      const usuarioAdaptado = { ...usuario, role: rolAsignado };
      login(usuarioAdaptado, token);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Header / Logo */}
        <div className="bg-primary px-8 py-10 flex flex-col items-center justify-center text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm shadow-inner mb-4 relative z-10">
            <LayoutDashboard size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight relative z-10">BOKA</h1>
          <p className="text-primary-foreground/80 font-medium mt-2 relative z-10">Sistema de Gestión de Restaurantes</p>
        </div>

        {/* Formulario */}
        <div className="p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Inicia Sesión</h2>
          
          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm font-bold mb-6 text-center border border-rose-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Usuario</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <User size={20} />
                </div>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-slate-900 font-medium outline-none"
                  placeholder="Tu nombre de usuario"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock size={20} />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-slate-900 font-medium outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl font-black text-lg shadow-lg shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={24} />
                  <span>ENTRAR AL SISTEMA</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
