-- Funcionalidad: clientes. Aplicar con npm run migrate desde Backend.
CREATE TABLE public.clientes (
    id integer NOT NULL,
    cedula_nit character varying(20),
    nombre character varying(150) NOT NULL,
    telefono character varying(20),
    email character varying(100),
    direccion text,
    notas text,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_cedula_nit_key UNIQUE (cedula_nit);

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);

CREATE INDEX idx_clientes_cedula ON public.clientes USING btree (cedula_nit) WHERE (cedula_nit IS NOT NULL);

CREATE INDEX idx_clientes_nombre ON public.clientes USING btree (nombre);

CREATE INDEX idx_clientes_telefono ON public.clientes USING btree (telefono) WHERE (telefono IS NOT NULL);

CREATE TRIGGER trg_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_updated_at();
INSERT INTO public.clientes(id,nombre) VALUES (1,'Consumidor Final');
SELECT pg_catalog.setval(pg_get_serial_sequence('public.clientes','id'),1,true);

INSERT INTO public.permisos(codigo,modulo,descripcion) VALUES
('clientes:crear','clientes','Permiso de clientes'),
('clientes:ver','clientes','Permiso de clientes')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO public.rol_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM public.roles r CROSS JOIN public.permisos p
WHERE r.nombre='Super Admin'
OR (r.nombre='Cajero' AND p.modulo IN ('ventas','caja','mesas','clientes'))
OR (r.nombre='Mesero' AND p.modulo IN ('ventas','mesas','clientes'))
ON CONFLICT DO NOTHING;
