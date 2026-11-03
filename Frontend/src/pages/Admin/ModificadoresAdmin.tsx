import type React from 'react';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api'; // Ajusta la ruta a tu cliente de Axios

interface Modificador {
  id: string;
  nombre: string;
  precio_extra: string | number;
}

interface Grupo {
  id: string;
  nombre: string;
  min_selecciones: number;
  max_selecciones: number;
  modificadores: Modificador[];
}

export const ModificadoresAdmin = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);

  const [nuevoGrupo, setNuevoGrupo] = useState({ nombre: '', min: 0, max: 1 });
  
  const [nuevaOpcion, setNuevaOpcion] = useState<{ grupoId: string, nombre: string, precio: string | number }>({
    grupoId: '', nombre: '', precio: ''
  });

  useEffect(() => {
    cargarGrupos();
  }, []);

  const cargarGrupos = async () => {
    try {
      setLoading(true);
      const res = await api.get('/modificadores/grupos');
      setGrupos(res.data.data);
    } catch (error) {
      console.error('Error cargando grupos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoGrupo.nombre) return;
    
    try {
      await api.post('/modificadores/grupos', {
        nombre: nuevoGrupo.nombre,
        min_selecciones: nuevoGrupo.min,
        max_selecciones: nuevoGrupo.max
      });
      setNuevoGrupo({ nombre: '', min: 0, max: 1 });
      cargarGrupos();
    } catch (error) {
      console.error('Error creando grupo:', error);
      alert('Hubo un error al crear el grupo');
    }
  };

  const handleEliminarGrupo = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este grupo? Se ocultará de los productos.')) return;
    try {
      await api.delete(`/modificadores/grupos/${id}`);
      cargarGrupos();
    } catch (error) {
      console.error('Error eliminando grupo:', error);
    }
  };

  const handleAgregarOpcion = async (e: React.FormEvent, grupoId: string) => {
    e.preventDefault();
    if (!nuevaOpcion.nombre || nuevaOpcion.grupoId !== grupoId) return;

    try {
      await api.post(`/modificadores/grupos/${grupoId}/opciones`, {
        nombre: nuevaOpcion.nombre,
        precio_extra: Number(nuevaOpcion.precio) || 0
      });
      setNuevaOpcion({ grupoId: '', nombre: '', precio: '' });
      cargarGrupos();
    } catch (error) {
      console.error('Error agregando opción:', error);
    }
  };

  const handleEliminarOpcion = async (id: string) => {
    if (!window.confirm('¿Eliminar esta opción?')) return;
    try {
      await api.delete(`/modificadores/opciones/${id}`);
      cargarGrupos();
    } catch (error) {
      console.error('Error eliminando opción:', error);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Cargando modificadores...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 animate-in fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
          <Layers className="text-indigo-600" size={32} />
          Administrar Modificadores
        </h1>
        <p className="text-slate-500 font-medium mt-2">
          Crea grupos de opciones (ej. "Sabores") y asígnales ítems para usarlos en tus productos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: Formulario Nuevo Grupo */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Crear Nuevo Grupo</h2>
            <form onSubmit={handleCrearGrupo} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">Nombre del Grupo</label>
                <input 
                  type="text" 
                  placeholder="Ej: Sabores de Helado"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={nuevoGrupo.nombre}
                  onChange={e => setNuevoGrupo({...nuevoGrupo, nombre: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">Mínimo</label>
                  <input 
                    type="number" 
                    min="0"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={nuevoGrupo.min}
                    onChange={e => setNuevoGrupo({...nuevoGrupo, min: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">Máximo</label>
                  <input 
                    type="number" 
                    min="1"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={nuevoGrupo.max}
                    onChange={e => setNuevoGrupo({...nuevoGrupo, max: parseInt(e.target.value) || 1})}
                  />
                </div>
              </div>
              <button type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold transition-colors">
                <Plus size={20} /> Guardar Grupo
              </button>
            </form>
            
            <div className="mt-6 bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-blue-700 text-sm">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p><b>Tip:</b> Si Mínimo es 0, el grupo será opcional. Si Mínimo es mayor a 0, el sistema obligará al mesero a elegir opciones.</p>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Lista de Grupos y Opciones */}
        <div className="lg:col-span-2 space-y-6">
          {grupos.length === 0 && (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold">
              Aún no has creado ningún grupo de modificadores.
            </div>
          )}

          {grupos.map(grupo => (
            <div key={grupo.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Header del Grupo */}
              <div className="bg-slate-50 border-b border-slate-200 p-5 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{grupo.nombre}</h3>
                  <p className="text-sm text-slate-500 font-medium">Selección: Min {grupo.min_selecciones} / Max {grupo.max_selecciones}</p>
                </div>
                <button 
                  onClick={() => handleEliminarGrupo(grupo.id)}
                  className="text-slate-400 hover:text-rose-500 p-2 transition-colors"
                  title="Eliminar Grupo"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              {/* Lista de Opciones */}
              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  {grupo.modificadores.map(mod => (
                    <div key={mod.id} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className={Number(mod.precio_extra) > 0 ? "text-emerald-500" : "text-slate-300"} />
                        <span className="font-bold text-slate-700 text-sm">{mod.nombre}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {Number(mod.precio_extra) > 0 && (
                          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                            +${Number(mod.precio_extra).toLocaleString()}
                          </span>
                        )}
                        <button onClick={() => handleEliminarOpcion(mod.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Formulario rápido para agregar opción a este grupo */}
                <form 
                  onSubmit={(e) => handleAgregarOpcion(e, grupo.id)} 
                  className="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200"
                >
                  <input 
                    type="text" 
                    placeholder="Nueva opción (Ej: Fresa)" 
                    className="flex-1 bg-white border border-slate-200 p-2 rounded-lg text-sm outline-none focus:border-indigo-500"
                    value={nuevaOpcion.grupoId === grupo.id ? nuevaOpcion.nombre : ''}
                    onChange={e => setNuevaOpcion({ grupoId: grupo.id, nombre: e.target.value, precio: nuevaOpcion.precio })}
                    required
                  />
                  <input 
                    type="number" 
                    placeholder="Precio extra (Opcional)" 
                    className="w-40 bg-white border border-slate-200 p-2 rounded-lg text-sm outline-none focus:border-indigo-500"
                    value={nuevaOpcion.grupoId === grupo.id ? nuevaOpcion.precio : ''}
                    onChange={e => setNuevaOpcion({ ...nuevaOpcion, grupoId: grupo.id, precio: e.target.value })}
                  />
                  <button type="submit" className="bg-slate-800 hover:bg-slate-700 text-white px-4 rounded-lg font-bold transition-colors">
                    Añadir
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};