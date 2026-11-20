import { useEffect, useState } from 'react';
import { X, Printer, Receipt } from 'lucide-react';
import api from '../../services/api';

export const ModalUltimasVentas = ({ onClose }: { onClose: () => void }) => {
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVentas = async () => {
      try {
        const res = await api.get('/ventas/del-dia');
        setVentas(res.data.data || []);
      } catch (error) { console.error('Error fetching ventas', error); }
      finally { setLoading(false); }
    };
    fetchVentas();
  }, []);

  const handleReimprimir = async (ventaId: string) => {
    try {
      await api.post(`/ventas/${ventaId}/imprimir`);
      alert('🖨️ Factura enviada a la impresora.');
    } catch (e) { alert('Error al reimprimir la factura.'); }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 text-indigo-600">
            <Receipt size={28} />
            <h2 className="text-xl font-black text-slate-800">Últimas Ventas (Reimpresión)</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 md:p-6">
          {loading ? <div className="text-center p-8 font-bold text-slate-500">Cargando ventas...</div> : (
            <div className="space-y-3">
              {ventas.length === 0 && <p className="text-center text-slate-500 py-8">No hay ventas registradas hoy.</p>}
              {ventas.map(v => (
                <div key={v.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-slate-200 rounded-2xl hover:border-indigo-200 transition-colors bg-white shadow-sm gap-4">
                  <div>
                    <div className="font-black text-lg text-slate-800">Factura #{v.numero_factura}</div>
                    <div className="text-sm text-slate-500">{new Date(v.created_at).toLocaleTimeString('es-CO')} • {v.cajero_nombre}</div>
                    {v.anulada && <span className="inline-block mt-1 bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-xs font-bold">ANULADA</span>}
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="font-black font-mono text-xl text-emerald-600">{formatCurrency(Number(v.total))}</span>
                    <button onClick={() => handleReimprimir(v.id)} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold transition-all active:scale-95">
                      <Printer size={18} /> <span className="hidden sm:inline">Imprimir</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};