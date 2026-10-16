import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { MainLayout } from './layouts/MainLayout';
import { LoginView } from './pages/Auth/LoginView';

function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<LoginView />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/mesas" replace />} />
        <Route element={<MainLayout />}>
          <Route path="/pos" element={<Navigate to="/caja" replace />} />
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
