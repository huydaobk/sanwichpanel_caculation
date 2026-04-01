/**
 * src/workers/calculationWorker.js
 *
 * Web Worker cho FEM solver (runPanelAnalysis).
 * Offload tính toán nặng khỏi main thread để UI không bị block.
 *
 * Message protocol:
 *   IN:  { id, type: 'ANALYZE', payload: { config, opts } }
 *   OUT: { id, type: 'RESULT', payload: summary }
 *         { id, type: 'ERROR',  payload: message }
 */

import { runPanelAnalysis, DEFAULT_REDISTRIBUTION_MODE } from '../calc/index.js';

self.onmessage = function (event) {
  const { id, type, payload } = event.data;

  if (type === 'ANALYZE') {
    try {
      const { config, opts = {} } = payload;
      const { summary } = runPanelAnalysis(config, {
        defaultRedistributionMode: DEFAULT_REDISTRIBUTION_MODE,
        ...opts,
      });
      self.postMessage({ id, type: 'RESULT', payload: summary });
    } catch (err) {
      self.postMessage({ id, type: 'ERROR', payload: err.message || String(err) });
    }
  }
};
