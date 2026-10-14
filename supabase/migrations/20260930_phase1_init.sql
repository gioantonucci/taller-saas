-- ==============================================================================
-- FASE 1: Esquema de Base de Datos PostgreSQL / Supabase
-- SaaS para Talleres Mecánicos Automotores
-- ==============================================================================

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tipos Enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'RECEPTION', 'MECHANIC');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'record_status') THEN
        CREATE TYPE record_status AS ENUM ('ACTIVE', 'INACTIVE');
    END IF;
END $$;

-- 3. Tabla: Tenant_Settings (Configuración del Taller)
CREATE TABLE IF NOT EXISTS tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_nombre VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(50) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabla: Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenant_settings(id) ON DELETE SET NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'RECEPTION',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    failed_attempts INT NOT NULL DEFAULT 0,
    lockout_until TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabla: Clients (con Soft Delete: is_deleted y status)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenant_settings(id) ON DELETE SET NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    dni VARCHAR(20) UNIQUE NOT NULL,
    direccion TEXT,
    telefono VARCHAR(50),
    email VARCHAR(255),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tabla: Vehicles (con Soft Delete: is_deleted y status, relacionado a Clients)
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenant_settings(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    marca VARCHAR(100) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    anio INT NOT NULL,
    patente VARCHAR(20) UNIQUE NOT NULL,
    nro_chasis VARCHAR(50),
    nro_motor VARCHAR(50),
    color VARCHAR(50),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Tabla: Audit_Logs (UserID, Accion, Entidad, Valores, Timestamp)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    accion VARCHAR(50) NOT NULL,           -- CREATE, UPDATE, SOFT_DELETE, LOGIN, LOGOUT
    entidad VARCHAR(50) NOT NULL,          -- Users, TenantSettings, Clients, Vehicles, Auth
    entidad_afectada VARCHAR(50),          -- Compatibilidad
    entidad_id VARCHAR(100),
    valores JSONB,                         -- Valores nuevos o modificados
    detalles_cambio JSONB,                 -- Detalles completos del diff
    ip_address VARCHAR(45),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Índices de Alto Rendimiento y Filtro Soft-Delete
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_clients_dni ON clients(dni);
CREATE INDEX IF NOT EXISTS idx_clients_is_deleted ON clients(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_vehicles_patente ON vehicles(patente);
CREATE INDEX IF NOT EXISTS idx_vehicles_client_id ON vehicles(client_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_deleted ON vehicles(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entidad ON audit_logs(entidad);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- 9. Trigger para actualización automática de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenant_settings_updated_at ON tenant_settings;
CREATE TRIGGER trg_tenant_settings_updated_at BEFORE UPDATE ON tenant_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON vehicles;
CREATE TRIGGER trg_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Configuración del Bucket de Supabase Storage para fotos de vehículos
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-photos', 'vehicle-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 11. Datos Iniciales (Seed Data)
INSERT INTO tenant_settings (id, taller_nombre, whatsapp, logo_url)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Taller Mecánico Central Pro',
    '+54 9 11 4567-8900',
    '/logo.png'
) ON CONFLICT (id) DO NOTHING;

-- Usuarios de Prueba con contraseñas Hasheadas con Bcrypt:
-- admin@taller.com / admin123
-- recepcion@taller.com / recepcion123
-- mecanico@taller.com / mecanico123
INSERT INTO users (id, tenant_id, nombre, apellido, email, password_hash, role, status)
VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Carlos',
    'Rossi',
    'admin@taller.com',
    '$2a$10$tZ2cKsk3VqXw9Yn2H9N9.e7jJ4xK8W.xJ31l3k0hP0.W4L2o0E5Gy', -- bcrypt hash de 'admin123'
    'ADMIN',
    'ACTIVE'
),
(
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'María',
    'Gómez',
    'recepcion@taller.com',
    '$2a$10$7zD4QYyKqz4E.kZq7vH6y.vK4g3wL7aG4yT6nB0oM9pL5kR2sE8Uy', -- bcrypt hash de 'recepcion123'
    'RECEPTION',
    'ACTIVE'
),
(
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Lucas',
    'Benítez',
    'mecanico@taller.com',
    '$2a$10$O0FqH1iY6bWvA4cZ9sN8U.qN7tF3wK9hB8jR4lP0eA3oI7yU2pDGy', -- bcrypt hash de 'mecanico123'
    'MECHANIC',
    'ACTIVE'
) ON CONFLICT (email) DO NOTHING;
