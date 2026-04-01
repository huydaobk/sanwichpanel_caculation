/**
 * src/hooks/useWorkerCalculation.js
 *
 * Drop-in replacement cho useCalculation — chạy runPanelAnalysis
 * trong Web Worker để không block main thread.
 *
 * API giống với useCalculation:
 *   const { results, compareResults, compareExecutiveSummary, compareMetricRows, isPending } =
 *     useWorkerCalculation(config, compareModeEnabled, compareVariants);
 *
 * Thêm `isPending` — true khi worker đang tính toán.
 *
 * LƯU Ý: Worker chỉ khả dụng trong môi trường browser.
 * Trong môi trường test (Node.js), fallback về sync calculation.
 */

import { useEffect, useRef, useState } from 'react';
import { useCalculation } from './useCalculation';

// Vite hỗ trợ import Worker với `?worker` query
// Dùng lazy import để không break SSR / Node test env
let workerModule = null;
function getWorker() {
  if (typeof window === 'undefined') return null; // SSR/Node guard
  if (!workerModule) {
    try {
      workerModule = new Worker(
        new URL('../workers/calculationWorker.js', import.meta.url),
        { type: 'module' }
      );
    } catch {
      // Worker không khả dụng (e.g. file:// protocol Electron cũ)
      return null;
    }
  }
  return workerModule;
}

let _reqId = 0;
function nextId() { return ++_reqId; }

/**
 * useWorkerCalculation — identical API to useCalculation, but
 * offloads the main `results` calculation to a Web Worker.
 * compareResults still runs sync (lighter, multiple small calls).
 */
export function useWorkerCalculation(config, compareModeEnabled, compareVariants) {
  // Fallback sync giá trị — kết quả cũ trong khi worker đang chạy
  const sync = useCalculation(config, compareModeEnabled, compareVariants);
  const [workerResults, setWorkerResults] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const pendingRef = useRef(null);

  useEffect(() => {
    const worker = getWorker();
    if (!worker) return; // Fallback về sync nếu Worker không có

    const id = nextId();
    pendingRef.current = id;
    setIsPending(true);

    const handler = (event) => {
      const { id: resId, type, payload } = event.data;
      if (resId !== id) return; // ignore stale responses

      if (type === 'RESULT') {
        setWorkerResults(payload);
      } else if (type === 'ERROR') {
        console.error('[Worker] Calculation error:', payload);
        // fallback sang sync result
        setWorkerResults(null);
      }
      setIsPending(false);
    };

    worker.addEventListener('message', handler);
    worker.postMessage({
      id,
      type: 'ANALYZE',
      payload: {
        config,
        opts: { compareSummary: sync.compareExecutiveSummary },
      },
    });

    return () => {
      worker.removeEventListener('message', handler);
    };
  }, [config, sync.compareExecutiveSummary]);

  return {
    ...sync,
    // Dùng worker result nếu có (fresh), ngược lại dùng sync result (stale nhưng không blank)
    results: workerResults ?? sync.results,
    isPending,
  };
}
