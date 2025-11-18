-- ============================================
-- Script SQL para Supabase - Pool Smart
-- ============================================
-- Este script crea las tablas necesarias para almacenar
-- cotizaciones y referencias a PDFs en Supabase Storage

-- ============================================
-- 1. Tabla de Cotizaciones
-- ============================================
CREATE TABLE IF NOT EXISTS public.cotizaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Información del cliente
    cliente_nombre VARCHAR(255) NOT NULL,
    cliente_email VARCHAR(255) NOT NULL,
    cliente_telefono VARCHAR(50),
    
    -- Información de la piscina
    tipo_piscina VARCHAR(50) NOT NULL, -- rectangular, circular, oval
    largo DECIMAL(10, 2),
    ancho DECIMAL(10, 2),
    profundidad DECIMAL(10, 2),
    volumen_m3 DECIMAL(10, 2),
    area_ceramica_m2 DECIMAL(10, 2),
    area_piso_termico_m2 DECIMAL(10, 2),
    
    -- Tipo de trabajo
    tipo_trabajo VARCHAR(50) NOT NULL, -- construction, repair, renovation, maintenance
    
    -- Costos calculados
    subtotal DECIMAL(12, 2) NOT NULL,
    descuento DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'USD',
    
    -- Referencia al PDF en Storage
    pdf_path TEXT, -- Ruta del archivo en Supabase Storage
    pdf_url TEXT, -- URL pública del PDF
    pdf_filename VARCHAR(255), -- Nombre del archivo PDF
    
    -- Información adicional
    notas TEXT,
    estado VARCHAR(50) DEFAULT 'pendiente', -- pendiente, enviado, completado
    
    -- Datos completos en JSON (para referencia)
    datos_completos JSONB
);

-- ============================================
-- 2. Tabla de Detalles de Materiales
-- ============================================
CREATE TABLE IF NOT EXISTS public.cotizacion_materiales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cotizacion_id UUID NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    cantidad DECIMAL(10, 2) NOT NULL,
    unidad VARCHAR(50) NOT NULL,
    precio_unitario DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 3. Tabla de Detalles de Trabajo
-- ============================================
CREATE TABLE IF NOT EXISTS public.cotizacion_trabajos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cotizacion_id UUID NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    cantidad DECIMAL(10, 2) NOT NULL,
    unidad VARCHAR(50) NOT NULL,
    precio_unitario DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 4. Tabla de Costos Adicionales
-- ============================================
CREATE TABLE IF NOT EXISTS public.cotizacion_costos_adicionales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cotizacion_id UUID NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    cantidad DECIMAL(10, 2) NOT NULL,
    unidad VARCHAR(50) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 5. Índices para mejorar el rendimiento
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente_email ON public.cotizaciones(cliente_email);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_created_at ON public.cotizaciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON public.cotizaciones(estado);
CREATE INDEX IF NOT EXISTS idx_cotizacion_materiales_cotizacion_id ON public.cotizacion_materiales(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_cotizacion_trabajos_cotizacion_id ON public.cotizacion_trabajos(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_cotizacion_costos_adicionales_cotizacion_id ON public.cotizacion_costos_adicionales(cotizacion_id);

-- ============================================
-- 6. Función para actualizar updated_at automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en cotizaciones
DROP TRIGGER IF EXISTS update_cotizaciones_updated_at ON public.cotizaciones;
CREATE TRIGGER update_cotizaciones_updated_at
    BEFORE UPDATE ON public.cotizaciones
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 7. Políticas RLS (Row Level Security)
-- ============================================
-- Habilitar RLS en todas las tablas
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizacion_materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizacion_trabajos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizacion_costos_adicionales ENABLE ROW LEVEL SECURITY;

-- Política: Permitir inserción desde la aplicación (usando service_role key)
-- Nota: En producción, deberías crear políticas más restrictivas
CREATE POLICY "Permitir inserción de cotizaciones"
    ON public.cotizaciones
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir lectura de cotizaciones"
    ON public.cotizaciones
    FOR SELECT
    USING (true);

CREATE POLICY "Permitir inserción de materiales"
    ON public.cotizacion_materiales
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir lectura de materiales"
    ON public.cotizacion_materiales
    FOR SELECT
    USING (true);

CREATE POLICY "Permitir inserción de trabajos"
    ON public.cotizacion_trabajos
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir lectura de trabajos"
    ON public.cotizacion_trabajos
    FOR SELECT
    USING (true);

CREATE POLICY "Permitir inserción de costos adicionales"
    ON public.cotizacion_costos_adicionales
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir lectura de costos adicionales"
    ON public.cotizacion_costos_adicionales
    FOR SELECT
    USING (true);

-- ============================================
-- 8. Comentarios en las tablas
-- ============================================
COMMENT ON TABLE public.cotizaciones IS 'Tabla principal para almacenar cotizaciones de piscinas';
COMMENT ON TABLE public.cotizacion_materiales IS 'Detalles de materiales de cada cotización';
COMMENT ON TABLE public.cotizacion_trabajos IS 'Detalles de trabajos/mano de obra de cada cotización';
COMMENT ON TABLE public.cotizacion_costos_adicionales IS 'Costos adicionales de cada cotización';

COMMENT ON COLUMN public.cotizaciones.pdf_path IS 'Ruta del archivo PDF en Supabase Storage (ej: cotizaciones/uuid.pdf)';
COMMENT ON COLUMN public.cotizaciones.pdf_url IS 'URL pública del PDF para acceso directo';
COMMENT ON COLUMN public.cotizaciones.datos_completos IS 'JSON con todos los datos de la cotización para referencia';

