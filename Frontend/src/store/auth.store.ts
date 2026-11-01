import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UsuarioSesion {
  id: string;
  username: string;
  nombre_completo: string;
  role: string; 
  roles?: string[]; // Ahora son opcionales para que no crashee
  permisos?: string[]; 
}

interface AuthState {
  user: UsuarioSesion | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: UsuarioSesion, token: string) => void;
  logout: () => void;
  hasPermission: (requiredRolesOrPerms: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        localStorage.setItem('kw_token', token);
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('kw_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      hasPermission: (required) => {
        const state = get();
        if (!state.isAuthenticated || !state.user) return false;

        const usuario = state.user;
        
        const userRoles = usuario.roles || [];
        const userPerms = usuario.permisos || [];

        if (userRoles.includes('Super Admin') || usuario.role === 'admin') {
          return true;
        }

        return required.some(req => 
          userPerms.includes(req) || 
          userRoles.includes(req) || 
          usuario.role === req
        );
      },
    }),
    {
      name: 'BOKA-auth-storage', 
      storage: createJSONStorage(() => localStorage),
    }
  )
);