# Corrección de Generación de PDF

## Problema Identificado

La función `generatePDFBlob` (líneas 630-2136 en `App.jsx`) está intentando dividir manualmente el contenido en dos páginas, lo cual está causando que se corte el contenido.

## Función Responsable

**`generatePDFBlob`** - Esta función es la responsable de generar el PDF.

### Ubicación

- Archivo: `src/App.jsx`
- Líneas: 630-2136
- Llamada desde: `generateAndUploadPDF` (línea 2143)

## Problema Actual

La función está:

1. Calculando alturas manualmente
2. Dividiendo el contenido en dos contenedores separados (`page1Container` y `page2Container`)
3. Generando dos PDFs separados y combinándolos
4. Esto causa que se pierdan elementos o se corten incorrectamente

## Solución Recomendada

Simplificar la función para que `html2pdf.js` maneje los saltos de página automáticamente usando CSS `page-break`, en lugar de dividir manualmente el contenido.

### Cambios Necesarios

1. **Eliminar la lógica de división manual** (líneas 1467-2078)
2. **Usar solo html2pdf.js con configuración CSS** para saltos de página
3. **Aplicar estilos CSS `page-break-before` y `page-break-inside: avoid`** en lugar de dividir manualmente

### Configuración CSS Recomendada

```css
.quote-additional-costs-section {
  page-break-before: always;
  page-break-inside: avoid;
}

.quote-table-container {
  page-break-inside: avoid;
}

.quote-table tr {
  page-break-inside: avoid;
}
```

### Opciones de html2pdf.js Simplificadas

```javascript
const options = {
  margin: [10, 10, 10, 10],
  filename: "cotizacion.pdf",
  image: { type: "jpeg", quality: 0.98 },
  html2canvas: {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: 794,
    width: 794,
    scrollX: 0,
    scrollY: 0,
  },
  jsPDF: {
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  },
  pagebreak: {
    mode: ["css", "legacy"],
    avoid: [
      ".quote-table-container",
      ".quote-table tr",
      ".quote-summary",
      ".quote-signature-section",
    ],
    before: [".quote-additional-costs-section"],
  },
};
```

## Próximos Pasos

1. Simplificar la función `generatePDFBlob`
2. Eliminar toda la lógica de división manual
3. Usar solo html2pdf.js con CSS para saltos de página
4. Probar que el contenido no se corte
