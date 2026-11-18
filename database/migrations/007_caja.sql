-- Funcionalidad: caja. Aplicar con npm run migrate desde Backend.
CREATE TYPE public.tipo_movimiento_caja AS ENUM (
    'ingreso',
    'egreso'
);

CREATE TABLE public.cajas (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    ubicacion character varying(100),
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.cajas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.cajas_id_seq OWNED BY public.cajas.id;

CREATE TABLE public.movimientos_caja (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    turno_caja_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    tipo public.tipo_movimiento_caja NOT NULL,
    monto numeric(12,2) NOT NULL,
    descripcion text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT movimientos_caja_monto_check CHECK ((monto > (0)::numeric))
);

CREATE TABLE public.turnos_caja (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    caja_id integer NOT NULL,
    usuario_id uuid NOT NULL,
    fecha_apertura timestamp with time zone DEFAULT now() NOT NULL,
    fecha_cierre timestamp with time zone,
    monto_apertura numeric(12,2) DEFAULT 0 NOT NULL,
    monto_cierre_sistema numeric(12,2),
    monto_cierre_real numeric(12,2),
    diferencia numeric(12,2) GENERATED ALWAYS AS ((COALESCE(monto_cierre_real, (0)::numeric) - COALESCE(monto_cierre_sistema, (0)::numeric))) STORED,
    notas_apertura text,
    notas_cierre text,
    abierto boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT turnos_caja_monto_apertura_check CHECK ((monto_apertura >= (0)::numeric))
);

ALTER TABLE ONLY public.cajas ALTER COLUMN id SET DEFAULT nextval('public.cajas_id_seq'::regclass);

ALTER TABLE ONLY public.cajas
    ADD CONSTRAINT cajas_nombre_key UNIQUE (nombre);

ALTER TABLE ONLY public.cajas
    ADD CONSTRAINT cajas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.movimientos_caja
    ADD CONSTRAINT movimientos_caja_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.turnos_caja
    ADD CONSTRAINT turnos_caja_pkey PRIMARY KEY (id);

CREATE INDEX idx_turnos_fecha ON public.turnos_caja USING btree (fecha_apertura);

CREATE INDEX idx_turnos_usuario ON public.turnos_caja USING btree (usuario_id);

CREATE UNIQUE INDEX uq_turno_abierto_por_caja ON public.turnos_caja USING btree (caja_id) WHERE (abierto = true);

CREATE TRIGGER trg_cajas_updated_at BEFORE UPDATE ON public.cajas FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_updated_at();

CREATE TRIGGER trg_turnos_caja_updated_at BEFORE UPDATE ON public.turnos_caja FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_updated_at();

ALTER TABLE ONLY public.movimientos_caja
    ADD CONSTRAINT movimientos_caja_turno_caja_id_fkey FOREIGN KEY (turno_caja_id) REFERENCES public.turnos_caja(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.movimientos_caja
    ADD CONSTRAINT movimientos_caja_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.turnos_caja
    ADD CONSTRAINT turnos_caja_caja_id_fkey FOREIGN KEY (caja_id) REFERENCES public.cajas(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.turnos_caja
    ADD CONSTRAINT turnos_caja_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;
INSERT INTO public.cajas(id,nombre,ubicacion) VALUES (1,'Caja de demostracion','Zona de pruebas');
SELECT pg_catalog.setval(pg_get_serial_sequence('public.cajas','id'),1,true);
CREATE VIEW public.vw_resumen_turno AS
SELECT tc.id AS turno_id,tc.caja_id,ca.nombre AS caja_nombre,tc.usuario_id,u.nombre_completo AS cajero,
tc.fecha_apertura,tc.fecha_cierre,tc.monto_apertura,tc.abierto,
0::bigint AS total_ventas,0::numeric AS monto_total_ventas,0::numeric AS total_efectivo,0::numeric AS total_electronico,
(SELECT COALESCE(sum(m.monto),0::numeric) FROM public.movimientos_caja m WHERE m.turno_caja_id=tc.id AND m.tipo='ingreso') AS total_ingresos_extra,
(SELECT COALESCE(sum(m.monto),0::numeric) FROM public.movimientos_caja m WHERE m.turno_caja_id=tc.id AND m.tipo='egreso') AS total_egresos
FROM public.turnos_caja tc JOIN public.cajas ca ON tc.caja_id=ca.id JOIN public.usuarios u ON tc.usuario_id=u.id;
INSERT INTO public.permisos(codigo,modulo,descripcion) VALUES
('caja:abrir_turno','caja','Permiso de caja'),
('caja:cerrar_turno','caja','Permiso de caja')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO public.rol_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM public.roles r CROSS JOIN public.permisos p
WHERE r.nombre='Super Admin'
OR (r.nombre='Cajero' AND p.modulo IN ('ventas','caja','mesas','clientes'))
OR (r.nombre='Mesero' AND p.modulo IN ('ventas','mesas','clientes'))
ON CONFLICT DO NOTHING;
