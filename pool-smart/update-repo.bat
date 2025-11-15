@echo off
REM Script para actualizar el repositorio GitHub
REM Ejecutar desde el directorio: C:\Users\PC\cotizacion_piscina

echo === Actualizando repositorio ===

REM Navegar al directorio del repositorio
cd C:\Users\PC\cotizacion_piscina

REM Verificar estado
echo.
echo Verificando estado del repositorio...
git status

REM Agregar todos los cambios
echo.
echo Agregando cambios...
git add .

REM Hacer commit
echo.
echo Creando commit...
git commit -m "Actualización: Funcionalidad de exportación JSON para n8n y optimización de estilos de impresión

- Agregada funcionalidad para exportar datos en formato JSON para n8n
- Incluye toda la información del formulario en el JSON exportado
- Agregado botón para descargar JSON y enviar a webhook de n8n
- Optimizados estilos de impresión para que quepa en una sola página A4
- Footer azul ahora se posiciona al final de la página sin espacios en blanco
- Mejorada distribución del contenido en formato A4"

REM Verificar y subir cambios
echo.
echo Subiendo cambios a GitHub...
git push origin main

echo.
echo === Proceso completado ===
pause


