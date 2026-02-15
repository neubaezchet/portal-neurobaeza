/**
 * Utilidades PDF Locales - Procesamiento 100% en el navegador
 * Sin necesidad de servidor - INSTANTÁNEO
 * 
 * Usa window.pdfjsLib (CDN v3.11.174) para renderizar.
 * Usa pdf-lib para manipulación estructural (rotación, eliminación).
 * Usa Canvas API + CSS filters para edición visual en vivo.
 */

import { PDFDocument, rgb } from 'pdf-lib';

// ═══════════════════════════════════════════════════════════
// PDF.js Global (CDN v3.11.174)
// ═══════════════════════════════════════════════════════════
const getPdfjsLib = () => {
  const lib = window.pdfjsLib;
  if (!lib) throw new Error('PDF.js no disponible (window.pdfjsLib)');
  return lib;
};

const getDocument = (options) => getPdfjsLib().getDocument(options);

// ═══════════════════════════════════════════════════════════
// ROTACIÓN - Instantánea via pdf-lib (solo metadata, no re-render)
// ═══════════════════════════════════════════════════════════
export async function rotatePDFPage(pdfFile, pageNum, angle) {
  const t0 = performance.now();
  const pdfBytes = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const page = pdfDoc.getPage(pageNum);
  const currentRotation = page.getRotation().angle || 0;
  const newRotation = (currentRotation + angle + 360) % 360;
  page.setRotation({ type: 0, angle: newRotation });
  
  const newPdfBytes = await pdfDoc.save();
  console.log(`[PDF] Rotación ${angle}° completada en ${(performance.now() - t0).toFixed(0)}ms`);
  
  return new Blob([newPdfBytes], { type: 'application/pdf' });
}

// Rotar TODAS las páginas
export async function rotateAllPages(pdfFile, angle) {
  const t0 = performance.now();
  const pdfBytes = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    const currentRotation = page.getRotation().angle || 0;
    page.setRotation({ type: 0, angle: (currentRotation + angle + 360) % 360 });
  }
  
  const newPdfBytes = await pdfDoc.save();
  console.log(`[PDF] Rotación ${angle}° en ${totalPages} páginas: ${(performance.now() - t0).toFixed(0)}ms`);
  
  return new Blob([newPdfBytes], { type: 'application/pdf' });
}

// ═══════════════════════════════════════════════════════════
// RENDERIZADO DE PÁGINA PDF → Canvas
// ═══════════════════════════════════════════════════════════
export async function renderPDFPageToCanvas(pdfFile, pageNum, scale = 2.0) {
  const pdfBytes = await pdfFile.arrayBuffer();
  const pdf = await getDocument({ data: pdfBytes }).promise;
  const page = await pdf.getPage(pageNum + 1); // pdf.js es 1-indexed
  
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const context = canvas.getContext('2d');
  await page.render({ canvasContext: context, viewport }).promise;
  
  return canvas;
}

// ═══════════════════════════════════════════════════════════
// FILTROS EN VIVO - CSS Filters (GPU acelerado, instantáneo)
// ═══════════════════════════════════════════════════════════

/**
 * Genera un string CSS filter para aplicar a un elemento img/canvas
 * GPU-acelerado, se actualiza en tiempo real con sliders
 */
export function buildCSSFilter({ brightness = 1, contrast = 1, grayscale = false, sharpness = 0 }) {
  const parts = [];
  if (brightness !== 1) parts.push(`brightness(${brightness})`);
  if (contrast !== 1) parts.push(`contrast(${contrast})`);
  if (grayscale) parts.push('grayscale(1)');
  if (sharpness > 0) parts.push('url(#pdf-sharpen-filter)');
  return parts.length > 0 ? parts.join(' ') : 'none';
}

/**
 * Genera el SVG inline para sharpening en vivo via feConvolveMatrix
 * Insertar UNA sola vez en el DOM
 */
