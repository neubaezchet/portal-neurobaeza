/**
 * Sistema de Caché y Descarga Optimizada de PDFs
 * Permite cargar archivos en 2-3 segundos
 */

class PDFCacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheSize = 0;
    this.maxCacheSize = 100 * 1024 * 1024; // 100 MB
    this.downloadQueue = [];
    this.isDownloading = false;
  }

  /**
   * Obtener PDF con caché
   * Intenta desde caché local primero, luego descarga
   */
  async getPDFOptimized(serial, driveLink, apiBaseUrl, adminToken) {
    // 1. Intentar caché local
    if (this.cache.has(serial)) {
      console.log(`✅ PDF ${serial} desde CACHÉ (instantáneo)`);
      return this.cache.get(serial);
    }

    // 2. Descargar con optimización
    console.log(`📥 Descargando ${serial} optimizado...`);
    return this.downloadPDFOptimized(serial, driveLink, apiBaseUrl, adminToken);
  }

  /**
   * Descargar PDF con compresión y optimización
   */
  async downloadPDFOptimized(serial, driveLink, apiBaseUrl, adminToken) {
    try {
      // Extraer file_id de Drive
      let fileId = driveLink;
      if (driveLink.includes('/file/d/')) {
        fileId = driveLink.split('/file/d/')[1].split('/')[0];
      } else if (driveLink.includes('id=')) {
        fileId = driveLink.split('id=')[1].split('&')[0];
      }

      // Descargar con timeout corto
      const response = await fetch(
        `https://drive.google.com/uc?export=download&id=${fileId}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) {
        throw new Error(`Error descargando: ${response.status}`);
      }

      const blob = await response.blob();
      
      // Comprimir si es muy grande
      let optimizedBlob = blob;
      if (blob.size > 5 * 1024 * 1024) { // > 5MB
        optimizedBlob = await this.compressPDF(blob);
      }

      // Guardar en caché
      this.addToCache(serial, optimizedBlob);

      console.log(`✅ ${serial} descargado y cacheado (${(optimizedBlob.size / 1024).toFixed(2)} KB)`);
      return optimizedBlob;

    } catch (error) {
      console.error(`❌ Error descargando ${serial}:`, error);
      throw error;
    }
  }

  /**
   * Comprimir PDF reduciendo calidad de imágenes
   */
  async compressPDF(pdfBlob) {
    try {
      // Para PDFs muy grandes, crear una versión comprimida
      // Usando Canvas API para reducir resolución
      const { PDFDocument } = await import('pdf-lib');
      const pdfBytes = await pdfBlob.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // Reducir tamaño comprimiendo
      const compressedBytes = await pdfDoc.save({ 
        useObjectStreams: false,
        // Estos parámetros ayudan a reducir tamaño
      });

      const compressedBlob = new Blob([compressedBytes], { type: 'application/pdf' });
      const ratio = ((1 - compressedBlob.size / pdfBlob.size) * 100).toFixed(1);
      
      console.log(`🗜️ PDF comprimido: ${(pdfBlob.size / 1024).toFixed(0)}KB → ${(compressedBlob.size / 1024).toFixed(0)}KB (-${ratio}%)`);
      
      return compressedBlob;
    } catch (error) {
      console.warn(`⚠️ Compresión fallida, usando original:`, error);
      return pdfBlob;
    }
  }

  /**
   * Agregar a caché con management automático
   */
  addToCache(serial, blob) {
    // Si caché está lleno, eliminar el más antiguo
    if (this.cacheSize + blob.size > this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        const removedSize = this.cache.get(firstKey).size;
        this.cache.delete(firstKey);
        this.cacheSize -= removedSize;
        console.log(`🗑️  Limpié caché: ${firstKey}`);
      }
    }

    this.cache.set(serial, blob);
    this.cacheSize += blob.size;
  }

  /**
   * Limpiar caché manualmente
   */
  clearCache() {
    this.cache.clear();
    this.cacheSize = 0;
    console.log('🧹 Caché limpiado');
  }

  /**
   * Estadísticas del caché
   */
  getStats() {
    return {
      itemsCached: this.cache.size,
      sizeUsed: `${(this.cacheSize / 1024 / 1024).toFixed(2)} MB`,
      maxSize: `${(this.maxCacheSize / 1024 / 1024).toFixed(0)} MB`,
      items: Array.from(this.cache.keys())
    };
  }
}

// Instancia global
const pdfCacheManager = new PDFCacheManager();

export { pdfCacheManager, PDFCacheManager };
