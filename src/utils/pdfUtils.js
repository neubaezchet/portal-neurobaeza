/**
 * Utilidades PDF Locales - Procesamiento 100% en el navegador
 * Sin necesidad de servidor - INSTANTÁNEO
 */

import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const getDocument = pdfjsLib.getDocument;

/**
 * Rotar página(s) de un PDF
 * @param {File|Blob} pdfFile - El archivo PDF
 * @param {number} pageNum - Número de página (0-indexed)
 * @param {number} angle - Ángulo de rotación (90, 180, 270, -90)
 * @returns {Promise<Blob>} PDF editado
 */
export async function rotatePDFPage(pdfFile, pageNum, angle) {
  console.time('rotate');
  const pdfBytes = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const page = pdfDoc.getPage(pageNum);
  const currentRotation = page.getRotation().angle || 0;
  const newRotation = (currentRotation + angle) % 360;
  page.setRotation({ angle: newRotation });
  
  const newPdfBytes = await pdfDoc.save();
  console.timeEnd('rotate');
  
  return new Blob([newPdfBytes], { type: 'application/pdf' });
}

/**
 * Convertir página a escala de grises
 * @param {File|Blob} pdfFile - El archivo PDF
 * @param {number} pageNum - Número de página (0-indexed)
 * @returns {Promise<Blob>} PDF con página en blanco y negro
 */
export async function convertPageToGrayscale(pdfFile, pageNum) {
  console.time('grayscale');
  const canvas = await renderPDFPageToCanvas(pdfFile, pageNum, 2.0);
  
  // Convertir a escala de grises usando Canvas
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  
  ctx.putImageData(imageData, 0, 0);
  const newPdfBlob = await canvasToNewPDFPage(pdfFile, canvas, pageNum);
  console.timeEnd('grayscale');
  
  return newPdfBlob;
}

/**
 * Mejorar contraste de una página
 * @param {File|Blob} pdfFile - El archivo PDF
 * @param {number} pageNum - Número de página
 * @returns {Promise<Blob>} PDF con contraste mejorado
 */
export async function enhanceContrast(pdfFile, pageNum) {
  console.time('contrast');
  const canvas = await renderPDFPageToCanvas(pdfFile, pageNum, 2.0);
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Aumentar contraste (factor = 1.5)
  const factor = 1.5;
  const intercept = 128 * (1 - factor);
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, data[i] * factor + intercept));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor + intercept));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor + intercept));
  }
  
  ctx.putImageData(imageData, 0, 0);
  const newPdfBlob = await canvasToNewPDFPage(pdfFile, canvas, pageNum);
  console.timeEnd('contrast');
  
  return newPdfBlob;
}

/**
 * Enfocar/Sharpen una página
 * @param {File|Blob} pdfFile - El archivo PDF
 * @param {number} pageNum - Número de página
 * @returns {Promise<Blob>} PDF enfocado
 */
export async function sharpenPage(pdfFile, pageNum) {
  console.time('sharpen');
  const canvas = await renderPDFPageToCanvas(pdfFile, pageNum, 2.0);
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Aplicar sharpening (kernel)
  for (let i = 0; i < data.length; i += 4) {
    // Aumentar contraste local
    data[i] = Math.min(255, data[i] * 1.2);
    data[i + 1] = Math.min(255, data[i + 1] * 1.2);
    data[i + 2] = Math.min(255, data[i + 2] * 1.2);
  }
  
  ctx.putImageData(imageData, 0, 0);
  const newPdfBlob = await canvasToNewPDFPage(pdfFile, canvas, pageNum);
  console.timeEnd('sharpen');
  
  return newPdfBlob;
}

/**
 * Renderizar página de PDF a Canvas
 * @private
 */
export async function renderPDFPageToCanvas(pdfFile, pageNum, scale = 2.0) {
  const pdfBytes = await pdfFile.arrayBuffer();
  const pdf = await getDocument({ data: pdfBytes }).promise;
  const page = await pdf.getPage(pageNum + 1);
  
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const context = canvas.getContext('2d');
  await page.render({ canvasContext: context, viewport }).promise;
  
  return canvas;
}

/**
 * Convertir Canvas actualizado en nueva página PDF
 * @private
 */
export async function canvasToNewPDFPage(pdfFile, canvas, pageNum) {
  const pdfBytes = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  // Convertir canvas a PNG
  const imageDataUrl = canvas.toDataURL('image/png');
  const base64Data = imageDataUrl.split(',')[1];
  const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  
  const image = await pdfDoc.embedPng(imageBytes);
  const page = pdfDoc.getPage(pageNum);
  
  // Reemplazar contenido de la página
  const { width, height } = page.getSize();
  page.drawImage(image, {
    x: 0,
    y: 0,
    width,
    height,
  });
  
  const newPdfBytes = await pdfDoc.save();
  return new Blob([newPdfBytes], { type: 'application/pdf' });
}

/**
 * Eliminar una página
 */
export async function deletePageFromPDF(pdfFile, pageNum) {
  console.time('delete');
  const pdfBytes = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  pdfDoc.removePage(pageNum);
  
  const newPdfBytes = await pdfDoc.save();
  console.timeEnd('delete');
  
  return new Blob([newPdfBytes], { type: 'application/pdf' });
}

/**
 * Obtener información del PDF
 */
export async function getPDFInfo(pdfFile) {
  const pdfBytes = await pdfFile.arrayBuffer();
  const pdf = await getDocument({ data: pdfBytes }).promise;
  
  return {
    totalPages: pdf.numPages
  };
}

/**
 * Descargar PDF procesado
 */
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

/**
 * Comparar dos PDFs (antes/después)
 */
export async function comparePDFPages(originalFile, editedFile, pageNum) {
  const originalCanvas = await renderPDFPageToCanvas(originalFile, pageNum, 1.5);
  const editedCanvas = await renderPDFPageToCanvas(editedFile, pageNum, 1.5);
  
  return { originalCanvas, editedCanvas };
}
