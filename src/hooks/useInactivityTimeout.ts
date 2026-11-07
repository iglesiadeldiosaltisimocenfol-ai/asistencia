/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInactivityTimeoutOptions {
  timeoutMs?: number; // Tiempo total de inactividad permitido (por defecto 10 min = 600,000 ms)
  warningMs?: number; // Tiempo antes del timeout para mostrar advertencia (por defecto 60 seg = 60,000 ms)
  isEnabled: boolean; // Si la sesión está activa y debe monitorearse
  onTimeout: () => void; // Acción al cumplirse el tiempo de inactividad
}

const STORAGE_KEY = 'cenfol_last_activity_timestamp';

export function useInactivityTimeout({
  timeoutMs = 10 * 60 * 1000, // 10 minutos
  warningMs = 60 * 1000,      // 60 segundos antes
  isEnabled,
  onTimeout,
}: UseInactivityTimeoutOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(Math.round(warningMs / 1000));
  
  const lastActivityRef = useRef<number>(Date.now());
  const lastThrottleRef = useRef<number>(0);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Reiniciar temporizador manualmente o por actividad
  const resetTimer = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {}
    setShowWarning(false);
    setSecondsRemaining(Math.round(warningMs / 1000));
  }, [warningMs]);

  useEffect(() => {
    if (!isEnabled) {
      setShowWarning(false);
      return;
    }

    // Inicializar timestamp de actividad actual
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {}

    // Eventos que representan actividad del usuario
    const handleUserActivity = () => {
      const currentTime = Date.now();
      // Throttle de 1.5s para no saturar memoria en movimientos continuos de mouse o scroll
      if (currentTime - lastThrottleRef.current < 1500) {
        return;
      }
      lastThrottleRef.current = currentTime;
      lastActivityRef.current = currentTime;
      try {
        localStorage.setItem(STORAGE_KEY, String(currentTime));
      } catch {}

      setShowWarning((prev) => {
        if (prev) {
          setSecondsRemaining(Math.round(warningMs / 1000));
          return false;
        }
        return false;
      });
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });

    // Intervalo de chequeo cada segundo
    const intervalId = setInterval(() => {
      let savedTimestamp = lastActivityRef.current;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = Number(stored);
          if (!isNaN(parsed) && parsed > savedTimestamp) {
            savedTimestamp = parsed;
            lastActivityRef.current = parsed;
          }
        }
      } catch {}

      const elapsed = Date.now() - savedTimestamp;
      const remaining = timeoutMs - elapsed;

      if (remaining <= 0) {
        // Tiempo agotado (10 minutos de inactividad)
        setShowWarning(false);
        onTimeoutRef.current();
      } else if (remaining <= warningMs) {
        // Advertencia previa durante el último minuto
        setShowWarning(true);
        setSecondsRemaining(Math.max(1, Math.ceil(remaining / 1000)));
      } else {
        setShowWarning((prev) => (prev ? false : prev));
      }
    }, 1000);

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });
      clearInterval(intervalId);
    };
  }, [isEnabled, timeoutMs, warningMs]);

  return {
    showWarning,
    secondsRemaining,
    resetTimer,
  };
}
