import { useEffect, useState } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { usePosStore } from '../../store/pos.store';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import clsx from 'clsx';

export const ModalTransferirMesa = ({ onClose }: { onClose: () => void }) => {
  const { cuentaId, mesaId, limpiarCuenta } = usePosStore();
  const navigate = useNavigate();
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMesas = async () => {
      try {
        const { data } = await api.get('/mesas');
        const mesasPermitidas = data.data.filter((m: any) => 
          m.id !== mesaId && 
          m.estado !== 'mantenimiento' && 
          m.estado !== 'reservada'
        );
        setMesas(mesasPermitidas);
      } catch (error) {
        console.error('Error al cargar mesas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMesas();
  }, [mesaId]);

  const handleTransferir = async (mesaDestino: any) => {
    if (!cuentaId) return;
    
    const accion = mesaDestino.estado === 'ocupada' ? 'UNIR' : 'TRANSFERIR';
    const mensaje = mesaDestino.estado === 'ocupada' 
      ? `¿Deseas UNIR esta cuenta a la ${mesaDestino.nombre} que ya está ocupada? (Se sumarán los valores)`
      : `¿Transferir esta cuenta a la ${mesaDestino.nombre}?`;

    if (confirm(mensaje)) {
      try {
        await api.patch(`/cuentas/${cuentaId}/transferir`, { nueva_mesa_id: mesaDestino.id });
        alert(`Cuenta ${accion.toLowerCase()} exitosamente.`);
        limpiarCuenta();
        onClose();
        navigate('/mesas');
      } catch (error: any) {
        alert(error.response?.data?.message || 'Error al procesar la mesa');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden">
        
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3 text-slate-800">
            <ArrowRightLeft size={28} className="text-primary" />
            <h2 className="text-2xl font-black">Mover / Unir Mesa</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <p className="text-center text-slate-500 py-8">Cargando mesas disponibles...</p>
          ) : mesas.length === 0 ? (
            <p className="text-center text-slate-500 py-8 font-medium">No hay otras mesas disponibles.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {mesas.map((mesa) => {
                const esOcupada = mesa.estado === 'ocupada';
                return (
                  <button
                    key={mesa.id}
                    onClick={() => handleTransferir(mesa)}
                    className={clsx(
                      "border-2 p-4 md:p-6 rounded-2xl transition-all active:scale-95 text-center flex flex-col items-center gap-2",
                      esOcupada 
                        ? "bg-rose-50 hover:bg-rose-100 border-rose-200" 
                        : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                    )}
                  >
                    <span className={clsx("font-black text-xl", esOcupada ? "text-rose-900" : "text-emerald-900")}>
                      {mesa.nombre}
                    </span>
                    <span className={clsx("text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest", 
                      esOcupada ? "bg-rose-200 text-rose-800" : "bg-emerald-200 text-emerald-800"
                    )}>
                      {esOcupada ? 'Unir Cuentas' : 'Mover Aquí'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};