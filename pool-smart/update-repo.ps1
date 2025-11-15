# Script para actualizar el repositorio GitHub
# Ejecutar desde el directorio: C:\Users\PC\cotizacion_piscina

Write-Host "=== Actualizando repositorio ===" -ForegroundColor Green

# Navegar al directorio del repositorio
Set-Location "C:\Users\PC\cotizacion_piscina"

# Verificar estado
Write-Host "`nVerificando estado del repositorio..." -ForegroundColor Yellow
git status

# Agregar todos los cambios
Write-Host "`nAgregando cambios..." -ForegroundColor Yellow
git add .

# Hacer commit
Write-Host "`nCreando commit..." -ForegroundColor Yellow
git commit -m "Actualización: Funcionalidad de exportación JSON para n8n y optimización de estilos de impresión

- Agregada funcionalidad para exportar datos en formato JSON para n8n
- Incluye toda la información del formulario en el JSON exportado
- Agregado botón para descargar JSON y enviar a webhook de n8n
- Optimizados estilos de impresión para que quepa en una sola página A4
- Footer azul ahora se posiciona al final de la página sin espacios en blanco
- Mejorada distribución del contenido en formato A4"

# Verificar si hay un remoto configurado
Write-Host "`nVerificando remoto..." -ForegroundColor Yellow
$remote = git remote -v

if ($remote -match "github.com/viscochito/cotizacion_piscina") {
    Write-Host "`nSubiendo cambios a GitHub..." -ForegroundColor Yellow
    git push origin main
    Write-Host "`n¡Cambios subidos exitosamente!" -ForegroundColor Green
} else {
    Write-Host "`nConfigurando remoto..." -ForegroundColor Yellow
    git remote add origin https://github.com/viscochito/cotizacion_piscina.git
    git branch -M main
    git push -u origin main
    Write-Host "`n¡Repositorio configurado y cambios subidos!" -ForegroundColor Green
}

Write-Host "`n=== Proceso completado ===" -ForegroundColor Green


