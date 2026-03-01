import { evaluateTTSLatencyGates } from '@/lib/voice/benchmark/ttsLatencyGate';

describe('ttsLatencyGate', () => {
  it('passes when every guaranteed language meets p95 threshold', () => {
    const samples = [
      { language: 'en-ZA', first_audio_ready_ms: 2200, status: 'ok' as const },
      { language: 'en-ZA', first_audio_ready_ms: 2600, status: 'ok' as const },
      { language: 'af-ZA', first_audio_ready_ms: 2400, status: 'ok' as const },
      { language: 'zu-ZA', first_audio_ready_ms: 2500, status: 'ok' as const },
      { language: 'xh-ZA', first_audio_ready_ms: 2100, status: 'ok' as const },
      { language: 'nso-ZA', first_audio_ready_ms: 2300, status: 'ok' as const },
    ];

    const result = evaluateTTSLatencyGates({ samples, maxP95Ms: 3000 });
    expect(result.passed).toBe(true);
    expect(result.failures.length).toBe(0);
  });

  it('fails when one language exceeds threshold', () => {
    const samples = [
      { language: 'en-ZA', first_audio_ready_ms: 2300, status: 'ok' as const },
      { language: 'af-ZA', first_audio_ready_ms: 2400, status: 'ok' as const },
      { language: 'zu-ZA', first_audio_ready_ms: 4200, status: 'ok' as const },
      { language: 'xh-ZA', first_audio_ready_ms: 2500, status: 'ok' as const },
      { language: 'nso-ZA', first_audio_ready_ms: 2600, status: 'ok' as const },
    ];

    const result = evaluateTTSLatencyGates({ samples, maxP95Ms: 3000 });
    expect(result.passed).toBe(false);
    expect(result.failures.some((line) => line.includes('zu'))).toBe(true);
  });
});

