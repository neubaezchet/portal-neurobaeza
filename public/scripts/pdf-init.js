/**
 * Setup PDF.js - Ejecutar en el index.html antes de cargar React
 * Asegura que PDF.js esté disponible globalmente
 */

(function initPDFjs() {
  // Esperar a que se cargue PDF.js
  const checkPDFjs = setInterval(() => {
    if (typeof window.pdfjsLib !== 'undefined') {
      console.log('✅ PDF.js cargado correctamente');
      
      // Configurar worker si es necesario
      if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      
      // Deshabilitar caching para documentos dinámicos
      window.pdfjsLib.cacheSize = 0; // Sin cache global (usamos memoria)
      
      console.log('✅ PDF.js configurado: Worker y caching listos');
      clearInterval(checkPDFjs);
    }
  }, 100);

  // Timeout si no carga en 10 segundos
  setTimeout(() => {
    clearInterval(checkPDFjs);
    if (typeof window.pdfjsLib === 'undefined') {
      console.warn('⚠️ PDF.js no cargó. Intenta recargar la página');
    }
  }, 10000);
})();
