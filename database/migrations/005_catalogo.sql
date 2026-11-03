-- Funcionalidad: catalogo. Aplicar con npm run migrate desde Backend.
CREATE TYPE public.tipo_movimiento_inventario AS ENUM (
    'entrada',
    'salida_venta',
    'salida_manual',
    'ajuste_positivo',
    'ajuste_negativo'
);

CREATE TYPE public.tipo_producto AS ENUM (
    'simple',
    'compuesto'
);

CREATE TYPE public.unidad_medida AS ENUM (
    'unidad',
    'gramos',
    'kilogramos',
    'mililitros',
    'litros',
    'onzas'
);

CREATE FUNCTION public.fn_actualizar_stock_producto() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE productos
    SET stock_actual = CASE
        WHEN NEW.tipo IN ('entrada', 'ajuste_positivo') THEN
            stock_actual + NEW.cantidad
        WHEN NEW.tipo IN ('salida_venta', 'salida_manual', 'ajuste_negativo') THEN
            stock_actual - NEW.cantidad
        ELSE stock_actual
    END
    WHERE id = NEW.producto_id;

    -- Actualizar stock_nuevo en el registro del movimiento para reflejar el valor real
    NEW.stock_anterior := (
        SELECT stock_actual FROM productos WHERE id = NEW.producto_id
    ) - CASE
        WHEN NEW.tipo IN ('entrada', 'ajuste_positivo') THEN NEW.cantidad
        WHEN NEW.tipo IN ('salida_venta', 'salida_manual', 'ajuste_negativo') THEN -NEW.cantidad
        ELSE 0
    END;
    NEW.stock_nuevo := (SELECT stock_actual FROM productos WHERE id = NEW.producto_id);

    RETURN NEW;
END;
$$;

CREATE TABLE public.categorias (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre character varying(80) NOT NULL,
    descripcion text,
    parent_id uuid,
    orden smallint DEFAULT 0 NOT NULL,
    color character varying(7),
    icono character varying(50),
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    enviar_cocina boolean DEFAULT true,
    CONSTRAINT chk_categoria_no_autoref CHECK ((id <> parent_id))
);

CREATE TABLE public.modificador_grupos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(100) NOT NULL,
    min_selecciones integer DEFAULT 0,
    max_selecciones integer DEFAULT 1,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.modificadores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grupo_id uuid,
    nombre character varying(100) NOT NULL,
    precio_extra numeric(10,2) DEFAULT 0.00,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.movimientos_inventario (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    producto_id uuid NOT NULL,
    tipo public.tipo_movimiento_inventario NOT NULL,
    cantidad numeric(12,3) NOT NULL,
    stock_anterior numeric(12,3) NOT NULL,
    stock_nuevo numeric(12,3) NOT NULL,
    costo_unitario numeric(12,2),
    referencia_id uuid,
    referencia_tipo character varying(50),
    notas text,
    usuario_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT movimientos_inventario_cantidad_check CHECK ((cantidad > (0)::numeric))
);

CREATE TABLE public.producto_modificadores (
    producto_id uuid NOT NULL,
    grupo_id uuid NOT NULL
);

CREATE TABLE public.productos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    codigo character varying(30),
    nombre character varying(150) NOT NULL,
    descripcion text,
    categoria_id uuid,
    tipo public.tipo_producto DEFAULT 'simple'::public.tipo_producto NOT NULL,
    precio_venta numeric(12,2) NOT NULL,
    costo numeric(12,2) DEFAULT 0,
    impuesto_pct numeric(5,2) DEFAULT 0 NOT NULL,
    imagen_url text,
    controla_stock boolean DEFAULT true NOT NULL,
    stock_actual numeric(12,3) DEFAULT 0 NOT NULL,
    stock_minimo numeric(12,3) DEFAULT 0 NOT NULL,
    unidad_medida public.unidad_medida DEFAULT 'unidad'::public.unidad_medida NOT NULL,
    orden smallint DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT productos_costo_check CHECK ((costo >= (0)::numeric)),
    CONSTRAINT productos_impuesto_pct_check CHECK (((impuesto_pct >= (0)::numeric) AND (impuesto_pct <= (100)::numeric))),
    CONSTRAINT productos_precio_venta_check CHECK ((precio_venta >= (0)::numeric))
);

