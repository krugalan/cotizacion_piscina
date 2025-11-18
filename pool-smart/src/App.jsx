import { useState, useEffect } from 'react'
import './App.css'
import html2pdf from 'html2pdf.js'
import { uploadPDFToStorage, saveCotizacion } from './services/supabase'

function App() {
  // DATOS HARDCODEADOS PARA TESTING
  const [formData, setFormData] = useState({
    // Información del cliente
    clientName: 'Juan Pérez',
    clientEmail: 'juan.perez@email.com',
    clientPhone: '+54 11 1234-5678',
    // Dimensiones
    length: '4.97',
    width: '2',
    depth: '2',
    poolType: 'rectangular',
    // Tipo de trabajo
    workType: 'repair', // construction, repair, maintenance, renovation
    // Materiales
    materials: {
      ceramics: true,
      thermalFloor: true,
      pump: true,
      filter: true,
      lighting: true,
      heating: true,
      cover: true,
      ladder: true,
      tiles: 'standard' // standard, premium, luxury
    },
    // Reparaciones específicas
    repairs: {
      leaks: true,
      cracks: true,
      coating: true,
      plumbing: true,
      electrical: true,
      cleaning: true
    },
    // Mano de obra
    laborHours: '24',
    laborRate: 50, // USD por hora
    // Otros factores
    accessDifficulty: 'normal', // easy, normal, difficult
    permits: true, // Por defecto marcado
    excavation: true,
    additionalNotes: 'Reparación completa de piscina con renovación de materiales y sistemas.'
  })

  const [showModal, setShowModal] = useState(false)
  const [quoteData, setQuoteData] = useState(null)

  // Función para calcular cotización (sin evento)
  const calculateQuoteData = () => {
    const length = parseFloat(formData.length) || 0
    const width = parseFloat(formData.width) || 0
    const depth = parseFloat(formData.depth) || 0

    if (length <= 0 || width <= 0 || depth <= 0) {
      console.warn('Valores inválidos en el formulario')
      return
    }

    // Calcular metros cúbicos
    let volume = 0
    if (formData.poolType === 'rectangular') {
      volume = length * width * depth
    } else if (formData.poolType === 'circular') {
      const radius = width / 2
      volume = Math.PI * radius * radius * depth
    } else if (formData.poolType === 'oval') {
      const radius = width / 2
      volume = Math.PI * radius * radius * depth
    }

    // Calcular metros cuadrados de cerámicos (área del fondo + paredes)
    let ceramicArea = 0
    if (formData.poolType === 'rectangular') {
      const bottomArea = length * width
      const wallsArea = 2 * (length * depth) + 2 * (width * depth)
      ceramicArea = bottomArea + wallsArea
    } else if (formData.poolType === 'circular' || formData.poolType === 'oval') {
      const radius = width / 2
      const bottomArea = Math.PI * radius * radius
      const wallsArea = 2 * Math.PI * radius * depth
      ceramicArea = bottomArea + wallsArea
    }

    // Calcular metros cuadrados de pisos térmicos (área del fondo)
    let thermalFloorArea = 0
    if (formData.poolType === 'rectangular') {
      thermalFloorArea = length * width
    } else if (formData.poolType === 'circular' || formData.poolType === 'oval') {
      const radius = width / 2
      thermalFloorArea = Math.PI * radius * radius
    }

    // Costo por metro cúbico ($300)
    const costPerCubicMeter = 300
    const totalCost = volume * costPerCubicMeter

    // Calcular costos de materiales
    const materialCosts = []
    let totalMaterialCost = 0

    // Cerámicos
    if (formData.materials.ceramics) {
      const tilePrice = formData.materials.tiles === 'premium' ? 75 : formData.materials.tiles === 'luxury' ? 120 : 50
      const ceramicCost = parseFloat(ceramicArea) * tilePrice
      materialCosts.push({
        name: `Cerámicos ${formData.materials.tiles === 'premium' ? 'Premium' : formData.materials.tiles === 'luxury' ? 'Lujo' : 'Estándar'}`,
        quantity: parseFloat(ceramicArea).toFixed(2),
        unit: 'm²',
        unitPrice: tilePrice,
        total: ceramicCost
      })
      totalMaterialCost += ceramicCost
    }

    // Pisos térmicos
    if (formData.materials.thermalFloor) {
      const thermalCost = parseFloat(thermalFloorArea) * 80
      materialCosts.push({
        name: 'Pisos térmicos',
        quantity: parseFloat(thermalFloorArea).toFixed(2),
        unit: 'm²',
        unitPrice: 80,
        total: thermalCost
      })
      totalMaterialCost += thermalCost
    }

    // Equipos adicionales
    const equipmentPrices = {
      pump: 800,
      filter: 600,
      lighting: 300,
      heating: 2500,
      cover: 400,
      ladder: 250
    }

    Object.keys(equipmentPrices).forEach(key => {
      if (formData.materials[key]) {
        materialCosts.push({
          name: key === 'pump' ? 'Bomba de agua' : 
                key === 'filter' ? 'Sistema de filtrado' :
                key === 'lighting' ? 'Iluminación LED' :
                key === 'heating' ? 'Sistema de calefacción' :
                key === 'cover' ? 'Cubierta de seguridad' :
                'Escalera',
          quantity: 1,
          unit: 'unidad',
          unitPrice: equipmentPrices[key],
          total: equipmentPrices[key]
        })
        totalMaterialCost += equipmentPrices[key]
      }
    })

    // Calcular costos de construcción/reparación
    const workCosts = []
    let totalWorkCost = 0

    if (formData.workType === 'construction') {
      const baseConstructionCost = volume * costPerCubicMeter
      const excavationCost = formData.excavation ? volume * 50 : 0
      workCosts.push({
        name: 'Construcción de piscina',
        quantity: volume.toFixed(2),
        unit: 'm³',
        unitPrice: costPerCubicMeter,
        total: baseConstructionCost
      })
      if (excavationCost > 0) {
        workCosts.push({
          name: 'Excavación',
          quantity: volume.toFixed(2),
          unit: 'm³',
          unitPrice: 50,
          total: excavationCost
        })
      }
      totalWorkCost = baseConstructionCost + excavationCost
    } else if (formData.workType === 'repair') {
      // Costos de reparaciones específicas
      const repairPrices = {
        leaks: { base: 500, perM2: 30 },
        cracks: { base: 400, perM2: 25 },
        coating: { base: 800, perM2: 50 },
        plumbing: { base: 600, perM2: 0 },
        electrical: { base: 500, perM2: 0 },
        cleaning: { base: 200, perM2: 10 }
      }

      Object.keys(repairPrices).forEach(key => {
        if (formData.repairs[key]) {
          const repair = repairPrices[key]
          const repairCost = repair.base + (repair.perM2 * parseFloat(ceramicArea))
          workCosts.push({
            name: key === 'leaks' ? 'Reparación de filtraciones' :
                  key === 'cracks' ? 'Reparación de grietas' :
                  key === 'coating' ? 'Revestimiento' :
                  key === 'plumbing' ? 'Reparación de plomería' :
                  key === 'electrical' ? 'Reparación eléctrica' :
                  'Limpieza profunda',
            quantity: 1,
            unit: 'servicio',
            unitPrice: repairCost,
            total: repairCost
          })
          totalWorkCost += repairCost
        }
      })
    } else if (formData.workType === 'renovation') {
      const renovationCost = parseFloat(ceramicArea) * 60
      workCosts.push({
        name: 'Renovación completa',
        quantity: parseFloat(ceramicArea).toFixed(2),
        unit: 'm²',
        unitPrice: 60,
        total: renovationCost
      })
      totalWorkCost = renovationCost
    }

    // Calcular mano de obra
    const laborHours = parseFloat(formData.laborHours) || 0
    let laborCost = 0
    if (laborHours > 0) {
      laborCost = laborHours * formData.laborRate
      workCosts.push({
        name: 'Mano de obra',
        quantity: laborHours.toFixed(1),
        unit: 'horas',
        unitPrice: formData.laborRate,
        total: laborCost
      })
      totalWorkCost += laborCost
    } else {
      // Calcular horas estimadas automáticamente
      const estimatedHours = formData.workType === 'construction' 
        ? Math.ceil(volume * 2) 
        : formData.workType === 'repair' 
        ? Object.values(formData.repairs).filter(r => r).length * 4
        : 8
      laborCost = estimatedHours * formData.laborRate
      workCosts.push({
        name: 'Mano de obra (estimada)',
        quantity: estimatedHours.toFixed(1),
        unit: 'horas',
        unitPrice: formData.laborRate,
        total: laborCost
      })
      totalWorkCost += laborCost
    }

    // Costos adicionales
    const additionalCosts = []
    let totalAdditionalCost = 0

    // Dificultad de acceso
    const accessMultiplier = formData.accessDifficulty === 'difficult' ? 1.3 : formData.accessDifficulty === 'easy' ? 0.9 : 1.0
    if (accessMultiplier !== 1.0) {
      const accessCost = (totalMaterialCost + totalWorkCost) * (accessMultiplier - 1.0)
      additionalCosts.push({
        name: `Recargo por acceso ${formData.accessDifficulty === 'difficult' ? 'difícil' : 'fácil'}`,
        quantity: 1,
        unit: 'servicio',
        unitPrice: accessCost,
        total: accessCost
      })
      totalAdditionalCost += accessCost
    }

    // Permisos
    if (formData.permits) {
      additionalCosts.push({
        name: 'Permisos y licencias',
        quantity: 1,
        unit: 'servicio',
        unitPrice: 500,
        total: 500
      })
      totalAdditionalCost += 500
    }

    // Calcular totales
    const subtotal = totalMaterialCost + totalWorkCost + totalAdditionalCost
    const discount = 0
    const finalTotal = subtotal - discount

    setQuoteData({
      // Información calculada
      volume: volume.toFixed(2),
      ceramicArea: ceramicArea.toFixed(2),
      thermalFloorArea: thermalFloorArea.toFixed(2),
      materialCosts,
      workCosts,
      additionalCosts,
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      totalCost: finalTotal.toFixed(2),
      date: new Date().toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }),
      // Información completa del formulario
      formData: {
        // Información del cliente
        clientName: formData.clientName || 'Cliente',
        clientEmail: formData.clientEmail || '',
        clientPhone: formData.clientPhone || '',
        // Dimensiones
        length: formData.length,
        width: formData.width,
        depth: formData.depth,
        poolType: formData.poolType,
        // Tipo de trabajo
        workType: formData.workType,
        // Materiales
        materials: { ...formData.materials },
        // Reparaciones específicas
        repairs: { ...formData.repairs },
        // Mano de obra
        laborHours: formData.laborHours,
        laborRate: formData.laborRate,
        // Otros factores
        accessDifficulty: formData.accessDifficulty,
        permits: formData.permits,
        excavation: formData.excavation,
        additionalNotes: formData.additionalNotes || ''
      }
    })
    
    setShowModal(true)
  }

  // Calcular automáticamente al cargar la página
  useEffect(() => {
    calculateQuoteData()
  }, []) // Solo se ejecuta una vez al montar

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (name.startsWith('materials.')) {
      const materialKey = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        materials: {
          ...prev.materials,
          [materialKey]: type === 'checkbox' ? checked : value
        }
      }))
    } else if (name.startsWith('repairs.')) {
      const repairKey = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        repairs: {
          ...prev.repairs,
          [repairKey]: checked
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }

  const calculateQuote = (e) => {
    e.preventDefault()
    calculateQuoteData()
  }

  const resetForm = () => {
    setFormData({
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      length: '',
      width: '',
      depth: '',
      poolType: 'rectangular',
      workType: 'construction',
      materials: {
        ceramics: true,
        thermalFloor: true,
        pump: false,
        filter: false,
        lighting: false,
        heating: false,
        cover: false,
        ladder: false,
        tiles: 'standard'
      },
      repairs: {
        leaks: false,
        cracks: false,
        coating: false,
        plumbing: false,
        electrical: false,
        cleaning: false
      },
      laborHours: '',
      laborRate: 50,
      accessDifficulty: 'normal',
      permits: true, // Por defecto marcado
      excavation: true,
      additionalNotes: ''
    })
    setQuoteData(null)
    setShowModal(false)
  }

  const closeModal = () => {
    setShowModal(false)
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Función para mapear el tipo de trabajo a texto legible
  const getWorkTypeLabel = (workType) => {
    const workTypeMap = {
      'construction': 'Construcción Nueva',
      'repair': 'Reparación',
      'renovation': 'Renovación',
      'maintenance': 'Mantenimiento'
    }
    return workTypeMap[workType] || workType
  }

  // Función para preparar los datos para n8n
  const prepareN8NData = (quoteData) => {
    const formData = quoteData.formData || {}
    
    return {
      // Información principal solicitada
      nombreCompleto: formData.clientName || '',
      email: formData.clientEmail || '',
      telefono: formData.clientPhone || '',
      tipoTrabajo: getWorkTypeLabel(formData.workType || ''),
      
      // Presupuesto calculado
      presupuesto: {
        subtotal: parseFloat(quoteData.subtotal || 0),
        descuento: parseFloat(quoteData.discount || 0),
        total: parseFloat(quoteData.totalCost || 0),
        moneda: 'USD',
        fecha: quoteData.date || '',
        detalles: {
          materiales: quoteData.materialCosts || [],
          trabajo: quoteData.workCosts || [],
          adicionales: quoteData.additionalCosts || []
        },
        dimensiones: {
          tipo: formData.poolType || '',
          largo: formData.length || '',
          ancho: formData.width || '',
          profundidad: formData.depth || '',
          volumen: parseFloat(quoteData.volume || 0),
          areaCeramica: parseFloat(quoteData.ceramicArea || 0),
          areaPisoTermico: parseFloat(quoteData.thermalFloorArea || 0)
        },
        notas: formData.additionalNotes || ''
      },
      
      // Información completa del formulario (para uso futuro)
      informacionCompleta: {
        // Información del cliente
        cliente: {
          nombreCompleto: formData.clientName || '',
          email: formData.clientEmail || '',
          telefono: formData.clientPhone || ''
        },
        
        // Dimensiones y tipo de piscina
        piscina: {
          tipo: formData.poolType || '',
          largo: formData.length || '',
          ancho: formData.width || '',
          profundidad: formData.depth || '',
          volumen: parseFloat(quoteData.volume || 0),
          areaCeramica: parseFloat(quoteData.ceramicArea || 0),
          areaPisoTermico: parseFloat(quoteData.thermalFloorArea || 0)
        },
        
        // Tipo de trabajo
        trabajo: {
          tipo: formData.workType || '',
          tipoTexto: getWorkTypeLabel(formData.workType || '')
        },
        
        // Materiales seleccionados
        materiales: {
          ceramicos: formData.materials?.ceramics || false,
          calidadCeramicos: formData.materials?.tiles || 'standard',
          pisoTermico: formData.materials?.thermalFloor || false,
          bomba: formData.materials?.pump || false,
          filtro: formData.materials?.filter || false,
          iluminacion: formData.materials?.lighting || false,
          calefaccion: formData.materials?.heating || false,
          cubierta: formData.materials?.cover || false,
          escalera: formData.materials?.ladder || false
        },
        
        // Reparaciones específicas (si aplica)
        reparaciones: {
          filtraciones: formData.repairs?.leaks || false,
          grietas: formData.repairs?.cracks || false,
          revestimiento: formData.repairs?.coating || false,
          plomeria: formData.repairs?.plumbing || false,
          electrica: formData.repairs?.electrical || false,
          limpieza: formData.repairs?.cleaning || false
        },
        
        // Mano de obra
        manoDeObra: {
          horas: formData.laborHours || '',
          tarifaPorHora: formData.laborRate || 50,
          costoTotal: quoteData.workCosts?.find(item => item.name.includes('Mano de obra'))?.total || 0
        },
        
        // Otros factores
        otrosFactores: {
          dificultadAcceso: formData.accessDifficulty || 'normal',
          incluyePermisos: formData.permits || false,
          incluyeExcavacion: formData.excavation || false,
          notasAdicionales: formData.additionalNotes || ''
        },
        
        // Detalles del presupuesto
        detallesPresupuesto: {
          materiales: quoteData.materialCosts || [],
          trabajo: quoteData.workCosts || [],
          adicionales: quoteData.additionalCosts || [],
          subtotal: parseFloat(quoteData.subtotal || 0),
          descuento: parseFloat(quoteData.discount || 0),
          total: parseFloat(quoteData.totalCost || 0),
          moneda: 'USD'
        }
      }
    }
  }

  // Función para descargar el presupuesto como JSON
  const downloadQuoteAsJSON = (quoteData) => {
    const n8nData = prepareN8NData(quoteData)
    const dataStr = JSON.stringify(n8nData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    const clientName = quoteData.formData?.clientName || 'Cliente'
    link.download = `presupuesto_${clientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Helper: espera a que imágenes y fuentes carguen dentro de un nodo
  const waitForResources = (root, timeout = 3000) => {
    return new Promise((resolve) => {
      const images = Array.from(root.querySelectorAll('img'))
      const imgPromises = images.map(img => {
        return new Promise(res => {
          if (img.complete) return res()
          img.addEventListener('load', res)
          img.addEventListener('error', res)
        })
      })
      
      // Esperar FontFace loading (si usás webfonts)
      const fontPromise = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve()
      
      Promise.race([
        Promise.all(imgPromises).then(() => fontPromise),
        new Promise(res => setTimeout(res, timeout))
      ]).then(resolve)
    })
  }

  // Función para convertir Blob a Base64
  const convertBlobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        try {
          const base64 = reader.result.split(',')[1]
          console.log('✅ Base64 convertido:', base64.length, 'chars')
          console.log('🔍 Inicio:', base64.substring(0, 50))
          resolve(base64)
        } catch (error) {
          console.error('❌ Error extrayendo base64:', error)
          reject(new Error('Error al extraer base64 del resultado: ' + error.message))
        }
      }
      reader.onerror = () => {
        console.error('❌ Error FileReader:', reader.error)
        reject(new Error('Error en FileReader: ' + (reader.error?.message || 'Error desconocido')))
      }
      reader.readAsDataURL(blob)
    })
  }

  // Función para descargar PDF localmente
  const downloadPDF = (pdfBlob, filename) => {
    const url = URL.createObjectURL(pdfBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Función para generar PDF (solo genera el Blob, sin convertir a base64)
  const generatePDFBlob = async () => {
    const element = document.querySelector('.quote-document')
    if (!element) {
      throw new Error('No se encontró el documento del presupuesto')
    }

    // Ancho máximo para PDF A4 (210mm a 96 DPI ≈ 794px)
    const PDF_MAX_WIDTH = 794

    // Ocultar modal temporalmente para captura limpia
    const modal = document.querySelector('.modal-overlay')
    const originalModalDisplay = modal ? modal.style.display : null
    if (modal) modal.style.display = 'none'

    // Clonar el elemento
    const clone = element.cloneNode(true)
    clone.id = 'pdf-clone-' + Date.now()
    clone.classList.add('generating-pdf')

    // Aplicar estilos al clon
    clone.style.setProperty('box-sizing', 'border-box', 'important')
    clone.style.setProperty('width', `${PDF_MAX_WIDTH}px`, 'important')
    clone.style.setProperty('max-width', `${PDF_MAX_WIDTH}px`, 'important')
    clone.style.setProperty('background', 'white', 'important')
    clone.style.setProperty('visibility', 'visible', 'important')
    clone.style.setProperty('opacity', '1', 'important')
    clone.style.setProperty('padding', '0', 'important')
    clone.style.setProperty('margin', '0', 'important')
    clone.style.setProperty('overflow', 'visible', 'important')

    // Remover elementos innecesarios del clon
    const closeBtn = clone.querySelector('.modal-close')
    const actions = clone.querySelector('.modal-actions')
    if (closeBtn) closeBtn.remove()
    if (actions) actions.remove()

    // Crear contenedor para el clon
    const container = document.createElement('div')
    container.className = 'pdf-container'
    container.style.cssText = `
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: ${PDF_MAX_WIDTH}px !important;
      max-width: ${PDF_MAX_WIDTH}px !important;
      background: white !important;
      z-index: 99999 !important;
      visibility: visible !important;
      opacity: 1 !important;
      overflow: visible !important;
    `

    container.appendChild(clone)
    document.body.appendChild(container)

    // Agregar estilos CSS para saltos de página
    const style = document.createElement('style')
    style.textContent = `
      #${clone.id} {
        width: ${PDF_MAX_WIDTH}px;
        max-width: ${PDF_MAX_WIDTH}px;
        font-size: 14px;
        box-sizing: border-box;
      }

      /* Saltos de página automáticos */
      #${clone.id} .quote-additional-costs-section {
        page-break-before: always !important;
        break-before: page !important;
        page-break-inside: avoid !important;
      }

      /* Evitar cortes en tablas */
      #${clone.id} .quote-table-container {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      #${clone.id} .quote-table {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      #${clone.id} .quote-table tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      /* Mantener secciones juntas */
      #${clone.id} .quote-summary {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      #${clone.id} .quote-signature-section {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      #${clone.id} .quote-footer-section {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      /* Asegurar que los títulos no queden solos */
      #${clone.id} .quote-table-title {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }

      /* Aumentar espacio entre tabla de materiales y construcción */
      #${clone.id} .quote-table-container {
        margin-bottom: 2rem !important;
      }
      
      /* Espacio adicional antes del título "Construcción y Mano de Obra" cuando viene después de una tabla */
      #${clone.id} .quote-table-container + h3.quote-table-title {
        margin-top: 4rem !important;
        padding-top: 2.5rem !important;
      }

      /* Saltos de línea en descripciones de tablas */
      #${clone.id} .quote-table tbody td:first-child {
        white-space: normal !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        line-height: 1.4 !important;
        hyphens: auto !important;
      }
    `
    clone.appendChild(style)

    // Esperar renderizado inicial para poder calcular alturas
    await new Promise(resolve => setTimeout(resolve, 200))
    clone.offsetHeight // Forzar reflow

    // Calcular altura disponible de una página A4
    // A4: 210mm × 297mm
    // Con márgenes de 10mm cada lado: área útil = 190mm × 277mm
    // A 96 DPI: 1mm ≈ 3.7795px, entonces 277mm ≈ 1047px
    // Usamos 700px como altura máxima (más conservadora) para forzar salto de página antes
    // Esto asegura que haya suficiente espacio y evita cortes
    const PAGE_HEIGHT_MM = 277 // Altura útil en mm (297mm - 10mm arriba - 10mm abajo)
    const MM_TO_PX = 3.7795 // Conversión mm a píxeles a 96 DPI
    const PAGE_HEIGHT_PX = PAGE_HEIGHT_MM * MM_TO_PX // ≈ 1047px
    const PAGE_HEIGHT_SAFE = PAGE_HEIGHT_PX // Altura segura más conservadora (reducida ~300px para más separación)

    // Función auxiliar para calcular altura real de un elemento
    const getElementHeight = (element) => {
      if (!element) return 0
      const rect = element.getBoundingClientRect()
      return rect.height || element.offsetHeight || element.scrollHeight || 0
    }

    // Buscar el título "CONSTRUCCIÓN Y MANO DE OBRA" y su contenedor
    const workTitleElements = clone.querySelectorAll('h3.quote-table-title')
    let workTitleElement = null
    let workTableContainer = null

    workTitleElements.forEach(h3 => {
      const text = h3.textContent || ''
      if (text.includes('Construcción') && text.includes('Mano de Obra')) {
        workTitleElement = h3
        // Buscar el contenedor de la tabla que sigue al título
        // El título está dentro de un fragmento React, buscar el siguiente elemento hermano
        let current = h3.nextElementSibling
        while (current) {
          if (current.classList && current.classList.contains('quote-table-container')) {
            workTableContainer = current
            break
          }
          current = current.nextElementSibling
        }
        // Si no encontramos como hermano, buscar en el padre
        if (!workTableContainer && h3.parentElement) {
          const parent = h3.parentElement
          const tableInParent = parent.querySelector('.quote-table-container')
          if (tableInParent) {
            workTableContainer = tableInParent
          }
        }
      }
    })

    // Calcular si necesita salto de página
    let needsPageBreak = false

    if (workTitleElement) {
      console.log('🔨 Analizando sección "CONSTRUCCIÓN Y MANO DE OBRA"...')

      // Calcular altura acumulada de todo el contenido ANTES de "CONSTRUCCIÓN Y MANO DE OBRA"
      // Recorrer todos los elementos del DOM hasta encontrar el título
      let heightBeforeWork = 0
      let foundWorkTitle = false
      
      // Función recursiva para recorrer el DOM
      const calculateHeightBefore = (element) => {
        if (!element || foundWorkTitle) return 0
        
        // Si encontramos el título, marcar y detener
        if (element === workTitleElement || element.contains(workTitleElement)) {
          foundWorkTitle = true
          return 0
        }
        
        let totalHeight = 0
        
        // Si es un elemento visible (no style, script, etc.)
        if (element.nodeType === 1 && 
            element.tagName !== 'STYLE' && 
            element.tagName !== 'SCRIPT' &&
            !element.classList.contains('pdf-container')) {
          
          // Obtener altura del elemento
          const height = getElementHeight(element)
          
          // Si tiene hijos, calcular recursivamente
          const children = Array.from(element.children)
          let childrenHeight = 0
          
          for (const child of children) {
            if (!foundWorkTitle) {
              childrenHeight += calculateHeightBefore(child)
            } else {
              break
            }
          }
          
          // Si el elemento contiene el título, no sumar su altura completa
          if (element.contains(workTitleElement)) {
            totalHeight = childrenHeight
          } else {
            // Si no contiene el título, sumar su altura
            totalHeight = height
          }
        }
        
        return totalHeight
      }
      
      // Calcular altura desde el inicio del clone
      heightBeforeWork = calculateHeightBefore(clone)
      
      // Método alternativo: recorrer elementos hijos directos
      if (heightBeforeWork === 0 || !foundWorkTitle) {
        foundWorkTitle = false
        heightBeforeWork = 0
        const allChildren = Array.from(clone.children)
        
        for (const child of allChildren) {
          if (foundWorkTitle) break
          
          if (child === workTitleElement || child.contains(workTitleElement)) {
            foundWorkTitle = true
            break
          }
          
          if (child.tagName !== 'STYLE') {
            heightBeforeWork += getElementHeight(child)
          }
        }
      }

      // Calcular altura de la sección "CONSTRUCCIÓN Y MANO DE OBRA" completa
      // Incluir el título y la tabla
      let workSectionHeight = getElementHeight(workTitleElement)
      
      // Buscar la tabla asociada
      if (workTableContainer) {
        workSectionHeight += getElementHeight(workTableContainer)
      } else {
        // Buscar la tabla siguiente al título
        let current = workTitleElement.nextElementSibling
        while (current) {
          if (current.classList && current.classList.contains('quote-table-container')) {
            workSectionHeight += getElementHeight(current)
            break
          }
          current = current.nextElementSibling
        }
      }
      
      // Agregar un margen de seguridad más grande (espacio entre secciones)
      workSectionHeight += 50 // 50px de margen adicional para más separación

      // Calcular altura total si se incluye en la página actual
      const totalHeightIfIncluded = heightBeforeWork + workSectionHeight

      // Calcular espacio disponible en la página actual
      const availableHeight = PAGE_HEIGHT_SAFE - heightBeforeWork
      
   
    
      const requiredAvailableHeight = workSectionHeight 

     
      // Si el contenido total no cabe en una página, forzar salto
      if (totalHeightIfIncluded > PAGE_HEIGHT_SAFE) {
        needsPageBreak = true
        console.log('⚠️ El contenido NO cabe en una página - Se aplicará salto de página')
      } else if (availableHeight < requiredAvailableHeight) {
        // Si no hay suficiente espacio disponible (sección + 300px extra), forzar salto
        needsPageBreak = true
        console.log(`⚠️ No hay suficiente espacio disponible (se necesitan ${requiredAvailableHeight.toFixed(2)}px, hay ${availableHeight.toFixed(2)}px) - Se aplicará salto de página`)
      } else {
        console.log('✅ El contenido cabe en la página actual con suficiente espacio - No se necesita salto de página')
      }
    }

    // Aplicar salto de página solo si es necesario y aumentar espacio
    if (workTitleElement) {
      // Aplicar espacio adicional antes del título "Construcción y Mano de Obra"
      workTitleElement.style.setProperty('margin-top', '4rem', 'important')
      workTitleElement.style.setProperty('padding-top', '2.5rem', 'important')
      
      if (needsPageBreak) {
        console.log('🔨 Aplicando salto de página antes de "CONSTRUCCIÓN Y MANO DE OBRA"...')
        // Aplicar estilos inline para forzar salto de página antes
        workTitleElement.style.setProperty('page-break-before', 'always', 'important')
        workTitleElement.style.setProperty('break-before', 'page', 'important')
        workTitleElement.style.setProperty('page-break-inside', 'avoid', 'important')
        // Agregar atributos para html2pdf.js
        workTitleElement.setAttribute('data-page-break', 'before')
        workTitleElement.setAttribute('data-html2pdf-page-break', 'before')
        workTitleElement.classList.add('html2pdf__page-break')
        console.log('✅ Salto de página aplicado antes de "CONSTRUCCIÓN Y MANO DE OBRA"')
      } else {
        console.log('ℹ️ No se necesita salto de página - El contenido cabe en la página actual')
      }
      console.log('✅ Espacio adicional aplicado antes de "CONSTRUCCIÓN Y MANO DE OBRA"')
    }

    

    // Esperar renderizado
    await new Promise(resolve => setTimeout(resolve, 200))
    clone.offsetHeight // Forzar reflow

    // Esperar a que se carguen recursos
    await waitForResources(clone, 2500)

    // Configuración de html2pdf.js
    const options = {
      margin: [10, 10, 10, 10],
      filename: 'cotizacion.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: PDF_MAX_WIDTH,
        width: PDF_MAX_WIDTH,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true
      },
      enableLinks: false
    }

    try {
      console.log('📄 Generando PDF...')
      console.log('📐 Ancho del documento:', PDF_MAX_WIDTH, 'px')

      // Generar PDF
      const pdfBlob = await html2pdf()
        .set(options)
        .from(clone)
        .toPdf()
        .output('blob')

      if (pdfBlob.size < 5000) {
        throw new Error(`PDF muy pequeño: ${pdfBlob.size} bytes - probablemente vacío`)
      }

      console.log('✅ PDF generado exitosamente:', pdfBlob.size, 'bytes')
      return pdfBlob
    } catch (error) {
      console.error('❌ Error al generar PDF:', error)
      throw error
    } finally {
      // Limpiar
      container.remove()
      if (modal && originalModalDisplay !== null) {
        modal.style.display = originalModalDisplay
      }
      console.log('🧹 Limpiado')
    }
  }

  // Función para generar PDF, descargarlo localmente y subirlo a Supabase Storage
  const generateAndUploadPDF = async (quoteData) => {
    try {
      console.log('🔄 Generando PDF Blob...')
      // 1. Generar el PDF Blob
      const pdfBlob = await generatePDFBlob()
      
      // 2. Generar nombre del archivo
      const clientName = quoteData.formData?.clientName || 'cliente'
      const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9-_]/g, '_')
      const dateStr = new Date().toISOString().split('T')[0]
      const filename = `presupuesto_${sanitizedClientName}_${dateStr}`
      const fullFilename = `${filename}.pdf`
      
      console.log('💾 Descargando PDF localmente...')
      // 3. Descargar PDF localmente para revisión
      downloadPDF(pdfBlob, fullFilename)
      console.log('✅ PDF descargado localmente:', fullFilename)
      
      console.log('☁️ Subiendo PDF a Supabase Storage...')
      // 4. Subir PDF a Supabase Storage
     // const uploadResult = await uploadPDFToStorage(pdfBlob, filename)
      
      if (uploadResult.error) {
        throw new Error('Error al subir PDF a Supabase: ' + uploadResult.error.message)
      }
      
      console.log('✅ PDF subido exitosamente a Supabase')
      console.log('🔗 URL del PDF:', uploadResult.url)
      
      return {
        pdfPath: uploadResult.path,
        pdfUrl: uploadResult.url,
        pdfFilename: fullFilename
      }
    } catch (error) {
      console.error('❌ Error en generateAndUploadPDF:', error)
      throw new Error('Error al generar o subir PDF: ' + error.message)
    }
  }

  // Función para guardar cotización en Supabase y preparar datos para n8n
  const saveCotizacionToDatabase = async (quoteData, pdfInfo) => {
    try {
      const formData = quoteData.formData || {}
      
      // Preparar datos para guardar en la base de datos
      const cotizacionData = {
        cliente_nombre: formData.clientName || '',
        cliente_email: formData.clientEmail || '',
        cliente_telefono: formData.clientPhone || '',
        tipo_piscina: formData.poolType || '',
        largo: parseFloat(formData.length) || null,
        ancho: parseFloat(formData.width) || null,
        profundidad: parseFloat(formData.depth) || null,
        volumen_m3: parseFloat(quoteData.volume) || 0,
        area_ceramica_m2: parseFloat(quoteData.ceramicArea) || 0,
        area_piso_termico_m2: parseFloat(quoteData.thermalFloorArea) || 0,
        tipo_trabajo: formData.workType || '',
        subtotal: parseFloat(quoteData.subtotal) || 0,
        descuento: parseFloat(quoteData.discount) || 0,
        total: parseFloat(quoteData.totalCost) || 0,
        moneda: 'USD',
        pdf_path: pdfInfo.pdfPath,
        pdf_url: pdfInfo.pdfUrl,
        pdf_filename: pdfInfo.pdfFilename,
        notas: formData.additionalNotes || '',
        estado: 'pendiente',
        datos_completos: prepareN8NData(quoteData),
        materiales: quoteData.materialCosts || [],
        trabajos: quoteData.workCosts || [],
        costos_adicionales: quoteData.additionalCosts || []
      }
      
      console.log('💾 Guardando cotización en Supabase...')
      const saveResult = await saveCotizacion(cotizacionData)
      
      if (saveResult.error) {
        throw new Error('Error al guardar cotización: ' + saveResult.error.message)
      }
      
      console.log('✅ Cotización guardada con ID:', saveResult.id)
      return saveResult.id
    } catch (error) {
      console.error('❌ Error al guardar cotización:', error)
      throw error
    }
  }

  // Función para enviar datos a webhook de n8n con referencia al PDF en Supabase
  const sendToN8N = async (quoteData, pdfInfo) => {
    // Obtener URL del webhook desde variables de entorno o usar la por defecto
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://devn8n.zetti.xyz/webhook-test/cotizacion'
    const n8nData = prepareN8NData(quoteData)
    
    // Agregar información del PDF en Supabase (URL pública)
    // n8n puede descargar el PDF desde esta URL
    n8nData.pdfUrl = pdfInfo.pdfUrl
    n8nData.pdfPath = pdfInfo.pdfPath
    n8nData.pdfFilename = pdfInfo.pdfFilename
    
    // Nota: Ya no enviamos el PDF en base64, solo la URL
    // n8n deberá descargar el PDF desde la URL proporcionada
    
    console.log('📤 Enviando datos a webhook:', webhookUrl)
    console.log('📊 Tamaño de datos:', JSON.stringify(n8nData).length, 'caracteres')
    console.log('📄 PDF URL:', pdfInfo.pdfUrl)
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(n8nData),
        signal: AbortSignal.timeout(30000) // 30 segundos de timeout
      })

      console.log('📥 Respuesta recibida:', response.status, response.statusText)

      if (response.ok) {
        const responseData = await response.json().catch(() => ({}))
        console.log('✅ Respuesta exitosa:', responseData)
        alert('✅ Presupuesto guardado y enviado exitosamente a n8n')
        return true
      } else {
        const errorText = await response.text().catch(() => 'Error desconocido')
        console.error('❌ Error del servidor:', response.status, errorText)
        throw new Error(`Error del servidor: ${response.status} - ${errorText.substring(0, 200)}`)
      }
    } catch (error) {
      console.error('❌ Error completo al enviar a n8n:', error)
      
      // Proporcionar mensajes de error más descriptivos
      let errorMessage = 'Error desconocido'
      
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        errorMessage = 'El servidor no respondió a tiempo. Verifica que el webhook esté activo en n8n.'
      } else if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        errorMessage = 'No se pudo conectar al servidor.\n\n' +
          'Verifica:\n' +
          '1. Que el webhook esté activo en n8n\n' +
          '2. Que no haya problemas de red/firewall\n' +
          '3. Revisa la consola (F12) para más detalles'
      } else {
        errorMessage = error.message
      }
      
      throw new Error(errorMessage)
    }
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1>🏊 Pool Smart</h1>
        <p className="subtitle">Cotizador de Piscinas</p>
      </div>

      <div className="form-container">
        <form onSubmit={calculateQuote} className="quote-form">
          <h2 className="form-section-title">Información del Cliente</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="clientName">Nombre Completo</label>
              <input
                type="text"
                id="clientName"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                placeholder="Ej: Juan Pérez"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="clientEmail">Email</label>
              <input
                type="email"
                id="clientEmail"
                name="clientEmail"
                value={formData.clientEmail}
                onChange={handleChange}
                placeholder="Ej: juan@email.com"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="clientPhone">Teléfono</label>
              <input
                type="tel"
                id="clientPhone"
                name="clientPhone"
                value={formData.clientPhone}
                onChange={handleChange}
                placeholder="Ej: (316) 212-3456"
                className="form-input"
                required
              />
            </div>
          </div>

          <h2 className="form-section-title">Tipo de Trabajo</h2>
          <div className="form-group">
            <label htmlFor="workType">Seleccione el tipo de trabajo</label>
            <select
              id="workType"
              name="workType"
              value={formData.workType}
              onChange={handleChange}
              className="form-input"
            >
              <option value="construction">Construcción Nueva</option>
              <option value="repair">Reparación</option>
              <option value="renovation">Renovación</option>
              <option value="maintenance">Mantenimiento</option>
            </select>
          </div>

          <h2 className="form-section-title">Dimensiones de la Piscina</h2>
          <div className="form-group">
            <label htmlFor="poolType">Tipo de Piscina</label>
            <select
              id="poolType"
              name="poolType"
              value={formData.poolType}
              onChange={handleChange}
              className="form-input"
            >
              <option value="rectangular">Rectangular</option>
              <option value="circular">Circular</option>
              <option value="oval">Oval</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="length">
                {formData.poolType === 'rectangular' ? 'Largo (m)' : 'Diámetro Mayor (m)'}
              </label>
              <input
                type="number"
                id="length"
                name="length"
                value={formData.length}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                placeholder="Ej: 10.00"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="width">
                {formData.poolType === 'rectangular' ? 'Ancho (m)' : 'Diámetro Menor (m)'}
              </label>
              <input
                type="number"
                id="width"
                name="width"
                value={formData.width}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                placeholder="Ej: 5.00"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="depth">Profundidad (m)</label>
              <input
                type="number"
                id="depth"
                name="depth"
                value={formData.depth}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                placeholder="Ej: 1.50"
                className="form-input"
                required
              />
            </div>
          </div>

          {formData.workType === 'repair' && (
            <>
              <h2 className="form-section-title">Reparaciones Específicas</h2>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="repairs.leaks"
                    checked={formData.repairs.leaks}
                    onChange={handleChange}
                  />
                  <span>Reparación de filtraciones</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="repairs.cracks"
                    checked={formData.repairs.cracks}
                    onChange={handleChange}
                  />
                  <span>Reparación de grietas</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="repairs.coating"
                    checked={formData.repairs.coating}
                    onChange={handleChange}
                  />
                  <span>Revestimiento</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="repairs.plumbing"
                    checked={formData.repairs.plumbing}
                    onChange={handleChange}
                  />
                  <span>Reparación de plomería</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="repairs.electrical"
                    checked={formData.repairs.electrical}
                    onChange={handleChange}
                  />
                  <span>Reparación eléctrica</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="repairs.cleaning"
                    checked={formData.repairs.cleaning}
                    onChange={handleChange}
                  />
                  <span>Limpieza profunda</span>
                </label>
              </div>
            </>
          )}

          <h2 className="form-section-title">Materiales</h2>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="materials.ceramics"
                checked={formData.materials.ceramics}
                onChange={handleChange}
              />
              <span>Cerámicos</span>
            </label>
            {formData.materials.ceramics && (
              <div className="form-group" style={{ marginLeft: '2rem', marginTop: '0.5rem' }}>
                <label htmlFor="materials.tiles">Calidad de cerámicos</label>
                <select
                  id="materials.tiles"
                  name="materials.tiles"
                  value={formData.materials.tiles}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="standard">Estándar ($50/m²)</option>
                  <option value="premium">Premium ($75/m²)</option>
                  <option value="luxury">Lujo ($120/m²)</option>
                </select>
              </div>
            )}
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="materials.thermalFloor"
                checked={formData.materials.thermalFloor}
                onChange={handleChange}
              />
              <span>Pisos térmicos</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="materials.pump"
                checked={formData.materials.pump}
                onChange={handleChange}
              />
              <span>Bomba de agua</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="materials.filter"
                checked={formData.materials.filter}
                onChange={handleChange}
              />
              <span>Sistema de filtrado</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="materials.lighting"
                checked={formData.materials.lighting}
                onChange={handleChange}
              />
              <span>Iluminación LED</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="materials.heating"
                checked={formData.materials.heating}
                onChange={handleChange}
              />
              <span>Sistema de calefacción</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="materials.cover"
                checked={formData.materials.cover}
                onChange={handleChange}
              />
              <span>Cubierta de seguridad</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="materials.ladder"
                checked={formData.materials.ladder}
                onChange={handleChange}
              />
              <span>Escalera</span>
            </label>
          </div>

          <h2 className="form-section-title">Mano de Obra</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="laborHours">Horas de trabajo (opcional, se calculará automáticamente si se deja vacío)</label>
              <input
                type="number"
                id="laborHours"
                name="laborHours"
                value={formData.laborHours}
                onChange={handleChange}
                step="0.5"
                min="0"
                placeholder="Ej: 40"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="laborRate">Tarifa por hora (USD)</label>
              <input
                type="number"
                id="laborRate"
                name="laborRate"
                value={formData.laborRate}
                onChange={handleChange}
                step="5"
                min="30"
                placeholder="50"
                className="form-input"
              />
            </div>
          </div>

          {formData.workType === 'construction' && (
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="excavation"
                  checked={formData.excavation}
                  onChange={handleChange}
                />
                <span>Incluir excavación</span>
              </label>
            </div>
          )}

          <h2 className="form-section-title">Otros Factores</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="accessDifficulty">Dificultad de acceso</label>
              <select
                id="accessDifficulty"
                name="accessDifficulty"
                value={formData.accessDifficulty}
                onChange={handleChange}
                className="form-input"
              >
                <option value="easy">Fácil</option>
                <option value="normal">Normal</option>
                <option value="difficult">Difícil</option>
              </select>
            </div>
            <div className="form-group">
              <label className="checkbox-label" style={{ marginTop: '1.5rem' }}>
                <input
                  type="checkbox"
                  name="permits"
                  checked={formData.permits}
                  onChange={handleChange}
                />
                <span>Incluir permisos y licencias</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="additionalNotes">Notas adicionales (opcional)</label>
            <textarea
              id="additionalNotes"
              name="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleChange}
              placeholder="Información adicional sobre el proyecto..."
              className="form-input"
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Calcular Cotización
            </button>
            <button type="button" onClick={resetForm} className="btn btn-secondary">
              Limpiar
            </button>
          </div>
        </form>
      </div>

      {showModal && quoteData && (
        <QuoteModal 
          quoteData={quoteData} 
          onClose={closeModal}
          formatCurrency={formatCurrency}
          onEnviar={async () => {
            try {
              // 1. Generar PDF y subirlo a Supabase Storage
              console.log('🔄 Generando y subiendo PDF a Supabase...')
              const pdfInfo = await generateAndUploadPDF(quoteData)
              console.log('✅ PDF subido exitosamente:', pdfInfo.pdfUrl)
              
              // 2. Guardar cotización en la base de datos
              console.log('💾 Guardando cotización en la base de datos...')
              const cotizacionId = await saveCotizacionToDatabase(quoteData, pdfInfo)
              console.log('✅ Cotización guardada con ID:', cotizacionId)
              
              // 3. Enviar datos a n8n con URL del PDF
              console.log('📤 Enviando datos a n8n...')
              await sendToN8N(quoteData, pdfInfo)
            } catch (error) {
              alert('Error al generar, guardar o enviar el presupuesto: ' + error.message)
            }
          }}
        />
      )}
    </div>
  )
}

function QuoteModal({ quoteData, onClose, formatCurrency, onEnviar }) {
  const [isSending, setIsSending] = useState(false)

  const formData = quoteData.formData || {}
  const poolTypeNames = {
    rectangular: 'Rectangular',
    circular: 'Circular',
    oval: 'Oval'
  }

  const handleEnviar = async () => {
    // Mostrar confirmación
    const confirmar = window.confirm(
      '¿Está seguro de enviar el presupuesto?\n\n' +
      'Se generará el PDF y se enviará toda la información al sistema.'
    )

    if (!confirmar) {
      return
    }

    setIsSending(true)
    try {
      console.log('🔄 Generando PDF...')
      await onEnviar()
    } catch (error) {
      console.error('Error en handleEnviar:', error)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="quote-document">
          {/* Header con ondas */}
          <div className="quote-header-wave">
            <div className="quote-header">
              <div className="quote-logo-section">
                <div className="quote-logo">🏊</div>
                <div className="quote-company">
                  <div className="quote-company-label">Nombre de</div>
                  <div className="quote-company-name">tu empresa</div>
                </div>
              </div>
              <div className="quote-date">{quoteData.date}</div>
            </div>
          </div>

          {/* Información del cliente */}
          <div className="quote-client-info">
            <div className="quote-client-name">{formData.clientName}</div>
            {formData.clientEmail && (
              <div className="quote-client-detail">{formData.clientEmail}</div>
            )}
            {formData.clientPhone && (
              <div className="quote-client-detail">{formData.clientPhone}</div>
            )}
          </div>

          {/* Información del proyecto */}
          <div className="quote-project-info">
            <div className="quote-project-detail">
              <strong>Tipo de trabajo:</strong> {
                formData.workType === 'construction' ? 'Construcción Nueva' :
                formData.workType === 'repair' ? 'Reparación' :
                formData.workType === 'renovation' ? 'Renovación' :
                'Mantenimiento'
              }
            </div>
            <div className="quote-project-detail">
              <strong>Piscina:</strong> {poolTypeNames[formData.poolType]} - {formData.length}m × {formData.width}m × {formData.depth}m
            </div>
            <div className="quote-project-detail">
              <strong>Volumen:</strong> {quoteData.volume} m³ | <strong>Área cerámica:</strong> {quoteData.ceramicArea} m²
            </div>
          </div>

          {/* Tabla de materiales */}
          {quoteData.materialCosts && quoteData.materialCosts.length > 0 && (
            <>
              <h3 className="quote-table-title">Materiales</h3>
              <div className="quote-table-container">
                <table className="quote-table">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th>Cantidad</th>
                      <th>Und</th>
                      <th>Precio Unit.</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteData.materialCosts.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Tabla de trabajo */}
          {quoteData.workCosts && quoteData.workCosts.length > 0 && (
            <>
              <h3 className="quote-table-title">Construcción y Mano de Obra</h3>
              <div className="quote-table-container">
                <table className="quote-table">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th>Cantidad</th>
                      <th>Und</th>
                      <th>Precio Unit.</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteData.workCosts.map((item, index) => (
                      <tr key={index}>
                        <td style={{ whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.4' }}>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Tabla de costos adicionales */}
          {quoteData.additionalCosts && quoteData.additionalCosts.length > 0 && (
            <div className="quote-additional-costs-section">
              <h3 className="quote-table-title">Costos Adicionales</h3>
              <div className="quote-table-container">
                <table className="quote-table">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th>Cantidad</th>
                      <th>Und</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteData.additionalCosts.map((item, index) => (
                      <tr key={index}>
                        <td style={{ whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.4' }}>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resumen de costos */}
          <div className="quote-summary">
            <div className="quote-summary-row">
              <span>SUBTOTAL:</span>
              <span>{formatCurrency(quoteData.subtotal)}</span>
            </div>
            {parseFloat(quoteData.discount) > 0 && (
              <div className="quote-summary-row discount">
                <span>DESCUENTO 10%</span>
                <span>{formatCurrency(quoteData.discount)}</span>
              </div>
            )}
            <div className="quote-summary-total">
              <span>TOTAL:</span>
              <span>{formatCurrency(quoteData.totalCost)}</span>
            </div>
          </div>

          {/* Sección de firma - debajo del total */}
          <div className="quote-signature-section">
            <div className="quote-signature">
              <div className="quote-signature-line"></div>
              <div className="quote-signature-id">C.C 0000000000</div>
            </div>
          </div>

          {/* Notas */}
          <div className="quote-footer-section">
            <div className="quote-notes">
              <strong>Nota:</strong> La cotización es válida por 7 días. La fecha de ejecución del servicio se coordinará según disponibilidad.
              {formData.additionalNotes && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Notas adicionales:</strong> {formData.additionalNotes}
                </div>
              )}
            </div>
          </div>

          {/* Footer con ondas */}
          <div className="quote-footer-wave">
            <div className="quote-footer-content">
              {formData.clientPhone && (
                <span className="quote-footer-item">📞 {formData.clientPhone}</span>
              )}
              {formData.clientEmail && (
                <span className="quote-footer-item">✉️ {formData.clientEmail}</span>
              )}
              <span className="quote-footer-item">@poolsmart</span>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button 
            className="btn btn-primary" 
            onClick={handleEnviar}
            disabled={isSending}
            style={{ 
              flex: 1,
              opacity: isSending ? 0.6 : 1,
              cursor: isSending ? 'not-allowed' : 'pointer'
            }}
          >
            {isSending ? 'Enviando...' : 'Enviar'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={isSending}
            style={{ 
              flex: 1,
              opacity: isSending ? 0.6 : 1,
              cursor: isSending ? 'not-allowed' : 'pointer'
            }}
          >
            Editar
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
