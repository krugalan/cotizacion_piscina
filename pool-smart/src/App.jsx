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
    permits: false,
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
      permits: false,
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

  // Función para previsualizar PDF en un modal
  const previewPDF = (pdfBlob) => {
    return new Promise((resolve, reject) => {
      try {
        const pdfUrl = URL.createObjectURL(pdfBlob)
        
        // Crear modal de previsualización
        const previewModal = document.createElement('div')
        previewModal.className = 'pdf-preview-modal'
        previewModal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          z-index: 100000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
        `
        
        const previewContent = document.createElement('div')
        previewContent.style.cssText = `
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 900px;
          height: 90%;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `
        
        const previewHeader = document.createElement('div')
        previewHeader.style.cssText = `
          padding: 15px 20px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        `
        
        const previewTitle = document.createElement('h3')
        previewTitle.textContent = 'Vista Previa del PDF'
        previewTitle.style.cssText = `
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        `
        
        const closePreviewBtn = document.createElement('button')
        closePreviewBtn.textContent = '✕'
        closePreviewBtn.style.cssText = `
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          width: 32px;
          height: 32px;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        `
        
        const previewActions = document.createElement('div')
        previewActions.style.cssText = `
          padding: 15px 20px;
          border-top: 1px solid #e0e0e0;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        `
        
        const cancelBtn = document.createElement('button')
        cancelBtn.textContent = 'Cancelar'
        cancelBtn.style.cssText = `
          padding: 10px 20px;
          background: #757575;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        `
        
        const confirmBtn = document.createElement('button')
        confirmBtn.textContent = 'Confirmar y Enviar'
        confirmBtn.style.cssText = `
          padding: 10px 20px;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        `
        
        const iframe = document.createElement('iframe')
        iframe.src = pdfUrl
        iframe.style.cssText = `
          width: 100%;
          flex: 1;
          border: none;
        `
        
        previewHeader.appendChild(previewTitle)
        previewHeader.appendChild(closePreviewBtn)
        previewContent.appendChild(previewHeader)
        previewContent.appendChild(iframe)
        previewActions.appendChild(cancelBtn)
        previewActions.appendChild(confirmBtn)
        previewContent.appendChild(previewActions)
        previewModal.appendChild(previewContent)
        document.body.appendChild(previewModal)
        
        const cleanup = () => {
          URL.revokeObjectURL(pdfUrl)
          if (previewModal.parentNode) {
            previewModal.parentNode.removeChild(previewModal)
          }
        }
        
        closePreviewBtn.onclick = () => {
          cleanup()
          reject(new Error('Previsualización cancelada por el usuario'))
        }
        
        cancelBtn.onclick = () => {
          cleanup()
          reject(new Error('Previsualización cancelada por el usuario'))
        }
        
        confirmBtn.onclick = () => {
          cleanup()
          resolve(pdfBlob)
        }
        
        // Cerrar con ESC
        const handleEsc = (e) => {
          if (e.key === 'Escape') {
            cleanup()
            document.removeEventListener('keydown', handleEsc)
            reject(new Error('Previsualización cancelada por el usuario'))
          }
        }
        document.addEventListener('keydown', handleEsc)
        
      } catch (error) {
        console.error('❌ Error creando previsualización:', error)
        reject(error)
      }
    })
  }

  // Función para generar PDF (solo genera el Blob, sin convertir a base64)
  const generatePDFBlob = async () => {
    const element = document.querySelector('.quote-document')
    if (!element) {
      throw new Error('No se encontró el documento del presupuesto')
    }

    // Calcular ancho máximo para PDF A4
    // A4: 210mm × 297mm
    // Con márgenes de 10mm cada lado: área útil = 190mm × 277mm
    // A 96 DPI: 1mm ≈ 3.7795px, entonces 190mm ≈ 718px
    // Usamos 794px como ancho máximo (210mm a 96 DPI) para mantener proporciones
    const PDF_MAX_WIDTH = 794 // Ancho máximo para A4 en píxeles
    
    // Ocultar modal temporalmente para captura limpia
    const modal = document.querySelector('.modal-overlay')
    const originalModalDisplay = modal ? modal.style.display : null
    if (modal) modal.style.display = 'none'

    // Clonar el elemento
    const clone = element.cloneNode(true)
    clone.id = 'pdf-clone-' + Date.now()
    clone.classList.add('generating-pdf')
    
    // Aplicar estilos responsive para PDF
    // Usamos el ancho máximo del PDF pero con estilos que se adapten
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
    
    // Crear contenedor para el clon con estilos forzados
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
    
    // Aplicar estilos responsive para PDF que mantengan las secciones juntas
    const tempStyle = document.createElement('style')
    tempStyle.textContent = `
      #${clone.id} {
        width: ${PDF_MAX_WIDTH}px;
        max-width: ${PDF_MAX_WIDTH}px;
        font-size: 14px;
        box-sizing: border-box;
      }
      
      /* Asegurar que las secciones no se corten */
      #${clone.id} .quote-table-container {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      #${clone.id} .quote-additional-costs-section {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      /* Mantener tablas juntas */
      #${clone.id} .quote-table {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      /* Mantener filas de tabla juntas */
      #${clone.id} .quote-table tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      /* Asegurar que los títulos de sección no queden solos */
      #${clone.id} .quote-table-title {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    `
    clone.appendChild(tempStyle)
    
    // Esperar renderizado inicial
    await new Promise(resolve => setTimeout(resolve, 200))
    clone.offsetHeight // Forzar reflow
    
    const additionalCostsSection = clone.querySelector('.quote-additional-costs-section')
    let needsPageBreak = false
    
    // Función auxiliar para calcular altura real de un elemento
    const getElementHeight = (element) => {
      if (!element) return 0
      const rect = element.getBoundingClientRect()
      return rect.height || element.offsetHeight || element.scrollHeight || 0
    }
    
    // Calcular altura útil de una página A4 en píxeles
    // A4: 210mm × 297mm
    // Con márgenes de 10mm (0.5cm): área útil = 190mm × 277mm
    // A 96 DPI: 1mm ≈ 3.78px, entonces 277mm ≈ 1047px
    // Usamos 950px como umbral conservador para una página
    const PAGE_HEIGHT_PX = 950
    
    if (additionalCostsSection) {
      // Encontrar el índice de la sección de costos adicionales
      const allSections = Array.from(clone.children)
      const additionalIndex = allSections.findIndex(el => 
        el.classList.contains('quote-additional-costs-section')
      )
      
      if (additionalIndex > 0) {
        // Calcular altura acumulada de todas las secciones ANTES de "COSTOS ADICIONALES"
        let heightBeforeAdditional = 0
        for (let i = 0; i < additionalIndex; i++) {
          const section = allSections[i]
          heightBeforeAdditional += getElementHeight(section)
        }
        
        // Calcular altura de "COSTOS ADICIONALES" y todo lo que sigue
        let heightAfterAdditional = 0
        for (let i = additionalIndex; i < allSections.length; i++) {
          const section = allSections[i]
          heightAfterAdditional += getElementHeight(section)
        }
        
        // Calcular altura total del documento
        const totalDocHeight = heightBeforeAdditional + heightAfterAdditional
        
        // Validar si necesita dos páginas:
        // 1. Si el contenido antes de "COSTOS ADICIONALES" supera una página
        // 2. Si el documento completo supera una página Y existe sección de costos adicionales
        needsPageBreak = (heightBeforeAdditional > PAGE_HEIGHT_PX) || 
                         (totalDocHeight > PAGE_HEIGHT_PX && heightAfterAdditional > 0)
        
        console.log('📏 Validación de salto de página:')
        console.log('  - Altura antes de COSTOS ADICIONALES:', heightBeforeAdditional, 'px')
        console.log('  - Altura de COSTOS ADICIONALES y siguientes:', heightAfterAdditional, 'px')
        console.log('  - Altura total del documento:', totalDocHeight, 'px')
        console.log('  - Altura máxima por página:', PAGE_HEIGHT_PX, 'px')
        console.log('  - Necesita salto de página:', needsPageBreak)
        
        if (needsPageBreak) {
          console.log('📄 Se aplicará salto de página antes de COSTOS ADICIONALES')
        }
      }
    } else {
      // Si no hay sección de costos adicionales, verificar si el documento completo necesita dos páginas
      const totalDocHeight = getElementHeight(clone)
      if (totalDocHeight > PAGE_HEIGHT_PX) {
        // Si no hay costos adicionales pero el documento es largo,
        // buscar la sección de resumen (quote-summary) para aplicar el salto ahí
        const summarySection = clone.querySelector('.quote-summary')
        if (summarySection) {
          const allSections = Array.from(clone.children)
          const summaryIndex = allSections.findIndex(el => 
            el.classList.contains('quote-summary')
          )
          
          if (summaryIndex > 0) {
            let heightBeforeSummary = 0
            for (let i = 0; i < summaryIndex; i++) {
              heightBeforeSummary += getElementHeight(allSections[i])
            }
            
            // Si el contenido antes del resumen supera una página, necesitamos salto
            if (heightBeforeSummary > PAGE_HEIGHT_PX) {
              needsPageBreak = true
              console.log('📄 Documento largo sin costos adicionales: salto antes del resumen')
            }
          }
        }
      }
    }
    
    // Inyectar estilos EXACTOS del original
    const style = document.createElement('style')
    style.textContent = `
    @page {
    size: A4;
    margin: 0.5cm;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    text-indent: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  
  #${clone.id} {
    font-family: "Segoe UI", sans-serif;
    width: 794px;
    background: white !important;
    color: #333;
    font-size: 11pt;
    line-height: 1.4;
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 1cm);
  }
  
  /* Header Wave - compacto */
  #${clone.id} .quote-header-wave {
    background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%) !important;
    padding: 0.75rem 1.5rem !important;
    color: white !important;
    margin-bottom: 0 !important;
    flex-shrink: 0;
  }
  
  #${clone.id} .quote-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  
  #${clone.id} .quote-logo-section {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }
  
  #${clone.id} .quote-logo {
    font-size: 1.5rem !important;
    width: 35px !important;
    height: 35px !important;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 8px;
  }
  
  #${clone.id} .quote-company {
    color: white !important;
  }
  
  #${clone.id} .quote-company-label {
    color: white !important;
    font-family: "Segoe UI Semibold", sans-serif;
    font-size: 0.7rem !important;
    font-weight: 600;
    margin-bottom: 2px;
  }
  
  #${clone.id} .quote-company-name {
    color: white !important;
    font-family: "Segoe UI Semibold", sans-serif;
    font-size: 0.95rem !important;
    font-weight: 600;
  }
  
  #${clone.id} .quote-date {
    color: white !important;
    font-family: "Segoe UI Semibold", sans-serif;
    font-size: 0.8rem !important;
    font-weight: 500;
  }
  
  /* Client Info - compacto */
  #${clone.id} .quote-client-info {
    padding: 0.75rem 1.5rem 0.5rem !important;
    background: white !important;
    flex-shrink: 0;
  }
  
  #${clone.id} .quote-client-name {
    color: #333;
    font-family: "Segoe UI", sans-serif;
    font-size: 1rem !important;
    font-weight: bold;
    margin-bottom: 0.25rem !important;
  }
  
  #${clone.id} .quote-client-detail {
    color: #666;
    font-family: "Segoe UI", sans-serif;
    font-size: 0.75rem !important;
    line-height: 1.3;
    margin-top: 0.1rem !important;
  }
  
  /* Project Info - compacto */
  #${clone.id} .quote-project-info {
    padding: 0.5rem 1.5rem !important;
    background: #f5f7fa !important;
    border-top: 1px solid #e0e0e0 !important;
    border-bottom: 1px solid #e0e0e0 !important;
    flex-shrink: 0;
    page-break-inside: avoid;
  }
  
  #${clone.id} .quote-project-detail {
    color: #333;
    font-family: "Segoe UI", sans-serif;
    font-size: 0.75rem !important;
    line-height: 1.3 !important;
    margin-bottom: 0.25rem !important;
  }
  
  #${clone.id} .quote-project-detail:last-child {
    margin-bottom: 0 !important;
  }
  
  #${clone.id} .quote-project-detail strong {
    color: #333;
    font-weight: bold;
  }
  
  /* Table Title - compacto */
  #${clone.id} .quote-table-title {
    color: #1D3A5E;
    font-family: "Segoe UI", sans-serif;
    font-size: 0.85rem !important;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    padding: 0.5rem 1.5rem 0.25rem !important;
    margin-bottom: 0 !important;
    flex-shrink: 0;
  }
  
  /* Table Container - compacto */
  #${clone.id} .quote-table-container {
    padding: 0 1.5rem !important;
    margin-bottom: 0.5rem !important;
    flex-shrink: 0;
    page-break-inside: avoid;
  }
  
  /* Table */
  #${clone.id} .quote-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.7rem !important;
    table-layout: fixed !important; /* Fijar layout para respetar anchos de columnas */
  }
  
  #${clone.id} .quote-table thead {
    background: #1e3a5f !important;
    color: white !important;
  }
  
  #${clone.id} .quote-table th {
    background: #1e3a5f !important;
    color: white !important;
    font-family: "Segoe UI Semibold", sans-serif;
    font-size: 0.7rem !important;
    font-weight: 600 !important;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    padding: 0.4rem 0.5rem !important;
    text-align: left;
  }
  
  #${clone.id} .quote-table th:nth-child(2),
  #${clone.id} .quote-table th:nth-child(4),
  #${clone.id} .quote-table th:nth-child(5) {
    text-align: right;
  }
  
  #${clone.id} .quote-table tbody tr {
    border-bottom: 1px solid #e0e0e0 !important;
  }
  
  #${clone.id} .quote-table tbody tr:nth-child(even) {
    background: #f9f9f9 !important;
  }
  
  #${clone.id} .quote-table td {
    color: #333 !important;
    font-family: "Segoe UI", sans-serif;
    font-size: 0.7rem !important;
    padding: 0.4rem 0.5rem !important;
  }
  
  #${clone.id} .quote-table td:first-child {
    font-weight: normal;
  }
  
  #${clone.id} .quote-table td:nth-child(2),
  #${clone.id} .quote-table td:nth-child(4),
  #${clone.id} .quote-table td:nth-child(5) {
    text-align: right;
  }
  
  /* Anchos de columnas para tablas de 5 columnas */
  #${clone.id} .quote-table th:nth-child(1),
  #${clone.id} .quote-table td:nth-child(1) {
    width: 32% !important; /* Descripción */
  }
  
  #${clone.id} .quote-table th:nth-child(2),
  #${clone.id} .quote-table td:nth-child(2) {
    width: 12% !important; /* Cantidad */
  }
  
  /* Columna UND (3ra columna) - evitar cortes de texto */
  #${clone.id} .quote-table th:nth-child(3),
  #${clone.id} .quote-table td:nth-child(3) {
    width: 15% !important;
    white-space: nowrap !important;
    min-width: 80px !important;
    overflow: visible !important;
  }
  
  #${clone.id} .quote-table th:nth-child(4),
  #${clone.id} .quote-table td:nth-child(4) {
    width: 18% !important; /* Precio Unit. */
  }
  
  #${clone.id} .quote-table th:nth-child(5),
  #${clone.id} .quote-table td:nth-child(5) {
    width: 23% !important; /* Total */
  }
  
  /* Anchos de columnas para tablas de 4 columnas (Costos Adicionales) */
  #${clone.id} .quote-table-additional th:nth-child(1),
  #${clone.id} .quote-table-additional td:nth-child(1) {
    width: 42% !important; /* Descripción */
  }
  
  #${clone.id} .quote-table-additional th:nth-child(2),
  #${clone.id} .quote-table-additional td:nth-child(2) {
    width: 15% !important; /* Cantidad */
  }
  
  /* Tablas de 4 columnas (Costos Adicionales) - columna UND */
  #${clone.id} .quote-table-additional th:nth-child(3),
  #${clone.id} .quote-table-additional td:nth-child(3) {
    width: 18% !important;
    white-space: nowrap !important;
    min-width: 90px !important;
    overflow: visible !important;
  }
  
  #${clone.id} .quote-table-additional th:nth-child(4),
  #${clone.id} .quote-table-additional td:nth-child(4) {
    width: 25% !important; /* Total */
  }
  
  #${clone.id} .quote-table td:last-child {
    color: #333;
    font-family: "Segoe UI Semibold", sans-serif;
    font-weight: 600;
  }
  
  /* Summary - compacto */
  #${clone.id} .quote-summary {
    padding: 0 1.5rem !important;
    margin-bottom: 0.5rem !important;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem !important;
    flex-shrink: 0;
    page-break-inside: avoid;
  }
  
  #${clone.id} .quote-summary-row {
    display: flex;
    justify-content: space-between;
    width: 250px !important;
    padding: 0.25rem 0 !important;
    color: #333;
    font-family: "Segoe UI", sans-serif;
    font-size: 0.75rem !important;
  }
  
  #${clone.id} .quote-summary-row span:first-child {
    font-weight: bold;
  }
  
  #${clone.id} .quote-summary-row span:last-child {
    text-align: right;
    font-weight: 600;
  }
  
  #${clone.id} .quote-summary-total {
    display: flex;
    justify-content: space-between;
    width: 250px !important;
    padding: 0.5rem !important;
    background: #1e3a5f !important;
    color: white !important;
    font-family: "Segoe UI Semibold", sans-serif;
    font-size: 0.9rem !important;
    font-weight: bold;
    border-radius: 3px;
    margin-top: 0.25rem !important;
  }
  
  /* Signature Section - compacto */
  #${clone.id} .quote-signature-section {
    padding: 3rem 1.5rem 1rem;
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
    page-break-inside: avoid;
  }
  
  #${clone.id} .quote-signature {
    text-align: center;
    width: 250px;
    min-width: 150px !important;
  }
  
  #${clone.id} .quote-signature-line {
    width: 150px !important;
    height: 1px !important;
    background: #333;
    margin: 0 auto 0.25rem;
  }
  
  #${clone.id} .quote-signature-id {
    color: #666;
    font-family: "Segoe UI", sans-serif;
    font-size: 0.65rem !important;
  }
  
  /* Footer Section - compacto */
  #${clone.id} .quote-footer-section {
    padding: 0 1.5rem 0.5rem !important;
    gap: 0.75rem !important;
    flex-shrink: 0;
    page-break-inside: avoid;
  }
  
  #${clone.id} .quote-notes {
    color: #666;
    font-family: "Segoe UI", sans-serif;
    font-size: 0.7rem !important;
    line-height: 1.4 !important;
  }
  
  #${clone.id} .quote-notes strong {
    color: #333;
    font-weight: bold;
  }
  
  /* Footer Wave - compacto */
  #${clone.id} .quote-footer-wave {
    background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%) !important;
    padding: 0.75rem 1.5rem !important;
    color: white !important;
    margin-top: auto !important;
    margin-bottom: 0 !important;
    flex-shrink: 0;
    page-break-before: avoid;
  }
  
  #${clone.id} .quote-footer-content {
    display: flex;
    justify-content: center;
    gap: 1rem !important;
    flex-wrap: wrap;
    color: white !important;
    font-family: "Segoe UI", sans-serif;
    font-size: 0.7rem !important;
  }
  
  #${clone.id} .quote-footer-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: white !important;
  }
  
  /* CONDICIONAL: Salto de página antes de COSTOS ADICIONALES cuando se necesitan 2+ páginas */
  ${needsPageBreak ? `
  /* Forzar salto de página antes de COSTOS ADICIONALES - Inicio de página 2 */
  #${clone.id} .quote-additional-costs-section {
    page-break-before: always !important;
    break-before: page !important;
    page-break-inside: avoid !important;
    padding-top: 0.5rem;
    margin-top: 0 !important;
  }
  
  /* RESUMEN: Asegurar que va después de COSTOS ADICIONALES en la misma página 2 */
  #${clone.id} .quote-summary {
    page-break-before: avoid !important;
    page-break-after: avoid !important;
    page-break-inside: avoid !important;
  }
  
  /* FIRMA: Asegurar que va después del resumen en la misma página 2 */
  #${clone.id} .quote-signature-section {
    page-break-before: avoid !important;
    page-break-after: avoid !important;
    page-break-inside: avoid !important;
  }
  
  /* FOOTER (notas): Asegurar que va después de la firma en la misma página 2 */
  #${clone.id} .quote-footer-section {
    page-break-before: avoid !important;
    page-break-after: avoid !important;
    page-break-inside: avoid !important;
  }
  
  /* FOOTER WAVE: Asegurar que va al final en la misma página 2 */
  #${clone.id} .quote-footer-wave {
    page-break-before: avoid !important;
    page-break-inside: avoid !important;
  }
  
  /* Regla general: Todo lo que sigue a COSTOS ADICIONALES debe estar en la misma página */
  #${clone.id} .quote-additional-costs-section ~ .quote-summary,
  #${clone.id} .quote-additional-costs-section ~ .quote-signature-section,
  #${clone.id} .quote-additional-costs-section ~ .quote-footer-section,
  #${clone.id} .quote-additional-costs-section ~ .quote-footer-wave {
    page-break-before: avoid !important;
  }
  ` : `
  /* Sin salto de página: mantener todo junto si cabe en una página */
  #${clone.id} .quote-additional-costs-section {
    page-break-inside: avoid !important;
  }
  `}
`

    clone.appendChild(style)
    container.appendChild(clone)
    document.body.appendChild(container)
    
    // Esperar a que se carguen todas las imágenes y fuentes antes de medir
    await waitForResources(clone, 2500)
    await new Promise(r => setTimeout(r, 150)) // pequeño buffer extra
    clone.offsetHeight // Forzar reflow
    
    // Recalcular needsPageBreak después de aplicar estilos con mediciones precisas
    const recalculatedAdditionalCosts = clone.querySelector('.quote-additional-costs-section')
    
    if (recalculatedAdditionalCosts) {
      const allSections = Array.from(clone.children)
      const additionalIndex = allSections.findIndex(el => 
        el.classList.contains('quote-additional-costs-section')
      )
      
      if (additionalIndex > 0) {
        // Recalcular con estilos aplicados
        let heightBeforeAdditional = 0
        for (let i = 0; i < additionalIndex; i++) {
          heightBeforeAdditional += getElementHeight(allSections[i])
        }
        
        let heightAfterAdditional = 0
        for (let i = additionalIndex; i < allSections.length; i++) {
          heightAfterAdditional += getElementHeight(allSections[i])
        }
        
        const totalDocHeight = heightBeforeAdditional + heightAfterAdditional
        const shouldBreak = (heightBeforeAdditional > PAGE_HEIGHT_PX) || 
                           (totalDocHeight > PAGE_HEIGHT_PX && heightAfterAdditional > 0)
        
        // Si antes no detectó pero ahora sí, actualizar
        if (shouldBreak && !needsPageBreak) {
          needsPageBreak = true
          console.log('🔄 Recalculado: Necesita salto de página después de aplicar estilos')
          console.log('  - Altura recalculada antes de COSTOS ADICIONALES:', heightBeforeAdditional, 'px')
          console.log('  - Altura total recalculada:', totalDocHeight, 'px')
        } else if (shouldBreak) {
          // Ya estaba marcado, pero confirmar
          console.log('✅ Confirmado: Salto de página necesario')
        }
        
        console.log('📏 Validación final después de aplicar estilos:')
        console.log('  - Altura antes de COSTOS ADICIONALES:', heightBeforeAdditional, 'px')
        console.log('  - Altura total del documento:', totalDocHeight, 'px')
        console.log('  - Necesita salto de página (final):', needsPageBreak || shouldBreak)
      }
    }
    
    // APLICAR ESTILOS INLINE Y ATRIBUTOS DIRECTAMENTE A LOS ELEMENTOS para que html2pdf.js los respete
    if (needsPageBreak) {
      console.log('🎨 Aplicando estilos inline directamente a los elementos...')
      
      // Aplicar estilos inline y atributos al elemento de COSTOS ADICIONALES
      if (recalculatedAdditionalCosts) {
        // Estilos inline
        recalculatedAdditionalCosts.style.setProperty('page-break-before', 'always', 'important')
        recalculatedAdditionalCosts.style.setProperty('break-before', 'page', 'important')
        recalculatedAdditionalCosts.style.setProperty('page-break-inside', 'avoid', 'important')
        // Atributos para html2pdf.js
        recalculatedAdditionalCosts.setAttribute('data-page-break', 'before')
        recalculatedAdditionalCosts.setAttribute('data-html2pdf-page-break', 'before')
        recalculatedAdditionalCosts.classList.add('html2pdf__page-break')
        console.log('  ✅ Estilos y atributos aplicados a COSTOS ADICIONALES')
      }
      
      // Aplicar estilos inline a las secciones siguientes para mantenerlas juntas
      const summarySection = clone.querySelector('.quote-summary')
      const signatureSection = clone.querySelector('.quote-signature-section')
      const footerSection = clone.querySelector('.quote-footer-section')
      const footerWave = clone.querySelector('.quote-footer-wave')
      
      if (summarySection) {
        summarySection.style.setProperty('page-break-before', 'avoid', 'important')
        summarySection.style.setProperty('page-break-after', 'avoid', 'important')
        summarySection.style.setProperty('page-break-inside', 'avoid', 'important')
        summarySection.setAttribute('data-page-break', 'avoid')
        console.log('  ✅ Estilos aplicados a RESUMEN')
      }
      
      if (signatureSection) {
        signatureSection.style.setProperty('page-break-before', 'avoid', 'important')
        signatureSection.style.setProperty('page-break-after', 'avoid', 'important')
        signatureSection.style.setProperty('page-break-inside', 'avoid', 'important')
        signatureSection.setAttribute('data-page-break', 'avoid')
        console.log('  ✅ Estilos aplicados a FIRMA')
      }
      
      if (footerSection) {
        footerSection.style.setProperty('page-break-before', 'avoid', 'important')
        footerSection.style.setProperty('page-break-after', 'avoid', 'important')
        footerSection.style.setProperty('page-break-inside', 'avoid', 'important')
        footerSection.setAttribute('data-page-break', 'avoid')
        console.log('  ✅ Estilos aplicados a FOOTER')
      }
      
      if (footerWave) {
        footerWave.style.setProperty('page-break-before', 'avoid', 'important')
        footerWave.style.setProperty('page-break-inside', 'avoid', 'important')
        footerWave.setAttribute('data-page-break', 'avoid')
        console.log('  ✅ Estilos aplicados a FOOTER WAVE')
      }
      
      // Agregar un estilo adicional al contenedor para asegurar que html2pdf respete los saltos
      const additionalStyleForHtml2pdf = document.createElement('style')
      additionalStyleForHtml2pdf.textContent = `
        .html2pdf__page-break {
          page-break-before: always !important;
          break-before: page !important;
        }
      `
      clone.appendChild(additionalStyleForHtml2pdf)
      
      // Reforzar atributos de page-break con estilos inline
      clone.querySelectorAll('[data-page-break]').forEach(el => {
        const breakValue = el.getAttribute('data-page-break')
        if (breakValue === 'before') {
          el.style.setProperty('page-break-before', 'always', 'important')
          el.style.setProperty('break-before', 'page', 'important')
        } else if (breakValue === 'avoid') {
          el.style.setProperty('page-break-before', 'avoid', 'important')
          el.style.setProperty('page-break-after', 'avoid', 'important')
          el.style.setProperty('page-break-inside', 'avoid', 'important')
        }
      })
      
      console.log('✅ Atributos de page-break reforzados con estilos inline')
      
      // Esperar un momento para que los estilos inline se apliquen
      await new Promise(resolve => setTimeout(resolve, 300))
      clone.offsetHeight // Forzar reflow final
    }
    
    // Asegurar que las opciones de html2canvas sean coherentes con el ancho del clone
    const widthPx = clone.offsetWidth || 794
    console.log(`📐 Ancho del clone para html2canvas: ${widthPx}px`)
    
    const options = {
      margin: [10, 10, 10, 10],
      filename: 'cotizacion.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: widthPx,
        width: widthPx,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true
      },
      pagebreak: {
        mode: ['css', 'legacy', 'avoid-all'],
        // Evitar saltos dentro de estas secciones
        avoid: [
          '.quote-table-container', 
          '.quote-summary', 
          '.quote-header-wave', 
          '.quote-footer-wave',
          '.quote-additional-costs-section',
          '.quote-signature-section',
          '.quote-footer-section',
          '.quote-project-info',
          '.quote-client-info',
          '[data-page-break="avoid"]'
        ],
        // Forzar salto antes de COSTOS ADICIONALES cuando se necesita
        // Usar tanto el selector CSS como la clase especial
        before: needsPageBreak ? [
          '.quote-additional-costs-section',
          '.html2pdf__page-break',
          '[data-page-break="before"]',
          '[data-html2pdf-page-break="before"]'
        ] : [],
        // Evitar saltos después de estas secciones para mantenerlas juntas
        after: needsPageBreak ? [] : []
      },
      // Configuración adicional para mejorar el manejo de saltos de página
      enableLinks: false
    }

    try {
      console.log('📄 ===== INICIANDO GENERACIÓN DE PDF =====')
      console.log('📐 Dimensiones del documento:', clone.offsetWidth, 'x', clone.offsetHeight, 'px')
      console.log('📏 Validación de salto de página:', needsPageBreak ? '✅ ACTIVADO' : '❌ NO NECESARIO')
      
      let pdfBlob
      
      if (needsPageBreak) {
        console.log('📑 Generando PDF con salto de página manual (dos páginas separadas)')
        console.log('📋 Estructura esperada:')
        console.log('   Página 1: Header, Info Cliente, Info Proyecto, Tablas Materiales y Trabajo')
        console.log('   Página 2: COSTOS ADICIONALES → Resumen → Firma → Footer → Footer Wave')
        
        // Declarar variables fuera del try para que estén disponibles en el catch
        let tempContainer = null
        let page1Container = null
        let page2Container = null
        
        try {
          // El clone ya está en el DOM con estilos aplicados
          // Esperar un momento adicional para asegurar que todo esté renderizado
          await new Promise(resolve => setTimeout(resolve, 100))
          clone.offsetHeight // Forzar reflow
          
          // DIVIDIR EL CONTENIDO EN DOS PARTES
          // IMPORTANTE: Incluir TODOS los hijos, incluso los estilos, para mantener la estructura
          const allSections = Array.from(clone.children)
          
          // Función para encontrar el índice de inicio de una sección por su título
          // Busca el h3 con el título, que es el primer elemento de la sección
          const findSectionIndex = (titleText) => {
            for (let i = 0; i < allSections.length; i++) {
              const section = allSections[i]
              
              // Si es un h3 con el título, ese es el inicio
              if (section.tagName === 'H3' && section.classList.contains('quote-table-title')) {
                const text = section.textContent || ''
                if (text.includes(titleText)) {
                  console.log(`   ✅ Encontrado título "${titleText}" en índice ${i} (${section.tagName})`)
                  return i
                }
              }
              
              // También buscar en el texto del elemento
              const sectionText = section.textContent || ''
              if (sectionText.includes(titleText) && !sectionText.includes('COSTOS ADICIONALES')) {
                // Verificar que no sea solo una coincidencia parcial
                if (titleText === 'Materiales' && sectionText.includes('Materiales') && !sectionText.includes('Construcción')) {
                  console.log(`   ✅ Encontrado "${titleText}" en índice ${i} (${section.tagName || section.className})`)
                  return i
                }
                if (titleText === 'Construcción y Mano de Obra' && sectionText.includes('Construcción') && sectionText.includes('Mano de Obra')) {
                  console.log(`   ✅ Encontrado "${titleText}" en índice ${i} (${section.tagName || section.className})`)
                  return i
                }
              }
            }
            console.warn(`   ⚠️ No se encontró la sección "${titleText}"`)
            return -1
          }
          
          // Encontrar índices de las secciones principales
          console.log('🔍 ===== DEBUG: ANALIZANDO ESTRUCTURA DEL DOCUMENTO =====')
          console.log(`   Total de elementos hijos directos de .quote-document: ${allSections.length}`)
          console.log('   Lista completa de elementos:')
          allSections.forEach((section, idx) => {
            const tag = section.tagName || 'unknown'
            const className = section.className || 'sin clase'
            const id = section.id || 'sin id'
            const textPreview = (section.textContent || '').substring(0, 60).replace(/\n/g, ' ')
            
            // Detectar si es parte de CONSTRUCCIÓN Y MANO DE OBRA
            const isWorkSection = textPreview.includes('Construcción') || 
                                 textPreview.includes('Mano de Obra') ||
                                 className.includes('work') ||
                                 (tag === 'H3' && textPreview.includes('CONSTRUCCIÓN'))
            
            const marker = isWorkSection ? '🔨' : '  '
            console.log(`   ${marker}[${idx}] ${tag}.${className}${id ? '#' + id : ''} - "${textPreview}..."`)
            
            // Si es un h3, verificar si el siguiente elemento es un div con tabla
            if (tag === 'H3' && section.classList.contains('quote-table-title')) {
              const nextIdx = idx + 1
              if (nextIdx < allSections.length) {
                const nextEl = allSections[nextIdx]
                console.log(`      └─ Siguiente elemento [${nextIdx}]: ${nextEl.tagName}.${nextEl.className || 'sin clase'}`)
              }
            }
          })
          
          const materialsIndex = findSectionIndex('Materiales')
          const workIndex = findSectionIndex('Construcción y Mano de Obra')
          const additionalIndex = allSections.findIndex(el => 
            el.classList && el.classList.contains('quote-additional-costs-section')
          )
          
          console.log('📋 Índices de secciones encontrados:')
          console.log(`   MATERIALES: ${materialsIndex}`)
          console.log(`   CONSTRUCCIÓN Y MANO DE OBRA: ${workIndex}`)
          console.log(`   COSTOS ADICIONALES: ${additionalIndex}`)
          
          // DEBUG: Verificar qué elementos hay entre workIndex y additionalIndex
          if (workIndex !== -1 && additionalIndex !== -1) {
            console.log(`🔨 DEBUG: Elementos entre CONSTRUCCIÓN Y MANO DE OBRA (${workIndex}) y COSTOS ADICIONALES (${additionalIndex}):`)
            for (let i = workIndex; i < additionalIndex; i++) {
              const el = allSections[i]
              const tag = el.tagName || 'unknown'
              const className = el.className || 'sin clase'
              const textPreview = (el.textContent || '').substring(0, 50).replace(/\n/g, ' ')
              const rowCount = el.querySelectorAll?.('tbody tr')?.length || 0
              console.log(`   [${i}] ${tag}.${className} - "${textPreview}..." - Filas en tabla: ${rowCount}`)
            }
          }
          
          if (additionalIndex === -1) {
            console.error('❌ No se encontró la sección de COSTOS ADICIONALES')
            // Buscar de otra manera
            const altIndex = allSections.findIndex(el => {
              const text = el.textContent || ''
              return text.includes('COSTOS ADICIONALES') || text.includes('Costos Adicionales')
            })
            if (altIndex !== -1) {
              console.log(`   ✅ Encontrada alternativa en índice ${altIndex}`)
              // No lanzar error, usar altIndex
            } else {
              throw new Error('No se encontró la sección de COSTOS ADICIONALES')
            }
          }
          
          // Calcular alturas para decidir dónde dividir
          // ESTRATEGIA CORREGIDA: Priorizar mantener CONSTRUCCIÓN Y MANO DE OBRA completa
          // Si cabe en página 1 → dividir antes de COSTOS ADICIONALES
          // Si NO cabe en página 1 → mover CONSTRUCCIÓN Y MANO DE OBRA completa a página 2
          // IMPORTANTE: Excluir elementos STYLE del cálculo de alturas
          const getHeightExcludingStyles = (element) => {
            if (!element || element.tagName === 'STYLE') return 0
            return getElementHeight(element)
          }
          
          // Por defecto, intentar mantener CONSTRUCCIÓN Y MANO DE OBRA en página 1
          let splitIndex = additionalIndex // Dividir antes de COSTOS ADICIONALES
          
          if (workIndex !== -1 && additionalIndex !== -1) {
            console.log(`📏 ===== CALCULANDO DÓNDE DIVIDIR =====`)
            console.log(`   CONSTRUCCIÓN Y MANO DE OBRA empieza en índice: ${workIndex}`)
            console.log(`   COSTOS ADICIONALES empieza en índice: ${additionalIndex}`)
            console.log(`   Elementos entre ellos: ${additionalIndex - workIndex}`)
            
            // Calcular altura de todo lo que está ANTES de "CONSTRUCCIÓN Y MANO DE OBRA"
            let heightBeforeWork = 0
            for (let i = 0; i < workIndex; i++) {
              try {
                const height = getHeightExcludingStyles(allSections[i])
                if (height > 0) {
                  const tag = allSections[i].tagName || 'unknown'
                  console.log(`   📏 Sección ${i} (${tag}): ${height.toFixed(2)}px`)
                }
                heightBeforeWork += height
              } catch (e) {
                console.warn(`Error calculando altura de sección ${i}:`, e)
              }
            }
            
            // Calcular altura de la sección "CONSTRUCCIÓN Y MANO DE OBRA" completa
            // IMPORTANTE: Incluir TODOS los elementos desde workIndex hasta additionalIndex
            let workSectionHeight = 0
            console.log(`   📏 Calculando altura de CONSTRUCCIÓN Y MANO DE OBRA (índices ${workIndex} a ${additionalIndex - 1}):`)
            for (let i = workIndex; i < additionalIndex; i++) {
              try {
                const height = getHeightExcludingStyles(allSections[i])
                if (height > 0) {
                  const tag = allSections[i].tagName || 'unknown'
                  const className = allSections[i].className || 'sin clase'
                  const text = (allSections[i].textContent || '').substring(0, 30)
                  const rowCount = allSections[i].querySelectorAll?.('tbody tr')?.length || 0
                  console.log(`      [${i}] ${tag}.${className}: ${height.toFixed(2)}px - "${text}..." - Filas: ${rowCount}`)
                }
                workSectionHeight += height
              } catch (e) {
                console.warn(`Error calculando altura de sección trabajo ${i}:`, e)
              }
            }
            
            // Verificar si la sección completa cabe en la primera página
            const heightAvailablePage1 = PAGE_HEIGHT_PX - heightBeforeWork
            
            console.log(`📏 Resumen de cálculo:`)
            console.log(`   Altura antes de CONSTRUCCIÓN: ${heightBeforeWork.toFixed(2)}px`)
            console.log(`   Altura de CONSTRUCCIÓN completa: ${workSectionHeight.toFixed(2)}px`)
            console.log(`   Altura disponible en página 1: ${heightAvailablePage1.toFixed(2)}px`)
            console.log(`   ¿Cabe CONSTRUCCIÓN en página 1? ${workSectionHeight <= heightAvailablePage1 ? '✅ SÍ' : '❌ NO'}`)
            
            if (workSectionHeight > heightAvailablePage1) {
              // Si NO cabe, mover TODA la sección de CONSTRUCCIÓN Y MANO DE OBRA a página 2
              // Esto significa que página 2 empezará desde workIndex (incluye título + tabla completa)
              console.log('⚠️ DECISIÓN: CONSTRUCCIÓN Y MANO DE OBRA NO cabe en página 1')
              console.log('   → Moviendo TODA la sección (título + tabla) a página 2')
              console.log(`   → splitIndex = ${workIndex} (antes de CONSTRUCCIÓN Y MANO DE OBRA)`)
              splitIndex = workIndex
            } else {
              // Si cabe, mantener CONSTRUCCIÓN Y MANO DE OBRA en página 1
              // Y dividir antes de COSTOS ADICIONALES
              console.log('✅ DECISIÓN: CONSTRUCCIÓN Y MANO DE OBRA cabe completa en página 1')
              console.log('   → Manteniendo CONSTRUCCIÓN Y MANO DE OBRA en página 1')
              console.log(`   → splitIndex = ${additionalIndex} (antes de COSTOS ADICIONALES)`)
              splitIndex = additionalIndex
            }
          } else {
            console.warn('⚠️ No se encontraron los índices necesarios, usando división por defecto')
            if (workIndex === -1) console.warn('   → workIndex no encontrado')
            if (additionalIndex === -1) console.warn('   → additionalIndex no encontrado')
          }
          
          console.log(`📄 Punto de división FINAL: índice ${splitIndex}`)
          if (splitIndex === additionalIndex) {
            console.log(`   → Página 1: elementos 0 a ${additionalIndex - 1} (incluye CONSTRUCCIÓN Y MANO DE OBRA completa)`)
            console.log(`   → Página 2: elementos ${additionalIndex} en adelante (solo COSTOS ADICIONALES y siguientes)`)
          } else if (splitIndex === workIndex) {
            console.log(`   → Página 1: elementos 0 a ${workIndex - 1} (NO incluye CONSTRUCCIÓN Y MANO DE OBRA)`)
            console.log(`   → Página 2: elementos ${workIndex} en adelante (incluye CONSTRUCCIÓN Y MANO DE OBRA completa + COSTOS ADICIONALES)`)
          } else {
            console.log(`   → Dividir en índice ${splitIndex}`)
          }
          
          // Crear contenedor para página 1
          page1Container = document.createElement('div')
          page1Container.style.cssText = `width: ${PDF_MAX_WIDTH}px; background: white; position: absolute; top: 0; left: 0;`
          
          // Crear contenedor para página 2
          page2Container = document.createElement('div')
          page2Container.style.cssText = `width: ${PDF_MAX_WIDTH}px; background: white; position: absolute; top: 0; left: 0;`
          
          // Copiar estilos del clone a los contenedores
          try {
            const cloneStyles = window.getComputedStyle(clone)
            page1Container.style.fontFamily = cloneStyles.fontFamily || 'inherit'
            page1Container.style.fontSize = cloneStyles.fontSize || 'inherit'
            page2Container.style.fontFamily = cloneStyles.fontFamily || 'inherit'
            page2Container.style.fontSize = cloneStyles.fontSize || 'inherit'
          } catch (e) {
            console.warn('Error obteniendo estilos:', e)
          }
          
          // Agregar secciones a página 1 (hasta antes del splitIndex)
          // IMPORTANTE: Incluir TODOS los elementos, incluso STYLE, para mantener estilos
          console.log(`📄 ===== AGREGANDO SECCIONES A PÁGINA 1 (índices 0 a ${splitIndex - 1}) =====`)
          console.log(`   splitIndex = ${splitIndex}, workIndex = ${workIndex}, additionalIndex = ${additionalIndex}`)
          
          // VERIFICACIÓN PREVIA: Contar filas en el documento original ANTES de clonar
          if (workIndex !== -1 && additionalIndex !== -1) {
            console.log(`   🔍 VERIFICACIÓN PREVIA: Contando filas en documento original...`)
            let originalWorkRows = 0
            for (let i = workIndex; i < additionalIndex; i++) {
              if (allSections[i]) {
                const rows = allSections[i].querySelectorAll?.('tbody tr')?.length || 0
                const tag = allSections[i].tagName || 'unknown'
                console.log(`      Original [${i}] ${tag}: ${rows} filas`)
                originalWorkRows += rows
              }
            }
            console.log(`   📊 Total filas en documento original (índices ${workIndex} a ${additionalIndex - 1}): ${originalWorkRows}`)
          }
          
          if (splitIndex === workIndex) {
            console.log(`   ⚠️ ATENCIÓN: splitIndex = workIndex, esto significa que CONSTRUCCIÓN Y MANO DE OBRA va a página 2`)
            console.log(`   → Página 1 NO incluirá CONSTRUCCIÓN Y MANO DE OBRA`)
            console.log(`   → Página 2 incluirá elementos desde índice ${workIndex} (CONSTRUCCIÓN) hasta el final`)
          } else if (splitIndex === additionalIndex) {
            console.log(`   ✅ splitIndex = additionalIndex, CONSTRUCCIÓN Y MANO DE OBRA va a página 1`)
            console.log(`   → Página 1 incluirá elementos desde índice 0 hasta ${additionalIndex - 1} (incluye CONSTRUCCIÓN completa)`)
            console.log(`   → Página 2 incluirá elementos desde índice ${additionalIndex} (solo COSTOS ADICIONALES)`)
            
            // VERIFICACIÓN ESPECIAL: Asegurarse de que se incluyan TODOS los elementos de CONSTRUCCIÓN
            if (workIndex !== -1) {
              console.log(`   🔍 Verificando que se incluyan elementos ${workIndex} a ${additionalIndex - 1} en página 1...`)
              for (let i = workIndex; i < additionalIndex; i++) {
                if (i < splitIndex) {
                  console.log(`      ✅ Elemento ${i} será incluido en página 1`)
                } else {
                  console.error(`      ❌ ERROR: Elemento ${i} NO será incluido en página 1 (i >= splitIndex)`)
                }
              }
            }
          }
          
          let page1WorkItems = 0
          let page1TotalRows = 0
          for (let i = 0; i < splitIndex; i++) {
            try {
              if (allSections[i]) {
                // Contar filas ANTES de clonar
                const originalRows = allSections[i].querySelectorAll?.('tbody tr')?.length || 0
                
                const section = allSections[i].cloneNode(true)
                const tag = section.tagName || 'unknown'
                const className = section.className || 'sin clase'
                const sectionText = section.textContent?.substring(0, 50) || 'sin texto'
                
                // Contar filas DESPUÉS de clonar
                const clonedRows = section.querySelectorAll?.('tbody tr')?.length || 0
                const isWorkSection = sectionText.includes('Construcción') || sectionText.includes('Mano de Obra')
                
                if (isWorkSection) {
                  console.log(`   🔨 [${i}] ${tag}.${className} - "${sectionText}..." - Filas original: ${originalRows}, Filas clonadas: ${clonedRows}`)
                  page1WorkItems++
                  page1TotalRows += clonedRows
                  
                  if (originalRows !== clonedRows) {
                    console.error(`      ❌ ERROR: Se perdieron filas al clonar! Original: ${originalRows}, Clonado: ${clonedRows}`)
                  }
                } else {
                  console.log(`   ✅ [${i}] ${tag}.${className} - "${sectionText}..." - Filas: ${clonedRows}`)
                }
                
                page1Container.appendChild(section)
              } else {
                console.warn(`   ⚠️ Sección ${i} es null o undefined`)
              }
            } catch (e) {
              console.error(`   ❌ Error clonando sección ${i} para página 1:`, e)
            }
          }
          console.log(`   📊 Total elementos agregados a página 1: ${splitIndex}, Elementos de CONSTRUCCIÓN: ${page1WorkItems}, Total filas CONSTRUCCIÓN: ${page1TotalRows}`)
          
          // Agregar secciones a página 2 (desde splitIndex en adelante)
          // IMPORTANTE: Incluir TODOS los elementos, incluso STYLE, para mantener estilos
          console.log(`📄 ===== AGREGANDO SECCIONES A PÁGINA 2 (índices ${splitIndex} a ${allSections.length - 1}) =====`)
          
          // VERIFICACIÓN CRÍTICA: Si splitIndex = workIndex, verificar que se incluyan TODOS los elementos
          if (splitIndex === workIndex && workIndex !== -1 && additionalIndex !== -1) {
            const expectedWorkElements = additionalIndex - workIndex
            console.log(`   🔍 VERIFICACIÓN: splitIndex = workIndex`)
            console.log(`   → Se esperan ${expectedWorkElements} elementos de CONSTRUCCIÓN Y MANO DE OBRA (índices ${workIndex} a ${additionalIndex - 1})`)
            console.log(`   → Luego se agregarán elementos de COSTOS ADICIONALES (índice ${additionalIndex} en adelante)`)
            
            // Verificar que todos los elementos esperados estén presentes
            for (let i = workIndex; i < additionalIndex; i++) {
              if (!allSections[i]) {
                console.error(`   ❌ ERROR: Elemento ${i} de CONSTRUCCIÓN Y MANO DE OBRA es null/undefined!`)
              } else {
                const tag = allSections[i].tagName || 'unknown'
                const className = allSections[i].className || 'sin clase'
                const rowCount = allSections[i].querySelectorAll?.('tbody tr')?.length || 0
                console.log(`   ✅ Elemento ${i} existe: ${tag}.${className} - Filas: ${rowCount}`)
              }
            }
          }
          
          let page2WorkItems = 0
          let page2TotalRows = 0
          for (let i = splitIndex; i < allSections.length; i++) {
            try {
              if (allSections[i]) {
                // Contar filas ANTES de clonar
                const originalRows = allSections[i].querySelectorAll?.('tbody tr')?.length || 0
                
                const section = allSections[i].cloneNode(true)
                const tag = section.tagName || 'unknown'
                const className = section.className || 'sin clase'
                const sectionText = section.textContent?.substring(0, 50) || 'sin texto'
                
                // Contar filas DESPUÉS de clonar
                const clonedRows = section.querySelectorAll?.('tbody tr')?.length || 0
                const isWorkSection = sectionText.includes('Construcción') || sectionText.includes('Mano de Obra')
                
                if (isWorkSection) {
                  console.log(`   🔨 [${i}] ${tag}.${className} - "${sectionText}..." - Filas original: ${originalRows}, Filas clonadas: ${clonedRows}`)
                  page2WorkItems++
                  page2TotalRows += clonedRows
                  
                  if (originalRows !== clonedRows) {
                    console.error(`      ❌ ERROR: Se perdieron filas al clonar! Original: ${originalRows}, Clonado: ${clonedRows}`)
                  }
                  
                  // VERIFICACIÓN CRÍTICA: Si splitIndex = additionalIndex, NO debería haber elementos de CONSTRUCCIÓN en página 2
                  if (splitIndex === additionalIndex) {
                    console.error(`      ❌ ERROR CRÍTICO: Elemento de CONSTRUCCIÓN en página 2 cuando splitIndex = additionalIndex!`)
                    console.error(`      → Esto significa que el elemento ${i} debería estar en página 1 (i < ${additionalIndex})`)
                  }
                } else {
                  console.log(`   ✅ [${i}] ${tag}.${className} - "${sectionText}..." - Filas: ${clonedRows}`)
                }
                
                page2Container.appendChild(section)
              } else {
                console.warn(`   ⚠️ Sección ${i} es null o undefined`)
              }
            } catch (e) {
              console.error(`   ❌ Error clonando sección ${i} para página 2:`, e)
            }
          }
          console.log(`   📊 Total elementos agregados a página 2: ${allSections.length - splitIndex}, Elementos de CONSTRUCCIÓN: ${page2WorkItems}, Total filas CONSTRUCCIÓN: ${page2TotalRows}`)
          
          // VERIFICACIÓN FINAL: No debería haber filas de CONSTRUCCIÓN en ambas páginas
          if (page1TotalRows > 0 && page2TotalRows > 0) {
            console.error(`   ❌ ERROR CRÍTICO: Hay filas de CONSTRUCCIÓN en AMBAS páginas!`)
            console.error(`      Página 1: ${page1TotalRows} filas`)
            console.error(`      Página 2: ${page2TotalRows} filas`)
            console.error(`      Total: ${page1TotalRows + page2TotalRows} filas (debería ser 7)`)
          }
          
          // Verificar que la sección CONSTRUCCIÓN Y MANO DE OBRA esté presente y contar filas
          console.log(`🔍 ===== VERIFICACIÓN FINAL DE CONSTRUCCIÓN Y MANO DE OBRA =====`)
          
          const page1HasWork = page1Container.textContent?.includes('Construcción y Mano de Obra') || 
                               page1Container.textContent?.includes('CONSTRUCCIÓN Y MANO DE OBRA')
          const page2HasWork = page2Container.textContent?.includes('Construcción y Mano de Obra') || 
                               page2Container.textContent?.includes('CONSTRUCCIÓN Y MANO DE OBRA')
          
          // Contar filas en las tablas de CONSTRUCCIÓN Y MANO DE OBRA
          const page1WorkTables = page1Container.querySelectorAll('h3.quote-table-title')
          let page1WorkRows = 0
          page1WorkTables.forEach(h3 => {
            if (h3.textContent?.includes('Construcción') || h3.textContent?.includes('Mano de Obra')) {
              const nextDiv = h3.nextElementSibling
              if (nextDiv && nextDiv.classList.contains('quote-table-container')) {
                const rows = nextDiv.querySelectorAll('tbody tr')?.length || 0
                console.log(`   📊 Página 1 - Tabla CONSTRUCCIÓN encontrada: ${rows} filas`)
                page1WorkRows += rows
              }
            }
          })
          
          const page2WorkTables = page2Container.querySelectorAll('h3.quote-table-title')
          let page2WorkRows = 0
          page2WorkTables.forEach(h3 => {
            if (h3.textContent?.includes('Construcción') || h3.textContent?.includes('Mano de Obra')) {
              const nextDiv = h3.nextElementSibling
              if (nextDiv && nextDiv.classList.contains('quote-table-container')) {
                const rows = nextDiv.querySelectorAll('tbody tr')?.length || 0
                console.log(`   📊 Página 2 - Tabla CONSTRUCCIÓN encontrada: ${rows} filas`)
                page2WorkRows += rows
              }
            }
          })
          
          const totalWorkRows = page1WorkRows + page2WorkRows
          
          console.log(`📄 Resumen de división:`)
          console.log(`   Página 1: ${splitIndex} elementos - ¿Tiene CONSTRUCCIÓN? ${page1HasWork ? '✅ SÍ' : '❌ NO'} - Filas: ${page1WorkRows}`)
          console.log(`   Página 2: ${allSections.length - splitIndex} elementos - ¿Tiene CONSTRUCCIÓN? ${page2HasWork ? '✅ SÍ' : '❌ NO'} - Filas: ${page2WorkRows}`)
          console.log(`   📊 TOTAL FILAS CONSTRUCCIÓN Y MANO DE OBRA: ${totalWorkRows} (esperado: 7)`)
          
          if (totalWorkRows !== 7) {
            console.error(`❌ ERROR: Se esperaban 7 filas pero se encontraron ${totalWorkRows}`)
            console.log('   🔍 Buscando todas las tablas de trabajo en el documento original...')
            const originalWorkTables = clone.querySelectorAll('h3.quote-table-title')
            originalWorkTables.forEach((h3, idx) => {
              if (h3.textContent?.includes('Construcción') || h3.textContent?.includes('Mano de Obra')) {
                const nextDiv = h3.nextElementSibling
                if (nextDiv && nextDiv.classList.contains('quote-table-container')) {
                  const rows = nextDiv.querySelectorAll('tbody tr')?.length || 0
                  console.log(`   📋 Tabla original ${idx}: ${rows} filas`)
                  nextDiv.querySelectorAll('tbody tr').forEach((row, rowIdx) => {
                    const desc = row.querySelector('td:first-child')?.textContent || 'sin descripción'
                    console.log(`      Fila ${rowIdx + 1}: ${desc.substring(0, 40)}`)
                  })
                }
              }
            })
          }
          
          if (!page1HasWork && !page2HasWork) {
            console.error('❌ ERROR CRÍTICO: La sección CONSTRUCCIÓN Y MANO DE OBRA no se encontró en ninguna página!')
            console.log('   Buscando en allSections...')
            allSections.forEach((section, idx) => {
              const text = section.textContent || ''
              if (text.includes('Construcción') || text.includes('Mano de Obra')) {
                console.log(`   ✅ Encontrada en índice ${idx}: ${section.className || section.tagName}`)
              }
            })
          }
          
          // Aplicar estilos del documento original a ambos contenedores
          try {
            const originalStyle = style.cloneNode(true)
            page1Container.appendChild(originalStyle.cloneNode(true))
            page2Container.appendChild(originalStyle.cloneNode(true))
          } catch (e) {
            console.warn('Error aplicando estilos:', e)
          }
          
          // Agregar contenedores al DOM temporalmente
          const tempContainer = document.createElement('div')
          tempContainer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            width: ${PDF_MAX_WIDTH}px;
          `
          tempContainer.appendChild(page1Container)
          tempContainer.appendChild(page2Container)
          document.body.appendChild(tempContainer)
          
          // Esperar a que se carguen todas las imágenes y fuentes antes de generar PDF
          await waitForResources(page1Container, 2500)
          await waitForResources(page2Container, 2500)
          await new Promise(r => setTimeout(r, 150)) // pequeño buffer extra
          
          // Forzar estilos inline en los contenedores de página usando el ancho del PDF
          page1Container.style.setProperty('box-sizing', 'border-box', 'important')
          page1Container.style.setProperty('width', `${PDF_MAX_WIDTH}px`, 'important')
          page1Container.style.setProperty('background', 'white', 'important')
          page2Container.style.setProperty('box-sizing', 'border-box', 'important')
          page2Container.style.setProperty('width', `${PDF_MAX_WIDTH}px`, 'important')
          page2Container.style.setProperty('background', 'white', 'important')
          
          // Forzar reflow
          page1Container.offsetHeight
          page2Container.offsetHeight
          
          // Usar html2canvas y jsPDF directamente para tener control total
          console.log('📄 Generando página 1...')
          
          // Importar html2canvas y jsPDF con manejo de errores
          let html2canvas, jsPDF
          try {
            console.log('📦 Importando html2canvas...')
            const html2canvasModule = await import('html2canvas')
            html2canvas = html2canvasModule.default || html2canvasModule
            console.log('✅ html2canvas importado')
            
            console.log('📦 Importando jspdf...')
            const jsPDFModule = await import('jspdf')
            // jsPDF puede estar en diferentes lugares según la versión
            if (jsPDFModule.jsPDF) {
              jsPDF = jsPDFModule.jsPDF
            } else if (jsPDFModule.default && jsPDFModule.default.jsPDF) {
              jsPDF = jsPDFModule.default.jsPDF
            } else if (typeof jsPDFModule.default === 'function') {
              jsPDF = jsPDFModule.default
            } else {
              throw new Error('No se pudo encontrar jsPDF en el módulo')
            }
            console.log('✅ jspdf importado')
          } catch (importError) {
            console.error('❌ Error importando librerías:', importError)
            throw new Error(`Error al importar librerías necesarias: ${importError.message}`)
          }
          
          // Asegurar que las opciones de html2canvas sean coherentes con el ancho del PDF
          const canvas1Options = {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: PDF_MAX_WIDTH,
            windowWidth: PDF_MAX_WIDTH,
            scrollX: 0,
            scrollY: 0
          }
          
          console.log(`📐 Opciones html2canvas página 1: width=${PDF_MAX_WIDTH}px, windowWidth=${PDF_MAX_WIDTH}px`)
          
          // Generar canvas para página 1
          const canvas1 = await html2canvas(page1Container, canvas1Options)
          
          const imgData1 = canvas1.toDataURL('image/jpeg', 0.98)
          const imgWidth = 210 // A4 width in mm
          const imgHeight1 = (canvas1.height * imgWidth) / canvas1.width
          
          // Crear PDF con jsPDF
          const pdf = new jsPDF({
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
            compress: true
          })
          
          // Agregar página 1 al PDF
          pdf.addImage(imgData1, 'JPEG', 0, 0, imgWidth, imgHeight1)
          console.log('✅ Página 1 generada y agregada al PDF')
          
          // Agregar nueva página
          pdf.addPage()
          console.log('📄 Agregando página 2...')
          
          // Asegurar que las opciones de html2canvas sean coherentes con el ancho del PDF
          const canvas2Options = {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: PDF_MAX_WIDTH,
            windowWidth: PDF_MAX_WIDTH,
            scrollX: 0,
            scrollY: 0
          }
          
          console.log(`📐 Opciones html2canvas página 2: width=${PDF_MAX_WIDTH}px, windowWidth=${PDF_MAX_WIDTH}px`)
          
          // Generar canvas para página 2
          const canvas2 = await html2canvas(page2Container, canvas2Options)
          
          const imgData2 = canvas2.toDataURL('image/jpeg', 0.98)
          const imgHeight2 = (canvas2.height * imgWidth) / canvas2.width
          
          // Asegurar que la altura no exceda el tamaño de página A4 (297mm)
          const maxPageHeight = 297 - 20 // 297mm - márgenes (10mm arriba + 10mm abajo)
          const finalHeight = Math.min(imgHeight2, maxPageHeight)
          
          // Agregar imagen de página 2 al PDF
          pdf.addImage(imgData2, 'JPEG', 0, 0, imgWidth, finalHeight)
          
          console.log('✅ Página 2 agregada al PDF')
          
          // Limpiar contenedores temporales
          try {
            if (tempContainer && tempContainer.parentNode) {
              document.body.removeChild(tempContainer)
            }
          } catch (e) {
            console.warn('Error limpiando tempContainer:', e)
          }
          
          // Obtener blob del PDF combinado
          pdfBlob = pdf.output('blob')
          
          console.log('✅ PDF combinado generado con dos páginas:', pdfBlob.size, 'bytes')
        } catch (innerError) {
          console.error('❌ Error en la generación de PDF de dos páginas:', innerError)
          console.error('Stack:', innerError.stack)
          
          // Limpiar tempContainer si existe
          try {
            if (tempContainer && tempContainer.parentNode) {
              document.body.removeChild(tempContainer)
            }
          } catch (e) {
            console.warn('Error limpiando tempContainer en catch:', e)
          }
          
          // Si falla, intentar generar PDF de una página como fallback
          console.log('🔄 Intentando generar PDF de una página como fallback...')
          try {
            pdfBlob = await html2pdf()
              .set(options)
              .from(clone)
              .toPdf()
              .output('blob')
            console.log('✅ PDF de fallback generado:', pdfBlob.size, 'bytes')
          } catch (fallbackError) {
            console.error('❌ Error también en el fallback:', fallbackError)
            throw new Error(`Error al generar PDF: ${innerError.message}. Fallback también falló: ${fallbackError.message}`)
          }
        }
      } else {
        console.log('📄 Generando PDF de una sola página')
        
        // Generar PDF normal de una página
        pdfBlob = await html2pdf()
          .set(options)
          .from(clone)
          .toPdf()
          .output('blob')
        
        console.log('✅ Blob generado:', pdfBlob.size, 'bytes')
      }
      
      if (pdfBlob.size < 5000) {
        throw new Error(`PDF muy pequeño: ${pdfBlob.size} bytes - probablemente vacío`)
      }
      
      console.log('✅ PDF Blob generado:', pdfBlob.size, 'bytes')
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

  // Función para generar PDF, previsualizarlo y subirlo a Supabase Storage
  const generateAndUploadPDF = async (quoteData) => {
    try {
      console.log('🔄 Generando PDF Blob...')
      // 1. Generar el PDF Blob
      const pdfBlob = await generatePDFBlob()
      
      console.log('👁️ Mostrando previsualización del PDF...')
      // 2. Mostrar previsualización y esperar confirmación del usuario
      const confirmedBlob = await previewPDF(pdfBlob)
      
      // 3. Generar nombre del archivo
      const clientName = quoteData.formData?.clientName || 'cliente'
      const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9-_]/g, '_')
      const dateStr = new Date().toISOString().split('T')[0]
      const filename = `presupuesto_${sanitizedClientName}_${dateStr}`
      
      console.log('☁️ Subiendo PDF a Supabase Storage...')
      // 4. Subir PDF a Supabase Storage
      const uploadResult = await uploadPDFToStorage(confirmedBlob, filename)
      
      if (uploadResult.error) {
        throw new Error('Error al subir PDF a Supabase: ' + uploadResult.error.message)
      }
      
      console.log('✅ PDF subido exitosamente a Supabase')
      console.log('🔗 URL del PDF:', uploadResult.url)
      
      return {
        pdfPath: uploadResult.path,
        pdfUrl: uploadResult.url,
        pdfFilename: `${filename}.pdf`
      }
    } catch (error) {
      console.error('❌ Error en generateAndUploadPDF:', error)
      // Si el usuario canceló, no es un error crítico
      if (error.message && error.message.includes('cancelada')) {
        throw error // Re-lanzar para que el flujo sepa que fue cancelado
      }
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
              // Si el usuario canceló la previsualización, no mostrar error
              if (error.message && error.message.includes('cancelada')) {
                console.log('ℹ️ Usuario canceló la previsualización del PDF')
                return // Salir silenciosamente
              }
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
                        <td>{item.name}</td>
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
