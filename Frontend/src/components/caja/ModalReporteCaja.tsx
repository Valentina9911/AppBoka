import { useEffect, useState } from 'react';
import { X, Printer, Download, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

interface ModalReporteCajaProps {
  turnoData: any;
  tipoReporte: 'X' | 'Z';
  onClose: () => void;
}

export const ModalReporteCaja = ({ turnoData, tipoReporte, onClose }: ModalReporteCajaProps) => {
  const [config, setConfig] = useState<any>({});
  
  const [incluirMovimientos, setIncluirMovimientos] = useState(false);
  const [incluirProductos, setIncluirProductos] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configRes = await api.get('/configuracion');
        const confObj: any = {};
        configRes.data.data.forEach((c: any) => { confObj[c.clave] = c.valor; });
        setConfig(confObj);
      } catch (error) {
        console.error('Error fetching config', error);
      }
    };
    fetchConfig();
  }, []);

  const handlePrintPantalla = () => window.print();

  const handlePrintFisica = async () => {
    try {
      await api.post('/caja/imprimir-reporte', { 
        tipo: tipoReporte, 
        turno: turnoData,
        opciones: {
          incluir_movimientos: incluirMovimientos,
          incluir_productos: incluirProductos
        }
      });
      alert(`Señal enviada a la impresora física (Reporte ${tipoReporte})`);
    } catch (error) {
      alert('Error al conectar con la impresora física');
    }
  };

  const formatCurrency = (val: number | string) => `$${Number(val).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;

  const baseInicial = Number(turnoData.monto_apertura || 0);
  const ventasEfectivo = Number(turnoData.total_efectivo || 0);
  const ventasElectronicas = Number(turnoData.total_electronico || 0);
  const propinas = Number(turnoData.total_propina || 0);
  const descuentos = Number(turnoData.total_descuento || 0);
  const egresos = Number(turnoData.total_egresos || 0); 
  const ingresosExtra = Number(turnoData.total_ingresos_extra || 0); 
  
  const totalVentas = ventasEfectivo + ventasElectronicas;
  const efectivoEsperado = baseInicial + ventasEfectivo + ingresosExtra - egresos;

  return (
    <>
      <style type="text/css" media="print">
        {`
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report {
            position: absolute; left: 0; top: 0; width: 80mm; margin: 0; padding: 10px; box-shadow: none;
          }
          .no-print { display: none !important; }
        `}
      </style>

      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-100 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
          
          <div className="p-6 border-b flex justify-between items-center bg-white shrink-0 no-print">
            <div className="flex items-center gap-3 text-indigo-600">
              <CheckCircle2 size={28} />
              <h2 className="text-xl font-black text-slate-800">Reporte {tipoReporte} Generado</h2>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-200">
            {/* INICIO TICKET HTML/PDF */}
            <div id="printable-report" className="bg-white p-6 shadow-md w-full max-w-[350px] font-mono text-sm text-slate-900 leading-tight">
              
              <div className="text-center mb-4">
                <h2 className="font-bold text-xl uppercase mb-1">{config.negocio_nombre || 'Mi Restaurante'}</h2>
                <h3 className="font-bold text-lg">REPORTE {tipoReporte} DE CAJA</h3>
                <p className="mt-2 border-t border-dashed pt-2">
                  Fecha: {new Date().toLocaleString('es-CO')}<br/>
                  Cajero: {turnoData.cajero || turnoData.cajero_nombre}<br/>
                  Caja: {turnoData.caja_nombre || 'Caja Principal'}
                </p>
              </div>

              <div className="border-t border-dashed pt-2 mb-4">
                <div className="flex justify-between"><span>Base Inicial:</span> <span>{formatCurrency(baseInicial)}</span></div>
                <div className="flex justify-between"><span>Ventas Efectivo:</span> <span>{formatCurrency(ventasEfectivo)}</span></div>
                <div className="flex justify-between"><span>Ventas Electrónicas:</span> <span>{formatCurrency(ventasElectronicas)}</span></div>
              </div>

              {(egresos > 0 || ingresosExtra > 0) && (
                <div className="border-t border-dashed pt-2 mb-4 text-xs">
                  {egresos > 0 && <div className="flex justify-between"><span>Gastos/Egresos:</span> <span>-{formatCurrency(egresos)}</span></div>}
                  {ingresosExtra > 0 && <div className="flex justify-between"><span>Ingresos Extra:</span> <span>+{formatCurrency(ingresosExtra)}</span></div>}
                </div>
              )}

              {(descuentos > 0 || propinas > 0) && (
                <div className="border-t border-dashed pt-2 mb-4 text-xs">
                  {descuentos > 0 && <div className="flex justify-between"><span>Descuentos:</span> <span>{formatCurrency(descuentos)}</span></div>}
                  {propinas > 0 && <div className="flex justify-between"><span>Propinas Recaudadas:</span> <span>{formatCurrency(propinas)}</span></div>}
                </div>
              )}

              <div className="border-t border-dashed pt-2 mb-4 font-bold">
                <div className="flex justify-between"><span>TOTAL VENTAS:</span> <span>{formatCurrency(totalVentas)}</span></div>
                <div className="flex justify-between mt-1"><span>EFECTIVO ESPERADO:</span> <span>{formatCurrency(efectivoEsperado)}</span></div>
              </div>

              {tipoReporte === 'Z' && (
                <div className="border-t border-dashed pt-2 mb-4">
                  <div className="flex justify-between"><span>Conteo Físico Real:</span> <span>{formatCurrency(turnoData.monto_cierre_real)}</span></div>
                  <div className="flex justify-between mt-1"><span>Diferencia:</span> <span>{formatCurrency(turnoData.diferencia)}</span></div>
                </div>
              )}

              {/* RENDERIZADO OPCIONAL: MOVIMIENTOS DE CAJA MENOR */}
              {incluirMovimientos && turnoData.movimientos_detalle && turnoData.movimientos_detalle.length > 0 && (
                <div className="border-t border-dashed pt-2 mb-4">
                  <p className="font-bold text-center mb-1">DETALLE DE MOVIMIENTOS</p>
                  {turnoData.movimientos_detalle.map((mov: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs mb-1">
                      <span className="truncate pr-2">{mov.tipo === 'ingreso' ? '(+)' : '(-)'} {mov.descripcion}</span>
                      <span>{formatCurrency(mov.monto)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* RENDERIZADO OPCIONAL: PRODUCTOS VENDIDOS */}
              {incluirProductos && turnoData.productos_detalle && turnoData.productos_detalle.length > 0 && (
                <div className="border-t border-dashed pt-2 mb-4">
                  <p className="font-bold text-center mb-1">PRODUCTOS VENDIDOS</p>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr>
                        <th className="pb-1">Cant</th>
                        <th className="pb-1">Producto</th>
                        <th className="pb-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {turnoData.productos_detalle.map((prod: any, i: number) => (
                        <tr key={i}>
                          <td className="py-1">{Number(prod.cantidad)}</td>
                          <td className="py-1 truncate max-w-[120px]">{prod.nombre}</td>
                          <td className="py-1 text-right">{formatCurrency(prod.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="text-center border-t border-dashed pt-4">
                <p className="font-bold">--- FIN DE REPORTE ---</p>
              </div>

            </div>
          </div>

          <div className="p-6 border-t bg-white shrink-0 flex flex-col gap-4 no-print">
            
            {/* CHECKBOXES DE OPCIONES EXTRAS */}
            <div className="flex flex-col gap-2 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <label className="flex items-center gap-2 font-bold text-indigo-900 cursor-pointer">
                <input type="checkbox" checked={incluirMovimientos} onChange={e => setIncluirMovimientos(e.target.checked)} className="w-5 h-5 rounded text-indigo-600" />
                Añadir detalles de movimientos (Caja Menor)
              </label>
              <label className="flex items-center gap-2 font-bold text-indigo-900 cursor-pointer">
                <input type="checkbox" checked={incluirProductos} onChange={e => setIncluirProductos(e.target.checked)} className="w-5 h-5 rounded text-indigo-600" />
                Incluir detalle de productos vendidos
              </label>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={handlePrintPantalla} className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 p-4 rounded-xl font-bold transition-all"><Download size={20} /> PDF / Imprimir</button>
              <button onClick={handlePrintFisica} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20"><Printer size={20} /> Ticketera Física</button>
              <button onClick={onClose} className="sm:col-span-2 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl font-bold transition-all">Finalizar</button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};