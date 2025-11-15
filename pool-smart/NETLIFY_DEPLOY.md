# Instrucciones para Desplegar en Netlify

## Pasos para Desplegar

### 1. Preparar el Proyecto
El proyecto ya está configurado con `netlify.toml`. Solo necesitas:

1. **Hacer commit de los cambios** (si usas Git):
   ```bash
   git add .
   git commit -m "Preparado para Netlify"
   git push
   ```

### 2. Desplegar en Netlify

#### Opción A: Desde el Dashboard de Netlify (Recomendado)

1. Ve a [netlify.com](https://www.netlify.com) y crea una cuenta (gratis)
2. Haz clic en **"Add new site"** → **"Import an existing project"**
3. Conecta tu repositorio de Git (GitHub, GitLab, Bitbucket) o:
   - Si no tienes repositorio, puedes hacer **"Deploy manually"**
4. Si despliegas manualmente:
   - Ejecuta `npm run build` en tu terminal
   - Arrastra la carpeta `dist` a Netlify
5. Netlify te dará una URL automática tipo: `tu-app-12345.netlify.app`

#### Opción B: Desde la Terminal (Netlify CLI)

1. Instala Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Inicia sesión:
   ```bash
   netlify login
   ```

3. Despliega:
   ```bash
   npm run build
   netlify deploy --prod
   ```

### 3. Configuración Automática

El archivo `netlify.toml` ya está configurado con:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Redirects**: Configurado para SPA (Single Page Application)

### 4. Verificar el Despliegue

Una vez desplegado:
- La aplicación usará automáticamente el **webhook de producción** porque no estará en `localhost`
- Podrás probar el webhook de producción sin problemas de CORS
- La URL será algo como: `https://tu-app.netlify.app`

### 5. Personalizar el Dominio (Opcional)

1. En el dashboard de Netlify, ve a **Site settings** → **Domain management**
2. Puedes cambiar el nombre del dominio automático
3. O conectar un dominio personalizado (si tienes uno)

## Notas Importantes

- El webhook de producción se usará automáticamente cuando la app esté en Netlify (no en localhost)
- No necesitas configurar variables de entorno para esto
- El build se ejecuta automáticamente en cada push (si conectaste Git)

