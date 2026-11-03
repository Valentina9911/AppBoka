import type React from 'react';
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Users, Plus, X } from 'lucide-react';

export const ClientesView = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    cedula_nit: '',
    telefono: ''
  });

  const fetchClientes = async () => {
    try {
      const { data } = await api.get('/clientes');
      setClientes(data.data?.clientes || data.data || []);
    } catch (error) {
      console.error('Error fetching clientes', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleOpenModal = () => {
    setFormData({ nombre: '', cedula_nit: '', telefono: '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/clientes', formData);
      setModalOpen(false);
      fetchClientes();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al guardar el cliente');
    }
  };

  return (
    <div className="p-6 md:p-8 h-full flex flex-col bg-slate-50">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Clientes</h1>
          <p className="text-slate-500 mt-1 text-lg">Directorio de clientes para facturación</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          Nuevo Cliente
        </button>
      </header>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-600">
                <th className="p-4 font-bold">Nombre / Razón Social</th>
                <th className="p-4 font-bold">Cédula / NIT</th>
                <th className="p-4 font-bold">Teléfono</th>
                <th className="p-4 font-bold text-center">ID Sistema</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Cargando clientes...</td></tr>
              ) : clientes.map((cli) => (
                <tr key={cli.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-medium text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                      <Users size={16} />
                    </div>
                    {cli.nombre}
                  </td>
                  <td className="p-4 text-slate-600">{cli.cedula_nit || 'N/A'}</td>
                  <td className="p-4 text-slate-600">{cli.telefono || 'N/A'}</td>
                  <td className="p-4 text-center font-mono text-sm text-slate-400">#{cli.id}</td>
                </tr>
              ))}
              {!loading && clientes.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">No se encontraron clientes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold">Nuevo Cliente</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-slate-700"><X size={24}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre o Razón Social</label>
                <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full border p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Cédula o NIT</label>
                <input type="text" value={formData.cedula_nit} onChange={e => setFormData({...formData, cedula_nit: e.target.value})} className="w-full border p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono</label>
                <input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full border p-2 rounded-lg" />
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
