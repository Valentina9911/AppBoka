
import { useState, useEffect } from 'react';
import { usePosStore } from '../../store/pos.store';
import { Plus, Minus, Trash2, ShoppingBag, CreditCard, ArrowRightLeft, SplitSquareHorizontal, X, ChefHat, Receipt, Clock, Wifi, WifiOff, RefreshCcw } from 'lucide-react';
import clsx from 'clsx';
import api from '../../services/api';

import { ModalPagoCombinado } from '../../components/pagos/ModalPagoCombinado';
import { ModalTransferirMesa } from '../../components/mesas/ModalTransferirMesa';
import { ModalDividirCuenta } from '../../components/cuentas/ModalDividirCuenta';
import { ModalModificadores } from '../../components/pos/ModalModificadores';
import { ModalUltimasVentas } from '../../components/ventas/ModalUltimasVentas';
import { ModalCuentasEnEspera } from '../../components/cuentas/ModalCuentasEnEspera';
import { ModalComanda } from '../../components/cuentas/ModalComanda';

export const PosView = () => {
  const { mesaId, cuentaId, cuenta, items, setCuentaActiva, limpiarCuenta } = usePosStore();

  const [categoriaActiva, setCategoriaActiva] = useState<string>('');
  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [modalTransferirOpen, setModalTransferirOpen] = useState(false);
  const [modalDividirOpen, setModalDividirOpen] = useState(false);
  const [modalUltimasVentasOpen, setModalUltimasVentasOpen] = useState(false);
  const [modalEsperaOpen, setModalEsperaOpen] = useState(false);
  const [modalComandaOpen, setModalComandaOpen] = useState(false);
  const [comandaMobileOpen, setComandaMobileOpen] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);

  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [todosLosGrupos, setTodosLosGrupos] = useState<any[]>([]);
  const [modalModsOpen, setModalModsOpen] = useState(false);
  const [productoActual, setProductoActual] = useState<any>(null);
  const [gruposDelProducto, setGruposDelProducto] = useState<any[]>([]);

  const totalItemsCount = items.reduce((acc, i) => acc + Number(i.cantidad), 0);

  useEffect(() => {
    let isMounted = true;
    
    const checkServerHealth = async () => {
      try {
        await api.get('/productos', { timeout: 3000 });
        if (isMounted) setIsOnline(true);
      } catch (error: any) {
        if (!isMounted) return;
        
        if (error.response) {
          setIsOnline(true);
        } else {
          setIsOnline(false);
        }
      }
    };

    checkServerHealth();
    const interval = setInterval(checkServerHealth, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      sincronizarPendientes();
    }
  }, [isOnline]);

  const sincronizarPendientes = async () => {
    const currentState = usePosStore.getState();
    const itemsPendientes = currentState.items.filter(i => i.is_local);
    let currentCuentaId = currentState.cuentaId;

    if (itemsPendientes.length === 0 && currentCuentaId !== 'offline') return;

    setIsSyncing(true);
    try {
      if (currentCuentaId === 'offline' || !currentCuentaId) {
        const createRes = await api.post('/cuentas', { mesa_id: currentState.mesaId, numero_comensales: 1 });
        currentCuentaId = createRes.data.data.id;
        if (typeof currentCuentaId !== 'string' || !currentCuentaId) {
          throw new Error('La API no devolvio un ID de cuenta valido.');
        }
      }

      const itemsPayload = itemsPendientes.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        notas: item.notas,
        modificadores: [] // En modo supervivencia omitimos extras complejos por velocidad
      }));

      if (itemsPayload.length > 0) {
        await api.post(`/cuentas/${currentCuentaId}/items/bulk`, { items: itemsPayload });
      }
      
      setCuentaActiva(currentState.mesaId, currentCuentaId, currentState.cuenta, currentState.items);
      await recargarCuenta();
    } catch (error) {
      console.error('Error sincronizando pedidos offline', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (totalItemsCount > 0) {
      setIsBouncing(true);
      const timer = setTimeout(() => setIsBouncing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [totalItemsCount]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resProd = await api.get('/productos');
        const productosData = resProd.data.data || resProd.data;
        setProductos(productosData);

        const uniqueCats = Array.from(new Set(productosData.map((p: any) => p.cat || p.categoria)));
        setCategorias(uniqueCats as string[]);
        if (uniqueCats.length > 0) setCategoriaActiva(uniqueCats[0] as string);

        const resGrupos = await api.get('/modificadores/grupos');
        setTodosLosGrupos(resGrupos.data.data || []);
      } catch (error) {
        console.error('Error fetching data POS', error);
      }
    };
    if (isOnline) fetchData();
  }, [isOnline]);

  const productosFiltrados = productos.filter(p => (p.cat || p.categoria) === categoriaActiva);

  const recargarCuenta = async () => {
    const currentCuentaId = usePosStore.getState().cuentaId;
    const currentMesaId = usePosStore.getState().mesaId;
    if (!currentCuentaId || currentCuentaId === 'offline') return;

    try {
      const res = await api.get(`/cuentas/${currentCuentaId}`);
      const { cuenta: cuentaData, items: nuevosItems } = res.data.data;
      setCuentaActiva(currentMesaId, currentCuentaId, cuentaData, nuevosItems);
    } catch (error) {
      console.error('Error recargando', error);
    }
  };

  const handleAgregarProducto = async (p: any) => {
    if (navigator.vibrate) navigator.vibrate(50);
    try {
      let currentCuentaId = usePosStore.getState().cuentaId;

      if (!isOnline) {
        if (!currentCuentaId) {
          currentCuentaId = 'offline';
          usePosStore.getState().setCuentaLocal('offline', { total: 0 });
        }
        const newItem = {
          id: `temp_${Date.now()}`,
          producto_id: p.id || p.producto_id,
          producto_nombre: p.nombre,
          precio_unitario: p.precio_venta,
          cantidad: 1,
          impuesto_pct: p.impuesto_pct || 0,
          subtotal: p.precio_venta,
          is_local: true
        };
        const newItems = [...usePosStore.getState().items, newItem];
        const newTotal = newItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
        setCuentaActiva(mesaId, currentCuentaId, { ...cuenta, total: newTotal }, newItems);
        return;
      }

      if (!currentCuentaId) {
        const createRes = await api.post('/cuentas', { mesa_id: null, numero_comensales: 1 });
        currentCuentaId = createRes.data.data.id;
        if (typeof currentCuentaId !== 'string' || !currentCuentaId) {
          throw new Error('La API no devolvio un ID de cuenta valido.');
        }
        setCuentaActiva(null, currentCuentaId, createRes.data.data, []);
      }

      const prodId = p.id || p.producto_id;
      const resVinculos = await api.get(`/modificadores/vincular/${prodId}`);
      const vinculadosIds = resVinculos.data.data || [];

      if (vinculadosIds.length > 0) {
        const gruposAUsar = todosLosGrupos.filter(g => vinculadosIds.includes(g.id));
        setGruposDelProducto(gruposAUsar);
        setProductoActual(p);
        setModalModsOpen(true);
      } else {
        await api.post(`/cuentas/${currentCuentaId}/items`, { producto_id: prodId, cantidad: 1, notas: '' });
        await recargarCuenta();
      }
    } catch (error) {
      console.error('Error agregando producto', error);
    }
  };

  const handleConfirmarModificadores = async (selecciones: Record<string, Record<string, number>>, nota: string) => {
    const activeCuentaId = usePosStore.getState().cuentaId;
    if (!activeCuentaId) return;

    const modificadoresPayload: { id: string; cantidad: number }[] = [];
    
    Object.values(selecciones).forEach(grupo => {
      Object.entries(grupo).forEach(([modId, cantidad]) => {
        if (cantidad > 0) {
          modificadoresPayload.push({ id: modId, cantidad });
        }
      });
    });

    try {
      await api.post(`/cuentas/${activeCuentaId}/items`, {
        producto_id: productoActual.id || productoActual.producto_id,
        cantidad: 1,
        notas: nota,
        modificadores: modificadoresPayload 
      });
      setModalModsOpen(false);
      await recargarCuenta();
    } catch (error) {
      console.error('Error agregando producto con modificadores', error);
    }
  };

  const handleMandarACocina = async () => {
    if (!cuentaId) return;
    try {
      await api.post(`/cuentas/${cuentaId}/imprimir-comanda`).catch(() => {});
      setModalComandaOpen(true);
    } catch (error) {
      alert('Hubo un error comunicándose con la cocina.');
    }
  };

  const decrementarCantidad = async (item: any) => {
    if (item.cantidad <= 1) return removerItem(item.id);
    if (navigator.vibrate) navigator.vibrate(30);

    if (!isOnline) {
      const newItems = items.map(i => {
        if (i.id === item.id) {
          const newCant = Number(i.cantidad) - 1;
          return { ...i, cantidad: newCant, subtotal: newCant * i.precio_unitario, is_local: true };
        }
        return i;
      });
      const newTotal = newItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
      setCuentaActiva(mesaId, cuentaId!, { ...cuenta, total: newTotal }, newItems);
      return;
    }

    try {
      await api.patch(`/cuentas/${cuentaId}/items/${item.id}`, { cantidad: Number(item.cantidad) - 1 });
      await recargarCuenta();
    } catch (error) { console.error('Error decrementando', error); }
  };

  const incrementarCantidad = async (item: any) => {
    if (navigator.vibrate) navigator.vibrate(30);

    if (!isOnline) {
      const newItems = items.map(i => {
        if (i.id === item.id) {
          const newCant = Number(i.cantidad) + 1;
          return { ...i, cantidad: newCant, subtotal: newCant * i.precio_unitario, is_local: true };
        }
        return i;
      });
      const newTotal = newItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
      setCuentaActiva(mesaId, cuentaId!, { ...cuenta, total: newTotal }, newItems);
      return;
    }

    try {
      await api.patch(`/cuentas/${cuentaId}/items/${item.id}`, { cantidad: Number(item.cantidad) + 1 });
      await recargarCuenta();
    } catch (error) { console.error('Error incrementando', error); }
  };

  const removerItem = async (itemId: string) => {
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]); 

    if (!isOnline) {
      const itemToDelete = items.find(i => i.id === itemId);
      if (itemToDelete?.is_local) {
        const newItems = items.filter(i => i.id !== itemId);
        const newTotal = newItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
        setCuentaActiva(mesaId, cuentaId!, { ...cuenta, total: newTotal }, newItems);
      } else {
        alert("No puedes eliminar un producto ya sincronizado sin conexión.");
      }
      return;
    }

    try {
      await api.delete(`/cuentas/${cuentaId}/items/${itemId}`);
      await recargarCuenta();
    } catch (error) { console.error('Error eliminando', error); }
  };

  const renderModificadoresAgrupados = (modificadores: any) => {
    let mods = modificadores;
    if (typeof mods === 'string') {
      try { mods = JSON.parse(mods); } catch (e) { mods = []; }
    }
    
    const modsAgrupados = Array.isArray(mods) ? Object.values(mods.reduce((acc: any, mod: any) => {
      const name = mod.nombre || mod;
      if (!acc[name]) acc[name] = { ...mod, _cantidad: 1 };
      else acc[name]._cantidad += 1;
      return acc;
    }, {})) : [];

    return modsAgrupados.map((mod: any, idx: number) => {
      const modName = mod.nombre || mod;
      const cantStr = mod._cantidad > 1 ? `${mod._cantidad}x ` : '';
      const precioExtraStr = Number(mod.precio_extra) > 0 ? ` (+${(Number(mod.precio_extra) * mod._cantidad).toLocaleString()})` : '';
      return (
        <div key={idx}>{"->"} {cantStr}{modName} {precioExtraStr}</div>
      );
    });
  };

  return (
    <div className="flex flex-col lg:flex-row h-full max-h-screen overflow-hidden bg-background relative">
      
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-border bg-slate-50/50">
        
        <div className="w-full overflow-x-auto border-b bg-white p-2 md:p-4 shrink-0 shadow-sm flex justify-between items-center gap-2">
          
          <div className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar items-center">
            <div className={clsx("flex items-center gap-2 px-3 py-2 rounded-full border shadow-inner shrink-0", isOnline ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200")}>
              {isSyncing ? (
                <RefreshCcw size={16} className="text-emerald-600 animate-spin" />
              ) : isOnline ? (
                <Wifi size={16} className="text-emerald-600" />
              ) : (
                <WifiOff size={16} className="text-rose-600" />
              )}
              <span className={clsx("text-xs font-black uppercase tracking-wider hidden sm:inline", isOnline ? "text-emerald-700" : "text-rose-700")}>
                {isSyncing ? 'Sincronizando' : isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="w-px h-8 bg-slate-200 mx-2 hidden sm:block"></div>

            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => { setCategoriaActiva(cat); if (navigator.vibrate) navigator.vibrate(20); }}
                className={clsx(
                  "whitespace-nowrap px-4 md:px-6 py-2 md:py-3 rounded-full md:rounded-2xl font-bold transition-all text-sm md:text-base select-none touch-manipulation",
                  categoriaActiva === cat ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button disabled={!isOnline} onClick={() => setModalEsperaOpen(true)} className="flex items-center justify-center bg-amber-100 text-amber-700 hover:bg-amber-200 p-2 md:px-4 md:py-3 rounded-2xl font-bold transition-colors disabled:opacity-50">
              <Clock size={20} /> <span className="hidden xl:inline ml-2">Aparcadas</span>
            </button>
            <button disabled={!isOnline} onClick={() => setModalUltimasVentasOpen(true)} className="flex items-center justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 p-2 md:px-4 md:py-3 rounded-2xl font-bold transition-colors disabled:opacity-50">
              <Receipt size={20} /> <span className="hidden xl:inline ml-2">Ventas</span>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 md:p-6 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 pb-28 md:pb-6 content-start">
          {productosFiltrados.map(prod => (
            <button key={prod.id || prod.producto_id} onClick={() => handleAgregarProducto(prod)} className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-3 md:p-5 flex flex-col justify-between items-start text-left min-h-[110px] md:min-h-[140px] hover:border-primary/50 active:bg-slate-50 transition-colors touch-manipulation shadow-sm active:shadow-inner">
              <span className="font-bold text-sm md:text-xl text-slate-800 leading-tight">{prod.nombre}</span>
              <span className="mt-2 md:mt-4 font-black text-emerald-600 text-base md:text-xl font-mono bg-emerald-50 md:bg-transparent px-2 md:px-0 py-1 md:py-0 rounded-lg">${Number(prod.precio_venta).toLocaleString()}</span>
            </button>
          ))}
        </div>

        <div className="lg:hidden fixed bottom-6 right-6 left-6 z-30 flex justify-end pointer-events-none">
          <button onClick={() => { setComandaMobileOpen(true); if (navigator.vibrate) navigator.vibrate(30); }} className={clsx("pointer-events-auto flex items-center gap-3 p-4 md:p-5 rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.4)] font-black text-lg transition-all duration-300", isBouncing ? "scale-110 bg-emerald-500 text-white" : "bg-primary text-primary-foreground active:scale-95")}>
            <div className="relative"><ShoppingBag size={24} />{isBouncing && <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping" />}</div>
            <span>Ver Pedido ({totalItemsCount})</span>
            <div className="bg-white/20 px-3 py-1 rounded-full ml-1 font-mono">${Number(cuenta?.total || 0).toLocaleString()}</div>
          </button>
        </div>
      </div>

      <div className={clsx(
        "fixed inset-y-0 right-0 w-full sm:w-[440px] lg:w-[400px] xl:w-[450px] bg-white flex flex-col h-full shadow-2xl z-40 transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:shadow-xl border-l border-slate-100",
        comandaMobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <div className="p-4 md:p-5 border-b bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <ShoppingBag size={20} className={!mesaId && cuentaId ? "text-orange-400" : "text-emerald-400"} />
            <h2 className="text-lg md:text-xl font-black">{!mesaId && cuentaId ? 'Venta Mostrador' : 'Mesa Actual'}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold border border-white/20">{totalItemsCount} uds</div>
            <button onClick={() => setComandaMobileOpen(false)} className="lg:hidden p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors active:scale-90"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 bg-slate-50/80">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center gap-4">
              <ShoppingBag size={64} className="opacity-20 text-slate-500" />
              <p className="text-lg font-medium text-slate-500">Comanda vacía.<br/>Toca los productos para agregarlos o iniciar una venta rápida.</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="bg-white border border-slate-200/60 rounded-2xl p-3 md:p-4 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm md:text-lg leading-tight">{item.producto_nombre || item.nombre}</span>
                    {item.is_local && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 rounded-full w-max mt-1 font-bold">Esperando Red...</span>}
                    {item.modificadores && item.modificadores.length > 0 && (
                      <div className="text-[11px] md:text-xs text-slate-500 mt-0.5 space-y-0.5 font-sans italic">
                        {renderModificadoresAgrupados(item.modificadores)}
                      </div>
                    )}
                  </div>
                  <span className="font-black text-slate-900 font-mono text-sm md:text-base mt-1">${Number(item.subtotal || (item.precio_unitario * item.cantidad)).toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
                    <button onClick={() => decrementarCantidad(item)} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm active:scale-95 text-slate-700"><Minus size={16} className="stroke-[3px]" /></button>
                    <span className="w-8 text-center font-black text-lg">{item.cantidad}</span>
                    <button onClick={() => incrementarCantidad(item)} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm active:scale-95 text-slate-700"><Plus size={16} className="stroke-[3px]" /></button>
                  </div>
                  <button onClick={() => removerItem(item.id)} className="w-10 h-10 flex items-center justify-center text-rose-500 bg-rose-50 rounded-xl active:bg-rose-100 active:scale-95 transition-colors"><Trash2 size={18} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 md:p-5 border-t bg-white pb-safe shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
          {mesaId ? (
            <div className="flex gap-2 mb-4">
              <button disabled={items.length === 0 || !isOnline} onClick={() => setModalDividirOpen(true)} className="flex-1 flex flex-col items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-40 active:scale-95"><SplitSquareHorizontal size={18} /> Dividir</button>
              <button disabled={!isOnline} onClick={() => setModalTransferirOpen(true)} className="flex-1 flex flex-col items-center justify-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-40"><ArrowRightLeft size={18} /> Mover</button>
            </div>
          ) : (
            cuentaId && (
              <button disabled={!isOnline} onClick={() => { limpiarCuenta(); setComandaMobileOpen(false); }} className="w-full mb-4 flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-40">
                <Clock size={18} /> Aparcar (Poner en Espera)
              </button>
            )
          )}

          <div className="flex justify-between items-end mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total</span>
            <span className="text-3xl font-black text-slate-900 font-mono">${Number(cuenta?.total || 0).toLocaleString()}</span>
          </div>

          <button disabled={!cuentaId || items.length === 0 || !isOnline} onClick={handleMandarACocina} className="group relative flex items-center justify-center gap-3 w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white p-4 rounded-2xl font-black text-lg transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 active:scale-[0.98] overflow-hidden select-none mb-2 disabled:opacity-50">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-2xl pointer-events-none" />
            <ChefHat className="z-10 group-hover:-rotate-12 transition-transform duration-300" size={24} />
            <span className="z-10 tracking-wide">Enviar a Cocina</span>
          </button>

          <button disabled={!cuentaId || items.length === 0 || !isOnline} onClick={() => { setComandaMobileOpen(false); setModalPagoOpen(true); }} className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl font-black text-lg text-white transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 bg-emerald-600 shadow-lg shadow-emerald-600/20">
            <CreditCard size={24} /> COBRAR
          </button>
        </div>
      </div>

      {modalPagoOpen && <ModalPagoCombinado onClose={() => setModalPagoOpen(false)} />}
      {modalTransferirOpen && <ModalTransferirMesa onClose={() => setModalTransferirOpen(false)} />}
      {modalDividirOpen && <ModalDividirCuenta onClose={() => setModalDividirOpen(false)} onDividirSuccess={() => { setModalDividirOpen(false); setModalPagoOpen(true); }} />}
      {modalModsOpen && productoActual && <ModalModificadores producto={productoActual} grupos={gruposDelProducto} onClose={() => setModalModsOpen(false)} onConfirm={handleConfirmarModificadores} />}
      {modalUltimasVentasOpen && <ModalUltimasVentas onClose={() => setModalUltimasVentasOpen(false)} />}
      {modalEsperaOpen && <ModalCuentasEnEspera onClose={() => setModalEsperaOpen(false)} />}
      {modalComandaOpen && <ModalComanda onClose={() => setModalComandaOpen(false)} />}
    </div>
  );
};