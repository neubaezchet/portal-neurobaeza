/**
 * HOOK: useTableViva
 * Maneja la lógica de tabla viva con auto-refresh
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import reporteService from '../services/reporteService';
import { API_CONFIG } from '../constants/reportConfig';

export function useTableViva(empresa = 'all', periodo = 'mes_actual', autoRefresh = true) {
  const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date());

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['tablaViva', empresa, periodo],
    queryFn: () => reporteService.getTablaViva({ empresa, periodo }),
    refetchInterval: autoRefresh ? API_CONFIG.REFRESH_INTERVAL : false,
    refetchOnWindowFocus: false,
    staleTime: 15000,
    onSuccess: () => {
      setUltimaActualizacion(new Date());
    },
  });

  const handleAutoRefreshToggle = useCallback((newValue) => {
    if (newValue) {
      refetch();
    }
  }, [refetch]);

  return {
    datos: data,
    cargando: isLoading,
    error,
    actualizando: isFetching,
    ultimaActualizacion,
    refetch,
    handleAutoRefreshToggle,
  };
}
