import type React from 'react';
import { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import api from '../../services/api';
import clsx from 'clsx';

export const ModalMovimientoCaja = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {
  const [tipo, setTipo] = useState<'egreso' | 'ingreso'>('egreso');
  const [monto, setMonto] = useState<number | ''>('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/caja/movimiento', { tipo, monto: Number(monto), descripcion });
      alert('Movimiento registrado con éxito en la caja.');
      onSuccess();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error registrando movimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
        
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-800">Caja Menor</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button type="button" onClick={() => setTipo('egreso')} className={clsx("flex-1 py-3 rounded-lg font-bold text-sm flex justify-center gap-2", tipo === 'egreso' ? "bg-white shadow-sm text-rose-600" : "text-slate-500")}>
              <ArrowDownRight size={18} /> Registrar Gasto
            </button>
            <button type="button" onClick={() => setTipo('ingreso')} className={clsx("flex-1 py-3 rounded-lg font-bold text-sm flex justify-center gap-2", tipo === 'ingreso' ? "bg-white shadow-sm text-emerald-600" : "text-slate-500")}>
              <ArrowUpRight size={18} /> Ingreso Extra
            </button>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1 uppercase">Motivo / Descripción</label>
            <input required type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: Pago proveedor hielo..." className="w-full h-12 border-2 border-slate-200 rounded-xl px-4 font-bold outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1 uppercase">Monto ($)</label>
            <input required type="number" value={monto} onChange={(e) => setMonto(e.target.value ? Number(e.target.value) : '')} placeholder="0" className="w-full h-12 border-2 border-slate-200 rounded-xl px-4 font-black text-2xl text-slate-800 outline-none focus:border-indigo-500" />
          </div>

          <button disabled={loading || !monto || !descripcion} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-xl font-bold transition-all disabled:opacity-50 mt-2">
            {loading ? 'Guardando...' : 'Confirmar Movimiento'}
          </button>
        </form>

      </div>
    </div>
  );
};