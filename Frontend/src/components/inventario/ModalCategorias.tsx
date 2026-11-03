import type React from 'react';
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChefHat, MonitorOff } from 'lucide-react';
import api from '../../services/api';
import clsx from 'clsx';

export const ModalCategorias = ({ onClose }: { onClose: () => void }) => {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [enviarCocina, setEnviarCocina] = useState(true);

  const fetchCategorias = async () => {
    try {
      const res = await api.get('/categorias');
      setCategorias(res.data.data || res.data);
    } catch (error) {
      console.error('Error fetching categorias', error);
    }
  };

  useEffect(() => { fetchCategorias(); }, []);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    try {
      await api.post('/categorias', { nombre: nuevoNombre, enviar_cocina: enviarCocina });
      setNuevoNombre('');
      setEnviarCocina(true);
      fetchCategorias();
    } catch (error) { alert('Error al crear categoría'); }
  };

  const handleEliminar = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta categoría?')) return;
    try {
      await api.delete(`/categorias/${id}`);
      fetchCategorias();
    } catch (error) { alert('No se puede eliminar porque tiene productos asociados.'); }
  };

  const handleToggleCocina = async (id: string, estadoActual: boolean) => {
    try {
      await api.patch(`/categorias/${id}/cocina`, { enviar_cocina: !estadoActual });
      fetchCategorias(); // Recargar para ver el cambio
    } catch (error) { alert('Error al actualizar configuración'); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Gestor de Categorías</h2>
            <p className="text-slate-500 text-sm mt-1">Configura el menú y el enrutamiento a cocina</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
            <X size={20} className="text-slate-700" />
          </button>
        </div>

        {/* Formulario de Creación */}
        <div className="p-6 border-b bg-white">
          <form onSubmit={handleCrear} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nombre de la Categoría</label>
              <input 
                type="text" 
                value={nuevoNombre} 
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="Ej. Bebidas, Postres, Fuertes..."
                className="w-full bg-slate-100 border-none rounded-xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                {enviarCocina ? <ChefHat className="text-emerald-500" /> : <MonitorOff className="text-slate-400" />}
                <div>
                  <p className="font-bold text-slate-700">Enviar a Pantalla de Cocina (KDS)</p>
                  <p className="text-xs text-slate-500">¿Requiere preparación por parte del Chef?</p>
                </div>
              </div>
              {/* Switch Toggle Animado */}
              <button 
                type="button" 
                onClick={() => setEnviarCocina(!enviarCocina)}
                className={clsx("w-14 h-8 rounded-full transition-colors relative", enviarCocina ? "bg-emerald-500" : "bg-slate-300")}
              >
                <div className={clsx("absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-md", enviarCocina ? "left-7" : "left-1")} />
              </button>
            </div>

            <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95">
              <Plus size={20} /> Crear Categoría
            </button>
          </form>
        </div>

        {/* Lista Dinámica */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Categorías Existentes</h3>
          <div className="space-y-3">
            {categorias.length === 0 && <p className="text-center text-slate-400 font-medium py-4">No hay categorías registradas.</p>}
            
            {categorias.map(cat => (
              <div key={cat.id} className="bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between group">
                <span className="font-bold text-slate-700">{cat.nombre}</span>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleToggleCocina(cat.id, cat.enviar_cocina)}
                    title={cat.enviar_cocina ? "Va a Cocina" : "No va a Cocina"}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors",
                      cat.enviar_cocina ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    {cat.enviar_cocina ? <><ChefHat size={14}/> KDS ON</> : <><MonitorOff size={14}/> KDS OFF</>}
                  </button>
                  
                  <button onClick={() => handleEliminar(cat.id)} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};