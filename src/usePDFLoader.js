/**
 * Hook React: usePDFLoader
 * Carga PDFs instantáneamente con mejora automática de calidad
 * 
 * Uso en DocumentViewer:
 * const { pages, loading, error } = usePDFLoader(pdfUrl, headers);
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export function usePDFLoader(pdfUrl, headers = {}) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  
  const loaderRef = useRef(null);
  const isInitializedRef = useRef(false);
  const currentPageRef = useRef(0);

  /**
   * 🚀 INICIALIZAR: Cargar primera página INSTANTÁNEAMENTE
   */
  useEffect(() => {
    if (isInitializedRef.current || !pdfUrl) return;
    isInitializedRef.current = true;

    const initializePDF = async () => {
      try {
        setLoading(true);
        setError(null);

        // Importar el loader
        if (!window.OptimizedPDFLoader) {
          throw new Error('OptimizedPDFLoader no disponible');
        }

        // Crear instancia
        loaderRef.current = new window.OptimizedPDFLoader(pdfUrl, headers);

        // ⚡ PASO 1: Cargar primera página RÁPIDO
        console.log('⚡ Cargando primera página...');
        const firstPage = await loaderRef.current.loadFirstPageFast();
        
        // Mostrar INMEDIATAMENTE
        setPages(firstPage);
        setLoading(false); // ✅ Usuario ve contenido ahora
        console.log('✅ Primera página visible');

        // ⏳ PASO 2: Mientras el usuario ve la página 1, cargar el resto en background
        setTimeout(() => {
          loadAllPagesInBackground();
        }, 500); // Esperar 500ms después de mostrar

      } catch (err) {
        console.error('❌ Error inicializando PDF:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    /**
     * 📥 BACKGROUND: Cargar todas las páginas
     */
    const loadAllPagesInBackground = async () => {
      try {
        const doc = await loaderRef.current.loadDocument();
        const numPages = doc.numPages;
        
        console.log(`📥 Cargando ${numPages} páginas en background...`);
        setTotalPages(numPages);

        // Cargar TODAS pero en baja calidad (rápido)
        const allPages = await loaderRef.current.loadAllPagesFast(numPages);
        
        // Actualizar state con TODAS las páginas
        setPages(allPages);
        console.log('✅ Todas las páginas cargadas en baja calidad');

        // 🎨 PASO 3: Mejorar calidad de la página actual + próximas 3
        setTimeout(() => {
          improveCurrentAndNextPages(currentPageRef.current);
        }, 300);

      } catch (err) {
        console.error('⚠️ Error en carga background:', err);
        // No mostrar error al usuario, el PDF ya está visible
      }
    };

    initializePDF();

    return () => {
      // Cleanup
      if (loaderRef.current) {
        loaderRef.current.clearAllCache();
      }
    };
  }, [pdfUrl]); // ⚠️ Agregar headers si cambia

  /**
   * 🎨 Mejorar calidad de página actual y próximas
   */
  const improveCurrentAndNextPages = useCallback(async (pageIndex) => {
    if (!loaderRef.current) return;

    // Mejorar página actual
    const improved = await loaderRef.current.improvePageQuality(pageIndex);
    
    if (improved) {
      // Actualizar en UI solo esta página
      setPages(prev => {
        const updated = [...prev];
        updated[pageIndex] = {
          ...updated[pageIndex],
          fullImage: improved.fullImage,
          quality: 'high'
        };
        return updated;
      });
    }

    // Precarga inteligente de próximas
    loaderRef.current.preloadNextPages(pageIndex, totalPages);
  }, [totalPages]);

  /**
   * 📄 Cambiar página
   */
  const changePage = useCallback((newPageIndex) => {
    currentPageRef.current = newPageIndex;
    
    // Si la página no está en calidad alta, mejorarla
    const page = pages[newPageIndex];
    if (page && page.quality !== 'high') {
      improveCurrentAndNextPages(newPageIndex);
    }
  }, [pages, improveCurrentAndNextPages]);

  /**
   * 🔄 Forzar recarga (para ediciones de PDF)
   */
  const reloadPDF = useCallback(async () => {
    try {
      isInitializedRef.current = false;
      setPages([]);
      setLoading(true);
      
      if (loaderRef.current) {
        loaderRef.current.clearAllCache();
        loaderRef.current = null;
      }

      // Reiniciar
      const event = new Event('initPDF');
      window.dispatchEvent(event);
      
    } catch (err) {
      setError('Error recargando PDF');
      console.error(err);
    }
  }, []);

  return {
    pages,
    loading,
    error,
    totalPages,
    changePage,
    reloadPDF
  };
}

export default usePDFLoader;
