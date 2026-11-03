import type React from 'react';
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Edit, Plus, X, Trash2, ChefHat, Package, Tag, Layers } from 'lucide-react';
import clsx from 'clsx';

import { ModalCategorias } from '../../components/inventario/ModalCategorias';
import { ModificadoresAdmin } from '../Admin/ModificadoresAdmin';

export const InventarioView = () => {
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [gruposDisponibles, setGruposDisponibles] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [modalCategoriasOpen, setModalCategoriasOpen] = useState(false);
  const [modalModificadoresOpen, setModalModificadoresOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    categoria_id: '',
    precio_venta: 0,
    stock_actual: 0,
    tipo: 'simple'
  });

  const [gruposSeleccionados, setGruposSeleccionados] = useState<string[]>([]);

  const [receta, setReceta] = useState<any[]>([]);
  const [ingredientesAEliminar, setIngredientesAEliminar] = useState<string[]>([]);
  const [ingredienteSeleccionado, setIngredienteSeleccionado] = useState('');
  const [cantidadIngrediente, setCantidadIngrediente] = useState('');
  const [unidadMedida, setUnidadMedida] = useState('gramos');

  const fetchProductos = async () => {
    try {
      const { data } = await api.get('/productos');
      setProductos(data.data || data);
    } catch (error) { console.error('Error fetching inventario', error); } 
    finally { setLoading(false); }
  };

  const fetchCategoriasYGrupos = async () => {
    try {
      const [resCat, resGrupos] = await Promise.all([
        api.get('/productos/categorias'),
        api.get('/modificadores/grupos')
      ]);
      setCategorias(resCat.data.data || resCat.data);
      setGruposDisponibles(resGrupos.data.data || []);
    } catch (error) { console.error('Error fetching dependencias', error); }
  };

  useEffect(() => {
    fetchProductos();
    fetchCategoriasYGrupos();
  }, []);

  const handleOpenModal = async (producto?: any) => {
    if (categorias.length === 0 || gruposDisponibles.length === 0) fetchCategoriasYGrupos();
    
    setReceta([]);
    setIngredientesAEliminar([]);
    setIngredienteSeleccionado('');
    setCantidadIngrediente('');
    setGruposSeleccionados([]);
    
    if (producto) {
      const prodId = producto.id || producto.producto_id;
      setEditingId(prodId);
      setFormData({
        nombre: producto.nombre,
        categoria_id: producto.categoria_id || '',
        precio_venta: Number(producto.precio_venta) || 0,
        stock_actual: Number(producto.stock_actual) || 0,
        tipo: producto.tipo || 'simple'
      });

      if (producto.tipo === 'compuesto') {
        try {
          const res = await api.get(`/productos/${prodId}/receta`);
          setReceta(res.data.data || []);
        } catch (error) { console.error("Error al cargar receta:", error); }
      }

      try {
        const resMods = await api.get(`/modificadores/vincular/${prodId}`);
        setGruposSeleccionados(resMods.data.data || []);
      } catch (error) { console.error("Error al cargar modificadores:", error); }

    } else {
      setEditingId(null);
      setFormData({ nombre: '', categoria_id: '', precio_venta: 0, stock_actual: 0, tipo: 'simple' });
    }
    setModalOpen(true);
  };

  const handleAddIngrediente = () => {
    if (!ingredienteSeleccionado || !cantidadIngrediente) return;
    const prodSimple = productos.find(p => p.id === ingredienteSeleccionado);
    if (!prodSimple) return;
    if (receta.some(r => r.ingrediente_id === ingredienteSeleccionado)) {
      alert('Este ingrediente ya está en la receta.'); return;
    }
    setReceta([...receta, { ingrediente_id: ingredienteSeleccionado, ingrediente_nombre: prodSimple.nombre, cantidad: Number(cantidadIngrediente), unidad_medida: unidadMedida }]);
    setIngredienteSeleccionado(''); setCantidadIngrediente('');
  };

  const handleRemoveIngrediente = (ingId: string) => {
    setReceta(receta.filter(r => r.ingrediente_id !== ingId));
    if (editingId) setIngredientesAEliminar([...ingredientesAEliminar, ingId]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let savedProd;
      if (editingId) {
        const res = await api.put(`/productos/${editingId}`, formData);
        savedProd = res.data.data || res.data;
      } else {
        const res = await api.post('/productos', formData);
        savedProd = res.data.data || res.data;
      }

      const prodId = editingId || savedProd.id;

      if (formData.tipo === 'compuesto' && prodId) {
        for (const ingId of ingredientesAEliminar) await api.delete(`/productos/${prodId}/receta/${ingId}`);
        for (const item of receta) {
          await api.post(`/productos/${prodId}/receta`, { ingrediente_id: item.ingrediente_id, cantidad: item.cantidad, unidad_medida: item.unidad_medida });
        }
      }

      await api.post(`/modificadores/vincular/${prodId}`, { gruposIds: gruposSeleccionados });

      setModalOpen(false);
      fetchProductos();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al guardar el producto');
    }
  };

  const ingredientesDisponibles = productos.filter(p => p.tipo === 'simple' && p.id !== editingId);

  return (
    <div className="p-6 md:p-8 h-full flex flex-col bg-slate-50 relative">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Catálogo e Inventario</h1>
          <p className="text-slate-500 mt-1 text-lg">Administra tus productos, recetas y modificadores</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setModalCategoriasOpen(true)} className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-indigo-200 transition-colors shadow-sm">
            <Tag size={20} /> Categorías
          </button>
          {/* 🔥 BOTÓN DE MODIFICADORES */}
          <button onClick={() => setModalModificadoresOpen(true)} className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-amber-200 transition-colors shadow-sm">
            <Layers size={20} /> Extras/Sabores
          </button>
          <button onClick={() => handleOpenModal()} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus size={20} /> Nuevo Producto
          </button>
        </div>
      </header>

      {/* TABLA PRINCIPAL DE PRODUCTOS */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-600">
                <th className="p-4 font-bold">Tipo</th>
                <th className="p-4 font-bold">Nombre</th>
                <th className="p-4 font-bold">Categoría</th>
                <th className="p-4 font-bold">Precio</th>
                <th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Cargando inventario...</td></tr>
              ) : productos.map((prod) => (
                <tr key={prod.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    {prod.tipo === 'compuesto' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md"><ChefHat size={14}/> Receta</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md"><Package size={14}/> Simple</span>
                    )}
                  </td>
                  <td className="p-4 font-medium text-slate-900">{prod.nombre}</td>
                  <td className="p-4 text-slate-600">{prod.cat || prod.categoria || 'Sin Categoría'}</td>
                  <td className="p-4 font-bold text-emerald-600">${Number(prod.precio_venta).toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleOpenModal(prod)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors inline-flex items-center justify-center"><Edit size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALES SECUNDARIOS */}
      {/* ========================================================================= */}
      {modalCategoriasOpen && <ModalCategorias onClose={() => { setModalCategoriasOpen(false); fetchCategoriasYGrupos(); }} />}
      
      {/* 🔥 MODAL GIGANTE DE MODIFICADORES */}
      {modalModificadoresOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-50 w-full max-w-7xl h-[95vh] rounded-[2rem] shadow-2xl overflow-y-auto relative animate-in zoom-in-95 duration-200 border border-white/20">
            <button onClick={() => { setModalModificadoresOpen(false); fetchCategoriasYGrupos(); }} className="absolute top-6 right-6 p-3 bg-white shadow-sm border text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors z-20"><X size={24}/></button>
            {/* Reutilizamos el componente administrativo completo dentro de este modal */}
            <ModificadoresAdmin />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PRINCIPAL: CREAR / EDITAR PRODUCTO */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-xl font-black text-slate-800">{editingId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:bg-slate-200 p-2 rounded-full"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button type="button" onClick={() => setFormData({...formData, tipo: 'simple'})} className={clsx("flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all", formData.tipo === 'simple' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700")}>
                  <Package size={18} /> Producto Simple (Insumo/Venta Directa)
                </button>
                <button type="button" onClick={() => setFormData({...formData, tipo: 'compuesto'})} className={clsx("flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all", formData.tipo === 'compuesto' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700")}>
                  <ChefHat size={18} /> Producto Compuesto (Receta/Menú)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-bold text-slate-700 mb-1">Nombre Comercial</label><input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-primary outline-none font-medium" placeholder="Ej: Hamburguesa Sencilla" /></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-1">Categoría</label><select value={formData.categoria_id} onChange={e => setFormData({...formData, categoria_id: e.target.value})} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-primary outline-none font-medium"><option value="">Sin Categoría</option>{categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}</select></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-1">Precio de Venta ($)</label><input required type="number" min="0" step="0.01" value={formData.precio_venta} onChange={e => setFormData({...formData, precio_venta: parseFloat(e.target.value)})} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-primary outline-none font-medium" /></div>
                {formData.tipo === 'simple' && (
                  <div><label className="block text-sm font-bold text-slate-700 mb-1">Stock Físico Actual</label><input required type="number" min="0" step="0.01" value={formData.stock_actual} onChange={e => setFormData({...formData, stock_actual: parseFloat(e.target.value)})} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-primary outline-none font-medium" /></div>
                )}
              </div>

              {formData.tipo === 'compuesto' && (
                <div className="border-t-2 border-dashed border-slate-200 pt-6 mt-6">
                  <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><ChefHat size={20} className="text-indigo-500"/> Ingredientes de la Receta</h3>
                  <div className="flex flex-col md:flex-row gap-3 items-end mb-6 bg-indigo-50 p-4 rounded-2xl">
                    <div className="flex-1 w-full"><label className="block text-xs font-bold text-indigo-900 mb-1 uppercase">Materia Prima</label><select value={ingredienteSeleccionado} onChange={(e) => setIngredienteSeleccionado(e.target.value)} className="w-full border-2 border-indigo-200 p-3 rounded-xl outline-none font-medium text-slate-700"><option value="">Seleccione un insumo...</option>{ingredientesDisponibles.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
                    <div className="w-full md:w-32"><label className="block text-xs font-bold text-indigo-900 mb-1 uppercase">Cantidad</label><input type="number" min="0.01" step="0.01" value={cantidadIngrediente} onChange={(e) => setCantidadIngrediente(e.target.value)} placeholder="0.00" className="w-full border-2 border-indigo-200 p-3 rounded-xl outline-none font-medium text-slate-700 text-center" /></div>
                    <div className="w-full md:w-40"><label className="block text-xs font-bold text-indigo-900 mb-1 uppercase">Unidad</label><select value={unidadMedida} onChange={(e) => setUnidadMedida(e.target.value)} className="w-full border-2 border-indigo-200 p-3 rounded-xl outline-none font-medium text-slate-700"><option value="unidad">Unidades</option><option value="gramos">Gramos (g)</option><option value="kilogramos">Kilos (kg)</option><option value="mililitros">Mililitros (ml)</option><option value="litros">Litros (L)</option><option value="onzas">Onzas (oz)</option></select></div>
                    <button type="button" onClick={handleAddIngrediente} disabled={!ingredienteSeleccionado || !cantidadIngrediente} className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all h-[52px]">Añadir</button>
                  </div>
                  {receta.length > 0 ? (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-100"><tr><th className="p-3 text-sm font-bold text-slate-600">Ingrediente</th><th className="p-3 text-sm font-bold text-slate-600">Cantidad</th><th className="p-3 text-sm font-bold text-slate-600">Unidad</th><th className="p-3 text-sm font-bold text-slate-600 text-center">Quitar</th></tr></thead><tbody>{receta.map((r, i) => (<tr key={i} className="border-t border-slate-100"><td className="p-3 font-medium text-slate-800">{r.ingrediente_nombre}</td><td className="p-3 font-bold text-indigo-600">{r.cantidad}</td><td className="p-3 text-slate-500 capitalize">{r.unidad_medida}</td><td className="p-3 text-center"><button type="button" onClick={() => handleRemoveIngrediente(r.ingrediente_id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={18}/></button></td></tr>))}</tbody></table></div>
                  ) : <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium">No has añadido ingredientes a esta receta.</div>}
                </div>
              )}

              {/* 🔥 NUEVA SECCIÓN: ASIGNAR MODIFICADORES Y EXTRAS */}
              <div className="border-t-2 border-dashed border-slate-200 pt-6 mt-6 bg-slate-50 -mx-6 px-6 pb-2">
                <h3 className="font-bold text-lg text-slate-800 mb-2 flex items-center gap-2">
                  <Layers size={20} className="text-amber-500"/> Modificadores y Extras (Opcional)
                </h3>
                <p className="text-sm text-slate-500 mb-4">Selecciona los grupos de opciones que el mesero podrá ofrecer con este producto.</p>
                
                {gruposDisponibles.length === 0 ? (
                  <p className="text-sm text-slate-400 italic bg-white p-4 border rounded-xl shadow-sm">
                    No hay grupos creados. Créalos en la pestaña de Modificadores (Extras/Sabores).
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {gruposDisponibles.map(grupo => (
                      <label key={grupo.id} className={clsx("flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors shadow-sm", gruposSeleccionados.includes(grupo.id) ? "bg-amber-50 border-amber-400" : "bg-white border-slate-200 hover:border-amber-200")}>
                        <div className="mt-0.5">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                            checked={gruposSeleccionados.includes(grupo.id)}
                            onChange={() => {
                              setGruposSeleccionados(prev => 
                                prev.includes(grupo.id) 
                                  ? prev.filter(id => id !== grupo.id) 
                                  : [...prev, grupo.id]
                              )
                            }}
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-800">{grupo.nombre}</span>
                          <span className="text-xs font-medium text-slate-500 mt-1">Regla: Seleccionar entre {grupo.min_selecciones} y {grupo.max_selecciones} opciones.</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-0 border-t">
                <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-3 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-3 font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors">Guardar Producto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};