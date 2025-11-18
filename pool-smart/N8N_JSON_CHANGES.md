# Cambios en el JSON de n8n

## 📋 Resumen de Cambios

### ❌ Eliminado
- **Nodo "Convert to File"**: Ya no es necesario convertir base64 a archivo, ahora descargamos el PDF directamente desde Supabase

### ✅ Agregado
- **Nodo "Download PDF from Supabase"**: Nuevo nodo HTTP Request que descarga el PDF desde la URL de Supabase

### 🔄 Modificado
- **Nodo "Edit Fields"**: Ahora extrae `pdfUrl` y `pdfFilename` en lugar de `presupuesto` (base64)
- **Nodo "Send a message"**: Actualizado el asunto y mensaje del email para incluir información del cliente

## 🔍 Cambios Detallados

### 1. Nodo "Edit Fields" - Campos Actualizados

**Antes:**
```json
{
  "nombreCliente": "={{ $json.body.nombreCompleto }}",
  "presupuesto": "={{ $json.body.presupuesto }}",  // ❌ Base64
  "cotizacion": "="  // ❌ Vacío
}
```

**Ahora:**
```json
{
  "nombreCliente": "={{ $json.body.nombreCompleto }}",
  "email": "={{ $json.body.email }}",
  "telefono": "={{ $json.body.telefono }}",
  "pdfUrl": "={{ $json.body.pdfUrl }}",  // ✅ URL del PDF
  "pdfFilename": "={{ $json.body.pdfFilename }}",  // ✅ Nombre del archivo
  "tipoTrabajo": "={{ $json.body.tipoTrabajo }}",
  "presupuesto": "={{ $json.body.presupuesto }}"  // ✅ Objeto con total, subtotal, etc.
}
```

### 2. Nuevo Nodo "Download PDF from Supabase"

**Tipo:** `n8n-nodes-base.httpRequest`

**Configuración:**
- **Method**: `GET`
- **URL**: `={{ $json.pdfUrl }}`
- **Response Format**: `File`
- **Output Property Name**: `cotizacion`

Este nodo descarga el PDF desde Supabase Storage y lo guarda como archivo binario en la propiedad `cotizacion`.

### 3. Nodo "Send a message" - Email Mejorado

**Asunto actualizado:**
```
Presupuesto de Piscina - {{ $json.nombreCliente }}
```

**Mensaje actualizado:**
```
Hola,

Te enviamos el presupuesto del cliente {{ $json.nombreCliente }}.

Tipo de trabajo: {{ $json.tipoTrabajo }}
Total: ${{ $json.presupuesto.total }} USD

El PDF se adjunta a este correo.

Saludos,
Pool Smart
```

## 📊 Flujo del Workflow

```
┌─────────┐      ┌──────────────┐      ┌──────────────────────────┐      ┌──────────────┐
│ Webhook │ ───> │ Edit Fields  │ ───> │ Download PDF from        │ ───> │ Send message │
│         │      │              │      │ Supabase                 │      │ (Gmail)      │
└─────────┘      └──────────────┘      └──────────────────────────┘      └──────────────┘
   Recibe          Extrae campos         Descarga PDF desde URL           Envía email
   datos JSON      (incluyendo pdfUrl)   y lo guarda como binario         con PDF adjunto
```

## 📥 Estructura de Datos Recibidos

El webhook ahora recibe un JSON con esta estructura:

```json
{
  "nombreCompleto": "Juan Pérez",
  "email": "juan.perez@email.com",
  "telefono": "+54 11 1234-5678",
  "tipoTrabajo": "Reparación",
  "presupuesto": {
    "subtotal": 5000,
    "descuento": 0,
    "total": 5000,
    "moneda": "USD",
    "fecha": "2024-01-15",
    "detalles": {
      "materiales": [...],
      "trabajo": [...],
      "adicionales": [...]
    },
    "dimensiones": {...},
    "notas": "..."
  },
  "pdfUrl": "https://xxxxx.supabase.co/storage/v1/object/public/cotizaciones-pdf/cotizaciones/presupuesto_Juan_Perez_2024-01-15.pdf",
  "pdfPath": "cotizaciones/presupuesto_Juan_Perez_2024-01-15.pdf",
  "pdfFilename": "presupuesto_Juan_Perez_2024-01-15.pdf",
  "informacionCompleta": {...}
}
```

## 🚀 Cómo Importar el Workflow Actualizado

1. Abre n8n
2. Ve a **Workflows**
3. Haz clic en **Import from File** o **Import from URL**
4. Selecciona el archivo `n8n-workflow-updated.json`
5. Revisa y ajusta las credenciales si es necesario:
   - Webhook ID (si quieres mantener el mismo)
   - Credenciales de Gmail
6. Activa el workflow

## ⚙️ Configuración Manual (Alternativa)

Si prefieres actualizar el workflow manualmente:

### Paso 1: Actualizar "Edit Fields"
1. Abre el nodo "Edit Fields"
2. Elimina el campo `cotizacion` (estaba vacío)
3. Agrega estos campos:
   - `pdfUrl`: `={{ $json.body.pdfUrl }}`
   - `pdfFilename`: `={{ $json.body.pdfFilename }}`
   - `email`: `={{ $json.body.email }}`
   - `telefono`: `={{ $json.body.telefono }}`
   - `tipoTrabajo`: `={{ $json.body.tipoTrabajo }}`
4. Mantén `nombreCliente` y `presupuesto`

### Paso 2: Eliminar "Convert to File"
1. Elimina el nodo "Convert to File"
2. Desconecta las conexiones

### Paso 3: Agregar "HTTP Request"
1. Agrega un nuevo nodo **HTTP Request**
2. Configura:
   - **Method**: `GET`
   - **URL**: `={{ $json.pdfUrl }}`
   - En **Options** → **Response**:
     - **Response Format**: `File`
     - **Output Property Name**: `cotizacion`
3. Conecta:
   - Entrada: Desde "Edit Fields"
   - Salida: Hacia "Send a message"

### Paso 4: Actualizar "Send a message"
1. Actualiza el asunto del email
2. Actualiza el mensaje del email (opcional)
3. Verifica que el adjunto use `cotizacion` (binary property)

## ✅ Verificación

Después de actualizar el workflow:

1. **Prueba el webhook** enviando una cotización desde la aplicación
2. **Verifica en n8n** que:
   - El nodo "Download PDF from Supabase" descarga el PDF correctamente
   - El archivo binario `cotizacion` se crea correctamente
   - El email se envía con el PDF adjunto
3. **Revisa el email** recibido:
   - Debe tener el PDF adjunto
   - El PDF debe abrirse correctamente
   - El formato debe ser correcto (sin problemas de codificación)

## 🐛 Solución de Problemas

### El nodo HTTP Request falla
- Verifica que `pdfUrl` está presente en los datos
- Verifica que la URL es accesible públicamente
- Revisa que el bucket de Supabase es público

### El PDF no se adjunta al email
- Verifica que el nodo HTTP Request tiene `Response Format: File`
- Verifica que `Output Property Name` es `cotizacion`
- Verifica que el nodo Gmail usa `cotizacion` como adjunto

### El PDF está corrupto
- Verifica que la URL del PDF es correcta
- Verifica que el PDF se descargó completamente
- Revisa los logs de n8n para ver errores

