// ============================================
// Servicio de Supabase para Pool Smart
// ============================================
import { createClient } from '@supabase/supabase-js'

// Obtener variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const storageBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'cotizaciones-pdf'

// Validar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  console.error('Por favor, configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env')
}

// Crear cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
})

/**
 * Sube un PDF a Supabase Storage
 * @param {Blob} pdfBlob - Blob del PDF a subir
 * @param {string} filename - Nombre del archivo (sin extensión)
 * @returns {Promise<{path: string, url: string, error: Error|null}>}
 */
export const uploadPDFToStorage = async (pdfBlob, filename) => {
  try {
    // Generar nombre único para el archivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9-_]/g, '_')
    const filePath = `cotizaciones/${sanitizedFilename}_${timestamp}.pdf`

    console.log('📤 Subiendo PDF a Supabase Storage...')
    console.log('📁 Ruta:', filePath)
    console.log('📊 Tamaño:', (pdfBlob.size / 1024).toFixed(2), 'KB')

    // Subir el archivo
    const { data, error } = await supabase.storage
      .from(storageBucket)
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false // No sobrescribir si existe
      })

    if (error) {
      console.error('❌ Error al subir PDF:', error)
      throw error
    }

    console.log('✅ PDF subido exitosamente:', data.path)

    // Obtener URL pública del archivo
    const { data: urlData } = supabase.storage
      .from(storageBucket)
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    console.log('🔗 URL pública:', publicUrl)

    return {
      path: filePath,
      url: publicUrl,
      error: null
    }
  } catch (error) {
    console.error('❌ Error en uploadPDFToStorage:', error)
    return {
      path: null,
      url: null,
      error: error
    }
  }
}

/**
 * Guarda una cotización en la base de datos
 * @param {Object} cotizacionData - Datos de la cotización
 * @returns {Promise<{id: string, error: Error|null}>}
 */
export const saveCotizacion = async (cotizacionData) => {
  try {
    console.log('💾 Guardando cotización en la base de datos...')

    // Preparar datos para la tabla principal
    const { data, error } = await supabase
      .from('cotizaciones')
      .insert({
        cliente_nombre: cotizacionData.cliente_nombre,
        cliente_email: cotizacionData.cliente_email,
        cliente_telefono: cotizacionData.cliente_telefono,
        tipo_piscina: cotizacionData.tipo_piscina,
        largo: cotizacionData.largo,
        ancho: cotizacionData.ancho,
        profundidad: cotizacionData.profundidad,
        volumen_m3: cotizacionData.volumen_m3,
        area_ceramica_m2: cotizacionData.area_ceramica_m2,
        area_piso_termico_m2: cotizacionData.area_piso_termico_m2,
        tipo_trabajo: cotizacionData.tipo_trabajo,
        subtotal: cotizacionData.subtotal,
        descuento: cotizacionData.descuento,
        total: cotizacionData.total,
        moneda: cotizacionData.moneda || 'USD',
        pdf_path: cotizacionData.pdf_path,
        pdf_url: cotizacionData.pdf_url,
        pdf_filename: cotizacionData.pdf_filename,
        notas: cotizacionData.notas,
        estado: cotizacionData.estado || 'pendiente',
        datos_completos: cotizacionData.datos_completos
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error al guardar cotización:', error)
      throw error
    }

    const cotizacionId = data.id
    console.log('✅ Cotización guardada con ID:', cotizacionId)

    // Guardar materiales si existen
    if (cotizacionData.materiales && cotizacionData.materiales.length > 0) {
      const materialesData = cotizacionData.materiales.map(material => ({
        cotizacion_id: cotizacionId,
        nombre: material.name,
        cantidad: material.quantity,
        unidad: material.unit,
        precio_unitario: material.unitPrice,
        total: material.total
      }))

      const { error: materialesError } = await supabase
        .from('cotizacion_materiales')
        .insert(materialesData)

      if (materialesError) {
        console.error('⚠️ Error al guardar materiales:', materialesError)
      } else {
        console.log('✅ Materiales guardados')
      }
    }

    // Guardar trabajos si existen
    if (cotizacionData.trabajos && cotizacionData.trabajos.length > 0) {
      const trabajosData = cotizacionData.trabajos.map(trabajo => ({
        cotizacion_id: cotizacionId,
        nombre: trabajo.name,
        cantidad: trabajo.quantity,
        unidad: trabajo.unit,
        precio_unitario: trabajo.unitPrice,
        total: trabajo.total
      }))

      const { error: trabajosError } = await supabase
        .from('cotizacion_trabajos')
        .insert(trabajosData)

      if (trabajosError) {
        console.error('⚠️ Error al guardar trabajos:', trabajosError)
      } else {
        console.log('✅ Trabajos guardados')
      }
    }

    // Guardar costos adicionales si existen
    if (cotizacionData.costos_adicionales && cotizacionData.costos_adicionales.length > 0) {
      const costosData = cotizacionData.costos_adicionales.map(costo => ({
        cotizacion_id: cotizacionId,
        nombre: costo.name,
        cantidad: costo.quantity,
        unidad: costo.unit,
        total: costo.total
      }))

      const { error: costosError } = await supabase
        .from('cotizacion_costos_adicionales')
        .insert(costosData)

      if (costosError) {
        console.error('⚠️ Error al guardar costos adicionales:', costosError)
      } else {
        console.log('✅ Costos adicionales guardados')
      }
    }

    return {
      id: cotizacionId,
      error: null
    }
  } catch (error) {
    console.error('❌ Error en saveCotizacion:', error)
    return {
      id: null,
      error: error
    }
  }
}

/**
 * Obtiene una cotización por ID
 * @param {string} cotizacionId - ID de la cotización
 * @returns {Promise<Object|null>}
 */
export const getCotizacion = async (cotizacionId) => {
  try {
    const { data, error } = await supabase
      .from('cotizaciones')
      .select(`
        *,
        materiales:cotizacion_materiales(*),
        trabajos:cotizacion_trabajos(*),
        costos_adicionales:cotizacion_costos_adicionales(*)
      `)
      .eq('id', cotizacionId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('❌ Error al obtener cotización:', error)
    return null
  }
}

/**
 * Obtiene todas las cotizaciones de un cliente por email
 * @param {string} email - Email del cliente
 * @returns {Promise<Array>}
 */
export const getCotizacionesByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('cotizaciones')
      .select('*')
      .eq('cliente_email', email)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('❌ Error al obtener cotizaciones:', error)
    return []
  }
}

