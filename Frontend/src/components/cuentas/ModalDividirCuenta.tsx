import { useState, useMemo } from 'react';
import { X, SplitSquareHorizontal, Minus, Plus } from 'lucide-react';
import { usePosStore } from '../../store/pos.store';
import api from '../../services/api';
import clsx from 'clsx';

export const ModalDividirCuenta = ({ onClose, onDividirSuccess }: { onClose: () => void, onDividirSuccess: () => void }) => {
  const { cuentaId, items, setCuentaActiva } = usePosStore();

  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalItemsSeparados = useMemo(() => {
    return Object.values(cantidades).reduce((acc, curr) => acc + curr, 0);
  }, [cantidades]);

  const totalItemsEnCuenta = useMemo(() => {
    return items.reduce((acc, item) => acc + Number(item.cantidad), 0);
  }, [items]);

  const incrementar = (id: string, max: number) => {
    const actual = cantidades[id] || 0;
    if (actual < max) setCantidades({ ...cantidades, [id]: actual + 1 });
  };

  const decrementar = (id: string) => {
    const actual = cantidades[id] || 0;
    if (actual > 0) setCantidades({ ...cantidades, [id]: actual - 1 });
  };

  const handleDividir = async () => {
    if (!cuentaId) return;

    const itemsADividir = Object.keys(cantidades)
      .filter(id => cantidades[id] > 0)
      .map(id => ({ id, cantidad: cantidades[id] }));

    if (itemsADividir.length === 0) return alert("Añade al menos un producto.");
    if (totalItemsSeparados >= totalItemsEnCuenta) return alert("Usa el botón COBRAR original si vas a pagar todo.");

    setIsSubmitting(true);
    try {
      const res = await api.post(`/cuentas/${cuentaId}/dividir`, { items: itemsADividir });
      const nuevaCuenta = res.data.data.nueva;

      const cuentaRes = await api.get(`/cuentas/${nuevaCuenta.id}`);
      const { cuenta: cuentaData, items: nuevosItems } = cuentaRes.data.data;

      setCuentaActiva(cuentaData.mesa_id, cuentaData.id, cuentaData, nuevosItems);
      
      onDividirSuccess();
      
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al dividir la cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
        
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3 text-slate-800">
            <SplitSquareHorizontal size={28} className="text-primary" />
            <div>
              <h2 className="text-xl font-black">Dividir Cuenta</h2>
              <p className="text-sm font-medium text-slate-500">¿Cuántos vas a pagar por aparte?</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[50vh] space-y-3">
          {items.map(item => {
            const maxDisp = Number(item.cantidad);
            const cantidadSeparada = cantidades[item.id] || 0;
            const isSelected = cantidadSeparada > 0;

            return (
              <div key={item.id} className={clsx("flex items-center justify-between p-4 border-2 rounded-2xl transition-all", isSelected ? "bg-indigo-50 border-indigo-500" : "bg-white border-slate-200")}>
                <div>
                  <p className={clsx("font-bold text-lg", isSelected ? "text-indigo-900" : "text-slate-700")}>{item.producto_nombre || item.nombre}</p>
                  <p className="text-sm text-slate-500">En la mesa hay: {maxDisp}</p>
                </div>

                <div className="flex items-center gap-3 bg-slate-100 rounded-xl p-1 shadow-inner">
                  <button onClick={() => decrementar(item.id)} disabled={cantidadSeparada <= 0} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm hover:bg-slate-50 active:scale-95 text-slate-700 disabled:opacity-30">
                    <Minus size={18} className="stroke-[3px]" />
                  </button>
                  <span className="w-6 text-center font-black text-lg text-slate-800">{cantidadSeparada}</span>
                  <button onClick={() => incrementar(item.id, maxDisp)} disabled={cantidadSeparada >= maxDisp} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm hover:bg-slate-50 active:scale-95 text-slate-700 disabled:opacity-30">
                    <Plus size={18} className="stroke-[3px]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t bg-slate-50">
          <button
            disabled={totalItemsSeparados === 0 || totalItemsSeparados >= totalItemsEnCuenta || isSubmitting}
            onClick={handleDividir}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground p-4 rounded-xl font-black text-lg transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Procesando...' : 
             totalItemsSeparados >= totalItemsEnCuenta ? 'Debes dejar algo en la cuenta original' :
             `Separar ${totalItemsSeparados} unidades y Cobrar`}
          </button>
        </div>

      </div>
    </div>
  );
};