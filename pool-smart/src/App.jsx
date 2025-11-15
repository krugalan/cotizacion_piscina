import { useState, useEffect } from 'react'
import './App.css'
import html2pdf from 'html2pdf.js'

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

  // Función para generar PDF y convertirlo a base64
  const generatePDFBase64 = async () => {
    const element = document.querySelector('.quote-document')
    if (!element) {
      throw new Error('No se encontró el documento del presupuesto')
    }

    // Ocultar modal temporalmente para captura limpia
    const modal = document.querySelector('.modal-overlay')
    const originalModalDisplay = modal ? modal.style.display : null
    if (modal) modal.style.display = 'none'

    // Clonar el elemento
    const clone = element.cloneNode(true)
    clone.id = 'pdf-clone-' + Date.now()
    
    // Remover elementos innecesarios del clon
    const closeBtn = clone.querySelector('.modal-close')
    const actions = clone.querySelector('.modal-actions')
    if (closeBtn) closeBtn.remove()
    if (actions) actions.remove()
    
    // Crear contenedor para el clon con estilos forzados
    const container = document.createElement('div')
    container.style.cssText = `
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 794px !important;
      background: white !important;
      z-index: 99999 !important;
      visibility: visible !important;
      opacity: 1 !important;
    `
    
    // Calcular altura aproximada del contenido antes de "COSTOS ADICIONALES"
    // para determinar si necesitamos salto de página
    const additionalCostsSection = clone.querySelector('.quote-additional-costs-section')
    let needsPageBreak = false
    
    if (additionalCostsSection) {
      // Crear un clon temporal para medir altura
      const tempClone = element.cloneNode(true)
      tempClone.style.position = 'absolute'
      tempClone.style.visibility = 'hidden'
      tempClone.style.width = '794px'
      document.body.appendChild(tempClone)
      
      // Encontrar todos los elementos antes de "COSTOS ADICIONALES"
      const allSections = Array.from(tempClone.children)
      const additionalIndex = allSections.findIndex(el => 
        el.classList.contains('quote-additional-costs-section')
      )
      
      if (additionalIndex > 0) {
        // Calcular altura acumulada de todas las secciones antes de "COSTOS ADICIONALES"
        let totalHeight = 0
        for (let i = 0; i < additionalIndex; i++) {
          const section = allSections[i]
          totalHeight += section.offsetHeight || section.scrollHeight || 0
        }
        
        // Altura aproximada de una página A4 en píxeles (297mm - márgenes)
        // Con márgenes de 10mm arriba y abajo, altura útil ≈ 1123px (a 96dpi)
        const pageHeight = 1123 // Aproximadamente 277mm en píxeles
        
        // Si el contenido antes de "COSTOS ADICIONALES" es mayor a una página, forzar salto
        needsPageBreak = totalHeight > pageHeight
        
        console.log('📏 Altura antes de COSTOS ADICIONALES:', totalHeight, 'px')
        console.log('📄 Altura de página:', pageHeight, 'px')
        console.log('🔄 Necesita salto de página:', needsPageBreak)
      }
      
      document.body.removeChild(tempClone)
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
  
  /* CRÍTICO: Forzar salto de página en COSTOS ADICIONALES */
  #${clone.id} .quote-additional-costs-section {
    page-break-before: always !important;
    break-before: page !important;
    padding-top: 0.5rem;
  }
`

    clone.appendChild(style)
    container.appendChild(clone)
    document.body.appendChild(container)
    
    // Esperar renderizado
    await new Promise(resolve => setTimeout(resolve, 500))
    clone.offsetHeight
    
    const options = {
      margin: [10, 10, 10, 10],
      filename: 'cotizacion.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
        width: 794,
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
        mode: ['css', 'legacy'],
        avoid: ['.quote-table-container', '.quote-summary', '.quote-header-wave', '.quote-footer-wave']
      }
    }

    try {
      console.log('📄 Generando PDF con estilos exactos del original...')
      console.log('📐 Dimensiones:', clone.offsetWidth, 'x', clone.offsetHeight)
      if (needsPageBreak) {
        console.log('📑 Se aplicará salto de página antes de COSTOS ADICIONALES')
      }
      
      const pdfBlob = await html2pdf()
        .set(options)
        .from(clone)
        .toPdf()
        .output('blob')
      
      console.log('✅ Blob generado:', pdfBlob.size, 'bytes')
      
      if (pdfBlob.size < 5000) {
        throw new Error(`PDF muy pequeño: ${pdfBlob.size} bytes - probablemente vacío`)
      }
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1]
          console.log('✅ Base64:', base64.length, 'chars')
          console.log('🔍 Inicio:', base64.substring(0, 50))
          resolve(base64)
        }
        reader.onerror = () => reject(new Error('Error FileReader'))
        reader.readAsDataURL(pdfBlob)
      })
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

  // Función para enviar datos a webhook de n8n con PDF en base64
  const sendToN8N = async (quoteData, pdfBase64 = null) => {
    const webhookUrl = 'https://devn8n.zetti.xyz/webhook-test/cotizacion'
    const n8nData = prepareN8NData(quoteData)
    
    // Agregar el PDF en base64 si está disponible
    if (pdfBase64) {
      n8nData.presupuesto = pdfBase64
      n8nData.pdfFilename = `presupuesto_${quoteData.formData?.clientName?.replace(/\s+/g, '_') || 'cliente'}_${new Date().toISOString().split('T')[0]}.pdf`
    }
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nData)
      })

      if (response.ok) {
        alert('✅ Presupuesto enviado exitosamente a n8n')
        return true
      } else {
        const errorText = await response.text().catch(() => 'Error desconocido')
        throw new Error(`Error del servidor: ${response.status} - ${errorText.substring(0, 200)}`)
      }
    } catch (error) {
      console.error('Error al enviar a n8n:', error)
      throw error
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
              // Generar PDF y convertirlo a base64
              console.log('🔄 Generando PDF...')
              const pdfBase64 = await generatePDFBase64()
              console.log('✅ PDF generado, longitud:', pdfBase64.length)
              console.log('🔍 Primeros 100 caracteres:', pdfBase64.substring(0, 100))
              
              // Enviar datos con PDF a n8n
              console.log('📤 Enviando a n8n...')
              await sendToN8N(quoteData, pdfBase64)
            } catch (error) {
              alert('Error al generar o enviar el presupuesto: ' + error.message)
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
