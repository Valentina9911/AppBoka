import { useState, useEffect } from 'react';
import { 
  Calculator, DollarSign, CreditCard, Wallet, AlertCircle, 
  CheckCircle, Lock, Play, Printer, ArrowDownRight, Eye, 
  EyeOff, Store, History, RefreshCw 
} from 'lucide-react';
import clsx from 'clsx';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { ModalReporteCaja } from '../../components/caja/ModalReporteCaja';
import { ModalMovimientoCaja } from '../../components/caja/ModalMovimientoCaja';

export const CierreCajaView = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const isAdmin = hasPermission(['admin']);

  const [loading, setLoading] = useState(true);
  const [turnoActivo, setTurnoActivo] = useState<any>(null);
  
  const [cajasDisponibles, setCajasDisponibles] = useState<any[]>([]);
  const [selectedCajaId, setSelectedCajaId] = useState<string>('');
  
  const [montoAperturaStr, setMontoAperturaStr] = useState('');
  const [countedCashStr, setCountedCashStr] = useState('');
  const [reporteModalOpen, setReporteModalOpen] = useState(false);
  const [movimientoModalOpen, setMovimientoModalOpen] = useState(false);
  const [reporteTipo, setReporteTipo] = useState<'X'|'Z'>('X');
  const [reporteData, setReporteData] = useState<any>(null);

  const [showDetails, setShowDetails] = useState(false);

  const [activeTab, setActiveTab] = useState<'actual' | 'historial'>('actual');
  const [historialCierres, setHistorialCierres] = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const fetchCajasYTurno = async () => {
    try {
      const resTurno = await api.get('/caja/actual');
      const turno = resTurno.data.data;
      if (turno) {
        setTurnoActivo(turno); 
      } else {
        setTurnoActivo(null);
        try {
          const resCajas = await api.get('/caja/lista-cajas');
          setCajasDisponibles(resCajas.data.data || []);
          if (resCajas.data.data && resCajas.data.data.length > 0) {
            setSelectedCajaId(resCajas.data.data[0].id.toString());
          }
        } catch (e) { console.error('Error cargando cajas', e); }
      }
    } catch (error: any) {
      console.error('Error de conexión con el backend', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorial = async () => {
    setLoadingHistorial(true);
    try {
      const res = await api.get('/caja/historial');
      setHistorialCierres(res.data.data || []);
    } catch (e) { console.error('Error cargando historial', e); }
    finally { setLoadingHistorial(false); }
  };

  useEffect(() => { fetchCajasYTurno(); }, []);

  useEffect(() => {
    if (activeTab === 'historial') fetchHistorial();
  }, [activeTab]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  const handleAbrirTurno = async () => {
    if (!selectedCajaId) return alert('Debes seleccionar una caja primero');
    try {
      await api.post('/caja/abrir', { monto_apertura: Number(montoAperturaStr), caja_id: Number(selectedCajaId) });
      fetchCajasYTurno();
    } catch (error: any) { alert(error.response?.data?.message || 'Error al abrir'); }
  };

  const handleVerReporteX = () => { setReporteData(turnoActivo); setReporteTipo('X'); setReporteModalOpen(true); };

  const handleConfirmarCierre = async () => {
    const countedCash = Number(countedCashStr);
    const confirmMsg = showDetails 
      ? `¿Proceder con el CIERRE Z DEFINITIVO?\nDiferencia calculada: ${formatCurrency(cashDifference)}`
      : `¿Confirmas que el efectivo físico exacto en la caja es de ${formatCurrency(countedCash)}?`;

    if (confirm(confirmMsg)) {
      try {
        const res = await api.post('/caja/cerrar', { monto_cierre_real: countedCash });
        if (showDetails) {
          setReporteData(res.data.data);
          setReporteTipo('Z');
          setReporteModalOpen(true);
        } else {
          try {
            await api.post('/caja/imprimir-reporte', { tipo: 'Z', turno: res.data.data, opciones: { incluir_movimientos: true, incluir_productos: true } });
          } catch(e) { console.error("La impresora no respondió", e); }
          alert('✅ Turno cerrado exitosamente. El reporte Z se ha enviado a imprimir.');
          setTurnoActivo(null);
          setCountedCashStr('');
          fetchCajasYTurno();
          navigate('/mesas'); 
        }
      } catch (error: any) { alert(error.response?.data?.message || 'Error al cerrar'); }
    }
  };

  const handleModalClose = () => {
    setReporteModalOpen(false);
    if (reporteTipo === 'Z') { setTurnoActivo(null); setCountedCashStr(''); fetchCajasYTurno(); navigate('/mesas'); }
  };

  const handleReimprimirZ = async (turnoId: string) => {
    try {
      await api.post(`/caja/historial/${turnoId}/reimprimir`);
      alert('🖨️ Señal enviada a la impresora con éxito.');
    } catch (e: any) { 
      console.error('Error al reimprimir:', e);
      alert(`Error al intentar reimprimir: ${e.response?.data?.message || 'Fallo de conexión'}`); 
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando caja...</div>;

  const baseInicial = turnoActivo ? Number(turnoActivo.monto_apertura) : 0;
  const ventasEfectivo = turnoActivo ? Number(turnoActivo.total_efectivo) : 0;
  const ventasElectronicas = turnoActivo ? Number(turnoActivo.total_electronico) : 0;
  const ingresosExtra = turnoActivo ? Number(turnoActivo.total_ingresos_extra || 0) : 0;
  const egresos = turnoActivo ? Number(turnoActivo.total_egresos || 0) : 0;
  const propinas = turnoActivo ? Number(turnoActivo.total_propina || 0) : 0;

  const expectedCash = baseInicial + ventasEfectivo + ingresosExtra - egresos;
  const countedCash = Number(countedCashStr) || 0;
  const cashDifference = countedCashStr === '' ? 0 : (countedCash - expectedCash);
  const hasDifference = cashDifference !== 0;

  return (
    <>
      <div className="p-6 md:p-8 max-w-6xl mx-auto h-full overflow-y-auto w-full">
        {/* 🔥 HEADER SIEMPRE VISIBLE */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-primary text-primary-foreground p-4 rounded-2xl"><Lock size={32} /></div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Control de Caja</h1>
              {turnoActivo && <p className="text-lg text-emerald-600 font-bold mt-1">Operando: {turnoActivo.caja_nombre || 'Caja Principal'}</p>}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-slate-200 p-1 rounded-full">
              <button onClick={() => setActiveTab('actual')} className={clsx("px-4 py-2 rounded-full font-bold transition-all", activeTab === 'actual' ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700")}>Actual</button>
              <button onClick={() => setActiveTab('historial')} className={clsx("px-4 py-2 rounded-full font-bold transition-all", activeTab === 'historial' ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700")}>Historial</button>
            </div>

            {isAdmin && activeTab === 'actual' && turnoActivo && (
              <button onClick={() => setShowDetails(!showDetails)} className="p-3 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors shadow-sm" title="Revelar Cierre">
                {showDetails ? <EyeOff size={24} /> : <Eye size={24} />}
              </button>
            )}
          </div>
        </div>

        {activeTab === 'historial' ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><History size={24} className="text-indigo-600" /> Historial de Cierres Z</h2>
              <button onClick={fetchHistorial} className="flex items-center gap-2 text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors"><RefreshCw size={18} /> Actualizar</button>
            </div>
            {loadingHistorial ? <div className="text-center p-8 text-slate-500 font-bold">Cargando...</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-4 font-bold text-slate-600">Fecha Cierre</th>
                      <th className="p-4 font-bold text-slate-600">Cajero / Caja</th>
                      <th className="p-4 font-bold text-slate-600">Físico Registrado</th>
                      <th className="p-4 font-bold text-slate-600">Descuadre</th>
                      <th className="p-4 font-bold text-slate-600 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialCierres.length === 0 && <tr><td colSpan={5} className="text-center p-8 text-slate-500">No hay cierres registrados.</td></tr>}
                    {historialCierres.map(h => (
                      <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="p-4 font-medium">{new Date(h.fecha_cierre).toLocaleString('es-CO')}</td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{h.cajero_nombre}</div>
                          <div className="text-xs text-slate-500">{h.caja_nombre || 'Caja Principal'}</div>
                        </td>
                        <td className="p-4 font-black font-mono">{formatCurrency(Number(h.monto_cierre_real))}</td>
                        <td className="p-4 font-black font-mono">
                          <span className={Number(h.monto_cierre_real) - Number(h.monto_cierre_sistema) >= 0 ? "text-emerald-600" : "text-rose-600"}>
                            {formatCurrency(Number(h.monto_cierre_real) - Number(h.monto_cierre_sistema))}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleReimprimirZ(h.id)} className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-sm">
                            <Printer size={16} /> Reimprimir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* 🔥 TAB ACTUAL (VERIFICAMOS SI HAY TURNO O DEBE ABRIR) */
          !turnoActivo ? (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center max-w-xl mx-auto mt-12">
              <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6"><Play size={40} className="ml-2" /></div>
              <h2 className="text-3xl font-black text-slate-800 mb-2">Abrir Turno de Caja</h2>
              
              <div className="text-left mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">Seleccione la Caja</label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <select value={selectedCajaId} onChange={(e) => setSelectedCajaId(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-lg outline-none focus:border-indigo-500 appearance-none">
                    {cajasDisponibles.length === 0 && <option value="">No hay cajas creadas</option>}
                    {cajasDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="text-left mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-2">Efectivo Inicial en Cajón</label>
                <input type="number" value={montoAperturaStr} onChange={(e) => setMontoAperturaStr(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-2xl" placeholder="0" />
              </div>
              <button onClick={handleAbrirTurno} disabled={montoAperturaStr === '' || !selectedCajaId} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-5 rounded-2xl font-black text-xl disabled:opacity-50 transition-all active:scale-95">INICIAR TURNO</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* REPORTE X */}
              <div className="space-y-6 flex flex-col">
                <div className="bg-card shadow-sm border border-border rounded-3xl p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold flex items-center gap-2"><Calculator size={24} className="text-primary"/> Reporte X (Actual)</h2>
                      <div className="flex gap-2">
                        <button onClick={() => setMovimientoModalOpen(true)} className="bg-rose-50 text-rose-700 hover:bg-rose-100 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"><ArrowDownRight size={18} /> Gasto</button>
                        {showDetails && <button onClick={handleVerReporteX} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"><Printer size={18} /> Ver X</button>}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-secondary rounded-2xl"><span className="flex items-center gap-2 font-medium"><Wallet size={20}/> Base Inicial</span><span className="font-bold text-lg">{showDetails ? formatCurrency(baseInicial) : '********'}</span></div>
                      <div className="flex justify-between items-center p-4 bg-secondary rounded-2xl"><span className="flex items-center gap-2 font-medium"><DollarSign size={20}/> Ventas Efectivo</span><span className="font-bold text-lg">{showDetails ? formatCurrency(ventasEfectivo) : '********'}</span></div>
                      {(egresos > 0 || ingresosExtra > 0) && (
                        <div className="p-4 border-2 border-slate-100 rounded-2xl space-y-2">
                          {egresos > 0 && <div className="flex justify-between items-center text-rose-600 font-bold"><span>(-) Gastos de caja</span><span>{showDetails ? `-${formatCurrency(egresos)}` : '********'}</span></div>}
                          {ingresosExtra > 0 && <div className="flex justify-between items-center text-emerald-600 font-bold"><span>(+) Ingresos extra</span><span>{showDetails ? `+${formatCurrency(ingresosExtra)}` : '********'}</span></div>}
                        </div>
                      )}
                      <div className="flex justify-between items-center p-4 bg-secondary rounded-2xl"><span className="flex items-center gap-2 font-medium"><CreditCard size={20}/> Pagos Electrónicos</span><span className="font-bold text-lg">{showDetails ? formatCurrency(ventasElectronicas) : '********'}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CIERRE Z */}
              <div className="space-y-6 flex flex-col">
                <div className="bg-card shadow-sm border border-border rounded-3xl p-6 flex-1 flex flex-col">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-rose-600"><Lock size={24} /> Reporte Z (Cierre)</h2>
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6">
                    <h3 className="text-amber-800 font-bold flex items-center gap-2 mb-1"><AlertCircle size={20} /> Retiro de Propinas</h3>
                    <p className="text-amber-700 text-sm">Antes de contar la caja, retire <strong>{formatCurrency(propinas)}</strong> correspondientes a las propinas recaudadas para repartirlas.</p>
                  </div>
                  {showDetails && (
                    <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 mb-8 animate-in fade-in">
                      <p className="text-slate-600 font-bold mb-2">Efectivo Total Esperado (Base + Ventas - Gastos)</p>
                      <p className="text-4xl font-black text-slate-800">{formatCurrency(expectedCash)}</p>
                    </div>
                  )}
                  <div className="space-y-4 mb-8">
                    <label className="block font-bold text-lg">Declare el efectivo físico encontrado</label>
                    <p className="text-sm text-slate-500 mb-2">Ingrese el valor total de monedas y billetes (Sin incluir las propinas ya separadas).</p>
                    <input type="number" value={countedCashStr} onChange={(e) => setCountedCashStr(e.target.value)} placeholder="0" className="w-full text-3xl font-black p-6 border-2 focus:border-emerald-500 outline-none rounded-2xl text-center shadow-inner" />
                  </div>
                  {showDetails && countedCashStr !== '' && (
                    <div className={clsx("p-6 rounded-2xl flex items-center justify-between mb-8 animate-in zoom-in-95", hasDifference ? (cashDifference > 0 ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700") : "bg-emerald-50 text-emerald-700")}>
                      <div className="flex items-center gap-3">{hasDifference ? <AlertCircle size={32} /> : <CheckCircle size={32} />}<p className="font-bold text-lg">{hasDifference ? (cashDifference > 0 ? 'Sobrante' : 'Faltante') : 'Caja Cuadrada Perfectamente'}</p></div>
                      <div className="text-3xl font-black">{cashDifference > 0 ? '+' : ''}{formatCurrency(cashDifference)}</div>
                    </div>
                  )}
                  <div className="mt-auto">
                    <button onClick={handleConfirmarCierre} disabled={countedCashStr === ''} className="w-full bg-rose-600 hover:bg-rose-700 text-white p-6 rounded-2xl font-black text-xl disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-rose-600/20">
                      <Printer size={24} className="inline mr-2"/> Ejecutar Cierre Definitivo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {movimientoModalOpen && <ModalMovimientoCaja onClose={() => setMovimientoModalOpen(false)} onSuccess={() => { setMovimientoModalOpen(false); fetchCajasYTurno(); }} />}
      {reporteModalOpen && <ModalReporteCaja turnoData={reporteData} tipoReporte={reporteTipo} onClose={handleModalClose} />}
    </>
  );
};