import { useState, useEffect } from 'react';
import { Shield, Plus, ShieldCheck, Users, Settings, Lock } from 'lucide-react';
import clsx from 'clsx';
import api from '../../services/api';

export const RolesPermisosView = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [permisosGlobales, setPermisosGlobales] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const [activePermissions, setActivePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resRoles, resPermisos] = await Promise.all([
          api.get('/usuarios/roles'),
          api.get('/usuarios/permisos')
        ]);
        setRoles(resRoles.data.data);
        setPermisosGlobales(resPermisos.data.data);
        
        if (resRoles.data.data.length > 0) {
          handleSelectRole(resRoles.data.data[0].id);
        }
      } catch (error) {
        console.error('Error cargando roles y permisos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSelectRole = async (rolId: string) => {
    setSelectedRoleId(rolId);
    setIsCreating(false);
    try {
      const res = await api.get(`/usuarios/roles/${rolId}/permisos`);
      setActivePermissions(res.data.data || []);
    } catch (error) {
      console.error('Error cargando permisos del rol', error);
      setActivePermissions([]);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName) return;
    try {
      const res = await api.post('/usuarios/roles', { nombre: newRoleName, descripcion: newRoleDesc });
      const nuevoRol = res.data.data;
      setRoles([...roles, nuevoRol]);
      setIsCreating(false);
      setNewRoleName('');
      setNewRoleDesc('');
      handleSelectRole(nuevoRol.id);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al crear rol');
    }
  };

  const togglePermission = async (permisoId: string) => {
    if (!selectedRoleId) return;
    
    const activeRole = roles.find(r => r.id === selectedRoleId);
    if (activeRole?.es_sistema && activeRole?.nombre === 'Super Admin') {
      alert('No puedes modificar los permisos del Super Admin.');
      return;
    }

    const isCurrentlyActive = activePermissions.includes(permisoId);
    const newPermissions = isCurrentlyActive 
      ? activePermissions.filter(id => id !== permisoId)
      : [...activePermissions, permisoId];

    setActivePermissions(newPermissions);

    try {
      await api.put(`/usuarios/roles/${selectedRoleId}/permisos`, { permisos_ids: newPermissions });
    } catch (error: any) {
      setActivePermissions(activePermissions);
      alert(error.response?.data?.message || 'Error al actualizar permisos');
    }
  };

  const activeRole = roles.find(r => r.id === selectedRoleId);

  const modulos = Array.from(new Set(permisosGlobales.map(p => p.modulo)));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-sm">
          <ShieldCheck size={32} />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Roles y Permisos</h1>
          <p className="text-muted-foreground text-lg">Administra accesos y restricciones de los empleados.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 overflow-hidden">
        
        {/* PANEL IZQUIERDO: LISTA DE ROLES */}
        <div className="lg:col-span-4 bg-card rounded-3xl border border-border flex flex-col overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border bg-card/50 flex items-center justify-between">
            <h2 className="font-bold text-xl flex items-center gap-2">
              <Users size={24} className="text-primary"/> Roles
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? <p className="text-center text-slate-500 py-4">Cargando...</p> : roles.map(role => (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role.id)}
                className={clsx(
                  "w-full text-left p-5 rounded-2xl transition-all border-2",
                  selectedRoleId === role.id && !isCreating
                    ? "bg-primary/5 border-primary shadow-sm"
                    : "bg-background border-transparent hover:border-border hover:bg-secondary/50"
                )}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-foreground">{role.nombre}</h3>
                  {role.es_sistema && <Lock size={16} className="text-slate-400" />}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{role.descripcion || 'Sin descripción'}</p>
              </button>
            ))}

            {isCreating && (
              <div className="p-5 rounded-2xl bg-primary/5 border-2 border-primary space-y-3">
                <input type="text" autoFocus placeholder="Nombre del rol..." value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} className="w-full bg-background border border-border rounded-xl p-3 font-semibold focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="text" placeholder="Descripción breve..." value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleCreateRole} className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl font-bold text-sm">Crear</button>
                  <button onClick={() => setIsCreating(false)} className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-xl text-sm font-semibold">Cancelar</button>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-card/50">
            <button onClick={() => { setIsCreating(true); setSelectedRoleId(null); }} className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground p-4 rounded-2xl font-bold transition-transform active:scale-[0.98]">
              <Plus size={24}/> Crear Nuevo Rol
            </button>
          </div>
        </div>

        {/* PANEL DERECHO: PERMISOS */}
        {selectedRoleId && !isCreating ? (
          <div className="lg:col-span-8 bg-card rounded-3xl border border-border shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 md:p-8 border-b border-border flex items-center justify-between shrink-0 bg-background/50">
              <div>
                <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
                  {activeRole?.nombre} 
                  {activeRole?.es_sistema && <span className="bg-rose-100 text-rose-700 text-xs px-2 py-1 rounded-md uppercase font-bold">Protegido</span>}
                </h2>
                <p className="text-muted-foreground mt-1">
                  {activeRole?.nombre === 'Super Admin' 
                    ? 'El Super Admin tiene todos los permisos habilitados por defecto.' 
                    : 'Activa o desactiva los módulos. Se guarda automáticamente.'}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
              {modulos.map((moduloName) => {
                const permisosModulo = permisosGlobales.filter(p => p.modulo === moduloName);
                return (
                  <div key={moduloName} className="bg-background rounded-3xl border border-border overflow-hidden">
                    <div className="p-5 bg-secondary/50 border-b border-border flex items-center gap-3">
                      <Settings className="text-slate-500" size={24} />
                      <h3 className="font-bold text-lg capitalize">{moduloName}</h3>
                    </div>
                    <div className="p-2 md:p-4">
                      {permisosModulo.map((perm) => {
                        const isActive = activeRole?.nombre === 'Super Admin' || activePermissions.includes(perm.id);
                        const isDisabled = activeRole?.nombre === 'Super Admin';

                        return (
                          <div key={perm.id} className="flex items-center justify-between p-4 hover:bg-secondary/30 rounded-2xl transition-colors">
                            <div>
                              <p className="font-bold text-foreground text-[1.1rem]">{perm.descripcion || perm.codigo}</p>
                              <p className="text-sm text-muted-foreground opacity-80 font-mono mt-1">{perm.codigo}</p>
                            </div>
                            
                            <button
                              disabled={isDisabled}
                              onClick={() => togglePermission(perm.id)}
                              className={clsx(
                                "relative inline-flex h-10 w-20 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors border-2 focus:outline-none",
                                isActive ? "bg-primary border-primary" : "bg-muted border-muted-foreground/20",
                                isDisabled && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <span
                                className={clsx(
                                  "pointer-events-none absolute left-1 flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-sm transition-transform duration-200",
                                  isActive ? "translate-x-10" : "translate-x-0"
                                )}
                              />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 flex items-center justify-center p-12 bg-secondary/30 rounded-3xl border border-dashed border-border">
            <div className="text-center">
              <Shield size={64} className="mx-auto text-muted-foreground opacity-20 mb-4" />
              <h2 className="text-xl font-bold text-muted-foreground">Selecciona o crea un rol</h2>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};