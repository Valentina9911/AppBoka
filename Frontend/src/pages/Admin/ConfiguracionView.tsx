import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Settings, Save, Store } from 'lucide-react';

export const ConfiguracionView = () => {
  const [config, setConfig] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await api.get('/configuracion');
        setConfig(res.data.data);
        
        const initialData: Record<string, string> = {};
        res.data.data.forEach((item: any) => {
          initialData[item.clave] = item.valor;
        });
        setFormData(initialData);
      } catch (error) {
        console.error('Error', error);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleChange = (clave: string, valor: string) => {
    setFormData({ ...formData, [clave]: valor });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ajustesAEnviar = Object.keys(formData).map(clave => ({
        clave,
        valor: String(formData[clave])
      }));
      await api.put('/configuracion', { ajustes: ajustesAEnviar });
      alert('Configuración guardada exitosamente. Se aplicará en el próximo ticket.');
    } catch (error) {
      alert('Error guardando la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Cargando Ajustes...</div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto h-full flex flex-col">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-sm">
          <Store size={32} />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Perfil del Negocio</h1>
          <p className="text-muted-foreground text-lg">Datos que aparecerán en las facturas y tickets.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 transition-transform active:scale-[0.98] shadow-md disabled:opacity-50"
        >
          <Save size={24} />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-border shadow-sm p-6 md:p-8 flex-1 overflow-y-auto">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4">
          <Settings className="text-slate-500"/> Variables del Sistema
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {config.map(item => (
            <div key={item.clave} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <label className="block text-sm font-bold text-slate-700 mb-1 uppercase tracking-wider">
                {item.clave.replace(/_/g, ' ')}
              </label>
              <p className="text-xs text-slate-400 mb-3 leading-tight min-h-[32px]">{item.descripcion}</p>
              <input
                type={item.tipo === 'number' ? 'number' : 'text'}
                value={formData[item.clave] || ''}
                onChange={(e) => handleChange(item.clave, e.target.value)}
                className="w-full bg-white border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none font-medium text-slate-800"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};