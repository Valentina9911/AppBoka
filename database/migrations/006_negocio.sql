-- Funcionalidad: negocio. Aplicar con npm run migrate desde Backend.
CREATE TABLE public.configuracion (
    clave character varying(100) NOT NULL,
    valor text NOT NULL,
    descripcion text,
    tipo character varying(20) DEFAULT 'string'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT configuracion_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['string'::character varying, 'number'::character varying, 'boolean'::character varying, 'json'::character varying])::text[])))
);

ALTER TABLE ONLY public.configuracion
    ADD CONSTRAINT configuracion_pkey PRIMARY KEY (clave);
INSERT INTO public.configuracion(clave,valor,tipo,descripcion) VALUES
('negocio_nombre','BOKA Demo','string','Nombre ficticio'),('negocio_nit','DEMO','string','Identificador ficticio'),
('negocio_direccion','Zona de pruebas','string','Direccion ficticia'),('negocio_telefono','No aplica','string','Telefono ficticio'),
('moneda_simbolo','$','string','Simbolo'),('moneda_codigo','COP','string','Moneda'),
('impuesto_default_pct','0','number','Impuesto'),('propina_sugerida_pct','10','number','Propina'),('session_timeout_minutes','60','number','Sesion');
INSERT INTO public.permisos(codigo,modulo,descripcion) VALUES
('configuracion:editar','configuracion','Permiso de negocio')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO public.rol_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM public.roles r CROSS JOIN public.permisos p
WHERE r.nombre='Super Admin'
OR (r.nombre='Cajero' AND p.modulo IN ('ventas','caja','mesas','clientes'))
OR (r.nombre='Mesero' AND p.modulo IN ('ventas','mesas','clientes'))
ON CONFLICT DO NOTHING;
