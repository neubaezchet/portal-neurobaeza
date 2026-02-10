/**
 * PDF IndexedDB Cache Manager - IncaNeurobaeza 2026
 * 
 * Almacena PDFs descargados en IndexedDB del navegador para carga instantánea.
 * - Primera carga: descarga desde backend (2-5s)
 * - Siguientes cargas: desde IndexedDB local (<300ms)
 * - Auto-limpieza cuando supera 200MB
 * - Detecta PDFs actualizados vía ETag/modifiedTime
 * - NO interfiere con Drive: Drive sigue siendo source of truth
 */

const DB_NAME = 'IncaNeurobaeza_PDFCache';
const DB_VERSION = 1;
const STORE_NAME = 'pdfs';
const MAX_CACHE_SIZE_MB = 200; // 200MB máximo
const MAX_ITEMS = 80; // Máximo 80 PDFs cacheados

class PDFIndexedDBCache {
  constructor() {
    this.db = null;
    this.isReady = false;
    this._initPromise = this._initDB();
  }

  /**
   * Inicializar IndexedDB
   */
  async _initDB() {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'serial' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('size', 'size', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          this.isReady = true;
          console.log('✅ [PDFCache] IndexedDB lista');
          resolve();
        };

        request.onerror = (event) => {
          console.warn('⚠️ [PDFCache] IndexedDB no disponible:', event.target.error);
          this.isReady = false;
          resolve(); // No rechazar, continuar sin caché
        };
      } catch (e) {
        console.warn('⚠️ [PDFCache] IndexedDB no soportada');
        this.isReady = false;
        resolve();
      }
    });
  }

  /**
   * Esperar a que la DB esté lista
   */
  async waitReady() {
    await this._initPromise;
  }

  /**
   * Obtener PDF cacheado por serial
   * @returns {ArrayBuffer|null} PDF bytes o null si no está cacheado
   */
  async get(serial) {
    await this.waitReady();
    if (!this.isReady || !this.db) return null;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(serial);

        request.onsuccess = () => {
          const result = request.result;
          if (result && result.pdfData) {
            // Actualizar timestamp de acceso (LRU)
            this._updateAccessTime(serial);
            console.log(`✅ [PDFCache] HIT: ${serial} (${(result.size / 1024).toFixed(0)}KB)`);
            resolve(result.pdfData);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  /**
   * Obtener metadatos sin los bytes (para comparar versiones)
   */
  async getMeta(serial) {
    await this.waitReady();
    if (!this.isReady || !this.db) return null;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(serial);

        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            resolve({
              serial: result.serial,
              etag: result.etag,
              modifiedTime: result.modifiedTime,
              size: result.size,
              timestamp: result.timestamp
            });
          } else {
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  /**
   * Guardar PDF en caché
   * @param {string} serial - Serial del caso
   * @param {ArrayBuffer} pdfData - Bytes del PDF
   * @param {object} meta - Metadatos opcionales (etag, modifiedTime)
   */
  async put(serial, pdfData, meta = {}) {
    await this.waitReady();
    if (!this.isReady || !this.db) return;

    try {
      // Limpiar si es necesario antes de insertar
      await this._ensureSpace(pdfData.byteLength || pdfData.length);

      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const entry = {
        serial,
        pdfData,
        size: pdfData.byteLength || pdfData.length,
        etag: meta.etag || null,
        modifiedTime: meta.modifiedTime || null,
        timestamp: Date.now(),
        lastAccessed: Date.now()
      };

      store.put(entry);

      return new Promise((resolve) => {
        tx.oncomplete = () => {
          console.log(`💾 [PDFCache] Guardado: ${serial} (${(entry.size / 1024).toFixed(0)}KB)`);
          resolve(true);
        };
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn('⚠️ [PDFCache] Error guardando:', e);
    }
  }

  /**
   * Eliminar un PDF del caché
   */
  async delete(serial) {
    await this.waitReady();
    if (!this.isReady || !this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(serial);
        tx.oncomplete = () => {
          console.log(`🗑️ [PDFCache] Eliminado: ${serial}`);
          resolve(true);
        };
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  /**
   * Invalidar caché de un serial (cuando se actualiza en Drive)
   * Llamar después de editar PDF o cambiar estado
   */
  async invalidate(serial) {
    return this.delete(serial);
  }

  /**
   * Actualizar timestamp de último acceso (LRU eviction)
   */
  async _updateAccessTime(serial) {
    if (!this.isReady || !this.db) return;

    try {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(serial);

      request.onsuccess = () => {
        const data = request.result;
        if (data) {
          data.lastAccessed = Date.now();
          store.put(data);
        }
      };
    } catch (e) {
      // Silencioso
    }
  }

  /**
   * Asegurar espacio suficiente (evicción LRU)
   */
  async _ensureSpace(newItemSize) {
    if (!this.isReady || !this.db) return;

    try {
      const tx = this.db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      return new Promise((resolve) => {
        request.onsuccess = async () => {
          const items = request.result || [];
          
          // Calcular tamaño total
          let totalSize = items.reduce((sum, item) => sum + (item.size || 0), 0);
          const maxBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;

          // Si hay espacio suficiente y no excede max items, no hacer nada
          if (totalSize + newItemSize < maxBytes && items.length < MAX_ITEMS) {
            resolve();
            return;
          }

          // Ordenar por último acceso (más antiguo primero)
          const sorted = items.sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0));

          // Eliminar los más antiguos hasta tener espacio
          const toDelete = [];
          while (
            (totalSize + newItemSize >= maxBytes || sorted.length - toDelete.length >= MAX_ITEMS) &&
            toDelete.length < sorted.length
          ) {
            const oldest = sorted[toDelete.length];
            toDelete.push(oldest.serial);
            totalSize -= oldest.size || 0;
          }

          // Ejecutar eliminaciones
          if (toDelete.length > 0) {
            const deleteTx = this.db.transaction(STORE_NAME, 'readwrite');
            const deleteStore = deleteTx.objectStore(STORE_NAME);
            toDelete.forEach(serial => deleteStore.delete(serial));
            console.log(`🧹 [PDFCache] Limpiados ${toDelete.length} PDFs antiguos`);
          }

          resolve();
        };

        request.onerror = () => resolve();
      });
    } catch (e) {
      // Continuar sin limpiar
    }
  }

  /**
   * Limpiar TODO el caché
   */
  async clearAll() {
    await this.waitReady();
    if (!this.isReady || !this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        tx.oncomplete = () => {
          console.log('🧹 [PDFCache] Todo el caché limpiado');
          resolve(true);
        };
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  /**
   * Estadísticas del caché
   */
  async getStats() {
    await this.waitReady();
    if (!this.isReady || !this.db) return { items: 0, totalSizeMB: 0, maxSizeMB: MAX_CACHE_SIZE_MB };

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const items = request.result || [];
          const totalSize = items.reduce((sum, item) => sum + (item.size || 0), 0);
          resolve({
            items: items.length,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            maxSizeMB: MAX_CACHE_SIZE_MB,
            serials: items.map(i => i.serial)
          });
        };

        request.onerror = () => resolve({ items: 0, totalSizeMB: 0, maxSizeMB: MAX_CACHE_SIZE_MB });
      } catch (e) {
        resolve({ items: 0, totalSizeMB: 0, maxSizeMB: MAX_CACHE_SIZE_MB });
      }
    });
  }
}

// Instancia global singleton
const pdfDBCache = new PDFIndexedDBCache();

export { pdfDBCache, PDFIndexedDBCache };
export default pdfDBCache;
