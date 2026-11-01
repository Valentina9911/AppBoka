-- Funcionalidad: acceso. Aplicar con npm run migrate desde Backend.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

CREATE FUNCTION public.fn_actualizar_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TABLE public.permisos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    codigo character varying(100) NOT NULL,
    modulo character varying(50) NOT NULL,
    descripcion text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_codigo_formato CHECK (((codigo)::text ~ '^[a-z_]+:[a-z_]+$'::text))
);

CREATE TABLE public.rol_permisos (
    rol_id uuid NOT NULL,
    permiso_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    es_sistema boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.sesiones_usuario (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    token text NOT NULL,
    ip_address inet,
    user_agent text,
    fecha_inicio timestamp with time zone DEFAULT now() NOT NULL,
    fecha_expiracion timestamp with time zone NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.usuario_roles (
    usuario_id uuid NOT NULL,
    rol_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.usuarios (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100),
    password_hash text NOT NULL,
    nombre_completo character varying(150) NOT NULL,
    telefono character varying(20),
    pin_rapido character varying(10),
    activo boolean DEFAULT true NOT NULL,
    ultimo_acceso timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE VIEW public.vw_permisos_usuario AS
 SELECT DISTINCT u.id AS usuario_id,
    u.username,
    p.codigo AS permiso_codigo,
    p.modulo AS permiso_modulo,
    r.nombre AS rol_nombre
   FROM ((((public.usuarios u
     JOIN public.usuario_roles ur ON ((u.id = ur.usuario_id)))
     JOIN public.roles r ON (((ur.rol_id = r.id) AND (r.activo = true))))
     JOIN public.rol_permisos rp ON ((r.id = rp.rol_id)))
     JOIN public.permisos p ON ((rp.permiso_id = p.id)))
  WHERE (u.activo = true);

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_codigo_key UNIQUE (codigo);

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.rol_permisos
    ADD CONSTRAINT rol_permisos_pkey PRIMARY KEY (rol_id, permiso_id);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sesiones_usuario
    ADD CONSTRAINT sesiones_usuario_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sesiones_usuario
    ADD CONSTRAINT sesiones_usuario_token_key UNIQUE (token);

ALTER TABLE ONLY public.usuario_roles
    ADD CONSTRAINT usuario_roles_pkey PRIMARY KEY (usuario_id, rol_id);

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_username_key UNIQUE (username);

CREATE INDEX idx_permisos_modulo ON public.permisos USING btree (modulo);

CREATE INDEX idx_sesiones_token ON public.sesiones_usuario USING btree (token) WHERE (activa = true);

CREATE INDEX idx_sesiones_usuario ON public.sesiones_usuario USING btree (usuario_id) WHERE (activa = true);

CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_updated_at();

CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_updated_at();

ALTER TABLE ONLY public.rol_permisos
    ADD CONSTRAINT rol_permisos_permiso_id_fkey FOREIGN KEY (permiso_id) REFERENCES public.permisos(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.rol_permisos
    ADD CONSTRAINT rol_permisos_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sesiones_usuario
    ADD CONSTRAINT sesiones_usuario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.usuario_roles
    ADD CONSTRAINT usuario_roles_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.usuario_roles
    ADD CONSTRAINT usuario_roles_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;
INSERT INTO public.roles(nombre,descripcion,es_sistema) VALUES ('Super Admin','Administrador de demostracion',true);
INSERT INTO public.usuarios(username,password_hash,nombre_completo)
VALUES ('admin_demo',public.crypt('DemoBoka_2026!',public.gen_salt('bf',12)),'Administrador de demostracion');
INSERT INTO public.usuario_roles(usuario_id,rol_id)
SELECT u.id,r.id FROM public.usuarios u CROSS JOIN public.roles r WHERE u.username='admin_demo' AND r.nombre='Super Admin';
INSERT INTO public.permisos(codigo,modulo,descripcion) VALUES
('usuarios:crear','usuarios','Permiso de acceso')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO public.rol_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM public.roles r CROSS JOIN public.permisos p
WHERE r.nombre='Super Admin'
OR (r.nombre='Cajero' AND p.modulo IN ('ventas','caja','mesas','clientes'))
OR (r.nombre='Mesero' AND p.modulo IN ('ventas','mesas','clientes'))
ON CONFLICT DO NOTHING;