CREATE TABLE public.receta_ingredientes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    producto_id uuid NOT NULL,
    ingrediente_id uuid NOT NULL,
    cantidad numeric(10,3) NOT NULL,
    unidad_medida public.unidad_medida DEFAULT 'gramos'::public.unidad_medida NOT NULL,
    notas text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_no_autoingrediente CHECK ((producto_id <> ingrediente_id)),
    CONSTRAINT receta_ingredientes_cantidad_check CHECK ((cantidad > (0)::numeric))
);

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.modificador_grupos
    ADD CONSTRAINT modificador_grupos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.modificadores
    ADD CONSTRAINT modificadores_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.producto_modificadores
    ADD CONSTRAINT producto_modificadores_pkey PRIMARY KEY (producto_id, grupo_id);

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_codigo_key UNIQUE (codigo);

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.receta_ingredientes
    ADD CONSTRAINT receta_ingredientes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.receta_ingredientes
    ADD CONSTRAINT uq_receta_ingrediente UNIQUE (producto_id, ingrediente_id);

CREATE INDEX idx_categorias_parent ON public.categorias USING btree (parent_id);

CREATE INDEX idx_modificadores_grupo ON public.modificadores USING btree (grupo_id);

CREATE INDEX idx_mov_inv_fecha ON public.movimientos_inventario USING btree (created_at);

CREATE INDEX idx_mov_inv_producto ON public.movimientos_inventario USING btree (producto_id);

CREATE INDEX idx_mov_inv_referencia ON public.movimientos_inventario USING btree (referencia_id, referencia_tipo) WHERE (referencia_id IS NOT NULL);

CREATE INDEX idx_mov_inv_tipo ON public.movimientos_inventario USING btree (tipo);

CREATE INDEX idx_producto_modificadores_prod ON public.producto_modificadores USING btree (producto_id);

CREATE INDEX idx_productos_activo ON public.productos USING btree (activo) WHERE (activo = true);

CREATE INDEX idx_productos_categoria ON public.productos USING btree (categoria_id);

CREATE INDEX idx_productos_stock_bajo ON public.productos USING btree (stock_actual) WHERE ((controla_stock = true) AND (activo = true));

CREATE INDEX idx_productos_tipo ON public.productos USING btree (tipo);

CREATE INDEX idx_receta_ingrediente ON public.receta_ingredientes USING btree (ingrediente_id);

CREATE INDEX idx_receta_producto ON public.receta_ingredientes USING btree (producto_id);

CREATE TRIGGER trg_categorias_updated_at BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_updated_at();

CREATE TRIGGER trg_movimiento_actualizar_stock BEFORE INSERT ON public.movimientos_inventario FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_stock_producto();

CREATE TRIGGER trg_productos_updated_at BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_updated_at();

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categorias(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.modificadores
    ADD CONSTRAINT modificadores_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.modificador_grupos(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.producto_modificadores
    ADD CONSTRAINT producto_modificadores_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.modificador_grupos(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.producto_modificadores
    ADD CONSTRAINT producto_modificadores_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.receta_ingredientes
    ADD CONSTRAINT receta_ingredientes_ingrediente_id_fkey FOREIGN KEY (ingrediente_id) REFERENCES public.productos(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.receta_ingredientes
    ADD CONSTRAINT receta_ingredientes_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;

INSERT INTO public.rol_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM public.roles r CROSS JOIN public.permisos p
WHERE r.nombre='Super Admin'
OR (r.nombre='Cajero' AND p.modulo IN ('ventas','caja','mesas','clientes'))
OR (r.nombre='Mesero' AND p.modulo IN ('ventas','mesas','clientes'))
ON CONFLICT DO NOTHING;
