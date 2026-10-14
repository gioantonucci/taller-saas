-- Migration: Fase 5 - Módulo Financiero, Transacciones, Caja Diaria y Cuentas Corrientes
-- PostgreSQL / Supabase Schema

-- 1. Tabla de Órdenes de Trabajo (Work Orders)
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_orden SERIAL UNIQUE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    mechanic_id UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
    fecha_ingreso TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    fecha_estimada TIMESTAMPTZ(6),
    fecha_entrega TIMESTAMPTZ(6),
    nivel_nafta VARCHAR(20) NOT NULL DEFAULT '1/2',
    kilometraje INTEGER,
    detalles_ingreso TEXT NOT NULL,
    checklist_danio TEXT,
    costo_mano_de_obra NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_presupuesto NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 2. Tabla de Repuestos e Insumos (Parts con OCR & Markup)
CREATE TABLE IF NOT EXISTS parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    nombre_repuesto VARCHAR(255) NOT NULL,
    codigo VARCHAR(100),
    cantidad INTEGER NOT NULL DEFAULT 1,
    costo NUMERIC(12, 2) NOT NULL,
    precio_venta NUMERIC(12, 2) NOT NULL,
    archivo_factura_url TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 3. Tabla de Multimedia de Órdenes (Object Storage URLs, jamás Base64)
CREATE TABLE IF NOT EXISTS work_order_multimedia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL DEFAULT 'FOTO',
    url_storage TEXT NOT NULL,
    descripcion TEXT,
    etiqueta VARCHAR(50) DEFAULT 'INGRESO',
    fecha_carga TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 4. Tabla de Cómputo de Horas (WorkLogs)
CREATE TABLE IF NOT EXISTS work_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    mechanic_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    horas_invertidas NUMERIC(5, 2) NOT NULL,
    descripcion_tarea TEXT NOT NULL,
    fecha_registro TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 5. Tabla de Transacciones Financieras (Caja Diaria & Cuentas Corrientes)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monto NUMERIC(12, 2) NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- 'INGRESO', 'EGRESO'
    concepto VARCHAR(255) NOT NULL,
    categoria VARCHAR(50), -- 'COBRO_ORDEN', 'SENIA', 'PAGO_PROVEEDOR', 'GASTO_OPERATIVO', 'RETIRO', 'OTRO'
    metodo_pago VARCHAR(50) NOT NULL DEFAULT 'EFECTIVO', -- 'EFECTIVO', 'TRANSFERENCIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'MERCADOPAGO'
    cliente_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    fecha TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    comprobante_nro VARCHAR(100),
    observaciones TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Índices de alto rendimiento para búsqueda y reportes
CREATE INDEX IF NOT EXISTS idx_transactions_fecha ON transactions(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_tipo ON transactions(tipo);
CREATE INDEX IF NOT EXISTS idx_transactions_cliente_id ON transactions(cliente_id);
CREATE INDEX IF NOT EXISTS idx_transactions_work_order_id ON transactions(work_order_id);
CREATE INDEX IF NOT EXISTS idx_parts_work_order_id ON parts(work_order_id);
