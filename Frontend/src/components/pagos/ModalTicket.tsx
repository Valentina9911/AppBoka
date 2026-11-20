
import { useEffect, useState } from 'react';
import { X, Printer, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

export const ModalTicket = ({ ventaId, onClose }: { ventaId: string, onClose: () => void }) => {
  const [data, setData] = useState<any>(null);
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ventaRes = await api.get(`/ventas/${ventaId}`);
        setData(ventaRes.data.data);
        
        try {
          const configRes = await api.get('/configuracion');
          const confObj: any = {};
          configRes.data.data.forEach((c: any) => { confObj[c.clave] = c.valor; });
          setConfig(confObj);
        } catch (configError) {
          setConfig({
            negocio_nombre: 'Ticket de Venta',
            negocio_direccion: 'Generado automáticamente',
            negocio_nit: 'N/A',
            negocio_telefono: 'N/A'
          });
        }
      } catch (error) {
        console.error('Error fetching ticket data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ventaId]);

  const handlePrintPantalla = () => {
    window.print(); 
  };

  const handlePrintFisica = async () => {
    try {
      await api.post(`/ventas/${ventaId}/imprimir`);
      alert('Señal enviada a la impresora física por el Backend');
    } catch (error) {
      alert('Error al conectar con la impresora física desde el servidor');
    }
  };

  if (loading) return <div className="p-8 font-bold text-center">Generando ticket...</div>;
  if (!data) return <div className="p-8 text-center text-rose-500 font-bold">Error al cargar el ticket. Intente nuevamente.</div>;

  const { venta, items } = data;
  const formatCurrency = (val: number | string) => `$${Number(val).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
  const descuentoVenta = Number(venta.descuento || 0);
  const propinaVenta = Number(venta.propina || 0);
  const totalPagar = Number(venta.total) + propinaVenta;

  return (
    <>
      <style type="text/css" media="print">
        {`
          body * { visibility: hidden; }
          #printable-ticket, #printable-ticket * { visibility: visible; }
          @page { size: 80mm auto; margin: 0; }
          #printable-ticket {
            position: absolute; left: 0; top: 0; width: 78mm; margin: 0; padding: 2mm;
            box-shadow: none !important; font-family: monospace; color: black; font-size: 12px;
          }
          .no-print { display: none !important; }
        `}
      </style>
      
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-100 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
          
          <div className="p-6 border-b flex justify-between items-center bg-white shrink-0 no-print">
            <div className="flex items-center gap-3 text-emerald-600">
              <CheckCircle2 size={28} />
              <h2 className="text-xl font-black text-slate-800">Pago Completado</h2>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-200">
            <div id="printable-ticket" className="bg-white p-6 shadow-md w-full max-w-[350px] font-mono text-sm text-slate-900 leading-tight">
              <div className="text-center mb-4">
                <h2 className="font-bold text-xl uppercase mb-1">{config.negocio_nombre || 'Mi Restaurante'}</h2>
                <p>{config.negocio_direccion}</p>
                <p>NIT: {config.negocio_nit}</p>
                <p>Tel: {config.negocio_telefono}</p>
                <p className="mt-2 border-t border-dashed pt-2">
                  Factura #{venta.numero_factura}<br/>
                  Fecha: {new Date(venta.created_at).toLocaleString('es-CO')}
                </p>
              </div>
              <div className="mb-4 text-left border-b border-dashed pb-2">
                <p>Cliente: {venta.cliente_nombre}</p>
                {venta.cliente_documento && <p>NIT/CC: {venta.cliente_documento}</p>}
                <p>Cajero: {venta.cajero_nombre}</p>
              </div>
              <table className="w-full text-left mb-4">
                <thead className="border-b border-dashed">
                  <tr><th className="pb-1 w-8">Cant</th><th className="pb-1">Desc</th><th className="pb-1 text-right">Total</th></tr>
                </thead>
                <tbody className="align-top">
                  {items.map((item: any) => {
                    let mods = item.modificadores;
                    if (typeof mods === 'string') {
                      try { mods = JSON.parse(mods); } catch (e) { mods = []; }
                    }

                    const modsAgrupados = Array.isArray(mods) ? Object.values(mods.reduce((acc: any, mod: any) => {
                      const name = mod.nombre || mod;
                      if (!acc[name]) acc[name] = { ...mod, _cantidad: 1 };
                      else acc[name]._cantidad += 1;
                      return acc;
                    }, {})) : [];

                    return (
                      <tr key={item.id}>
                        <td className="py-1">{Number(item.cantidad)}</td>
                        <td className="py-1 pr-2">
                          <div className="font-bold text-slate-800">{item.producto_nombre}</div>
                          {modsAgrupados.map((mod: any, idx: number) => {
                            const modName = mod.nombre || mod;
                            const cantStr = mod._cantidad > 1 ? `${mod._cantidad}x ` : '';
                            return (
                              <div key={idx} className="text-[11px] text-slate-500 pl-2 mt-0.5 italic">
                                {"->"} {cantStr}{modName}
                              </div>
                            );
                          })}
                        </td>
                        <td className="py-1 text-right font-bold text-slate-900">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="border-t border-dashed pt-2 mb-4 text-right">
                <p>Subtotal: {formatCurrency(venta.subtotal)}</p>
                {descuentoVenta > 0 && <p className="text-xs">Descuento: -{formatCurrency(descuentoVenta)}</p>}
                {propinaVenta > 0 && <p className="text-xs">Propina: {formatCurrency(propinaVenta)}</p>}
                <p className="font-bold text-lg mt-1 border-t border-dashed pt-1">TOTAL: {formatCurrency(totalPagar)}</p>
              </div>
              <div className="text-center border-t border-dashed pt-4">
                <p className="font-bold">¡Gracias por su compra!</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t bg-white shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-3 no-print">
            <button onClick={handlePrintPantalla} className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 p-4 rounded-xl font-bold transition-all border-2 border-slate-300">
              <Printer size={20} /> Imprimir Ticket
            </button>
            <button onClick={handlePrintFisica} className="hidden sm:flex items-center justify-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-4 rounded-xl font-bold transition-all">
              Imp. Servidor
            </button>
            <button onClick={onClose} className="sm:col-span-2 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl font-bold transition-all">
              Continuar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};