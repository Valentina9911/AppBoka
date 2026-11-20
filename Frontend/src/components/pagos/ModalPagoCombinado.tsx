
import type React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { usePosStore } from '../../store/pos.store';
import { useAuthStore } from '../../store/auth.store';
import { X, CheckCircle2, PlusCircle, Trash, DollarSign, HeartHandshake, UserCircle, Tag, Lock, Unlock, KeyRound } from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ModalTicket } from './ModalTicket';

type MetodoPago = 'efectivo' | 'tarjeta_debito' | 'tarjeta_credito' | 'nequi' | 'daviplata' | 'transferencia';

interface FilaPago { id: string; metodo: MetodoPago; monto: number | ''; referencia: string; }

export const ModalPagoCombinado = ({ onClose }: { onClose: () => void }) => {
  const { cuentaId, cuenta, limpiarCuenta } = usePosStore();
  const { hasPermission } = useAuthStore();
  const navigate = useNavigate();
  
  const totalVentaBase = Number(cuenta?.total || 0);

  const isAdminOriginal = hasPermission(['admin']);
  const [adminAutorizadoEnSesion, setAdminAutorizadoEnSesion] = useState(false);
  const tienePermisoDescuento = isAdminOriginal || adminAutorizadoEnSesion;

  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [passwordSupervisor, setPasswordSupervisor] = useState('');
  const [authError, setAuthError] = useState('');

  const [descuentoTipo, setDescuentoTipo] = useState<'porcentaje' | 'fijo' | 'ninguno'>('ninguno');
  const [descuentoValor, setDescuentoValor] = useState<number>(0);
  const [customPct, setCustomPct] = useState('');
  const [customFijo, setCustomFijo] = useState('');
  
  const descuentoCalculado = useMemo(() => {
    if (descuentoTipo === 'ninguno') return 0;
    if (descuentoTipo === 'porcentaje') return (totalVentaBase * descuentoValor) / 100;
    return descuentoValor;
  }, [descuentoTipo, descuentoValor, totalVentaBase]);

  const [propinaTipo, setPropinaTipo] = useState<'ninguna' | 'porcentaje' | 'fijo'>('ninguna');
  const [propinaValor, setPropinaValor] = useState<number>(0);
  
  const propinaCalculada = useMemo(() => {
    if (propinaTipo === 'ninguna') return 0;
    const basePropina = totalVentaBase - descuentoCalculado;
    if (propinaTipo === 'porcentaje') return (basePropina * propinaValor) / 100;
    return propinaValor;
  }, [propinaTipo, propinaValor, totalVentaBase, descuentoCalculado]);

  const totalACobrar = totalVentaBase - descuentoCalculado + propinaCalculada;

  const [pagos, setPagos] = useState<FilaPago[]>([{ id: '1', metodo: 'efectivo', monto: totalACobrar, referencia: '' }]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteId, setClienteId] = useState<number>(1); 
  const [imprimirFisico, setImprimirFisico] = useState(false); 
  const [ventaRealizadaId, setVentaRealizadaId] = useState<string | null>(null);

  useEffect(() => {
    if (pagos.length === 1) setPagos([{ ...pagos[0], monto: totalACobrar }]);
  }, [totalACobrar]);

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await api.get('/clientes?limit=100');
        setClientes(res.data.data.clientes || []);
      } catch (error) { console.error("Error al cargar clientes", error); }
    };
    fetchClientes();
  }, []);

  const totalPagado = useMemo(() => pagos.reduce((acc, pago) => acc + (typeof pago.monto === 'number' ? pago.monto : 0), 0), [pagos]);
  const restante = totalACobrar - totalPagado;
  const esCubierto = totalPagado >= totalACobrar;
  const cambio = esCubierto ? (totalPagado - totalACobrar) : 0;

  const agregarFila = () => setPagos([...pagos, { id: Date.now().toString(), metodo: 'tarjeta_debito', monto: restante > 0 ? restante : 0, referencia: '' }]);
  const eliminarFila = (id: string) => setPagos(pagos.filter(p => p.id !== id));
  const actualizarFila = (id: string, campo: keyof FilaPago, valor: any) => setPagos(pagos.map(p => p.id === id ? { ...p, [campo]: valor } : p));

  const handlePropinaP = (val: string) => { if (val === '') { setPropinaTipo('ninguna'); setPropinaValor(0); } else { setPropinaTipo('porcentaje'); setPropinaValor(Number(val)); } };
  const handlePropinaF = (val: string) => { if (val === '') { setPropinaTipo('ninguna'); setPropinaValor(0); } else { setPropinaTipo('fijo'); setPropinaValor(Number(val)); } };
  
  const handleDescP = (val: string) => {
    setCustomPct(val);
    setCustomFijo('');
    if (val === '' || Number(val) <= 0) {
      setDescuentoTipo('ninguno');
      setDescuentoValor(0);
    } else {
      setDescuentoTipo('porcentaje');
      setDescuentoValor(Number(val));
    }
  };

  const handleDescF = (val: string) => {
    setCustomFijo(val);
    setCustomPct('');
    if (val === '' || Number(val) <= 0) {
      setDescuentoTipo('ninguno');
      setDescuentoValor(0);
    } else {
      setDescuentoTipo('fijo');
      setDescuentoValor(Number(val));
    }
  };

  const handlePresetPercent = (pct: number) => {
    setDescuentoTipo('porcentaje');
    setDescuentoValor(pct);
    setCustomPct(String(pct));
    setCustomFijo('');
  };

  const handleClearDescuento = () => {
    setDescuentoTipo('ninguno');
    setDescuentoValor(0);
    setCustomPct('');
    setCustomFijo('');
  };

  const handleVerifySupervisorPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await api.post('/ventas/verificar-admin', { password: passwordSupervisor });
      if (res.data.success) {
        setAdminAutorizadoEnSesion(true);
        setShowAuthPopup(false);
        setPasswordSupervisor('');
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.message || 'Clave denegada o inválida');
    }
  };

  const handleConfirmar = async () => {
    try {
      const res = await api.post('/ventas/pagar', {
        cuenta_id: cuentaId,
        turno_caja_id: "", 
        cliente_id: clienteId,
        pagos: pagos.map(p => ({ metodo_pago: p.metodo, monto: Number(p.monto), referencia: p.referencia })),
        propina: propinaCalculada,
        descuento: descuentoCalculado,
        imprimir_ticket: imprimirFisico
      });
      setVentaRealizadaId(res.data.data.venta.id);
      limpiarCuenta();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al procesar el pago');
    }
  };

  if (ventaRealizadaId) {
    return <ModalTicket ventaId={ventaRealizadaId} onClose={() => { onClose(); navigate('/mesas'); }} />;
  }

  return (
    <div className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="bg-slate-50 border-b p-6 flex justify-between items-center">
          <div><h2 className="text-2xl font-black text-slate-800">Cerrar Cuenta</h2></div>
          <button onClick={onClose} className="p-2 bg-slate-200 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-all"><X size={24} /></button>
        </div>

        <div className="p-6 md:p-8 flex flex-col gap-6 overflow-y-auto max-h-[70vh]">
          
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><UserCircle size={20} className="text-primary" /> Facturar a nombre de:</h3>
            <select value={clienteId} onChange={(e) => setClienteId(Number(e.target.value))} className="w-full h-12 bg-white border border-slate-300 rounded-xl px-4 font-bold outline-none">
              <option value={1}>Consumidor Final (Por defecto)</option>
              {clientes.filter(c => c.id !== 1).map(c => (<option key={c.id} value={c.id}>{c.nombre} {c.cedula_nit ? `(${c.cedula_nit})` : ''}</option>))}
            </select>
          </div>
          
          {/* ========================================================
              SECCIÓN DESCUENTOS REFACTORIZADA (RESUELVE image_1b2787.png)
              ======================================================== */}
          <div className="bg-white border-2 border-slate-100 p-5 rounded-2xl shadow-sm min-h-[170px] flex flex-col justify-center transition-all">
            {!tienePermisoDescuento ? (
              /* ESTADO BLOQUEADO: Estructura nativa limpia que no se aplasta */
              <div className="flex flex-col items-center justify-center py-2 text-slate-500 w-full text-center">
                <Lock size={26} className="mb-2 text-slate-400" />
                <span className="font-bold text-sm text-slate-700 bg-slate-50 px-4 py-1.5 border border-slate-200 rounded-xl shadow-sm mb-3">
                  Descuentos: Sección Protegida
                </span>
                <button 
                  type="button"
                  onClick={() => setShowAuthPopup(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-3 rounded-xl shadow-md flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
                >
                  <KeyRound size={14} /> Desbloquear con Clave de Admin
                </button>
              </div>
            ) : (
              /* ESTADO DESBLOQUEADO: Se dibuja fluido para el Administrador */
              <div className="w-full animate-in fade-in duration-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Tag size={20} className="text-amber-500" /> Aplicar Descuento
                  </h3>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-emerald-200 animate-pulse">
                    <Unlock size={12} /> Habilitado
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <button 
                    type="button"
                    onClick={handleClearDescuento} 
                    className={clsx(
                      "px-4 py-2 rounded-xl font-bold border-2 transition-all text-sm", 
                      descuentoTipo === 'ninguno' ? "bg-slate-800 border-slate-800 text-white shadow-md" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    0%
                  </button>
                  {[5, 10, 15, 20].map(pct => (
                    <button 
                      type="button"
                      key={pct} 
                      onClick={() => handlePresetPercent(pct)} 
                      className={clsx(
                        "px-4 py-2 rounded-xl font-bold border-2 transition-all text-sm", 
                        descuentoTipo === 'porcentaje' && descuentoValor === pct ? "bg-amber-500 border-amber-500 text-white shadow-md" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">% Personalizado</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={customPct} 
                      onChange={(e) => handleDescP(e.target.value)} 
                      className="w-full h-12 border border-slate-200 bg-slate-50/50 rounded-xl px-3 font-bold outline-none focus:border-amber-500 focus:bg-white transition-colors" 
                      placeholder="Ej: 8" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">$ Valor Fijo</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={customFijo} 
                      onChange={(e) => handleDescF(e.target.value)} 
                      className="w-full h-12 border border-slate-200 bg-slate-50/50 rounded-xl px-3 font-bold outline-none focus:border-amber-500 focus:bg-white transition-colors" 
                      placeholder="Ej: 5000" 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PROPINA */}
          <div className="bg-white border-2 border-slate-100 p-5 rounded-2xl shadow-sm">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><HeartHandshake size={20} className="text-rose-500" /> Añadir Propina Voluntaria</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => { setPropinaTipo('ninguna'); setPropinaValor(0); }} className={clsx("px-4 py-2 rounded-xl font-bold border-2 transition-all text-sm", propinaTipo === 'ninguna' ? "bg-slate-800 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-600")}>0%</button>
              {[5, 10, 15, 20].map(pct => (
                <button key={pct} onClick={() => { setPropinaTipo('porcentaje'); setPropinaValor(pct); }} className={clsx("px-4 py-2 rounded-xl font-bold border-2 transition-all text-sm", propinaTipo === 'porcentaje' && propinaValor === pct ? "bg-indigo-100 border-indigo-500 text-indigo-700" : "bg-white border-slate-200 text-slate-600")}>{pct}%</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">% Personalizado</label>
                <input type="number" value={propinaTipo === 'porcentaje' && ![5,10,15,20,0].includes(propinaValor) && propinaValor > 0 ? propinaValor : ''} onChange={(e) => handlePropinaP(e.target.value)} className="w-full h-12 bg-white border border-slate-200 rounded-xl px-3 font-bold outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej: 8" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">$ Valor Fijo</label>
                <input type="number" value={propinaTipo === 'fijo' && propinaValor > 0 ? propinaValor : ''} onChange={(e) => handlePropinaF(e.target.value)} className="w-full h-12 bg-white border border-slate-200 rounded-xl px-3 font-bold outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej: 5000" />
              </div>
            </div>
          </div>

          {/* TOTAL A COBRAR */}
          <div className="flex gap-4 p-6 bg-slate-800 text-white rounded-3xl items-center justify-between shadow-inner">
            <div>
              <span className="text-lg font-medium opacity-80 block">Total a Pagar</span>
              {descuentoCalculado > 0 && <span className="text-xs text-amber-400 font-bold block">Descuento: -${descuentoCalculado.toLocaleString()}</span>}
              {propinaCalculada > 0 && <span className="text-xs text-emerald-400 font-bold block">Propina: +${propinaCalculada.toLocaleString()}</span>}
            </div>
            <span className="text-4xl font-black font-mono tracking-tight text-emerald-400">${totalACobrar.toLocaleString()}</span>
          </div>
          
          <div className="space-y-4">
            {pagos.map((pago) => (
              <div key={pago.id} className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 border rounded-2xl relative">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Método</label>
                  <select value={pago.metodo} onChange={(e) => actualizarFila(pago.id, 'metodo', e.target.value)} className="w-full h-14 bg-white border rounded-xl px-4 font-bold outline-none appearance-none"><option value="efectivo">Efectivo 💵</option><option value="tarjeta_debito">Débito 💳</option><option value="tarjeta_credito">Crédito 💳</option><option value="nequi">Nequi 📱</option><option value="daviplata">Daviplata 📱</option><option value="transferencia">Transferencia 🏦</option></select>
                </div>
                <div className="flex-1 relative">
                  <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Monto</label>
                  <div className="relative"><DollarSign size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="number" value={pago.monto} onChange={(e) => actualizarFila(pago.id, 'monto', e.target.value ? Number(e.target.value) : '')} className="w-full h-14 pl-10 pr-4 font-black text-xl rounded-xl border outline-none font-mono" placeholder="0" /></div>
                </div>
                <div className="flex items-end justify-center sm:w-16 mt-2 sm:mt-0"><button disabled={pagos.length === 1} onClick={() => eliminarFila(pago.id)} className="w-14 h-14 sm:w-full sm:h-[56px] bg-rose-50 text-rose-500 rounded-xl disabled:opacity-30 flex items-center justify-center"><Trash size={22} /></button></div>
              </div>
            ))}
            <button onClick={agregarFila} className="w-full text-sm text-primary bg-primary/10 px-4 py-4 rounded-xl flex justify-center gap-2 font-bold"><PlusCircle size={18} /> Añadir otro método de pago</button>
          </div>

          <div className="mt-2 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-3">
            <input type="checkbox" id="imprimir" checked={imprimirFisico} onChange={(e) => setImprimirFisico(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
            <label htmlFor="imprimir" className="font-bold text-indigo-900 cursor-pointer select-none">Imprimir ticket físico automáticamente</label>
          </div>
        </div>

        <div className="p-6 border-t bg-white">
          <div className="flex justify-between items-center mb-4 px-2">
            <span className="text-slate-500 font-bold">Cambio a devolver:</span>
            <span className={clsx("text-2xl font-black", cambio > 0 ? "text-emerald-600" : "text-slate-400")}>${cambio.toLocaleString()}</span>
          </div>
          <button disabled={!esCubierto} onClick={handleConfirmar} className="w-full h-16 rounded-[1.5rem] bg-emerald-600 text-white font-black text-xl flex items-center justify-center gap-3 disabled:opacity-50">
            <CheckCircle2 size={28} /> CONFIRMAR PAGO
          </button>
        </div>

      </div>

      {/* POPUP DE CLAVE DE SUPERVISOR */}
      {showAuthPopup && (
        <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Lock size={18} className="text-indigo-600" /> Clave de Mánager
              </h4>
              <button type="button" onClick={() => { setShowAuthPopup(false); setAuthError(''); setPasswordSupervisor(''); }} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full"><X size={16} /></button>
            </div>
            
            <p className="text-xs font-medium text-slate-500 mb-4">Ingresa tu clave de sistema para desbloquear los descuentos comerciales de este ticket.</p>
            
            <form onSubmit={handleVerifySupervisorPassword} className="space-y-4">
              <div>
                <input 
                  type="password" 
                  autoFocus 
                  required
                  placeholder="••••••••" 
                  value={passwordSupervisor}
                  onChange={(e) => setPasswordSupervisor(e.target.value)}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-mono text-center tracking-widest text-xl focus:border-indigo-500 focus:bg-white outline-none transition-all"
                />
                {authError && <p className="text-xs text-rose-500 font-bold mt-2 text-center">{authError}</p>}
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowAuthPopup(false); setAuthError(''); setPasswordSupervisor(''); }} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors">Verificar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};