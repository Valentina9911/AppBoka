import { useEffect, useState, useCallback } from 'react';
import { Users, Clock, Settings2, Loader2, ShoppingBag } from 'lucide-react';
import clsx from 'clsx';
import { usePosStore } from '../../store/pos.store';
import { useAuthStore } from '../../store/auth.store';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ModalGestionMesas } from '../../components/mesas/ModalGestionMesas';
import { ModalCuentasEnEspera } from '../../components/cuentas/ModalCuentasEnEspera'; // NUEVO

export const MesasView = () => {
  const { setCuentaActiva } = usePosStore();
  const { hasPermission } = useAuthStore();
  const navigate = useNavigate();

  const [mesas, setMesas] = useState<any[]>([]);
  const [modalGestionOpen, setModalGestionOpen] = useState(false);
  const [modalEsperaOpen, setModalEsperaOpen] = useState(false); // NUEVO
  const [loading, setLoading] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMesaId, setProcessingMesaId] = useState<string | null>(null);

  const fetchMesas = useCallback(async () => {
    try {
      const { data } = await api.get('/mesas');
      setMesas(data.data || []);
    } catch (error) {
      console.error('Error fetching mesas', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMesas();
    const interval = setInterval(fetchMesas, 10000);
    return () => clearInterval(interval);
  }, [fetchMesas]);

  const handleMesaClick = async (mesa: any) => {
    if (mesa.estado === 'mantenimiento') return;
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      setProcessingMesaId(mesa.id);

      let currentCuentaId = mesa.cuenta_id;

      if (!currentCuentaId) {
        const createRes = await api.post('/cuentas', { 
          mesa_id: mesa.id, 
          numero_comensales: 1 
        });
        currentCuentaId = createRes.data.data.id;
      }

      const cuentaRes = await api.get(`/cuentas/${currentCuentaId}`);
      const { cuenta, items } = cuentaRes.data.data;

      setCuentaActiva(mesa.id, currentCuentaId, cuenta, items);
      navigate('/caja');
    } catch (error: any) {
      if (error.response?.status === 409) {
        alert('¡Ups! Un compañero acaba de ocupar esta mesa milisegundos antes que tú. Actualizando mapa...');
        await fetchMesas();
      } else {
        alert(error.response?.data?.message || 'Hubo un error al abrir la mesa en el servidor.');
      }
    } finally {
      setIsProcessing(false);
      setProcessingMesaId(null);
    }
  };

  const handleVentaRapida = async () => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      setProcessingMesaId('mostrador');
      
      const createRes = await api.post('/cuentas', { mesa_id: null, numero_comensales: 1 });
      const currentCuentaId = createRes.data.data.id;
      
      const cuentaRes = await api.get(`/cuentas/${currentCuentaId}`);
      const { cuenta, items } = cuentaRes.data.data;
      
      setCuentaActiva(null, currentCuentaId, cuenta, items);
      navigate('/caja');
    } catch (error: any) {
      alert('Hubo un error al abrir la venta de mostrador.');
    } finally {
      setIsProcessing(false);
      setProcessingMesaId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center text-slate-500 gap-4">
        <Loader2 className="animate-spin" size={48} />
        <p className="font-bold text-xl">Sincronizando salón...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 h-full flex flex-col">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Mapa de Mesas</h1>
          <p className="text-muted-foreground mt-1 text-lg">Selecciona una mesa para gestionar su orden</p>
        </div>
        
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex gap-4 p-4 bg-card rounded-2xl shadow-sm border mr-2">
            <LegendItem color="bg-emerald-500" label="Disponible" />
            <LegendItem color="bg-rose-500" label="Ocupada" />
            <LegendItem color="bg-amber-500" label="Reservada" />
          </div>

          <button 
            onClick={() => setModalEsperaOpen(true)}
            className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Clock size={20} /> En Espera
          </button>

          <button 
            onClick={handleVentaRapida}
            disabled={isProcessing}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-3 shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {processingMesaId === 'mostrador' ? <Loader2 className="animate-spin" size={24} /> : <ShoppingBag size={24} />}
            Venta Rápida (Mostrador)
          </button>

          {hasPermission(['admin']) && (
            <button 
              onClick={() => setModalGestionOpen(true)}
              className="bg-slate-800 text-white p-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-700 transition-colors shadow-sm active:scale-95"
            >
              <Settings2 size={20} /> Mesas
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 flex-1 overflow-auto pb-20">
        {mesas.map((mesa) => {
          const isThisProcessing = processingMesaId === mesa.id;
          return (
            <button
              key={mesa.id}
              onClick={() => handleMesaClick(mesa)}
              disabled={isProcessing}
              className={clsx(
                "relative group overflow-hidden flex flex-col justify-between p-4 md:p-5 rounded-3xl min-h-[140px] md:min-h-[180px] shadow-sm transition-all text-left",
                "active:scale-[0.98] active:shadow-inner select-none touch-manipulation",
                {
                  'bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200': mesa.estado === 'disponible',
                  'bg-rose-50 hover:bg-rose-100 border-2 border-rose-200': mesa.estado === 'ocupada',
                  'bg-amber-50 hover:bg-amber-100 border-2 border-amber-200': mesa.estado === 'reservada',
                  'bg-slate-100 opacity-60 cursor-not-allowed border-2 border-slate-200': mesa.estado === 'mantenimiento',
                  'opacity-50 cursor-not-allowed': isProcessing && !isThisProcessing
                }
              )}
            >
              {isThisProcessing && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-20">
                  <Loader2 className="animate-spin text-emerald-600" size={36} />
                </div>
              )}
              
              <div className="flex justify-between items-start w-full z-10 relative">
                <h3 className={clsx("text-xl md:text-2xl font-bold tracking-tight", {
                  'text-emerald-900': mesa.estado === 'disponible',
                  'text-rose-900': mesa.estado === 'ocupada',
                  'text-amber-900': mesa.estado === 'reservada',
                })}>
                  {mesa.nombre}
                </h3>
                
                <div className="flex items-center gap-1.5 text-slate-500 bg-white/50 px-2 py-1 rounded-full text-xs font-bold">
                  <Users size={14} />
                  <span>{mesa.capacidad}</span>
                </div>
              </div>

              <div className="mt-4 z-10 relative">
                {mesa.estado === 'ocupada' && (
                  <div className="space-y-2">
                    <p className="text-xl font-black text-rose-950">
                      ${Number(mesa.cuenta_total || 0).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 text-rose-700/80 text-sm font-medium">
                      <Clock size={16} />
                      <span>
                        {mesa.cuenta_abierta_desde 
                          ? new Date(mesa.cuenta_abierta_desde).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                          : 'Abierta'}
                      </span>
                    </div>
                  </div>
                )}
                {mesa.estado === 'reservada' && (
                  <div className="text-amber-800 font-bold bg-amber-200/50 p-2 rounded-xl text-center">Reservada</div>
                )}
                {mesa.estado === 'disponible' && (
                  <div className="text-emerald-700/80 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Libre
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {modalGestionOpen && <ModalGestionMesas onClose={() => setModalGestionOpen(false)} onUpdate={fetchMesas} />}
      {modalEsperaOpen && <ModalCuentasEnEspera onClose={() => setModalEsperaOpen(false)} />}
    </div>
  );
};

const LegendItem = ({ color, label }: { color: string, label: string }) => (
  <div className="flex items-center gap-2">
    <div className={`w-4 h-4 rounded-full ${color} shadow-sm border border-black/10`} />
    <span className="text-sm font-bold text-slate-700 mr-2">{label}</span>
  </div>
);