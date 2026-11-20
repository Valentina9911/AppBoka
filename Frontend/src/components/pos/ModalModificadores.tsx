
import type React from 'react';
import { useState } from 'react';
import { X, CheckCircle2, MessageSquare, Plus, Minus } from 'lucide-react';
import clsx from 'clsx';

export interface Modificador {
  id: string;
  nombre: string;
  precio_extra: string | number;
}

export interface GrupoModificador {
  id: string;
  nombre: string;
  min_selecciones: number;
  max_selecciones: number;
  modificadores: Modificador[];
}

interface ModalModificadoresProps {
  producto: any;
  grupos: GrupoModificador[];
  onClose: () => void;
  onConfirm: (selecciones: Record<string, Record<string, number>>, nota: string) => void;
}

export const ModalModificadores: React.FC<ModalModificadoresProps> = ({ producto, grupos, onClose, onConfirm }) => {
  const [cantidades, setCantidades] = useState<Record<string, Record<string, number>>>({});
  const [notaEspecial, setNotaEspecial] = useState('');
  const [mostrarNota, setMostrarNota] = useState(false);

  const totalSeleccionadoGrupo = (grupoId: string) => {
    return Object.values(cantidades[grupoId] || {}).reduce((acc, qty) => acc + qty, 0);
  };

  const incrementar = (grupoId: string, modId: string, maxPermitido: number) => {
    const seleccionActual = totalSeleccionadoGrupo(grupoId);
    if (seleccionActual < maxPermitido) {
      setCantidades(prev => {
        const grupo = prev[grupoId] || {};
        return {
          ...prev,
          [grupoId]: { ...grupo, [modId]: (grupo[modId] || 0) + 1 }
        };
      });
    }
  };

  const decrementar = (grupoId: string, modId: string) => {
    setCantidades(prev => {
      const grupo = prev[grupoId] || {};
      const cantidadActual = grupo[modId] || 0;
      if (cantidadActual > 0) {
        return {
          ...prev,
          [grupoId]: { ...grupo, [modId]: cantidadActual - 1 }
        };
      }
      return prev;
    });
  };

  const isFormValid = () => {
    return grupos.every((grupo) => {
      const seleccionados = totalSeleccionadoGrupo(grupo.id);
      return seleccionados >= grupo.min_selecciones;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-slate-50 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="bg-white px-6 py-5 border-b flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Personalizar: {producto.nombre}</h2>
            <p className="text-slate-500 font-medium text-sm mt-1">Configura las cantidades obligatorias para continuar</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
            <X size={28} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          {grupos.map((grupo) => {
            const seleccionados = totalSeleccionadoGrupo(grupo.id);
            const faltan = grupo.min_selecciones - seleccionados;
            const isCompletado = seleccionados >= grupo.min_selecciones;
            const limiteAlcanzado = seleccionados >= grupo.max_selecciones;

            return (
              <div key={grupo.id} className="bg-white p-5 rounded-2xl border shadow-sm">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      {grupo.nombre}
                      {isCompletado && grupo.min_selecciones > 0 && <CheckCircle2 size={18} className="text-emerald-500" />}
                    </h3>
                    <p className="text-sm font-medium mt-1 text-slate-500">
                      {grupo.min_selecciones > 0 
                        ? (faltan > 0 ? <span className="text-rose-500">Faltan {faltan} obligatorio(s)</span> : <span className="text-emerald-600">Completado ({seleccionados}/${grupo.max_selecciones})</span>)
                        : `Opcional (Hasta ${grupo.max_selecciones})`
                      }
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-wider">
                    {grupo.min_selecciones > 0 ? 'Obligatorio' : 'Excepciones'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {grupo.modificadores.map((mod) => {
                    const cantidadMod = cantidades[grupo.id]?.[mod.id] || 0;
                    const isSelected = cantidadMod > 0;
                    
                    return (
                      <div 
                        key={mod.id} 
                        className={clsx(
                          "flex items-center justify-between p-3 rounded-xl border-2 transition-all",
                          isSelected ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className={clsx("font-bold", isSelected ? "text-indigo-900" : "text-slate-700")}>{mod.nombre}</span>
                          {Number(mod.precio_extra) > 0 && (
                            <span className="text-xs font-black text-slate-400 mt-0.5">
                              +${Number(mod.precio_extra).toLocaleString()}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 bg-white rounded-lg p-1 border shadow-sm">
                          <button 
                            onClick={() => decrementar(grupo.id, mod.id)} 
                            disabled={cantidadMod <= 0}
                            className="w-8 h-8 flex items-center justify-center text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md disabled:opacity-30 active:scale-95"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-4 text-center font-bold text-slate-800">{cantidadMod}</span>
                          <button 
                            onClick={() => incrementar(grupo.id, mod.id, grupo.max_selecciones)} 
                            disabled={limiteAlcanzado}
                            className="w-8 h-8 flex items-center justify-center text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md disabled:opacity-30 active:scale-95"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="bg-white p-5 rounded-2xl border shadow-sm">
            {!mostrarNota ? (
              <button onClick={() => setMostrarNota(true)} className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-indigo-600 font-bold p-2 transition-colors">
                <MessageSquare size={18} /> Añadir nota especial a la cocina
              </button>
            ) : (
              <div className="animate-in fade-in slide-in-from-top-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">Nota Especial (Opcional)</label>
                <textarea 
                  autoFocus
                  value={notaEspecial}
                  onChange={(e) => setNotaEspecial(e.target.value)}
                  placeholder="Ej: Alergia al maní, por favor mucho cuidado."
                  className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none resize-none font-medium"
                  rows={2}
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 border-t shrink-0 flex gap-4">
          <button onClick={onClose} className="px-6 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors w-1/3">
            Cancelar
          </button>
          
          <button 
            onClick={() => onConfirm(cantidades, notaEspecial)}
            disabled={!isFormValid()}
            className={clsx(
              "flex-1 px-6 py-4 rounded-xl font-black text-white text-lg transition-all duration-300 shadow-lg flex justify-center items-center gap-2",
              isFormValid() 
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 active:scale-[0.98]" 
                : "bg-slate-300 cursor-not-allowed shadow-none"
            )}
          >
            {isFormValid() ? 'Confirmar Selección' : 'Faltan opciones'}
          </button>
        </div>

      </div>
    </div>
  );
};