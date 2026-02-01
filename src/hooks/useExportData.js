/**
 * HOOK: useExportData
 * Maneja lógica de exportación con preview
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import reporteService from '../services/reporteService';
import { downloadFile, generarNombreArchivo } from '../utils/exportHelpers';

export function useExportData() {
  const [previewDatos, setPreviewDatos] = useState(null);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  const previewMutation = useMutation({
    mutationFn: (params) => reporteService.getPreview(params),
    onSuccess: (data) => {
      setPreviewDatos(data);
      setMostrarPreview(true);
    },
    onError: (error) => {
      console.error('Error preview:', error);
    },
  });

  const exportarMutation = useMutation({
    mutationFn: ({ params, formato }) => reporteService.exportar(params, formato),
    onSuccess: (blob, variables) => {
      const filename = generarNombreArchivo(
        variables.params.empresa,
        variables.formato
      );
      downloadFile(blob, filename);
    },
    onError: (error) => {
      console.error('Error exportando:', error);
    },
  });

  const cargarPreview = useCallback((params) => {
    previewMutation.mutate(params);
  }, [previewMutation]);

  const exportar = useCallback((params, formato) => {
    exportarMutation.mutate({ params, formato });
  }, [exportarMutation]);

  const limpiarPreview = useCallback(() => {
    setPreviewDatos(null);
    setMostrarPreview(false);
  }, []);

  return {
    cargarPreview,
    exportar,
    previewDatos,
    mostrarPreview,
    limpiarPreview,
    cargandoPreview: previewMutation.isPending,
    cargandoExport: exportarMutation.isPending,
    errorPreview: previewMutation.error,
    errorExport: exportarMutation.error,
  };
}
