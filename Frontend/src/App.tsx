import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { MainLayout } from './layouts/MainLayout';
import { LoginView } from './pages/Auth/LoginView';
import { RolesPermisosView } from './pages/Admin/RolesPermisosView';
import { InventarioView } from './pages/Inventario/InventarioView';
import { EmpleadosView } from './pages/Empleados/EmpleadosView';
import { ClientesView } from './pages/Clientes/ClientesView';
import { ConfiguracionView } from './pages/Admin/ConfiguracionView';

function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  if (!isAuthenticated) {
    return <BrowserRouter><Routes><Route path="*" element={<LoginView />} /></Routes></BrowserRouter>;
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/inicio" replace />} />
        <Route element={<MainLayout />}>
          <Route path="/inicio" element={<div className="p-8">Bienvenido a BOKA.</div>} />
          <Route path="/roles" element={<RolesPermisosView />} />
          <Route path="/inventario" element={<InventarioView />} />
          <Route path="/empleados" element={<EmpleadosView />} />
          <Route path="/clientes" element={<ClientesView />} />
          <Route path="/configuracion" element={<ConfiguracionView />} />

          <Route path="*" element={<Navigate to="/inicio" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
export default App;
