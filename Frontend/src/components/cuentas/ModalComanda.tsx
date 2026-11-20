
import { X, Printer, ChefHat } from 'lucide-react';
import { usePosStore } from '../../store/pos.store';

export const ModalComanda = ({ onClose }: { onClose: () => void }) => {
  const { mesaId, items } = usePosStore();
  
  const handlePrintPantalla = () => {
    window.print();
  };

  const itemsVisibles = items.filter(i => i.estado !== 'cancelado');

  return (
    <>
      <style type="text/css" media="print">
        {`
          body * { visibility: hidden; }
          #printable-comanda, #printable-comanda * { visibility: visible; }
          @page { size: 80mm auto; margin: 0; }
          #printable-comanda {
            position: absolute; left: 0; top: 0; width: 78mm; margin: 0; padding: 2mm;
            box-shadow: none !important; font-family: monospace; color: black; font-size: 16px;
          }
          .no-print { display: none !important; }
        `}
      </style>

      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-100 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
          
          <div className="p-6 border-b flex justify-between items-center bg-white shrink-0 no-print">
            <div className="flex items-center gap-3 text-orange-500">
              <ChefHat size={28} />
              <h2 className="text-xl font-black text-slate-800">Comanda Cocina</h2>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-200">
            <div id="printable-comanda" className="bg-white p-6 shadow-md w-full font-mono text-slate-900 leading-snug">
              <div className="text-center mb-6 border-b-2 border-black pb-4">
                <h2 className="font-black text-2xl uppercase">PEDIDO COCINA</h2>
                <h3 className="font-bold text-xl mt-2">{mesaId ? `MESA ID: ${mesaId}` : 'VENTA MOSTRADOR'}</h3>
                <p className="mt-2 text-sm">Hora: {new Date().toLocaleTimeString('es-CO')}</p>
              </div>

              <div className="space-y-4">
                {itemsVisibles.map((item: any) => {
                   const notasArray = item.notas ? item.notas.split(',').map((n: string) => n.trim()) : [];
                   
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
                     <div key={item.id} className="border-b border-dashed border-slate-400 pb-2">
                       <div className="flex gap-2">
                         <span className="font-black text-lg">[{item.cantidad}]</span>
                         <span className="font-bold text-lg">{item.producto_nombre || item.nombre}</span>
                       </div>
                       
                       {modsAgrupados.map((mod: any, idx: number) => {
                         const modName = mod.nombre || mod;
                         const cantStr = mod._cantidad > 1 ? `${mod._cantidad}x ` : '';
                         return (
                           <div key={idx} className="pl-8 text-sm font-medium italic">
                             {"->"} {cantStr}{modName}
                           </div>
                         );
                       })}

                       {notasArray.length > 0 && (
                         <div className="pl-8 mt-1 text-sm font-bold uppercase">
                           {notasArray.map((nota: string, idx: number) => (
                             <div key={idx}>** {nota}</div>
                           ))}
                         </div>
                       )}
                     </div>
                   );
                })}
              </div>
            </div>
          </div>

          <div className="p-6 border-t bg-white shrink-0 flex flex-col gap-3 no-print">
            <button onClick={handlePrintPantalla} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white p-4 rounded-xl font-black text-lg transition-all">
              <Printer size={24} /> Imprimir Comanda
            </button>
          </div>

        </div>
      </div>
    </>
  );
};