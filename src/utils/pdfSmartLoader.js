/**
 * PDF Smart Loader - IncaNeurobaeza 2026
 * 
 * Sistema unificado de carga de PDFs ultra-rápido:
 * 1. Busca en IndexedDB local (< 300ms)
 * 2. Si no está, descarga del backend con /pdf/fast (1-3s)
 * 3. Guarda en IndexedDB para próxima vez
 * 4. Prefetch de los siguientes 3 casos en background
 * 5. Progressive: muestra primera página INMEDIATO, resto en background
 * 
 * NO INTERFIERE CON DRIVE:
 * - Drive sigue siendo source of truth
 * - Caché local es solo para velocidad de lectura
 * - Al editar PDF → se invalida caché local
 * - Al cambiar estado → se invalida caché local
 */

import pdfDBCache from './pdfIndexedDBCache';

const API_BASE_URL = 'https://web-production-95ed.up.railway.app';
const ADMIN_TOKEN = '0b9685e9a9ff3c24652acaad881ec7b2b4c17f6082ad164d10a6e67589f3f67c';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Admin-Token': ADMIN_TOKEN,
});

/**
 * Cargar PDF con caché inteligente
 * 
 * @param {string} serial - Serial del caso
 * @param {object} options - Opciones
 * @param {function} options.onFirstPage - Callback cuando la primera página está lista
 * @param {function} options.onAllPages - Callback cuando todas las páginas están listas
 * @param {function} options.onError - Callback en caso de error
 * @param {AbortSignal} options.signal - Señal de cancelación
 * @returns {Promise<{pages: Array, fromCache: boolean, loadTimeMs: number}>}
 */
