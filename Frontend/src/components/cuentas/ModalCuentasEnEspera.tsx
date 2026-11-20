
import { useEffect, useState } from 'react';
import { X, Clock, PlayCircle } from 'lucide-react';
import api from '../../services/api';
import { usePosStore } from '../../store/pos.store';
import { useNavigate } from 'react-router-dom';

export const ModalCuentasEnEspera = ({ onClose }: { onClose: () => void }) => {
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { setCuentaActiva } = usePosStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEspera = async () => {
      try {
        const res = await api.get('/cuentas/espera');
        setCuentas(res.data.data || []);
      } catch (error) {
        console.error('Error trayendo cuentas en espera', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEspera();
  }, []);

  const handleRetomar = async (cuentaId: string) => {
    try {
      const res = await api.get(`/cuentas/${cuentaId}`);
      const { cuenta, items } = res.data.data;
      setCuentaActiva(null, cuenta.id, cuenta, items);
      onClose();
      navigate('/caja');
    } catch (error) {
      alert('Error al retomar la cuenta. Es posible que haya sido limpiada por el sistema (> 4 horas).');
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3 text-amber-600">
            <Clock size={28} />
            <h2 className="text-xl font-black text-slate-800">Cuentas Aparcadas</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
          {loading ? (
            <p className="text-center text-slate-500 py-8 font-bold">Cargando...</p>
          ) : cuentas.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Clock size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-bold">No hay cuentas en espera.</p>
            </div>
          ) : (
            cuentas.map(c => (
              <div key={c.id} className="flex justify-between items-center p-4 border-2 border-slate-100 rounded-2xl bg-white shadow-sm hover:border-amber-200 transition-colors">
                <div>
                  <p className="font-bold text-slate-800 text-lg">Cuenta #{c.numero}</p>
                  <p className="text-sm text-slate-500 font-medium">
                    {c.total_items} Ítem(s) • Creada: {new Date(c.created_at).toLocaleTimeString('es-CO')}
                  </p>
                  <p className="text-xl font-black text-amber-600 mt-1 font-mono">{formatCurrency(c.total)}</p>
                </div>
                <button 
                  onClick={() => handleRetomar(c.id)}
                  className="flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-3 rounded-xl font-bold transition-transform active:scale-95"
                >
                  <PlayCircle size={20} /> Retomar
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};