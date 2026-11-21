import React, { useEffect, useRef, useState } from 'react';
import { useGlobalLoading } from '../context/LoadingContext';

export const TopProgressBar: React.FC = () => {
  const { isGlobalLoading } = useGlobalLoading();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const trickleTimerRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (trickleTimerRef.current !== null) {
        window.clearInterval(trickleTimerRef.current);
        trickleTimerRef.current = null;
      }
      if (finishTimerRef.current !== null) {
        window.clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
    };

    if (isGlobalLoading) {
      clearTimers();
      setVisible(true);
      setProgress((prev) => (prev > 18 && prev < 90 ? prev : 24));

      trickleTimerRef.current = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 88) return prev;
          const step = prev < 50 ? 9 : prev < 75 ? 4 : 1.5;
          return Math.min(88, Number((prev + step).toFixed(1)));
        });
      }, 180);
    } else if (visible) {
      clearTimers();
      setProgress(100);
      finishTimerRef.current = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 220);
    }

    return clearTimers;
  }, [isGlobalLoading, visible]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[120] h-[3px] pointer-events-none print:hidden"
    >
      <div
        className="h-full bg-gradient-to-r from-teal-700 via-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(13,148,136,0.45)] transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress >= 100 ? 0 : 1,
        }}
      />
    </div>
  );
};
