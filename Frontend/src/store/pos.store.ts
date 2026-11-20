
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface PosItem {
  id: string;
  producto_id: string;
  producto_nombre?: string;
  estado?: string;
  nombre?: string;
  precio_unitario: number;
  cantidad: number;
  impuesto_pct: number;
  subtotal?: number;
  notas?: string;
  modificadores?: { nombre: string; precio_extra: string | number; id?: string }[];
  is_local?: boolean; // Bandera para saber si fue creado sin internet
}

interface PosState {
  mesaId: number | null;
  cuentaId: string | null;
  clienteId: number;
  cuenta: any | null; 
  items: PosItem[];

  setCuentaActiva: (mesaId: number | null, cuentaId: string, cuentaData: any, items: PosItem[]) => void;
  limpiarCuenta: () => void;
  setCuentaLocal: (cuentaId: string, cuentaData: any) => void;
}

export const usePosStore = create<PosState>()(
  persist(
    (set) => ({
      mesaId: null,
      cuentaId: null,
      clienteId: 1,
      cuenta: null,
      items: [],

      setCuentaActiva: (mesaId, cuentaId, cuentaData, items) => set({ 
        mesaId, 
        cuentaId, 
        cuenta: cuentaData, 
        items,
        clienteId: cuentaData?.cliente_id || 1
      }),

      limpiarCuenta: () => set({ 
        mesaId: null, 
        cuentaId: null, 
        cuenta: null, 
        items: [], 
        clienteId: 1 
      }),

      setCuentaLocal: (cuentaId, cuenta) => set({ cuentaId, cuenta }),
    }),
    {
      name: 'pos-survival-storage', // Guarda la caja temporal
      storage: createJSONStorage(() => localStorage),
    }
  )
);