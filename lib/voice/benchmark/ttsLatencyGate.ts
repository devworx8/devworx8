export interface TTSLatencySample {
  language: string;
  first_audio_ready_ms?: number | null;
  status?: 'ok' | 'failed' | 'skipped';
}

export interface TTSLatencyGateCell {
  language: string;
  count: number;
  p95: number | null;
  passed: boolean;
}

export interface TTSLatencyGateResult {
  passed: boolean;
  maxP95Ms: number;
  supportedLanguages: string[];
  cells: TTSLatencyGateCell[];
  failures: string[];
}

function percentile(values: number[], p: number): number | null {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function normalizeLanguage(value: string): string {
  const raw = String(value || '').trim().toLowerCase();
  if (raw.startsWith('en')) return 'en';
  if (raw.startsWith('af')) return 'af';
  if (raw.startsWith('zu')) return 'zu';
  if (raw.startsWith('xh')) return 'xh';
  if (raw.startsWith('nso') || raw.includes('sepedi') || raw.includes('sotho')) return 'nso';
  return raw;
}

export function evaluateTTSLatencyGates(input: {
  samples: TTSLatencySample[];
  supportedLanguages?: string[];
  maxP95Ms?: number;
}): TTSLatencyGateResult {
  const maxP95Ms = Number.isFinite(Number(input.maxP95Ms)) ? Number(input.maxP95Ms) : 3000;
  const supportedLanguages = (input.supportedLanguages || ['en', 'af', 'zu', 'xh', 'nso']).map((lang) =>
    normalizeLanguage(lang),
  );

  const failures: string[] = [];
  const cells = supportedLanguages.map((language) => {
    const points = (input.samples || [])
      .filter((sample) => normalizeLanguage(sample.language) === language)
      .filter((sample) => sample.status !== 'failed' && sample.status !== 'skipped')
      .map((sample) => Number(sample.first_audio_ready_ms))
      .filter((value) => Number.isFinite(value) && value > 0);

    const p95 = percentile(points, 95);
    const passed = typeof p95 === 'number' && p95 <= maxP95Ms;

    if (!passed) {
      failures.push(
        `${language}: first-audio-ready p95 ${typeof p95 === 'number' ? `${Math.round(p95)}ms` : 'missing'} exceeds ${maxP95Ms}ms`,
      );
    }

    return {
      language,
      count: points.length,
      p95,
      passed,
    };
  });

  return {
    passed: failures.length === 0,
    maxP95Ms,
    supportedLanguages,
    cells,
    failures,
  };
}

