-- Funcionalidad: operacion. Aplicar con npm run migrate desde Backend.
CREATE TYPE public.estado_cuenta AS ENUM (
    'abierta',
    'pagada',
    'cancelada'
);

CREATE TYPE public.estado_mesa AS ENUM (
    'disponible',
    'ocupada',
    'reservada',
    'mantenimiento'
);

CREATE TYPE public.metodo_pago AS ENUM (
    'efectivo',
    'tarjeta_debito',
    'tarjeta_credito',
    'nequi',
    'daviplata',
    'transferencia',
    'otro'
);

CREATE FUNCTION public.fn_actualizar_estado_mesa() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Al crear una cuenta con mesa, marcar mesa como ocupada
    IF TG_OP = 'INSERT' AND NEW.mesa_id IS NOT NULL AND NEW.estado = 'abierta' THEN
        UPDATE mesas SET estado = 'ocupada' WHERE id = NEW.mesa_id;
    END IF;

    -- Al pagar o cancelar, liberar la mesa
    IF TG_OP = 'UPDATE' AND NEW.mesa_id IS NOT NULL THEN
        IF NEW.estado IN ('pagada', 'cancelada') AND OLD.estado = 'abierta' THEN
            UPDATE mesas SET estado = 'disponible' WHERE id = NEW.mesa_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TABLE public.auditoria_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid,
    accion character varying(50) NOT NULL,
    tabla_afectada character varying(80) NOT NULL,
    registro_id text,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.cuenta_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cuenta_id uuid NOT NULL,
    producto_id uuid NOT NULL,
    cantidad numeric(10,2) NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    impuesto_pct numeric(5,2) DEFAULT 0 NOT NULL,
    descuento numeric(12,2) DEFAULT 0 NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    notas text,
    estado character varying(30) DEFAULT 'pendiente'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cuenta_items_cantidad_check CHECK ((cantidad > (0)::numeric)),
    CONSTRAINT cuenta_items_descuento_check CHECK ((descuento >= (0)::numeric)),
    CONSTRAINT cuenta_items_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'preparando'::character varying, 'listo'::character varying, 'entregado'::character varying, 'cancelado'::character varying])::text[]))),
    CONSTRAINT cuenta_items_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric))
);

CREATE TABLE public.cuenta_items_modificadores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cuenta_item_id uuid,
    modificador_id uuid,
    nombre_snapshot character varying(100) NOT NULL,
    precio_extra_snapshot numeric(10,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.cuentas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    numero integer NOT NULL,
    mesa_id integer,
    cliente_id integer DEFAULT 1 NOT NULL,
    mesero_id uuid,
    estado public.estado_cuenta DEFAULT 'abierta'::public.estado_cuenta NOT NULL,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    impuestos numeric(12,2) DEFAULT 0 NOT NULL,
    descuento numeric(12,2) DEFAULT 0 NOT NULL,
    descuento_pct numeric(5,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    propina numeric(12,2) DEFAULT 0 NOT NULL,
    numero_comensales smallint DEFAULT 1,
    notas text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    usuario_id uuid,
    CONSTRAINT cuentas_descuento_check CHECK ((descuento >= (0)::numeric)),
    CONSTRAINT cuentas_descuento_pct_check CHECK (((descuento_pct >= (0)::numeric) AND (descuento_pct <= (100)::numeric))),
    CONSTRAINT cuentas_numero_comensales_check CHECK ((numero_comensales > 0)),
    CONSTRAINT cuentas_propina_check CHECK ((propina >= (0)::numeric))
);

CREATE SEQUENCE public.cuentas_numero_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.cuentas_numero_seq OWNED BY public.cuentas.numero;

CREATE TABLE public.mesas (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    capacidad smallint DEFAULT 4 NOT NULL,
    ubicacion character varying(50),
    estado public.estado_mesa DEFAULT 'disponible'::public.estado_mesa NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mesas_capacidad_check CHECK ((capacidad > 0))
);

CREATE SEQUENCE public.mesas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.mesas_id_seq OWNED BY public.mesas.id;

CREATE TABLE public.pagos_venta (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    venta_id uuid NOT NULL,
    metodo_pago public.metodo_pago NOT NULL,
    monto numeric(12,2) NOT NULL,
    referencia character varying(100),
    notas text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pagos_venta_monto_check CHECK ((monto > (0)::numeric))
);

CREATE TABLE public.ventas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    numero_factura integer NOT NULL,
    cuenta_id uuid NOT NULL,
    cliente_id integer DEFAULT 1 NOT NULL,
    cajero_id uuid NOT NULL,
    turno_caja_id uuid NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    impuestos numeric(12,2) DEFAULT 0 NOT NULL,
    descuento numeric(12,2) DEFAULT 0 NOT NULL,
    propina numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) NOT NULL,
    total_pagado numeric(12,2) DEFAULT 0 NOT NULL,
    cambio numeric(12,2) DEFAULT 0 NOT NULL,
    anulada boolean DEFAULT false NOT NULL,
    motivo_anulacion text,
    notas text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_pago_suficiente CHECK ((total_pagado >= total))
);

