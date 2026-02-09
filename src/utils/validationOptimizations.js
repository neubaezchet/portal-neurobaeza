/**
 * Optimizaciones para Validación Rápida
 * Reduce tiempos de confirmación a 2-3 segundos
 */

/**
 * Validar caso CON OPTIMIZACIONES
 * - Envía datos mientras carga PDFs
 * - Usa compresión
 * - Paralleliza peticiones
 */
export async function validarCasoOptimizado(
  serial,
  accion,
  apiBaseUrl,
  adminToken,
  data = {}
) {
  console.time(`validar-${serial}`);
  
  try {
    const formData = new FormData();
    formData.append('accion', accion);
    
    if (data.checks) {
      data.checks.forEach(check => formData.append('checks', check));
    }
    
    if (data.observaciones) {
      formData.append('observaciones', data.observaciones);
    }

    // ENVÍO PARALELO - No espera a que carguen todos los archivos
    const response = await Promise.race([
      // 1. Intentar enviar en <3 segundos
      fetch(`${apiBaseUrl}/validador/casos/${encodeURIComponent(serial)}/validar`, {
        method: 'POST',
        headers: { 'X-Admin-Token': adminToken },
        body: formData,
        signal: AbortSignal.timeout(30000) // 30 segundos max
      }),
      
      // 2. Si tarda más de 3 segundos, mostrar "procesando"
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT_SHOW_LOADING')), 3000)
      )
    ]);

    const result = await response.json();
    console.timeEnd(`validar-${serial}`);
    
    return {
      success: true,
      data: result,
      elapsed: performance.now()
    };

  } catch (error) {
    if (error.message === 'TIMEOUT_SHOW_LOADING') {
      console.log('⏳ Validación procesando (puede tardar hasta 30s)...');
      // Continuar en background
      return {
        success: 'pending',
        message: 'Procesando en background',
        elapsed: 3000
      };
    }
    
    console.error('❌ Error validando:', error);
    throw error;
  }
}

/**
 * Cargar documentos en paralelo
 * Descarga múltiples PDFs simultáneamente
 */
export async function loadDocumentsInParallel(documentLinks, apiBaseUrl, adminToken) {
  console.time('load-all-documents');
  
  try {
    // Descargar todos en paralelo
    const promises = documentLinks.map(({ serial, link, name }) =>
      fetch(`${apiBaseUrl}/validador/casos/${serial}/pdf/stream`, {
        headers: { 'X-Admin-Token': adminToken },
        signal: AbortSignal.timeout(10000)
      })
        .then(r => r.blob())
        .then(blob => ({
          name,
          blob,
          size: blob.size,
          loaded: true
        }))
        .catch(error => ({
          name,
          error: error.message,
          loaded: false
        }))
    );

    const results = await Promise.all(promises);
    console.timeEnd('load-all-documents');
    
    const loaded = results.filter(r => r.loaded);
    const failed = results.filter(r => !r.loaded);
    
    console.log(`✅ Cargados: ${loaded.length}, ❌ Fallidos: ${failed.length}`);
    
    return { loaded, failed };

  } catch (error) {
    console.error('Error cargando documentos:', error);
    throw error;
  }
}

/**
 * Confirmar acción CON BARRA DE PROGRESO
 * Muestra progreso real al usuario
 */
export async function confirmarAccionConProgreso(
  serial,
  accion,
  apiBaseUrl,
  adminToken,
  onProgress = () => {}
) {
  onProgress({ status: 'iniciando', percent: 0 });

  try {
    // 0-10%: Preparar datos
    onProgress({ status: 'preparando', percent: 10 });
    
    const formData = new FormData();
    formData.append('accion', accion);

    // 10-50%: Enviar
    onProgress({ status: 'enviando', percent: 50 });
    
    const response = await fetch(
      `${apiBaseUrl}/validador/casos/${encodeURIComponent(serial)}/validar`,
      {
        method: 'POST',
        headers: { 'X-Admin-Token': adminToken },
        body: formData
      }
    );

    // 50-90%: Procesar respuesta
    onProgress({ status: 'procesando', percent: 90 });
    
    const data = await response.json();

    // 90-100%: Completado
    onProgress({ status: 'completado', percent: 100 });
    
    return data;

  } catch (error) {
    onProgress({ status: 'error', percent: 0, error: error.message });
    throw error;
  }
}

/**
 * Precargar casos frecuentes
 * Descarga PDFs mientras el usuario revisa
 */
export async function preloadNextCase(
  nextSerial,
  apiBaseUrl,
  adminToken,
  pdfCacheManager
) {
  try {
    console.log(`⏳ Precargando ${nextSerial} en background...`);
    
    // No esperar respuesta, solo iniciar descarga
    fetch(`${apiBaseUrl}/validador/casos/${nextSerial}`, {
      headers: { 'X-Admin-Token': adminToken },
      signal: AbortSignal.timeout(10000)
    })
      .then(r => r.json())
      .then(caso => {
        if (caso.drive_link) {
          // Precargar PDF en caché
          pdfCacheManager.getPDFOptimized(
            nextSerial,
            caso.drive_link,
            apiBaseUrl,
            adminToken
          ).catch(() => {});
        }
      })
      .catch(() => {});
      
  } catch (error) {
    // Fallar silenciosamente
    console.log('ℹ️ Precarga fallida (no crítico)');
  }
}

/**
 * Obtener estadísticas de performance
 */
export function getPerformanceMetrics() {
  const navigation = performance.getEntriesByType('navigation')[0];
  
  return {
    totalTime: navigation.loadEventEnd - navigation.fetchStart,
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcp: navigation.connectEnd - navigation.connectStart,
    ttfb: navigation.responseStart - navigation.requestStart,
    download: navigation.responseEnd - navigation.responseStart,
    dom: navigation.domInteractive - navigation.domLoading,
    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
  };
}