export async function loadPDFSmart(serial, options = {}) {
  const { onFirstPage, onAllPages, onError, signal } = options;
  const startTime = performance.now();
  let fromCache = false;

  try {
    // ============================================
    // PASO 1: Intentar IndexedDB local (< 300ms)
    // ============================================
    let pdfArrayBuffer = await pdfDBCache.get(serial);

    if (pdfArrayBuffer) {
      // ✅ CACHE HIT - Verificar si sigue vigente
      const meta = await pdfDBCache.getMeta(serial);
      
      // Verificar ETag con el backend (petición liviana)
      try {
        const metaResponse = await fetch(
          `${API_BASE_URL}/validador/casos/${encodeURIComponent(serial)}/pdf/meta`,
          { 
            headers: getHeaders(),
            signal: signal || AbortSignal.timeout(3000)
          }
        );
        
        if (metaResponse.ok) {
          const serverMeta = await metaResponse.json();
          
          if (meta?.etag && serverMeta.etag !== meta.etag) {
            // ❌ Caché desactualizado → descargar nueva versión
            console.log(`🔄 [SmartLoader] ${serial}: caché desactualizado, re-descargando`);
            pdfArrayBuffer = null; // Forzar re-descarga
          } else {
            fromCache = true;
            console.log(`⚡ [SmartLoader] ${serial}: desde IndexedDB (${(performance.now() - startTime).toFixed(0)}ms)`);
          }
        }
      } catch (metaErr) {
        // Si falla verificación de meta, usar caché local de todos modos
        fromCache = true;
        console.log(`⚡ [SmartLoader] ${serial}: desde IndexedDB (sin verificar meta)`);
      }
    }

    // ============================================
    // PASO 2: Si no hay caché, descargar del backend
    // ============================================
    if (!pdfArrayBuffer) {
      console.log(`📥 [SmartLoader] ${serial}: descargando...`);

      const cachedMeta = await pdfDBCache.getMeta(serial);
      const fetchHeaders = { ...getHeaders() };
      
      // Enviar ETag para posible 304
      if (cachedMeta?.etag) {
        fetchHeaders['If-None-Match'] = `"${cachedMeta.etag}"`;
      }
      delete fetchHeaders['Content-Type']; // No enviar para GET

      const response = await fetch(
        `${API_BASE_URL}/validador/casos/${encodeURIComponent(serial)}/pdf/fast`,
        {
          headers: fetchHeaders,
          signal: signal || AbortSignal.timeout(40000)
        }
      );

      if (response.status === 304) {
        // Servidor confirmó que el caché es válido
        pdfArrayBuffer = await pdfDBCache.get(serial);
        fromCache = true;
        console.log(`⚡ [SmartLoader] ${serial}: 304 Not Modified, usando caché`);
      } else if (response.ok) {
        pdfArrayBuffer = await response.arrayBuffer();
        
        // Guardar en IndexedDB para próxima vez
        const etag = response.headers.get('ETag')?.replace(/"/g, '');
        const modified = response.headers.get('X-PDF-Modified');
        
        // Guardar en background (no bloquear)
        pdfDBCache.put(serial, pdfArrayBuffer, { etag, modifiedTime: modified })
          .catch(e => console.warn('⚠️ Error guardando en caché:', e));

        console.log(`✅ [SmartLoader] ${serial}: descargado (${(pdfArrayBuffer.byteLength / 1024).toFixed(0)}KB, ${(performance.now() - startTime).toFixed(0)}ms)`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    if (!pdfArrayBuffer) {
      throw new Error('No se pudo obtener el PDF');
    }

    // ============================================
    // PASO 3: Renderizar con PDF.js
    // ============================================
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) {
      throw new Error('PDF.js no disponible');
    }
    
    pdfjsLib.GlobalWorkerOptions.workerSrc = 
      `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const loadingTask = pdfjsLib.getDocument({
      data: pdfArrayBuffer.slice(0), // Copia para evitar detached buffer
      disableAutoFetch: false
    });

    const pdf = await loadingTask.promise;
    const allPages = [];

    // ⚡ PRIMERA PÁGINA INMEDIATA
    const page1 = await pdf.getPage(1);
    const viewport1 = page1.getViewport({ scale: 1.8 });
    const canvas1 = document.createElement('canvas');
    canvas1.width = viewport1.width;
    canvas1.height = viewport1.height;

    await page1.render({
      canvasContext: canvas1.getContext('2d'),
      viewport: viewport1
    }).promise;

    const firstPageData = {
      id: 0,
      fullImage: canvas1.toDataURL('image/jpeg', 0.85)
    };
    allPages.push(firstPageData);

    // Notificar primera página lista
    if (onFirstPage) {
      onFirstPage([firstPageData], {
        fromCache,
        totalPages: pdf.numPages,
        loadTimeMs: performance.now() - startTime
      });
    }

    // 📥 RESTO EN BACKGROUND (sin bloquear UI)
    if (pdf.numPages > 1) {
      // Usar requestIdleCallback o setTimeout para no bloquear UI
      const renderRest = async () => {
        for (let i = 2; i <= pdf.numPages; i++) {
          // Verificar cancelación
          if (signal?.aborted) return;

          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.8 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: canvas.getContext('2d'),
            viewport: viewport
          }).promise;

          allPages.push({
            id: i - 1,
            fullImage: canvas.toDataURL('image/jpeg', 0.85)
          });
        }

        // Notificar todas las páginas listas
        if (onAllPages) {
          onAllPages([...allPages], {
            fromCache,
            totalPages: pdf.numPages,
            loadTimeMs: performance.now() - startTime
          });
        }
      };

      // Dar 100ms para que React renderice la primera página
      setTimeout(renderRest, 100);
    } else {
      // Solo 1 página
      if (onAllPages) {
        onAllPages([...allPages], {
          fromCache,
          totalPages: 1,
          loadTimeMs: performance.now() - startTime
        });
      }
    }

    return {
      pages: allPages,
      fromCache,
      totalPages: pdf.numPages,
      loadTimeMs: performance.now() - startTime
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`⏹️ [SmartLoader] ${serial}: cancelado`);
      return null;
    }

    console.error(`❌ [SmartLoader] ${serial}: ${error.message}`);
    if (onError) onError(error);
    throw error;
  }
}


/**
 * Prefetch inteligente: pre-descarga y cachea los siguientes N casos
 * Se ejecuta en background sin bloquear UI
 * 
 * @param {Array} casosLista - Lista completa de casos
 * @param {number} indiceActual - Índice del caso actual
 * @param {number} cantidad - Cuántos precargar (default 3)
 */
export async function prefetchNextCases(casosLista, indiceActual, cantidad = 3) {
  if (!casosLista || casosLista.length === 0) return;

  const indicesToPrefetch = [];
  for (let i = 1; i <= cantidad; i++) {
    if (indiceActual + i < casosLista.length) {
      indicesToPrefetch.push(indiceActual + i);
    }
  }

  if (indicesToPrefetch.length === 0) return;

  console.log(`🔮 [Prefetch] Precargando ${indicesToPrefetch.length} casos siguientes...`);

  // Precargar con delays progresivos para no saturar
  for (let j = 0; j < indicesToPrefetch.length; j++) {
    const idx = indicesToPrefetch[j];
    const caso = casosLista[idx];
    const delay = j === 0 ? 500 : (j === 1 ? 2000 : 4000);

    setTimeout(async () => {
      try {
        const serial = caso.serial;

        // Verificar si ya está en caché
        const cached = await pdfDBCache.get(serial);
        if (cached) {
          console.log(`✅ [Prefetch] ${serial}: ya en caché`);
          return;
        }

        // Descargar y cachear (sin renderizar, solo bytes)
        const fetchHeaders = { 'X-Admin-Token': ADMIN_TOKEN };
        const response = await fetch(
          `${API_BASE_URL}/validador/casos/${encodeURIComponent(serial)}/pdf/fast`,
          {
            headers: fetchHeaders,
            signal: AbortSignal.timeout(20000)
          }
        );

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const etag = response.headers.get('ETag')?.replace(/"/g, '');
          const modified = response.headers.get('X-PDF-Modified');
          
          await pdfDBCache.put(serial, arrayBuffer, { etag, modifiedTime: modified });
          console.log(`✅ [Prefetch] ${serial}: cacheado (${(arrayBuffer.byteLength / 1024).toFixed(0)}KB)`);
        }
      } catch (e) {
        // Prefetch falla silenciosamente
        console.log(`⚠️ [Prefetch] ${caso.serial}: falló (no crítico)`);
      }
    }, delay);
  }
}


/**
 * Invalidar caché de un caso (llamar después de editar/cambiar estado)
 * @param {string} serial - Serial del caso a invalidar
 */
export async function invalidatePDFCache(serial) {
  await pdfDBCache.invalidate(serial);
  console.log(`🗑️ [SmartLoader] Caché invalidado: ${serial}`);
}


/**
 * Obtener estadísticas del caché
 */
export async function getCacheStats() {
  return pdfDBCache.getStats();
}


/**
 * Limpiar todo el caché
 */
export async function clearAllPDFCache() {
  await pdfDBCache.clearAll();
  console.log('🧹 [SmartLoader] Todo el caché PDF eliminado');
}

export default loadPDFSmart;
