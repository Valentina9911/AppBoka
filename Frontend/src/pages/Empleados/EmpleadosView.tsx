import type React from 'react';
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { UserCheck, UserX, Plus, X, Edit } from 'lucide-react';
import clsx from 'clsx';

export const EmpleadosView = () => {
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nombre_completo: '',
    username: '',
    password: '', // Solo se usa en creación
    rol_ids: [] as string[]
  });

  const fetchEmpleados = async () => {
    try {
      const { data } = await api.get('/usuarios');
      setEmpleados(data.data || []);
    } catch (error) {
      console.error('Error fetching empleados', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/usuarios/roles');
      setRoles(data.data || []);
    } catch (error) {
      console.error('Error fetching roles', error);
    }
  };

  useEffect(() => {
    fetchEmpleados();
    fetchRoles();
  }, []);

  const handleOpenModal = (empleado?: any) => {
    if (empleado) {
      setEditingId(empleado.id);
      setFormData({
        nombre_completo: empleado.nombre_completo,
        username: empleado.username,
        password: '', 
        rol_ids: empleado.roles?.map((r: any) => r.id) || []
      });
    } else {
      setEditingId(null);
      setFormData({ nombre_completo: '', username: '', password: '', rol_ids: [] });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/usuarios/${editingId}`, {
          nombre_completo: formData.nombre_completo,
          username: formData.username
        });
        await api.put(`/usuarios/${editingId}/roles`, { rol_ids: formData.rol_ids });
      } else {
        await api.post('/auth/registrar', formData);
      }
      
      setModalOpen(false);
      fetchEmpleados();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al guardar el empleado');
    }
  };

  return (
    <div className="p-6 md:p-8 h-full flex flex-col bg-slate-50">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Empleados</h1>
          <p className="text-slate-500 mt-1 text-lg">Administración de usuarios y roles del sistema</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          Nuevo Empleado
        </button>
      </header>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-600">
                <th className="p-4 font-bold">Nombre Completo</th>
                <th className="p-4 font-bold">Usuario</th>
                <th className="p-4 font-bold">Roles</th>
                <th className="p-4 font-bold">Estado</th>
                <th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Cargando empleados...</td></tr>
              ) : empleados.map((emp) => (
                <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-medium text-slate-900">{emp.nombre_completo}</td>
                  <td className="p-4 text-slate-600">{emp.username}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {emp.roles && emp.roles.length > 0 ? (
                        emp.roles.map((r: any) => (
                          <span key={r.id} className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                            {r.nombre}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-sm">Sin rol</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className={clsx("inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full",
                      emp.activo ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    )}>
                      {emp.activo ? <UserCheck size={16} /> : <UserX size={16} />}
                      {emp.activo ? 'Activo' : 'Inactivo'}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleOpenModal(emp)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors inline-flex items-center justify-center"
                    >
                      <Edit size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold">{editingId ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-slate-700"><X size={24}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input required type="text" value={formData.nombre_completo} onChange={e => setFormData({...formData, nombre_completo: e.target.value})} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Usuario (Username)</label>
                <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-primary outline-none" />
              </div>
              
              {!editingId && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
                  <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-primary outline-none" />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Asignar Roles</label>
                <div className="space-y-2 border-2 border-slate-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                  {roles.map(r => (
                    <label key={r.id} className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.rol_ids.includes(r.id)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            rol_ids: isChecked 
                              ? [...prev.rol_ids, r.id]
                              : prev.rol_ids.filter(id => id !== r.id)
                          }));
                        }}
                        className="w-5 h-5 text-primary rounded focus:ring-primary"
                      />
                      <span className="font-medium text-slate-800">{r.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 font-bold text-slate-600 bg-slate-100 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};