CREATE SEQUENCE public.ventas_numero_factura_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.ventas_numero_factura_seq OWNED BY public.ventas.numero_factura;

CREATE VIEW public.vw_mesas_estado AS
 SELECT m.id,
    m.nombre,
    m.capacidad,
    m.ubicacion,
    m.estado,
    c.id AS cuenta_id,
    c.numero AS cuenta_numero,
    c.total AS cuenta_total,
    c.mesero_id,
    u.nombre_completo AS mesero_nombre,
    c.created_at AS cuenta_abierta_desde,
    c.numero_comensales
   FROM ((public.mesas m
     LEFT JOIN public.cuentas c ON (((m.id = c.mesa_id) AND (c.estado = 'abierta'::public.estado_cuenta))))
     LEFT JOIN public.usuarios u ON ((c.mesero_id = u.id)))
  WHERE (m.activo = true);

CREATE OR REPLACE VIEW public.vw_resumen_turno AS
 SELECT tc.id AS turno_id,
    tc.caja_id,
    ca.nombre AS caja_nombre,
    tc.usuario_id,
    u.nombre_completo AS cajero,
    tc.fecha_apertura,
    tc.fecha_cierre,
    tc.monto_apertura,
    tc.abierto,
    ( SELECT count(ventas.id) AS count
           FROM public.ventas
          WHERE ((ventas.turno_caja_id = tc.id) AND (ventas.anulada = false))) AS total_ventas,
    ( SELECT COALESCE(sum(ventas.total), (0)::numeric) AS "coalesce"
           FROM public.ventas
          WHERE ((ventas.turno_caja_id = tc.id) AND (ventas.anulada = false))) AS monto_total_ventas,
    ( SELECT COALESCE(sum(pv.monto), (0)::numeric) AS "coalesce"
           FROM (public.pagos_venta pv
             JOIN public.ventas v ON ((pv.venta_id = v.id)))
          WHERE ((v.turno_caja_id = tc.id) AND (v.anulada = false) AND (pv.metodo_pago = 'efectivo'::public.metodo_pago))) AS total_efectivo,
    ( SELECT COALESCE(sum(pv.monto), (0)::numeric) AS "coalesce"
           FROM (public.pagos_venta pv
             JOIN public.ventas v ON ((pv.venta_id = v.id)))
          WHERE ((v.turno_caja_id = tc.id) AND (v.anulada = false) AND (pv.metodo_pago <> 'efectivo'::public.metodo_pago))) AS total_electronico,
    ( SELECT COALESCE(sum(movimientos_caja.monto), (0)::numeric) AS "coalesce"
           FROM public.movimientos_caja
          WHERE ((movimientos_caja.turno_caja_id = tc.id) AND (movimientos_caja.tipo = 'ingreso'::public.tipo_movimiento_caja))) AS total_ingresos_extra,
    ( SELECT COALESCE(sum(movimientos_caja.monto), (0)::numeric) AS "coalesce"
           FROM public.movimientos_caja
          WHERE ((movimientos_caja.turno_caja_id = tc.id) AND (movimientos_caja.tipo = 'egreso'::public.tipo_movimiento_caja))) AS total_egresos
   FROM ((public.turnos_caja tc
     JOIN public.cajas ca ON ((tc.caja_id = ca.id)))
     JOIN public.usuarios u ON ((tc.usuario_id = u.id)));

ALTER TABLE ONLY public.cuentas ALTER COLUMN numero SET DEFAULT nextval('public.cuentas_numero_seq'::regclass);

ALTER TABLE ONLY public.mesas ALTER COLUMN id SET DEFAULT nextval('public.mesas_id_seq'::regclass);

ALTER TABLE ONLY public.ventas ALTER COLUMN numero_factura SET DEFAULT nextval('public.ventas_numero_factura_seq'::regclass);

ALTER TABLE ONLY public.auditoria_log
    ADD CONSTRAINT auditoria_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cuenta_items_modificadores
    ADD CONSTRAINT cuenta_items_modificadores_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cuenta_items
    ADD CONSTRAINT cuenta_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cuentas
    ADD CONSTRAINT cuentas_numero_key UNIQUE (numero);

ALTER TABLE ONLY public.cuentas
    ADD CONSTRAINT cuentas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_nombre_key UNIQUE (nombre);

ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pagos_venta
    ADD CONSTRAINT pagos_venta_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_numero_factura_key UNIQUE (numero_factura);

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_pkey PRIMARY KEY (id);

CREATE INDEX idx_audit_accion ON public.auditoria_log USING btree (accion);

CREATE INDEX idx_audit_fecha ON public.auditoria_log USING btree (created_at);

CREATE INDEX idx_audit_tabla ON public.auditoria_log USING btree (tabla_afectada);

