import { useMemo } from 'react';
import { 
  runPanelAnalysis, 
  buildCompareExecutiveSummary, 
  DEFAULT_REDISTRIBUTION_MODE 
} from '../calc';
import { buildCompareMetricRows, buildCompareDeltaText } from '../utils/appLogic';

export function useCalculation(config, compareModeEnabled, compareVariants) {
  const compareResults = useMemo(() => (
    compareVariants.map((variant) => ({
      ...variant,
      summary: runPanelAnalysis(variant.config, { defaultRedistributionMode: DEFAULT_REDISTRIBUTION_MODE }).summary,
    }))
  ), [compareVariants]);

  const compareExecutiveSummary = useMemo(() => (
    compareModeEnabled && compareResults.length >= 2
      ? buildCompareExecutiveSummary(compareResults)
      : buildCompareExecutiveSummary([])
  ), [compareModeEnabled, compareResults]);

  const compareMetricRows = useMemo(() => {
    if (!compareModeEnabled || compareResults.length < 2) return [];
    const firstConfig = compareResults[0]?.config || config;
    const baseline = compareResults[0]?.summary;
    const rowMap = new Map();

    compareResults.forEach((variant) => {
      buildCompareMetricRows(variant.summary, variant.config || firstConfig).forEach((row) => {
        if (!rowMap.has(row.key)) {
          rowMap.set(row.key, { key: row.key, label: row.label, values: [] });
        }

        let diffHint = null;
        if (baseline && variant.id !== compareResults[0]?.id) {
          if (row.key === 'ratio') {
            diffHint = buildCompareDeltaText(
              Number(baseline?.governingCases?.overall?.ratio || 0),
              Number(variant.summary?.governingCases?.overall?.ratio || 0),
              { inverse: true },
            );
          }
          if (row.key === 'deflection') {
            diffHint = buildCompareDeltaText(
              Number(baseline?.ratios?.deflection || 0),
              Number(variant.summary?.ratios?.deflection || 0),
              { inverse: true },
            );
          }
          if (row.key === 'crushing') {
            diffHint = buildCompareDeltaText(
              Number(baseline?.ratios?.crushing || 0),
              Number(variant.summary?.ratios?.crushing || 0),
              { inverse: true },
            );
          }
          if (row.key === 'uplift') {
            diffHint = buildCompareDeltaText(
              Number(baseline?.ratios?.uplift || 0),
              Number(variant.summary?.ratios?.uplift || 0),
              { inverse: true },
            );
          }
        }

        rowMap.get(row.key).values.push({
          variantId: variant.id,
          value: row.value,
          tone: row.tone,
          subValue: row.subValue,
          diffHint,
          isBest: compareExecutiveSummary.bestVariantId === variant.id && ['status', 'ratio', 'deflection', 'crushing', 'uplift'].includes(row.key),
        });
      });
    });

    return Array.from(rowMap.values());
  }, [compareModeEnabled, compareResults, config, compareExecutiveSummary.bestVariantId]);

  const results = useMemo(() => {
    const { summary } = runPanelAnalysis(config, {
      defaultRedistributionMode: DEFAULT_REDISTRIBUTION_MODE,
      compareSummary: compareExecutiveSummary,
    });
    return summary;
  }, [config, compareExecutiveSummary]);

  return {
    compareResults,
    compareExecutiveSummary,
    compareMetricRows,
    results
  };
}
