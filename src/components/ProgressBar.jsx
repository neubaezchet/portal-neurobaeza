import React, { useEffect, useState } from 'react';

/**
 * Barra de progreso visual para operaciones
 * Muestra estimación de tiempo restante
 */
export default function ProgressBar({ 
  isVisible = false, 
  progress = 0, // 0-100
  message = 'Cargando...',
  currentStep = 1,
  totalSteps = 3,
  estimatedTimeLeft = '...'
}) {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Animar progreso suavemente
  useEffect(() => {
    if (progress > displayProgress) {
      const timer = setTimeout(() => {
        setDisplayProgress(Math.min(progress, displayProgress + 2));
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [progress, displayProgress]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 pointer-events-auto">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {message}
          </h3>
          <p className="text-sm text-gray-500">
            Paso {currentStep} de {totalSteps}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-300"
            style={{ width: `${displayProgress}%` }}
          />
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">{displayProgress}%</span>
          <span className="text-gray-600">
            {estimatedTimeLeft && `~${estimatedTimeLeft}`}
          </span>
        </div>

        {/* Optional detailed message */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          ⏱️ Por favor no cierres esta ventana
        </div>
      </div>
    </div>
  );
}

/**
 * Hook para controlar el progreso
 */
export function useProgress() {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Procesando...');
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(3);
  const [startTime, setStartTime] = useState(null);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState('...');

  const show = (opts = {}) => {
    setIsVisible(true);
    setProgress(0);
    setMessage(opts.message || 'Procesando...');
    setCurrentStep(opts.currentStep || 1);
    setTotalSteps(opts.totalSteps || 3);
    setStartTime(Date.now());
  };

  const update = (percent, opts = {}) => {
    setProgress(percent);
    if (opts.message) setMessage(opts.message);
    if (opts.step) setCurrentStep(opts.step);

    // Estimar tiempo restante
    if (startTime && percent > 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = (elapsed / percent) * (100 - percent);
      setEstimatedTimeLeft(`${Math.ceil(remaining)}s`);
    }
  };

  const finish = () => {
    setProgress(100);
    setTimeout(() => {
      setIsVisible(false);
    }, 500);
  };

  const hide = () => {
    setIsVisible(false);
    setProgress(0);
  };

  return {
    isVisible,
    progress,
    message,
    currentStep,
    totalSteps,
    estimatedTimeLeft,
    show,
    update,
    finish,
    hide
  };
}