CREATE INDEX idx_audit_usuario ON public.auditoria_log USING btree (usuario_id);

CREATE INDEX idx_cuenta_items_modificadores_item ON public.cuenta_items_modificadores USING btree (cuenta_item_id);

CREATE INDEX idx_cuentas_cliente ON public.cuentas USING btree (cliente_id);

CREATE INDEX idx_cuentas_estado ON public.cuentas USING btree (estado);

CREATE INDEX idx_cuentas_fecha ON public.cuentas USING btree (created_at);

CREATE INDEX idx_cuentas_mesa ON public.cuentas USING btree (mesa_id);

CREATE INDEX idx_cuentas_mesero ON public.cuentas USING btree (mesero_id);

CREATE INDEX idx_items_cuenta ON public.cuenta_items USING btree (cuenta_id);

CREATE INDEX idx_items_estado ON public.cuenta_items USING btree (estado);

CREATE INDEX idx_items_producto ON public.cuenta_items USING btree (producto_id);

CREATE INDEX idx_mesas_estado ON public.mesas USING btree (estado) WHERE (activo = true);

CREATE INDEX idx_pagos_metodo ON public.pagos_venta USING btree (metodo_pago);

CREATE INDEX idx_pagos_venta ON public.pagos_venta USING btree (venta_id);

CREATE INDEX idx_ventas_cajero ON public.ventas USING btree (cajero_id);

CREATE INDEX idx_ventas_cliente ON public.ventas USING btree (cliente_id);

CREATE INDEX idx_ventas_cuenta ON public.ventas USING btree (cuenta_id);

CREATE INDEX idx_ventas_fecha ON public.ventas USING btree (created_at);

CREATE INDEX idx_ventas_turno ON public.ventas USING btree (turno_caja_id);

CREATE UNIQUE INDEX uq_cuenta_abierta_por_mesa ON public.cuentas USING btree (mesa_id) WHERE ((estado = 'abierta'::public.estado_cuenta) AND (mesa_id IS NOT NULL));

CREATE TRIGGER trg_cuenta_estado_mesa AFTER INSERT OR UPDATE ON public.cuentas FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_estado_mesa();

CREATE TRIGGER trg_cuenta_items_updated_at BEFORE UPDATE ON public.cuenta_items FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_updated_at();

CREATE TRIGGER trg_cuentas_updated_at BEFORE UPDATE ON public.cuentas FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_updated_at();

CREATE TRIGGER trg_mesas_updated_at BEFORE UPDATE ON public.mesas FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_updated_at();

CREATE TRIGGER trg_ventas_updated_at BEFORE UPDATE ON public.ventas FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_updated_at();

ALTER TABLE ONLY public.auditoria_log
    ADD CONSTRAINT auditoria_log_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.cuenta_items
    ADD CONSTRAINT cuenta_items_cuenta_id_fkey FOREIGN KEY (cuenta_id) REFERENCES public.cuentas(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.cuenta_items_modificadores
    ADD CONSTRAINT cuenta_items_modificadores_cuenta_item_id_fkey FOREIGN KEY (cuenta_item_id) REFERENCES public.cuenta_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.cuenta_items_modificadores
    ADD CONSTRAINT cuenta_items_modificadores_modificador_id_fkey FOREIGN KEY (modificador_id) REFERENCES public.modificadores(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.cuenta_items
    ADD CONSTRAINT cuenta_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.cuentas
    ADD CONSTRAINT cuentas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.cuentas
    ADD CONSTRAINT cuentas_mesa_id_fkey FOREIGN KEY (mesa_id) REFERENCES public.mesas(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.cuentas
    ADD CONSTRAINT cuentas_mesero_id_fkey FOREIGN KEY (mesero_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.cuentas
    ADD CONSTRAINT cuentas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.pagos_venta
    ADD CONSTRAINT pagos_venta_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_cajero_id_fkey FOREIGN KEY (cajero_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_cuenta_id_fkey FOREIGN KEY (cuenta_id) REFERENCES public.cuentas(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_turno_caja_id_fkey FOREIGN KEY (turno_caja_id) REFERENCES public.turnos_caja(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

INSERT INTO public.permisos(codigo,modulo,descripcion) VALUES
('mesas:cambiar_estado','mesas','Permiso de operacion'),
('mesas:editar','mesas','Permiso de operacion'),
('mesas:ver','mesas','Permiso de operacion'),
('ventas:crear','ventas','Permiso de operacion'),
('ventas:editar','ventas','Permiso de operacion'),
('ventas:ver','ventas','Permiso de operacion')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO public.rol_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM public.roles r CROSS JOIN public.permisos p
WHERE r.nombre='Super Admin'
OR (r.nombre='Cajero' AND p.modulo IN ('ventas','caja','mesas','clientes'))
OR (r.nombre='Mesero' AND p.modulo IN ('ventas','mesas','clientes'))
ON CONFLICT DO NOTHING;
