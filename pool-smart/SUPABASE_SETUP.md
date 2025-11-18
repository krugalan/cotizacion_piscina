# Configuración de Supabase para Pool Smart

Esta guía te ayudará a configurar Supabase para almacenar las cotizaciones y los PDFs.

## 📋 Pasos de Configuración

### 1. Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta (gratis)
2. Crea un nuevo proyecto
3. Espera a que el proyecto se inicialice (puede tardar 1-2 minutos)

### 2. Ejecutar Scripts SQL

#### 2.1. Crear las Tablas

1. En el dashboard de Supabase, ve a **SQL Editor**
2. Crea una nueva consulta
3. Copia y pega el contenido de `supabase/schema.sql`
4. Ejecuta el script (botón "Run" o `Ctrl+Enter`)

Este script creará:
- Tabla `cotizaciones` (tabla principal)
- Tabla `cotizacion_materiales` (detalles de materiales)
- Tabla `cotizacion_trabajos` (detalles de trabajos)
- Tabla `cotizacion_costos_adicionales` (costos adicionales)
- Índices para mejorar el rendimiento
- Políticas RLS (Row Level Security)

#### 2.2. Configurar Storage

1. En el **SQL Editor**, crea otra nueva consulta
2. Copia y pega el contenido de `supabase/storage-setup.sql`
3. Ejecuta el script

Este script creará:
- Bucket `cotizaciones-pdf` para almacenar los PDFs
- Políticas de acceso para el bucket

**Nota:** También puedes crear el bucket manualmente desde **Storage** en el dashboard:
- Nombre: `cotizaciones-pdf`
- Público: ✅ (marcado)
- Límite de tamaño: 50 MB
- Tipos MIME permitidos: `application/pdf`

### 3. Obtener Credenciales de API

1. En el dashboard de Supabase, ve a **Settings** → **API**
2. Copia los siguientes valores:
   - **Project URL** (ej: `https://xxxxx.supabase.co`)
   - **anon public** key (clave pública anónima)

### 4. Configurar Variables de Entorno

1. Copia el archivo `env.example` a `.env` en la raíz del proyecto:
   ```bash
   cp env.example .env
   ```

2. Edita el archivo `.env` y completa las variables:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
   VITE_N8N_WEBHOOK_URL=https://devn8n.zetti.xyz/webhook-test/cotizacion
   VITE_SUPABASE_STORAGE_BUCKET=cotizaciones-pdf
   ```

### 5. Instalar Dependencias

```bash
npm install
```

O si usas yarn:
```bash
yarn install
```

## 🔧 Verificación

Para verificar que todo está configurado correctamente:

1. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Abre la aplicación en el navegador
3. Completa un formulario de cotización
4. Genera y envía una cotización
5. Verifica en Supabase:
   - **Table Editor** → `cotizaciones`: Deberías ver la nueva cotización
   - **Storage** → `cotizaciones-pdf`: Deberías ver el PDF subido

## 📊 Estructura de Datos

### Tabla `cotizaciones`
- Información del cliente (nombre, email, teléfono)
- Dimensiones de la piscina
- Costos calculados (subtotal, descuento, total)
- Referencias al PDF (path, URL, filename)
- Estado de la cotización
- Datos completos en JSON

### Tablas Relacionadas
- `cotizacion_materiales`: Detalles de materiales
- `cotizacion_trabajos`: Detalles de trabajos/mano de obra
- `cotizacion_costos_adicionales`: Costos adicionales

## 🔐 Seguridad

Las políticas RLS (Row Level Security) están configuradas para:
- Permitir inserción de cotizaciones desde la aplicación
- Permitir lectura de cotizaciones
- El bucket de Storage es público para facilitar el acceso desde n8n

**Nota:** En producción, considera hacer el bucket privado y usar signed URLs con expiración para mayor seguridad.

## 🐛 Solución de Problemas

### Error: "Variables de entorno de Supabase no configuradas"
- Verifica que el archivo `.env` existe y tiene las variables correctas
- Reinicia el servidor de desarrollo después de crear/modificar `.env`

### Error: "Bucket not found"
- Verifica que ejecutaste el script `storage-setup.sql`
- O crea el bucket manualmente desde el dashboard de Supabase

### Error: "Permission denied"
- Verifica que las políticas RLS están configuradas correctamente
- Revisa que el bucket tiene las políticas de acceso adecuadas

### Error: "Failed to upload PDF"
- Verifica que el bucket existe y es público
- Revisa el tamaño del PDF (límite: 50 MB)
- Verifica que el tipo MIME es `application/pdf`

## 📝 Notas Adicionales

- Los PDFs se almacenan en la ruta: `cotizaciones/{nombre_cliente}_{fecha}.pdf`
- Las cotizaciones se guardan con estado `pendiente` por defecto
- El campo `datos_completos` contiene todos los datos en formato JSON para referencia

