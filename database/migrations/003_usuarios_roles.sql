-- Funcionalidad: usuarios-roles. Aplicar con npm run migrate desde Backend.

INSERT INTO public.roles(nombre,descripcion,es_sistema) VALUES ('Cajero','Caja',true),('Mesero','Servicio',true),('Cocina','Preparacion',true);

INSERT INTO public.permisos(codigo,modulo,descripcion) VALUES
('roles:crear','roles','Permiso de usuarios-roles'),
('roles:editar','roles','Permiso de usuarios-roles'),
('roles:ver','roles','Permiso de usuarios-roles'),
('usuarios:editar','usuarios','Permiso de usuarios-roles'),
('usuarios:ver','usuarios','Permiso de usuarios-roles')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO public.rol_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM public.roles r CROSS JOIN public.permisos p
WHERE r.nombre='Super Admin'
OR (r.nombre='Cajero' AND p.modulo IN ('ventas','caja','mesas','clientes'))
OR (r.nombre='Mesero' AND p.modulo IN ('ventas','mesas','clientes'))
ON CONFLICT DO NOTHING;
