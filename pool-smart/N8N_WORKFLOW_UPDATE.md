# Actualización del Workflow de n8n

Este documento explica cómo actualizar tu workflow de n8n para trabajar con PDFs almacenados en Supabase en lugar de recibirlos en base64.

## 🔄 Cambios Necesarios

### Antes (con Base64)
El workflow recibía el PDF directamente en base64 en el campo `presupuesto` y lo convertía a archivo binario.

### Ahora (con Supabase)
El workflow recibirá:
- `pdfUrl`: URL pública del PDF en Supabase Storage
- `pdfPath`: Ruta del archivo en Supabase
- `pdfFilename`: Nombre del archivo PDF

## 📝 Pasos para Actualizar el Workflow

### 1. Modificar el Nodo "Edit Fields"

En lugar de extraer `presupuesto` (base64), ahora necesitas extraer la URL del PDF:

**Campos a configurar:**
```json
{
  "nombreCliente": "={{ $json.body.nombreCompleto }}",
  "email": "={{ $json.body.email }}",
  "telefono": "={{ $json.body.telefono }}",
  "pdfUrl": "={{ $json.body.pdfUrl }}",
  "pdfFilename": "={{ $json.body.pdfFilename }}"
}
```

### 2. Agregar Nodo "HTTP Request" para Descargar el PDF

Después del nodo "Edit Fields", agrega un nuevo nodo **HTTP Request**:

**Configuración:**
- **Method**: `GET`
- **URL**: `={{ $json.pdfUrl }}`
- **Response Format**: `File`
- **Binary Property Name**: `cotizacion`

Este nodo descargará el PDF desde la URL de Supabase y lo guardará como archivo binario.

### 3. Actualizar el Nodo "Send a message" (Gmail)

El nodo "Send a message" puede permanecer igual, ya que seguirá usando el archivo binario `cotizacion` como adjunto.

**Configuración (sin cambios):**
- **Attachments**: `cotizacion` (binary property)

## 🔧 Workflow Actualizado

```
Webhook → Edit Fields → HTTP Request (descargar PDF) → Send a message (Gmail)
```

### Flujo Completo:

1. **Webhook**: Recibe los datos de la cotización con `pdfUrl`
2. **Edit Fields**: Extrae los campos necesarios, incluyendo `pdfUrl`
3. **HTTP Request**: Descarga el PDF desde Supabase usando la URL
4. **Send a message**: Envía el email con el PDF como adjunto

## 📋 Ejemplo de Datos Recibidos

El webhook ahora recibirá un JSON como este:

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
    "moneda": "USD"
  },
  "pdfUrl": "https://xxxxx.supabase.co/storage/v1/object/public/cotizaciones-pdf/cotizaciones/presupuesto_Juan_Perez_2024-01-15.pdf",
  "pdfPath": "cotizaciones/presupuesto_Juan_Perez_2024-01-15.pdf",
  "pdfFilename": "presupuesto_Juan_Perez_2024-01-15.pdf"
}
```

## ✅ Ventajas de este Enfoque

1. **Sin problemas de formato**: El PDF se mantiene en su formato original
2. **Menor tamaño de payload**: Solo se envía la URL, no el archivo completo
3. **Mejor rendimiento**: n8n descarga el PDF directamente desde Supabase
4. **Almacenamiento centralizado**: Todos los PDFs están en Supabase
5. **Acceso directo**: Puedes acceder a los PDFs directamente desde la URL

## 🐛 Solución de Problemas

### Error: "Failed to download PDF"
- Verifica que la URL del PDF es accesible públicamente
- Verifica que el bucket de Supabase está configurado como público
- Revisa que la URL no haya expirado

### Error: "PDF not found"
- Verifica que el PDF se subió correctamente a Supabase
- Revisa la ruta del archivo en el campo `pdfPath`

### El PDF se envía corrupto
- Verifica que el nodo HTTP Request tiene `Response Format: File`
- Asegúrate de que el `Binary Property Name` es `cotizacion`

## 📝 Notas Adicionales

- El PDF se descarga cada vez que se ejecuta el workflow
- Si necesitas cachear el PDF, puedes agregar lógica adicional en n8n
- La URL del PDF es permanente mientras el archivo exista en Supabase
- Puedes acceder directamente a los PDFs desde el navegador usando la URL

