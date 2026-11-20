import type React from 'react';
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit, Save } from 'lucide-react';
import api from '../../services/api';
import clsx from 'clsx';

export const ModalGestionMesas = ({ onClose, onUpdate }: { onClose: () => void, onUpdate: () => void }) => {
  const [mesas, setMesas] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [isCreating, setIsCreating] = useState(false);

  const fetchMesas = async () => {
    try {
      const { data } = await api.get('/mesas');
      setMesas(data.data || []);
    } catch (error) { console.error('Error fetching mesas', error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMesas(); }, []);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/mesas', formData);
      setIsCreating(false);
      setFormData({});
      fetchMesas();
      onUpdate();
    } catch (error: any) { alert(error.response?.data?.message || 'Error'); }
  };

  const handleGuardar = async (id: number) => {
    try {
      await api.put(`/mesas/${id}`, formData);
      setEditandoId(null);
      fetchMesas();
      onUpdate();
    } catch (error: any) { alert(error.response?.data?.message || 'Error'); }
  };

  const handleEliminar = async (id: number) => {
    if (confirm('¿Eliminar esta mesa definitivamente?')) {
      try {
        await api.delete(`/mesas/${id}`);
        fetchMesas();
        onUpdate();
      } catch (error: any) { alert(error.response?.data?.message || 'Error'); }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-black text-slate-800">Gestión de Mesas y Áreas</h2>
          <button onClick={onClose} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <button onClick={() => { setIsCreating(true); setFormData({ nombre: '', capacidad: 4, ubicacion: '', estado: 'disponible' }) }} className="mb-6 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2">
            <Plus size={20} /> Añadir Nueva Mesa
          </button>

          {isCreating && (
            <form onSubmit={handleCrear} className="bg-indigo-50 border-2 border-indigo-100 p-4 rounded-2xl mb-6 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
              <div><label className="block text-xs font-bold mb-1">Nombre</label><input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full p-2 rounded-lg border outline-none" placeholder="Mesa 1"/></div>
              <div><label className="block text-xs font-bold mb-1">Capacidad</label><input required type="number" value={formData.capacidad} onChange={e => setFormData({...formData, capacidad: e.target.value})} className="w-full p-2 rounded-lg border outline-none" /></div>
              <div><label className="block text-xs font-bold mb-1">Ubicación</label><input type="text" value={formData.ubicacion} onChange={e => setFormData({...formData, ubicacion: e.target.value})} className="w-full p-2 rounded-lg border outline-none" placeholder="Terraza"/></div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-emerald-600 text-white p-2 rounded-lg font-bold">Guardar</button>
                <button type="button" onClick={() => setIsCreating(false)} className="bg-slate-300 p-2 rounded-lg"><X size={20}/></button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {mesas.map(mesa => (
              <div key={mesa.id} className={clsx("flex flex-col md:flex-row gap-3 p-4 border-2 rounded-2xl items-center", editandoId === mesa.id ? "bg-amber-50 border-amber-200" : "bg-white border-slate-100")}>
                
                {editandoId === mesa.id ? (
                  <>
                    <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="flex-1 p-2 rounded-lg border" />
                    <input type="number" value={formData.capacidad} onChange={e => setFormData({...formData, capacidad: e.target.value})} className="w-20 p-2 rounded-lg border" />
                    <input type="text" value={formData.ubicacion} onChange={e => setFormData({...formData, ubicacion: e.target.value})} className="flex-1 p-2 rounded-lg border" />
                    <select value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} className="p-2 rounded-lg border">
                      <option value="disponible" disabled={mesa.estado==='ocupada'}>Disponible</option>
                      <option value="ocupada" disabled>Ocupada</option>
                      <option value="reservada" disabled={mesa.estado==='ocupada'}>Reservada</option>
                      <option value="mantenimiento" disabled={mesa.estado==='ocupada'}>Mantenimiento</option>
                    </select>
                    <button onClick={() => handleGuardar(mesa.id)} className="p-2 bg-emerald-600 text-white rounded-lg"><Save size={20}/></button>
                    <button onClick={() => setEditandoId(null)} className="p-2 bg-slate-300 rounded-lg"><X size={20}/></button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 font-bold text-slate-800">{mesa.nombre} <span className="text-xs text-slate-400 font-normal">({mesa.ubicacion || 'Sin área'})</span></div>
                    <div className="w-20 text-center font-medium bg-slate-100 py-1 rounded-lg">{mesa.capacidad} pers.</div>
                    <div className={clsx("w-32 text-center text-xs font-bold py-1 px-2 rounded-full uppercase", 
                      mesa.estado === 'disponible' ? 'bg-emerald-100 text-emerald-700' :
                      mesa.estado === 'ocupada' ? 'bg-rose-100 text-rose-700' :
                      mesa.estado === 'reservada' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'
                    )}>{mesa.estado}</div>
                    
                    <div className="flex gap-2">
                      <button onClick={() => { setEditandoId(mesa.id); setFormData(mesa); }} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg"><Edit size={18}/></button>
                      <button onClick={() => handleEliminar(mesa.id)} disabled={mesa.estado==='ocupada'} className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg disabled:opacity-30"><Trash2 size={18}/></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};