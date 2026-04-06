import { useState, useEffect } from "react";

export function usePolling(callback: () => void, intervalMs: number, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(callback, intervalMs);
    
    return () => clearInterval(interval);
  }, [callback, intervalMs, enabled]);
}
