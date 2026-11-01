import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Wallet, 
  Package, 
  FileText, 
  LogOut,
  Users,
  ShieldCheck, // <-- Importamos el nuevo ícono
  Settings,
  ChefHat,
  Receipt
} from 'lucide-react';
import clsx from 'clsx';

export const MainLayout = () => {
  const { user, hasPermission, logout } = useAuthStore();
  const navigate = useNavigate();

  const menuItems = [
    {
      label: 'Configuración',
      icon: <Settings size={24} />,
      path: '/configuracion',
      roles: ['admin']
    },
    { 
      label: 'Mesas / Piso', 
      icon: <UtensilsCrossed size={24} />, 
      path: '/mesas', 
      roles: ['admin', 'cajero', 'mesero'] 
    },
    { 
      label: 'Caja & Pagos', 
      icon: <Wallet size={24} />, 
      path: '/caja', 
      roles: ['admin', 'cajero'] 
    },
    { 
      label: 'Inventario', 
      icon: <Package size={24} />, 
      path: '/inventario', 
      roles: ['admin'] 
    },
    {
      label: 'Clientes',
      icon: <Users size={24} />,
      path: '/clientes',
      roles: ['admin', 'cajero']
    },
    {
      label: 'Empleados',
      icon: <Users size={24} />,
      path: '/empleados',
      roles: ['admin']
    },
    {
      label: 'Pantalla Cocina',
      icon: <ChefHat size={24} />,
      path: '/cocina',
      roles: ['admin', 'cocina'] // Puedes crear un rol 'cocina' en tu BD luego
    },
    {
      label: 'Roles y Permisos',
      icon: <ShieldCheck size={24} />,
      path: '/roles',
      roles: ['admin']
    },
    { 
      label: 'Reportes', 
      icon: <FileText size={24} />, 
      path: '/reportes', 
      roles: ['admin'] 
    },
    { 
      label: 'Control de Caja', 
      icon: <Wallet size={24} />, 
      path: '/cierre-caja', 
      roles: ['admin', 'cajero'] 
    },
    {
      label: 'Historial Ventas',
      icon: <Receipt size={20} />,
      path: '/historial-ventas',
      roles: ['admin', 'cajero'] 
  },
  ];

  return (
    <div className="flex h-screen w-full bg-secondary touch-action-none overflow-hidden">
      
      <aside className="w-24 md:w-64 bg-primary text-primary-foreground flex flex-col items-center md:items-stretch py-6 shrink-0 transition-all">
        <div className="mb-8 px-4 flex justify-center md:justify-start items-center">
          <div className="bg-accent text-accent-foreground p-3 rounded-xl">
            <LayoutDashboard size={28} />
          </div>
          <span className="hidden md:block ml-4 text-xl font-bold tracking-tight">BOKA</span>
        </div>

        <nav className="flex-1 w-full space-y-4 px-2 md:px-4 overflow-y-auto">
          {menuItems.filter(item => ([] as string[]).includes(item.path)).map((item) => {
            if (!hasPermission(item.roles)) return null;

            return (
              <button 
                key={item.label}
                onClick={() => navigate(item.path)}
                className={clsx(
                  "w-full flex flex-col md:flex-row items-center md:justify-start gap-2 p-3 md:p-4 rounded-xl transition-colors min-h-[64px]", 
                  "hover:bg-accent hover:text-accent-foreground",
                  "active:scale-95" 
                )}
              >
                {item.icon}
                <span className="hidden md:inline-block font-medium text-sm md:text-base">
                  {item.label}
                </span>
                <span className="md:hidden text-[10px] uppercase font-bold tracking-wider opacity-80 mt-1">
                  {item.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-2 md:px-4 pt-4 border-t border-primary-foreground/10 w-full flex flex-col gap-2">
          <div className="hidden md:block px-2 text-sm opacity-80">
            <p className="font-bold">{user?.nombre_completo}</p>
            <p className="capitalize text-xs text-muted-foreground">{user?.role}</p>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center md:justify-start gap-3 p-3 md:p-4 rounded-xl text-destructive-foreground bg-destructive/80 hover:bg-destructive active:scale-95 transition-colors min-h-[64px]"
          >
            <LogOut size={24} />
            <span className="hidden md:inline font-bold">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 relative overflow-auto bg-background/50">
        <Outlet />
      </main>

    </div>
  );
};