-- ============================================
-- Script para configurar Supabase Storage
-- ============================================
-- Este script debe ejecutarse en el SQL Editor de Supabase
-- para crear el bucket de almacenamiento de PDFs

-- ============================================
-- 1. Crear bucket para PDFs de cotizaciones
-- ============================================
-- Nota: Si el bucket ya existe, este comando fallará silenciosamente
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'cotizaciones-pdf',
    'cotizaciones-pdf',
    true, -- Público para que n8n pueda acceder directamente
    52428800, -- 50 MB límite por archivo
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. Políticas de Storage para el bucket
-- ============================================

-- Política: Permitir subir archivos (INSERT)
CREATE POLICY "Permitir subir PDFs de cotizaciones"
ON storage.objects
FOR INSERT
TO authenticated, anon
WITH CHECK (
    bucket_id = 'cotizaciones-pdf' AND
    (storage.foldername(name))[1] = 'cotizaciones'
);

-- Política: Permitir lectura pública de PDFs (SELECT)
CREATE POLICY "Permitir lectura pública de PDFs"
ON storage.objects
FOR SELECT
TO public
USING (
    bucket_id = 'cotizaciones-pdf'
);

-- Política: Permitir actualización de PDFs (UPDATE)
CREATE POLICY "Permitir actualizar PDFs de cotizaciones"
ON storage.objects
FOR UPDATE
TO authenticated, anon
USING (
    bucket_id = 'cotizaciones-pdf' AND
    (storage.foldername(name))[1] = 'cotizaciones'
);

-- Política: Permitir eliminación de PDFs (DELETE)
CREATE POLICY "Permitir eliminar PDFs de cotizaciones"
ON storage.objects
FOR DELETE
TO authenticated, anon
USING (
    bucket_id = 'cotizaciones-pdf' AND
    (storage.foldername(name))[1] = 'cotizaciones'
);

-- ============================================
-- Notas importantes:
-- ============================================
-- 1. El bucket 'cotizaciones-pdf' es público para facilitar
--    el acceso desde n8n sin autenticación
--
-- 2. Los archivos se almacenarán en la ruta:
--    cotizaciones/{uuid}.pdf
--
-- 3. Si necesitas más seguridad, puedes hacer el bucket privado
--    y usar signed URLs con expiración
--
-- 4. Para ejecutar este script:
--    - Ve a tu proyecto en Supabase
--    - Abre el SQL Editor
--    - Pega y ejecuta este script