export function createSharpenSVGMarkup(amount = 1) {
  const center = (1 + 4 * amount).toFixed(2);
  const side = (-amount).toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden">
    <defs>
      <filter id="pdf-sharpen-filter" color-interpolation-filters="sRGB">
        <feConvolveMatrix order="3" kernelMatrix="0 ${side} 0 ${side} ${center} ${side} 0 ${side} 0" preserveAlpha="true"/>
      </filter>
    </defs>
  </svg>`;
}

// ═══════════════════════════════════════════════════════════
// APLICAR FILTROS A CANVAS (bake final antes de guardar)
// ═══════════════════════════════════════════════════════════

/**
 * Aplica brillo, contraste, grayscale via Canvas API ctx.filter (GPU)
 */
export function applyCanvasFilters(sourceCanvas, { brightness = 1, contrast = 1, grayscale = false }) {
  const t0 = performance.now();
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = sourceCanvas.width;
  outputCanvas.height = sourceCanvas.height;
  const ctx = outputCanvas.getContext('2d');
  
  const filterParts = [];
  if (brightness !== 1) filterParts.push(`brightness(${brightness})`);
  if (contrast !== 1) filterParts.push(`contrast(${contrast})`);
  if (grayscale) filterParts.push('grayscale(1)');
  
  ctx.filter = filterParts.length > 0 ? filterParts.join(' ') : 'none';
  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.filter = 'none';
  
  console.log(`[PDF] Filtros canvas en ${(performance.now() - t0).toFixed(0)}ms`);
  return outputCanvas;
}

/**
 * Sharpening real con kernel de convolución 3x3 (Unsharp Mask)
 */
export function applySharpen(sourceCanvas, amount = 1.0) {
  const t0 = performance.now();
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = w;
  outputCanvas.height = h;
  
  const srcCtx = sourceCanvas.getContext('2d');
  const dstCtx = outputCanvas.getContext('2d');
  
  const imageData = srcCtx.getImageData(0, 0, w, h);
  const src = imageData.data;
  const output = new Uint8ClampedArray(src.length);
  
  const center = 1 + 4 * amount;
  const side = -amount;
  
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const val = 
          src[((y - 1) * w + x) * 4 + c] * side +
          src[(y * w + (x - 1)) * 4 + c] * side +
          src[idx + c] * center +
          src[(y * w + (x + 1)) * 4 + c] * side +
          src[((y + 1) * w + x) * 4 + c] * side;
        output[idx + c] = val;
      }
      output[idx + 3] = src[idx + 3];
    }
  }
  
  // Copiar bordes sin modificar
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 4; c++) {
      output[x * 4 + c] = src[x * 4 + c];
      output[((h - 1) * w + x) * 4 + c] = src[((h - 1) * w + x) * 4 + c];
    }
  }
  for (let y = 0; y < h; y++) {
    for (let c = 0; c < 4; c++) {
      output[(y * w) * 4 + c] = src[(y * w) * 4 + c];
      output[(y * w + w - 1) * 4 + c] = src[(y * w + w - 1) * 4 + c];
    }
  }
  
  dstCtx.putImageData(new ImageData(output, w, h), 0, 0);
  console.log(`[PDF] Sharpen (${amount.toFixed(1)}) en ${(performance.now() - t0).toFixed(0)}ms`);
  return outputCanvas;
}

// ═══════════════════════════════════════════════════════════
// RECORTE (CROP)
// ═══════════════════════════════════════════════════════════

/**
 * Recorta una región de un canvas
 */
export function cropCanvas(sourceCanvas, cropRect) {
  const t0 = performance.now();
  const { x, y, width, height } = cropRect;
  
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = Math.max(1, Math.round(width));
  outputCanvas.height = Math.max(1, Math.round(height));
  
  outputCanvas.getContext('2d').drawImage(
    sourceCanvas, x, y, width, height, 0, 0, outputCanvas.width, outputCanvas.height
  );
  
  console.log(`[PDF] Crop ${Math.round(width)}x${Math.round(height)} en ${(performance.now() - t0).toFixed(0)}ms`);
  return outputCanvas;
}

/**
 * Auto-crop: detecta bordes blancos y los elimina
 */
export function autoCropCanvas(sourceCanvas, threshold = 240, margin = 10) {
  const t0 = performance.now();
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const data = sourceCanvas.getContext('2d').getImageData(0, 0, w, h).data;
  
  let top = 0, bottom = h - 1, left = 0, right = w - 1;
  
  const isWhite = (idx) => data[idx] >= threshold && data[idx + 1] >= threshold && data[idx + 2] >= threshold;
  
  // Top
  find_top: for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isWhite((y * w + x) * 4)) { top = y; break find_top; }
    }
  }
  // Bottom
  find_bottom: for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      if (!isWhite((y * w + x) * 4)) { bottom = y; break find_bottom; }
    }
  }
  // Left
  find_left: for (let x = 0; x < w; x++) {
    for (let y = top; y <= bottom; y++) {
      if (!isWhite((y * w + x) * 4)) { left = x; break find_left; }
    }
  }
  // Right
  find_right: for (let x = w - 1; x >= 0; x--) {
    for (let y = top; y <= bottom; y++) {
      if (!isWhite((y * w + x) * 4)) { right = x; break find_right; }
    }
  }
  
  top = Math.max(0, top - margin);
  bottom = Math.min(h - 1, bottom + margin);
  left = Math.max(0, left - margin);
  right = Math.min(w - 1, right + margin);
  
  const cw = right - left + 1;
  const ch = bottom - top + 1;
  
  if (cw >= w * 0.95 && ch >= h * 0.95) {
    console.log('[PDF] Auto-crop: sin cambios significativos');
    return { canvas: sourceCanvas, cropped: false };
  }
  
  const cropped = cropCanvas(sourceCanvas, { x: left, y: top, width: cw, height: ch });
  console.log(`[PDF] Auto-crop: ${w}x${h} → ${cw}x${ch} (${(performance.now() - t0).toFixed(0)}ms)`);
  return { canvas: cropped, cropped: true };
}

// ═══════════════════════════════════════════════════════════
// CANVAS → PDF (guardar cambios)
// ═══════════════════════════════════════════════════════════

/**
 * Reemplaza página del PDF con contenido de un canvas
 * Usa JPEG (más rápido que PNG para documentos escaneados)
 */
export async function canvasToNewPDFPage(pdfFile, canvas, pageNum) {
  const t0 = performance.now();
  const pdfBytes = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const imageDataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const base64Data = imageDataUrl.split(',')[1];
  const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  
  const image = await pdfDoc.embedJpg(imageBytes);
  const page = pdfDoc.getPage(pageNum);
  const { width, height } = page.getSize();
  
  // Fondo blanco + imagen editada
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
  page.drawImage(image, { x: 0, y: 0, width, height });
  
  const newPdfBytes = await pdfDoc.save();
  console.log(`[PDF] Canvas→PDF en ${(performance.now() - t0).toFixed(0)}ms`);
  return new Blob([newPdfBytes], { type: 'application/pdf' });
}

// ═══════════════════════════════════════════════════════════
// PROCESAMIENTO COMBINADO (filtros + sharpen + crop en 1 paso)
// ═══════════════════════════════════════════════════════════

/**
 * Aplica TODOS los ajustes y genera el PDF final
 * @param {Object} adjustments - {brightness, contrast, grayscale, sharpness, cropRect}
 * cropRect: {x, y, width, height} normalizado 0-1
 */
export async function applyAllAdjustments(pdfFile, pageNum, adjustments) {
  const t0 = performance.now();
  const { brightness = 1, contrast = 1, grayscale = false, sharpness = 0, cropRect = null } = adjustments;
  
  let canvas = await renderPDFPageToCanvas(pdfFile, pageNum, 2.0);
  
  // 1. Crop primero
  if (cropRect) {
    canvas = cropCanvas(canvas, {
      x: Math.round(cropRect.x * canvas.width),
      y: Math.round(cropRect.y * canvas.height),
      width: Math.round(cropRect.width * canvas.width),
      height: Math.round(cropRect.height * canvas.height),
    });
  }
  
  // 2. Brightness/Contrast/Grayscale (GPU)
  if (brightness !== 1 || contrast !== 1 || grayscale) {
    canvas = applyCanvasFilters(canvas, { brightness, contrast, grayscale });
  }
  
  // 3. Sharpen (convolution kernel)
  if (sharpness > 0) {
    canvas = applySharpen(canvas, sharpness);
  }
  
  // 4. Guardar en PDF
  const result = await canvasToNewPDFPage(pdfFile, canvas, pageNum);
  console.log(`[PDF] Todos los ajustes en ${(performance.now() - t0).toFixed(0)}ms`);
  return result;
}

// ═══════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════

export async function deletePageFromPDF(pdfFile, pageNum) {
  const t0 = performance.now();
  const pdfBytes = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdfDoc.removePage(pageNum);
  const newPdfBytes = await pdfDoc.save();
  console.log(`[PDF] Página ${pageNum} eliminada en ${(performance.now() - t0).toFixed(0)}ms`);
  return new Blob([newPdfBytes], { type: 'application/pdf' });
}

export async function getPDFInfo(pdfFile) {
  const pdfBytes = await pdfFile.arrayBuffer();
  const pdf = await getDocument({ data: pdfBytes }).promise;
  return { totalPages: pdf.numPages };
}

export function downloadPDF(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Legacy exports (compatibilidad)
export async function convertPageToGrayscale(pdfFile, pageNum) {
  return applyAllAdjustments(pdfFile, pageNum, { grayscale: true });
}

export async function enhanceContrast(pdfFile, pageNum) {
  return applyAllAdjustments(pdfFile, pageNum, { contrast: 1.5 });
}

export async function sharpenPage(pdfFile, pageNum) {
  return applyAllAdjustments(pdfFile, pageNum, { sharpness: 1.0 });
}

export async function comparePDFPages(originalFile, editedFile, pageNum) {
  const [originalCanvas, editedCanvas] = await Promise.all([
    renderPDFPageToCanvas(originalFile, pageNum, 1.5),
    renderPDFPageToCanvas(editedFile, pageNum, 1.5),
  ]);
  return { originalCanvas, editedCanvas };
}
